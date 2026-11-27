// How the dragon is drawn: a gliding body whose wings flap on pivots (smoothly, then glide), a tilted head that comes close to bite, a turn and tail whip, a steady stream of fire or frost
// (down onto the city while it circles, and into the player's face when it attacks). Every move is a continuous blend, not a swap of pictures.

import type { CombatAssets } from './art';
import { ATTACK, type Enemy, type Game } from './engine';

const ease = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const seg = (t: number, a: number, b: number): number => ease((t - a) / (b - a));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const hash = (n: number): number => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- the rig: a glide picture cut into the left wing, the right wing and the body, so each wing can turn on its shoulder
interface Rig { w: number; h: number; left: HTMLCanvasElement; right: HTMLCanvasElement; body: HTMLCanvasElement }
const rigs = new WeakMap<HTMLImageElement, Rig>();
/** Where the shoulders are (as shares of the picture) and where the wings and the body are cut from each other. */
const SHOULDER = { lx: 0.37, rx: 0.6, y: 0.41 };
const CUT = { left: [0.4, 0.45] as const, right: [0.55, 0.6] as const, body: [0.3, 0.4, 0.58, 0.68] as const };

function layer(img: HTMLImageElement, stops: [number, number][]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  const mask = g.createLinearGradient(0, 0, c.width, 0);
  for (const [at, a] of stops) mask.addColorStop(at, `rgba(0,0,0,${a})`);
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = mask; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function rigOf(img: HTMLImageElement): Rig {
  let r = rigs.get(img);
  if (!r) {
    r = {
      w: img.naturalWidth, h: img.naturalHeight,
      left: layer(img, [[0, 1], [CUT.left[0], 1], [CUT.left[1], 0], [1, 0]]),
      right: layer(img, [[0, 0], [CUT.right[0], 0], [CUT.right[1], 1], [1, 1]]),
      body: layer(img, [[0, 0], [CUT.body[0], 0], [CUT.body[1], 1], [CUT.body[2], 1], [CUT.body[3], 0], [1, 0]]),
    };
    rigs.set(img, r);
  }
  return r;
}

/** A glide picture drawn with the wings at the given angles (radians, wing tips up when positive), bottom centre at the origin. */
function drawRigged(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, dh: number, up: number, alpha: number) {
  const r = rigOf(img);
  ctx.save(); ctx.globalAlpha *= alpha;
  const side = (cv: HTMLCanvasElement, px: number, ang: number) => {
    ctx.save();
    const X = px * w - w / 2, Y = SHOULDER.y * dh - dh;
    ctx.translate(X, Y); ctx.rotate(ang); ctx.scale(Math.cos(ang * 0.8), 1); ctx.translate(-X, -Y);
    ctx.drawImage(cv, -w / 2, -dh, w, dh);
    ctx.restore();
  };
  side(r.left, SHOULDER.lx, up); side(r.right, SHOULDER.rx, -up);
  ctx.drawImage(r.body, -w / 2, -dh, w, dh);
  ctx.restore();
}

// ---- the colours of the flames
const mix = (a: number[], b: number[], t: number): number[] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const FIRE = [[255, 240, 180], [255, 185, 60], [255, 105, 20], [150, 35, 8]];
const ICE = [[255, 255, 255], [205, 240, 255], [115, 195, 255], [40, 100, 215]];
function flameColour(kind: 'fire' | 'ice', s: number, a: number): string {
  const ramp = kind === 'fire' ? FIRE : ICE;
  const f = Math.min(2.999, Math.max(0, s * 3)); const i = Math.floor(f);
  const c = mix(ramp[i], ramp[i + 1], f - i);
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a))})`;
}

/** A steady stream of fire or frost from (x0, y0) to (x1, y1): a tapering, wavering body of flame with turbulent puffs along it, a glow at the mouth and a splash where it lands. */
export function drawJet(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, kind: 'fire' | 'ice', time: number, k: number, width: number) {
  if (k <= 0.01) return;
  const dx = x1 - x0, dy = y1 - y0, len0 = Math.hypot(dx, dy) || 1, len = len0 * (0.25 + 0.75 * k);
  const ux = dx / len0, uy = dy / len0, nx = -uy, ny = ux;
  const w0 = width * 0.7, w1 = width * 4.6;
  const at = (s: number) => ({ x: x0 + ux * len * s, y: y0 + uy * len * s });
  const half = (s: number) => lerp(w0, w1, Math.pow(s, 0.85)) * 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  // the body: three nested tongues, wide and faint to narrow and white
  for (const [scale, a, tone] of [[1.6, 0.34, 0.5], [1, 0.55, 0.28], [0.5, 0.7, 0.08]] as const) {
    const top: [number, number][] = [], bottom: [number, number][] = [];
    const N = 26;
    for (let i = 0; i <= N; i++) {
      const s = i / N, p = at(s), wob = Math.sin(s * 8 - time * 13 + scale * 3) * half(s) * 0.22 + Math.sin(s * 19 - time * 21) * half(s) * 0.09;
      const hw = half(s) * scale;
      top.push([p.x + nx * (hw + wob), p.y + ny * (hw + wob)]); bottom.push([p.x - nx * (hw - wob), p.y - ny * (hw - wob)]);
    }
    const end = at(1);
    const gr = ctx.createLinearGradient(x0, y0, end.x, end.y);
    gr.addColorStop(0, flameColour(kind, tone, a * k)); gr.addColorStop(0.35, flameColour(kind, tone + 0.25, a * k * 0.85)); gr.addColorStop(0.75, flameColour(kind, tone + 0.55, a * k * 0.45)); gr.addColorStop(1, flameColour(kind, 0.95, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) ctx.lineTo(x, y);
    for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
    ctx.closePath(); ctx.fill();
  }
  // the turbulence: puffs carried along the stream, spreading as they go
  const puffs = 64;
  for (let i = 0; i < puffs; i++) {
    const s = (i / puffs + time * (0.9 + hash(i) * 0.5)) % 1, p = at(s), off = (hash(i * 3.1) - 0.5) * 2 * half(s) * 1.15 + Math.sin(time * 9 + i) * half(s) * 0.15;
    const r = Math.max(2.5, half(s) * (0.55 + hash(i * 7.3) * 0.5)), x = p.x + nx * off, y = p.y + ny * off;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, flameColour(kind, 0.1 + s * 0.8, 0.5 * (1 - s * 0.6) * k)); gr.addColorStop(1, flameColour(kind, 0.3 + s * 0.7, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // the glow at the mouth
  const gm = ctx.createRadialGradient(x0, y0, 0, x0, y0, width * 1.6);
  gm.addColorStop(0, flameColour(kind, 0, 0.9 * k)); gm.addColorStop(1, flameColour(kind, 0.3, 0));
  ctx.fillStyle = gm; ctx.beginPath(); ctx.arc(x0, y0, width * 1.6, 0, Math.PI * 2); ctx.fill();
  // and the splash where it lands
  if (k > 0.5) {
    const end = at(1), r = width * (2.4 + 0.5 * Math.sin(time * 18)), a = Math.min(1, (k - 0.5) * 2);
    const gs = ctx.createRadialGradient(end.x, end.y, 0, end.x, end.y, r * 1.6);
    gs.addColorStop(0, flameColour(kind, 0.05, 0.75 * a)); gs.addColorStop(0.5, flameColour(kind, 0.5, 0.35 * a)); gs.addColorStop(1, flameColour(kind, 0.8, 0));
    ctx.fillStyle = gs; ctx.beginPath(); ctx.ellipse(end.x, end.y, r * 1.7, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 16; i++) { // embers (sparks of ice)
      const s = (time * (0.6 + hash(i) * 0.7) + hash(i * 5)) % 1, ex = end.x + (hash(i * 2.2) - 0.5) * r * 2.6, ey = end.y - s * r * 2.4;
      ctx.fillStyle = flameColour(kind, 0.1 + s * 0.4, (1 - s) * 0.9 * a); ctx.fillRect(ex, ey, 2.5, 2.5);
    }
  }
  ctx.restore();
}

/** The breath straight into the player's face: a steady roar from the mouth that grows to fill the whole screen. `t` is the seconds the blast has been going (it lasts 1.4). */
export function drawCloseBreath(ctx: CanvasRenderingContext2D, mx: number, my: number, kind: 'fire' | 'ice', t: number, W: number, H: number, time: number) {
  const env = seg(t, 0, 0.25) * (1 - seg(t, 1.15, 1.4));
  if (env <= 0.01) return;
  const R = Math.hypot(W, H) * 0.75;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const grow = 0.25 + 0.75 * seg(t, 0, 0.55);
  for (let i = 0; i < 120; i++) {
    const s = (i / 120 + time * (1.1 + hash(i * 1.7) * 0.5)) % 1;
    const ang = (hash(i) - 0.5) * 2.6 + Math.sin(time * 3 + i) * 0.08, run = Math.pow(s, 1.35) * R * grow;
    const x = mx + Math.sin(ang) * run * 1.15, y = my + (Math.cos(ang) * 0.25 - 0.1) * run + (hash(i * 3.3) - 0.5) * run * 0.5;
    const r = 8 + Math.pow(s, 1.1) * 230 * grow;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, flameColour(kind, s * 0.85, 0.5 * (1 - s * 0.7) * env)); gr.addColorStop(1, flameColour(kind, 0.5 + s * 0.5, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // the hot core at the mouth
  const rc = 60 + 220 * grow;
  const gc = ctx.createRadialGradient(mx, my, 0, mx, my, rc);
  gc.addColorStop(0, flameColour(kind, 0, 0.95 * env)); gc.addColorStop(0.45, flameColour(kind, 0.3, 0.55 * env)); gc.addColorStop(1, flameColour(kind, 0.6, 0));
  ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(mx, my, rc, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = kind === 'fire' ? `rgba(255,110,20,${0.28 * env * seg(t, 0.3, 1.1)})` : `rgba(150,215,255,${0.28 * env * seg(t, 0.3, 1.1)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// where the mouth is in each picture (as shares of its width and height)
const MOUTH_FAR = { x: 0.35, y: 0.47 };
const MOUTH_CLOSE = { x: 0.5, y: 0.56 };

/** Draws the dragon. Returns false when its pictures are not there (the caller then draws the old way). */
export function drawDragon(ctx: CanvasRenderingContext2D, e: Enemy, g: Game, art: CombatAssets, W: number, H: number, time: number): boolean {
  const body = art.enemies.dragonb?.frames, head = art.enemies.dragonh?.frames, old = art.enemies.dragon?.frames;
  const s = e.sky; if (!s || !body || body.length < 4 || !head || head.length < 4 || !old) return false;
  const hgt = g.heightOf(e) * H;
  const k = (hgt / old[0].naturalHeight) * 1.1;                       // one scale for the whole dragon
  const gw = body[0].naturalWidth * k, gh = body[0].naturalHeight * k;
  const x = e.u * W, base = (e.v - e.lift) * H;
  const t = time + e.id * 1.37;

  // ---- the wings: they flap in bursts and then glide, and every change of the beat is eased
  const mode = s.mode;
  const cycle = 6.4, ph = t % cycle;
  const burst = mode === 'hover' || mode === 'retreat' ? 1 : mode === 'swoop' ? 0 : seg(ph, 0, 0.5) * (1 - seg(ph, 3.3, 3.9));
  const beat = Math.sin(t * Math.PI * 2 * (mode === 'hover' ? 1.45 : 1.15));
  const gliding = 0.14 + Math.sin(t * 0.55) * 0.05;
  const dive = mode === 'swoop' ? -0.32 * Math.min(1, s.t / 0.5) : 0;
  const wingUp = lerp(gliding, 0.16 + 0.5 * beat, burst) + dive;
  const bob = -beat * burst * gh * 0.022 + Math.sin(t * 0.9) * gh * 0.008;
  // it banks into its turns
  const bank = mode === 'circle' ? Math.cos(t * 0.45) * 0.13 : 0;

  const atk = mode === 'hover' ? s.atk : null, at = s.atkT ?? 0;
  const farK = s.far ? seg(s.far.t, 0, 0.45) * (1 - seg(s.far.t, 2.35, 2.8)) : 0;

  ctx.save();
  if (e.hurt > 0 && Math.floor(e.hurt * 40) % 2 === 0) ctx.globalAlpha = 0.65;

  // ---- the body (and, when it turns for the tail, the sideways pictures)
  let a0 = 1, a2 = 0, a3 = 0, sx = 1, cx = x, cy = base + bob, boost = 1, tilt = bank;
  if (atk === 'tail') {
    // it turns by going edge-on (squeezed narrow) and coming out as the sideways picture, and turns back the same way: two pictures are never shown over each other, except for the quick lash
    const T = at;
    if (T < 0.1) { a0 = 1; }
    else if (T < 0.3) { a0 = 1; sx = 1 - 0.88 * seg(T, 0.1, 0.3); }
    else if (T < 0.5) { a0 = 0; a2 = 1; sx = 0.12 + 0.88 * seg(T, 0.3, 0.5); }
    else if (T < 0.95) { a0 = 0; a2 = 1; }
    else if (T < 1.08) { a0 = 0; const w3 = seg(T, 0.95, 1.08); a2 = 1 - w3; a3 = w3; }
    else if (T < 1.45) { a0 = 0; a3 = 1; }
    else if (T < 1.65) { a0 = 0; a3 = 1; sx = 1 - 0.88 * seg(T, 1.45, 1.65); }
    else if (T < 1.9) { a0 = 1; sx = 0.12 + 0.88 * seg(T, 1.65, 1.9); }
    const near = seg(T, 0.2, 0.6) * (1 - seg(T, 1.5, 1.9)), lash = seg(T, 0.95, 1.2) * (1 - seg(T, 1.45, 1.85));
    boost = 1 + 0.35 * near + 0.25 * lash; cx = lerp(x, W * 0.5, 0.65 * near); cy = base + bob + H * 0.1 * near;
    tilt = lerp(bank, lerp(-0.1, 0.2, seg(T, 0.95, 1.2)), near);
  }
  const place = (img: HTMLImageElement, alpha: number, rigged: boolean) => {
    if (alpha <= 0.005) return;
    const w = img.naturalWidth * k * boost, dh = img.naturalHeight * k * boost;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(sx, 1);
    if (rigged) drawRigged(ctx, img, w, dh, wingUp, alpha); else { ctx.globalAlpha *= alpha; ctx.drawImage(img, -w / 2, -dh, w, dh); }
    ctx.restore();
  };
  // a shadow on the ground
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, e.v * H, gw * 0.4, hgt * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  place(body[0], a0 * (1 - farK), true);
  place(body[1], a0 * farK, true);
  if (a2 > 0) place(body[2], a2, false);
  if (a3 > 0) {
    place(body[3], a3, false);
    // a streak behind the lash
    if (a3 > 0.4 && sx === 1) { ctx.save(); ctx.translate(-22 * a3, 0); place(body[3], 0.14 * a3, false); ctx.restore(); }
  }

  // ---- breathing fire or frost down onto the city (for show)
  if (s.far && farK > 0) {
    const bw = body[1].naturalWidth * k, bh = body[1].naturalHeight * k;
    const lx = (MOUTH_FAR.x - 0.5) * bw, ly = -bh + MOUTH_FAR.y * bh;
    const mx = x + lx * Math.cos(tilt) - ly * Math.sin(tilt), my = base + bob + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    drawJet(ctx, mx, my, mx - W * 0.1, Math.min(H * 0.97, base + H * 0.3), s.far.kind, time, farK, Math.max(18, H * 0.03));
  }

  // ---- close up: the head comes in to bite, or to breathe
  if (atk === 'bite' || atk === 'breath') {
    const hh = H * 0.74, home = head[0];
    const come = seg(at, 0, 0.62) * (1 - seg(at, atk === 'bite' ? 1.3 : 2.45, atk === 'bite' ? 1.95 : 3.0));
    if (come > 0.01) {
      const px = lerp(x, W * 0.5, ease(come)), py = lerp(base - gh * 0.55, H * 0.58, ease(come));
      let sc = (0.14 + 0.86 * ease(come)) * (hh / home.naturalHeight);
      let open: number, shut = 0, rot = 0;
      if (atk === 'bite') {
        open = seg(at, 0.52, 0.66) * (1 - seg(at, 1.05, 1.11)); shut = seg(at, 1.05, 1.11) * (1 - seg(at, 1.3, 1.6));
        rot = lerp(0, -0.07, seg(at, 0.3, 0.8)) + (seg(at, 1.05, 1.12) > 0 ? 0.1 : 0);
        sc *= 1 + 0.12 * seg(at, 0.8, 1.1) * (1 - seg(at, 1.12, 1.4));              // it lunges in as it snaps
      } else {
        open = seg(at, 0.45, 0.9); sc *= 1 + 0.05 * seg(at, 0.9, 1.3);
      }
      ctx.save(); ctx.globalAlpha *= Math.min(1, come * 2.2);
      ctx.translate(px, py + (atk === 'bite' ? H * 0.05 * seg(at, 1.05, 1.12) * (1 - seg(at, 1.12, 1.5)) : 0)); ctx.rotate(rot);
      const drawHead = (img: HTMLImageElement, a: number) => { if (a <= 0.005) return; ctx.save(); ctx.globalAlpha *= a; const w = img.naturalWidth * sc, h2 = img.naturalHeight * sc; ctx.drawImage(img, -w / 2, -h2 / 2, w, h2); ctx.restore(); };
      if (atk === 'bite') { drawHead(head[0], 1 - open - shut > 0 ? 1 - open - shut : 0); drawHead(head[1], open); drawHead(head[3], shut); }
      else { drawHead(head[0], 1 - open); drawHead(head[2], open); }
      // the stream, from the mouth of the open head
      if (atk === 'breath' && g.breath) {
        const hw = head[2].naturalWidth * sc, h2 = head[2].naturalHeight * sc;
        const mouthX = px + (MOUTH_CLOSE.x - 0.5) * hw, mouthY = py + (MOUTH_CLOSE.y - 0.5) * h2;
        ctx.restore();
        ctx.save();
        drawCloseBreath(ctx, mouthX, mouthY, g.breath.kind, g.breath.t, W, H, time);
        ctx.restore();
        ctx.restore();
        return true;
      }
      ctx.restore();
    }
  }
  ctx.restore();
  // keep the timings referenced so the draw and the game agree on them
  void ATTACK;
  return true;
}
