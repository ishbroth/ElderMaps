// The icon's room again, in the picture the user liked (parchment map on a table seen from above, candles, coins) with an ancient engraved sword, and a clear middle for the arrow.
//   node _tools/gen-icon-scene.mjs [name]  -> _data/icon/scene-<name>.png
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const prompt = 'A square painted high-fantasy illustration, realistic video-game render, seen from directly above at a slight angle. An aged parchment world map with torn, burnt and curled edges lies on an old dark wooden table with visible grain and scratches, the map taking up only about two thirds of the width of the picture with a wide border of bare table all round it. The map shows continents drawn in brown ink. In the exact middle of the map is a large EMPTY area of plain clean parchment (no drawing, nothing on it) where an emblem will be placed. A few piles of gold coins are scattered on the map and the table. Two lit candles in the upper left corner give warm light. An ancient engraved straight longsword with an ornate hilt, a crossguard and a long blade engraved with runes and scrollwork lies angled across the front of the map, large and clearly visible, resting flat with a soft shadow. The picture fills the whole square edge to edge: no rounded corners, no border, no frame, no text, no letters. The top fifth of the picture is the dark wooden table so a title can be written there.';
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["d", "e", "f"]) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!img) { console.log(name, 'no image'); continue; }
  fs.writeFileSync(path.join(ROOT, '_data', 'icon', `scene-${name}.png`), Buffer.from(img.inlineData.data, 'base64'));
  console.log('wrote', name);
}
