import { createPortal } from 'react-dom';
import Coin from './Coin';
import Padlock from './Padlock';
import { useEffect, useRef, useState } from 'react';
import { glimpseCost, hasTownLegend, sceneFor } from './lib/scenes';
import { kindTitle, readableInk, type Province } from './lib/lore';
import { db } from './lib/account';
import { GLIMPSE_MESSAGES, requestGlimpse, type Glimpse } from './lib/glimpse';
import CombatScreen from './CombatScreen';
import { finishRun, startRun, type RunStart } from './lib/clear';
import { STARTING_ARSENAL, planFor, worthFor, type Arsenal } from './lib/combat/data';
import { LOOT, REGIONAL_HERBS } from './lib/loot';

interface Props {
  spot: { id: string; name: string; real: string; kind: string; note: string; lat: number; lng: number };
  province: Province;
  icon: string;
  signedIn: boolean;
  /** This place is the player's own home city. */
  homeCity?: boolean;
  /** The traveller's level (foes toughen with it). */
  level?: number;
  /** Said when a button that needs an account (or something not built yet) is pressed. */
  onNeedsAccount: (what: string) => void;
  /** A glimpse was paid for: the balance has changed. */
  onSpent: () => void;
  /** The place was cleared: the map marks it. */
  onCleared: (placeId: string) => void;
  /** Opens the Town Legend of the city this place belongs to. */
  onTownLegend: () => void;
  /** The building style the place is rendered in (from where it lies on the map); null for the older layout. */
  style?: string | null;
  /** This city's gates are cleared (the fogged city may be entered). */
  gateCleared?: boolean;
  /** This place was purged already. */
  purged?: boolean;
  /** Open straight into the fight (the place was glimpsed before). */
  autoPurge?: boolean;
  /** The glimpse of this place is on screen: the map remembers it as glimpsed. */
  onGlimpsed?: (placeId: string) => void;
  /** Makes this glimpsed address the traveller's home hearth. */
  onHearth?: () => void;
  /** Opens the fogged city (once its gate is cleared and an address glimpsed). */
  onFoggedCity?: () => void;
  onClose: () => void;
}

