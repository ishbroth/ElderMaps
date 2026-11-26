// Finds the picture the server would use for each of the biggest shield cities, so they can be looked at.   npx tsx _tools/city-audit.mts [count] [skip]
import fs from 'node:fs';
import { findPhotoFor } from '../supabase/functions/_shared/photoSources.ts';
const H = { 'User-Agent': 'ElderMaps/1.0 (https://eldermaps.com; fan project)' };
const cities = (JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8')) as [string, number, number, number, string, string][]).filter((c) => c[4] === 'crest').sort((a, b) => b[3] - a[3]);
const n = Number(process.argv[2] ?? 100), skip = Number(process.argv[3] ?? 0);
const out = '_data/store/city-audit2.jsonl';
fs.mkdirSync('_data/store', { recursive: true });
const only = process.env.ONLY?.split('|');
const queue = only ? cities.filter((c) => only.includes(c[0])) : cities.slice(skip, skip + n);
const run = async (c: (typeof cities)[number]) => {
  let line: Record<string, unknown> = { name: c[0], iso: c[5], pop: c[3] };
  try { const h = await findPhotoFor({ name: c[0], lat: c[1], lng: c[2], city: true }, H); line = { ...line, ok: !!h, title: h?.title, source: h?.source, url: h?.imageUrl, license: h?.license, author: h?.author }; } catch (e) { line = { ...line, ok: false, error: String(e).slice(0, 80) }; }
  fs.appendFileSync(out, JSON.stringify(line) + '\n');
  console.log(line.ok ? 'OK  ' : 'MISS', c[0], line.title ?? '');
};
await Promise.all(Array.from({ length: 3 }, async () => { for (let c = queue.shift(); c; c = queue.shift()) await run(c); }));
