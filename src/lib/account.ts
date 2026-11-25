// Accounts: signing in (an emailed link, then the serf number), the character, the home and the septims. The twin of WastelandMaps' account.ts, cut down to what step 1 needs.

import { APP_SCHEME, NATIVE_AUTH_REDIRECT, isNative } from './native';
import { useCallback, useEffect, useState } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Whether the server is configured (the site works as a plain map without it). */
export const accountsEnabled = !!URL && !!ANON;

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!client) client = createClient(URL as string, ANON as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

/** 1 credit = 100 septims. */
export const SEPTIMS_PER_CREDIT = 100;
export const septims = (credits: number): number => credits * SEPTIMS_PER_CREDIT;

/** The kinds of character, with the names people see (our own) and a line about each. The ids are what is stored. */
export const CHARACTER_TYPES: { id: string; name: string; blurb: string }[] = [
  { id: 'frostkin', name: 'Frostkin', blurb: 'Tall northern clansfolk, at home in snow and smoke.' },
  { id: 'highmarcher', name: 'Highmarchers', blurb: 'Knights and mages of the misty castles.' },
  { id: 'sunblade', name: 'Sunblades', blurb: 'Desert sword-masters, quick and proud.' },
  { id: 'maned', name: 'Maned', blurb: 'Cat-folk traders and thieves of the sunlit south.' },
  { id: 'scalekin', name: 'Scalekin', blurb: 'Lizard-folk of the marsh, patient and strange.' },
  { id: 'emberkin', name: 'Emberkin', blurb: 'Ash-skinned elves with red eyes and long memories.' },
  { id: 'gilded', name: 'Gilded', blurb: 'Golden high elves of the crystal isle.' },
  { id: 'greenkin', name: 'Greenkin', blurb: 'Forest elves, light of foot and sharp of eye.' },
  { id: 'tuskborn', name: 'Tuskborn', blurb: 'Stronghold orcs, forge-smiths and fierce friends.' },
  { id: 'aurelian', name: 'Aurelians', blurb: 'Imperial folk of the roads and the marble cities.' },
];

export interface Profile { characterName: string | null; characterType: string | null; /** 'm' or 'f' */ characterSex: 'm' | 'f' | null; /** The city whose shield is theirs, and its country. */ sigilCity: string | null; sigilIso: string | null }
export interface Home { address?: string; lat?: number; lng?: number; placeId?: string; hearthNumber?: number; skipped: boolean }

export interface Account {
  session: Session | null;
  email: string | null;
  /** Whether the first look at the account has finished. */
  loaded: boolean;
  profile: Profile | null;
  home: Home | null;
  /** The septims held. */
  septims: number;
  /** Points earned by discovering places (they fill the level bar). */
  points: number;
  /** The loot in the bag, by kind, and what is carried. */
  loot: Record<string, number>;
  pack: { potions: number; shouts: number; dual: boolean };
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAccount(): Account {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(!accountsEnabled);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [loot, setLoot] = useState<Record<string, number>>({});
  const [pack, setPack] = useState({ potions: 0, shouts: 0, dual: false });

  useEffect(() => {
    if (!accountsEnabled) return;
    const { data } = db().auth.onAuthStateChange((_event, s) => setSession(s));
    void db().auth.getSession().then(({ data: d }) => setSession(d.session));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!accountsEnabled) return;
    const s = (await db().auth.getSession()).data.session;
    if (!s) { setProfile(null); setHome(null); setBalance(0); setLoot({}); setPack({ potions: 0, shouts: 0, dual: false }); setLoaded(true); return; }
    const [p, h, c, lb, pk, ds] = await Promise.all([
      db().from('profiles').select('character_name,character_type,character_sex,sigil_city,sigil_iso').eq('user_id', s.user.id).maybeSingle(),
      db().from('user_home').select('place_id,address,lat,lng,hearth_number,skipped').eq('user_id', s.user.id).maybeSingle(),
      db().from('credits').select('balance').eq('user_id', s.user.id).maybeSingle(),
      db().from('loot_bag').select('loot_id,qty').eq('user_id', s.user.id),
      db().from('pack').select('potions,shouts,dual').eq('user_id', s.user.id).maybeSingle(),
      db().from('discoveries').select('points').eq('user_id', s.user.id),
    ]);
    const bag: Record<string, number> = {};
    for (const r of (lb.data ?? []) as { loot_id: string; qty: number }[]) bag[r.loot_id] = r.qty;
    setLoot(bag);
    setPack({ potions: pk.data?.potions ?? 0, shouts: pk.data?.shouts ?? 0, dual: !!pk.data?.dual });
    setProfile(p.data ? { characterName: p.data.character_name ?? null, characterType: p.data.character_type ?? null, characterSex: p.data.character_sex === 'f' ? 'f' : p.data.character_sex === 'm' ? 'm' : null, sigilCity: p.data.sigil_city ?? null, sigilIso: p.data.sigil_iso ?? null } : { characterName: null, characterType: null, characterSex: null, sigilCity: null, sigilIso: null });
    setHome(h.data ? { placeId: h.data.place_id ?? undefined, address: h.data.address ?? undefined, lat: h.data.lat ?? undefined, lng: h.data.lng ?? undefined, hearthNumber: h.data.hearth_number ?? undefined, skipped: !!h.data.skipped } : null);
    setBalance((c.data?.balance as number | undefined) ?? 0);
    setPoints(((ds.data ?? []) as { points: number }[]).reduce((n, r) => n + (r.points ?? 0), 0));
    setLoaded(true);
  }, []);

  useEffect(() => { if (accountsEnabled) void refresh(); }, [session?.user.id, refresh]);

  const signOut = useCallback(async () => { await db().auth.signOut(); setProfile(null); setHome(null); setBalance(0); }, []);

  return { session, email: session?.user.email ?? null, loaded, profile, home, septims: septims(balance), points, loot, pack, refresh, signOut };
}

/** Sends the emailed sign-in link. Null when it went; else a message. */
export async function sendSignInLink(email: string): Promise<string | null> {
  const { error } = await db().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: isNative() ? NATIVE_AUTH_REDIRECT : window.location.origin + window.location.pathname } });
  if (!error) return null;
  return /rate|seconds|too many/i.test(error.message) ? 'A link was sent a moment ago. Give it a minute, then ask again.' : 'The link could not be sent. Check the address and try again.';
}

