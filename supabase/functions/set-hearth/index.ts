// Making a glimpsed address the home hearth (the domicile). The address has to be one the traveller paid to glimpse; the server records where it is, which city it stands in, and counts the change
// (the home city's dragon is gentle only for the first three hearths a traveller sets).
//
// POST { placeId: 'a:<lat>,<lng>:<name>' }  ->  { ok, address, metro, changes } | { error: 'sign_in' | 'bad_place' | 'not_glimpsed' | 'server' }
// Deploy: supabase functions deploy set-hearth

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';

const SITE = 'https://eldermaps.com';
let metros: { id: string; lat: number; lng: number; radiusKm: number }[] | null = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const b = (await req.json().catch(() => ({}))) as { placeId?: unknown };
  const placeId = typeof b.placeId === 'string' ? b.placeId : '';
  const m = /^a:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?):(\S{1,200})$/.exec(placeId);
  if (!m) return reply(req, { error: 'bad_place' }, 400);
  const lat = Number(m[1]), lng = Number(m[2]);
  let address = '';
  try { address = decodeURIComponent(m[3]); } catch { return reply(req, { error: 'bad_place' }, 400); }
  const db = serviceClient();
  const { data: owned } = await db.from('unlocks').select('place_id').eq('user_id', user).eq('place_id', placeId).maybeSingle();
  if (!owned) return reply(req, { error: 'not_glimpsed' }, 403);
  if (!metros) { try { metros = (await (await fetch(`${SITE}/data/metros-index.json`)).json()) as typeof metros; } catch { metros = []; } }
  let best: { id: string; gap: number } | null = null;
  for (const mt of metros ?? []) {
    const gap = Math.hypot((mt.lat - lat) * 111.32, (mt.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180)) - mt.radiusKm;
    if (gap <= 0 && (!best || gap < best.gap)) best = { id: mt.id, gap };
  }
  const { data: home } = await db.from('user_home').select('home_changes').eq('user_id', user).maybeSingle();
  const changes = ((home?.home_changes as number | undefined) ?? 0) + 1;
  const { error } = await db.from('user_home').update({ address, lat, lng, place_id: placeId, home_metro: best?.id ?? null, home_changes: changes, updated_at: new Date().toISOString() }).eq('user_id', user);
  if (error) return reply(req, { error: 'server' }, 500);
  return reply(req, { ok: true, address, metro: best?.id ?? null, changes });
});
