import Coin from './Coin';
import { useEffect, useRef, useState } from 'react';
import { glimpseCost, hasTownLegend, sceneFor } from './lib/scenes';
import { kindTitle, readableInk, type Province } from './lib/lore';
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
  /** Makes this glimpsed address the traveller's home hearth. */
  onHearth?: () => void;
  /** Opens the fogged city (once its gate is cleared and an address glimpsed). */
  onFoggedCity?: () => void;
  onTravel: () => void;
  onClose: () => void;
}

/** The scene of a place: its story, the glimpse (the paid picture of it, arriving on a wave out of the real photograph) and, for a city, the Town Legend. */
export default function SceneView({ level = 0, homeCity = false, spot, province, icon, signedIn, onNeedsAccount, onSpent, onCleared, onTownLegend, onFoggedCity, onHearth, onTravel, onClose }: Props) {
  const lines = sceneFor(spot.name, spot.kind, province.id);
  const cost = glimpseCost(spot.kind);
  const [state, setState] = useState<'idle' | 'working' | 'ready'>('idle');
  const [glimpse, setGlimpse] = useState<Glimpse | null>(null);
  const [problem, setProblem] = useState('');
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
      const r = await requestGlimpse({ id: spot.id, name: spot.real || spot.name, kind: spot.kind, lat: spot.lat, lng: spot.lng, province: province.id });
      if (!alive.current) return;
      if (r.kind === 'ready') { setGlimpse(r.glimpse); setState('ready'); if (r.glimpse.charged) onSpent(); return; }
      if (r.kind === 'error') { setProblem(GLIMPSE_MESSAGES[r.reason] ?? GLIMPSE_MESSAGES.failed); setState('idle'); return; }
      await new Promise((res) => setTimeout(res, 4000));
    }
    if (alive.current) { setProblem('IT IS TAKING A LONG TIME: OPEN IT AGAIN IN A MINUTE. YOU WILL NOT BE CHARGED TWICE'); setState('idle'); }
  };

  const clearOut = async () => {
    if (!glimpse) return;
    setProblem(''); setPaidLine('');
    const r = await startRun({ id: spot.id, kind: spot.kind });
    if (!r.ok) { setProblem(r.reason === 'cleared' ? 'YOU HAVE ALREADY CLEARED THIS PLACE' : r.reason === 'locked' ? 'GLIMPSE THE PLACE FIRST' : 'THE FIGHT COULD NOT BEGIN: TRY AGAIN'); return; }
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
        {state === 'working' && <p className="em-fine em-wave-note">THE RIFT OPENS… A MOMENT</p>}
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
        <div className="em-card-buttons">
          {state !== 'ready' && (
            <button type="button" className="em-btn" disabled={state === 'working'} onClick={() => void look()} title="See this place as it might stand in the realm">
              {state === 'working' ? 'GLIMPSING…' : <>GLIMPSE · <Coin size={15} /> {cost} <span aria-hidden="true">🔒</span></>}
            </button>
          )}
          {state === 'ready' && <button type="button" className="em-btn" onClick={() => void clearOut()}>CLEAR</button>}
          {state === 'ready' && <button type="button" className="em-btn em-btn-ghost" onClick={() => setState('idle')}>THE STORY</button>}
          {state === 'ready' && spot.kind === 'house' && onHearth && <button type="button" className="em-btn em-btn-ghost" onClick={onHearth} title="Make this address your home hearth">MAKE THIS MY HEARTH</button>}
          {hasTownLegend(spot.kind) && state !== 'ready' && (
            <>
              <button type="button" className="em-btn em-btn-ghost" onClick={onTownLegend} title="The whole city map, with every place travellers have glimpsed">TOWN LEGEND</button>
              {onFoggedCity && <button type="button" className="em-btn em-btn-ghost" onClick={onFoggedCity} title="The fogged city: what you have had pictured, once the city's gate is cleared">ENTER THE FOG</button>}
            </>
          )}
          <button type="button" className="em-btn em-btn-ghost" onClick={onTravel}>FAST TRAVEL</button>
        </div>
      </article>
    </div>
  );
}

/** The picture arriving: a wave of light rolls out from the middle, and the real photograph of the place dissolves into the realm's version of it. */
/** The photograph holds a moment, then a rift tears open in it like the gate of Oblivion: cracks of white fire fan out from the middle, the picture rips open along a jagged edge, a red-gold vortex
 *  of fire turns inside, throws embers, and fades to show the realm's own picture beneath. */
