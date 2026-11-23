// The forge and the alchemist, from the page's side: the catalogue (with prices) comes from the server, and so does every purchase.

import { db } from './account';

export interface ShopItem { id: string; name: string; kind: 'weapon' | 'potion' | 'shout' | 'dual'; cls?: string; tier?: number; cost: Record<string, number>; herbs: number; owned: boolean; locked: boolean; canBuy: boolean }
export interface ShopState { items: ShopItem[]; loot: Record<string, number>; pack: { potions: number; shouts: number; dual: boolean }; arsenal: Record<string, number> }

export async function loadShop(): Promise<ShopState | null> {
  const { data, error } = await db().functions.invoke('shop', { body: { action: 'catalog' } });
  return error || !data ? null : (data as ShopState);
}

export async function buyItem(id: string): Promise<'ok' | 'cannot_pay' | 'owned' | 'need_previous' | 'failed'> {
  const { error } = await db().functions.invoke('shop', { body: { action: 'buy', id } });
  if (!error) return 'ok';
  let reason = 'failed';
  const response = (error as { context?: Response }).context;
  if (response) { try { reason = ((await response.json()) as { error?: string }).error ?? 'failed'; } catch { /* no body */ } }
  return reason as 'failed';
}
