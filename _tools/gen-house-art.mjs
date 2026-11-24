// Paints house rooms and furniture with the image model.
//   node _tools/gen-house-art.mjs room <style> <roomId>      -> _data/house/room-<style>-<roomId>.png (painted into _data/house/template.png's cutaway)
//   node _tools/gen-house-art.mjs piece <style> <pieceName>  -> _data/house/piece-<style>-<slug>.png (on magenta)
// styles: nordic, imperial.   Needs GEMINI_API_KEY in .env.local
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '_data', 'house');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';
const STYLES = {
  nordic: 'a northern longhouse style: dark timber beams and planks, rough stone hearth, animal furs, iron fittings, carved dragon-knot woodwork, warm firelight',
  imperial: 'an imperial city style: pale carved stone, red and gold banners, polished wood, marble floor, brass lamps, formal columns, rich dyed cloth',
};
const [mode, style, what] = process.argv.slice(2);
if (!KEY || !STYLES[style] || !what) { console.log('usage: room|piece <nordic|imperial> <name>'); process.exit(1); }
const parts = [];
let prompt;
if (mode === 'room') {
  parts.push({ inlineData: { mimeType: 'image/png', data: fs.readFileSync(path.join(OUT, 'template.png')).toString('base64') } });
  prompt = `Keep this exact isometric cutaway silhouette (the floor diamond and the two back walls, the magenta stays magenta) and paint it as the inside of a ${what} in ${STYLES[style]}. Realistic high-fantasy video game render, rich detailed textures, soft warm light, painterly realism, no outline. The room is EMPTY: no furniture, no people, no objects on the floor, only the architecture, wall finishes, floor material, windows and doors in the walls. Do not move or resize any edge of the shape.`;
} else {
  prompt = `A single piece of furniture: ${what}, in ${STYLES[style]}. Realistic high-fantasy video game render, isometric three-quarter view from above-front-left, rich textures, no outline, centred, ONLY the object itself (no hearth, no fire, no architecture): no platform, no pedestal, no rug under it, no floor tile, no walls, no columns or banners that are not part of the furniture, on a perfectly flat solid magenta (#FF00FF) background with no floor, no shadow, no text.`;
}
parts.push({ text: prompt });
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) });
const j = await r.json();
const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
if (!img) { console.log('no image', JSON.stringify(j).slice(0, 400)); process.exit(1); }
const slug = what.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const file = path.join(OUT, `${mode}-${style}-${slug}.png`);
fs.writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'));
console.log('wrote', file);
