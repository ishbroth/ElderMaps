// The countryside of the map: waterfalls, caves, ruins, forts, camps, lighthouses, volcanoes, hot springs, passes, glaciers, parks, monasteries and peaks,
// from Wikidata (the more language editions write about a place, the better known it is). Writes public/data/wild.json: [id, name, lat, lng, type, fame].
//   node _tools/build-wild.mjs
import { writeFileSync } from 'node:fs';

const KINDS = [
  ['waterfall', 'Q34038', 14, 700],
  ['cave', 'Q35509', 14, 500],
  ['ruin', 'Q109607', 14, 500],
  ['ruin', 'Q839954', 30, 500],
  ['fort', 'Q57831', 14, 400],
  ['fort', 'Q23413', 40, 500],
  ['camp', 'Q1021290', 5, 250],
  ['lighthouse', 'Q39715', 16, 300],
  ['volcano', 'Q8072', 22, 250],
  ['spring', 'Q177380', 10, 200],
  ['pass', 'Q133056', 12, 250],
  ['glacier', 'Q35666', 22, 200],
  ['grove', 'Q46169', 30, 400],
  ['shrine', 'Q44613', 28, 300],
  ['peak', 'Q8502', 50, 400],
  ['stones', 'Q4140', 10, 200],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(type, qid, minLinks, limit) {
  const query = `SELECT ?i ?iLabel ?c ?sl WHERE { ?i wdt:P31 wd:${qid}; wdt:P625 ?c; wikibase:sitelinks ?sl. FILTER(?sl>${minLinks}) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?sl) LIMIT ${limit}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), { headers: { 'User-Agent': 'ElderMaps/0.1 (fan map project)', Accept: 'application/sparql-results+json' } });
    if (res.ok) {
      const j = await res.json();
      return j.results.bindings.map((b) => {
        const m = /Point\(([-\d.e]+) ([-\d.e]+)\)/.exec(b.c.value);
        return m ? [b.i.value.split('/').pop(), b.iLabel.value, Math.round(Number(m[2]) * 1e4) / 1e4, Math.round(Number(m[1]) * 1e4) / 1e4, type, Number(b.sl.value)] : null;
      }).filter((p) => p && !/^Q\d+$/.test(p[1]));
    }
    await sleep(4000 * (attempt + 1));
  }
  console.warn('failed', type, qid);
  return [];
}

const all = new Map();
for (const [type, qid, min, limit] of KINDS) {
  const got = await run(type, qid, min, limit);
  for (const p of got) if (!all.has(p[0])) all.set(p[0], p);
  console.log(type, qid, got.length);
  await sleep(1500);
}
writeFileSync('public/data/wild.json', JSON.stringify([...all.values()]));
console.log('total', all.size);
