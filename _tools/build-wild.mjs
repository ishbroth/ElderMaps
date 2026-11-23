// The countryside of the map: waterfalls, caves, ruins, forts, camps, lighthouses, volcanoes, hot springs, passes, glaciers, parks, monasteries and peaks,
// from Wikidata (the more language editions write about a place, the better known it is). Writes public/data/wild.json: [id, name, lat, lng, type, fame].
//   node _tools/build-wild.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const KINDS = [
  // [type, Wikidata class, fewest language editions that write about it, most to take]. The floors are low, so the lesser-known places of the countryside are in too, not only the famous.
  ['waterfall', 'Q34038', 3, 3000],
  ['cave', 'Q35509', 3, 3000],
  ['ruin', 'Q109607', 4, 3000],
  ['ruin', 'Q839954', 8, 3000],
  ['fort', 'Q57831', 4, 3000],
  ['fort', 'Q23413', 12, 3000],
  ['camp', 'Q1021290', 3, 600],
  ['lighthouse', 'Q39715', 6, 1500],
  ['volcano', 'Q8072', 8, 1200],
  ['spring', 'Q177380', 4, 1200],
  ['pass', 'Q133056', 5, 2000],
  ['glacier', 'Q35666', 8, 1000],
  ['grove', 'Q46169', 10, 2000],
  ['shrine', 'Q44613', 10, 1500],
  ['peak', 'Q8502', 20, 3000],
  ['stones', 'Q4140', 3, 600],
  // mills, manors, towers: old working and grand buildings out in the country
  ['mill', 'Q38720', 3, 1500],
  ['mill', 'Q185187', 3, 1500],
  ['mill', 'Q44494', 4, 1500],
  ['keep', 'Q1802963', 6, 1500],
  ['keep', 'Q16560', 8, 1500],
  ['tower', 'Q12518', 12, 1500],
  // the countryside of the United States and Canada, where a lesser place is written about in only one or two languages: a floor of 1 language edition, one country at a time
  ...[['Q30', 4000], ['Q16', 2000]].flatMap(([c, n]) => [
    ['waterfall', 'Q34038', 0, n, c], ['cave', 'Q35509', 0, n, c], ['ruin', 'Q109607', 0, n, c], ['ruin', 'Q839954', 0, n, c], ['fort', 'Q57831', 0, n, c], ['fort', 'Q23413', 0, n, c],
    ['lighthouse', 'Q39715', 0, n, c], ['spring', 'Q177380', 0, n, c], ['mill', 'Q38720', 0, n, c], ['mill', 'Q185187', 0, n, c], ['mill', 'Q44494', 1, n, c],
    ['keep', 'Q1802963', 1, n, c], ['tower', 'Q12518', 2, n, c], ['stones', 'Q4140', 0, n, c], ['grove', 'Q46169', 0, n, c],
  ]),
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(type, qid, minLinks, limit, country) {
  const query = `SELECT ?i ?iLabel ?c ?sl WHERE { ?i wdt:P31 wd:${qid}; ${country ? `wdt:P17 wd:${country};` : ''} wdt:P625 ?c; wikibase:sitelinks ?sl. FILTER(?sl>${minLinks}) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?sl) LIMIT ${limit}`;
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
for (const [type, qid, min, limit, country] of KINDS) {
  const got = await run(type, qid, min, limit, country);
  for (const p of got) if (!all.has(p[0])) all.set(p[0], p);
  console.log(type, qid, got.length);
  await sleep(1500);
}
for (const e of JSON.parse(readFileSync('_tools/wild-extras.json', 'utf8'))) if (!all.has(e[0])) all.set(e[0], e);
writeFileSync('public/data/wild.json', JSON.stringify([...all.values()]));
console.log('total', all.size);
