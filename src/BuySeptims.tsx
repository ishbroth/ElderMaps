import Coin from './Coin';
import { useState } from 'react';
import { purchasesAvailable } from './lib/native';
import { PACKS, purchasePack, usePackPrices } from './lib/iap';

/** Buying septims: a pack is paid for on Stripe's own page (Apple Pay and Google Pay appear there), and the septims arrive a moment after. */
export default function BuySeptims({ onClose, onBought }: { onClose: () => void; /** Called when septims were added (in the iPhone app, where the purchase finishes here). */ onBought?: () => void }) {
  const prices = usePackPrices();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const buy = async (pack: string) => {
    setBusy(pack); setNote('');
    const { bought, problem } = await purchasePack(pack);
    if (problem) setNote(problem);
    if (bought) { onBought?.(); onClose(); return; }
    setBusy('');
  };
  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label="Exchange tender" onClick={onClose}>
      <article className="em-scene em-account" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>
        <h2>EXCHANGE TENDER</h2>
        <p className="em-fine">A glimpse costs <Coin size={13} /> 100 (<Coin size={13} /> 400 for a great city); a Town Legend <Coin size={13} /> 4,800. The coin is the septim.</p>
        {!purchasesAvailable() && <p className="em-fine">Septims cannot be bought inside the app yet. The ones you have, and any bought on eldermaps.com, work here once you sign in.</p>}
        {purchasesAvailable() && <div className="em-packs">
          {PACKS.map((p) => <button key={p.id} type="button" className="em-btn" disabled={!!busy} onClick={() => void buy(p.id)}>{busy === p.id ? 'OPENING…' : <><Coin size={18} /> {p.septims.toLocaleString('en-US')} · {prices[p.id] ?? p.price}</>}</button>)}
        </div>}
        {note && <p className="em-note">{note}</p>}
      </article>
    </div>
  );
}