/** Signs in with the email and the four-digit hearth number. Null when it worked, else a message. Five wrong tries lock it until it is reset by an emailed link. */
export async function signInWithHearth(email: string, digits: string): Promise<string | null> {
  try {
    const res = await fetch(`${URL}/functions/v1/hearth-sign-in`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON as string, Authorization: `Bearer ${ANON}` }, body: JSON.stringify({ email, digits }) });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; access_token?: string; refresh_token?: string; error?: string; left?: number };
    if (body.ok && body.access_token && body.refresh_token) {
      const { error } = await db().auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
      return error ? 'Signing in did not go through. Try again.' : null;
    }
    if (body.error === 'locked') return 'Too many wrong tries: this account is locked. Write to support@eldermaps.com and we will unlock it.';
    if (body.error === 'wrong') return `That email and number do not match.${typeof body.left === 'number' && body.left > 0 ? ` ${body.left} ${body.left === 1 ? 'try' : 'tries'} left.` : ''}`;
    return 'Signing in did not go through. Check your connection and try again.';
  } catch { return 'Signing in did not go through. Check your connection and try again.'; }
}

/** Saves the character and the home, then sets the hearth password from the saved number. Null when it all went; else a message. */
export async function saveSetup(userId: string, p: { characterName: string; characterType: string; characterSex: 'm' | 'f'; sigilCity: string; sigilIso: string; address: string; lat: number; lng: number; placeId?: string; hearthNumber: number }): Promise<string | null> {
  const prof = await db().from('profiles').upsert({ user_id: userId, character_name: p.characterName, character_type: p.characterType, character_sex: p.characterSex, sigil_city: p.sigilCity, sigil_iso: p.sigilIso, updated_at: new Date().toISOString() });
  if (prof.error) return prof.error.code === '23505' ? 'That name is taken. Choose another.' : 'The character could not be saved. Try again.';
  const home = await db().from('user_home').upsert({ user_id: userId, address: p.address, lat: p.lat, lng: p.lng, place_id: p.placeId ?? null, hearth_number: p.hearthNumber, skipped: false, updated_at: new Date().toISOString() });
  if (home.error) return home.error.code === '23505' ? `Serf number ${String(p.hearthNumber).padStart(4, '0')} already belongs to someone else. Pick a different number.` : 'The home could not be saved. Try again.';
  const { error } = await db().functions.invoke('set-hearth-password', { body: {} });
  return error ? 'Saved, but the number could not be set as your password. Open the account again to retry.' : null;
}

