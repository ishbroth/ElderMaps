// Signing in with an email and a four-digit hearth number. The only way in with a hearth number: the real password behind the number is not guessable (see
// _shared/hearthPassword.ts), so every guess comes through here, and five wrong tries lock it until its owner resets the number through an emailed link
// (set-hearth-password clears the lock). The try is counted BEFORE it is checked (one atomic step in the database), so parallel guesses cannot sneak past the limit.
//
// POST { email, digits }  ->  { ok: true, access_token, refresh_token }  |  { error: 'wrong', left } 401  |  { error: 'locked' } 423
// Deploy: supabase functions deploy hearth-sign-in

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, reply, serviceClient } from '../_shared/common.ts';
import { hearthPassword } from '../_shared/hearthPassword.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const { email: rawEmail, digits } = (await req.json().catch(() => ({}))) as { email?: unknown; digits?: unknown };
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || typeof digits !== 'string' || !/^\d{4}$/.test(digits)) return reply(req, { error: 'wrong', left: 0 }, 401);

  const db = serviceClient();
  const { data: tried, error } = await db.rpc('vault_login_try', { p_email: email, p_max: 5 });
  const t = Array.isArray(tried) ? tried[0] : tried;
  if (error || !t) return reply(req, { error: 'server' }, 500);
  if (t.allowed !== true) return reply(req, { error: 'locked' }, 423);
  const left = Math.max(0, 5 - Number(t.fails));

  const { data: uid } = await db.rpc('user_id_by_email', { p_email: email });
  if (typeof uid === 'string') {
    try {
      const password = await hearthPassword(uid, digits);
      const anon = createClient(Deno.env.get('SUPABASE_URL') as string, Deno.env.get('SUPABASE_ANON_KEY') as string, { auth: { persistSession: false } });
      const { data, error: signInError } = await anon.auth.signInWithPassword({ email, password });
      if (!signInError && data.session) {
        await db.rpc('vault_login_reset', { p_email: email });
        return reply(req, { ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      }
    } catch (e) { console.error('hearth sign-in failed', e instanceof Error ? e.message : e); return reply(req, { error: 'server' }, 500); }
  }
  // wrong (an email nobody has answers the same way, so this does not tell anyone which emails have a home)
  return reply(req, left === 0 ? { error: 'locked' } : { error: 'wrong', left }, left > 0 ? 401 : 423);
});
