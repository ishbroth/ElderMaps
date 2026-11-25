// Paints every piece of furniture in a style on flat magenta, cuts it out and trims it, and saves it for the game.
//   npx tsx _tools/gen-house-pieces.mjs <nordic|imperial> [pieceId ...]      -> public/house/<style>/f/<id>.webp   (REDO=1 makes them again)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOM_DEFS } from '../src/lib/house.ts';
const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const STYLES = {
  nordic: 'a northern longhouse style: dark timber, rough stone, animal furs, iron fittings, carved knotwork',
  imperial: 'an imperial city style: pale carved stone, polished wood, red and gold cloth, brass, marble',
};
// what a piece looks like, where the plain name is not enough
const HINT = {
  decon: 'a stone hearth-altar with a bowl of living flame, the Hearthstone of the house',
  fishtank: 'a standing rune lantern with a glowing blue crystal',
  plant: 'a small indoor tree in a pot',
  corn: 'a tall patch of barley in a raised bed', tatoes: 'a raised bed of root vegetables', mutfruit: 'a low raised stone planter box full of berry bushes with red berries (a garden planter, NOT a bed for sleeping, no cloth, no canopy)',
  tv: 'an enchanting table with glowing runes and crystals', instrument: 'a lute on a stand',
  sinkcabinets: 'wooden cupboards with a stone basin', fridge: 'an ice chest of wood and iron', stove: 'a stone cooking hearth with a pot over the fire',
  punchbowl: 'a barrel-shaped mead cask on a stand', couch: 'a long carved wooden bench with cushions', coffeetable: 'a low wooden table',
  washer: 'a wooden wash tub', dryer: 'a wooden drying rack with cloth hung on it', ironingboard: 'a wooden pressing board',
  toilet: 'a plain wooden privy seat', bathsink: 'a stone wash basin on a stand', shower: 'a large wooden bathing tub',
  seating: 'a row of wooden benches', screen: "a storyteller's hanging tapestry on a wooden frame", speakers: 'a pair of large war drums', snackbar: 'a long feast board with bread and cheese',
  pooltable: 'a gaming table with carved pieces on it', pinball: 'a dice table', dartboard: 'ONE single round archery target on a wooden stand (only one target)',
  craftingtable: 'an alchemy station with bottles, a mortar and herbs', armorstand: 'ONE single wooden stand holding one suit of armour (only one stand)', toolchest: 'an iron-bound tool chest',
};
const piecesOf = [];
for (const r of ROOM_DEFS) for (const f of r.furniture) if (!piecesOf.some((p) => p.id === f.id)) piecesOf.push({ id: f.id, name: f.name, room: r.name });
const [style, ...only] = process.argv.slice(2);
if (!KEY || !STYLES[style]) { console.log('usage: <nordic|imperial> [pieceId ...]'); process.exit(1); }
const list = only.length ? piecesOf.filter((p) => only.includes(p.id)) : piecesOf;

async function cut(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // the background colour is read from the four corners (the painter sometimes drifts from pure magenta to a purple), and pixels close to it are cut away
  const at = (x, y) => [data[(y * info.width + x) * 4], data[(y * info.width + x) * 4 + 1], data[(y * info.width + x) * 4 + 2]];
  const cs = [at(2, 2), at(info.width - 3, 2), at(2, info.height - 3), at(info.width - 3, info.height - 3)];
  const bg = [0, 1, 2].map((k) => cs.map((c) => c[k]).sort((p, q) => p - q)[1]);
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    const mag = Math.min(data[i], data[i + 2]) - data[i + 1];
    if (dist < 70 || mag > 110) data[i + 3] = 0;
    else if (dist < 120) { data[i + 3] = Math.round(255 * (dist - 70) / 50); if (mag > 40) { data[i] = Math.min(data[i], data[i + 1] + 30); data[i + 2] = Math.min(data[i + 2], data[i + 1] + 30); } }
  }
  return sharp(data, { raw: info }).trim().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 95 }).toBuffer();
}

for (const p of list) {
  const out = path.join(ROOT, 'public', 'house', style, 'f', `${p.id}.webp`);
  if (fs.existsSync(out) && !process.env.REDO) continue;
  const what = HINT[p.id] ?? `${p.name} (furniture for a ${p.room.toLowerCase()})`;
  const prompt = `A single piece of furniture: ${what}, in ${STYLES[style]}. Realistic high-fantasy video game render, isometric three-quarter view from above-front-left, rich textures, no outline, centred, ONLY the object itself (no hearth, no fire unless it is part of the piece, no architecture): no platform, no pedestal, no rug under it, no floor tile, no walls, no columns or banners that are not part of the furniture, on a perfectly flat solid magenta (#FF00FF) background with no floor, no shadow, no text.`;
  let done = false;
  for (let attempt = 0; attempt < 3 && !done; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
    const j = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
    if (!img) { console.log(p.id, 'no image, retrying'); continue; }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await cut(Buffer.from(img.inlineData.data, 'base64')));
    console.log('wrote', style, p.id);
    done = true;
  }
  if (!done) console.log('FAILED', style, p.id);
}