const HOLD_MS = 1900, CRACK_MS = 1100, OPEN_MS = 2900;
const ease = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
export function Reveal({ glimpse, name }: { glimpse: Glimpse; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const by = glimpse.discovered?.by;

  useEffect(() => {
    const box = frame.current, img = after.current, cv = canvas.current;
    if (!loaded || !box || !img || !cv) return;
    const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || !glimpse.before) { img.style.opacity = '1'; img.style.clipPath = 'none'; if (!still) { /* no photograph to tear: the realm simply appears */ } return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = box.clientWidth, H = box.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d') as CanvasRenderingContext2D;
    g.scale(dpr, dpr);
    const cx = W * 0.5, cy = H * 0.55;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.25;
    // the jaggedness of the tear is fixed for this opening
    const N = 96;
    const jag = Array.from({ length: N }, (_, i) => 0.82 + 0.3 * Math.random() + (i % 7 === 0 ? 0.22 * Math.random() : 0));
    const cracks = Array.from({ length: 9 }, (_, k) => {
      const ang = (k / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const pts: [number, number][] = [[0, 0]];
      let r = 0, a2 = ang;
      for (let i = 0; i < 12; i++) { r += 0.09 + Math.random() * 0.06; a2 += (Math.random() - 0.5) * 0.7; pts.push([Math.cos(a2) * r, Math.sin(a2) * r * 0.85]); }
      return pts;
    });
    const embers: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
    let raf = 0;
    const t0 = performance.now();
    const edge = (r: number, t: number): [number, number][] => Array.from({ length: N }, (_, i) => {
      const ang = (i / N) * Math.PI * 2;
      const wob = 1 + 0.07 * Math.sin(ang * 5 + t * 0.003) + 0.05 * Math.sin(ang * 11 - t * 0.004);
      const rr = r * jag[i] * wob;
      return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.92];
    });
    const draw = (now: number) => {
      const t = now - t0;
      g.clearRect(0, 0, W, H);
      const tc = t - HOLD_MS;
      if (tc < 0) { raf = requestAnimationFrame(draw); return; }
      const shake = tc < CRACK_MS + OPEN_MS * 0.5 ? Math.min(1, tc / 400) * 2.2 : 0;
      box.style.transform = shake ? `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)` : '';
      if (tc < CRACK_MS) {
        // the cracks: fissures of white fire fan out from the middle, and the air goes red
        const p = ease(tc / CRACK_MS);
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5 * p);
        glow.addColorStop(0, `rgba(255,120,30,${0.55 * p})`); glow.addColorStop(1, 'rgba(120,10,0,0)');
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        for (const c of cracks) {
          const upto = Math.floor(c.length * p) + 1;
          g.beginPath();
          c.slice(0, upto).forEach(([x, y], i) => { const px = cx + x * W * 0.6, py = cy + y * W * 0.6; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); });
          g.shadowColor = '#ff5a00'; g.shadowBlur = 14; g.strokeStyle = '#ffe9b8'; g.lineWidth = 1.6; g.stroke();
          g.shadowBlur = 0;
        }
        raf = requestAnimationFrame(draw); return;
      }
      const p = Math.min(1, (tc - CRACK_MS) / OPEN_MS);
      const r = ease(p) * maxR + 6;
      const pts = edge(r, t);
      const poly = 'polygon(' + pts.map(([x, y]) => `${x}px ${y}px`).join(',') + ')';
      img.style.opacity = '1';
      img.style.clipPath = p >= 1 ? 'none' : poly;
      // the vortex inside the tear: a dark core, red and gold arms turning, fading out as the realm shows through
      const vortex = 1 - ease((p - 0.4) / 0.6);
      if (vortex > 0.01 && p < 1) {
        g.save();
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
        const fill = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        fill.addColorStop(0, `rgba(8,0,0,${0.98 * vortex})`); fill.addColorStop(0.3, `rgba(110,4,0,${0.96 * vortex})`); fill.addColorStop(0.65, `rgba(220,50,0,${0.92 * vortex})`); fill.addColorStop(1, `rgba(255,150,30,${0.88 * vortex})`);
        g.fillStyle = fill; g.fillRect(0, 0, W, H);
        for (let k = 0; k < 7; k++) {
          g.beginPath();
          const base = (k / 7) * Math.PI * 2 + t * 0.0021;
          for (let i = 0; i <= 40; i++) { const f = i / 40, ang = base + f * 3.2, rr = f * r; const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.92; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
          g.strokeStyle = `rgba(255,${150 + k * 12},60,${0.45 * vortex})`; g.lineWidth = 3 + (k % 3); g.stroke();
        }
        g.restore();
      }
      // the torn edge burns
      if (p < 1) {
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
        g.shadowColor = '#ff4a00'; g.shadowBlur = 26; g.strokeStyle = `rgba(255,226,150,${0.95 * (1 - ease((p - 0.8) / 0.2))})`; g.lineWidth = 3.2; g.stroke();
        g.shadowBlur = 0;
        // embers thrown off the edge
        for (let i = 0; i < 4; i++) { const [x, y] = pts[Math.floor(Math.random() * N)]; embers.push({ x, y, vx: (x - cx) / r * (0.6 + Math.random()), vy: (y - cy) / r * (0.6 + Math.random()) - 0.5, life: 1, size: 1 + Math.random() * 2.2 }); }
      }
      for (const e of embers) { e.x += e.vx; e.y += e.vy; e.vy += 0.015; e.life -= 0.018; }
      for (let i = embers.length - 1; i >= 0; i--) if (embers[i].life <= 0) embers.splice(i, 1);
      for (const e of embers) { g.fillStyle = `rgba(255,${120 + Math.floor(e.life * 100)},40,${Math.max(0, e.life)})`; g.beginPath(); g.arc(e.x, e.y, e.size, 0, Math.PI * 2); g.fill(); }
      if (p >= 1 && embers.length === 0) { box.style.transform = ''; g.clearRect(0, 0, W, H); return; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); box.style.transform = ''; };
  }, [loaded, glimpse.before]);

  return (
    <figure className="em-reveal">
      <div className="em-reveal-frame" ref={frame}>
        {glimpse.before && <img className="em-reveal-before" src={glimpse.before} alt="" draggable={false} crossOrigin="anonymous" />}
        <img ref={after} className="em-reveal-after" src={glimpse.url} alt={`${name}, as it might stand in the realm`} draggable={false} onLoad={() => setLoaded(true)} />
        <canvas ref={canvas} className="em-reveal-portal" aria-hidden="true" />
        {glimpse.discovered && <span className="em-discovered-by">DISCOVERED BY {(by ?? 'A TRAVELLER').toUpperCase()}</span>}
      </div>
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
