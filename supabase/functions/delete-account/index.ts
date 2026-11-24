// Deletes the signed-in person's account and everything that belongs to it. Every table that holds their data refers to the account with "on delete cascade" (profile, home, finds,
// discoveries, septims, loot, pack, arsenal, raids, purchases, the house), so removing the account removes it all. Pictures that were made for places stay, without a name on them.
//
// It asks for two things so nobody deletes by accident or from a phone left unlocked: the word DELETE, and the person's serf number (their password).
// POST { confirm: 'DELETE', serf: '1234' }  ->  { ok: true } | { error: 'sign_in' | 'not_confirmed' | 'wrong_serf' | 'server' }
// Deploy: supabase functions deploy delete-account

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const body = (await req.json().catch(() => ({}))) as { confirm?: string; serf?: string };
  if (body.confirm !== 'DELETE') return reply(req, { error: 'not_confirmed' }, 400);
  const db = serviceClient();
  const { data: home } = await db.from('user_home').select('hearth_number').eq('user_id', user).maybeSingle();
  // an account that never finished setup has no serf number yet: it can be deleted on the word alone
  if (home?.hearth_number !== null && home?.hearth_number !== undefined) {
    if (!/^\d{4}$/.test(String(body.serf ?? '')) || Number(body.serf) !== home.hearth_number) return reply(req, { error: 'wrong_serf' }, 403);
  }
  const { error } = await db.auth.admin.deleteUser(user);
  if (error) { console.error('delete account failed', error.message); return reply(req, { error: 'server' }, 500); }
  return reply(req, { ok: true });
});
