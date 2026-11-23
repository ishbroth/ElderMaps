import { useRef, useState } from 'react';
import { CHARACTER_TYPES, saveSetup, sendSignInLink, signInWithHearth, type Account } from './lib/account';
import { findPlace } from './lib/google';

/** The portrait of a character type. (A drawn emblem for now; the painted portraits replace it when they are made: public/portraits/<id>.jpg is used when it exists.) */
function Portrait({ id, name, sex }: { id: string; name: string; sex: 'm' | 'f' }) {
  const [missing, setMissing] = useState(false);
  const hue = (CHARACTER_TYPES.findIndex((c) => c.id === id) * 36 + 20) % 360;
  if (!missing) return <img className="em-portrait" src={`${import.meta.env.BASE_URL}portraits/${id}${sex === 'f' ? '-f' : ''}.jpg`} alt={name} onError={() => setMissing(true)} draggable={false} />;
  return <div className="em-portrait em-portrait-emblem" style={{ background: `radial-gradient(circle at 50% 35%, hsl(${hue} 35% 38%), hsl(${hue} 30% 14%))` }} aria-label={name}><span>{name.slice(0, 1)}</span></div>;
}

/** Choose a character type by swiping left and right (or with the arrows). */
function TypePicker({ value, onChange, sex, onSex }: { value: string; onChange: (id: string) => void; sex: 'm' | 'f'; onSex?: (s: 'm' | 'f') => void }) {
  const i = Math.max(0, CHARACTER_TYPES.findIndex((c) => c.id === value));
  const track = useRef<HTMLDivElement>(null);
  const go = (to: number) => {
    const n = (to + CHARACTER_TYPES.length) % CHARACTER_TYPES.length;
    onChange(CHARACTER_TYPES[n].id);
    track.current?.scrollTo({ left: n * (track.current.clientWidth), behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = track.current; if (!el || !el.clientWidth) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (CHARACTER_TYPES[n] && CHARACTER_TYPES[n].id !== value) onChange(CHARACTER_TYPES[n].id);
  };
  return (
    <>
    {onSex && (
      <div className="em-seg em-sex" role="group" aria-label="Man or woman">
        <button type="button" className={sex === 'm' ? 'on' : ''} onClick={() => onSex('m')}>MAN</button>
        <button type="button" className={sex === 'f' ? 'on' : ''} onClick={() => onSex('f')}>WOMAN</button>
      </div>
    )}
    <div className="em-types">
      <button type="button" className="em-types-arrow" aria-label="Previous" onClick={() => go(i - 1)}>‹</button>
      <div className="em-types-track" ref={track} onScroll={onScroll}>
        {CHARACTER_TYPES.map((c) => (
          <figure key={c.id} className="em-type">
            <Portrait key={`${c.id}${sex}`} id={c.id} name={c.name} sex={sex} />
            <figcaption><b>{c.name.toUpperCase()}</b><i>{c.blurb}</i></figcaption>
          </figure>
        ))}
      </div>
      <button type="button" className="em-types-arrow" aria-label="Next" onClick={() => go(i + 1)}>›</button>
    </div>
    </>
  );
}

/** Signing in, the first-time setup (character, home, hearth number) and the account's own card. */
export default function AccountModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const signedIn = !!account.session;
  const needsSetup = signedIn && account.loaded && (!account.profile?.characterName || !account.home?.hearthNumber);
  const [mode, setMode] = useState<'link' | 'hearth'>('link');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // setup
  const [name, setName] = useState(account.profile?.characterName ?? '');
  const [type, setType] = useState(account.profile?.characterType ?? CHARACTER_TYPES[0].id);
  const [sex, setSex] = useState<'m' | 'f'>(account.profile?.characterSex ?? 'm');
  const [address, setAddress] = useState(account.home?.address ?? '');
  const [number, setNumber] = useState(account.home?.hearthNumber !== undefined ? String(account.home.hearthNumber).padStart(4, '0') : '');

  const link = async () => {
    setBusy(true); setNote('');
    const problem = await sendSignInLink(email);
    setBusy(false);
    if (problem) setNote(problem); else setSent(true);
  };
  const hearth = async () => {
    setBusy(true); setNote('');
    const problem = await signInWithHearth(email.trim().toLowerCase(), digits);
    setBusy(false);
    if (problem) setNote(problem); else { await account.refresh(); onClose(); }
  };
  const finish = async () => {
    if (!account.session) return;
    if (name.trim().length < 2) { setNote('Choose a name of at least two letters.'); return; }
    if (!/^\d{4}$/.test(number)) { setNote('The hearth number is four digits.'); return; }
    setBusy(true); setNote('');
    const found = await findPlace(address).catch(() => null);
    if (!found) { setBusy(false); setNote('That address could not be found. Try the street, town and country.'); return; }
    const problem = await saveSetup(account.session.user.id, { characterName: name.trim(), characterType: type, characterSex: sex, address: found.name, lat: found.center.lat, lng: found.center.lng, hearthNumber: Number(number) });
    setBusy(false);
    if (problem) { setNote(problem); return; }
    await account.refresh();
    onClose();
  };

  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label="Your account" onClick={onClose}>
      <article className="em-scene em-account" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>

        {!signedIn && (
          <>
            <h2>ENTER THE REALM</h2>
            <div className="em-seg" role="group" aria-label="How to sign in">
              <button type="button" className={mode === 'link' ? 'on' : ''} onClick={() => { setMode('link'); setNote(''); }}>EMAILED LINK</button>
              <button type="button" className={mode === 'hearth' ? 'on' : ''} onClick={() => { setMode('hearth'); setNote(''); }}>HEARTH NUMBER</button>
            </div>
            <label className="em-field">EMAIL<input type="email" value={email} autoComplete="email" inputMode="email" onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            {mode === 'hearth' && <label className="em-field">HEARTH NUMBER<input value={digits} inputMode="numeric" maxLength={4} pattern="[0-9]*" onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="four digits" /></label>}
            {mode === 'link' && !sent && <p className="em-fine">New here, or lost your number? A sign-in link will arrive by email. Opening it signs you in and starts the making of your character.</p>}
            {sent && <p className="em-fine">The link is on its way. Open it on this device.</p>}
            {note && <p className="em-note">{note}</p>}
            <div className="em-card-buttons">
              {mode === 'link'
                ? <button type="button" className="em-btn" disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} onClick={() => void link()}>{busy ? 'SENDING…' : sent ? 'SEND AGAIN' : 'SEND ME A LINK'}</button>
                : <button type="button" className="em-btn" disabled={busy || !/^\S+@\S+\.\S+$/.test(email) || digits.length !== 4} onClick={() => void hearth()}>{busy ? 'OPENING…' : 'ENTER'}</button>}
            </div>
          </>
        )}

        {signedIn && !account.loaded && <p className="em-fine">Reading your record…</p>}

        {needsSetup && (
          <>
            <h2>MAKE YOUR CHARACTER</h2>
            <TypePicker value={type} onChange={setType} sex={sex} onSex={setSex} />
            <label className="em-field">CHARACTER NAME<input value={name} maxLength={20} autoComplete="off" spellCheck={false} onChange={(e) => setName(e.target.value)} placeholder="what the realm will call you" /></label>
            <label className="em-field">YOUR HOME (ADDRESS)<input value={address} autoComplete="street-address" onChange={(e) => setAddress(e.target.value)} placeholder="street, town, country" /></label>
            <label className="em-field">HEARTH NUMBER (FOUR DIGITS: YOUR PASSWORD)<input value={number} inputMode="numeric" maxLength={4} pattern="[0-9]*" onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label>
            {note && <p className="em-note">{note}</p>}
            <div className="em-card-buttons"><button type="button" className="em-btn" disabled={busy} onClick={() => void finish()}>{busy ? 'SAVING…' : 'BEGIN'}</button></div>
          </>
        )}

        {signedIn && account.loaded && !needsSetup && (
          <>
            <h2>{account.profile?.characterName}</h2>
            <TypePicker value={account.profile?.characterType ?? CHARACTER_TYPES[0].id} onChange={() => undefined} sex={account.profile?.characterSex ?? 'm'} />
            <p className="em-fine">{account.email}</p>
            <p className="em-fine">HOME: {account.home?.address} · HEARTH {String(account.home?.hearthNumber ?? 0).padStart(4, '0')}</p>
            <p className="em-septims">{account.septims.toLocaleString('en-US')} SEPTIMS</p>
            <div className="em-card-buttons"><button type="button" className="em-btn em-btn-ghost" onClick={() => void account.signOut().then(onClose)}>SIGN OUT</button></div>
          </>
        )}
      </article>
    </div>
  );
}
