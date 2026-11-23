import { useEffect, useState } from 'react';
import { buyItem, loadShop, type ShopItem, type ShopState } from './lib/shop';
import { LOOT, REGIONAL_HERBS } from './lib/loot';
import { CLASS_NAME, type ItemCls } from './lib/combat/data';

const nameOf = (id: string): string => LOOT.find((l) => l.id === id)?.name ?? REGIONAL_HERBS.find((h) => h.loot.id === id)?.loot.name ?? id;
const GROUPS: { title: string; classes: string[] }[] = [
  { title: 'ONE-HANDED', classes: ['onehand'] }, { title: 'TWO-HANDED', classes: ['twohand'] }, { title: 'BOW', classes: ['bow'] },
  { title: 'MAGIC', classes: ['shock', 'frost', 'fire', 'drain'] },
];

/** The forge and the alchemist: what the loot in the bag buys. */
export default function Shop({ onClose, onBought }: { onClose: () => void; onBought: () => void }) {
  const [state, setState] = useState<ShopState | null>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { void loadShop().then((s) => setState(s ?? null)); }, []);

  const buy = async (item: ShopItem) => {
    setBusy(item.id); setNote('');
    const r = await buyItem(item.id);
    setBusy('');
    if (r === 'ok') { setState(await loadShop()); onBought(); }
    else setNote(r === 'cannot_pay' ? 'NOT ENOUGH LOOT' : r === 'owned' ? 'YOU HAVE THAT ALREADY' : r === 'need_previous' ? 'BUY THE EARLIER ONE FIRST' : 'THAT DID NOT GO THROUGH: NOTHING WAS TAKEN');
  };
  const cost = (it: ShopItem) => [...Object.entries(it.cost).map(([k, v]) => `${v} ${nameOf(k)}`), ...(it.herbs ? [`${it.herbs} of any herbs`] : [])].join(', ') || 'FREE';
  const row = (it: ShopItem) => (
    <li key={it.id} className={it.owned ? 'em-shop-owned' : ''}>
      <span><b>{it.name.toUpperCase()}</b>{it.tier ? <i> TIER {it.tier}</i> : null}<small>{it.owned ? 'YOURS' : cost(it)}</small></span>
      {!it.owned && <button type="button" className="em-btn" disabled={!it.canBuy || busy === it.id} onClick={() => void buy(it)}>{busy === it.id ? '…' : it.locked ? 'LOCKED' : 'MAKE'}</button>}
    </li>
  );

  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label="The forge and the alchemist" onClick={onClose}>
      <article className="em-scene em-shop" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>
        <h2>FORGE & ALCHEMIST</h2>
        {!state && <p className="em-fine">OPENING THE SHOP…</p>}
        {state && (
          <>
            <p className="em-fine">IN YOUR BAG: {Object.entries(state.loot).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${nameOf(k).toUpperCase()}`).join(' · ') || 'NOTHING YET: CLEAR PLACES AND VISIT THEM'}</p>
            <p className="em-fine">POTIONS {state.pack.potions} · SHOUTS {state.pack.shouts}{state.pack.dual ? ' · BOTH HANDS' : ''}</p>
            {note && <p className="em-note">{note}</p>}
            <div className="em-shop-list">
              {GROUPS.map((g) => (
                <section key={g.title}>
                  <h3>{g.title}</h3>
                  {g.classes.map((c) => (
                    <div key={c}>
                      {g.classes.length > 1 && <h4>{CLASS_NAME[c as ItemCls]}</h4>}
                      <ul>{state.items.filter((i) => i.cls === c).map(row)}</ul>
                    </div>
                  ))}
                </section>
              ))}
              <section><h3>ALCHEMY</h3><ul>{state.items.filter((i) => i.kind === 'potion' || i.kind === 'shout').map(row)}</ul></section>
              <section><h3>BOTH HANDS</h3><p className="em-fine">Hold magic in one hand and a weapon in the other, or two spells, or two one-handed weapons.</p><ul>{state.items.filter((i) => i.kind === 'dual').map(row)}</ul></section>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
