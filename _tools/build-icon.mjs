// Builds the icon pages: the painted room, then the EXACT nav-arrow shape (the one in WastelandMaps' icon: apex, left foot, notch, right foot): wood planks inside and a riveted steel band right round
// its edge, the left half a little lighter, then the title in the site's own lettering. Writes _data/icon/page-<n>.html; _tools/cdp.mjs photographs each one at 1024x1024.
//   node _tools/build-icon.mjs [d e f]
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve(import.meta.dirname, '..', '_data', 'icon').split(String.fromCharCode(92)).join('/');
const P = [[513, 331.3], [347.7, 688.7], [511, 610.5], [676.3, 692.7]];
const d = (pts) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join('L') + 'Z';
const ARROW = d(P);
const LEFT = d([P[0], P[1], P[2]]);
const RIGHT = d([P[0], P[2], P[3]]);
// rivets sit along a smaller copy of the arrow, a little inside the steel band
const cx = (P[0][0] + P[1][0] + P[3][0]) / 3, cy = (P[0][1] + P[1][1] + P[3][1]) / 3;
const shrink = (k) => P.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
const rivets = [];
{
  const ring = shrink(0.9);
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 34));
    for (let k = 0; k < n; k++) rivets.push([x1 + ((x2 - x1) * (k + 0.5)) / n, y1 + ((y2 - y1) * (k + 0.5)) / n]);
  }
}
const SCALE = 1.5, CX = 512, CY = 520, BAND = 40;
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['d', 'e', 'f'];
for (const n of names) {
  const html = `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400&display=swap" rel="stylesheet">
<style>html,body{margin:0;width:1024px;height:1024px;overflow:hidden;background:#000}
.scene{position:absolute;inset:0;background:url(file:///${DIR}/scene-${n}.png) center/cover}
.top{position:absolute;left:0;right:0;top:0;height:300px;background:linear-gradient(#000c,#0000)}
h1{position:absolute;left:0;right:0;top:48px;margin:0;text-align:center;font:300 104px 'Jost',sans-serif;letter-spacing:.34em;padding-left:.34em;color:#f2f2ee;text-shadow:0 2px 14px #000,0 0 30px #000a}
svg{position:absolute;inset:0}</style>
<div class="scene"></div><div class="top"></div><h1>ELDERMAPS</h1>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><defs>
<clipPath id="a"><path d="${ARROW}"/></clipPath>
<pattern id="steel" patternUnits="userSpaceOnUse" x="330" y="320" width="360" height="380"><image href="file:///${DIR}/tex-steel.png" width="360" height="380" preserveAspectRatio="none"/></pattern>
<radialGradient id="rv" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e8e8e8"/><stop offset="1" stop-color="#5a5a5a"/></radialGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="10" dy="16" stdDeviation="12" flood-color="#000" flood-opacity=".7"/></filter></defs>
<g transform="translate(${CX} ${CY}) scale(${SCALE}) translate(-512 -512)">
<path d="${ARROW}" fill="#222" filter="url(#sh)"/>
<g clip-path="url(#a)">
<image href="file:///${DIR}/tex-oak.png" x="300" y="300" width="420" height="420" preserveAspectRatio="xMidYMid slice"/>
<path d="${ARROW}" fill="none" stroke="url(#steel)" stroke-width="${BAND}" stroke-linejoin="miter" stroke-miterlimit="10"/>
${rivets.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="url(#rv)" stroke="#222" stroke-width="1"/>`).join('')}
<path d="${LEFT}" fill="#fff" opacity=".2"/>
<path d="${RIGHT}" fill="#000" opacity=".28"/>
<path d="${ARROW}" fill="none" stroke="#0a0806" stroke-width="9" stroke-linejoin="miter" stroke-miterlimit="10"/>
</g></g></svg>`;
  fs.writeFileSync(`${DIR}/page-${n}.html`, html);
}
console.log('pages written');
