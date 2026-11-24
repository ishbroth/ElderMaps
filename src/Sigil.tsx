import { useEffect, useMemo, useState } from 'react';
import { crestSvg, loadCrests } from './lib/crests';
import { distanceMeters } from './lib/geo';
import { findPlace } from './lib/google';
import { loreName } from './lib/lore';
import { loadWorld, type City, type World } from './lib/world';

export interface SigilChoice { city: string; iso: string }

/** A quill: the edit mark used all over the realm in place of a pencil. */
export function Quill({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.6 2.4C14.4 2.9 9.6 6 7.6 11.2c-.6 1.6-.8 3.2-.7 4.6L3 21.2l.9.7 3.9-4.6c1.3.1 2.8-.1 4.4-.7 4.7-1.9 7.7-6.6 8.4-13.4Zm-5 4.6c-2.4 1.3-4.6 3.5-6.1 6.1.3-1.5.9-2.9 1.9-4.1C12.5 7.7 14 7 15.6 7Z" />
    </svg>
  );
}

/** A person's mark beside their name: the head of their character first, then their city's shield (used on the leaderboard and in the data tab). */
export function Emblem({ type, sex, city, iso, size = 28 }: { type: string | null; sex: 'm' | 'f' | null; city: string | null; iso: string | null; size?: number }) {
  return (
    <span className="em-emblem" style={{ height: size }}>
      {type && <img className="em-emblem-head" src={`${import.meta.env.BASE_URL}portraits/${type}${sex === 'f' ? '-f' : ''}.jpg`} alt="" style={{ width: size, height: size }} />}
      {city && <span className="em-emblem-shield" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: crestSvg(city, iso ?? '', true) }} />}
    </span>
  );
}

const keyOf = (c: City): string => `${c[0]}|${c[5]}`;

/** Choosing a sigil: swipe through the shields of the great cities, or type your own city to be given its shield (or the nearest great city's). */
export default function SigilPicker({ value, onChange }: { value: SigilChoice | null; onChange: (c: SigilChoice) => void }) {
  const [world, setWorld] = useState<World | null>(null);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void Promise.all([loadWorld(), loadCrests()]).then(([w]) => setWorld(w)); }, []);
  const cities = world?.cities.crest ?? [];
  const chosen = useMemo(() => cities.find((c) => value && c[0] === value.city && c[5] === value.iso) ?? null, [cities, value]);
  const shown = (c: City): string => (world ? loreName(c[0], world.provinceOfCountry(c[5])) : c[0]);

  const search = async () => {
    if (!world || query.trim().length < 2) return;
    setBusy(true); setNote('');
    const found = await findPlace(query.trim()).catch(() => null);
    setBusy(false);
    if (!found) { setNote('No such place was found. Try the town and country.'); return; }
    let best: City | null = null, bestD = Infinity;
    for (const c of cities) { const d = distanceMeters(found.center, { lat: c[1], lng: c[2] }); if (d < bestD) { bestD = d; best = c; } }
    if (!best) return;
    onChange({ city: best[0], iso: best[5] });
    setNote(bestD < 40_000 ? `${shown(best)} is your city.` : `The nearest great city is ${shown(best)}, about ${Math.round(bestD / 1000)} km away.`);
    document.getElementById(`sigil-${keyOf(best)}`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  return (
    <div className="em-sigil">
      <div className="em-sigil-search">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }} placeholder="Search your city for its sigil" aria-label="Search your city" />
        <button type="button" className="em-btn em-btn-ghost" disabled={busy || !world} onClick={() => void search()}>{busy ? '…' : 'FIND'}</button>
      </div>
      {note && <p className="em-fine">{note}</p>}
      <div className="em-sigil-strip" role="listbox" aria-label="Sigils">
        {cities.map((c) => (
          <button key={keyOf(c)} id={`sigil-${keyOf(c)}`} type="button" role="option" aria-selected={chosen === c} className={chosen === c ? 'on' : ''} title={shown(c)} onClick={() => onChange({ city: c[0], iso: c[5] })}>
            <span dangerouslySetInnerHTML={{ __html: crestSvg(c[0], c[5], true) }} />
          </button>
        ))}
        {!world && <span className="em-fine">Gathering the shields…</span>}
      </div>
      <p className="em-fine">{chosen ? `YOUR SIGIL: ${shown(chosen).toUpperCase()}` : 'Choose a shield: it will hang in your home.'}</p>
    </div>
  );
}
