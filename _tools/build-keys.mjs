// The few key places around each metro (not every place, as in WastelandMaps): the main government building (the keep), the best-known landmarks,
// and a handful of the larger neighborhoods and suburbs (the towns and villages round the city). Reads WastelandMaps' per-metro files.
//   node _tools/build-keys.mjs [path to RadMaps/public/data]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = (process.argv[2] ?? '../RadMaps/public/data') + '/metros/';
const GOV = /capitol|city hall|town hall|courthouse|court house|parliament|congress|legislat|state house|statehouse|council|rathaus|ayuntamiento|mairie|palace|government/i;
const km = (a, b, c, d) => Math.hypot((d - b) * 111.32 * Math.cos((a * Math.PI) / 180), (c - a) * 111.32);
const out = {};
let count = 0;
for (const file of readdirSync(dir)) {
  const m = JSON.parse(readFileSync(dir + file, 'utf8'));
  const P = m.places.map(([qid, name, lat, lng, category, fame, area]) => ({ qid, name, lat, lng, category, fame: fame ?? 0, area: area === 1 }));
  const picked = [];
  const near = (p) => picked.some((q) => km(p.lat, p.lng, q.lat, q.lng) < 0.35);
  // the keep: the most notable government building, preferring the ones in the middle of the city
  const gov = P.filter((p) => !p.area && (p.category === 'guard' || GOVERNMENT_NAME(p.name)))
    .sort((a, b) => (b.fame - a.fame) || km(a.lat, a.lng, m.center[0], m.center[1]) - km(b.lat, b.lng, m.center[0], m.center[1]))[0];
  if (gov) picked.push({ ...gov, kind: 'keep' });
  // landmarks: the best-known buildings and sights
  for (const p of P.filter((x) => !x.area).sort((a, b) => b.fame - a.fame)) {
    if (picked.filter((q) => q.kind === 'landmark').length >= 7) break;
    if (p.fame < 3 || near(p)) continue;
    picked.push({ ...p, kind: 'landmark' });
  }
  // towns: the larger neighborhoods and suburbs, spread out around the city
  for (const p of P.filter((x) => x.area).sort((a, b) => b.fame - a.fame)) {
    if (picked.filter((q) => q.kind === 'town').length >= 6) break;
    if (near(p) || km(p.lat, p.lng, m.center[0], m.center[1]) < 2) continue;
    picked.push({ ...p, kind: 'town' });
  }
  out[m.id] = picked.map((p) => [p.name, Math.round(p.lat * 1e4) / 1e4, Math.round(p.lng * 1e4) / 1e4, p.kind, p.category, p.fame]);
  count += picked.length;
}
function GOVERNMENT_NAME(n) { return GOV.test(n); }
writeFileSync('public/data/keys.json', JSON.stringify(out));
console.log('metros', Object.keys(out).length, 'places', count);
