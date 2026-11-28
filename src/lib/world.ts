// The data of the map: countries (and so provinces), the cities (as hold capitals), the few key places round each city, and the wild places of the countryside.

import { provinceOf, type ProvinceId } from './lore';
import { loadStyleMap, realmAt, realmOfSpot } from './styleMap';

export interface Metro { id: string; name: string; country: string; lat: number; lng: number; pop: number; radiusKm: number }
/** [name, lat, lng, kind (keep, landmark, town), category, fame] */
export type KeyPlace = [string, number, number, 'keep' | 'landmark' | 'town', string, number];
/** [name, lat, lng, population, tier (crest, town, village), country] */
export type City = [string, number, number, number, 'crest' | 'town' | 'village', string];
/** [id, name, lat, lng, type, fame] */
export type WildPlace = [string, string, number, number, string, number];

interface Ring { box: [number, number, number, number]; pts: number[][] }
interface Country { iso2: string; iso3: string; name: string; province: ProvinceId; rings: Ring[]; centre: [number, number]; feature: GeoJSON.Feature }

export interface World {
  countries: Country[];
  geojson: GeoJSON.FeatureCollection;
  metros: Metro[];
  /** The cities by mark: crests (anchors of metros over a million), towns (smaller metros on their own), villages (every other city over 60,000), biggest first. */
  cities: { crest: City[]; town: City[]; village: City[] };
  /** The outlines of the countries, with the province each belongs to, for tinting the land. */
  provinceRings: { province: ProvinceId; pts: number[][] }[];
  keys: Record<string, KeyPlace[]>;
  wild: WildPlace[];
  provinceAt: (lat: number, lng: number) => ProvinceId;
  /** The realm of a place (a shield or town by its exact style, else by where it lies), falling back to its country's realm. */
  provinceOfSpot: (id: string, lat: number, lng: number, iso2?: string) => ProvinceId;
  provinceOfCountry: (iso2: string) => ProvinceId;
}

const BASE = import.meta.env.BASE_URL;

function ringsOf(geometry: GeoJSON.Geometry): Ring[] {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polys.map((poly) => {
    const pts = poly[0];
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    for (const [lng, lat] of pts) { minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
    return { box: [minLng, minLat, maxLng, maxLat] as [number, number, number, number], pts };
  });
}

const inRing = (pts: number[][], lng: number, lat: number): boolean => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

let world: Promise<World> | null = null;

export function loadWorld(): Promise<World> {
  world ??= (async () => {
    const [countriesJson, metros, keys, wild, cityList, styleMap] = await Promise.all([
      fetch(`${BASE}data/countries.json`).then((r) => r.json() as Promise<GeoJSON.FeatureCollection>),
      fetch(`${BASE}data/metros-index.json`).then((r) => r.json() as Promise<Metro[]>),
      fetch(`${BASE}data/keys.json`).then((r) => r.json() as Promise<Record<string, KeyPlace[]>>),
      fetch(`${BASE}data/wild.json`).then((r) => r.json() as Promise<WildPlace[]>),
      fetch(`${BASE}data/cities.json`).then((r) => r.json() as Promise<City[]>),
      loadStyleMap(),
    ]);
    const countries: Country[] = countriesJson.features.map((f) => {
      const p = f.properties as Record<string, string>;
      const iso3 = p.ADM0_A3 && p.ADM0_A3 !== '-99' ? p.ADM0_A3 : p.ISO_A3_EH;
      const iso2 = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2;
      const province = provinceOf(iso3, p.CONTINENT, p.SUBREGION);
      const rings = ringsOf(f.geometry);
      const big = rings.reduce((a, b) => ((b.box[2] - b.box[0]) * (b.box[3] - b.box[1]) > (a.box[2] - a.box[0]) * (a.box[3] - a.box[1]) ? b : a), rings[0]);
      return { iso2, iso3, name: p.NAME, province, rings, centre: [(big.box[1] + big.box[3]) / 2, (big.box[0] + big.box[2]) / 2], feature: { ...f, properties: { province } } };
    });
    const byIso2 = new Map(countries.map((c) => [c.iso2, c]));
    const countryProvinceAt = (lat: number, lng: number): ProvinceId => {
      for (const c of countries) for (const r of c.rings) if (lng >= r.box[0] && lng <= r.box[2] && lat >= r.box[1] && lat <= r.box[3] && inRing(r.pts, lng, lat)) return c.province;
      // not on any country's outline (a coast, an island): the nearest country's middle
      let best: Country = countries[0], bestD = Infinity;
      for (const c of countries) { const d = (c.centre[0] - lat) ** 2 + ((c.centre[1] - lng) * Math.cos((lat * Math.PI) / 180)) ** 2; if (d < bestD) { bestD = d; best = c; } }
      return best.province;
    };
    // a point's realm: from the style of the ground (the building styles drawn on the map), or, where there is none, from its country
    const provinceAt = (lat: number, lng: number): ProvinceId => { const legacy = countryProvinceAt(lat, lng); return realmAt(styleMap, lat, lng, legacy) ?? legacy; };
    const provinceOfSpot = (id: string, lat: number, lng: number, iso2?: string): ProvinceId => { const legacy = iso2 ? byIso2.get(iso2)?.province ?? countryProvinceAt(lat, lng) : countryProvinceAt(lat, lng); return realmOfSpot(styleMap, id, lat, lng, legacy) ?? legacy; };
    // lighthouses: the famous ones stay; the rest only where someone could get to them, near a city (an easy road or ferry away). The far ones out in the water are dropped.
    const keepLight = (w: WildPlace): boolean => {
      if (w[4] !== 'lighthouse' || w[5] >= 8) return true;
      const [, , lat, lng] = w;
      return cityList.some((c) => Math.abs(c[1] - lat) < 0.2 && Math.abs(c[2] - lng) < 0.3 && Math.hypot((c[1] - lat) * 111.32, (c[2] - lng) * 111.32 * Math.cos((lat * Math.PI) / 180)) <= 20);
    };
    const wildKept = wild.filter(keepLight);
    const cities = { crest: [] as City[], town: [] as City[], village: [] as City[] };
    // an exception to the metro-size rule: Anchorage is a great city of the far north and wears a shield
    const SHIELD_EXCEPTIONS = new Set(['Anchorage|US']);
    for (const c of cityList.sort((a, b) => b[3] - a[3])) cities[SHIELD_EXCEPTIONS.has(c[0] + '|' + c[5]) ? 'crest' : c[4]].push(c);
    return {
      cities, provinceRings: countries.flatMap((c) => c.rings.map((r) => ({ province: c.province, pts: r.pts }))),
      countries, geojson: { type: 'FeatureCollection', features: countries.map((c) => c.feature) }, metros: metros.sort((a, b) => b.pop - a.pop), keys, wild: wildKept,
      provinceAt, provinceOfSpot, provinceOfCountry: (iso2) => byIso2.get(iso2)?.province ?? 'cyrodiil',
    };
  })();
  return world;
}
