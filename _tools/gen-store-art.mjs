// Pictures for the store screenshots and banners: node _tools/gen-store-art.mjs <name>   -> _data/store/<name>.png
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const P = {
  chicago: 'A wide landscape realistic high-fantasy video-game render of the Chicago skyline seen from the lakefront at golden hour, re-imagined as a great city of an old realm: the real towers (the tall black Hancock tower with its two antennas, the Willis tower with its stepped bundled tubes, the Trump tower, the Wrigley clock-tower building) kept in their true places and shapes but with carved stone, copper roofs, pennants and banners, with the glassy lake in front and a wide area of clear dramatic cloudy sky above (the top 40 percent of the picture is open sky). Painterly realism, rich detail, no text, no creatures in the sky.',
  chicagoTall: "A tall portrait realistic high-fantasy video-game render of the Chicago skyline seen from the lakefront at golden hour, re-imagined as a great city of an old realm: the real towers (the tall black Hancock tower with its two antennas, the Willis tower with its stepped bundled tubes, the Trump tower, the Wrigley clock-tower building) kept in their true places and shapes but with carved stone, copper roofs, pennants and banners, with the glassy lake and old stone piers in front, and a very large area of clear dramatic cloudy sky filling the top 50 percent of the tall picture. Vertical 9:16 composition. Painterly realism, rich detail, no text, no creatures in the sky.",
};
for (const name of process.argv.slice(2)) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: P[name] }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
  const j = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!img) { console.log(name, 'no image', JSON.stringify(j).slice(0, 200)); continue; }
  fs.writeFileSync(path.join(ROOT, '_data', 'store', `${name}.png`), Buffer.from(img.inlineData.data, 'base64'));
  console.log('wrote', name);
}
