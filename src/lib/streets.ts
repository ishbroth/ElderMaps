// The street map as an old game would draw it. Google's own roads can only be recoloured, so while travelling (and on the Town Legend map) the real streets are drawn on
// top by us, in the style kit of the region: packed dirt with ruts, pale cobbles, ash roads, sand tracks, churned mud.
//
// Built to be light: ONE canvas (not thousands of map objects), drawn only when the map has come to rest (not on every frame of a pan), only the roads in view, and only the
// roads that matter at that zoom. The roads come from a small file prepared per metro (public/data/streets/<metro>.json, see _tools/build-streets.mjs), kept in memory as
// plain number arrays; a view with no prepared file reads its roads (the main ones) from an Overpass mirror, a small square at a time.

import type { RoadKit } from './styles';

const BASE = import.meta.env.BASE_URL;
const MIRRORS = ['https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter'];
const UNIT = 1e5;
const MIN_ZOOM = 13;

/** One road: its class (1 biggest .. 7 smallest) and its points as whole counts of 1e-5 degrees, [lat, lng, lat, lng, ...]. */
interface Road { cls: number; pts: Int32Array; minLat: number; maxLat: number; minLng: number; maxLng: number }

/** How wide each class of road is drawn, in metres. */
const WIDTH_M = [0, 15, 12, 9.5, 7.5, 6, 3.2, 1.6];
/** The smallest class drawn at a zoom (a bigger number means smaller roads are drawn too). */
const classesAt = (zoom: number) => (zoom < 14 ? 3 : zoom < 15 ? 4 : zoom < 16 ? 5 : zoom < 17 ? 6 : 7);

type Pattern = 'cobble' | 'dirt' | 'ash' | 'sand' | 'mud';
const PATTERN_OF: Record<string, Pattern> = { north: 'dirt', imperial: 'cobble', ash: 'ash', sand: 'sand', swamp: 'mud', jungle: 'mud', gilded: 'cobble', basalt: 'ash', fever: 'cobble' };

const OVERPASS_CLASS: Record<string, number> = { motorway: 1, trunk: 1, primary: 2, secondary: 3, tertiary: 4, residential: 5, unclassified: 5, living_street: 5 };

const mpp = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
const worldX = (lng: number, zoom: number) => ((lng + 180) / 360) * 256 * 2 ** zoom;
const worldY = (lat: number, zoom: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** zoom;
};

/** Multiplies a colour's brightness by a factor. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** A small tile of road surface, made once, that the road is painted with (stones, ruts, ash, sand or mud). */
function surfaceTile(pattern: Pattern, kit: RoadKit): HTMLCanvasElement {
  const S = 48;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = kit.roadFill; g.fillRect(0, 0, S, S);
  let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const dark = shade(kit.roadFill, 0.68), mid = shade(kit.roadFill, 0.86), light = shade(kit.roadFill, 1.18);
  if (pattern === 'cobble') {
    // rows of rounded stones, each a little different, with dark joints
    const rows = 6, h = S / rows;
    for (let y = 0; y < rows; y++) {
      const n = 5 + (y % 2), w = S / n, off = y % 2 ? w / 2 : 0;
      for (let i = -1; i <= n; i++) {
        const x = i * w + off + (r() - 0.5) * 2, cy = y * h;
        g.fillStyle = r() > 0.5 ? light : mid;
        g.strokeStyle = dark; g.lineWidth = 1.3;
        g.beginPath(); g.roundRect(x + 1, cy + 1, w - 2, h - 2, 3); g.fill(); g.stroke();
      }
    }
  } else {
    // speckle: pebbles and grit, heavier for dirt, mud and ash; sand is fine and pale
    const count = pattern === 'sand' ? 220 : 160;
    for (let i = 0; i < count; i++) {
      g.fillStyle = r() > 0.5 ? dark : light; g.globalAlpha = 0.25 + r() * 0.4;
      const s = pattern === 'sand' ? 0.7 + r() * 0.9 : 0.9 + r() * 2.1;
      g.beginPath(); g.arc(r() * S, r() * S, s, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    if (pattern === 'dirt' || pattern === 'mud') {
      // two wheel ruts
      g.strokeStyle = dark; g.globalAlpha = 0.35; g.lineWidth = 2;
      for (const y of [S * 0.3, S * 0.7]) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + 2, S * 0.6, y - 2, S, y); g.stroke(); }
      g.globalAlpha = 1;
    }
  }
  return c;
}

