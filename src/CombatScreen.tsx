import { useEffect, useRef, useState } from 'react';
import { analyzeSpawns } from './lib/combat/analyze';
import { loadCombatAssets, type CombatAssets } from './lib/combat/art';
import { CLASS_NAME, ENEMIES, BOSSES, ITEM_CLASSES, isSpell, weaponAt, type Arsenal, type ItemCls, type RaidPlan } from './lib/combat/data';
import { DEFAULT_SPAWNS, Game, type Effect, type Enemy, type Spawns } from './lib/combat/engine';

export interface CombatResult { won: boolean; killed: number; escaped: number; potionsUsed: number; shoutsUsed: number }

interface Props {
  title: string;
  /** The picture the fight is played over (the place's glimpse). */
  imageUrl: string;
  plan: RaidPlan;
  spawns: Spawns;
  arsenal: Arsenal;
  /** Both hands bought: two weapons or spells at once. */
  dual?: boolean;
  level: number;
  potions: number;
  shouts: number;
  onDone: (r: CombatResult) => void;
  onExit: () => void;
}

const SPELL_COLOR: Record<string, string> = { shock: '#bfe6ff', frost: '#9fd8ff', fire: '#ff9a3c', drain: '#c0386e' };

/** The fight: the place's picture, the enemies walking out of its ground, and the traveller's hands. Hold to charge, let go to strike. */
export default function CombatScreen({ title, imageUrl, plan, spawns, arsenal, dual = false, level, potions, shouts, onDone, onExit }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const assets = useRef<CombatAssets>({ enemies: {}, weapons: {} });
  const bg = useRef<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<'loading' | 'fighting' | 'error'>('loading');
  const [wheel, setWheel] = useState(false);
  const [, tick] = useState(0);
  const [hands, setHands] = useState<ItemCls[]>(['onehand']);
  const [ratio, setRatio] = useState(16 / 9);
  const doneSent = useRef(false);
  const zoomAt = useRef({ u: 0.5, v: 0.6 });

  // load the picture and the art, look at the picture for where the enemies come from, and start
  useEffect(() => {
    let off = false;
    void (async () => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      const loaded = await new Promise<boolean>((res) => { img.onload = () => res(true); img.onerror = () => res(false); img.src = imageUrl; });
      if (off) return;
      if (!loaded) { setPhase('error'); return; }
      bg.current = img; setRatio(img.naturalWidth / img.naturalHeight);
      const ids = [...new Set([...plan.enemies, ...(plan.boss ? [plan.boss] : []), 'dragon', ...(plan.boss === 'giantchief' ? ['giant'] : [])].map((id) => (id === 'giantchief' ? 'giant' : id)))];
      assets.current = await loadCombatAssets(ids, ITEM_CLASSES.map((c) => weaponAt(c, (arsenal[c] || 1) as 1 | 2 | 3 | 4).art));
      if (off) return;
      const looked = analyzeSpawns(img, { ...spawns, ...DEFAULT_SPAWNS, ...spawns });
      // a big city with sky in its picture is a dragon at once, in the sky (and the plan's ground enemies are the fallback when there is no sky)
      const skyPlan = plan.dragonSky && looked?.sky && looked.sky.fraction >= 0.12;
      const usedPlan: RaidPlan = skyPlan ? { worth: plan.worth, enemies: [], boss: 'dragon', waves: [], total: 1, dragonSky: true } : plan;
      const g = new Game({ plan: usedPlan, dragonSky: skyPlan && looked?.sky ? { v: looked.sky.v } : undefined, spawns: looked ?? { ...DEFAULT_SPAWNS, ...spawns }, arsenal, hands: ['onehand'], level, potions, shouts, ratio: (e: Enemy) => { const f = assets.current.enemies[e.type.id]?.frames[0]; return f ? f.naturalWidth / f.naturalHeight : 0.45; } });
      game.current = g; if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = g; setHands(g.slots.map((s) => s.weapon.cls));
      setPhase('fighting');
    })();
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // the loop
  useEffect(() => {
    if (phase !== 'fighting') return;
    let raf = 0; let last = performance.now(); let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const g = game.current; const c = canvas.current; const img = bg.current;
      if (g && c && img) {
        g.update(dt);
        draw(c, img, g, assets.current, zoomAt.current);
        if (++frame % 4 === 0) tick((n) => n + 1);
        if (g.outcome !== 'fighting' && !doneSent.current) { doneSent.current = true; onDone({ won: g.outcome === 'won', killed: g.killed, escaped: g.escaped, potionsUsed: potions - g.potions, shoutsUsed: shouts - g.shouts }); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // the finger: down and moving charge it, up strikes (the picture's own coordinates, undoing the bow's zoom)
  const at = (e: React.PointerEvent): { u: number; v: number } => {
    const r = canvas.current?.getBoundingClientRect(); if (!r) return { u: 0.5, v: 0.5 };
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const g = game.current; const z = g && g.slots.some((s) => s.weapon.cls === 'bow' && s.charging) ? 1 + 0.4 * (g.slots[0]?.charge ?? 0) : 1;
    return z === 1 ? { u: px, v: py } : { u: zoomAt.current.u + (px - zoomAt.current.u) / z, v: zoomAt.current.v + (py - zoomAt.current.v) / z };
  };
  const down = (e: React.PointerEvent) => { if (wheel) return; try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* a pointer that cannot be captured */ } const p = at(e); zoomAt.current = p; game.current?.press(p.u, p.v); };
  const move = (e: React.PointerEvent) => { if (game.current?.holding) { const p = at(e); game.current.move(p.u, p.v); } };
  const up = () => game.current?.release();

  const g = game.current;
  // with both hands bought a second pick fills the other hand (the same kind twice is allowed); a two-handed weapon or the bow always takes both
  const pickHands = (cls: ItemCls) => {
    if (!g) return;
    const two = cls === 'twohand' || cls === 'bow' || hands.some((h) => h === 'twohand' || h === 'bow');
    const next = !dual || two ? [cls] : hands.length < 2 ? [...hands, cls] : [hands[1], cls];
    g.setHands(next); setHands(g.slots.map((s) => s.weapon.cls));
    if (!dual || two || next.length >= 2) { setWheel(false); g.paused = false; }
  };
  const openWheel = () => { if (g) { g.paused = !wheel; } setWheel(!wheel); };

  return (
    <div className="em-combat" role="dialog" aria-modal="true" aria-label={`The fight at ${title}`}>
      {phase === 'loading' && <div className="em-combat-msg">THE RIFT OPENS…</div>}
      {phase === 'error' && <div className="em-combat-msg">THE PICTURE WOULD NOT LOAD<br /><button type="button" className="em-btn" onClick={onExit}>BACK</button></div>}
      {phase === 'fighting' && g && (
        <>
          <div className="em-combat-bar">
            <span className="em-combat-name">{title.toUpperCase()}</span>
            <div className="em-health" aria-label="Health"><i style={{ width: `${Math.max(0, (g.health / g.maxHealth) * 100)}%` }} /></div>
            <span className="em-combat-left">{g.remaining} LEFT</span>
          </div>
          <div ref={box} className="em-combat-stage" style={{ aspectRatio: String(ratio) }}>
            <canvas ref={canvas} className="em-combat-canvas" width={960} height={Math.round(960 / ratio)} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()} />
            {g.bannerT > 0 && <div className="em-combat-banner">{g.banner}</div>}
          </div>
          <div className="em-combat-tools">
            <button type="button" className="em-btn em-btn-ghost" onClick={openWheel}>{hands.map((h) => CLASS_NAME[h]).join(' + ')} ▾</button>
            <button type="button" className="em-btn em-btn-ghost" disabled={g.shouts <= 0 || g.shouting} onClick={() => { g.useShout(); tick((n) => n + 1); }} title="Legendary Time: a shout that slows everything">SHOUT ×{g.shouts}</button>
            <button type="button" className="em-btn em-btn-ghost" onClick={onExit}>FLEE</button>
          </div>
          {wheel && (
            <div className="em-wheel" role="menu" aria-label="Choose what is in your hands">
              {(['twohand', 'bow', 'onehand'] as ItemCls[]).map((c) => (
                <button key={c} type="button" className={`em-wheel-${c}`} disabled={!arsenal[c]} onClick={() => pickHands(c)}>{CLASS_NAME[c]}<small>{arsenal[c] ? weaponAt(c, arsenal[c] as 1 | 2 | 3 | 4).name : 'NOT YET'}</small></button>
              ))}
              {dual && <button type="button" className="em-wheel-twohand" onClick={() => { g.setHands([hands[0]]); setHands(g.slots.map((s) => s.weapon.cls)); }}>ONE HAND ONLY: START THE PICK AGAIN</button>}
              <div className="em-wheel-magic">
                {(['shock', 'frost', 'fire', 'drain'] as ItemCls[]).map((c) => (
                  <button key={c} type="button" disabled={!arsenal[c]} onClick={() => pickHands(c)}>{CLASS_NAME[c]}<small>{arsenal[c] ? weaponAt(c, arsenal[c] as 1 | 2 | 3 | 4).name : 'NOT YET'}</small></button>
                ))}
              </div>
            </div>
          )}
          {g.downed && (
            <div className="em-combat-over"><h2>YOU ARE STRUCK DOWN</h2><p>You have {g.potions} health potion{g.potions === 1 ? '' : 's'}.</p>
              <button type="button" className="em-btn" onClick={() => { g.drink(); tick((n) => n + 1); }}>DRINK ONE</button>
              <button type="button" className="em-btn em-btn-ghost" onClick={() => { g.fall(); tick((n) => n + 1); }}>FALL</button></div>
          )}
          {g.outcome !== 'fighting' && (
            <div className="em-combat-over"><h2>{g.outcome === 'won' ? 'THE PLACE IS CLEARED' : 'YOU FELL'}</h2><p>{g.killed} slain.</p><button type="button" className="em-btn" onClick={onExit}>{g.outcome === 'won' ? 'CONTINUE' : 'RETREAT'}</button></div>
          )}
        </>
      )}
    </div>
  );
}

// ---- drawing ----

function draw(c: HTMLCanvasElement, img: HTMLImageElement, g: Game, art: CombatAssets, zoomAt: { u: number; v: number }) {
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const W = c.width, H = c.height;
  ctx.save();
  // the bow draws in: the view closes in on the aim
  const bow = g.slots.find((s) => s.weapon.cls === 'bow' && s.charging);
  const zoom = bow ? 1 + 0.4 * bow.charge : 1;
  if (zoom !== 1) { ctx.translate(zoomAt.u * W, zoomAt.v * H); ctx.scale(zoom, zoom); ctx.translate(-zoomAt.u * W, -zoomAt.v * H); }
  const sh = g.shake > 0 ? g.shake * 5 : 0;
  ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  ctx.drawImage(img, 0, 0, W, H);

  // enemies, the farthest first
  const list = [...g.enemies].sort((a, b) => a.v - b.v);
  for (const e of list) drawEnemy(ctx, e, g, art, W, H);
  // effects
  for (const f of g.effects) drawEffect(ctx, f, W, H);
  // the drain: a beam from the hand to what it is draining
  const drain = g.drainOn;
  if (drain) {
    const h = g.heightOf(drain);
    ctx.strokeStyle = SPELL_COLOR.drain; ctx.lineWidth = 3 + Math.sin(performance.now() / 60) * 1.5; ctx.shadowColor = '#ff3b8a'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(0.3 * W, H);
    for (let i = 1; i <= 12; i++) { const t = i / 12; ctx.lineTo((0.3 + (drain.u - 0.3) * t) * W + Math.sin(performance.now() / 70 + i) * 8, (1 + (drain.v - h * 0.5 - 1) * t) * H); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();

  // the strike flash and the shout's glow
  if (g.hitFlash > 0) { ctx.fillStyle = `rgba(180,20,20,${0.38 * g.hitFlash})`; ctx.fillRect(0, 0, W, H); }
  if (g.shoutT > 0) { ctx.fillStyle = `rgba(255,220,140,${0.25 * Math.min(1, g.shoutT)})`; ctx.fillRect(0, 0, W, H); }
  if (g.slowLeft > 0) { ctx.fillStyle = 'rgba(120,150,255,0.07)'; ctx.fillRect(0, 0, W, H); }

  // the bow's aim: a dot, and the charge rings of everything charging
  if (g.holding) {
    for (const s of g.slots) {
      if (!s.charging) continue;
      ctx.strokeStyle = isSpell(s.weapon.cls) ? SPELL_COLOR[s.weapon.cls] : '#f4e8c6'; ctx.lineWidth = 4; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(g.aim.u * W, g.aim.v * H, 28 + 6 * g.slots.indexOf(s), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.charge); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (bow) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(g.aim.u * W, g.aim.v * H, 3.5, 0, Math.PI * 2); ctx.fill(); }
  }
  drawHands(ctx, g, art, W, H);
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, g: Game, art: CombatAssets, W: number, H: number) {
  const sprites = art.enemies[e.type.art ?? e.type.id];
  const h = g.heightOf(e) * H;
  let frame = Math.floor(e.gait * 2) % 2;
  if (e.state === 'striking' || e.sky?.attacking) frame = 2; else if (e.state === 'dying') frame = 3;
  const img = sprites?.frames[frame];
  // every pose is drawn at the same scale (the one that makes the first pose h tall), so a lunge is bigger and a corpse lower, and a flapping wing keeps its size
  const base = sprites?.frames[0];
  const sc = img && base ? h / base.naturalHeight : 1;
  const w = img ? img.naturalWidth * sc : h * 0.45;
  const dh = img ? img.naturalHeight * sc : h;
  const x = e.u * W, y = (e.v - e.lift) * H;
  // its shadow stays on the ground
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, e.v * H, w * 0.4, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  if (e.state === 'dying') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - 0.7) / 0.9);
  else if (e.state === 'leaving') ctx.globalAlpha = Math.max(0, 1 - e.t / 1.1);
  if (e.hurt > 0 && Math.floor(e.hurt * 40) % 2 === 0) ctx.globalAlpha *= 0.65;
  const lean = e.state === 'walking' ? Math.sin(e.gait * Math.PI) * 0.03 : 0;
  ctx.translate(x, y); ctx.rotate(lean);
  if (img) ctx.drawImage(img, -w / 2, -dh, w, dh);
  else { ctx.fillStyle = e.boss ? '#5a2a2a' : '#2a2f36'; ctx.fillRect(-w / 2, -h, w, h); }
  if (e.chill > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(140,200,255,0.35)'; ctx.fillRect(-w / 2, -h, w, h); }
  ctx.restore();
  // health bar for the bigger ones
  if ((e.boss || e.type.size >= 1.5) && e.state !== 'dying') { const bw = Math.max(40, w * 0.8); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2, y - h - 10, bw, 5); ctx.fillStyle = e.boss ? '#d8a23a' : '#b53a3a'; ctx.fillRect(x - bw / 2, y - h - 10, bw * Math.max(0, e.hp / e.maxHp), 5); }
}

function drawEffect(ctx: CanvasRenderingContext2D, f: Effect, W: number, H: number) {
  const k = Math.min(1, f.t / f.life);
  const x0 = f.u0 * W, y0 = f.v0 * H, x1 = f.u * W, y1 = f.v * H;
  ctx.save();
  if (f.kind === 'slash') {
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 7 * f.size * (1 - k); ctx.lineCap = 'round'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x1, y1, 60 * f.size, -2.4 + k * 1.2, -0.8 + k * 1.6); ctx.stroke();
  } else if (f.kind === 'miss') {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x1, y1, 50, -2.4 + k, -0.8 + k * 1.4); ctx.stroke();
  } else if (f.kind === 'arrow') {
    // it arcs a little: the middle of its flight is higher than a straight line
    const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 0.09 * H;
    const k2 = Math.min(1, k + 0.04), xb = x0 + (x1 - x0) * k2, yb = y0 + (y1 - y0) * k2 - Math.sin(k2 * Math.PI) * 0.09 * H;
    ctx.strokeStyle = '#e9dcb8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (xb - x) * 5, y - (yb - y) * 5); ctx.stroke();
  } else if (f.kind === 'bolt') {
    ctx.strokeStyle = `rgba(190,230,255,${1 - k})`; ctx.lineWidth = 3 + 3 * f.size; ctx.shadowColor = '#8fd0ff'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i <= 10; i++) { const t = i / 10; ctx.lineTo(x0 + (x1 - x0) * t + (Math.random() - 0.5) * 26 * (1 - t * 0.4), y0 + (y1 - y0) * t + (Math.random() - 0.5) * 26 * (1 - t * 0.4)); }
    ctx.stroke();
  } else if (f.kind === 'spike') {
    const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    ctx.fillStyle = '#cdeeff'; ctx.shadowColor = '#7cc8ff'; ctx.shadowBlur = 14; ctx.translate(x, y); ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
    ctx.beginPath(); ctx.moveTo(26 * f.size + 10, 0); ctx.lineTo(-18, -7 * f.size - 3); ctx.lineTo(-18, 7 * f.size + 3); ctx.closePath(); ctx.fill();
  } else if (f.kind === 'fireball') {
    const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 0.05 * H, r = 16 * f.size + 8;
    const gr = ctx.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.45, '#ff9a3c'); gr.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  } else if (f.kind === 'burst') {
    ctx.strokeStyle = `rgba(255,230,160,${1 - k})`; ctx.lineWidth = 5 * (1 - k) + 1; ctx.beginPath(); ctx.arc(x1, y1, 14 + 70 * f.size * k, 0, Math.PI * 2); ctx.stroke();
  } else if (f.kind === 'shout') {
    for (let i = 0; i < 4; i++) { const kk = Math.max(0, k - i * 0.1); ctx.strokeStyle = `rgba(255,214,120,${0.7 * (1 - kk)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, H, kk * W * 0.9, Math.PI, 0); ctx.stroke(); }
  } else if (f.kind === 'number') {
    ctx.font = `bold ${Math.round(22 * f.size)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = f.crit ? `rgba(255,214,120,${1 - k})` : `rgba(255,255,255,${1 - k})`; ctx.strokeStyle = `rgba(0,0,0,${1 - k})`; ctx.lineWidth = 3;
    ctx.strokeText(String(f.value), x1, y1 - k * 40); ctx.fillText(String(f.value), x1, y1 - k * 40);
  }
  ctx.restore();
}

function drawHands(ctx: CanvasRenderingContext2D, g: Game, art: CombatAssets, W: number, H: number) {
  g.slots.forEach((s, i) => {
    const img = art.weapons[s.weapon.art];
    const two = g.slots.length > 1;
    const baseX = two ? (i === 0 ? W * 0.72 : W * 0.28) : W * 0.5;
    const w = (two ? 0.34 : 0.46) * W;
    const h = img ? w * (img.naturalHeight / img.naturalWidth) : w * 0.9;
    // pulled back while charging, then a quick swing through
    let rot = -0.08 * s.charge, dy = 0.12 * h * s.charge, dx = 0;
    if (s.swing > 0) { const k = s.swing; const a = Math.sin(k * Math.PI); rot = (s.weapon.melee ? -0.7 : -0.12) * a * (1 - k * 0.2); dy = -0.1 * h * a; dx = s.weapon.melee ? -0.1 * w * a : 0; }
    ctx.save();
    ctx.translate(baseX + dx, H + dy); ctx.rotate(rot);
    if (img) ctx.drawImage(img, -w / 2, -h * 0.92, w, h);
    else { ctx.fillStyle = isSpell(s.weapon.cls) ? SPELL_COLOR[s.weapon.cls] : '#aaa'; ctx.fillRect(-w * 0.1, -h * 0.9, w * 0.2, h * 0.9); }
    ctx.restore();
  });
}

export { BOSSES, ENEMIES };
