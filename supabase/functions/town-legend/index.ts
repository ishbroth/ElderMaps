// The Town Legend: the map of one whole city (its streets in the style of its land, the villages and mills round it, and every place travellers have glimpsed there). Bought once per
// metro for 48 credits (4,800 septims).
//
// POST { action: 'status', metroId }  ->  { unlocked, count, cost }      (count: how many glimpsed places there are in that metro)
// POST { action: 'unlock', metroId }  ->  { ok, charged } | { error: 'no_credits' }
// POST { action: 'places', metroId }  ->  { places: [{ id, name, kind, lat, lng }] }   (only for a metro they have bought)
// Deploy: supabase functions deploy town-legend

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';

const COST = 48;
const SITE = 'https://eldermaps.com';

let known: Set<string> | null = null;
async function metroExists(id: string): Promise<boolean> {
  if (!known) {
    try { known = new Set(((await (await fetch(`${SITE}/data/metros-index.json`)).json()) as { id: string }[]).map((m) => m.id)); } catch { known = new Set(); }
  }
  return known.size === 0 ? /^[a-z0-9-]{3,80}$/.test(id) : known.has(id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const { action, metroId } = (await req.json().catch(() => ({}))) as { action?: string; metroId?: string };
  if (!metroId || !(await metroExists(metroId))) return reply(req, { error: 'bad_metro' }, 400);
  const db = serviceClient();
  const { data: has } = await db.from('metro_unlocks').select('metro_id').eq('user_id', user).eq('metro_id', metroId).maybeSingle();

  if (action === 'status') {
    const { count } = await db.from('renders').select('place_id', { count: 'exact', head: true }).eq('metro_id', metroId).eq('status', 'ready');
    return reply(req, { unlocked: !!has, count: count ?? 0, cost: COST });
  }
  if (action === 'unlock') {
    const { data: spent, error } = await db.rpc('unlock_metro', { p_user: user, p_metro: metroId, p_cost: COST });
    if (error) return reply(req, { error: 'server' }, 500);
    if (spent === 'no_credits') return reply(req, { error: 'no_credits', cost: COST }, 402);
    return reply(req, { ok: true, charged: spent === 'spent' });
  }
  if (action === 'places') {
    if (!has) return reply(req, { error: 'locked' }, 403);
    const { data } = await db.from('renders').select('place_id,place_name,kind,lat,lng').eq('metro_id', metroId).eq('status', 'ready').limit(3000);
    return reply(req, { places: (data ?? []).map((r) => ({ id: r.place_id, name: r.place_name, kind: r.kind ?? 'landmark', lat: r.lat, lng: r.lng })) });
  }
  return reply(req, { error: 'bad_action' }, 400);
});
