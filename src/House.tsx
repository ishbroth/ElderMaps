import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Account } from './lib/account';
import { db } from './lib/account';
import {
  COLS, LEVELS, ROOM_DEFS, ROWS, applyBuild, applyDemolish, applyFurnish, applyPlace, buildRecipe, checkIn, hasWayDown, hasWayUp, newVault, slotOf, INSTRUMENTS, INSTRUMENT_NAMES, furnishRecipe, furnitureOf, hasDecon, isDoorCell, normalize, roomAt, roomDef, slotsOf, stairOptions, whyNotBuild, whyNotDemolish,
  type Face, type LootBag, type RoomType, type StairDir, type StairShape, type VaultHome, type VaultRoom,
} from './lib/house';
import { LOOT } from './lib/loot';

const BASE = import.meta.env.BASE_URL;
/** The painted room is a cutaway of this size, with the floor a diamond in it (see _tools/make-room-template.mjs): furniture is placed by the floor's own coordinates. */
const G = { w: 1024, h: 820, cx: 512, topY: 360, halfW: 400, halfH: 200 };
const floorToPixel = (u: number, v: number) => ({ x: G.cx + (u - v) * G.halfW, y: G.topY + (u + v) * G.halfH });
const pixelToFloor = (x: number, y: number) => {
  const a = (y - G.topY) / G.halfH, b = (x - G.cx) / G.halfW;
  return { u: Math.max(0, Math.min(1, (a + b) / 2)), v: Math.max(0, Math.min(1, (a - b) / 2)) };
};
/** Where each piece stands until the owner moves it: a spot on the floor (u across, v deep), and which back wall it stands against (x: the left one, y: the right one, none: in the open). The same places as in WastelandMaps. */
const SPOT: Record<string, { u: number; v: number; wall?: 'x' | 'y' }> = {
  coatrack: { u: 0.1, v: 0.22, wall: 'x' }, shoebench: { u: 0.1, v: 0.62, wall: 'x' }, decon: { u: 0.72, v: 0.14, wall: 'y' }, couch: { u: 0.5, v: 0.2, wall: 'y' }, tv: { u: 0.1, v: 0.5, wall: 'x' },
  armchair: { u: 0.78, v: 0.62 }, coffeetable: { u: 0.5, v: 0.62 }, table: { u: 0.5, v: 0.5 }, punchbowl: { u: 0.5, v: 0.5 }, chinacabinet: { u: 0.1, v: 0.78, wall: 'x' }, sinkcabinets: { u: 0.5, v: 0.1, wall: 'y' },
  fridge: { u: 0.1, v: 0.35, wall: 'x' }, stove: { u: 0.85, v: 0.1, wall: 'y' }, bed: { u: 0.5, v: 0.5 }, nightstand: { u: 0.88, v: 0.14, wall: 'y' }, dresser: { u: 0.1, v: 0.75, wall: 'x' }, lamp: { u: 0.12, v: 0.2, wall: 'x' },
  toilet: { u: 0.7, v: 0.2, wall: 'y' }, bathsink: { u: 0.25, v: 0.2, wall: 'y' }, shower: { u: 0.78, v: 0.74 }, washer: { u: 0.22, v: 0.2, wall: 'y' }, dryer: { u: 0.62, v: 0.2, wall: 'y' }, ironingboard: { u: 0.78, v: 0.7 },
  seating: { u: 0.5, v: 0.62 }, screen: { u: 0.5, v: 0.06, wall: 'y' }, snackbar: { u: 0.86, v: 0.1, wall: 'y' }, speakers: { u: 0.1, v: 0.3, wall: 'x' }, pooltable: { u: 0.5, v: 0.5 }, bar: { u: 0.5, v: 0.1, wall: 'y' },
  dartboard: { u: 0.3, v: 0.05, wall: 'y' }, pinball: { u: 0.1, v: 0.55, wall: 'x' }, toolchest: { u: 0.1, v: 0.25, wall: 'x' }, armorstand: { u: 0.5, v: 0.55 }, craftingtable: { u: 0.6, v: 0.12, wall: 'y' },
  fishtank: { u: 0.5, v: 0.5 }, weaponrack: { u: 0.5, v: 0.5 }, statue: { u: 0.5, v: 0.5 }, plant: { u: 0.5, v: 0.5 }, corn: { u: 0.27, v: 0.3 }, tatoes: { u: 0.5, v: 0.74 }, mutfruit: { u: 0.74, v: 0.3 },
  bookshelf: { u: 0.1, v: 0.5, wall: 'x' }, desk: { u: 0.5, v: 0.08, wall: 'y' }, guitar: { u: 0.1, v: 0.62, wall: 'x' }, easel: { u: 0.8, v: 0.42 }, instrument: { u: 0.1, v: 0.62, wall: 'x' }, piano: { u: 0.76, v: 0.5 },
  harp: { u: 0.8, v: 0.55 }, drums: { u: 0.8, v: 0.6 },
};
/** The floor is stretched a little so the pieces spread out and do not crowd the middle. */
const stretch = (k: number): number => Math.max(0, Math.min(1, 0.5 + (k - 0.5) * 1.22));
/** How far a piece reaches along its wall (its width on screen, in the room's 1024-pixel picture), as WastelandMaps sizes them against the room, a little under. */
const WIDTH: Record<string, number> = {
  coatrack: 80, shoebench: 120, decon: 120, couch: 190, tv: 130, armchair: 105, coffeetable: 130, table: 215, punchbowl: 110, chinacabinet: 130, sinkcabinets: 210, fridge: 95, stove: 120, bed: 215, nightstand: 78, dresser: 140,
  lamp: 62, toilet: 88, bathsink: 100, shower: 165, washer: 112, dryer: 108, ironingboard: 130, seating: 220, screen: 260, snackbar: 175, speakers: 92, pooltable: 195, bar: 250, dartboard: 100, pinball: 130, toolchest: 125,
  armorstand: 95, craftingtable: 190, fishtank: 70, weaponrack: 105, statue: 90, plant: 90, corn: 165, tatoes: 165, mutfruit: 165, bookshelf: 130, desk: 185, guitar: 92, instrument: 92, piano: 150, harp: 105, drums: 125, easel: 100,
};
const SMALL = new Set(['entry', 'stairs', 'hallway', 'laundry', 'bathroom']);
const SHORT: Record<string, string> = { entry: 'GATE', stairs: 'STAIR', hallway: 'HALL', garden: 'GARD', study: 'STUDY', living: 'GREAT', dining: 'FEAST', kitchen: 'KITCH', bedroom: 'BED', laundry: 'WASH', bathroom: 'BATH', entertainment: 'BARD', game: 'TAVERN', workshop: 'FORGE' };
const TINT: Record<string, string> = { entry: '#c9a45c', stairs: '#6c7480', hallway: '#4a5058', garden: '#4f7a45', study: '#7a5a8a', living: '#9a6a3a', dining: '#8a4a3a', kitchen: '#a08a4a', bedroom: '#4a6a8a', laundry: '#4a8a8a', bathroom: '#5a8aa0', entertainment: '#a05a7a', game: '#7a7a3a', workshop: '#8a4a2a' };

