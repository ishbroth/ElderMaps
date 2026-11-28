// Builds the picture of which building style each part of the world is in, and the style of every shield and town, from the rules in src/lib/styleRules.ts.
//   npx tsx _tools/build-styles.mts <path to ne_10m_admin_1_states_provinces.geojson>
// Writes public/data/style-grid.png (one pixel is 0.2 degrees: 0 is the sea, 1 to 14 the styles in STYLES' order) and public/data/city-styles.json ({ "c:Name:lat": style number }).
import fs from 'node:fs';
import sharp from 'sharp';
import { provinceOf, type ProvinceId } from '../src/lib/lore.ts';
import { STYLES, styleFor, type StyleId } from '../src/lib/styleRules.ts';

const admin1Path = process.argv[2];
if (!admin1Path) { console.log('usage: build-styles.mts <ne_10m_admin_1_states_provinces.geojson>'); process.exit(1); }
const W = 1800, H = 900, STEP = 0.2;
const norm = (s: string): string => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const LEGACY: Record<ProvinceId, StyleId> = { skyrim: 'nordic', highrock: 'breton', cyrodiil: 'imperial', hammerfell: 'redguard', elsweyr: 'khajiit', valenwood: 'bosmer', morrowind: 'telvanni', summerset: 'altmer', shivering: 'ayleid', blackmarsh: 'argonian', orsinium: 'orcish', solstheim: 'nordic', atmora: 'nordic' };
const INDEX = new Map(STYLES.map((s, i) => [s.id, i + 1]));

type Geo = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
const countries = (JSON.parse(fs.readFileSync('public/data/countries.json', 'utf8')) as GeoJSON.FeatureCollection).features as Geo[];
const admin1 = (JSON.parse(fs.readFileSync(admin1Path, 'utf8')) as GeoJSON.FeatureCollection).features as Geo[];

interface Area { iso2: string; adm1: string; legacy: StyleId; polys: number[][][][]; box: [number, number, number, number] }
const polysOf = (g: Geo['geometry']): number[][][][] => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const boxOf = (polys: number[][][][]): [number, number, number, number] => { let w = 180, s = 90, e = -180, n = -90; for (const poly of polys) for (const [x, y] of poly[0]) { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; } return [w, s, e, n]; };

const legacyOf = new Map<string, StyleId>(), iso2Of = new Map<string, string>();
const countryAreas: Area[] = countries.map((f) => {
  const p = f.properties as Record<string, string>;
  const iso3 = p.ADM0_A3 && p.ADM0_A3 !== '-99' ? p.ADM0_A3 : p.ISO_A3_EH;
  const iso2 = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2;
  const legacy = LEGACY[provinceOf(iso3, p.CONTINENT, p.SUBREGION)];
  legacyOf.set(iso3, legacy); iso2Of.set(iso3, iso2);
  const polys = polysOf(f.geometry);
  return { iso2, adm1: '', legacy, polys, box: boxOf(polys) };
});
const adminAreas: Area[] = admin1.map((f) => {
  const p = f.properties as Record<string, string>;
  const polys = polysOf(f.geometry);
  const iso3 = p.adm0_a3;
  return { iso2: p.iso_a2 && p.iso_a2 !== '-99' ? p.iso_a2 : iso2Of.get(iso3) ?? '', adm1: norm(p.name), legacy: legacyOf.get(iso3) ?? 'imperial', polys, box: boxOf(polys) };
});

const inRing = (ring: number[][], x: number, y: number): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inArea = (a: Area, x: number, y: number): boolean => {
  if (x < a.box[0] || x > a.box[2] || y < a.box[1] || y > a.box[3]) return false;
  for (const poly of a.polys) if (inRing(poly[0], x, y) && !poly.slice(1).some((h) => inRing(h, x, y))) return true;
  return false;
};

/** Paints each area into a grid of area numbers, a row at a time (even-odd across all rings of a polygon). */
function paint(areas: Area[], into: Int32Array) {
  areas.forEach((a, id) => {
    for (const poly of a.polys) {
      const r0 = Math.max(0, Math.floor((90 - a.box[3]) / STEP) - 1), r1 = Math.min(H - 1, Math.ceil((90 - a.box[1]) / STEP) + 1);
      for (let r = r0; r <= r1; r++) {
        const y = 90 - (r + 0.5) * STEP, xs: number[] = [];
        for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i], [xj, yj] = ring[j];
          if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const c0 = Math.max(0, Math.ceil((xs[k] + 180) / STEP - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1] + 180) / STEP - 0.5));
          for (let c = c0; c <= c1; c++) into[r * W + c] = id;
        }
      }
    }
  });
}

const cArea = new Int32Array(W * H).fill(-1), aArea = new Int32Array(W * H).fill(-1);
paint(countryAreas, cArea); paint(adminAreas, aArea);
console.log('painted');

