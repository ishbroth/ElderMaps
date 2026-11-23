// Shared by the server functions: CORS, JSON replies, the service client, and who is calling.

import { createClient } from 'npm:@supabase/supabase-js@2';

/** Where the app may be served from. Anything else is refused. */
const ALLOWED_ORIGINS = [
  'https://eldermaps.com', 'https://www.eldermaps.com', 'http://localhost:5173', 'http://localhost:5174',
  // the apps (Capacitor): iOS serves its pages from capacitor://localhost, Android from https://localhost
  'capacitor://localhost', 'https://localhost', 'http://localhost', 'ionic://localhost',
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function reply(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });
}

export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL') as string, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string, { auth: { persistSession: false } });
}

/** The signed-in person making this request, or null. */
export async function callerId(req: Request): Promise<string | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await serviceClient().auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

/** What a pack of septims costs and gives (1 credit = 100 septims). The server decides this; the browser only asks for a pack by name. */
export const PACKS: Record<string, { credits: number; cents: number; label: string }> = {
  septims400: { credits: 4, cents: 99, label: '400 septims' },
  septims1800: { credits: 18, cents: 399, label: '1,800 septims' },
  septims4400: { credits: 44, cents: 999, label: '4,400 septims' },
};
