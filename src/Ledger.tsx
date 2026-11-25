import Coin from './Coin';
import { useMemo, useState } from 'react';
import type { Spot } from './App';
import { CHARACTER_TYPES, deleteAccount, type Account } from './lib/account';
import { levelInfo } from './lib/points';
import { ShopBody } from './Shop';
import { Emblem, Quill } from './Sigil';
import { voiceAvailable } from './lib/voice';
import { hapticsAvailable } from './lib/haptics';
import { glyph, glyphForCategory } from './lib/glyphs';
import { crestSvg } from './lib/crests';
import { kindTitle } from './lib/lore';
import { LOOT, REGIONAL_HERBS } from './lib/loot';

type Tab = 'places' | 'inventory' | 'herald';

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
  /** The search for a city, a keep or a waterfall (it sits above the tabs, off the map). */
  query: string;
  onQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  /** AUTO-DISCOVER: following where the phone is and finding places as they are reached. */
  following: boolean;
  onToggleFollow: () => void;
  voiceOn: boolean;
  onToggleVoice: () => void;
  hapticsOn: boolean;
  onToggleHaptics: () => void;
  /** Takes the large map to a city. */
  onTryCity: (c: { name: string; lat: number; lng: number }) => void;
  onHouse: () => void;
  /** The sigil city under its realm name (the real name is never shown). */
  originName: string | null;
}

/** A few well-known cities to try, as in WastelandMaps: each takes the map there. */
const TRY_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Savannah', lat: 32.08, lng: -81.09 }, { name: 'Kuala Lumpur', lat: 3.14, lng: 101.69 }, { name: 'St. Louis', lat: 38.63, lng: -90.2 }, { name: 'Paris', lat: 48.86, lng: 2.35 },
  { name: 'Seattle', lat: 47.61, lng: -122.33 }, { name: 'Edinburgh', lat: 55.95, lng: -3.19 }, { name: 'Cairo', lat: 30.04, lng: 31.24 }, { name: 'Kyoto', lat: 35.01, lng: 135.77 },
  { name: 'Istanbul', lat: 41.01, lng: 28.98 }, { name: 'Rome', lat: 41.9, lng: 12.5 }, { name: 'Oslo', lat: 59.91, lng: 10.75 }, { name: 'New Orleans', lat: 29.95, lng: -90.07 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 }, { name: 'Lisbon', lat: 38.72, lng: -9.14 }, { name: 'Prague', lat: 50.08, lng: 14.44 }, { name: 'Anchorage', lat: 61.22, lng: -149.9 },
];

const lootName = (id: string): string => LOOT.find((l) => l.id === id)?.name ?? REGIONAL_HERBS.find((h) => h.loot.id === id)?.loot.name ?? id;
const iconOf = (s: Spot): string => (s.kind === 'crest' ? crestSvg(s.real, s.iso2, true) : glyph(s.pic ?? (s.kind === 'landmark' ? glyphForCategory(s.note) : s.kind), true));

/** The privacy and support pages (shown signed in or not). */
function Legal() {
  const base = import.meta.env.BASE_URL;
  return <p className="em-fine em-legal"><a href={base + 'privacy.html'} target="_blank" rel="noreferrer">Privacy policy</a> · <a href={base + 'support.html'} target="_blank" rel="noreferrer">Support</a></p>;
}

