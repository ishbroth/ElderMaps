import Coin from './Coin';
import { useRef, useState } from 'react';
import { CHARACTER_TYPES, saveSetup, sendSignInLink, signInWithHearth, type Account } from './lib/account';
import { loadWorld } from './lib/world';
import { randomCharacterName } from './lib/names';
import SigilPicker, { Emblem, Quill, type SigilChoice } from './Sigil';
import { db } from './lib/account';

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
      <div className="em-seg em-sex" role="group" aria-label="Male or female">
        <button type="button" className={sex === 'm' ? 'on' : ''} onClick={() => onSex('m')}>MALE</button>
        <button type="button" className={sex === 'f' ? 'on' : ''} onClick={() => onSex('f')}>FEMALE</button>
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
export default function AccountModal({ account, onClose, onShop, onBuy, originName }: { account: Account; originName?: string | null; onClose: () => void; onShop?: () => void; onBuy?: () => void }) {
  const signedIn = !!account.session;
  const needsSetup = signedIn && account.loaded && (!account.profile?.characterName || !account.home?.hearthNumber || !account.profile?.sigilCity);
  const [mode, setMode] = useState<'in' | 'new'>('in');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // setup
  const [name, setName] = useState(account.profile?.characterName ?? '');
  const [type, setType] = useState(account.profile?.characterType ?? CHARACTER_TYPES[0].id);
  const [sex, setSex] = useState<'m' | 'f'>(account.profile?.characterSex ?? 'm');
  const [sigil, setSigil] = useState<SigilChoice | null>(account.profile?.sigilCity ? { city: account.profile.sigilCity, iso: account.profile.sigilIso ?? '' } : null);
  const [step, setStep] = useState<1 | 2 | 3>(account.profile?.characterName && account.home?.hearthNumber !== undefined ? 3 : 1);
  const [editSigil, setEditSigil] = useState(false);
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
  const next1 = () => {
    if (name.trim().length < 2) { setNote('Choose a name of at least two letters.'); return; }
    if (!/^\d{4}$/.test(number)) { setNote('The serf number is four digits.'); return; }
    setNote(''); setStep(2);
  };
  const finish = async () => {
    if (!account.session || !sigil) { setNote('Choose a sigil first.'); return; }
    setBusy(true); setNote('');
    const w = await loadWorld();
    const c = w.cities.crest.find((x) => x[0] === sigil.city && x[5] === sigil.iso);
    const problem = await saveSetup(account.session.user.id, { characterName: name.trim(), characterType: type, characterSex: sex, sigilCity: sigil.city, sigilIso: sigil.iso, address: sigil.city, lat: c?.[1] ?? 0, lng: c?.[2] ?? 0, hearthNumber: Number(number) });
    setBusy(false);
    if (problem) { setNote(problem); if (/name/i.test(problem)) setStep(1); return; }
    await account.refresh();
    onClose();
  };
  const saveNewSigil = async () => {
    if (!account.session || !sigil) return;
    setBusy(true); setNote('');
    const { error } = await db().from('profiles').update({ sigil_city: sigil.city, sigil_iso: sigil.iso, updated_at: new Date().toISOString() }).eq('user_id', account.session.user.id);
    setBusy(false);
    if (error) { setNote('The sigil could not be saved. Try again.'); return; }
    await account.refresh(); setEditSigil(false);
  };

  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label="Your account" onClick={onClose}>
      <article className="em-scene em-account" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>

        {!signedIn && (
          <>
            <h2>{mode === 'in' ? 'ENTER THE REALM' : 'CONSCRIPT'}</h2>
            <label className="em-field">EMAIL<input type="email" value={email} autoComplete="email" inputMode="email" onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            {mode === 'in' && <label className="em-field">SERF NUMBER<input value={digits} inputMode="numeric" maxLength={4} pattern="[0-9]*" type="password" autoComplete="current-password" onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="four digits" /></label>}
            {mode === 'new' && !sent && <p className="em-fine">A link will be sent to this address. Open it on this device to confirm it is yours: you will then make your character and choose your serf number.</p>}
            {mode === 'new' && sent && <p className="em-fine">The link is on its way. Open it on this device to finish.</p>}
            {note && <p className="em-note">{note}</p>}
            <div className="em-card-buttons">
              {mode === 'in' ? (
                <>
                  <button type="button" className="em-btn" disabled={busy || !/^\S+@\S+\.\S+$/.test(email) || digits.length !== 4} onClick={() => void hearth()}>{busy ? 'OPENING…' : 'ENTER THE REALM'}</button>
                  <button type="button" className="em-btn em-btn-ghost" onClick={() => { setMode('new'); setNote(''); setSent(false); }}>CONSCRIPT</button>
                </>
              ) : (
                <>
                  <button type="button" className="em-btn" disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} onClick={() => void link()}>{busy ? 'SENDING…' : sent ? 'SEND AGAIN' : 'SEND ME THE LINK'}</button>
                  <button type="button" className="em-btn em-btn-ghost" onClick={() => { setMode('in'); setNote(''); }}>BACK</button>
                </>
              )}
            </div>
          </>
        )}

        {signedIn && !account.loaded && <p className="em-fine">Reading your record…</p>}

        {needsSetup && (
          <>
            {step === 1 && (
              <>
                <h2>YOUR NAME</h2>
                <label className="em-field">CHARACTER NAME
                  <span className="em-sigil-search"><input value={name} maxLength={20} autoComplete="off" spellCheck={false} onChange={(e) => setName(e.target.value)} placeholder="what the realm will call you" /><button type="button" className="em-btn em-btn-ghost" onClick={() => setName(randomCharacterName())}>ROLL</button></span>
                </label>
                <label className="em-field">SERF NUMBER (FOUR DIGITS: YOUR PASSWORD)<input value={number} inputMode="numeric" maxLength={4} pattern="[0-9]*" onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="four digits" /></label>
                {note && <p className="em-note">{note}</p>}
                <div className="em-card-buttons"><button type="button" className="em-btn" onClick={next1}>NEXT</button></div>
              </>
            )}
            {step === 2 && (
              <>
                <h2>MAKE YOUR CHARACTER</h2>
                <TypePicker value={type} onChange={setType} sex={sex} onSex={setSex} />
                <div className="em-card-buttons"><button type="button" className="em-btn" onClick={() => setStep(3)}>NEXT</button><button type="button" className="em-btn em-btn-ghost" onClick={() => setStep(1)}>BACK</button></div>
              </>
            )}
            {step === 3 && (
              <>
                <h2>CHOOSE YOUR SIGIL</h2>
                <SigilPicker value={sigil} onChange={setSigil} />
                {note && <p className="em-note">{note}</p>}
                <div className="em-card-buttons"><button type="button" className="em-btn" disabled={busy || !sigil} onClick={() => void finish()}>{busy ? 'SAVING…' : 'BEGIN'}</button><button type="button" className="em-btn em-btn-ghost" onClick={() => setStep(2)}>BACK</button></div>
              </>
            )}
          </>
        )}

        {signedIn && account.loaded && !needsSetup && (
          <>
            <h2><Emblem type={account.profile?.characterType ?? null} sex={account.profile?.characterSex ?? null} city={account.profile?.sigilCity ?? null} iso={account.profile?.sigilIso ?? null} size={34} /> {account.profile?.characterName} <button type="button" className="em-quill" aria-label="Change your sigil" title="Change your sigil" onClick={() => { setEditSigil((v) => !v); setNote(''); }}><Quill /></button></h2>
            {editSigil && (<><SigilPicker value={sigil} onChange={setSigil} />{note && <p className="em-note">{note}</p>}<div className="em-card-buttons"><button type="button" className="em-btn" disabled={busy || !sigil} onClick={() => void saveNewSigil()}>{busy ? 'SAVING…' : 'KEEP THIS SIGIL'}</button></div></>)}
            <TypePicker value={account.profile?.characterType ?? CHARACTER_TYPES[0].id} onChange={() => undefined} sex={account.profile?.characterSex ?? 'm'} />
            <p className="em-fine">{account.email}</p>
            <p className="em-fine">ORIGIN: {originName ?? ''} · SERF NUMBER {String(account.home?.hearthNumber ?? 0).padStart(4, '0')}</p>
            <p className="em-septims"><Coin size={20} /> {account.septims.toLocaleString('en-US')}</p>
            <div className="em-card-buttons">{onBuy && <button type="button" className="em-btn" onClick={onBuy}>EXCHANGE TENDER</button>}{onShop && <button type="button" className="em-btn" onClick={onShop}>FORGE & ALCHEMIST</button>}<button type="button" className="em-btn em-btn-ghost" onClick={() => void account.signOut().then(onClose)}>SIGN OUT</button></div>
          </>
        )}
      </article>
    </div>
  );
}
