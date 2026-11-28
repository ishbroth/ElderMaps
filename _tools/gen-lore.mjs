// Writes the lore of the larger places: it reads what a place is really known for (its Wikipedia introduction), and has a text model turn that into four or five short lines with a fantasy twist
// in the voice of the style of that part of the world (thieves and plunder in the cat-folk country, noble warriors in the north, healing and kindness in the Breton lands, ...).
//   node _tools/gen-lore.mjs cities [count]     (the shields: needs public/data/city-styles.json)
//   node _tools/gen-lore.mjs sites [count]      (the best-known waterfalls, peaks, ruins, landmarks...)
// Writes public/data/lore.json  ({ "<place id>": ["line", ...] }); a line says {n} where the place's name goes. Progress is kept in _data/lore-cache.json, so it can be stopped and run again.
// The lines use no names from the games (the app's rule for what people read). Needs GEMINI_API_KEY in .env.local.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
if (!KEY) { console.log('no GEMINI_API_KEY in .env.local'); process.exit(1); }
const MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest';
const mode = process.argv[2] ?? 'cities', limit = Number(process.argv[3] ?? 100000);
const UA = { 'User-Agent': 'ElderMaps/1.0 (https://eldermaps.com; fan project)' };
const LORE = path.join(ROOT, 'public', 'data', 'lore.json'), CACHE = path.join(ROOT, '_data', 'lore-cache.json');
const lore = fs.existsSync(LORE) ? JSON.parse(fs.readFileSync(LORE, 'utf8')) : {};
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const save = () => { fs.writeFileSync(LORE, JSON.stringify(lore)); fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(cache)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const countryName = (iso2) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso2) ?? ''; } catch { return ''; } };

// the voice of each style: what its tales are about
const THEME = {
  nordic: 'noble warriors, honour won in battle, oaths and sagas, mead-halls, hardy frost-bitten crafts, great beasts of the cold',
  breton: 'kindness, healing, hospitality, scholarship, chivalry, gentle magic, courtly manners and quiet intrigue',
  imperial: 'law and legions, roads and trade, politics and diplomacy, ambition, cosmopolitan grandeur and clever intrigue',
  redguard: 'sword-masters and duels, seafaring and desert caravans, fierce pride, honour and great storytellers',
  khajiit: 'plunder, brave and brazen acts of thievery, caravans, smuggling, charm, cunning and shadowy bargains under the moons',
  argonian: 'patience, rivers and swamp, whispering trees of memory, riddles, ancient lore, trackers and healers, dry humour',
  bosmer: 'forest and hunters, archers, pranks, living trees, wild feasts, a bond with the wild and cheeky survival',
  altmer: 'arcane scholarship, crystal spires, pride and lineage, refined arts and enchanting',
  orcish: 'smithing and forges, strongholds, fierce honour, blunt humour, the craft of war and endurance',
  hlaalu: 'merchant houses, contracts and markets, canals and boardwalks, shrewd alliances and rival traders, clever compromise',
  telvanni: 'wizard-lords, towers that are grown not built, ruthless ambition, strange experiments, long lives and aloof power',
  redoran: 'duty and honour, discipline, stoic soldiers, fortress halls and steadfast watchfulness',
  velothi: 'ancestors, ancient temples, pilgrimage, solemn ritual and ghostly guardians of tradition',
  ayleid: 'whimsy and madness, two moods in one place, paradox, delight and dread, bright oddities, nothing quite as expected',
};
const STYLE_NAMES = ['nordic', 'breton', 'imperial', 'argonian', 'redguard', 'khajiit', 'hlaalu', 'telvanni', 'redoran', 'velothi', 'bosmer', 'altmer', 'ayleid', 'orcish'];