/** Deleting the account: the word DELETE and the serf number, then everything is gone. */
function DeleteLine({ onDeleted }: { onDeleted: () => void }) {
  const [asking, setAsking] = useState(false);
  const [word, setWord] = useState('');
  const [serf, setSerf] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  if (!asking) return <p className="em-delete-line"><button type="button" onClick={() => setAsking(true)}>Delete my account</button></p>;
  return (
    <div className="em-delete" role="alertdialog" aria-label="Delete my account">
      <p><b>Delete your account?</b> Everything is lost for good: your character, level, septims, loot, weapons, the places you have found and your house.</p>
      <label className="em-field">TYPE DELETE<input value={word} autoComplete="off" onChange={(e) => setWord(e.target.value)} /></label>
      <label className="em-field">YOUR SERF NUMBER<input value={serf} inputMode="numeric" maxLength={4} onChange={(e) => setSerf(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
      {note && <p className="em-note">{note}</p>}
      <div className="em-card-buttons">
        <button type="button" className="em-btn em-danger" disabled={busy || word !== 'DELETE' || serf.length !== 4} onClick={async () => { setBusy(true); const r = await deleteAccount(serf); setBusy(false); if (r) setNote(r); else onDeleted(); }}>{busy ? 'DELETING…' : 'DELETE FOREVER'}</button>
        <button type="button" className="em-btn em-btn-ghost" disabled={busy} onClick={() => { setAsking(false); setNote(''); }}>CANCEL</button>
      </div>
    </div>
  );
}

/** The Wayfarer's Ledger: the places found, the traveller's record and what can be shared (the twin of WastelandMaps' Locations, Data and Share tabs). */
export default function Ledger({ account, found, cleared, selected, onOpenSpot, onAccount, onBuy, onShareMap, query: placeQuery, onQuery, onSearch, following, onToggleFollow, voiceOn, onToggleVoice, hapticsOn, onToggleHaptics, onTryCity, onHouse, originName }: Props) {
  const [tab, setTab] = useState<Tab>('places');
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState<'all' | 'cleared'>('all');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...found].reverse().filter((s) => (only === 'all' || cleared.has(s.id)) && (!q || s.name.toLowerCase().includes(q) || s.real.toLowerCase().includes(q)));
  }, [found, cleared, query, only]);
  const type = CHARACTER_TYPES.find((c) => c.id === account.profile?.characterType);
  const loot = Object.entries(account.loot).filter(([, n]) => n > 0);
  const level = levelInfo(account.points);

  return (
    <aside className="em-ledger" aria-label="The ledger">
      <form className="em-ledger-search" onSubmit={onSearch}>
        <input value={placeQuery} onChange={(e) => onQuery(e.target.value)} placeholder="Seek a city, a keep, a waterfall…" aria-label="Search for a place" />
        <button type="submit" aria-label="Search">⌕</button>
      </form>
      <div className="em-ledger-switches">
        <button type="button" className={'em-switch-wide' + (following ? ' on' : '')} aria-pressed={following} onClick={onToggleFollow} title="Find places as you walk, drive or ride">{following ? '◉ AUTO-DISCOVER ON' : '○ AUTO-DISCOVER OFF'}</button>
        {voiceAvailable() && <button type="button" className={'em-switch' + (voiceOn ? ' on' : '')} aria-pressed={voiceOn} aria-label={voiceOn ? 'Mute the road\'s voice' : 'Unmute the road\'s voice'} title={voiceOn ? 'Mute the voice' : 'Unmute the voice'} onClick={onToggleVoice}>{voiceOn ? '♪' : '♪̸'}</button>}
        {hapticsAvailable() && <button type="button" className={'em-switch' + (hapticsOn ? ' on' : '')} aria-pressed={hapticsOn} aria-label={hapticsOn ? 'Turn the buzz off' : 'Turn the buzz on'} title={hapticsOn ? 'Buzz on' : 'Buzz off'} onClick={onToggleHaptics}>{hapticsOn ? '≋' : '—'}</button>}
      </div>
      <div className="em-try">
        <span>TRY</span>
        <div className="em-try-row">{TRY_CITIES.map((c) => <button key={c.name} type="button" onClick={() => onTryCity(c)}>{c.name}</button>)}</div>
      </div>
      <div className="em-ledger-tabs" role="tablist">
        {([['places', 'PLACES'], ['inventory', 'INVENTORY'], ['herald', 'HERALD']] as [Tab, string][]).map(([id, label]) => (
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
                    <span className="em-ledger-name"><b>{s.name}</b><small>{kindTitle(s.kind, s.province, s.real)}{cleared.has(s.id) ? ' · [Cleared]' : ''}</small></span>
                  </button>
                </li>
              ))}
            </ul>
            {found.length > 0 && list.length === 0 && <p className="em-fine">None of your places match.</p>}
          </>
        )}

        {tab === 'inventory' && (
          account.session ? (
            <div className="em-record">
              <div className="em-level">
                <div className="em-level-head"><b>LEVEL {level.level}</b><span>{level.into} / {level.needed} XP</span></div>
                <div className="em-level-bar" role="progressbar" aria-valuemin={0} aria-valuemax={level.needed} aria-valuenow={level.into} aria-label={'Progress to level ' + (level.level + 1)}><div style={{ width: Math.min(100, Math.round((level.into / level.needed) * 100)) + '%' }} /></div>
                <p className="em-fine">{level.toGo} XP to level {level.level + 1}</p>
              </div>
              <div className="em-record-who">
                <Emblem type={account.profile?.characterType ?? null} sex={account.profile?.characterSex ?? null} city={account.profile?.sigilCity ?? null} iso={account.profile?.sigilIso ?? null} size={40} />
                <div><b>{account.profile?.characterName ?? 'TRAVELLER'}</b><small>{type?.name.toUpperCase() ?? ''} · {account.email}</small></div>
                <button type="button" className="em-quill" aria-label="Edit your character" title="Edit" onClick={onAccount}><Quill size={20} /></button>
                <button type="button" className="em-btn em-btn-ghost em-small" onClick={() => void account.signOut()}>SIGN OUT</button>
              </div>
              <p className="em-fine em-origin"><b>ORIGIN</b> {originName ?? 'not chosen'}</p>
              <p className="em-fine em-origin"><b>DOMICILE</b> {account.home?.address ?? 'none yet: glimpse the place you live and make it your hearth'}</p>
              <p className="em-septims"><Coin size={20} /> {account.septims.toLocaleString('en-US')}</p>
              <div className="em-card-buttons"><button type="button" className="em-btn" onClick={onBuy}>EXCHANGE TENDER</button></div>
              <div className="em-card-buttons"><button type="button" className="em-btn" onClick={onHouse}>YOUR HOUSE</button></div>
              <h4>LOOT</h4>
              <p className="em-fine">{loot.length ? loot.map(([id, n]) => n + ' ' + lootName(id).toUpperCase()).join(' · ') : 'Nothing yet: clear places, then visit them in person.'}</p>
              <h4>FORGE & ALCHEMIST</h4>
              <ShopBody onBought={() => void account.refresh()} />
              <Legal />
              <DeleteLine onDeleted={() => void account.refresh()} />
            </div>
          ) : (
            <div className="em-record"><p className="em-fine">Sign in to keep your inventory: your character, level, septims, loot and every place you have found.</p><button type="button" className="em-btn" onClick={onAccount}>ENTER THE REALM</button><Legal /></div>
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
            <Legal />
          </div>
        )}
      </div>
    </aside>
  );
}
