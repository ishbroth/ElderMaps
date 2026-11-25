// Flat texture swatches for the nav arrow: dark oak planks, and riveted steel.   node _tools/gen-icon-tex.mjs   -> _data/icon/tex-oak.png, tex-steel.png
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const T = {
  oak: 'A flat square texture swatch filling the whole image edge to edge, seen straight on: dark oak wooden planks laid side by side VERTICALLY, each plank a hand-width wide, with grain, knots, scratches and thin dark gaps between the planks, warm brown, even lighting, no object, no border, no shadow, no vignette.',
  steel: 'A flat square texture swatch filling the whole image edge to edge, seen straight on: worn, scratched, hammered dark steel plate, brushed grey with small dents and edge wear, even lighting, no rivets, no object, no border, no shadow, no vignette.',
};
for (const [name, text] of Object.entries(T)) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!img) { console.log(name, 'no image'); continue; }
  fs.writeFileSync(path.join(ROOT, '_data', 'icon', `tex-${name}.png`), Buffer.from(img.inlineData.data, 'base64'));
  console.log('wrote', name);
}