const grid = Buffer.alloc(W * H);
const styleAtCell = (r: number, c: number): number => {
  const lat = 90 - (r + 0.5) * STEP, lng = -180 + (c + 0.5) * STEP;
  const ai = aArea[r * W + c], ci = cArea[r * W + c];
  let area = ai >= 0 ? adminAreas[ai] : ci >= 0 ? countryAreas[ci] : null;
  if (!area) return 0;
  // a coast the country's outline reaches but the state outlines do not: the nearest state of that country
  if (ai < 0 && ci >= 0) {
    outer: for (let d = 1; d <= 4; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
      const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= H || cc < 0 || cc >= W) continue;
      const aj = aArea[rr * W + cc]; if (aj >= 0 && adminAreas[aj].iso2 === area.iso2) { area = adminAreas[aj]; break outer; }
    }
  }
  // a country-level shape under an admin area (some countries have no states in the data): the country's own two-letter code
  const iso2 = area.iso2 || (ci >= 0 ? countryAreas[ci].iso2 : '');
  return INDEX.get(styleFor({ lat, lng, iso2, adm1: area.adm1, legacy: area.legacy })) ?? 0;
};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) grid[r * W + c] = styleAtCell(r, c);
await sharp(grid, { raw: { width: W, height: H, channels: 1 } }).png({ compressionLevel: 9, palette: false }).toFile('public/data/style-grid.png');
console.log('grid written', (fs.statSync('public/data/style-grid.png').size / 1024).toFixed(0) + ' KB');

// ---- the style of each shield and town, exactly (the grid is 0.2 degrees, which a city on a border could fall wrong on)
const cities = JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8')) as [string, number, number, number, string, string][];
const exact = (lat: number, lng: number, iso2Hint: string): number => {
  let area: Area | null = null;
  for (const a of adminAreas) if (inArea(a, lng, lat)) { area = a; break; }
  let ca: Area | null = null;
  for (const a of countryAreas) if (inArea(a, lng, lat)) { ca = a; break; }
  if (!area) area = ca && ca.iso2 && adminAreas.some((a) => a.iso2 === ca!.iso2) ? null : ca;
  if (!area) {
    // a coast or an island too small for the outlines: the nearest painted cell
    const r0 = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / STEP))), c0 = Math.min(W - 1, Math.max(0, Math.floor((lng + 180) / STEP)));
    for (let d = 1; d < 12; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) { const rr = r0 + dr, cc = c0 + dc; if (rr >= 0 && rr < H && cc >= 0 && cc < W && grid[rr * W + cc]) return grid[rr * W + cc]; }
    return 0;
  }
  return INDEX.get(styleFor({ lat, lng, iso2: area.iso2 || ca?.iso2 || iso2Hint, adm1: area.adm1, legacy: area.legacy })) ?? 0;
};
const out: Record<string, number> = {};
for (const [name, lat, lng, , kind, iso2] of cities) if (kind !== 'village') out[`c:${name}:${lat}`] = exact(lat, lng, iso2);
fs.writeFileSync('public/data/city-styles.json', JSON.stringify(out));
console.log('cities', Object.keys(out).length);

// ---- a picture to look at, and a few test cities
const tintOf = (i: number): [number, number, number] => { if (!i) return [14, 20, 28]; const h = STYLES[i - 1].tint; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
const rgb = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { const [r, g, b] = tintOf(grid[i]); rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b; }
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toFile(process.env.TEMP + '/style-preview.png');
const probe = ['Savannah', 'San Jose', 'San Francisco', 'Oakland', 'Los Angeles', 'Las Vegas', 'San Diego', 'Phoenix', 'Seattle', 'Vancouver', 'Anchorage', 'Houston', 'Dallas', 'Austin', 'San Antonio', 'El Paso', 'Chicago', 'New York City', 'Miami', 'Atlanta', 'Memphis', 'Calgary', 'Edmonton', 'Winnipeg', 'Toronto', 'Montréal', 'Mexico City', 'Monterrey', 'Cancún', 'Lima', 'Medellín', 'São Paulo', 'Rio de Janeiro', 'Buenos Aires', 'Santiago', 'London', 'Paris', 'Marseille', 'Madrid', 'Barcelona', 'Sevilla', 'Lisbon', 'Rome', 'Naples', 'Berlin', 'Munich', 'Istanbul', 'Ankara', 'Moscow', 'Kyiv', 'Odessa', 'Cairo', 'Lagos', 'Kinshasa', 'Luanda', 'Johannesburg', 'Mumbai', 'Delhi', 'Beijing', 'Shanghai', 'Hong Kong', 'Bangkok', 'Tokyo', 'Sapporo', 'Seoul', 'Sydney', 'Perth', 'Adelaide', 'Melbourne', 'Auckland', 'Christchurch', 'Jakarta', 'Medan', 'Singapore', 'Manila', 'Tehran', 'Baghdad', 'Riyadh', 'Tashkent', 'Almaty', 'Honolulu'];
const names = STYLES.map((s) => s.id);
for (const n of probe) { const hits = cities.filter((c) => c[0] === n && c[4] !== 'village'); for (const c of hits.slice(0, 1)) console.log(n.padEnd(15), names[out[`c:${c[0]}:${c[1]}`] - 1]); }