// ---- discoveries ----

/** The ids of the places this person has discovered (kept on the account, so they follow them to any device). */
export async function loadFound(userId: string): Promise<string[]> {
  const { data } = await db().from('found_places').select('place_id').eq('user_id', userId);
  return ((data ?? []) as { place_id: string }[]).map((r) => r.place_id);
}

/** Tells the server a place was reached on foot: it checks the position, records the discovery and answers with the points it added. Null if it could not be recorded. */
export async function reportDiscovery(userId: string, spot: { id: string; name: string; real: string; lat: number; lng: number; kind?: string }, here: { lat: number; lng: number }, metroId?: string): Promise<{ added: number; total: number; loot?: Record<string, number> | null } | null> {
  const kept = await db().from('found_places').upsert({ user_id: userId, place_id: spot.id, name: spot.name, old_name: spot.real !== spot.name ? spot.real : null, lat: spot.lat, lng: spot.lng }, { onConflict: 'user_id,place_id', ignoreDuplicates: true });
  void kept;
  const { data, error } = await db().functions.invoke('report-discovery', { body: { placeId: spot.id, lat: spot.lat, lng: spot.lng, userLat: here.lat, userLng: here.lng, ...(metroId ? { metroId, points: spot.kind === 'crest' ? 50 : 30 } : {}) } });
  return error || !data ? null : (data as { added: number; total: number; loot?: Record<string, number> | null });
}

/** Deletes the account and everything tied to it. The server needs the word DELETE and the serf number. Null when it is gone; else a message. */
export async function deleteAccount(serf: string): Promise<string | null> {
  const { data, error } = await db().functions.invoke('delete-account', { body: { confirm: 'DELETE', serf } });
  if (!error && (data as { ok?: boolean } | null)?.ok) { await db().auth.signOut(); return null; }
  let reason = 'server';
  const response = (error as { context?: Response } | null)?.context;
  if (response) { try { reason = ((await response.json()) as { error?: string }).error ?? 'server'; } catch { /* no body */ } }
  return reason === 'wrong_serf' ? 'THAT IS NOT YOUR SERF NUMBER.' : 'THE ACCOUNT COULD NOT BE DELETED. TRY AGAIN IN A MOMENT.';
}

/** The app was opened by the sign-in email's link (com.eldermaps.app://auth#access_token=...): finish signing in with it. */
export async function completeSignInFromUrl(url: string): Promise<boolean> {
  if (!url.startsWith(NATIVE_AUTH_REDIRECT) && !url.startsWith(APP_SCHEME)) return false;
  const hash = new URLSearchParams(url.includes('#') ? url.slice(url.indexOf('#') + 1) : '');
  const query = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '');
  const access = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  if (access && refresh) {
    const { error } = await db().auth.setSession({ access_token: access, refresh_token: refresh });
    return !error;
  }
  const code = query.get('code');
  if (code) {
    const { error } = await db().auth.exchangeCodeForSession(code);
    return !error;
  }
  return false;
}
