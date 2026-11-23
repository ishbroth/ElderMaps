// A place was reached on foot. The server checks that the person really was near it (the phone's own position against the place's), and records the discovery with its points
// (XP). Nothing but this function writes the discoveries table, so nobody can award themselves places; each place counts once per person.
//
// POST { placeId, lat, lng, userLat, userLng, points? }  ->  { added, total } | { error }
//   added: points this place added (0 if it was already on the record); loot: what a place cleared earlier paid now that it was reached
// Deploy: supabase functions deploy report-discovery

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';

const REACH_M = 900; // a little more than the phone's own 500 m, for a slow or poor position
const WORTHS = [10, 15, 20, 30, 50, 75];

const km = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const placeId = typeof b.placeId === 'string' ? b.placeId.slice(0, 200) : '';
  const [lat, lng, userLat, userLng] = [b.lat, b.lng, b.userLat, b.userLng].map(Number);
  if (!placeId || ![lat, lng, userLat, userLng].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(userLat) > 90) return reply(req, { error: 'bad_request' }, 400);
  if (km(lat, lng, userLat, userLng) * 1000 > REACH_M) return reply(req, { error: 'too_far' }, 403);
  const asked = Number(b.points);
  const points = WORTHS.includes(asked) ? asked : 10;

  const db = serviceClient();
  const { data: done } = await db.from('discoveries').select('place_id').eq('user_id', user).eq('place_id', placeId).maybeSingle();
  let added = 0;
  if (!done) {
    const { error } = await db.from('discoveries').insert({ user_id: user, place_id: placeId, points });
    if (!error) added = points;
  }
  // a place cleared before it was visited pays what it was holding, now that it has been reached
  const { data: held } = await db.rpc('claim_loot', { p_user: user, p_place: placeId });
  const { data: rows } = await db.from('discoveries').select('points').eq('user_id', user);
  const total = (rows ?? []).reduce((sum, r) => sum + (r.points as number), 0);
  return reply(req, { added, total, loot: held ?? null });
});
