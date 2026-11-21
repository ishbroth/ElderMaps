// The street map as an old game would draw it. Google's own roads can only be recoloured, so while travelling the real streets and buildings of the view are read from
// OpenStreetMap (the Overpass service) and drawn on top, in the style kit of the region: packed dirt with ruts, pale cobbles, ash roads, sand tracks, churned mud, with
// the buildings as roofed footprints. Only the close views get it (zoom 15 and nearer): farther out, Google's recoloured map is enough.
//
// This is a first version that asks the public Overpass service as the view moves. For the paid Town Legend city maps the same streets should be prepared ahead of time
// for each metro (one small file per metro), which is faster, works offline and does not depend on a free service.

import type { RoadKit } from './styles';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const MIN_ZOOM = 15;

interface Way { id: number; kind: 'road' | 'building'; cls: string; path: google.maps.LatLngLiteral[] }

/** How wide a kind of road is drawn, in metres. */
const WIDTH_M: Record<string, number> = { motorway: 16, trunk: 14, primary: 12, secondary: 10, tertiary: 8, unclassified: 6, residential: 6, living_street: 5, service: 3.5, pedestrian: 4, track: 3, path: 1.6, footway: 1.6, cycleway: 1.8, steps: 1.6 };

type Pattern = 'cobble' | 'dirt' | 'ash' | 'sand' | 'mud';
const PATTERN_OF: Record<string, Pattern> = { north: 'dirt', imperial: 'cobble', ash: 'ash', sand: 'sand', swamp: 'mud', jungle: 'mud', gilded: 'cobble', basalt: 'ash', fever: 'cobble' };

const metersPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

const rng = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export class StreetLayer {
  private map: google.maps.Map;
  private kit: RoadKit;
  private kitName: string;
  private overlays: (google.maps.Polyline | google.maps.Polygon)[] = [];
  private roads: { under: google.maps.Polyline; top: google.maps.Polyline; widthM: number; lat: number }[] = [];
  private have = new Set<number>();
  private listeners: google.maps.MapsEventListener[] = [];
  private timer: number | undefined;
  private busy = false;
  private dead = false;

  constructor(map: google.maps.Map, kit: RoadKit, kitName: string) {
    this.map = map;
    this.kit = kit;
    this.kitName = kitName;
    this.listeners.push(map.addListener('idle', () => this.later()));
    this.listeners.push(map.addListener('zoom_changed', () => this.rescale()));
    this.later();
  }

  detach() {
    this.dead = true;
    window.clearTimeout(this.timer);
    this.listeners.forEach((l) => l.remove());
    this.overlays.forEach((o) => o.setMap(null));
    this.overlays = [];
    this.roads = [];
    this.have.clear();
  }

  private later() { window.clearTimeout(this.timer); this.timer = window.setTimeout(() => void this.load(), 350); }

  private async load() {
    if (this.dead || this.busy) return;
    const zoom = this.map.getZoom() ?? 0;
    const b = this.map.getBounds();
    if (!b || zoom < MIN_ZOOM) return;
    const ne = b.getNorthEast(), sw = b.getSouthWest();
    // a view is read a little larger than it shows, but never more than about one and a half kilometres across
    const padLat = (ne.lat() - sw.lat()) * 0.15, padLng = (ne.lng() - sw.lng()) * 0.15;
    const s = sw.lat() - padLat, n = ne.lat() + padLat, w = sw.lng() - padLng, e = ne.lng() + padLng;
    if ((n - s) > 0.02 || (e - w) > 0.03) return;
    this.busy = true;
    try {
      const q = `[out:json][timeout:20];(way["highway"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e}););out geom 3000;`;
      let data: { elements?: { type: string; id: number; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }[] } | null = null;
      for (const url of ENDPOINTS) {
        try {
          const res = await fetch(`${url}?data=${encodeURIComponent(q)}`);
          if (res.ok) { data = await res.json(); break; }
        } catch { /* try the next one */ }
      }
      if (!data || this.dead) return;
      const ways: Way[] = [];
      for (const el of data.elements ?? []) {
        if (el.type !== 'way' || !el.geometry || el.geometry.length < 2 || this.have.has(el.id)) continue;
        const path = el.geometry.map((p) => ({ lat: p.lat, lng: p.lon }));
        if (el.tags?.building) ways.push({ id: el.id, kind: 'building', cls: el.tags.building, path });
        else if (el.tags?.highway && WIDTH_M[el.tags.highway] !== undefined) ways.push({ id: el.id, kind: 'road', cls: el.tags.highway, path });
      }
      this.draw(ways);
    } finally { this.busy = false; }
  }

  private draw(ways: Way[]) {
    const k = this.kit;
    const zoom = this.map.getZoom() ?? 16;
    const pattern = PATTERN_OF[this.kitName] ?? 'cobble';
    // buildings first (under the roads): a roofed footprint, the roof colour varying a little from one to the next
    for (const w of ways) {
      if (w.kind !== 'building') continue;
      this.have.add(w.id);
      const r = rng(w.id % 2147483646 + 1);
      const shade = 0.86 + r() * 0.28;
      const poly = new google.maps.Polygon({
        map: this.map, paths: w.path, clickable: false, zIndex: 2,
        fillColor: shade2(k.buildings, shade), fillOpacity: 0.96, strokeColor: k.buildingEdge, strokeWeight: 1.1, strokeOpacity: 0.9,
      });
      this.overlays.push(poly);
    }
    for (const w of ways) {
      if (w.kind !== 'road') continue;
      this.have.add(w.id);
      const widthM = WIDTH_M[w.cls] ?? 5;
      const lat = w.path[0].lat;
      const px = Math.max(1.5, widthM / metersPerPixel(lat, zoom));
      const rough = w.cls === 'path' || w.cls === 'track' || w.cls === 'footway' || w.cls === 'cycleway' || w.cls === 'steps';
      // the road's edge, then its surface
      const under = new google.maps.Polyline({ map: this.map, path: w.path, clickable: false, zIndex: 3, strokeColor: k.roadEdge, strokeOpacity: 0.95, strokeWeight: px + 2.4 });
      const top = new google.maps.Polyline({
        map: this.map, path: w.path, clickable: false, zIndex: 4, strokeColor: rough ? shade2(k.roadFill, 0.92) : k.roadFill, strokeOpacity: 1, strokeWeight: px,
        icons: px >= 4 ? surfaceIcons(pattern, k, px, w.id) : undefined,
      });
      this.overlays.push(under, top);
      this.roads.push({ under, top, widthM, lat });
    }
  }

  /** The roads are drawn in pixels, so a change of zoom resizes them to the same width in metres. */
  private rescale() {
    const zoom = this.map.getZoom() ?? 16;
    for (const r of this.roads) {
      const px = Math.max(1.5, r.widthM / metersPerPixel(r.lat, zoom));
      r.under.setOptions({ strokeWeight: px + 2.4 });
      r.top.setOptions({ strokeWeight: px });
    }
  }
}