async function wikiIntro(title, hint) {
  const key = title + '|' + hint;
  if (cache['w:' + key] !== undefined) return cache['w:' + key];
  let out = '';
  try {
    const api = async (params) => { for (let w = 1500; w <= 12000; w *= 2) { const r = await fetch('https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', origin: '*', ...params }), { headers: UA }); if (r.status === 429 || r.status === 503) { await wait(w); continue; } return r.ok ? r.json() : null; } return null; };
    const s = await api({ action: 'query', list: 'search', srsearch: `${title} ${hint}`, srlimit: '1' });
    const hit = s?.query?.search?.[0]?.title;
    if (hit) { const e = await api({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', titles: hit, exchars: '1500' }); const page = Object.values(e?.query?.pages ?? {})[0]; out = (page?.extract ?? '').replace(/\s+/g, ' ').slice(0, 1300); }
  } catch { /* no introduction: the model works from what it knows */ }
  cache['w:' + key] = out;
  return out;
}

async function write(items) {
  const prompt = `You write short lore for a fantasy map game, where real places of the Earth appear as places in an age-old fantasy realm in the spirit of the Elder Scrolls. For each place below you are given its real name, its country, what it is really known for (from its encyclopaedia introduction) and the VOICE of its part of the realm.
For each place write 4 or 5 short, vivid lines (each one sentence, at most 170 characters, 5 lines at most) that take what the place is REALLY famous for (its history, purpose, industry, an invention, a famous person or event, a landmark) and give it a fantasy twist in the realm's voice: for example a car-making city becomes a city of wheeled forges, a film capital a city of dream-weavers' theatres, a port of spice a city of caravel-thieves. Let the twist follow the VOICE of that region (for example in the cat-folk country: plunder and daring thievery; in the north: noble warriors; in the Breton lands: kindness and healing). Real facts should be recognisable under the twist.
Rules: refer to the place only as {n} (never by its real name, and never invent another name for it). Do not use any proper names from the Elder Scrolls games or any other game or film (no names of gods, races, provinces, cities, books or characters); ordinary fantasy words (guild, mead-hall, moon, mage, forge, dragon, shrine) are fine. Do not name real people or real companies; describe them by what they did (the inventor of the flying machine, the great ironmaster). Rivers, seas and mountains may keep their real names. No modern technology words unless transformed. Each line must stand alone. Return ONLY a JSON array of objects {"id": "...", "lines": ["...", ...]} in the same order.

${items.map((it, i) => `PLACE ${i + 1}\nid: ${it.id}\nreal name: ${it.name}\ncountry: ${it.country}\nVOICE: ${THEME[it.style] ?? THEME.imperial}\nknown for: ${it.intro || '(no text found: use what you know about the place)'}`).join('\n\n')}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } }),
      });
      if (!res.ok) { await wait(3000 * (attempt + 1)); continue; }
      const body = await res.json();
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const arr = JSON.parse(text.replace(/^```json\s*|```\s*$/g, ''));
      if (Array.isArray(arr)) return arr;
    } catch { await wait(2000); }
  }
  return [];
}

const BAD = /\b(skyrim|tamriel|daedra|daedric|dovahkiin|dragonborn|akatosh|nirn|morrowind|elsweyr|cyrodiil|nord|nords|khajiit|argonian|dunmer|altmer|bosmer|orsimer|redguard|breton|tribunal|oblivion|septim|dwemer|ayleid|aedra|talos|molag|sheogorath|vivec|sotha sil|almalexia|whiterun|solitude|windhelm|riften|markarth|winterhold|falkreath|dawnstar|morthal|balmora|vvardenfell|sadrith|ald'ruhn|blackreach|thalmor|alduin|mehrunes|azura|hircine|nocturnal|namira|vaermina)\b/i;

let items = [];
if (mode === 'cities') {
  const cities = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/cities.json'), 'utf8')).filter((c) => c[4] === 'crest').sort((a, b) => b[3] - a[3]);
  const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/city-styles.json'), 'utf8'));
  items = cities.map((c) => { const id = `c:${c[0]}:${c[1]}`; return { id, name: c[0], country: countryName(c[5]), style: STYLE_NAMES[(styles[id] ?? 3) - 1] ?? 'imperial' }; });
} else {
  // the best-known sites: the highest-fame waterfalls, peaks, volcanoes, ruins, caves, forts, shrines and landmarks
  const wild = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/wild.json'), 'utf8')).filter((w) => w[5] >= 40 && !['lighthouse', 'mill'].includes(w[4]));
  const SK = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/keys.json'), 'utf8'));
  const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/city-styles.json'), 'utf8'));
  void styles;
  const sites = wild.map((w) => ({ id: `w:${w[0]}`, name: w[1], lat: w[2], lng: w[3], fame: w[5], what: w[4] }));
  for (const [metro, list] of Object.entries(SK)) for (const k of list) if (k[3] === 'landmark' && k[5] >= 40) sites.push({ id: `k:${metro}:${k[0]}`, name: k[0], lat: k[1], lng: k[2], fame: k[5], what: 'landmark' });
  items = sites.sort((a, b) => b.fame - a.fame).map((s) => ({ ...s, country: '', style: 'imperial' }));
  console.log('sites', items.length);
}
items = items.filter((it) => !lore[it.id]).slice(0, limit);
console.log(mode, 'to write:', items.length);

// the style of a site comes from the style map's grid; read it with sharp
if (mode !== 'cities') {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(path.join(ROOT, 'public/data/style-grid.png')).raw().toBuffer({ resolveWithObject: true });
  const at = (lat, lng) => data[(Math.min(899, Math.max(0, Math.floor((90 - lat) / 0.2))) * info.width + Math.min(1799, Math.max(0, Math.floor((lng + 180) / 0.2)))) * info.channels];
  for (const it of items) it.style = STYLE_NAMES[(at(it.lat, it.lng) || 3) - 1] ?? 'imperial';
}

const BATCH = 4;
let done = 0;
for (let i = 0; i < items.length; i += BATCH) {
  const group = items.slice(i, i + BATCH);
  await Promise.all(group.map(async (it) => { it.intro = await wikiIntro(it.name, it.country || it.what || ''); }));
  const result = await write(group);
  for (const r of result) {
    const it = group.find((g) => g.id === r.id) ?? group[result.indexOf(r)];
    const lines = (r.lines ?? []).filter((l) => typeof l === 'string' && l.length > 20 && l.length <= 260).slice(0, 5);
    if (!it || lines.length < 3 || lines.some((l) => BAD.test(l)) || !lines.some((l) => l.includes('{n}'))) { console.log('  skipped', r.id ?? '?'); continue; }
    lore[it.id] = lines; done++;
  }
  save();
  console.log(`${Math.min(i + BATCH, items.length)}/${items.length}`, group.map((g) => g.name).join(', ').slice(0, 80));
}
console.log('wrote', done, 'lore entries; total', Object.keys(lore).length);