const lootName = (id: string): string => LOOT.find((l) => l.id === id)?.name ?? id;
const describe = (bag: LootBag): string => Object.entries(bag).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${n} ${lootName(k)}`).join(', ');
const canPay = (bag: LootBag, loot: Record<string, number>): boolean => Object.entries(bag).every(([k, n]) => (loot[k] ?? 0) >= (n ?? 0));
const REASONS: Record<string, string> = { no_home: 'Finish making your character first: the house stands in your home city.', stale: 'The house changed somewhere else: it has been reloaded.', loot: 'You do not have the loot for that.' };

type Style = 'nordic' | 'imperial';
interface Answer { ok?: boolean; reason?: string; vault?: VaultHome; version?: number; refund?: LootBag; error?: string }

/** The house: the floorplan of each level, the rooms (painted, with their furniture placed by dragging), and building more of both out of loot. */
export default function House({ account, onClose, local }: { account: Account; onClose: () => void; local?: boolean }) {
  const [vault, setVault] = useState<VaultHome | null>(null);
  /** A house kept in the page alone, with the same rules and no loot needed (the ?housetest page, for trying the screen without an account). */
  const mine = useRef<VaultHome | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [cell, setCell] = useState<{ col: number; row: number } | null>(null);
  const [roomIdx, setRoomIdx] = useState<number | null>(null);
  const [style, setStyle] = useState<Style>(() => {
    const saved = localStorage.getItem('eldermaps:housestyle');
    return saved === 'imperial' ? 'imperial' : 'nordic'; // the northern style to begin with
  });
  const chooseStyle = (s: Style) => { setStyle(s); try { localStorage.setItem('eldermaps:housestyle', s); } catch { /* fine */ } };

  const call = useCallback(async (body: Record<string, unknown>): Promise<Answer> => {
    if (local) {
      const now = Date.now();
      const cur = (mine.current ??= newVault(now, 424242));
      let r: { ok: boolean; vault?: VaultHome; reason?: string } = { ok: false, reason: 'bad_action' };
      if (body.action === 'visit') r = { ok: true, vault: checkIn(cur, now) };
      else if (body.action === 'build') r = applyBuild(checkIn(cur, now), String(body.type) as RoomType, Number(body.level), Number(body.col), Number(body.row), now, body.dir === 'up' ? 'up' : 'down', body.shape === 'u' ? 'u' : 'straight', typeof body.side === 'string' ? (body.side as Face) : undefined);
      else if (body.action === 'furnish') r = applyFurnish(checkIn(cur, now), Number(body.room), String(body.item), now, body.at);
      else if (body.action === 'place') r = applyPlace(cur, Number(body.room), String(body.item), body.at);
      else if (body.action === 'demolish') r = applyDemolish(checkIn(cur, now), Number(body.room), now);
      if (r.ok && r.vault) mine.current = r.vault;
      return r as Answer;
    }
    const { data, error } = await db().functions.invoke('house', { body });
    if (error || !data) return { ok: false, reason: 'The house could not be reached: try again in a moment.' };
    return data as Answer;
  }, [local]);
  const apply = useCallback((a: Answer): boolean => {
    if (a.ok && a.vault) { setVault(normalize(a.vault)); setNote(''); void account.refresh(); return true; }
    if (a.reason === 'stale') void call({ action: 'visit' }).then((r) => { if (r.vault) setVault(normalize(r.vault)); });
    setNote(REASONS[a.reason ?? ''] ?? a.reason ?? 'That did not work.');
    return false;
  }, [account, call]);
  useEffect(() => { void call({ action: 'visit' }).then((a) => { if (!apply(a)) setVault(null); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (body: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    const ok = apply(await call(body));
    setBusy(false);
    return ok;
  };

  // the house opens inside its entrance hall
  const opened = useRef(false);
  useEffect(() => { if (vault && !opened.current) { opened.current = true; const i = vault.rooms.findIndex((r) => r.type === 'entry'); if (i >= 0) setRoomIdx(i); } }, [vault]);
  if (!vault) {
    return (
      <div className="em-house" role="dialog" aria-modal="true" aria-label="Your house">
        <header className="em-house-head"><h2>YOUR HOUSE</h2><button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button></header>
        <p className="em-fine em-house-note">{note || 'OPENING THE DOOR…'}</p>
      </div>
    );
  }

  const room: VaultRoom | null = roomIdx !== null ? vault.rooms[roomIdx] ?? null : null;
  return (
    <div className="em-house" role="dialog" aria-modal="true" aria-label="Your house">
      <header className="em-house-head">
        <h2>{room ? roomDef(room.type).name.toUpperCase() : 'YOUR HOUSE'}</h2>
        <div className="em-seg em-house-style" role="group" aria-label="Style of the rooms">
          <button type="button" className={style === 'nordic' ? 'on' : ''} onClick={() => chooseStyle('nordic')}>NORDIC</button>
          <button type="button" className={style === 'imperial' ? 'on' : ''} onClick={() => chooseStyle('imperial')}>IMPERIAL</button>
        </div>
        <button type="button" className="em-card-x" onClick={() => (room ? setRoomIdx(null) : onClose())} aria-label={room ? 'Back to the floorplan' : 'Close'} title={room ? 'The floorplan: add rooms' : 'Close'}>{room ? 'FLOORPLAN ›' : '×'}</button>
      </header>
      <p className="em-fine em-house-loot">IN YOUR BAG: {describe(account.loot as LootBag) || 'NOTHING YET: CLEAR PLACES AND VISIT THEM IN PERSON'}</p>
      {note && <p className="em-note em-house-note">{note}</p>}

      {room && roomIdx !== null ? (
        <RoomView vault={vault} index={roomIdx} room={room} style={style} loot={account.loot} busy={busy} act={act} onGone={() => setRoomIdx(null)} />
      ) : (
        <Floorplan vault={vault} level={level} setLevel={setLevel} cell={cell} setCell={setCell} loot={account.loot} busy={busy} act={act} openRoom={(i) => { setRoomIdx(i); setCell(null); }} />
      )}
    </div>
  );
}

// ---- the floorplan ----

function Floorplan({ vault, level, setLevel, cell, setCell, loot, busy, act, openRoom }: {
  vault: VaultHome; level: number; setLevel: (l: number) => void; cell: { col: number; row: number } | null; setCell: (c: { col: number; row: number } | null) => void;
  loot: Record<string, number>; busy: boolean; act: (b: Record<string, unknown>) => Promise<boolean>; openRoom: (i: number) => void;
}) {
  const decon = hasDecon(vault);
  // an arrow shows only where a stairwell leads: up to the next floor, or back down (a floor whose stairwell was torn down is left)
  const canUp = hasWayDown(vault, level);
  const canDown = level > 0 && hasWayUp(vault, level);
  useEffect(() => { if (level > 0 && !hasWayUp(vault, level)) setLevel(0); }, [vault, level, setLevel]);
  const entryIdx = vault.rooms.findIndex((r) => r.type === 'entry');
  const buildable = useMemo(() => {
    const set = new Set<string>();
    // (before the Hearthstone is lit, the places that WOULD take a room are still shown: the sheet says why nothing can be built yet)
    const probe = decon ? vault : { ...vault, legacy: true };
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (roomAt(vault, level, col, row) || isDoorCell(vault, level, col, row)) continue;
      if (ROOM_DEFS.some((d) => d.buildable !== false && whyNotBuild(probe, d.id, level, col, row) === null)) set.add(`${col},${row}`);
    }
    return set;
  }, [vault, level, decon]);

  const cells: React.ReactElement[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const r = roomAt(vault, level, col, row);
      if (r) {
        if (r.col !== col) continue; // the second slot of a wide room is drawn by its first
        const idx = vault.rooms.indexOf(r);
        cells.push(
          <button key={`${col},${row}`} type="button" className="em-cell em-cell-room" style={{ gridColumn: `${col + 1} / span ${slotsOf(r)}`, gridRow: row + 1, background: TINT[r.type] ?? '#555' }} onClick={() => openRoom(idx)} title={roomDef(r.type).name}>
            {r.type !== 'entry' && <b>{SHORT[r.type] ?? r.type.slice(0, 4).toUpperCase()}</b>}
            {r.type === 'entry' && <b className="em-door" aria-label="Entrance hall">▭</b>}
            {r.type !== 'stairs' && r.type !== 'hallway' && <small>{r.furniture.length}/{r.type === 'entry' ? furnitureOf(r.type).length : furnitureOf(r.type).length}</small>}
          </button>,
        );
      } else if (buildable.has(`${col},${row}`)) {
        cells.push(<button key={`${col},${row}`} type="button" className={`em-cell em-cell-free${cell && cell.col === col && cell.row === row ? ' on' : ''}`} style={{ gridColumn: col + 1, gridRow: row + 1 }} onClick={() => setCell({ col, row })} aria-label="Build here">+</button>);
      } else cells.push(<span key={`${col},${row}`} className="em-cell em-cell-none" style={{ gridColumn: col + 1, gridRow: row + 1 }} />);
    }
  }

  return (
    <div className="em-house-body">
      {(canUp || canDown || level > 0) && (
        <div className="em-floorbar" role="group" aria-label="Floors">
          {canDown ? <button type="button" className="em-lv" onClick={() => { setLevel(level - 1); setCell(null); }} aria-label="Down one floor">▼</button> : <span className="em-lv-gap" />}
          <span>{level === 0 ? 'GROUND FLOOR' : `FLOOR ${level}`}<i>OF {LEVELS}</i></span>
          {canUp ? <button type="button" className="em-lv" onClick={() => { setLevel(level + 1); setCell(null); }} aria-label="Up one floor">▲</button> : <span className="em-lv-gap" />}
        </div>
      )}
      <div className="em-plan" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>{cells}</div>
      <p className="em-fine">Tap a room to go in. Tap a + to build next to what you have. Build a stairwell to go up: an arrow appears once there is one.</p>
      {cell && <BuildSheet vault={vault} level={level} cell={cell} loot={loot} busy={busy} act={act} done={() => setCell(null)} toHearth={entryIdx >= 0 ? () => openRoom(entryIdx) : undefined} />}
    </div>
  );
}

function BuildSheet({ vault, level, cell, loot, busy, act, done, toHearth }: { toHearth?: () => void; vault: VaultHome; level: number; cell: { col: number; row: number }; loot: Record<string, number>; busy: boolean; act: (b: Record<string, unknown>) => Promise<boolean>; done: () => void }) {
  const [dir, setDir] = useState<StairDir>(level + 1 < LEVELS ? 'down' : 'up');
  const [shape, setShape] = useState<StairShape>('straight');
  const [side, setSide] = useState<Face | null>(null);
  const faces = stairOptions(vault, level, cell.col, cell.row, dir, shape);
  const chosenSide = side && faces.includes(side) ? side : faces[0] ?? null;
  const SIDE_NAME: Record<Face, string> = { l: 'LEFT', r: 'RIGHT', b: 'BACK', f: 'FRONT' };
  return (
    <div className="em-sheet" role="dialog" aria-label="Build a room">
      <button type="button" className="em-card-x" onClick={done} aria-label="Close">×</button>
      <h3>BUILD HERE</h3>
      {!hasDecon(vault) && (
        <div className="em-house-banner">
          <b>THE HEARTHSTONE IS NOT LIT.</b> The house will not let you build until it is: make the Hearthstone in the entrance hall first.
          {toHearth && <button type="button" className="em-btn" onClick={toHearth}>GO TO THE ENTRANCE HALL</button>}
        </div>
      )}
      <ul className="em-build-list">
        {ROOM_DEFS.filter((d) => d.buildable !== false).map((d) => {
          const stairs = d.id === 'stairs';
          const why = whyNotBuild(vault, d.id, level, cell.col, cell.row, stairs ? dir : undefined, stairs ? shape : undefined, stairs ? chosenSide ?? undefined : undefined);
          const recipe = buildRecipe(vault, d.id);
          const affordable = canPay(recipe, loot);
          return (
            <li key={d.id}>
              <div><b>{d.name.toUpperCase()}</b><small>{d.slots > 1 ? `${d.slots} SLOTS · ` : ''}{why ? why : describe(recipe)}</small></div>
              <button type="button" className="em-btn" disabled={!!why || !affordable || busy} title={why ?? (affordable ? '' : 'Not enough loot')}
                onClick={async () => { const ok = await act({ action: 'build', type: d.id, level, col: cell.col, row: cell.row, ...(stairs ? { dir, shape, side: chosenSide } : {}) }); if (ok) done(); }}>
                {why ? '—' : affordable ? 'BUILD' : 'NEED LOOT'}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="em-stair-opts">
        <small>FOR A STAIRWELL:</small>
        <div className="em-seg"><button type="button" className={dir === 'down' ? 'on' : ''} onClick={() => setDir('down')}>UP A FLOOR</button><button type="button" className={dir === 'up' ? 'on' : ''} onClick={() => setDir('up')}>DOWN A FLOOR</button></div>
        <div className="em-seg"><button type="button" className={shape === 'straight' ? 'on' : ''} onClick={() => setShape('straight')}>STRAIGHT</button><button type="button" className={shape === 'u' ? 'on' : ''} onClick={() => setShape('u')}>U-TURN</button></div>
        <div className="em-seg">{(['l', 'r', 'b', 'f'] as Face[]).map((f) => <button key={f} type="button" disabled={!faces.includes(f)} className={chosenSide === f ? 'on' : ''} onClick={() => setSide(f)}>{SIDE_NAME[f]}</button>)}</div>
      </div>
    </div>
  );
}

// ---- inside a room ----

/** The floor space a piece takes, as a square of this side in floor units (0 to 1 of the floor), from how wide it is drawn. */
const sideOf = (item: string, small: boolean): number => ((WIDTH[item] ?? 120) * (small ? 0.86 : 1)) / 1000;
type Placing = { item: string; isNew: boolean; u: number; v: number; swap: boolean };

function RoomView({ vault, index, room, style, loot, busy, act, onGone }: { vault: VaultHome; index: number; room: VaultRoom; style: Style; loot: Record<string, number>; busy: boolean; act: (b: Record<string, unknown>) => Promise<boolean>; onGone: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [inst, setInst] = useState<string>('guitar');
  const [placing, setPlacing] = useState<Placing | null>(null);
  const placingRef = useRef<Placing | null>(null);
  placingRef.current = placing;
  const dragging = useRef<number | null>(null);
  const hold = useRef<{ x: number; y: number; id: number; timer: number; item: string } | null>(null);
  const [say, setSay] = useState('');
  const pieces = furnitureOf(room.type);
  const placed = room.furniture;
  const small = SMALL.has(room.type);
  const canMove = room.type !== 'hallway';

  /** Where a piece stands now: where its owner put it, else its own place in the room (the same spots as in WastelandMaps). */
  const spotOf = (item: string): { u: number; v: number; swap: boolean } => {
    const p = room.put?.[item];
    if (p) return { u: p.u, v: p.v, swap: !!p.swap };
    if (room.type === 'hallway') return { u: 0.5, v: 0.5, swap: false };
    const d = SPOT[item] ?? { u: 0.5, v: 0.5 };
    // a piece that belongs to a wall stands right against it: its back a hair from the wall
    let u = stretch(d.u), v = stretch(d.v);
    if (d.wall === 'x') u = Math.max(u, 0.1);
    if (d.wall === 'y') v = Math.max(v, 0.1);
    return { u, v, swap: false };
  };
  const toFloor = (e: { clientX: number; clientY: number }): { u: number; v: number } | null => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return null;
    // the piece is held by its middle: a little above the finger so the finger does not hide it
    return pixelToFloor(((e.clientX - rect.left) / rect.width) * G.w, ((e.clientY - rect.top) / rect.height) * G.h - 18);
  };
  /** Does a piece fit at this spot: on the floor and not on top of another piece? */
  const fits = (p: Placing): boolean => {
    const s = sideOf(p.item, small) / 2;
    if (p.u - s < -0.02 || p.u + s > 1.02 || p.v - s < -0.02 || p.v + s > 1.02) return false;
    return placed.every((other) => {
      if (other === p.item) return true;
      const o = spotOf(other), os = sideOf(other, small) / 2;
      return Math.abs(p.u - o.u) >= (s + os) * 0.8 || Math.abs(p.v - o.v) >= (s + os) * 0.8;
    });
  };

  const startNew = (item: string) => {
    if (busy || placingRef.current) return;
    const d = spotOf(item);
    setPlacing({ item, isNew: true, u: d.u, v: d.v, swap: d.swap });
    setSay('Drag it where you want it, turn it if you like, then tick it into place. Nothing is spent until you tick.');
  };
  const pickUp = (item: string, pointer: number) => {
    if (busy || placingRef.current || !canMove) return;
    const d = spotOf(item);
    setPlacing({ item, isNew: false, u: d.u, v: d.v, swap: d.swap });
    dragging.current = pointer;
    try { stage.current?.setPointerCapture?.(pointer); } catch { /* the pointer ended */ }
    setSay('Drag it to its new place, then tick it down.');
  };
  const confirm = async () => {
    const p = placingRef.current;
    if (!p || busy) return;
    if (!fits(p)) { setSay('It does not fit there: it is over another piece or off the floor.'); return; }
    const at = { u: p.u, v: p.v, ...(p.swap ? { swap: true } : {}) };
    const ok = await act(p.isNew ? { action: 'furnish', room: index, item: p.item, at } : { action: 'place', room: index, item: p.item, at });
    if (ok) { setPlacing(null); setSay(''); }
  };
  const cancel = () => { setPlacing(null); dragging.current = null; setSay(''); };

  const whyNo = whyNotDemolish(vault, index);
  const [sure, setSure] = useState(false);
  const shown = [...placed.filter((i) => !(placing && !placing.isNew && placing.item === i)), ...(placing ? [placing.item] : [])];
  const at = (item: string): { u: number; v: number; swap: boolean } => (placing && placing.item === item ? placing : spotOf(item));
  const order = shown.map((item) => ({ item, y: floorToPixel(at(item).u, at(item).v).y })).sort((a, b) => a.y - b.y);
  const pp = placing ? floorToPixel(placing.u, placing.v) : null;
  const okNow = placing ? fits(placing) : false;

  return (
    <div className="em-house-body">
      <div
        className="em-roomstage" ref={stage}
        onPointerDown={(e) => { if (placingRef.current) { dragging.current = e.pointerId; try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* the pointer ended */ } const f = toFloor(e); if (f) setPlacing({ ...placingRef.current, ...f }); } }}
        onPointerMove={(e) => {
          if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > 8) { window.clearTimeout(hold.current.timer); hold.current = null; }
          if (dragging.current === e.pointerId && placingRef.current) { const f = toFloor(e); if (f) setPlacing({ ...placingRef.current, ...f }); }
        }}
        onPointerUp={(e) => { if (hold.current) { window.clearTimeout(hold.current.timer); hold.current = null; } if (dragging.current === e.pointerId) dragging.current = null; }}
        onPointerCancel={() => { if (hold.current) window.clearTimeout(hold.current.timer); hold.current = null; dragging.current = null; }}
      >
        <img className="em-roomart" src={`${BASE}house/${style}/${room.type}.webp`} alt="" draggable={false} />
        {placing && pp && (
          <svg className="em-footprint" viewBox={`0 0 ${G.w} ${G.h}`} aria-hidden="true">
            {(() => {
              const s = sideOf(placing.item, small) / 2;
              const c = [floorToPixel(placing.u - s, placing.v - s), floorToPixel(placing.u + s, placing.v - s), floorToPixel(placing.u + s, placing.v + s), floorToPixel(placing.u - s, placing.v + s)];
              return <polygon points={c.map((q) => `${q.x},${q.y}`).join(' ')} fill={okNow ? 'rgba(90,200,120,0.28)' : 'rgba(220,80,70,0.34)'} stroke={okNow ? '#7fe0a0' : '#f08070'} strokeWidth="3" strokeDasharray="10 6" />;
            })()}
          </svg>
        )}
        {order.map(({ item }) => {
          const s = at(item);
          const p = floorToPixel(s.u, s.v);
          const w = (WIDTH[item] ?? 120) * (small ? 0.86 : 1);
          const mine = placing?.item === item;
          return (
            <img
              key={item} className={`em-piece${mine ? ' on' : ''}`} src={`${BASE}house/${style}/f/${item}.webp`} alt={furnitureOf(room.type).find((f) => slotOf(item) === f.id)?.name ?? item} draggable={false}
              style={{ left: `${(p.x / G.w) * 100}%`, top: `${(p.y / G.h) * 100}%`, width: `${(w / G.w) * 100}%`, zIndex: Math.round(p.y) + (mine ? 2000 : 0), transform: `translate(-50%, -70%)${s.swap ? ' scaleX(-1)' : ''}`, opacity: mine ? 0.92 : 1 }}
              onPointerDown={(e) => {
                if (placingRef.current || !canMove || busy) return;
                // a piece already set down is picked up by holding a finger on it
                const pid = e.pointerId; const it = item;
                hold.current = { x: e.clientX, y: e.clientY, id: pid, item: it, timer: window.setTimeout(() => { hold.current = null; pickUp(it, pid); }, 550) };
              }}
            />
          );
        })}
        {placing && pp && (
          <div className="em-placebar" style={{ left: `${Math.min(86, Math.max(14, (pp.x / G.w) * 100))}%`, top: `${Math.min(94, (pp.y / G.h) * 100 + 7)}%` }} onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="em-placebar-x" onClick={cancel} disabled={busy} aria-label="Cancel: nothing is spent" title="Cancel (nothing is spent)">×</button>
            <button type="button" className="em-placebar-turn" onClick={() => setPlacing({ ...placing, swap: !placing.swap })} disabled={busy} aria-label="Turn it" title="Turn it">⟳</button>
            <button type="button" className={`em-placebar-ok${okNow ? '' : ' blocked'}`} onClick={() => void confirm()} disabled={busy} aria-label="Set it down" title="Set it down">✓</button>
          </div>
        )}
      </div>
      {say ? <p className="em-fine">{say}</p> : canMove && placed.length > 0 ? <p className="em-fine">Hold a finger on a piece to pick it up and move it.</p> : null}

      <h3>FURNISHINGS</h3>
      <ul className="em-build-list">
        {pieces.map((f) => {
          const placedItem = placed.find((x) => slotOf(x) === f.id);
          const have = !!placedItem;
          const makeItem = f.id === 'instrument' ? inst : f.id;
          const recipe = furnishRecipe(vault, index, makeItem);
          const affordable = canPay(recipe, loot);
          const full = room.type === 'hallway' && room.furniture.length >= 1;
          const name = placedItem && f.id === 'instrument' ? INSTRUMENT_NAMES[placedItem] ?? f.name : f.name;
          return (
            <li key={f.id} className={have ? 'em-shop-owned' : ''}>
              <div>
                <b>{name.toUpperCase()}</b>
                <small>{have ? 'IN THE ROOM' : full ? 'A HALLWAY HOLDS ONE PIECE' : describe(recipe)}</small>
                {!have && f.id === 'instrument' && (
                  <div className="em-seg em-inst">{INSTRUMENTS.map((k) => <button key={k} type="button" className={inst === k ? 'on' : ''} onClick={() => setInst(k)}>{INSTRUMENT_NAMES[k].toUpperCase()}</button>)}</div>
                )}
              </div>
              {!have && (
                room.type === 'hallway'
                  ? <button type="button" className="em-btn" disabled={busy || full || !affordable} onClick={() => void act({ action: 'furnish', room: index, item: makeItem })}>{affordable ? 'MAKE' : 'NEED LOOT'}</button>
                  : <button type="button" className="em-btn" disabled={busy || full || !affordable || !!placing} onClick={() => startNew(makeItem)}>{affordable ? 'MAKE' : 'NEED LOOT'}</button>
              )}
            </li>
          );
        })}
      </ul>

      {room.type !== 'entry' && (
        <div className="em-house-demolish">
          {!sure
            ? <button type="button" className="em-btn em-btn-ghost em-danger" disabled={!!whyNo || busy} title={whyNo ?? ''} onClick={() => setSure(true)}>{whyNo ? `CANNOT TEAR DOWN: ${whyNo.toUpperCase()}` : 'TEAR THIS ROOM DOWN'}</button>
            : <>
                <p className="em-fine">Half of what it cost comes back, picked at random. The furniture goes with it.</p>
                <div className="em-card-buttons">
                  <button type="button" className="em-btn em-danger" disabled={busy} onClick={async () => { const ok = await act({ action: 'demolish', room: index }); if (ok) onGone(); setSure(false); }}>TEAR IT DOWN</button>
                  <button type="button" className="em-btn em-btn-ghost" onClick={() => setSure(false)}>KEEP IT</button>
                </div>
              </>}
        </div>
      )}
    </div>
  );
}

/** The house with a made-up bag of loot and no server (dev page: ?housetest). */
export function HouseTest({ onClose }: { onClose: () => void }) {
  const account = { loot: Object.fromEntries(['wood', 'stone', 'leather', 'iron', 'dwarven', 'gold', 'ebony'].map((k) => [k, 99])), refresh: async () => undefined, profile: { sigilIso: 'US' } } as unknown as Account;
  return <House account={account} onClose={onClose} local />;
}

export type { RoomType };
