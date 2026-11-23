// Lakes and rivers for the vivid map, slimmed from Natural Earth (public domain): download ne_50m_lakes.geojson and ne_50m_rivers_lake_centerlines.geojson from
// https://github.com/nvkelso/natural-earth-vector (geojson folder) into _data/, then:   node _tools/build-water.mjs
// Writes public/data/lakes.json (outer rings) and public/data/rivers.json (lines), every coordinate a pair of numbers (lng, lat) rounded to two decimals, flat per ring or line.

import fs from 'node:fs';

const r2 = (v) => Math.round(v * 100) / 100;
const flat = (ring) => ring.flatMap(([x, y]) => [r2(x), r2(y)]);

const lakes = JSON.parse(fs.readFileSync('_data/ne_50m_lakes.geojson', 'utf8')).features;
const lakeRings = [];
for (const f of lakes) {
  const g = f.geometry; if (!g) continue;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const p of polys) lakeRings.push(flat(p[0]));
}
fs.writeFileSync('public/data/lakes.json', JSON.stringify(lakeRings));

const rivers = JSON.parse(fs.readFileSync('_data/ne_50m_rivers_lake_centerlines.geojson', 'utf8')).features;
const lines = [];
for (const f of rivers) {
  const g = f.geometry; if (!g || (f.properties?.scalerank ?? 0) > 9) continue;
  const parts = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
  // the big rivers (low scale rank) are drawn wider: [rank, flat points]
  for (const l of parts) lines.push([f.properties?.scalerank ?? 5, flat(l)]);
}
fs.writeFileSync('public/data/rivers.json', JSON.stringify(lines));
console.log('lakes', lakeRings.length, 'rivers', lines.length);
