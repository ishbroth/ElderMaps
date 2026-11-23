import { useMemo, useState } from 'react';
import type { Spot } from './App';
import { CHARACTER_TYPES, type Account } from './lib/account';
import { glyph, glyphForCategory } from './lib/glyphs';
import { crestSvg } from './lib/crests';
import { KIND_TITLE } from './lib/lore';
import { LOOT, REGIONAL_HERBS } from './lib/loot';

type Tab = 'places' | 'record' | 'herald';

interface Props {
  account: Account;
  /** The places discovered, newest last, as marks the map can open. */
  found: Spot[];
  cleared: Set<string>;
  /** The place whose card is open on the map, for the Herald to share. */
  selected: Spot | null;
  onOpenSpot: (s: Spot) => void;
  onAccount: () => void;
  onShop: () => void;
  onBuy: () => void;
  /** Shares a link to where the map is now. */
  onShareMap: () => void;
}

const lootName = (id: string): string => LOOT.find((l) => l.id === id)?.name ?? REGIONAL_HERBS.find((h) => h.loot.id === id)?.loot.name ?? id;
const iconOf = (s: Spot): string => (s.kind === 'crest' ? crestSvg(s.real, s.iso2, true) : glyph(s.pic ?? (s.kind === 'landmark' ? glyphForCategory(s.note) : s.kind), true));

/** The Wayfarer's Ledger: the places found, the traveller's record and what can be shared (the twin of WastelandMaps' Locations, Data and Share tabs). */
export default function Ledger({ account, found, cleared, selected, onOpenSpot, onAccount, onShop, onBuy, onShareMap }: Props) {
  const [tab, setTab] = useState<Tab>('places');
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState<'all' | 'cleared'>('all');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...found].reverse().filter((s) => (only === 'all' || cleared.has(s.id)) && (!q || s.name.toLowerCase().includes(q) || s.real.toLowerCase().includes(q)));
  }, [found, cleared, query, only]);
  const type = CHARACTER_TYPES.find((c) => c.id === account.profile?.characterType);
  const loot = Object.entries(account.loot).filter(([, n]) => n > 0);

  return (
    <aside className="em-ledger" aria-label="The ledger">
      <div className="em-ledger-tabs" role="tablist">
        {([['places', 'PLACES'], ['record', 'RECORD'], ['herald', 'HERALD']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="em-ledger-body">
        {tab === 'places' && (
          <>
            <div className="em-ledger-tools">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find among your places" aria-label="Find among your places" />
              <button type="button" className={only === 'cleared' ? 'on' : ''} onClick={() => setOnly(only === 'all' ? 'cleared' : 'all')}>{only === 'cleared' ? 'CLEARED' : 'ALL'}</button>
            </div>
            {found.length === 0 && <p className="em-fine">Nothing found yet. Walk to a place on the map (turn on ME) and it is yours, with its story and a glimpse to buy.</p>}
            <ul className="em-ledger-list">
              {list.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onOpenSpot(s)}>
                    <span className="em-ledger-ico" dangerouslySetInnerHTML={{ __html: iconOf(s) }} />
                    <span className="em-ledger-name"><b>{s.name}</b><small>{KIND_TITLE[s.kind] ?? s.kind}{cleared.has(s.id) ? ' · [Cleared]' : ''}</small></span>
                  </button>
                </li>
              ))}
            </ul>
            {found.length > 0 && list.length === 0 && <p className="em-fine">None of your places match.</p>}
          </>
        )}

        {tab === 'record' && (
          account.session ? (
            <div className="em-record">
              <div className="em-record-who">
                {account.profile?.characterType && <img src={`${import.meta.env.BASE_URL}portraits/${account.profile.characterType}${account.profile.characterSex === 'f' ? '-f' : ''}.jpg`} alt="" />}
                <div><b>{account.profile?.characterName ?? 'TRAVELLER'}</b><small>{type?.name.toUpperCase() ?? ''}</small></div>
              </div>
              <p className="em-septims">{account.septims.toLocaleString('en-US')} SEPTIMS</p>
              <dl className="em-record-stats">
                <div><dt>DISCOVERED</dt><dd>{found.length}</dd></div>
                <div><dt>CLEARED</dt><dd>{cleared.size}</dd></div>
                <div><dt>POTIONS</dt><dd>{account.pack.potions}</dd></div>
                <div><dt>SHOUTS</dt><dd>{account.pack.shouts}</dd></div>
              </dl>
              <h4>IN YOUR BAG</h4>
              <p className="em-fine">{loot.length ? loot.map(([id, n]) => `${n} ${lootName(id).toUpperCase()}`).join(' · ') : 'Nothing yet: clear places, then visit them in person.'}</p>
              <div className="em-card-buttons"><button type="button" className="em-btn" onClick={onShop}>FORGE & ALCHEMIST</button><button type="button" className="em-btn em-btn-ghost" onClick={onBuy}>BUY SEPTIMS</button></div>
              <p className="em-fine">HOME: {account.home?.address ?? 'not set'}</p>
              <button type="button" className="em-btn em-btn-ghost" onClick={onAccount}>YOUR ACCOUNT</button>
            </div>
          ) : (
            <div className="em-record"><p className="em-fine">Sign in to keep a record: your character, septims, loot and every place you have found.</p><button type="button" className="em-btn" onClick={onAccount}>ENTER THE REALM</button></div>
          )
        )}

        {tab === 'herald' && (
          <div className="em-record">
            <p className="em-fine">Share the realm with a friend.</p>
            <button type="button" className="em-btn" onClick={onShareMap}>SHARE THIS VIEW OF THE MAP</button>
            {selected && (
              <button type="button" className="em-btn em-btn-ghost" onClick={() => {
                const url = `${window.location.origin}/?at=${selected.lat.toFixed(4)},${selected.lng.toFixed(4)},11`;
                const text = `${selected.name} in ElderMaps`;
                if (navigator.share) void navigator.share({ title: text, text, url }).catch(() => undefined);
                else void navigator.clipboard?.writeText(url);
              }}>SHARE {selected.name.toUpperCase().slice(0, 24)}</button>
            )}
            <p className="em-fine">A shared link opens the map on the same view. The pictures people glimpse are theirs to share from the picture itself.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
