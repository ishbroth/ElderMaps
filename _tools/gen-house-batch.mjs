// Paints every room of the house in a style, then cuts the magenta away and saves it for the game.
//   node _tools/gen-house-batch.mjs <nordic|imperial> [roomId ...]      -> _data/house/raw/<style>-<id>.png, public/house/<style>/<id>.webp
// Rooms are painted into the cutaway guide _data/house/template.png (see make-room-template.mjs), so every room has the same floor diamond and back walls. Needs GEMINI_API_KEY in .env.local
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '_data', 'house', 'raw');
fs.mkdirSync(RAW, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const STYLES = {
  nordic: 'a northern longhouse style: dark timber beams and planks, rough stone, animal furs, iron fittings, carved knotwork, warm firelight',
  imperial: 'an imperial city style: pale carved stone, red and gold banners, polished wood, marble floor, brass lamps, formal columns, rich dyed cloth',
};
const ROOMS = {
  entry: 'entrance hall with a big front door in one wall',
  stairs: 'stairwell room: a plain landing with an opening and a short stair going down in the floor',
  hallway: 'plain hallway with doorways in both walls',
  garden: 'indoor herb garden with raised beds of soil and a skylight',
  study: 'scriptorium: a quiet study with high windows',
  living: 'great hall: a large sitting hall with a wide hearth',
  dining: 'feast hall: a dining hall',
  kitchen: 'kitchen with a stone hearth and a window',
  bedroom: 'bedchamber with a window',
  laundry: 'washhouse with a drain in the floor and a window',
  bathroom: 'bathhouse with a stone floor and a drain',
  entertainment: "bard's hall: a hall with a small raised stage in a corner",
  game: 'tavern room with a wide window and a plain floor',
  workshop: 'forge room with a stone floor, a chimney and a high window',
};
const [style, ...only] = process.argv.slice(2);
if (!KEY || !STYLES[style]) { console.log('usage: <nordic|imperial> [roomId ...]'); process.exit(1); }
const ids = only.length ? only : Object.keys(ROOMS);
const template = fs.readFileSync(path.join(ROOT, '_data', 'house', 'template.png')).toString('base64');

/** Magenta to transparent: how far a pixel is from the key colour decides how see-through it is. */
async function cut(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mag = Math.min(r, b) - g; // magenta is high red, high blue, low green
    if (mag > 90) data[i + 3] = 0;
    else if (mag > 50) { data[i + 3] = Math.round(255 * (90 - mag) / 40); data[i] = Math.min(r, g + 40); data[i + 2] = Math.min(b, g + 40); }
  }
  return sharp(data, { raw: info }).resize(1024, 820, { fit: "fill" }).webp({ quality: 88, alphaQuality: 95 }).toBuffer();
}

async function one(id) {
  const out = path.join(ROOT, 'public', 'house', style, `${id}.webp`);
  if (fs.existsSync(out) && !process.env.REDO) return;
  const prompt = `Keep this exact isometric cutaway silhouette (the floor diamond and the two back walls, the magenta stays flat magenta) and paint it as the inside of a ${ROOMS[id]} in ${STYLES[style]}. Realistic high-fantasy video game render, rich detailed textures, soft warm light, painterly realism, no outline. The room is EMPTY: no furniture, no people, no rugs and nothing standing on the floor, only the architecture, wall finishes, floor material, windows and doors in the walls. Do not move or resize any edge of the shape.`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: 'image/png', data: template } }, { text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
    const j = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!img) { console.log(id, 'no image, retrying'); continue; }
    const raw = Buffer.from(img.inlineData.data, 'base64');
    fs.writeFileSync(path.join(RAW, `${style}-${id}.png`), raw);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await cut(raw));
    console.log('wrote', style, id);
    return;
  }
  console.log('FAILED', style, id);
}
for (const id of ids) await one(id);
