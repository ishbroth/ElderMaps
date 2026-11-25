// App icon pieces: node _tools/gen-icon.mjs [scene|tex] [1|2|3]  -> _data/icon/scene-<n>.png (the room, table, map, coins and cutlass, no arrow) and _data/icon/tex-<n>.png (the shield texture that fills the nav arrow).
// _tools/build-icon.mjs then puts the exact nav-arrow shape, the texture and the title together. Needs GEMINI_API_KEY in .env.local
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const SCENE = 'A square painted high-fantasy illustration, realistic video-game render. The viewpoint is as if you are walking into a dim stone room and looking at a heavy old wooden table in front of you, seen at a three-quarter angle from standing height: the table runs away from the viewer in perspective, so the near edge is wide and the far edge narrower, with a dark room behind it that fades to shadow at the top. On the table lies a large aged parchment world map with torn edges, in perspective, with an EMPTY clear area in the middle of the map (no drawing there). A few gold coins are scattered on the map and the table. A large curved cutlass lies on the table in the foreground, angled across the front of the map, big and clearly visible, resting flat on the wood with a soft shadow under it. Warm candlelight, rich detail. The whole picture fills the square edge to edge with no rounded corners and no border, no text, no letters. Leave the top fifth of the picture as dark shadowy room (for a title).';
const TEX = {
  1: 'Black-red Daedric armour plate: angular overlapping plates of dark blackened metal with sharp ridges and glowing red-orange cracks and thin runes, worn and menacing.',
  2: 'Dragonscale: overlapping iridescent grey-green scales, each with a tiny highlight, bone-coloured flecks, very detailed, like the hide of a dragon.',
  3: 'Wood and steel banded: dark oak planks with riveted steel bands running across, scratched, battle-worn, with rivets and nail heads.',
};
const [what = 'scene', only] = process.argv.slice(2);
const list = only ? [only] : ['1', '2', '3'];
for (const n of list) {
  const text = what === 'scene' ? SCENE : `A flat square texture swatch filling the whole image edge to edge, seen straight on, no object, no border, no shadow, no vignette, even lighting: ${TEX[n]}`;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!img) { console.log(n, 'no image', JSON.stringify(j).slice(0, 300)); continue; }
  fs.writeFileSync(path.join(ROOT, '_data', 'icon', `${what}-${n}.png`), Buffer.from(img.inlineData.data, 'base64'));
  console.log('wrote', what, n);
}
