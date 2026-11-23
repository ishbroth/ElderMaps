// The forge and the alchemist: weapons, spells, health potions, shouts (Legendary Time) and the use of both hands, bought with loot. The prices are here and nowhere else: the page asks
// for the catalogue and shows it.
//
// POST { action: 'catalog' }          ->  { items: [{ id, name, kind, cls?, tier?, cost, herbs, owned, canBuy }], loot, pack: { potions, shouts, dual }, arsenal }
// POST { action: 'buy', id }          ->  { ok: true } | { error: 'cannot_pay' | 'owned' | 'need_previous' | 'bad_item' }
// Deploy: supabase functions deploy shop

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';

const HERBS = ['tundra_cotton', 'blisterwort', 'canis_root', 'snowberry', 'nirnroot', 'ash_yam', 'comberry', 'hist_sap', 'moon_sugar', 'sand_lily', 'glow_cap', 'tusk_thistle', 'dream_blossom'];

interface Recipe { id: string; name: string; kind: 'weapon' | 'potion' | 'shout' | 'dual'; cls?: string; tier?: number; cost: Record<string, number>; herbs: number }
const W = (cls: string, tier: number, name: string, cost: Record<string, number>): Recipe => ({ id: `${cls}${tier}`, name, kind: 'weapon', cls, tier, cost, herbs: 0 });
const RECIPES: Recipe[] = [
  // the one-handed weapon is where everyone begins (tier 1 is free)
  W('onehand', 2, 'Steel Sword', { iron: 6, leather: 2 }), W('onehand', 3, 'Gilded Blade', { gold: 5, iron: 4 }), W('onehand', 4, 'Nightglass Blade', { ebony: 5, gold: 3 }),
  W('twohand', 1, 'Iron Greatsword', { iron: 8, wood: 4, leather: 2 }), W('twohand', 2, 'Steel Battleaxe', { iron: 10, dwarven: 2, leather: 3 }), W('twohand', 3, 'Gilded Warhammer', { gold: 8, iron: 6 }), W('twohand', 4, 'Nightglass Greatblade', { ebony: 7, gold: 4 }),
  W('bow', 1, 'Hunting Bow', { wood: 6, leather: 3 }), W('bow', 2, 'Longbow', { wood: 8, iron: 3, leather: 2 }), W('bow', 3, 'Gilded Bow', { gold: 4, wood: 6 }), W('bow', 4, 'Nightglass Bow', { ebony: 4, wood: 6 }),
  W('shock', 1, 'Sparks', { stone: 4, gold: 1 }), W('shock', 2, 'Lightning', { stone: 6, gold: 2 }), W('shock', 3, 'Chain Lightning', { stone: 8, gold: 4, dwarven: 1 }), W('shock', 4, 'Thunderstorm', { stone: 10, gold: 6, ebony: 2 }),
  W('frost', 1, 'Ice Spike', { stone: 4, gold: 1 }), W('frost', 2, 'Ice Lance', { stone: 6, gold: 2 }), W('frost', 3, 'Glacier Spear', { stone: 8, gold: 4, dwarven: 1 }), W('frost', 4, "Winter's Fang", { stone: 10, gold: 6, ebony: 2 }),
  W('fire', 1, 'Firebolt', { stone: 4, gold: 1 }), W('fire', 2, 'Fireball', { stone: 6, gold: 2 }), W('fire', 3, 'Inferno', { stone: 8, gold: 4, dwarven: 1 }), W('fire', 4, "Sun's Wrath", { stone: 10, gold: 6, ebony: 2 }),
  W('drain', 1, 'Life Drain', { stone: 5, gold: 2 }), W('drain', 2, 'Soul Siphon', { stone: 7, gold: 3 }), W('drain', 3, 'Vampiric Grasp', { stone: 9, gold: 5, dwarven: 1 }), W('drain', 4, 'Heart Tide', { stone: 12, gold: 7, ebony: 2 }),
  // what can be drunk or shouted, and the use of both hands
  { id: 'potion', name: 'Health Potion', kind: 'potion', cost: {}, herbs: 3 },
  { id: 'shout', name: 'Shout of Legendary Time', kind: 'shout', cost: { gold: 1 }, herbs: 4 },
  { id: 'dual', name: 'Both Hands', kind: 'dual', cost: { ebony: 4, gold: 6, leather: 6 }, herbs: 0 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = serviceClient();

  const state = async () => {
    const [{ data: bag }, { data: arsenalRows }, { data: pack }] = await Promise.all([
      db.from('loot_bag').select('loot_id,qty').eq('user_id', user),
      db.from('arsenal').select('cls,tier').eq('user_id', user),
      db.from('pack').select('potions,shouts,dual').eq('user_id', user).maybeSingle(),
    ]);
    const loot: Record<string, number> = {};
    for (const r of bag ?? []) loot[r.loot_id as string] = r.qty as number;
    const arsenal: Record<string, number> = { onehand: 1 };
    for (const r of arsenalRows ?? []) arsenal[r.cls as string] = Math.max(arsenal[r.cls as string] ?? 0, r.tier as number);
    return { loot, arsenal, pack: { potions: pack?.potions ?? 0, shouts: pack?.shouts ?? 0, dual: pack?.dual ?? false } };
  };
  const canPay = (r: Recipe, loot: Record<string, number>) => Object.entries(r.cost).every(([k, v]) => (loot[k] ?? 0) >= v) && HERBS.reduce((s, h) => s + (loot[h] ?? 0), 0) >= r.herbs;

  if (b.action === 'catalog') {
    const s = await state();
    const items = RECIPES.map((r) => {
      const owned = r.kind === 'weapon' ? (s.arsenal[r.cls as string] ?? 0) >= (r.tier as number) : r.kind === 'dual' ? s.pack.dual : false;
      const previous = r.kind !== 'weapon' || (r.tier as number) <= 1 || (s.arsenal[r.cls as string] ?? 0) >= (r.tier as number) - 1;
      return { id: r.id, name: r.name, kind: r.kind, cls: r.cls, tier: r.tier, cost: r.cost, herbs: r.herbs, owned, locked: !previous, canBuy: !owned && previous && canPay(r, s.loot) };
    });
    return reply(req, { items, ...s });
  }

  if (b.action === 'buy') {
    const r = RECIPES.find((x) => x.id === b.id);
    if (!r) return reply(req, { error: 'bad_item' }, 400);
    const s = await state();
    if (r.kind === 'weapon') {
      if ((s.arsenal[r.cls as string] ?? 0) >= (r.tier as number)) return reply(req, { error: 'owned' }, 409);
      if ((r.tier as number) > 1 && (s.arsenal[r.cls as string] ?? 0) < (r.tier as number) - 1) return reply(req, { error: 'need_previous' }, 409);
    }
    if (r.kind === 'dual' && s.pack.dual) return reply(req, { error: 'owned' }, 409);
    const { data: paid } = await db.rpc('spend_loot', { p_user: user, p_cost: r.cost, p_herbs: r.herbs, p_herb_ids: HERBS });
    if (!paid) return reply(req, { error: 'cannot_pay' }, 402);
    if (r.kind === 'weapon') await db.from('arsenal').upsert({ user_id: user, cls: r.cls, tier: r.tier }, { onConflict: 'user_id,cls' });
    else {
      const now = s.pack;
      await db.from('pack').upsert({ user_id: user, potions: now.potions + (r.kind === 'potion' ? 1 : 0), shouts: now.shouts + (r.kind === 'shout' ? 1 : 0), dual: now.dual || r.kind === 'dual' }, { onConflict: 'user_id' });
    }
    return reply(req, { ok: true });
  }
  return reply(req, { error: 'bad_action' }, 400);
});
