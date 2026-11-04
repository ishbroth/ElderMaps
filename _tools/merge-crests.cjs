// Merges the researched choices (_data/research/out-1..6.json) into public/data/crests.json, and makes sure no two cities have the same shield:
// a shield is (emblem, field, pattern, shape). A clash is settled by changing the shape, then the pattern, for the later (smaller) city.
const fs = require('fs');
const rows = [];
for (let i = 1; i <= 6; i++) rows.push(...JSON.parse(fs.readFileSync(`_data/research/out-${i}.json`, 'utf8')));
const PATTERNS = ['plain', 'chevron', 'bend', 'fess', 'pale', 'checks', 'saltire', 'chief', 'roundels', 'stripes'];
const hash = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const used = new Set();
const out = {};
let changed = 0;
for (const r of rows) {
  let shape = hash(r.name) % 4, pattern = r.pattern;
  const key = () => `${r.emblem}|${r.field}|${pattern}|${shape}`;
  let tries = 0;
  while (used.has(key()) && tries < 40) {
    tries++;
    if (tries <= 3) shape = (shape + 1) % 4;
    else { pattern = PATTERNS[(PATTERNS.indexOf(pattern) + 1) % PATTERNS.length]; shape = hash(r.name + tries) % 4; }
  }
  if (tries) changed++;
  used.add(key());
  out[`${r.name}|${r.iso2}`] = { e: r.emblem, f: r.field, p: pattern, s: shape };
}
fs.writeFileSync('public/data/crests.json', JSON.stringify(out));
const emblems = new Set(rows.map((r) => r.emblem));
console.log('cities', rows.length, 'keys', Object.keys(out).length, 'distinct emblems', emblems.size, 'adjusted', changed, 'unique shields', used.size);