/** Multiplies a colour's brightness by a factor (so no two roofs are quite alike). */
function shade2(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

/** The marks along a road that make it look like cobbles, ruts, ash or sand, repeating along it. */
function surfaceIcons(pattern: Pattern, k: RoadKit, px: number, id: number): google.maps.IconSequence[] {
  const dark = shade2(k.roadFill, 0.72), light = shade2(k.roadFill, 1.18);
  const dot = (path: google.maps.SymbolPath | string, color: string, scale: number, opacity: number, offset: string, repeat: string) => ({
    icon: { path, fillColor: color, fillOpacity: opacity, strokeColor: color, strokeOpacity: opacity, strokeWeight: 0.6, scale },
    offset, repeat,
  }) as google.maps.IconSequence;
  const C = google.maps.SymbolPath.CIRCLE;
  const s = Math.max(1, Math.min(2.6, px / 5));
  if (pattern === 'cobble') {
    // rows of stones: two staggered lines of pale and dark dots
    return [dot(C, light, s, 0.9, '0px', `${Math.round(5 + s * 2)}px`), dot(C, dark, s * 0.8, 0.8, `${Math.round(2.5 + s)}px`, `${Math.round(5 + s * 2)}px`), dot(C, dark, s * 0.6, 0.6, `${(id % 7) + 1}px`, `${Math.round(9 + s * 2)}px`)];
  }
  if (pattern === 'dirt' || pattern === 'mud') {
    // wheel ruts and scattered pebbles
    return [dot('M 0,-1 L 0,1', dark, px * 0.28, 0.55, '0px', '3px'), dot(C, light, s * 0.55, 0.7, `${(id % 11) + 2}px`, `${Math.round(11 + s * 3)}px`), dot(C, dark, s * 0.5, 0.6, `${(id % 5) + 5}px`, `${Math.round(8 + s * 3)}px`)];
  }
  if (pattern === 'ash') return [dot(C, dark, s * 0.7, 0.55, '0px', `${Math.round(7 + s * 2)}px`), dot(C, light, s * 0.5, 0.45, '4px', `${Math.round(13 + s * 2)}px`)];
  // sand: fine drifts
  return [dot(C, light, s * 0.55, 0.6, '0px', `${Math.round(9 + s * 2)}px`), dot(C, dark, s * 0.45, 0.45, '5px', `${Math.round(12 + s * 2)}px`)];
}
