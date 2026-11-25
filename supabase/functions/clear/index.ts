// Clearing a place (the combat game). The traveller must have paid for the place's glimpse; the server starts a run, and when the fight is over it decides the loot (never the phone).
// A win pays the loot at once if the place has been discovered (visited on foot), otherwise it is held with the place and paid the moment it is discovered (see report-discovery).
//
// POST { action: 'start', placeId, kind, province }                         ->  { runId, worth, pack: { potions, shouts } } | { error: 'locked' | 'cleared' | 'bad_place' }
// POST { action: 'finish', runId, won, potionsUsed?, shoutsUsed? }          ->  { won, loot, paid } | { error }
// POST { action: 'status', placeIds: [..] }                                 ->  { cleared: [placeId, ...] }
// Deploy: supabase functions deploy clear

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';
import { rollLoot } from '../_shared/loot.ts';
import { xpTenths } from '../_shared/combatXp.ts';

const SITE = 'https://eldermaps.com';
const KINDS = /^[a-z]{2,20}$/;
const PROVINCES = new Set(['skyrim', 'highrock', 'hammerfell', 'orsinium', 'elsweyr', 'valenwood', 'morrowind', 'summerset', 'shivering', 'cyrodiil', 'blackmarsh', 'solstheim', 'atmora']);

/** How much a place is worth (the same rule as the page): a shield city 50, a town mark 30, others by how widely the world writes about them. */
let wild: Map<string, number> | null = null;
let cities: Map<string, string> | null = null;
async function worthOf(placeId: string, kind: string): Promise<number> {
  if (placeId.startsWith('c:')) {
    if (!cities) { try { cities = new Map(((await (await fetch(`${SITE}/data/cities.json`)).json()) as [string, number, number, number, string][]).map((c) => [`${c[0]}|${Math.round(c[1] * 100)}`, c[4]])); } catch { cities = new Map(); } }
    const [, name, lat] = placeId.split(':');
    const tier = cities.get(`${name}|${Math.round(Number(lat) * 100)}`);
    return tier === 'crest' ? 50 : tier === 'town' ? 30 : 20;
  }
  if (placeId.startsWith('w:')) {
    if (!wild) { try { wild = new Map(((await (await fetch(`${SITE}/data/wild.json`)).json()) as [string, string, number, number, string, number][]).map((w) => [w[0], w[5]])); } catch { wild = new Map(); } }
    const fame = wild.get(placeId.slice(2)) ?? 0;
    return fame >= 90 ? 75 : fame >= 50 ? 50 : fame >= 20 ? 30 : fame >= 8 ? 20 : fame >= 3 ? 15 : 10;
  }
  return kind === 'keep' || kind === 'landmark' ? 15 : 10;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = serviceClient();

  if (b.action === 'status') {
    const ids = Array.isArray(b.placeIds) ? (b.placeIds as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 400) : [];
    const { data } = await db.from('raid_runs').select('place_id').eq('user_id', user).eq('won', true).in('place_id', ids);
    return reply(req, { cleared: [...new Set((data ?? []).map((r) => r.place_id as string))] });
  }

  if (b.action === 'start') {
    const placeId = typeof b.placeId === 'string' ? b.placeId : '';
    const kind = typeof b.kind === 'string' && KINDS.test(b.kind) ? b.kind : 'landmark';
    if (!/^[a-z]:\S{1,180}$/.test(placeId)) return reply(req, { error: 'bad_place' }, 400);
    // the glimpse has to be theirs
    const { data: owned } = await db.from('unlocks').select('place_id').eq('user_id', user).eq('place_id', placeId).maybeSingle();
    if (!owned) return reply(req, { error: 'locked' }, 403);
    const { data: done } = await db.from('raid_runs').select('id').eq('user_id', user).eq('place_id', placeId).eq('won', true).limit(1);
    if (done && done.length > 0) return reply(req, { error: 'cleared' }, 409);
    const { data: run, error } = await db.from('raid_runs').insert({ user_id: user, place_id: placeId }).select('id').single();
    if (error || !run) return reply(req, { error: 'server' }, 500);
    const { data: pack } = await db.from('pack').select('potions,shouts,dual').eq('user_id', user).maybeSingle();
    const { data: owned2 } = await db.from('arsenal').select('cls,tier').eq('user_id', user);
    const arsenal: Record<string, number> = { onehand: 1, twohand: 0, bow: 0, shock: 0, frost: 0, fire: 0, drain: 0 };
    for (const r of owned2 ?? []) arsenal[r.cls as string] = Math.max(arsenal[r.cls as string] ?? 0, r.tier as number);
    return reply(req, { runId: run.id, worth: await worthOf(placeId, kind), pack: { potions: pack?.potions ?? 0, shouts: pack?.shouts ?? 0, dual: pack?.dual ?? false }, arsenal });
  }

  if (b.action === 'finish') {
    const runId = typeof b.runId === 'string' ? b.runId : '';
    const { data: run } = await db.from('raid_runs').select('id,place_id,finished_at').eq('id', runId).eq('user_id', user).maybeSingle();
    if (!run || run.finished_at) return reply(req, { error: 'bad_run' }, 400);
    const won = b.won === true;
    // what was used in the fight comes out of the pack (never more than there was)
    const potionsUsed = Math.max(0, Math.min(5, Math.floor(Number(b.potionsUsed) || 0))), shoutsUsed = Math.max(0, Math.min(5, Math.floor(Number(b.shoutsUsed) || 0)));
    if (potionsUsed || shoutsUsed) {
      const { data: pack } = await db.from('pack').select('potions,shouts').eq('user_id', user).maybeSingle();
      if (pack) await db.from('pack').update({ potions: Math.max(0, pack.potions - potionsUsed), shouts: Math.max(0, pack.shouts - shoutsUsed) }).eq('user_id', user);
    }
    const kills = (b.kills && typeof b.kills === 'object' ? b.kills : {}) as Record<string, unknown>;
    if (!won) {
      await db.from('raid_runs').update({ won: false, finished_at: new Date().toISOString() }).eq('id', runId);
      const lost = xpTenths(kills, false, 0);
      if (lost > 0) await db.rpc('add_combat_xp', { p_user: user, p_tenths: lost });
      return reply(req, { won: false, xp: lost / 10 });
    }
    const province = typeof b.province === 'string' && PROVINCES.has(b.province) ? b.province : 'cyrodiil';
    const kind = typeof b.kind === 'string' && KINDS.test(b.kind) ? b.kind : 'landmark';
    const loot = rollLoot(await worthOf(run.place_id as string, kind), province);
    await db.from('raid_runs').update({ won: true, finished_at: new Date().toISOString(), loot }).eq('id', runId);
    // paid now if the place has been discovered, otherwise held until it is
    const { data: paid } = await db.rpc('claim_loot', { p_user: user, p_place: run.place_id });
    const gained = xpTenths(kills, true, await worthOf(run.place_id as string, kind));
    if (gained > 0) await db.rpc('add_combat_xp', { p_user: user, p_tenths: gained });
    return reply(req, { won: true, loot, paid: !!paid, xp: gained / 10 });
  }

  return reply(req, { error: 'bad_action' }, 400);
});
