import { useEffect, useRef, useState } from 'react';
import { glimpseCost, hasTownLegend, sceneFor } from './lib/scenes';
import { KIND_TITLE, type Province } from './lib/lore';
import { GLIMPSE_MESSAGES, requestGlimpse, type Glimpse } from './lib/glimpse';
import CombatScreen from './CombatScreen';
import { finishRun, startRun, type RunStart } from './lib/clear';
import { STARTING_ARSENAL, planFor, worthFor } from './lib/combat/data';
import { LOOT, REGIONAL_HERBS } from './lib/loot';

interface Props {
  spot: { id: string; name: string; real: string; kind: string; note: string; lat: number; lng: number };
  province: Province;
  icon: string;
  signedIn: boolean;
  /** Said when a button that needs an account (or something not built yet) is pressed. */
  onNeedsAccount: (what: string) => void;
  /** A glimpse was paid for: the balance has changed. */
  onSpent: () => void;
  /** Opens the Town Legend of the city this place belongs to. */
  onTownLegend: () => void;
  onTravel: () => void;
  onClose: () => void;
}

/** The scene of a place: its story, the glimpse (the paid picture of it, arriving on a wave out of the real photograph) and, for a city, the Town Legend. */
export default function SceneView({ spot, province, icon, signedIn, onNeedsAccount, onSpent, onTownLegend, onTravel, onClose }: Props) {
  const lines = sceneFor(spot.name, spot.kind, province.id);
  const cost = glimpseCost(spot.kind);
  const [state, setState] = useState<'idle' | 'working' | 'ready'>('idle');
  const [glimpse, setGlimpse] = useState<Glimpse | null>(null);
  const [problem, setProblem] = useState('');
  // clearing the place: the fight, and what it paid
  const [run, setRun] = useState<RunStart | null>(null);
  const [paidLine, setPaidLine] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const look = async () => {
    if (!signedIn) { onNeedsAccount('A GLIMPSE'); return; }
    setProblem(''); setState('working');
    // it can take a minute the first time anyone looks at a place: asking again is free
    for (let attempt = 0; attempt < 40 && alive.current; attempt++) {
      const r = await requestGlimpse({ id: spot.id, name: spot.name, kind: spot.kind, lat: spot.lat, lng: spot.lng, province: province.id });
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
      <article className="em-scene" style={{ ['--prov' as string]: province.ink }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>
        {state === 'ready' && glimpse ? (
          <Reveal glimpse={glimpse} name={spot.name} />
        ) : (
          <>
            <div className="em-card-icon" dangerouslySetInnerHTML={{ __html: icon }} />
            <h2>{spot.name}</h2>
            <p className="em-card-kind">{KIND_TITLE[spot.kind] ?? spot.kind}</p>
            <div className="em-scene-lore">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
          </>
        )}
        {state === 'working' && <p className="em-fine em-wave-note">THE RIFT OPENS… A MOMENT</p>}
        {paidLine && <p className="em-fine">{paidLine}</p>}
        {run && glimpse && (
          <CombatScreen title={spot.name} imageUrl={glimpse.url} plan={planFor(spot.id, spot.kind, worth, province.id)} spawns={{ horizon: 0.56, points: [], buildingM: 20 }} arsenal={STARTING_ARSENAL} level={0} potions={run.pack.potions} shouts={run.pack.shouts}
            onDone={async (res) => {
              const end = await finishRun(run.runId, res.won, province.id, spot.kind, res.potionsUsed, res.shoutsUsed);
              if (res.won && end?.loot) setPaidLine(`${end.paid ? 'LOOT: ' : 'HELD UNTIL YOU VISIT IN PERSON: '}${Object.entries(end.loot).map(([id, n]) => `${n} ${lootName(id).toUpperCase()}`).join(', ')}`);
            }}
            onExit={() => setRun(null)} />
        )}
        {problem && <p className="em-note">{problem}</p>}
        <div className="em-card-buttons">
          {state !== 'ready' && (
            <button type="button" className="em-btn" disabled={state === 'working'} onClick={() => void look()} title="See this place as it might stand in the realm">
              {state === 'working' ? 'GLIMPSING…' : <>GLIMPSE · {cost} SEPTIMS <span aria-hidden="true">🔒</span></>}
            </button>
          )}
          {state === 'ready' && <button type="button" className="em-btn" onClick={() => void clearOut()}>CLEAR THE AREA</button>}
          {state === 'ready' && <button type="button" className="em-btn em-btn-ghost" onClick={() => setState('idle')}>THE STORY</button>}
          {hasTownLegend(spot.kind) && state !== 'ready' && (
            <button type="button" className="em-btn em-btn-ghost" onClick={onTownLegend} title="The whole city map, with every place travellers have glimpsed">TOWN LEGEND</button>
          )}
          <button type="button" className="em-btn em-btn-ghost" onClick={onTravel}>FAST TRAVEL</button>
        </div>
      </article>
    </div>
  );
}

/** The picture arriving: a wave of light rolls out from the middle, and the real photograph of the place dissolves into the realm's version of it. */
function Reveal({ glimpse, name }: { glimpse: Glimpse; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const by = glimpse.discovered?.by;
  return (
    <figure className={`em-reveal${loaded ? ' go' : ''}`}>
      <div className="em-reveal-frame">
        {glimpse.before && <img className="em-reveal-before" src={glimpse.before} alt="" draggable={false} crossOrigin="anonymous" />}
        <img className="em-reveal-after" src={glimpse.url} alt={`${name}, as it might stand in the realm`} draggable={false} onLoad={() => setLoaded(true)} />
        <span className="em-reveal-wave" aria-hidden="true" />
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
