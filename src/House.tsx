import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Account } from './lib/account';
import { db } from './lib/account';
import {
  COLS, LEVELS, ROOM_DEFS, ROWS, applyBuild, applyDemolish, applyFurnish, applyPlace, buildRecipe, checkIn, newVault, furnishRecipe, furnitureOf, hasDecon, isDoorCell, normalize, roomAt, roomDef, slotsOf, stairOptions, whyNotBuild, whyNotDemolish,
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
/** Where the pieces stand until the owner moves them. */
const DEFAULT_SPOTS: [number, number][] = [[0.22, 0.28], [0.72, 0.24], [0.26, 0.74], [0.74, 0.72], [0.5, 0.5], [0.5, 0.2], [0.2, 0.5], [0.8, 0.5]];
/** How wide each piece is drawn, in the room's own 1024-wide picture. */
const WIDTH: Record<string, number> = {
  bed: 230, couch: 200, table: 230, pooltable: 210, bar: 230, snackbar: 200, seating: 230, dresser: 150, bookshelf: 150, chinacabinet: 150, stove: 160, sinkcabinets: 190, shower: 170, washer: 130,
  corn: 190, tatoes: 190, mutfruit: 190, decon: 150, desk: 170, craftingtable: 190, tv: 140, armchair: 120, statue: 100, plant: 100, lamp: 80, fishtank: 80, coatrack: 110, weaponrack: 120,
  dartboard: 110, easel: 110, dryer: 120, ironingboard: 160, toilet: 100, bathsink: 110, nightstand: 100, instrument: 110, punchbowl: 120, speakers: 160, screen: 170, pinball: 160,
  coffeetable: 150, shoebench: 150, toolchest: 140, armorstand: 110, fridge: 130,
};
const SHORT: Record<string, string> = { entry: 'GATE', stairs: 'STAIR', hallway: 'HALL', garden: 'GARD', study: 'STUDY', living: 'GREAT', dining: 'FEAST', kitchen: 'KITCH', bedroom: 'BED', laundry: 'WASH', bathroom: 'BATH', entertainment: 'BARD', game: 'TAVERN', workshop: 'FORGE' };
const TINT: Record<string, string> = { entry: '#c9a45c', stairs: '#6c7480', hallway: '#4a5058', garden: '#4f7a45', study: '#7a5a8a', living: '#9a6a3a', dining: '#8a4a3a', kitchen: '#a08a4a', bedroom: '#4a6a8a', laundry: '#4a8a8a', bathroom: '#5a8aa0', entertainment: '#a05a7a', game: '#7a7a3a', workshop: '#8a4a2a' };
const NORTHERN = new Set(['NO', 'SE', 'FI', 'DK', 'IS', 'RU', 'EE', 'LV', 'LT', 'CA', 'GL', 'FO']);

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
    return saved === 'nordic' || saved === 'imperial' ? saved : NORTHERN.has(account.profile?.sigilIso ?? '') ? 'nordic' : 'imperial';
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
        <button type="button" className="em-card-x" onClick={() => (room ? setRoomIdx(null) : onClose())} aria-label={room ? 'Back to the floorplan' : 'Close'}>{room ? '‹' : '×'}</button>
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
  const entryIdx = vault.rooms.findIndex((r) => r.type === 'entry');
  const buildable = useMemo(() => {
    const set = new Set<string>();
    if (!decon) return set;
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (roomAt(vault, level, col, row) || isDoorCell(vault, level, col, row)) continue;
      if (ROOM_DEFS.some((d) => d.buildable !== false && whyNotBuild(vault, d.id, level, col, row) === null)) set.add(`${col},${row}`);
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
            <b>{SHORT[r.type] ?? r.type.slice(0, 4).toUpperCase()}</b>
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
      {!decon && (
        <div className="em-house-banner">
          <b>THE HEARTHSTONE IS NOT LIT.</b> The house will not let you build until it is: open the entrance hall and make the Hearthstone.
          {entryIdx >= 0 && <button type="button" className="em-btn" onClick={() => openRoom(entryIdx)}>OPEN THE ENTRANCE HALL</button>}
        </div>
      )}
      <div className="em-levels" role="tablist" aria-label="Levels">
        {Array.from({ length: LEVELS }, (_, l) => (
          <button key={l} type="button" role="tab" aria-selected={level === l} className={level === l ? 'on' : ''} onClick={() => { setLevel(l); setCell(null); }}>{l === 0 ? 'GROUND' : `DOWN ${l}`}<small>{vault.rooms.filter((r) => r.level === l).length}</small></button>
        ))}
      </div>
      <div className="em-plan" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>{cells}</div>
      <p className="em-fine">Tap a room to go in. Tap a + to build next to what you have.</p>
      {cell && <BuildSheet vault={vault} level={level} cell={cell} loot={loot} busy={busy} act={act} done={() => setCell(null)} />}
    </div>
  );
}

function BuildSheet({ vault, level, cell, loot, busy, act, done }: { vault: VaultHome; level: number; cell: { col: number; row: number }; loot: Record<string, number>; busy: boolean; act: (b: Record<string, unknown>) => Promise<boolean>; done: () => void }) {
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
        <div className="em-seg"><button type="button" className={dir === 'down' ? 'on' : ''} onClick={() => setDir('down')}>DOWN</button><button type="button" className={dir === 'up' ? 'on' : ''} onClick={() => setDir('up')}>UP</button></div>
        <div className="em-seg"><button type="button" className={shape === 'straight' ? 'on' : ''} onClick={() => setShape('straight')}>STRAIGHT</button><button type="button" className={shape === 'u' ? 'on' : ''} onClick={() => setShape('u')}>U-TURN</button></div>
        <div className="em-seg">{(['l', 'r', 'b', 'f'] as Face[]).map((f) => <button key={f} type="button" disabled={!faces.includes(f)} className={chosenSide === f ? 'on' : ''} onClick={() => setSide(f)}>{SIDE_NAME[f]}</button>)}</div>
      </div>
    </div>
  );
}

