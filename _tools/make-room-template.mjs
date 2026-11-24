// The guide picture the image model is given for every room: the exact isometric cutaway (floor diamond, two back walls) that rooms are painted into, so every room has the same geometry and
// a piece of furniture can be placed by floor coordinates. Writes _data/house/template.png (1024x820, magenta background).
import sharp from 'sharp';
const W = 1024, H = 820;
export const GEOM = { w: W, h: H, cx: 512, topY: 360, halfW: 400, halfH: 200, wallH: 280 };
const { cx, topY, halfW, halfH, wallH } = GEOM;
const floor = `${cx},${topY} ${cx + halfW},${topY + halfH} ${cx},${topY + 2 * halfH} ${cx - halfW},${topY + halfH}`;
const left = `${cx - halfW},${topY + halfH} ${cx},${topY} ${cx},${topY - wallH} ${cx - halfW},${topY + halfH - wallH}`;
const right = `${cx},${topY} ${cx + halfW},${topY + halfH} ${cx + halfW},${topY + halfH - wallH} ${cx},${topY - wallH}`;
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#FF00FF"/>
<polygon points="${left}" fill="#8a8f96" stroke="#444" stroke-width="3"/><polygon points="${right}" fill="#a3a8af" stroke="#444" stroke-width="3"/><polygon points="${floor}" fill="#6b5b4a" stroke="#444" stroke-width="3"/></svg>`;
await sharp(Buffer.from(svg)).png().toFile('_data/house/template.png');
console.log('template written');
