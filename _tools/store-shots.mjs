// The App Store screenshots: the real app, driven in headless Chrome at each phone and tablet size (device pixels exactly as Apple asks).
//   node _tools/store-shots.mjs <out folder> [size key ...] [-- subject ...]
// needs the dev server on :5199 (npx vite --port 5199) and public/_test.png swapped here for the Chicago picture.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = process.argv[2];
const rest = process.argv.slice(3);
const dash = rest.indexOf('--');
const sizeKeys = (dash < 0 ? rest : rest.slice(0, dash));
const only = dash < 0 ? [] : rest.slice(dash + 1);
const URL = 'http://localhost:5199';
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** name: [pixel width, pixel height, device pixel ratio, folder] */
const SIZES = {
  'iphone61-portrait': [1179, 2556, 3, 'iPhone 6.1 in'], 'iphone61-landscape': [2556, 1179, 3, 'iPhone 6.1 in'],
  'iphone63-portrait': [1206, 2622, 3, 'iPhone 6.3 in'], 'iphone63-landscape': [2622, 1206, 3, 'iPhone 6.3 in'],
  'ipad-2034x1398': [2034, 1398, 2, 'iPad'], 'ipad-1398x2034': [1398, 2034, 2, 'iPad'], 'ipad-2853x2007': [2853, 2007, 3, 'iPad'], 'ipad-2007x2853': [2007, 2853, 3, 'iPad'], 'art-wide': [3840, 2160, 2, '_wide'],
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A script run in the page, to set a scene up. Each returns when it is ready to photograph. */
const HOUSE_FLOW = (rooms, pieces, level) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = async (sel, text) => { const b = [...document.querySelectorAll(sel)].find((x) => !text || x.textContent.trim().toUpperCase().startsWith(text)); if (!b) return false; b.click(); await wait(500); return true; };
  const tick = async () => { const ok = document.querySelector('.em-placebar-ok'); if (ok) { ok.click(); await wait(700); } };
  const make = async (name) => { const li = [...document.querySelectorAll('.em-build-list li')].find((x) => x.querySelector('b').textContent.trim() === name); const b = li && li.querySelector('button'); if (b && !b.disabled) { b.click(); await wait(450); await tick(); return true; } return false; };
  await click('button', 'OPEN THE ENTRANCE HALL'); await make('HEARTHSTONE'); await make('CLOAK RACK'); await make('BOOT BENCH');
  await click('.em-card-x', '‹');
  const build = async (name) => { for (const c of [...document.querySelectorAll('.em-cell-free')]) { c.click(); await wait(250); const li = [...document.querySelectorAll('.em-sheet .em-build-list li')].find((x) => x.querySelector('b').textContent.trim() === name.toUpperCase()); const b = li && li.querySelector('button'); if (b && !b.disabled) { b.click(); await wait(700); return true; } } return false; };
  for (const r of ${JSON.stringify(rooms)}) await build(r);
  ${level ? '' : `
  const first = [...document.querySelectorAll('.em-cell-room')].find((x) => x.textContent.startsWith(${JSON.stringify(rooms[0].slice(0, 3).toUpperCase())}));
  if (first) { first.click(); await wait(600); for (const p of ${JSON.stringify(pieces)}) await make(p); }`}
  window.scrollTo(0, 0);
  return 'ready';
})()`;

const NAV_FLOW = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60 && !window.__travel; i++) await wait(250);
  await wait(2500);
  window.__travel({ id: 'k:test', kind: 'landmark', real: 'Forsyth Park', name: 'Forsyth Park', province: 'cyrodiil', lat: 32.0687, lng: -81.0962, fame: 0, note: '' });
  await wait(12000);
  return 'ready';
})()`;

