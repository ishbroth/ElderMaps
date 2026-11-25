// The App Store banners: the header (wide) and the search-result pictures, set as web pages and photographed in headless Chrome at the exact pixel sizes.
//   node _tools/store-banners.mjs <folder with the wide pictures from store-shots.mjs art-wide> <output folder>
// the pictures it needs, in the first folder: map-vivid-*, dragon-chicago-*, house-room-*, town-legend-*   (any size: they are fitted)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [SRC, OUT] = process.argv.slice(2);
if (!SRC || !OUT) { console.log('usage: store-banners.mjs <wide pictures> <output folder>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(import.meta.dirname, '..');
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const find = (stem) => { const f = fs.readdirSync(SRC).find((x) => x.startsWith(stem)); if (!f) throw new Error('missing ' + stem); return path.join(SRC, f); };
/** A picture as a data address, cut to a share of itself first (left, top, width, height as 0 to 1 of the picture). */
const data = async (file, width, cut) => {
  let img = sharp(file);
  if (cut) { const m = await sharp(file).metadata(); img = img.extract({ left: Math.round(cut[0] * m.width), top: Math.round(cut[1] * m.height), width: Math.round(cut[2] * m.width), height: Math.round(cut[3] * m.height) }); }
  return `data:image/jpeg;base64,${(await img.resize({ width, withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()).toString('base64')}`;
};
const MAP = await data(find('map-vivid'), 3000), DRAGON = await data(find('dragon-chicago'), 2400), ROOM = await data(find('house-room'), 2000, [0.2, 0.09, 0.6, 0.5]), LEGEND = await data(find('town-legend'), 2000, [0, 0.07, 0.76, 0.93]);
const ARROW = `data:image/png;base64,${(await sharp(path.join(ROOT, 'resources', 'icon-only.png')).extract({ left: 232, top: 232, width: 560, height: 560 }).resize(900).png().toBuffer()).toString('base64')}`;

const page = (W, H) => {
  const u = H / 100; // 1% of the height
  const wide = W / H > 1.9;
  const tile = (img, extra = '') => `<div class="tile" style="background-image:url(${img});${extra}"></div>`;
  // the tiles: a big one (the dragon over the city) and two smaller (the house, the town legend)
  const tiles = wide
    ? `<div class="tiles" style="left:${W * 0.44}px;top:${u * 12}px;width:${W * 0.52}px;height:${u * 76}px;grid-template-columns:1.5fr 1fr;grid-template-rows:1fr 1fr">${tile(DRAGON, 'grid-row:1 / span 2')}${tile(ROOM)}${tile(LEGEND)}</div>`
    : `<div class="tiles" style="left:${W * 0.05}px;top:${u * 52}px;width:${W * 0.9}px;height:${u * 40}px;grid-template-columns:1.5fr 1fr 1fr;grid-template-rows:1fr">${tile(DRAGON)}${tile(ROOM)}${tile(LEGEND)}</div>`;
  const brand = wide
    ? `<div class="brand" style="left:${W * 0.05}px;top:${u * 26}px;width:${W * 0.36}px"><img src="${ARROW}" style="width:${u * 30}px;height:${u * 30}px"><h1 style="font-size:${u * 9.2}px">ELDERMAPS</h1><p style="font-size:${u * 3.1}px">THE WORLD AS AN AGE-OLD REALM</p></div>`
    : `<div class="brand" style="left:0;top:${u * 6}px;width:${W}px;align-items:center;text-align:center"><img src="${ARROW}" style="width:${u * 25}px;height:${u * 25}px"><h1 style="font-size:${u * 8.4}px">ELDERMAPS</h1><p style="font-size:${u * 3}px">THE WORLD AS AN AGE-OLD REALM</p></div>`;
  return `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400&display=swap" rel="stylesheet">
<style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#0b0d10;font-family:'Jost',sans-serif;color:#f2f2ee}
.bg{position:absolute;inset:-3%;background:url(${MAP}) center/cover;filter:saturate(.85) brightness(.7) blur(${u * 0.25}px)}
.shade{position:absolute;inset:0;background:${wide ? 'linear-gradient(90deg,#0b0d10 0%,#0b0d10f2 32%,#0b0d10a0 48%,#0b0d1030 70%,#0b0d1070 100%)' : 'linear-gradient(180deg,#0b0d10f5 0%,#0b0d10d8 40%,#0b0d10b0 100%)'}}
.brand{position:absolute;display:flex;flex-direction:column;gap:${u * 1.6}px}
.brand h1{margin:0;font-weight:300;letter-spacing:.34em;text-shadow:0 ${u * 0.3}px ${u * 1.6}px #000}
.brand p{margin:0;letter-spacing:.34em;color:#cfcabb;font-weight:300}
.tiles{position:absolute;display:grid;gap:${u * 1.6}px}
.tile{background-size:cover;background-position:center;border:${Math.max(2, u * 0.28)}px solid #c9b98a;box-shadow:0 ${u * 1.2}px ${u * 4}px #000c;border-radius:${u * 0.8}px}
</style><div class="bg"></div><div class="shade"></div>${brand}${tiles}`;
};

const SIZES = [['header-5244x2950', 5244, 2950], ['header-3840x1646', 3840, 1646], ['search-result-5244x2950', 5244, 2950], ['search-result-3840x2560', 3840, 2560], ['search-result-1920x1280', 1920, 1280]];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9660;
const profile = path.join(process.env.TEMP, 'em-banner');
fs.rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CH, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
let tabs;
for (let i = 0; i < 40; i++) { await wait(500); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.some((t) => t.type === 'page')) break; } catch { /* not yet */ } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
for (const [name, W, H] of SIZES) {
  const html = path.join(process.env.TEMP, `em-banner-${name}.html`);
  fs.writeFileSync(html, page(W, H));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///' + html.split(String.fromCharCode(92)).join('/') });
  await wait(6000);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'));
  console.log('wrote', name);
}
ws.close(); chrome.kill();
