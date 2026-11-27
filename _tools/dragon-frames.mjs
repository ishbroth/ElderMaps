// Photographs the dragon in each move, with the game held still, to look at the animation.   node _tools/dragon-frames.mjs <out folder>   (needs the dev server on :5199)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9710;
const profile = path.join(process.env.TEMP, 'em-dragon'); fs.rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CH, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { await wait(500); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.some((t) => t.type === 'page')) break; } catch { /* not yet */ } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://localhost:5199/?combattest=crest&img=/_test-wide.png' });
await wait(9000);
const run = async (code) => (await send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true }))?.result?.value;
for (let i = 0; i < 40; i++) { if (await run('!!window.__game')) break; await wait(500); }
const shot = async (name) => { await wait(450); const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(path.join(OUT, name + '.jpg'), Buffer.from(s.data, 'base64')); console.log('wrote', name); };
const set = (js) => run(`(() => { const g = window.__game; const e = g.enemies[0]; const s = e.sky; g.paused = false; ${js}; g.update(0.0001); g.paused = true; return 'ok'; })()`);
await set(`s.mode='circle'; s.t=1; s.next=99; s.far=null; s.atk=null; e.p=0.12`); await shot('1-circle');
await set(`s.mode='circle'; s.t=3; s.next=99; s.far={kind:'fire',t:1.3}`); await shot('2-far-fire');
await set(`s.mode='circle'; s.t=3; s.next=99; s.far={kind:'ice',t:1.3}`); await shot('3-far-ice');
await set(`s.mode='hover'; s.t=1; s.far=null; e.p=0.86; e.u=0.5; e.v=0.84; s.atk=null; s.cool=99`); await shot('4-hover');
for (const [n, t] of [['5-bite-in', 0.4], ['6-bite-open', 0.95], ['7-bite-snap', 1.14], ['8-bite-out', 1.5]]) { await set(`s.mode='hover'; s.t=2; s.atk='bite'; s.atkT=${t}; s.dealt=true`); await shot(n); }
for (const [n, t] of [['9-tail-turn', 0.5], ['10-tail-wind', 0.9], ['11-tail-whip', 1.2], ['12-tail-back', 1.7]]) { await set(`s.mode='hover'; s.t=2; s.atk='tail'; s.atkT=${t}; s.dealt=true`); await shot(n); }
for (const [n, t, br] of [['13-breath-in', 0.5, null], ['14-breath-open', 0.9, null], ['15-breath-blast', 1.5, 0.5], ['16-breath-ice', 1.7, 0.9]]) { await set(`s.mode='hover'; s.t=2; s.atk='breath'; s.atkT=${t}; s.dealt=true; s.kind='${n.endsWith('ice') ? 'ice' : 'fire'}'; g.breath=${br === null ? 'null' : `{t:${br},kind:'${n.endsWith('ice') ? 'ice' : 'fire'}'}`}`); await shot(n); }
ws.close(); chrome.kill();