const COMBAT_FLOW = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 120 && !window.__game; i++) await wait(250);
  await wait(1500);
  // the bow
  const open = [...document.querySelectorAll('.em-combat button')].find((b) => /HANDED|BOW|MAGIC|FIRE|FROST|SHOCK|DRAIN/i.test(b.textContent));
  if (open) { open.click(); await wait(500); }
  const bow = [...document.querySelectorAll('.em-wheel button')].find((b) => /BOW/i.test(b.textContent));
  if (bow) { bow.click(); await wait(500); }
  const g = window.__game;
  // wait for the dragon to come in close
  for (let i = 0; i < 160; i++) { const e = g.enemies[0]; if (e && e.sky && (e.sky.mode === 'hover' || e.sky.mode === 'swoop') && e.p > 0.5) break; await wait(150); }
  const e = g.enemies[0];
  const stage = document.querySelector('.em-combat-stage') || document.querySelector('.em-combat canvas');
  const cv = document.querySelector('.em-combat canvas');
  const r = cv.getBoundingClientRect();
  const u = e ? e.u : 0.5, v = e ? e.v - 0.1 : 0.4;
  const fire = (type) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: r.left + u * r.width, clientY: r.top + v * r.height }));
  fire('pointerdown'); await wait(900); fire('pointermove');
  return 'ready';
})()`;

/** After the scene is set up: true when it really came up (the map drawn, the room furnished...). */
const OK = {
  'map-vivid': "!document.querySelector('.em-loading') && document.querySelectorAll('.em-pin').length > 8",
  'map-parchment': "!document.querySelector('.em-loading') && document.querySelectorAll('.em-pin').length > 4",
  'town-legend': "!!document.querySelector('.gm-style') && !document.querySelector('.em-loading')",
  'navigation': "!!document.querySelector('.em-nav') && !document.querySelector('.em-ledger')",
  'dragon-chicago': "!!window.__game && window.__game.enemies.length > 0",
  'house-room': "document.querySelectorAll('.em-piece').length >= 3",
  'house-plan': "document.querySelectorAll('.em-cell-room').length >= 4",
};
const SUBJECTS = {
  'map-vivid': { url: () => `${URL}/?at=48,12,5`, wait: 11000 },
  'map-parchment': { url: () => `${URL}/?at=41.88,-87.64,9`, look: 'oblivion', wait: 11000 },
  'town-legend': { url: () => `${URL}/?legendtest=us-ga-savannah`, wait: 9000, flow: `(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); for (let i = 0; i < 60 && !window.__legendMap; i++) await w(250); const m = window.__legendMap; m.setCenter({ lat: 32.0775, lng: -81.0925 }); m.setZoom(15); await w(7000); return 'ready'; })()` },
  'navigation': { url: () => `${URL}/?at=32.0809,-81.0912,13`, flow: NAV_FLOW, wait: 6000 },
  'dragon-chicago': { url: (land) => `${URL}/?combattest=crest&img=/_test-${land ? 'wide' : 'tall'}.png`, flow: COMBAT_FLOW, wait: 9000 },
  'house-room': { url: () => `${URL}/?housetest`, style: 'imperial', flow: HOUSE_FLOW(['Great Hall'], ['CARVED CHAIR', 'BENCH SEATING', 'LOW TABLE', 'ENCHANTING TABLE'], false), wait: 5000 },
  'house-plan': { url: () => `${URL}/?housetest`, style: 'nordic', flow: HOUSE_FLOW(['Great Hall', 'Feast Hall', 'Bedchamber', 'Kitchen'], [], true), wait: 5000 },
};

async function shootSize(key, port) {
  const [W, H, dpr, folder] = SIZES[key];
  const dir = path.join(OUT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const profile = path.join(process.env.TEMP, `em-shot-${port}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(CH, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let tabs;
  for (let i = 0; i < 40; i++) { await wait(500); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.some((t) => t.type === 'page')) break; } catch { /* not yet */ } }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: Math.round(W / dpr), height: Math.round(H / dpr), deviceScaleFactor: dpr, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const landscape = W > H;
  for (const [name, s] of Object.entries(SUBJECTS)) {
    if (only.length && !only.includes(name)) continue;
    const pre = `try { localStorage.clear(); ${s.look ? `localStorage.setItem('eldermaps:look', '${s.look}');` : `localStorage.setItem('eldermaps:look', 'vivid');`} ${s.style ? `localStorage.setItem('eldermaps:housestyle', '${s.style}');` : ''} } catch (e) {}`;
    const reg = await send('Page.addScriptToEvaluateOnNewDocument', { source: pre });
    let good = false;
    for (let attempt = 1; attempt <= 3 && !good; attempt++) {
      await send('Page.navigate', { url: s.url(landscape) });
      await wait(s.wait + (attempt - 1) * 4000);
      if (s.flow) { const r = await send('Runtime.evaluate', { expression: s.flow, returnByValue: true, awaitPromise: true }); if (r?.exceptionDetails) console.log(key, name, 'flow error:', JSON.stringify(r.exceptionDetails).slice(0, 160)); await wait(800); }
      const chk = await send('Runtime.evaluate', { expression: OK[name] ?? 'true', returnByValue: true });
      good = chk?.result?.value === true;
      if (!good) console.log(key, name, 'did not come up right (try ' + attempt + ')');
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(dir, `${name}-${W}x${H}.png`);
    const buf = Buffer.from(shot.data, 'base64');
    const meta = await sharp(buf).metadata();
    if (meta.width !== W || meta.height !== H) await sharp(buf).resize(W, H, { fit: 'fill' }).png().toFile(file); else fs.writeFileSync(file, buf);
    console.log('wrote', path.relative(OUT, file));
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: reg.identifier });
  }
  ws.close(); chrome.kill();
}

const keys = sizeKeys.length ? sizeKeys : Object.keys(SIZES);
let port = Number(process.env.PORT_BASE || 9560);
for (const k of keys) await shootSize(k, port++);