/** The scene of a place: its story, the glimpse (the paid picture of it, arriving on a wave out of the real photograph) and, for a city, the Town Legend. */
export default function SceneView({ style = null, gateCleared = false, purged = false, autoPurge = false, onGlimpsed, level = 0, homeCity = false, spot, province, icon, signedIn, onNeedsAccount, onSpent, onCleared, onTownLegend, onFoggedCity, onHearth, onClose }: Props) {
  const lines = sceneFor(spot.name, spot.kind, province.id);
  const cost = glimpseCost(spot.kind);
  const [state, setState] = useState<'idle' | 'working' | 'ready'>('idle');
  const [glimpse, setGlimpse] = useState<Glimpse | null>(null);
  const [problem, setProblem] = useState('');
  // already glimpsed (paid for before): the button then shows no price, only an open lock
  const [owned, setOwned] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void (async () => { const { data: u } = await db().auth.getUser(); const id = u.user?.id; if (!id) return; const { data } = await db().from('unlocks').select('place_id').eq('user_id', id).eq('place_id', spot.id).maybeSingle(); if (live && data) setOwned(true); })();
    return () => { live = false; };
  }, [signedIn, spot.id]);
  // clearing the place: the fight, and what it paid
  const [run, setRun] = useState<RunStart | null>(null);
  const [xpLine, setXpLine] = useState('');
  const [paidLine, setPaidLine] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const look = async () => {
    if (!signedIn) { onNeedsAccount('A GLIMPSE'); return; }
    setProblem(''); setState('working');
    // it can take a minute the first time anyone looks at a place: asking again is free
    for (let attempt = 0; attempt < 40 && alive.current; attempt++) {
      const r = await requestGlimpse({ id: spot.id, name: spot.real || spot.name, kind: spot.kind, lat: spot.lat, lng: spot.lng, province: province.id, style });
      if (!alive.current) return;
      if (r.kind === 'ready') { setGlimpse(r.glimpse); setState('ready'); setOwned(true); onGlimpsed?.(spot.id); if (r.glimpse.charged) onSpent(); return; }
      if (r.kind === 'error') { setProblem(GLIMPSE_MESSAGES[r.reason] ?? GLIMPSE_MESSAGES.failed); setState('idle'); return; }
      await new Promise((res) => setTimeout(res, 4000));
    }
    if (alive.current) { setProblem('IT IS TAKING A LONG TIME: OPEN IT AGAIN IN A MINUTE. YOU WILL NOT BE CHARGED TWICE'); setState('idle'); }
  };

  // opened from the PURGE button of a place already glimpsed: the picture is fetched (free, it is owned) and the fight begins
  const auto = useRef(autoPurge);
  useEffect(() => { if (auto.current && signedIn) void look(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (auto.current && state === 'ready' && glimpse) { auto.current = false; void clearOut(); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, glimpse]);

  const clearOut = async () => {
    if (!glimpse) return;
    setProblem(''); setPaidLine('');
    const r = await startRun({ id: spot.id, kind: spot.kind });
    if (!r.ok) { setProblem(r.reason === 'cleared' ? 'YOU HAVE ALREADY PURGED THIS PLACE' : r.reason === 'locked' ? 'GLIMPSE THE PLACE FIRST' : 'THE FIGHT COULD NOT BEGIN: TRY AGAIN'); return; }
    setRun(r.run);
  };
  const lootName = (id: string) => LOOT.find((l) => l.id === id)?.name ?? REGIONAL_HERBS.find((h) => h.loot.id === id)?.loot.name ?? id;
  const worth = run?.worth ?? worthFor(spot.kind, 10);

  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label={`${spot.name}: its story`} onClick={onClose}>
      <article className="em-scene" style={{ ['--prov' as string]: readableInk(province) }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>
        {state === 'ready' && glimpse ? (
          <Reveal glimpse={glimpse} name={spot.name} />
        ) : (
          <>
            <div className="em-card-icon" dangerouslySetInnerHTML={{ __html: icon }} />
            <h2>{spot.name}</h2>
            <p className="em-card-kind">{kindTitle(spot.kind, province.id, spot.real)}</p>
            <div className="em-scene-lore">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
          </>
        )}
        {state === 'working' && <GlimpseProgress long={spot.kind === 'crest' || spot.kind === 'town'} />}
        {paidLine && <p className="em-fine">{paidLine}</p>}
        {xpLine && <p className="em-fine">{xpLine}</p>}
        {run && glimpse && (
          <CombatScreen title={spot.name} imageUrl={glimpse.url} plan={planFor(spot.id, spot.kind, worth, province.id)} spawns={{ horizon: 0.56, points: [], buildingM: 20 }} arsenal={{ ...STARTING_ARSENAL, ...(run.arsenal as Arsenal) }} dual={run.pack.dual} level={level} homeCity={homeCity} potions={run.pack.potions} shouts={run.pack.shouts}
            onDone={async (res) => {
              const end = await finishRun(run.runId, res.won, province.id, spot.kind, res.potionsUsed, res.shoutsUsed, res.kills);
              if (end && end.xp) setXpLine('+' + end.xp.toFixed(1) + ' XP FOR THE FIGHT');
              if (res.won) onCleared(spot.id);
              if (res.won && end?.loot) setPaidLine(`${end.paid ? 'LOOT: ' : 'HELD UNTIL YOU VISIT IN PERSON: '}${Object.entries(end.loot).map(([id, n]) => `${n} ${lootName(id).toUpperCase()}`).join(', ')}`);
            }}
            onExit={() => setRun(null)} />
        )}
        {problem && <p className="em-note">{problem}</p>}
        <div className="em-card-buttons em-scene-buttons">
          {state !== 'ready' && (
            <button type="button" className="em-btn em-glimpse-btn" disabled={state === 'working'} onClick={() => void look()} title="See this place as it might stand in the realm">
              {state === 'working' ? 'GLIMPSING…' : owned ? <>GLIMPSE <Padlock open size={14} /></> : <>GLIMPSE · <Coin size={13} /> {cost} <Padlock size={14} /></>}
            </button>
          )}
          {hasTownLegend(spot.kind) && state !== 'ready' && (
            <>
              {onFoggedCity && <button type="button" className={'em-btn em-btn-ghost' + (gateCleared ? '' : ' em-subdued')} onClick={() => { if (gateCleared) onFoggedCity(); else setProblem('CLEAR THE ENEMIES GUARDING THE CITY GATES FIRST: GLIMPSE THE CITY, THEN PURGE IT'); }} title="The fogged city: what you have had pictured, once the city's gate is cleared">ENTER THE FOG</button>}
              <button type="button" className="em-btn em-btn-ghost" onClick={onTownLegend} title="The whole city map, with every place travellers have glimpsed">TOWN LEGEND</button>
            </>
          )}
          {state === 'ready' && !purged && <button type="button" className="em-btn" onClick={() => void clearOut()}>PURGE</button>}
          {state === 'ready' && <button type="button" className="em-btn em-btn-ghost" onClick={() => setState('idle')}>CHRONICLE</button>}
          {state === 'ready' && spot.kind === 'house' && onHearth && <button type="button" className="em-btn em-btn-ghost" onClick={onHearth} title="Make this address your home hearth">MAKE THIS MY HEARTH</button>}
        </div>
      </article>
    </div>
  );
}

/** The picture arriving: a wave of light rolls out from the middle, and the real photograph of the place dissolves into the realm's version of it. */
/** The photograph holds a moment, then a rift tears open in it like the gate of Oblivion: cracks of white fire fan out from the middle, the picture rips open along a jagged edge, a red-gold vortex
 *  of fire turns inside, throws embers, and fades to show the realm's own picture beneath. */
const HOLD_MS = 1100, CRACK_MS = 1500, OPEN_MS = 2300, STAND_MS = 800, REVEAL_MS = 1500;
const ease = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (p: number, q: number, t: number): number => p + (q - p) * t;
export function Reveal({ glimpse, name }: { glimpse: Glimpse; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const by = glimpse.discovered?.by;
  const [big, setBig] = useState(false);

  // The gate of Oblivion: a thin line of light cracks the photograph open, widens into a tall churning portal of fire with tendrils of flame curling off its sides, holds, and then the
  // portal grows to fill the picture and the realm's own version is what is left.
  useEffect(() => {
    const box = frame.current, img = after.current, cv = canvas.current;
    if (!loaded || !box || !img || !cv) return;
    const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || !glimpse.before) { img.style.opacity = '1'; img.style.clipPath = 'none'; return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = box.clientWidth, H = box.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d') as CanvasRenderingContext2D;
    g.scale(dpr, dpr);
    const cx = W * 0.5, cy = H * 0.52;
    const halfH = H * 0.4, halfW = Math.min(W * 0.17, H * 0.26);
    const N = 90;
    const jag = Array.from({ length: N }, () => 0.94 + 0.12 * Math.random());
    // the crack: a jagged vertical line with small fissures off it
    const crack: [number, number][] = [];
    for (let i = 0; i <= 28; i++) crack.push([(Math.random() - 0.5) * 14, (i / 28 - 0.5) * 2]);
    const fissures = Array.from({ length: 9 }, () => { const at = Math.floor(3 + Math.random() * 22), dir = Math.random() < 0.5 ? -1 : 1; const pts: [number, number][] = []; let x = crack[at][0], y = crack[at][1]; for (let k = 0; k < 4; k++) { x += dir * (6 + Math.random() * 14); y += (Math.random() - 0.5) * 0.06; pts.push([x, y]); } return { at, pts }; });
    const embers: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
    const tendrils = Array.from({ length: 12 }, (_, i) => ({ side: i % 2 ? 1 : -1, y: (Math.random() - 0.5) * 0.7, len: 0.12 + Math.random() * 0.2, seed: Math.random() * 10, w: 1.2 + Math.random() * 1.6 }));
    let raf = 0;
    const t0 = performance.now();

    const outline = (A: number, B: number, t: number): [number, number][] => Array.from({ length: N }, (_, i) => {
      const ang = (i / N) * Math.PI * 2;
      const wob = 1 + 0.04 * Math.sin(ang * 6 + t * 0.004) + 0.03 * Math.sin(ang * 13 - t * 0.006);
      return [cx + Math.cos(ang) * A * wob * jag[i], cy + Math.sin(ang) * B * wob * jag[i]];
    });
    const trace = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };

    /** A tendril of flame leaving the edge of the portal at height `yy`, curling out and up, flickering. */
    const tendril = (A: number, B: number, tn: (typeof tendrils)[number], t: number, alpha: number) => {
      const yy = cy + tn.y * B, k = Math.sqrt(Math.max(0, 1 - ((yy - cy) / B) ** 2));
      let x = cx + tn.side * A * k, y = yy;
      const len = tn.len * W * (0.75 + 0.25 * Math.sin(t * 0.012 + tn.seed));
      g.beginPath(); g.moveTo(x, y);
      const segs = 9;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        x += tn.side * (len / segs) * (0.8 + 0.5 * Math.sin(tn.seed + i * 1.7 + t * 0.01));
        y += Math.sin(tn.seed * 2 + i * 1.1 + t * 0.013) * len * 0.07 - f * len * 0.045;
        g.lineTo(x, y);
      }
      g.shadowColor = '#ff7a10'; g.shadowBlur = 14;
      g.strokeStyle = `rgba(255,226,150,${0.8 * alpha})`; g.lineWidth = tn.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = `rgba(255,120,30,${0.45 * alpha})`; g.lineWidth = tn.w * 3; g.stroke();
    };

    const portal = (A: number, B: number, t: number, o: number, fade: number) => {
      const pts = outline(A, B, t);
      // the glow it throws on the air
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(A, B) * 2.1);
      halo.addColorStop(0, `rgba(255,150,40,${0.55 * o * fade})`); halo.addColorStop(1, 'rgba(120,10,0,0)');
      g.fillStyle = halo; g.fillRect(0, 0, W, H);
      // the fire inside: bright at the heart, red at the rim, with ribbons of flame running up it and a slow turn
      g.save(); trace(pts); g.clip();
      g.globalAlpha = fade;
      const fill = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(A, B * 0.9));
      fill.addColorStop(0, '#fff2b8'); fill.addColorStop(0.3, '#ffb53a'); fill.addColorStop(0.65, '#e5560e'); fill.addColorStop(1, '#8a1604');
      g.fillStyle = fill; g.fillRect(cx - A * 1.3, cy - B * 1.3, A * 2.6, B * 2.6);
      g.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 8; r++) {
        g.beginPath();
        for (let yy = -B; yy <= B; yy += 7) {
          const x = cx + (r - 3.5) * A * 0.26 + Math.sin(yy * 0.021 + t * 0.0045 * (1 + r * 0.17) + r * 1.9) * A * 0.2;
          if (yy === -B) g.moveTo(x, cy + yy); else g.lineTo(x, cy + yy - ((t * 0.05 * (1 + r * 0.1)) % 12));
        }
        g.strokeStyle = `rgba(255,${190 + (r % 3) * 20},90,0.2)`; g.lineWidth = Math.max(1.5, A * 0.13); g.stroke();
      }
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, A * 0.7);
      core.addColorStop(0, 'rgba(255,250,215,0.75)'); core.addColorStop(1, 'rgba(255,200,80,0)');
      g.fillStyle = core; g.fillRect(cx - A, cy - B, A * 2, B * 2);
      g.restore();
      // the rim burns
      trace(pts); g.shadowColor = '#ff5a00'; g.shadowBlur = 24; g.strokeStyle = `rgba(255,226,150,${0.95 * fade})`; g.lineWidth = 3.2; g.stroke(); g.shadowBlur = 0;
      g.strokeStyle = `rgba(120,30,5,${0.8 * fade})`; g.lineWidth = 7; g.globalCompositeOperation = 'destination-over'; trace(pts); g.stroke(); g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 3; i++) { const [x, y] = pts[Math.floor(Math.random() * N)]; embers.push({ x, y, vx: (x - cx) / A * (0.4 + Math.random() * 0.8), vy: -0.4 - Math.random() * 1.2, life: 1, size: 1 + Math.random() * 2.4 }); }
      return pts;
    };

    const draw = (now: number) => {
      const t = now - t0;
      g.clearRect(0, 0, W, H);
      const tc = t - HOLD_MS;
      if (tc < 0) { raf = requestAnimationFrame(draw); return; }
      const open = ease((tc - CRACK_MS) / OPEN_MS);                 // 0 to 1 while the line widens into the gate
      const reveal = ease((tc - CRACK_MS - OPEN_MS - STAND_MS) / REVEAL_MS);
      const shake = tc < CRACK_MS + OPEN_MS * 0.6 ? Math.min(1, tc / 500) * 2.4 : 0;
      box.style.transform = shake ? `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)` : '';

      if (tc < CRACK_MS) {
        // the crack: a thin line of white-gold light tearing the picture, longer and brighter as it goes, with fissures off it
        const p = ease(tc / CRACK_MS), len = lerp(0.04, 0.5, p) * halfH * 2, n = Math.max(2, Math.floor(crack.length * Math.min(1, p * 1.15)));
        const halo = g.createRadialGradient(cx, cy, 0, cx, cy, len);
        halo.addColorStop(0, `rgba(255,120,30,${0.4 * p})`); halo.addColorStop(1, 'rgba(120,10,0,0)');
        g.fillStyle = halo; g.fillRect(0, 0, W, H);
        const at = (k: [number, number]): [number, number] => [cx + k[0] * (0.4 + p), cy + k[1] * len * 0.5];
        for (const fz of fissures) {
          if (fz.at >= n) continue;
          const [x0, y0] = at(crack[fz.at]); g.beginPath(); g.moveTo(x0, y0);
          for (const [dx, dy] of fz.pts) g.lineTo(x0 + dx * p, y0 + dy * len);
          g.shadowColor = '#ff5a00'; g.shadowBlur = 10; g.strokeStyle = `rgba(255,235,190,${0.85 * p})`; g.lineWidth = 1.1; g.stroke(); g.shadowBlur = 0;
        }
        g.beginPath(); crack.slice(0, n).forEach((k, i) => { const [x, y] = at(k); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
        g.shadowColor = '#ff7a10'; g.shadowBlur = 18; g.strokeStyle = 'rgba(255,255,235,0.95)'; g.lineWidth = 1.2 + 1.8 * p; g.stroke(); g.shadowBlur = 0;
        raf = requestAnimationFrame(draw); return;
      }

      // the gate: as wide as `open` allows, and (once the standing moment has passed) growing until it is the whole picture
      const grow = 1 + reveal * 7;
      const A = lerp(1.5, halfW, open) * grow, B = lerp(halfH * 0.18, halfH, Math.min(1, open * 1.5)) * grow;
      const fade = 1 - ease(reveal * 1.6 - 0.1);
      let pts: [number, number][];
      if (reveal > 0) {
        img.style.opacity = '1';
        const edgeNow = outline(A, B, t);
        img.style.clipPath = reveal >= 1 ? 'none' : 'polygon(' + edgeNow.map(([x, y]) => `${x}px ${y}px`).join(',') + ')';
      }
      if (reveal < 1) {
        pts = portal(A, B, t, Math.max(open, 0.05), reveal > 0 ? Math.max(0, fade) * 0.9 + 0.1 * (1 - reveal) : 1);
        void pts;
        // the tendrils of flame curling off the sides, near the middle, appearing as the gate opens and drawn in as the picture takes over
        const ta = ease((open - 0.3) / 0.5) * (1 - ease(reveal * 2));
        if (ta > 0.02) for (const tn of tendrils) tendril(A, B, tn, t, ta);
      }
      for (const e of embers) { e.x += e.vx; e.y += e.vy; e.vy += 0.012; e.life -= 0.016; }
      for (let i = embers.length - 1; i >= 0; i--) if (embers[i].life <= 0) embers.splice(i, 1);
      for (const e of embers) { g.fillStyle = `rgba(255,${120 + Math.floor(e.life * 100)},40,${Math.max(0, e.life)})`; g.beginPath(); g.arc(e.x, e.y, e.size, 0, Math.PI * 2); g.fill(); }
      if (reveal >= 1 && embers.length === 0) { box.style.transform = ''; g.clearRect(0, 0, W, H); return; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); box.style.transform = ''; };
  }, [loaded, glimpse.before]);

  return (
    <figure className="em-reveal">
      <div className="em-reveal-frame" ref={frame} onClick={() => setBig(true)} role="button" aria-label={`${name}: tap to enlarge`}>
        {glimpse.before && <img className="em-reveal-before" src={glimpse.before} alt="" draggable={false} crossOrigin="anonymous" />}
        <img ref={after} className="em-reveal-after" src={glimpse.url} alt={`${name}, as it might stand in the realm`} draggable={false} onLoad={() => setLoaded(true)} />
        <canvas ref={canvas} className="em-reveal-portal" aria-hidden="true" />
        {glimpse.discovered && <span className="em-discovered-by">DISCOVERED BY {(by ?? 'A TRAVELLER').toUpperCase()}</span>}
      </div>
      {big && createPortal(
        <div className="em-lightbox" role="dialog" aria-label={`${name}, full size`} onClick={() => setBig(false)}>
          <img src={glimpse.url} alt={`${name}, as it might stand in the realm`} />
          <button type="button" className="em-lightbox-x" aria-label="Close">×</button>
        </div>,
        document.body,
      )}
      <figcaption>
        <b>{name}</b>
        {glimpse.credit && glimpse.credit.photo && glimpse.credit.author !== 'Google' && (
          <small>Made from “{glimpse.credit.photo}” by {glimpse.credit.author}, {glimpse.credit.license}, via <a href={glimpse.credit.page} target="_blank" rel="noreferrer">its page</a>. Shared under the same license.</small>
        )}
        {glimpse.credit?.author === 'Google' && <small>Made from Google Street View imagery. The original is not kept.</small>}
      </figcaption>
    </figure>
  );
}

/** A bar that fills while the picture is being made. The server does not report its progress, so it fills toward the end the way a typical wait goes (a big city takes longer), and waits at the end until the picture arrives. */
function GlimpseProgress({ long }: { long: boolean }) {
  const [p, setP] = useState(0.02);
  useEffect(() => {
    const t0 = performance.now(), tau = long ? 38 : 20;
    const timer = window.setInterval(() => setP(Math.min(0.96, 1 - Math.exp(-((performance.now() - t0) / 1000) / tau))), 250);
    return () => window.clearInterval(timer);
  }, [long]);
  return (
    <div className="em-progress-wrap">
      <div className="em-progress" role="progressbar" aria-label="The picture is being made" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
      <p className="em-fine em-wave-note">THE RIFT OPENS… {Math.round(p * 100)}%</p>
    </div>
  );
}
