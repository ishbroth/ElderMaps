import { useState } from 'react';
import { db } from './lib/account';

const PACKS = [
  { id: 'septims400', septims: 400, price: '$0.99' },
  { id: 'septims1800', septims: 1800, price: '$3.99' },
  { id: 'septims4400', septims: 4400, price: '$9.99' },
];

/** Buying septims: a pack is paid for on Stripe's own page (Apple Pay and Google Pay appear there), and the septims arrive a moment after. */
export default function BuySeptims({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const buy = async (pack: string) => {
    setBusy(pack); setNote('');
    const { data, error } = await db().functions.invoke('create-checkout', { body: { pack } });
    const url = (data as { url?: string } | null)?.url;
    if (error || !url) { setBusy(''); setNote('PAYMENT IS NOT OPEN YET OR COULD NOT START: NOTHING WAS TAKEN'); return; }
    window.location.href = url;
  };
  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label="Buy septims" onClick={onClose}>
      <article className="em-scene em-account" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>
        <h2>TRADE FOR SEPTIMS</h2>
        <p className="em-fine">A glimpse costs 100 septims (400 for a great city); a Town Legend 4,800.</p>
        <div className="em-packs">
          {PACKS.map((p) => <button key={p.id} type="button" className="em-btn" disabled={!!busy} onClick={() => void buy(p.id)}>{busy === p.id ? 'OPENING…' : `${p.septims.toLocaleString('en-US')} SEPTIMS · ${p.price}`}</button>)}
        </div>
        {note && <p className="em-note">{note}</p>}
      </article>
    </div>
  );
}
