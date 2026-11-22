// Prepares the street map of a metro ahead of time: the roads (not the buildings: the base map has those) read from OpenStreetMap through an Overpass mirror, thinned out,
// and stored as one small file per metro, public/data/streets/<metro-id>.json. The Town Legend map and the street map while travelling read these instead of asking a
// free service as the view moves (faster, lighter, works with a weak signal).
//
//   node _tools/build-streets.mjs us-ga-savannah us-ca-san-diego     (these metros)
//   node _tools/build-streets.mjs --top 10                           (the ten biggest metros)
//   node _tools/build-streets.mjs --all --min-pop 500000             (every metro of at least that many people)
//
// A metro is read out to its radius, at most 18 km, in squares of 0.05 degrees, a request every few seconds (the mirrors are shared: be gentle).
// Format (v1): { v, id, o: [lat, lng] in 1e-5 degrees, roads: [[classNumber, [x0, y0, dx1, dy1, ...]]] } with every number a whole count of 1e-5 degrees (about 1.1 m).
// Class numbers: 1 motorway/trunk, 2 primary, 3 secondary, 4 tertiary, 5 residential/unclassified/living_street, 6 service/track, 7 path/footway.

import fs from 'node:fs';

const MIRRORS = ['https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter'];
const CLASS = { motorway: 1, trunk: 1, motorway_link: 1, trunk_link: 1, primary: 2, primary_link: 2, secondary: 3, secondary_link: 3, tertiary: 4, tertiary_link: 4, residential: 5, unclassified: 5, living_street: 5, pedestrian: 5, service: 6, track: 6, path: 7, footway: 7, cycleway: 7 };
const TOKEN = 'motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|service|track|path|footway|cycleway';
const UNIT = 1e5;
const TILE = 0.05;
const MAX_RADIUS_KM = 18;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const index = JSON.parse(fs.readFileSync('public/data/metros-index.json', 'utf8'));
const args = process.argv.slice(2);
let targets = [];
if (args.includes('--top')) { const n = Number(args[args.indexOf('--top') + 1]) || 10; targets = [...index].sort((a, b) => b.pop - a.pop).slice(0, n); }
else if (args.includes('--all')) { const min = Number(args[args.indexOf('--min-pop') + 1]) || 0; targets = index.filter((m) => m.pop >= min); }
else targets = args.map((id) => index.find((m) => m.id === id)).filter(Boolean);
if (targets.length === 0) { console.log('no metros chosen'); process.exit(1); }
fs.mkdirSync('public/data/streets', { recursive: true });

async function ask(query) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 70000);
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ElderMaps-streets/0.1 (fan project)' }, signal: ctl.signal });
      clearTimeout(t);
      if (res.ok) { const j = await res.json(); if (j.elements) return j.elements; }
    } catch { /* try the next mirror */ }
    await sleep(3000 * (attempt + 1));
  }
  return null;
}

/** Thins a line so no point is within `tol` (in units) of the line between its neighbours (Douglas-Peucker, iterative). */
function thin(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1, far = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > far) { far = d; worst = i; }
    }
    if (far > tol && worst > 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

for (const m of targets) {
  const out = `public/data/streets/${m.id}.json`;
  if (fs.existsSync(out) && !args.includes('--again')) { console.log('have', m.id); continue; }
  const km = Math.min(m.radiusKm, MAX_RADIUS_KM);
  const dLat = km / 111.32, dLng = km / (111.32 * Math.max(0.2, Math.cos((m.lat * Math.PI) / 180)));
  const o = [Math.round((m.lat - dLat) * UNIT), Math.round((m.lng - dLng) * UNIT)];
  const seen = new Set(); const roads = []; let failed = 0, tiles = 0;
  for (let s = m.lat - dLat; s < m.lat + dLat; s += TILE) for (let w = m.lng - dLng; w < m.lng + dLng; w += TILE) {
    tiles++;
    const q = `[out:json][timeout:60];way["highway"~"^(${TOKEN})(_link)?$"](${s.toFixed(5)},${w.toFixed(5)},${(s + TILE).toFixed(5)},${(w + TILE).toFixed(5)});out geom;`;
    const els = await ask(q);
    if (!els) { failed++; continue; }
    for (const e of els) {
      if (e.type !== 'way' || !e.geometry || seen.has(e.id)) continue;
      seen.add(e.id);
      const cls = CLASS[e.tags?.highway]; if (!cls) continue;
      const pts = thin(e.geometry.map((p) => [Math.round(p.lon * UNIT) - o[1], Math.round(p.lat * UNIT) - o[0]]), cls >= 6 ? 4 : 2);
      if (pts.length < 2) continue;
      const flat = [pts[0][0], pts[0][1]];
      for (let i = 1; i < pts.length; i++) flat.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      roads.push([cls, flat]);
    }
    await sleep(1500);
  }
  if (failed > tiles * 0.2) { console.log('too many failed tiles for', m.id, `${failed}/${tiles}: not saved`); continue; }
  fs.writeFileSync(out, JSON.stringify({ v: 1, id: m.id, o: [o[0], o[1]], roads }));
  console.log('wrote', m.id, roads.length, 'roads,', Math.round(fs.statSync(out).size / 1024), 'KB,', failed, 'of', tiles, 'tiles missed');
}
