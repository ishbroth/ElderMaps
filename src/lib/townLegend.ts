// The Town Legend: asking the server whether this person has bought a city's map, buying it, and the places glimpsed in that city.

import { db } from './account';
import type { Metro, World } from './world';

export interface LegendStatus { unlocked: boolean; count: number; cost: number }
export interface LegendPlace { id: string; name: string; kind: string; lat: number; lng: number }

const call = async <T,>(action: string, metroId: string): Promise<{ ok: true; data: T } | { ok: false; reason: string; cost?: number }> => {
  const { data, error } = await db().functions.invoke('town-legend', { body: { action, metroId } });
  if (error) {
    let reason = 'failed'; let cost: number | undefined;
    const response = (error as { context?: Response }).context;
    if (response) { try { const b = (await response.json()) as { error?: string; cost?: number }; reason = b.error ?? 'failed'; cost = b.cost; } catch { /* no body */ } }
    return { ok: false, reason, cost };
  }
  return { ok: true, data: data as T };
};

export const legendStatus = (metroId: string) => call<LegendStatus>('status', metroId);
export const legendUnlock = (metroId: string) => call<{ ok: boolean; charged: boolean }>('unlock', metroId);
export const legendPlaces = (metroId: string) => call<{ places: LegendPlace[] }>('places', metroId);

/** The metro a place belongs to: the one whose area it lies in (nearest first), else the nearest by name within reach. */
export function metroForSpot(world: World, spot: { real: string; lat: number; lng: number }): Metro | null {
  const km = (m: Metro) => Math.hypot((m.lat - spot.lat) * 111.32, (m.lng - spot.lng) * 111.32 * Math.cos((spot.lat * Math.PI) / 180));
  let best: Metro | null = null; let bestGap = Infinity;
  for (const m of world.metros) {
    const gap = km(m) - m.radiusKm;
    if (gap <= 8 && gap < bestGap) { best = m; bestGap = gap; }
  }
  return best;
}
