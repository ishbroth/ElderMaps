// Buying septims with the App Store's own In-App Purchase, in the iPhone app (Apple requires it for digital goods like these; the website keeps Stripe).
// The phone shows Apple's purchase sheet; when it succeeds the app sends the transaction's number to our server (the redeem-iap function), which asks Apple
// whether that purchase is real, belongs to this account and has not been used, and only then adds the septims. The purchase stays unfinished on the phone until
// the server has said yes, so a dropped connection never loses a purchase: it is picked up again the next time the app opens.

import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { useEffect, useState } from 'react';
import { db } from './account';
import { goTo, platform } from './native';

export const PACKS = [
  { id: 'septims400', septims: 400, price: '$0.99' },
  { id: 'septims1800', septims: 1800, price: '$3.99' },
  { id: 'septims4400', septims: 4400, price: '$9.99' },
];

/** The App Store product for each pack (consumable products with these exact identifiers exist in App Store Connect). */
export const IAP_PRODUCT: Record<string, string> = {
  septims400: 'com.eldermaps.app.septims400',
  septims1800: 'com.eldermaps.app.septims1800',
  septims4400: 'com.eldermaps.app.septims4400',
};

/** Are purchases made with the App Store here? (The iPhone app.) */
export const usesAppStore = (): boolean => platform() === 'ios';

/** Tells the server about a purchase; true once the septims were added (or had already been added). */
async function redeem(transactionId: string): Promise<boolean> {
  const { data, error } = await db().functions.invoke('redeem-iap', { body: { transactionId } });
  return !error && data?.ok === true;
}

async function redeemAndFinish(t: Transaction): Promise<boolean> {
  if (!(await redeem(t.transactionId))) return false;
  try { await NativePurchases.finishTransaction({ transactionId: t.transactionId }); } catch { /* it will be offered again; the server will say it has been used */ }
  return true;
}

/**
 * While someone is signed in in the iPhone app: purchases that were paid but never reached the server are sent now, and any that appear later are sent as they
 * come. `onSeptims` is called when septims were added. Returns the way to stop.
 */
export function startPurchases(onSeptims: () => void): () => void {
  if (!usesAppStore()) return () => {};
  let off = false;
  let handle: { remove: () => Promise<void> } | null = null;
  void (async () => {
    try {
      await NativePurchases.configure({ autoFinishTransactions: false });
      handle = await NativePurchases.addListener('transactionUpdated', (t) => { void redeemAndFinish(t).then((ok) => { if (ok && !off) onSeptims(); }); });
      const { transactions } = await NativePurchases.getUnfinishedTransactions();
      for (const t of transactions) if (await redeemAndFinish(t) && !off) onSeptims();
    } catch { /* purchases are not available on this device: nothing to recover */ }
  })();
  return () => { off = true; void handle?.remove(); };
}

/** The price of each pack as the App Store shows it (in the person's own currency), or the website's price until it is known. */
export function usePackPrices(): Record<string, string> {
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(PACKS.map((p) => [p.id, p.price])));
  useEffect(() => {
    if (!usesAppStore()) return;
    let off = false;
    NativePurchases.getProducts({ productIdentifiers: Object.values(IAP_PRODUCT), productType: PURCHASE_TYPE.INAPP })
      .then(({ products }) => {
        if (off) return;
        const found: Record<string, string> = {};
        for (const [pack, productId] of Object.entries(IAP_PRODUCT)) {
          const product = products.find((p) => p.identifier === productId);
          if (product) found[pack] = product.priceString;
        }
        setPrices((was) => ({ ...was, ...found }));
      })
      .catch(() => {});
    return () => { off = true; };
  }, []);
  return prices;
}

/** The website: the Stripe checkout page takes the whole window. Returns a message if it could not start. */
async function buyOnWeb(pack: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke('create-checkout', { body: { pack } });
  const url = (data as { url?: string } | null)?.url;
  if (error || !url) return 'PAYMENT IS NOT OPEN YET OR COULD NOT START: NOTHING WAS TAKEN';
  await goTo(url);
  return null;
}

/**
 * Buys a pack. On the iPhone this is Apple's purchase sheet (bought: true when the septims have been added); elsewhere it opens the Stripe checkout page.
 * `problem` is a message to show, or null.
 */
export async function purchasePack(pack: string): Promise<{ bought: boolean; problem: string | null }> {
  if (!usesAppStore()) return { bought: false, problem: await buyOnWeb(pack) };
  const productId = IAP_PRODUCT[pack];
  const { data } = await db().auth.getSession();
  const user = data.session?.user.id;
  if (!productId || !user) return { bought: false, problem: 'SIGN IN FIRST' };
  try {
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) return { bought: false, problem: 'PURCHASES ARE TURNED OFF ON THIS IPHONE (SETTINGS, SCREEN TIME, CONTENT & PRIVACY RESTRICTIONS)' };
    // the account's own id travels with the purchase, so Apple's record says whose it is and nobody else can claim it
    const t = await NativePurchases.purchaseProduct({ productIdentifier: productId, productType: PURCHASE_TYPE.INAPP, quantity: 1, appAccountToken: user, autoAcknowledgePurchases: false });
    if (await redeemAndFinish(t)) return { bought: true, problem: null };
    return { bought: false, problem: 'YOUR PURCHASE WENT THROUGH, BUT THE SEPTIMS COULD NOT BE ADDED JUST NOW. THEY WILL BE ADDED THE NEXT TIME YOU OPEN THE APP' };
  } catch (e) {
    if (/cancel/i.test(String((e as { message?: string }).message ?? e))) return { bought: false, problem: null };
    return { bought: false, problem: 'THE PURCHASE DID NOT GO THROUGH. YOU HAVE NOT BEEN CHARGED. TRY AGAIN IN A MOMENT' };
  }
}
