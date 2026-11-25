// The icon as the user chose it (scene f, the exact nav arrow, oak inside), now with the steel band drawn like the shield's rim in the wood-and-steel picture: a real bevelled band of
// pale hammered steel with a bright outer edge, a dark groove along its inner edge, nicks, and big domed rivets. The band is exactly an inset copy of the arrow's own outline.
//   node _tools/build-icon5.mjs  -> _data/icon/page-5a.html, page-5b.html
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve(import.meta.dirname, '..', '_data', 'icon').split(String.fromCharCode(92)).join('/');
const P = [[513, 331.3], [347.7, 688.7], [511, 610.5], [676.3, 692.7]];
const d = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z';
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
/** The outline moved inward by t (each side shifted, neighbours meeting where their lines cross). */
function inset(poly, t) {
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    let nx = -dy / len, ny = dx / len;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (!inside([mid[0] + nx * 1.5, mid[1] + ny * 1.5], poly)) { nx = -nx; ny = -ny; }
    return { p: [a[0] + nx * t, a[1] + ny * t], dx, dy };
  });
  return lines.map((l2, i) => {
    const l1 = lines[(i + lines.length - 1) % lines.length];
    const den = l1.dx * l2.dy - l1.dy * l2.dx;
    const s = ((l2.p[0] - l1.p[0]) * l2.dy - (l2.p[1] - l1.p[1]) * l2.dx) / den;
    return [l1.p[0] + l1.dx * s, l1.p[1] + l1.dy * s];
  });
}
const SCALE = 1.15, CX = 512, CY = 512;
const variants = { splash: 24 }; // the band's width, in the arrow's own units
for (const [name, band] of Object.entries(variants)) {
  const outer = P, inner = inset(P, band), mid = inset(P, band / 2);
  const bandPath = d(outer) + d(inner); // even-odd: the ring between
  const rivets = [];
  for (let i = 0; i < mid.length; i++) {
    const [x1, y1] = mid[i], [x2, y2] = mid[(i + 1) % mid.length];
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 40));
    for (let k = 0; k < n; k++) rivets.push([x1 + ((x2 - x1) * (k + 0.5)) / n, y1 + ((y2 - y1) * (k + 0.5)) / n]);
  }
  const html = `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400&display=swap" rel="stylesheet">
<style>html,body{margin:0;width:100vw;height:100vh;overflow:hidden;background:#000}
.scene{position:absolute;inset:0;background:url(file:///${DIR}/scene-f.png) center/cover}
.top{position:absolute;left:0;right:0;top:0;height:300px;background:linear-gradient(#000c,#0000)}
h1{position:absolute;left:0;right:0;top:48px;margin:0;text-align:center;font:300 104px 'Jost',sans-serif;letter-spacing:.34em;padding-left:.34em;color:#f2f2ee;text-shadow:0 2px 14px #000,0 0 30px #000a}
svg{position:absolute;inset:0;width:100vw;height:100vh}</style>
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><defs>
<clipPath id="a"><path d="${d(outer)}"/></clipPath>
<pattern id="steel" patternUnits="userSpaceOnUse" x="330" y="320" width="360" height="380"><image href="file:///${DIR}/tex-steel.png" width="360" height="380" preserveAspectRatio="none"/></pattern>
<filter id="pale"><feComponentTransfer><feFuncR type="linear" slope="1.55" intercept="0.08"/><feFuncG type="linear" slope="1.55" intercept="0.09"/><feFuncB type="linear" slope="1.55" intercept="0.12"/></feComponentTransfer></filter>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<radialGradient id="rv" cx="34%" cy="30%" r="75%"><stop offset="0" stop-color="#f4f4f2"/><stop offset=".55" stop-color="#9a9a98"/><stop offset="1" stop-color="#4a4a48"/></radialGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="10" dy="16" stdDeviation="12" flood-color="#000" flood-opacity=".7"/></filter></defs>
<g transform="translate(${CX} ${CY}) scale(${SCALE}) translate(-512 -512)">
<path d="${d(outer)}" fill="#000"/>
<g clip-path="url(#a)">
<image href="file:///${DIR}/tex-oak.png" x="300" y="300" width="420" height="420" preserveAspectRatio="xMidYMid slice"/>
<!-- the oak is a little darker where the steel overhangs it -->
<path d="${d(inner)}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="7" stroke-linejoin="miter" style="filter:blur(2.5px)"/>
<!-- the wood: lit on the left, much darker on the right -->
<path d="${d([inner[0], inner[2], inner[3]])}" fill="#000" opacity=".45"/>
<path d="${d([inner[0], inner[1], inner[2]])}" fill="#fff" opacity=".07"/>
<!-- the band: pale hammered steel, lit from the upper left -->
<path d="${bandPath}" fill-rule="evenodd" fill="url(#steel)" style="filter:url(#pale)"/>
<path d="${bandPath}" fill-rule="evenodd" fill="url(#sheen)"/>
<!-- the dark groove along the band's inner edge, and a thin bright line just outside it -->
<path d="${d(inner)}" fill="none" stroke="#1a1a1c" stroke-opacity=".9" stroke-width="3.2" stroke-linejoin="miter" stroke-miterlimit="10"/>
<path d="${d(inner)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linejoin="miter" stroke-miterlimit="10" transform="translate(-1.2 -1.2)" clip-path="url(#a)"/>
<!-- the bright outer edge of the band -->
<path d="${d(outer)}" fill="none" stroke="#f3f6f9" stroke-opacity=".85" stroke-width="5" stroke-linejoin="miter" stroke-miterlimit="10"/>
<!-- rivets: a dark ring, a domed head with a bright highlight -->
${rivets.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.4" fill="#16161a" fill-opacity=".75"/><circle cx="${(x - 0.5).toFixed(1)}" cy="${(y - 0.5).toFixed(1)}" r="5" fill="url(#rv)"/><circle cx="${(x - 1.6).toFixed(1)}" cy="${(y - 1.8).toFixed(1)}" r="1.3" fill="#fff" fill-opacity=".9"/>`).join('')}
<!-- the arrow's two halves: the left a little lighter -->
<path d="${d([P[0], P[1], P[2]])}" fill="#fff" opacity=".13"/>
<path d="${d([P[0], P[2], P[3]])}" fill="#000" opacity=".22"/>
<path d="${d(outer)}" fill="none" stroke="#0a0806" stroke-width="5" stroke-linejoin="miter" stroke-miterlimit="10"/>
</g></g></svg>`;
  fs.writeFileSync(`${DIR}/page-${name}.html`, html);
}
console.log('pages written');
