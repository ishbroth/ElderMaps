// Clearing a place: asking the server to start a fight (it checks the glimpse is paid for), and telling it how the fight went (it decides the loot).

import { db } from './account';

export interface RunStart { runId: string; worth: number; pack: { potions: number; shouts: number } }
export type StartOutcome = { ok: true; run: RunStart } | { ok: false; reason: 'locked' | 'cleared' | 'bad_place' | 'failed' };

export async function startRun(spot: { id: string; kind: string }): Promise<StartOutcome> {
  const { data, error } = await db().functions.invoke('clear', { body: { action: 'start', placeId: spot.id, kind: spot.kind } });
  if (error) {
    let reason = 'failed';
    const response = (error as { context?: Response }).context;
    if (response) { try { reason = ((await response.json()) as { error?: string }).error ?? 'failed'; } catch { /* no body */ } }
    return { ok: false, reason: reason as 'failed' };
  }
  return { ok: true, run: data as RunStart };
}

export interface RunEnd { won: boolean; loot?: Record<string, number>; paid?: boolean }
export async function finishRun(runId: string, won: boolean, province: string, kind: string, potionsUsed: number, shoutsUsed: number): Promise<RunEnd | null> {
  const { data, error } = await db().functions.invoke('clear', { body: { action: 'finish', runId, won, province, kind, potionsUsed, shoutsUsed } });
  return error || !data ? null : (data as RunEnd);
}

/** Which of these places this person has cleared. */
export async function clearedAmong(placeIds: string[]): Promise<Set<string>> {
  const { data } = await db().functions.invoke('clear', { body: { action: 'status', placeIds } });
  return new Set(((data as { cleared?: string[] } | null)?.cleared) ?? []);
}
