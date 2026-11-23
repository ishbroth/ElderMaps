// Gives a person's account the password they sign in with afterwards: derived from their home's hearth number (the four digits they chose).
// The number comes from their saved home on the server, never from the request. Called after a home is saved or its number changes.
//
// POST {}  ->  { ok: true } | { error }
// Deploy: supabase functions deploy set-hearth-password

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';
import { hearthPassword } from '../_shared/hearthPassword.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const db = serviceClient();
  const { data: home } = await db.from('user_home').select('hearth_number').eq('user_id', user).maybeSingle();
  if (!home || home.hearth_number === null || home.hearth_number === undefined) return reply(req, { error: 'no_number' }, 400);
  const { data: who } = await db.auth.admin.getUserById(user);
  const email = who?.user?.email ?? null;
  let password: string;
  try { password = await hearthPassword(user, String(home.hearth_number).padStart(4, '0')); } catch (e) { console.error('no password secret', e instanceof Error ? e.message : e); return reply(req, { error: 'server' }, 500); }
  const { error } = await db.auth.admin.updateUserById(user, { password });
  if (error) { console.error('set password failed', error.message); return reply(req, { error: 'server' }, 500); }
  // a new number from an emailed link also opens a vault that was locked by wrong tries
  if (email) await db.rpc('vault_login_reset', { p_email: email });
  return reply(req, { ok: true });
});
