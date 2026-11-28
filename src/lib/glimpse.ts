// Asking the server for a glimpse: the picture of a place re-imagined in the style of its land. The server charges the septims (once per person per place), finds the place's photograph,
// makes the picture (or reuses the one someone made before) and answers with links.

import { db } from './account';

export interface Glimpse {
  /** The finished picture (a link good for an hour). */
  url: string;
  /** The photograph it was made from, when that was a free one (shown first, then dissolved into the picture). */
  before?: string;
  credit?: { photo: string; author: string; license: string; page: string } | null;
  /** Who paid for the first picture of this place, and when (their character name). */
  discovered?: { by: string | null; at: string } | null;
  charged: boolean;
}

export type GlimpseOutcome =
  | { kind: 'ready'; glimpse: Glimpse }
  | { kind: 'working' }
  | { kind: 'error'; reason: 'sign_in' | 'no_credits' | 'no_photo' | 'busy' | 'failed' | 'bad_place'; cost?: number };

export async function requestGlimpse(spot: { id: string; name: string; kind: string; lat: number; lng: number; province: string; style?: string | null }): Promise<GlimpseOutcome> {
  const { data, error } = await db().functions.invoke('glimpse', { body: { placeId: spot.id, name: spot.name, kind: spot.kind, lat: spot.lat, lng: spot.lng, province: spot.province, style: spot.style ?? undefined } });
  if (error) {
    let reason = 'failed'; let cost: number | undefined;
    const response = (error as { context?: Response }).context;
    if (response) { try { const body = (await response.json()) as { error?: string; cost?: number }; reason = body.error ?? 'failed'; cost = body.cost; } catch { /* no body */ } }
    return { kind: 'error', reason: reason as 'failed', cost };
  }
  const d = data as { status?: string; url?: string; before?: string; credit?: Glimpse['credit']; discovered?: Glimpse['discovered']; charged?: boolean };
  if (d?.status === 'ready' && d.url) return { kind: 'ready', glimpse: { url: d.url, before: d.before, credit: d.credit ?? null, discovered: d.discovered ?? null, charged: !!d.charged } };
  if (d?.status === 'working') return { kind: 'working' };
  return { kind: 'error', reason: 'failed' };
}

export const GLIMPSE_MESSAGES: Record<string, string> = {
  sign_in: 'SIGN IN TO GLIMPSE A PLACE',
  no_credits: 'NOT ENOUGH SEPTIMS (BUYING MORE OPENS SOON)',
  no_photo: 'NO PICTURE OF THIS PLACE COULD BE FOUND: NOTHING WAS TAKEN',
  busy: 'THE RIFT IS CROWDED TODAY: TRY AGAIN TOMORROW. NOTHING WAS TAKEN',
  failed: 'THE GLIMPSE FAILED: NOTHING WAS TAKEN. TRY AGAIN IN A MOMENT',
  bad_place: 'THIS PLACE CANNOT BE GLIMPSED',
};
