// A glimpse: the picture of a place, re-imagined in the style of its land. Paid for in septims (credits) once per person; the picture itself is made once and shared with everyone who
// unlocks it after (and the first to pay is remembered, for the "Discovered by" line). It is made FROM the place's own photograph (a freely licensed one first, Street View only as
// the last resort), so it keeps that building's shape: never a generic building.
//
// POST { placeId, name, kind, lat, lng, province, metroId? }
//   ->  { status: 'ready', url, before?, credit, discovered: { by, at }, charged }  |  { status: 'working' }  |  { error }
//   errors: sign_in 401, bad_place 400, no_credits 402, no_photo 404, busy 429 (the day's cap), failed 502
// Needs the secrets GEMINI_API_KEY (and STREETVIEW_API_KEY, for the last-resort photo). Optional: GEMINI_MODEL (default gemini-3-pro-image), DAILY_RENDER_CAP (default 600 new pictures a day).
// Deploy: supabase functions deploy glimpse

import { callerId, corsHeaders, reply, serviceClient } from '../_shared/common.ts';
import { findPhotoFor, type PhotoHit } from '../_shared/photoSources.ts';
import { bestStreetView } from '../_shared/streetViews.ts';
import { keepsBuilding } from '../_shared/verifyRender.ts';
import { glimpsePrompt, KIT_OF_PROVINCE, kitFor, kitForStyle, STYLE_IDS } from '../_shared/glimpsePrompt.ts';
import { pickWaterFlavour, waterNear } from '../_shared/waterSetting.ts';

const SITE = 'https://eldermaps.com';
const STALE_MS = 8 * 60 * 1000;

const toBase64 = (bytes: Uint8Array): string => { let t = ''; for (let i = 0; i < bytes.length; i += 0x8000) t += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(t); };

/** The cities' marks (crest, town, village), so the price is decided here and not by what the phone says. */
let tiers: Map<string, string> | null = null;
async function cityTier(name: string, lat: number): Promise<string | null> {
  if (!tiers) {
    try {
      const list = (await (await fetch(`${SITE}/data/cities.json`)).json()) as [string, number, number, number, string][];
      tiers = new Map(list.map((c) => [`${c[0]}|${Math.round(c[1] * 100)}`, c[4]]));
    } catch { tiers = new Map(); }
  }
  return tiers.get(`${name}|${Math.round(lat * 100)}`) ?? null;
}

/** The metro whose area a point lies in (so a Town Legend can plot every place glimpsed in its city), or null in open country. */
let metros: { id: string; lat: number; lng: number; radiusKm: number }[] | null = null;
async function metroOf(lat: number, lng: number): Promise<string | null> {
  if (!metros) {
    try { metros = (await (await fetch(`${SITE}/data/metros-index.json`)).json()) as typeof metros; } catch { metros = []; }
  }
  let best: { id: string; gap: number } | null = null;
  for (const m of metros ?? []) {
    const gap = Math.hypot((m.lat - lat) * 111.32, (m.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180)) - m.radiusKm;
    if (gap <= 0 && (!best || gap < best.gap)) best = { id: m.id, gap };
  }
  return best?.id ?? null;
}

/** What it costs, in credits (1 credit = 100 septims): a big city (crest or town mark) 4, anywhere else 1. */
async function costOf(placeId: string): Promise<number> {
  if (!placeId.startsWith('c:')) return 1;
  const [, name, lat] = placeId.split(':');
  const tier = await cityTier(name, Number(lat));
  return tier === 'crest' || tier === 'town' ? 4 : 1;
}

async function download(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ElderMaps/1.0 (https://eldermaps.com; fan project)' } });
    if (!res.ok) return null;
    return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get('content-type')?.split(';')[0] || 'image/jpeg' };
  } catch { return null; }
}

