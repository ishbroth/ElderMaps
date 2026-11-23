// Which cities get which mark on the map.
//   crest    the anchor city of a metro of 1,000,000 or more (Cleveland: its metro is over a million, though the city is not)
//   town     the anchor of a smaller metro (200,000 to 1,000,000) that stands on its own (Akron, Youngstown)
//   village  any other city big enough for where it stands: the farms, mills and mines about a bigger place (Parma, Lorain, Canton). The bar is higher round a big metro
//            (90,000 within 70 km of a crest, so suburbs do not crowd it) and lower in open country (25,000 when no crest is within 70 km and no town within 30 km, so
//            a lone city like Saginaw, Bay City, Mansfield or Lima gets its mark); 50,000 near a town.
// Metros come from WastelandMaps' index (metros-index.json); the cities from GeoNames' cities15000 (download it to _data/cities15000.txt first):
//   https://download.geonames.org/export/dump/cities15000.zip
//   node _tools/build-cities.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const KM_APART = 45; // metros closer than this are one place, not two

const km = (aLat, aLng, bLat, bLng) => Math.hypot((bLng - aLng) * 111.32 * Math.cos((aLat * Math.PI) / 180), (bLat - aLat) * 111.32);
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const cities = readFileSync('_data/cities15000.txt', 'utf8').split('\n').map((line) => {
  const c = line.split('\t');
  return { name: c[1], ascii: c[2], lat: Number(c[4]), lng: Number(c[5]), iso2: c[8], pop: Number(c[14]) };
}).filter((c) => c.pop >= 25000 && Number.isFinite(c.lat));
const metros = JSON.parse(readFileSync('public/data/metros-index.json', 'utf8'));

// how big is the metro's own main city (so the main city anchors, not a bigger suburb that lends its name to the whole urban area)
for (const m of metros) {
  let best = null;
  for (const c of cities) {
    if (Math.abs(c.lat - m.lat) > 0.4 || Math.abs(c.lng - m.lng) > 0.5 || c.iso2 !== m.country) continue;
    const d = km(m.lat, m.lng, c.lat, c.lng);
    const same = fold(c.name) === fold(m.name) || fold(c.ascii) === fold(m.name);
    const score = (same ? 1000 : 0) - d;
    if (d < 25 && (!best || score > best.score)) best = { score, pop: c.pop };
  }
  m.city = best ? best.pop : m.pop * 0.04;
}

const picked = [];
const near = (m, list, limit) => list.some((q) => (q.country ?? q.iso2) === (m.country ?? m.iso2) && km(m.lat, m.lng, q.lat, q.lng) < limit);

// the crests: the main city of each metro over a million, the more important of two close ones
for (const m of metros.filter((x) => x.pop >= 1_000_000).sort((a, b) => b.city - a.city)) {
  if (near(m, picked, KM_APART)) continue;
  picked.push({ name: m.name, lat: m.lat, lng: m.lng, pop: m.pop, tier: 'crest', iso2: m.country });
}
// the towns: smaller metros that stand on their own, not within reach of a bigger place already marked
for (const m of metros.filter((x) => x.pop >= 200_000 && x.pop < 1_000_000).sort((a, b) => b.city - a.city)) {
  if (near(m, picked, KM_APART)) continue;
  picked.push({ name: m.name, lat: m.lat, lng: m.lng, pop: m.pop, tier: 'town', iso2: m.country });
}
// the villages: every other city that clears the bar for where it stands, one to each stretch of country
const marked = picked.slice();
let villages = 0;
for (const c of cities.sort((a, b) => b.pop - a.pop)) {
  if (near(c, marked, 9)) continue;
  const nearest = (tier) => picked.filter((p) => p.tier === tier && p.iso2 === c.iso2).reduce((m, p) => Math.min(m, km(c.lat, c.lng, p.lat, p.lng)), Infinity);
  const floor = nearest('crest') < 70 ? 90000 : nearest('town') < 30 ? 50000 : 25000;
  if (c.pop < floor) continue;
  picked.push({ name: c.name, lat: c.lat, lng: c.lng, pop: c.pop, tier: 'village', iso2: c.iso2 });
  marked.push(c);
  villages++;
}
const tiers = { crest: 0, town: 0, village: 0 };
for (const p of picked) tiers[p.tier]++;
console.log(tiers);
const show = (n) => picked.filter((p) => p.name === n).map((p) => `${p.name} ${p.tier}`).join(', ') || `${n}: none`;
console.log(['Cleveland', 'Akron', 'Youngstown', 'Canton', 'Parma', 'Lorain', 'Los Angeles', 'Anaheim', 'Long Beach', 'San Diego'].map(show).join(' | '));
writeFileSync('public/data/cities.json', JSON.stringify(picked.map((p) => [p.name, Math.round(p.lat * 1e4) / 1e4, Math.round(p.lng * 1e4) / 1e4, p.pop, p.tier, p.iso2])));
console.log('written', picked.length, villages);