export class StreetLayer extends google.maps.OverlayView {
  private kit: RoadKit;
  private pattern: Pattern;
  private tile: HTMLCanvasElement;
  private canvas: HTMLCanvasElement | null = null;
  private roads: Road[] = [];
  private loadedMetros = new Set<string>();
  private liveTiles = new Set<string>();
  private metros: { id: string; lat: number; lng: number; radiusKm: number }[] | null = null;
  private listeners: google.maps.MapsEventListener[] = [];
  private timer: number | undefined;
  private dead = false;

  constructor(map: google.maps.Map, kit: RoadKit, kitName: string) {
    super();
    this.kit = kit;
    this.pattern = PATTERN_OF[kitName] ?? 'cobble';
    this.tile = surfaceTile(this.pattern, kit);
    this.setMap(map);
  }

  onAdd() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;pointer-events:none;';
    this.getPanes()?.overlayLayer.appendChild(this.canvas);
    const map = this.getMap() as google.maps.Map;
    this.listeners.push(map.addListener('idle', () => this.soon()));
    this.listeners.push(map.addListener('zoom_changed', () => { if (this.canvas) this.canvas.style.visibility = 'hidden'; }));
    this.soon();
  }

  onRemove() {
    this.dead = true;
    window.clearTimeout(this.timer);
    this.listeners.forEach((l) => l.remove());
    this.listeners = [];
    this.canvas?.remove();
    this.canvas = null;
    this.roads = [];
  }

  detach() { this.setMap(null); }

  draw() { /* drawn when the map is at rest (see paint) */ }

  private soon() { window.clearTimeout(this.timer); this.timer = window.setTimeout(() => void this.refresh(), 200); }

  private async refresh() {
    const map = this.getMap() as google.maps.Map | null;
    if (this.dead || !map) return;
    const zoom = map.getZoom() ?? 0;
    if (zoom >= MIN_ZOOM) await this.ensureData(map);
    if (!this.dead) this.paint();
  }

  /** The roads of the metro under the view, from its prepared file; where there is none, the main roads of the view from an Overpass mirror. */
  private async ensureData(map: google.maps.Map) {
    const c = map.getCenter(); if (!c) return;
    if (!this.metros) {
      try { this.metros = await (await fetch(`${BASE}data/metros-index.json`)).json(); } catch { this.metros = []; }
    }
    if (this.dead) return;
    let best: { id: string; gap: number } | null = null;
    for (const m of this.metros ?? []) {
      const gap = Math.hypot((m.lat - c.lat()) * 111.32, (m.lng - c.lng()) * 111.32 * Math.cos((c.lat() * Math.PI) / 180)) - Math.min(m.radiusKm, 18);
      if (gap <= 0 && (!best || gap < best.gap)) best = { id: m.id, gap };
    }
    if (best && !this.loadedMetros.has(best.id)) {
      this.loadedMetros.add(best.id);
      try {
        const res = await fetch(`${BASE}data/streets/${best.id}.json`);
        if (res.ok) { this.addMetro((await res.json()) as { o: [number, number]; roads: [number, number[]][] }); return; }
      } catch { /* no prepared file: read the view live */ }
    }
    if (best && this.loadedMetros.has(best.id) && this.roads.length > 0) return; // prepared roads are there
    await this.readLive(map);
  }

  private addMetro(d: { o: [number, number]; roads: [number, number[]][] }) {
    for (const [cls, flat] of d.roads) {
      const n = flat.length / 2;
      const pts = new Int32Array(n * 2);
      let x = flat[0], y = flat[1];
      pts[0] = y + d.o[0]; pts[1] = x + d.o[1];
      let minLat = pts[0], maxLat = pts[0], minLng = pts[1], maxLng = pts[1];
      for (let i = 1; i < n; i++) {
        x += flat[i * 2]; y += flat[i * 2 + 1];
        const lat = y + d.o[0], lng = x + d.o[1];
        pts[i * 2] = lat; pts[i * 2 + 1] = lng;
        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat; if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
      }
      this.roads.push({ cls, pts, minLat, maxLat, minLng, maxLng });
    }
  }

  /** A view with no prepared file: the main roads of one small square, from a mirror. */
  private async readLive(map: google.maps.Map) {
    const b = map.getBounds(); if (!b) return;
    const zoom = map.getZoom() ?? 0;
    if (zoom < 14) return;
    const ne = b.getNorthEast(), sw = b.getSouthWest();
    if (ne.lat() - sw.lat() > 0.05 || ne.lng() - sw.lng() > 0.07) return;
    const key = `${Math.floor(sw.lat() * 50)}:${Math.floor(sw.lng() * 50)}:${Math.floor(ne.lat() * 50)}:${Math.floor(ne.lng() * 50)}`;
    if (this.liveTiles.has(key)) return;
    this.liveTiles.add(key);
    const q = `[out:json][timeout:25];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"](${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()});out geom;`;
    for (const url of MIRRORS) {
      try {
        const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        if (!res.ok) continue;
        const els = ((await res.json()) as { elements?: { type: string; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }[] }).elements ?? [];
        const flat: [number, number[]][] = [];
        for (const e of els) {
          const cls = e.tags?.highway ? OVERPASS_CLASS[e.tags.highway] : 0;
          if (!cls || !e.geometry || e.geometry.length < 2) continue;
          const f: number[] = [Math.round(e.geometry[0].lon * UNIT), Math.round(e.geometry[0].lat * UNIT)];
          for (let i = 1; i < e.geometry.length; i++) f.push(Math.round(e.geometry[i].lon * UNIT) - Math.round(e.geometry[i - 1].lon * UNIT), Math.round(e.geometry[i].lat * UNIT) - Math.round(e.geometry[i - 1].lat * UNIT));
          flat.push([cls, f]);
        }
        this.addMetro({ o: [0, 0], roads: flat });
        return;
      } catch { /* the next mirror */ }
    }
    this.liveTiles.delete(key);
  }

  /** Draws the roads in view onto the canvas (only now, with the map at rest). */
  private paint() {
    const map = this.getMap() as google.maps.Map | null;
    const proj = this.getProjection();
    const canvas = this.canvas;
    if (!map || !proj || !canvas) return;
    const zoom = map.getZoom() ?? 0;
    const div = map.getDiv();
    const margin = 60;
    const w = div.clientWidth + margin * 2, h = div.clientHeight + margin * 2;
    const b = map.getBounds();
    if (!b) return;
    const ne = b.getNorthEast(), sw = b.getSouthWest();
    // the canvas sits a little beyond the view on every side, so a small pan does not show an edge
    const topLeft = proj.fromLatLngToDivPixel(new google.maps.LatLng(ne.lat(), sw.lng()));
    if (!topLeft) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    canvas.style.left = `${topLeft.x - margin}px`; canvas.style.top = `${topLeft.y - margin}px`;
    canvas.style.visibility = zoom >= MIN_ZOOM ? 'visible' : 'hidden';
    const g = canvas.getContext('2d') as CanvasRenderingContext2D;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, w, h);
    if (zoom < MIN_ZOOM || this.roads.length === 0) return;
    const fillPattern = g.createPattern(this.tile, 'repeat');
    // world pixel of the canvas's top-left corner
    const ox = worldX(sw.lng(), zoom) - margin, oy = worldY(ne.lat(), zoom) - margin;
    const pad = (margin + 40) * (360 / (256 * 2 ** zoom));
    const minLat = sw.lat() - pad, maxLat = ne.lat() + pad, minLng = sw.lng() - pad, maxLng = ne.lng() + pad;
    const limit = classesAt(zoom);
    const lat0 = (ne.lat() + sw.lat()) / 2;
    const metre = 1 / mpp(lat0, zoom);
    const visible = this.roads.filter((r) => r.cls <= limit && r.maxLat / UNIT >= minLat && r.minLat / UNIT <= maxLat && r.maxLng / UNIT >= minLng && r.minLng / UNIT <= maxLng);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const trace = (r: Road) => {
      g.beginPath();
      for (let i = 0; i < r.pts.length; i += 2) {
        const x = worldX(r.pts[i + 1] / UNIT, zoom) - ox, y = worldY(r.pts[i] / UNIT, zoom) - oy;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
    };
    // the small roads first, so the bigger ones lie over their joins
    visible.sort((a, c) => c.cls - a.cls);
    for (const r of visible) { const px = Math.max(1.4, WIDTH_M[r.cls] * metre); g.strokeStyle = this.kit.roadEdge; g.lineWidth = px + 2.2; trace(r); g.stroke(); }
    for (const r of visible) {
      const px = Math.max(1.4, WIDTH_M[r.cls] * metre);
      g.strokeStyle = px >= 4 && fillPattern ? fillPattern : this.kit.roadFill;
      g.lineWidth = px; trace(r); g.stroke();
    }
  }
}