// ---- inside a room ----

function RoomView({ vault, index, room, style, loot, busy, act, onGone }: { vault: VaultHome; index: number; room: VaultRoom; style: Style; loot: Record<string, number>; busy: boolean; act: (b: Record<string, unknown>) => Promise<boolean>; onGone: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ item: string; u: number; v: number } | null>(null);
  const pieces = furnitureOf(room.type);
  const placed = room.furniture;
  const canMove = room.type !== 'hallway';
  const spotOf = (item: string, i: number): { u: number; v: number; swap: boolean } => {
    if (drag && drag.item === item) return { u: drag.u, v: drag.v, swap: !!room.put?.[item]?.swap };
    const p = room.put?.[item];
    if (p) return { u: p.u, v: p.v, swap: !!p.swap };
    const d = room.type === 'hallway' ? [0.5, 0.5] : DEFAULT_SPOTS[i % DEFAULT_SPOTS.length];
    return { u: d[0], v: d[1], swap: false };
  };
  const toFloor = (e: React.PointerEvent): { u: number; v: number } | null => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return null;
    return pixelToFloor(((e.clientX - rect.left) / rect.width) * G.w, ((e.clientY - rect.top) / rect.height) * G.h);
  };
  const whyNo = whyNotDemolish(vault, index);
  const [sure, setSure] = useState(false);

  const order = [...placed].map((item, i) => ({ item, i, y: floorToPixel(spotOf(item, i).u, spotOf(item, i).v).y })).sort((a, b) => a.y - b.y);
  return (
    <div className="em-house-body">
      <div
        className="em-roomstage" ref={stage}
        onPointerMove={(e) => { if (drag) { const f = toFloor(e); if (f) setDrag({ ...drag, ...f }); } }}
        onPointerUp={async (e) => { if (!drag) return; const f = toFloor(e) ?? drag; const item = drag.item; const swap = !!room.put?.[item]?.swap; setDrag(null); await act({ action: 'place', room: index, item, at: { u: f.u, v: f.v, ...(swap ? { swap: true } : {}) } }); }}
      >
        <img className="em-roomart" src={`${BASE}house/${style}/${room.type}.webp`} alt="" draggable={false} />
        {order.map(({ item, i }) => {
          const s = spotOf(item, i);
          const p = floorToPixel(s.u, s.v);
          const w = WIDTH[item] ?? 140;
          return (
            <img
              key={item} className={`em-piece${sel === item ? ' on' : ''}${drag?.item === item ? ' drag' : ''}`} src={`${BASE}house/${style}/f/${item}.webp`} alt={furnitureOf(room.type).find((f) => f.id === item)?.name ?? item} draggable={false}
              style={{ left: `${(p.x / G.w) * 100}%`, top: `${(p.y / G.h) * 100}%`, width: `${(w / G.w) * 100}%`, zIndex: Math.round(p.y), transform: `translate(-50%, -94%)${s.swap ? ' scaleX(-1)' : ''}` }}
              onPointerDown={(e) => { if (!canMove || busy) return; e.preventDefault(); (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId); setSel(item); setDrag({ item, u: s.u, v: s.v }); }}
            />
          );
        })}
      </div>
      {canMove && placed.length > 0 && <p className="em-fine">Drag a piece to put it where you want it. Tap a name below to turn it round.</p>}

      <h3>FURNISHINGS</h3>
      <ul className="em-build-list">
        {pieces.map((f) => {
          const have = placed.some((x) => x === f.id || (f.id === 'instrument' && x === 'instrument'));
          const recipe = furnishRecipe(vault, index, f.id);
          const affordable = canPay(recipe, loot);
          const full = room.type === 'hallway' && room.furniture.length >= 1;
          return (
            <li key={f.id} className={have ? 'em-shop-owned' : ''}>
              <div>
                <b>{f.name.toUpperCase()}</b>
                <small>{have ? 'IN THE ROOM' : full ? 'A HALLWAY HOLDS ONE PIECE' : describe(recipe)}</small>
              </div>
              {have
                ? canMove && <button type="button" className={`em-btn em-btn-ghost${sel === f.id ? ' on' : ''}`} onClick={async () => { setSel(f.id); const cur = room.put?.[f.id] ?? { u: 0.5, v: 0.5 }; await act({ action: 'place', room: index, item: f.id, at: { u: cur.u, v: cur.v, ...(room.put?.[f.id]?.swap ? {} : { swap: true }) } }); }}>TURN</button>
                : <button type="button" className="em-btn" disabled={busy || full || !affordable} onClick={() => void act({ action: 'furnish', room: index, item: f.id })}>{affordable ? 'MAKE' : 'NEED LOOT'}</button>}
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