async function generate(photo: { bytes: Uint8Array; mime: string }, prompt: string): Promise<Uint8Array> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('image generation is not set up');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3-pro-image';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: photo.mime, data: toBase64(photo.bytes) } }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
  });
  if (!res.ok) throw new Error(`image model said ${res.status}`);
  const body = await res.json();
  // deno-lint-ignore no-explicit-any
  const part = (body.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData?.data || p.inline_data?.data);
  const b64: string | undefined = part?.inlineData?.data ?? part?.inline_data?.data;
  if (!b64) throw new Error('the image model returned no image');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, { error: 'POST only' }, 405);
  const user = await callerId(req);
  if (!user) return reply(req, { error: 'sign_in' }, 401);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const placeId = typeof b.placeId === 'string' ? b.placeId : '';
  const name = typeof b.name === 'string' ? b.name.slice(0, 120) : '';
  const kind = typeof b.kind === 'string' && /^[a-z]{2,20}$/.test(b.kind) ? b.kind : 'landmark';
  const province = typeof b.province === 'string' && b.province in KIT_OF_PROVINCE ? b.province : 'cyrodiil';
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!/^[a-z]:\S{1,180}$/.test(placeId) || !name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return reply(req, { error: 'bad_place' }, 400);

  const db = serviceClient();
  const signed = async (path: string) => { const s = await db.storage.from('renders').createSignedUrl(path, 3600); return s.error || !s.data ? null : s.data.signedUrl; };
  const whoFound = async (row: { discovered_by: string | null; created_at: string }) => {
    if (!row.discovered_by) return null;
    const { data } = await db.from('profiles').select('character_name').eq('user_id', row.discovered_by).maybeSingle();
    return { by: (data?.character_name as string | undefined) ?? null, at: row.created_at };
  };

  // 1. the payment (nothing is charged for a place this person already paid for)
  const cost = await costOf(placeId);
  const { data: spent, error: spendError } = await db.rpc('unlock_place', { p_user: user, p_place: placeId, p_cost: cost });
  if (spendError) return reply(req, { error: 'failed' }, 500);
  if (spent === 'no_credits') return reply(req, { error: 'no_credits', cost }, 402);
  const charged = spent === 'spent';
  const giveBack = async () => { if (charged) await db.rpc('refund_unlock', { p_user: user, p_place: placeId }); };

  try {
    // 2. is the picture made already, or being made?
    const { data: row } = await db.from('renders').select('*').eq('place_id', placeId).maybeSingle();
    if (row?.status === 'ready' && row.storage_path) {
      const url = await signed(row.storage_path as string);
      if (!url) { await giveBack(); return reply(req, { error: 'failed' }, 502); }
      return reply(req, { status: 'ready', url, before: row.before_url ?? undefined, credit: row.credit, discovered: await whoFound(row), charged });
    }
    if (row?.status === 'generating' && Date.now() - new Date(row.started_at as string).getTime() < STALE_MS) return reply(req, { status: 'working' });

    // the day's cap on NEW pictures, so one bad day cannot run up a bill
    const cap = Number(Deno.env.get('DAILY_RENDER_CAP') ?? '600');
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const { count } = await db.from('renders').select('place_id', { count: 'exact', head: true }).gte('created_at', since.toISOString());
    if ((count ?? 0) >= cap) { await giveBack(); return reply(req, { error: 'busy' }, 429); }

    // the building style: the one the app worked out from where the place lies on the map (checked here), else the realm's own
    const style = typeof b.style === 'string' && STYLE_IDS.has(b.style) ? b.style : null;
    const kit = style ? kitForStyle(kind, style) : kitFor(kind, province);
    const metro = await metroOf(lat, lng);
    await db.from('renders').upsert({ place_id: placeId, place_name: name, kit, kind, metro_id: metro, status: 'generating', started_at: new Date().toISOString(), lat, lng, discovered_by: user, created_at: new Date().toISOString() }, { onConflict: 'place_id' });

    // 3. the photograph: a freely licensed one first, Street View as the last resort
    let hit: PhotoHit | null = null;
    try { hit = await findPhotoFor({ entityId: /^w:Q\d+$/.test(placeId) ? placeId.slice(2) : undefined, name, lat, lng, city: kind === 'crest' || kind === 'town' || kind === 'village', throwOnFailure: true }); } catch { /* a search failed: try the last resort */ }
    let photo: { bytes: Uint8Array; mime: string } | null = null;
    let credit: Record<string, string> | null = null;
    let beforeUrl: string | null = null;
    if (hit) {
      photo = await download(hit.imageUrl);
      credit = { photo: hit.title, author: hit.author, license: hit.license, page: hit.pageUrl };
      beforeUrl = hit.imageUrl;
    }
    if (!photo) {
      const sv = await bestStreetView(lat, lng, name, kind).catch(() => null);
      if (sv) { photo = sv; credit = { photo: 'Street View', author: 'Google', license: '', page: 'https://www.google.com/streetview/' }; beforeUrl = null; }
    }
    if (!photo) { await db.from('renders').delete().eq('place_id', placeId); await giveBack(); return reply(req, { error: 'no_photo' }, 404); }

    // the water beside the place, dressed with an eye to what is already made nearby (one waterwheel, one bridge to an area; the rest look onto the water)
    let waterText = '';
    if (!['waterfall', 'peak', 'volcano', 'glacier', 'grove', 'spring', 'pass', 'cave'].includes(kind)) {
      try {
        const near = await waterNear(lat, lng);
        if (near) {
          const { data: around } = await db.from('renders').select('water_flavour').not('water_flavour', 'is', null).neq('place_id', placeId).gte('lat', lat - 0.0028).lte('lat', lat + 0.0028).gte('lng', lng - 0.0036).lte('lng', lng + 0.0036);
          const f = pickWaterFlavour(near, province, placeId, (around ?? []).map((r) => String(r.water_flavour)));
          if (f) { waterText = f.text; await db.from('renders').update({ water_flavour: f.key }).eq('place_id', placeId); }
        }
      } catch { /* no water setting: the picture is made without one */ }
    }

    // 4. the picture, checked against the photograph (one more try if it is not the same structure)
    const streetLevel = credit?.author === 'Google' || credit?.photo === 'Street-level photograph';
    const prompt = glimpsePrompt(name, kind, kit, waterText, streetLevel);
    const skyline = kind === 'crest' || kind === 'town';
    let png = await generate(photo, prompt);
    // a city is checked against the photograph's skyline, and made again (up to twice) if its towers have wandered
    for (let tries = 0; tries < (skyline ? 2 : 1) && !(await keepsBuilding(photo, png, skyline)); tries++) png = await generate(photo, prompt + ' Be much stricter: copy the layout, the heights and the camera angle of the photograph exactly, changing only the style of the buildings.');

    const path = `${placeId.replace(/[^A-Za-z0-9_-]/g, '_')}.png`;
    const up = await db.storage.from('renders').upload(path, png, { contentType: 'image/png', upsert: true });
    if (up.error) throw new Error('could not keep the picture');
    await db.from('renders').update({ status: 'ready', storage_path: path, credit, before_url: beforeUrl, created_at: new Date().toISOString() }).eq('place_id', placeId);
    const url = await signed(path);
    if (!url) throw new Error('no link');
    const { data: fresh } = await db.from('renders').select('discovered_by,created_at').eq('place_id', placeId).maybeSingle();
    return reply(req, { status: 'ready', url, before: beforeUrl ?? undefined, credit, discovered: fresh ? await whoFound(fresh) : null, charged });
  } catch (e) {
    console.error('glimpse failed', e instanceof Error ? e.message : e);
    await db.from('renders').delete().eq('place_id', placeId).neq('status', 'ready');
    await giveBack();
    return reply(req, { error: 'failed' }, 502);
  }
});
