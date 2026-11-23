import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { distanceMeters, getFix, watchFix, type LatLng } from './lib/geo';
import { findPlace, loadGoogle } from './lib/google';
import { createHtmlMarker, type HtmlMarkerHandle } from './lib/htmlMarker';
import { glyph, glyphForCategory } from './lib/glyphs';
import { settlementPic, wildPic } from './lib/glyphsMore';
import { crestSvg, loadCrests } from './lib/crests';
import { KIND_TITLE, PROVINCES, SEAS, loreName, placeLine, type ProvinceId } from './lib/lore';
import { flightsUrl, formatDistance, formatMinutes, isOverseas, progressAlong, requestRoute, turnArrow, type NavRoute } from './lib/navigation';
import { LOCAL_STYLE, PALETTE, WORLD_STYLES, localStyleFor, roadKitFor, roadKitName, type LookId } from './lib/styles';
import { createStreetLayer, type StreetLayer } from './lib/streets';
import SceneView from './SceneView';
import { createVivid, type Vivid } from './lib/vivid';
import AccountModal from './Account';
import { accountsEnabled, loadFound, reportDiscovery, useAccount } from './lib/account';
import { nordify, setVoiceEnabled, speak, spokenDistance, stopSpeaking, voiceAvailable, voiceEnabled } from './lib/voice';
import { loadWorld, type World } from './lib/world';
import TornFrame from './TornFrame';
import TintLayer from './TintLayer';

/** One thing on the map that can be picked. */
interface Spot {
  id: string;
  kind: string;
  real: string;
  name: string;
  province: ProvinceId;
  lat: number;
  lng: number;
  fame: number;
  /** A line about it (a hold capital's metro size, a wild place's kind). */
  note: string;
  /** Which pictogram, when the kind has more than one (farm, mill or mine for a village). */
  pic?: string;
  /** The country, for the crest of a city. */
  iso2?: string;
}

const MAX_ZOOM = 11; // the map stops at about city level: the crest over downtown and the key places round it
const SEEN_KEY = 'eldermaps:seen';

const townCount = (zoom: number): number => (zoom < 5 ? 0 : zoom === 5 ? 140 : zoom === 6 ? 520 : 1e9);
const villageCount = (zoom: number): number => (zoom < 6 ? 0 : zoom === 6 ? 150 : zoom === 7 ? 700 : 1e9);
const crestCount = (zoom: number): number => (zoom <= 3 ? 36 : zoom === 4 ? 70 : zoom === 5 ? 110 : zoom === 6 ? 260 : 1e9);
/** A few world-famous natural landmarks and parks that stay on the map even fully zoomed out (the rest come in as you zoom). */
const FAMOUS_LOW = new Set(['Yellowstone National Park', 'Victoria Falls', 'Iguaçu Falls', 'Angel Falls', 'Grand Canyon National Park', 'Serengeti National Park', 'Galápagos National Park', 'Niagara Falls', 'Mount Everest', 'Mont Blanc']);
const famousFar = (name: string, type: string, fame: number): boolean => FAMOUS_LOW.has(name) || (fame >= 125 && type !== 'keep' && type !== 'fort' && type !== 'tower');
const wildFame = (zoom: number): number => (zoom <= 3 ? 1e9 : zoom === 4 ? 110 : zoom === 5 ? 55 : zoom === 6 ? 26 : zoom === 7 ? 12 : zoom === 8 ? 6 : 0);

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}

function pinElement(spot: Spot, ink: string, seen: boolean, labelled: boolean, onPick: () => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `em-pin em-k-${spot.kind}${seen ? ' em-seen' : ''}`;
  el.style.setProperty('--pin', ink);
  el.setAttribute('aria-label', spot.name);
  const icon = document.createElement('span');
  icon.className = 'em-ico';
  icon.innerHTML = spot.kind === 'crest' ? crestSvg(spot.real, spot.iso2) : glyph(spot.pic ?? (spot.kind === 'landmark' ? glyphForCategory(spot.note) : spot.kind));
  el.appendChild(icon);
  if (labelled) {
    const label = document.createElement('span');
    label.className = 'em-lab';
    label.textContent = spot.name;
    el.appendChild(label);
  }
  el.addEventListener('click', (e) => { e.stopPropagation(); onPick(); });
  return el;
}

function wordLabel(text: string, className: string, color: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  el.style.color = color;
  return el;
}

export default function App() {
  const mapBox = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [problem, setProblem] = useState('');
  const [ready, setReady] = useState(false);
  const [look, setLook] = useState<LookId>(() => { const l = localStorage.getItem('eldermaps:look'); return l === 'oblivion' || l === 'vivid' ? l : 'skyrim'; });
  // the vivid look's two layers (the relief and the clouds), and whether the clouds are on
  const vividRef = useRef<Vivid | null>(null);
  const [cloudsOn, setCloudsOn] = useState(true);
  const cloudsRef = useRef(true);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen());
  const [voiceOn, setVoiceOn] = useState(() => voiceEnabled());
  const [trip, setTrip] = useState<{ to: Spot; route: NavRoute; step: number; toTurn: number; remaining: number; gps: boolean } | null>(null);
  const [zoomShown, setZoomShown] = useState(4);

  const pins = useRef(new Map<string, { handle: HtmlMarkerHandle; key: string }>());
  const labels = useRef<HtmlMarkerHandle[]>([]);
  const tripRef = useRef(trip);
  const lookRef = useRef(look);
  const seenRef = useRef(seen);
  const [viewing, setViewing] = useState<Spot | null>(null);
  // the state or province a tapped place is in (asked of Google once per place)
  const [regionName, setRegionName] = useState<string | null>(null);
  const regionCache = useRef(new Map<string, string | null>());
  const account = useAccount();
  const [accountOpen, setAccountOpen] = useState(false);
  // a new sign-in opens the making of a character by itself, once
  const setupShown = useRef(false);
  useEffect(() => {
    if (setupShown.current || !account.session || !account.loaded) return;
    if (!account.profile?.characterName || !account.home?.hearthNumber) { setupShown.current = true; setAccountOpen(true); }
  }, [account.session, account.loaded, account.profile?.characterName, account.home?.hearthNumber]);
  const toastTimer = useRef<number | undefined>(undefined);
  const roadLayers = useRef<{ line?: google.maps.Polyline; halo?: google.maps.Polyline; end?: HtmlMarkerHandle; me?: HtmlMarkerHandle }>({});
  const savedView = useRef<{ center: LatLng; zoom: number } | null>(null);
  const spokenStep = useRef(-1);
  const spokenNear = useRef(-1);

  useEffect(() => { tripRef.current = trip; }, [trip]);
  useEffect(() => { lookRef.current = look; localStorage.setItem('eldermaps:look', look); document.documentElement.dataset.look = look; }, [look]);
  // the state or province of a tapped place, for its card (asked of Google once per place)
  useEffect(() => {
    const spot = viewing ?? selected;
    if (!spot) { setRegionName(null); return; }
    const key = spot.lat.toFixed(3) + ',' + spot.lng.toFixed(3);
    if (regionCache.current.has(key)) { setRegionName(regionCache.current.get(key) ?? null); return; }
    setRegionName(null);
    let off = false;
    new google.maps.Geocoder().geocode({ location: { lat: spot.lat, lng: spot.lng } }).then(({ results }) => {
      const part = results.flatMap((r) => r.address_components).find((c) => c.types.includes('administrative_area_level_1'));
      const name = part?.long_name ?? null;
      regionCache.current.set(key, name);
      if (!off) setRegionName(name);
    }).catch(() => { regionCache.current.set(key, null); });
    return () => { off = true; };
  }, [selected, viewing]);
  // signed in, the places found on the account fill in on the map (with what this device already knew)
  const accountRef = useRef(account);
  useEffect(() => { accountRef.current = account; }, [account]);
  useEffect(() => {
    const id = account.session?.user.id;
    if (!id) return;
    void loadFound(id).then((ids) => { if (ids.length) setSeen((prev) => new Set([...prev, ...ids])); });
  }, [account.session?.user.id]);
  useEffect(() => { seenRef.current = seen; try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* storage unavailable */ } }, [seen]);

  const say = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 4200);
  }, []);

  const discover = useCallback((spot: Spot, here?: LatLng) => {
    if (seenRef.current.has(spot.id)) return;
    setSeen((prev) => new Set(prev).add(spot.id));
    say(`DISCOVERED: ${spot.name.toUpperCase()}`);
    // signed in and on the spot: the server checks the position, keeps the place on the account and gives the points
    const who = accountRef.current?.session;
    if (who && here) void reportDiscovery(who.user.id, spot, here).then((r) => { if (r && r.added > 0) { say(`DISCOVERED: ${spot.name.toUpperCase()} · +${r.added} XP`); void accountRef.current?.refresh(); } });
  }, [say]);

  // ---- start: Google and the world's data ----
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadGoogle(), loadWorld(), loadCrests()]).then(([, w]) => {
      if (cancelled || !mapBox.current) return;
      setWorld(w);
      const map = new google.maps.Map(mapBox.current, {
        center: { lat: 40, lng: -98 }, zoom: 4, minZoom: 3, maxZoom: MAX_ZOOM, mapTypeId: 'terrain', disableDefaultUI: true, zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM }, gestureHandling: 'greedy', clickableIcons: false,
        backgroundColor: PALETTE[lookRef.current].backdrop, styles: WORLD_STYLES[lookRef.current], keyboardShortcuts: false,
      });
      mapRef.current = map;
      map.data.addGeoJson(w.geojson);
      if (import.meta.env.DEV) (window as unknown as { __em?: google.maps.Map }).__em = map;
      setReady(true);
    }).catch((e: Error) => { if (!cancelled) setProblem(e.message); });
    return () => { cancelled = true; };
  }, []);

  // ---- the look: the map's style, the tint over each province ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!tripRef.current) map.setOptions({ styles: WORLD_STYLES[look], backgroundColor: PALETTE[look].backdrop });
    cloudsRef.current = cloudsOn;
    // the vivid look swaps Google's own map for our relief, with the clouds over it; the others are Google's terrain map as before
    if (!tripRef.current) {
      map.overlayMapTypes.clear();
      if (look === 'vivid' && world) {
        vividRef.current ??= createVivid(world.provinceAt);
        map.mapTypes.set('vivid', vividRef.current.base);
        map.setMapTypeId('vivid');
        if (cloudsOn) map.overlayMapTypes.push(vividRef.current.clouds);
      } else map.setMapTypeId('terrain');
    }
    map.data.setStyle(() => (look === 'vivid' && !tripRef.current
      ? { visible: true, clickable: false, fillOpacity: 0, strokeColor: '#ffffff', strokeOpacity: 0.3, strokeWeight: 1 }
      : { visible: false, clickable: false }));
  }, [look, ready, world, cloudsOn]);

  // ---- what is on the map at this view ----
  const refresh = useCallback(() => {
    const map = mapRef.current;
    if (!map || !world || tripRef.current) return;
    const zoom = Math.round(map.getZoom() ?? 4);
    setZoomShown(zoom);
    const view = map.getBounds()?.toJSON();
    if (!view) return;
    const padLat = (view.north - view.south) * 0.15;
    const padLng = (view.east > view.west ? view.east - view.west : 360 - view.west + view.east) * 0.15;
    const inView = (lat: number, lng: number) => lat <= view.north + padLat && lat >= view.south - padLat && (view.east >= view.west ? lng >= view.west - padLng && lng <= view.east + padLng : lng >= view.west - padLng || lng <= view.east + padLng);
    const ink = PALETTE[lookRef.current].ink;
    const wanted = new Map<string, { spot: Spot; labelled: boolean }>();
    // nothing sits on top of anything else: a pin yields to one placed before it (cities first) within a few pixels, and a name is only written where it has room
    const proj = map.getProjection();
    const scale = 256 * 2 ** (map.getZoom() ?? zoom);
    const taken: { x: number; y: number }[] = [];
    const written: { x: number; y: number; w: number }[] = [];
    // the map shows only icons and shields: a place's name is on its card when it is tapped
    const add = (spot: Spot, _wantsName: boolean) => {
      let labelled = false;
      if (wanted.size >= 700) return;
      let x = 0, y = 0;
      if (proj) {
        const pt = proj.fromLatLngToPoint(new google.maps.LatLng(spot.lat, spot.lng));
        if (pt) { x = pt.x * scale; y = pt.y * scale; }
        const room = spot.kind === 'crest' ? 40 : 19;
        if (taken.some((q) => Math.abs(q.x - x) < room && Math.abs(q.y - y) < room)) return;
        taken.push({ x, y });
        const w = Math.min(190, spot.name.length * 9);
        if (labelled && written.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 8 && Math.abs(q.y - y) < 25)) labelled = false;
        if (labelled) written.push({ x, y, w });
      }
      wanted.set(spot.id, { spot, labelled });
    };

    // the cities, biggest first and more of them as you come in: crests (the anchors of metros over a million), towns (smaller metros that stand alone),
    // and villages (every other city over 60,000, drawn as a farm, a mill or a mine)
    const tiers: [typeof world.cities.crest, number, 'crest' | 'town' | 'village', number][] = [
      [world.cities.crest, crestCount(zoom), 'crest', 220], [world.cities.town, townCount(zoom), 'town', 220], [world.cities.village, villageCount(zoom), 'village', 260],
    ];
    for (const [list, allowed, kind, cap] of tiers) {
      let shown = 0;
      for (let i = 0; i < list.length && i < allowed && shown < cap; i++) {
        const [name, lat, lng, pop, , iso2] = list[i];
        if (!inView(lat, lng)) continue;
        const province = world.provinceOfCountry(iso2);
        const pic = kind === 'village' || kind === 'town' ? settlementPic(kind, name, pop) : undefined;
        add({ id: `c:${name}:${lat}`, kind, real: name, name: loreName(name, province), province, lat, lng, fame: pop, pic, iso2,
          note: kind === 'village' ? 'A settlement of farms, mills and mines about a bigger place' : `${Math.round(pop / 1000).toLocaleString('en-US')} thousand souls` }, kind !== 'village' || zoom >= 7);
        shown++;
      }
    }
    // the key places round a city: the keep, the best-known landmarks, the towns and villages about it
    // the key places only gather round the cities marked as crests or towns
    const anchors = new Set([...world.cities.crest, ...world.cities.town].map((c) => `${c[0]}|${c[5]}`));
    if (zoom >= 9) {
      let count = 0;
      // how many of each kind round a city, by how close in the view is: a few at first, all of them at the closest
      const room = zoom === 9 ? 2 : zoom === 10 ? 4 : 7;
      for (const m of world.metros) {
        if (count > 160) break;
        if (!anchors.has(`${m.name}|${m.country}`) || !inView(m.lat, m.lng)) continue;
        const province = world.provinceOfCountry(m.country);
        const used = { landmark: 0, town: 0, keep: 0 };
        for (const [name, lat, lng, kind, category, fame] of world.keys[m.id] ?? []) {
          if (kind === 'town' || used[kind] >= room) continue;
          // the keep stands where the crest does unless the seat of government is out in the city
          if (kind === 'keep' && distanceMeters({ lat, lng }, { lat: m.lat, lng: m.lng }) < 2500) continue;
          used[kind]++;
          add({ id: `k:${m.id}:${name}`, kind, real: name, name: kind === 'keep' ? `${loreName(m.name, province)} Keep` : name, province, lat, lng, fame, note: kind === 'landmark' ? category : `Round ${loreName(m.name, province)}` }, kind !== 'landmark' || zoom >= 10);
          count++;
        }
      }
    }
    // the countryside: waterfalls, caves, ruins, forts, camps, beacons, fire mountains, springs, passes, glaciers, groves, shrines and peaks
    const fameFloor = wildFame(zoom);
    if (zoom >= 3) {
      let count = 0;
      for (const [id, name, lat, lng, type, fame] of world.wild) {
        if (count > 420) break;
        if ((fame < fameFloor && !(zoom <= 4 && famousFar(name, type, fame))) || !inView(lat, lng)) continue;
        const province = world.provinceAt(lat, lng);
        add({ id: `w:${id}`, kind: type, real: name, name: ['peak', 'volcano', 'glacier', 'grove'].includes(type) ? name : loreName(name, province), province, lat, lng, fame, pic: wildPic(type, name), note: KIND_TITLE[type] ?? type }, zoom >= 7);
        count++;
      }
    }

    // pins are added and taken away one by one, so the rest does not flicker
    for (const [id, pin] of pins.current) {
      const want = wanted.get(id);
      const key = want ? `${want.labelled}|${seenRef.current.has(id)}|${lookRef.current}` : '';
      if (!want || key !== pin.key) { pin.handle.setMap(null); pins.current.delete(id); }
    }
    for (const [id, { spot, labelled }] of wanted) {
      if (pins.current.has(id)) continue;
      const isSeen = seenRef.current.has(id);
      const handle = createHtmlMarker({ position: { lat: spot.lat, lng: spot.lng }, element: pinElement(spot, ink, isSeen, labelled, () => setSelected(spot)), zIndex: spot.kind === 'crest' ? 8 : 5 });
      handle.setMap(map);
      pins.current.set(id, { handle, key: `${labelled}|${isSeen}|${lookRef.current}` });
    }
  }, [world]);

  // the names of the provinces and the seas, written across the land and water at the far-out views
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    labels.current.forEach((h) => h.setMap(null));
    labels.current = [];
    if (trip || zoomShown > 7) return;
    const pal = PALETTE[look];
    if (zoomShown <= 6) {
      for (const p of Object.values(PROVINCES)) {
        const el = document.createElement('div');
        el.className = 'em-province';
        el.style.color = look !== 'oblivion' ? '#f2f2ee' : '#3b2a1a';
        el.innerHTML = `<b>${p.name}</b>`;
        const h = createHtmlMarker({ position: p.label, element: el, zIndex: 2 });
        h.setMap(map);
        labels.current.push(h);
      }
    }
    for (const sea of SEAS) {
      if (zoomShown > (sea.big ? 6 : 7) || (!sea.big && zoomShown < 4)) continue;
      const h = createHtmlMarker({ position: sea.at, element: wordLabel(sea.name, sea.big ? 'em-sea em-sea-big' : 'em-sea', pal.ocean), zIndex: 1 });
      h.setMap(map);
      labels.current.push(h);
    }
  }, [ready, look, zoomShown, trip]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const handle = map.addListener('idle', refresh);
    refresh();
    return () => handle.remove();
  }, [ready, refresh]);
  // a look or a discovery changes how pins are drawn
  useEffect(() => { refresh(); }, [look, seen, refresh]);

  // ---- search ----
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const map = mapRef.current;
    if (!q || !map) return;
    const hit = await findPlace(q);
    if (!hit) { say('NO SUCH PLACE ON THE MAP'); return; }
    if (hit.bounds) map.fitBounds(hit.bounds, 0); else { map.setCenter(hit.center); map.setZoom(10); }
    if ((map.getZoom() ?? 0) > 10) map.setZoom(10);
    say(hit.name.toUpperCase());
  };

  // ---- find myself, and discover what is within reach ----
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    if (!following || !world) return;
    const stop = watchFix((fix) => {
      const here = { lat: fix.lat, lng: fix.lng };
      if (!tripRef.current) {
        for (const m of world.metros.slice(0, 1500)) {
          if (Math.abs(m.lat - here.lat) > 0.2 || Math.abs(m.lng - here.lng) > 0.3) continue;
          for (const [name, lat, lng, kind] of world.keys[m.id] ?? []) {
            if (distanceMeters(here, { lat, lng }) < 500) discover({ id: `k:${m.id}:${name}`, kind, real: name, name, province: 'cyrodiil', lat, lng, fame: 0, note: '' }, here);
          }
        }
        for (const [id, name, lat, lng, type] of world.wild) {
          if (Math.abs(lat - here.lat) < 0.01 && Math.abs(lng - here.lng) < 0.015 && distanceMeters(here, { lat, lng }) < 500) discover({ id: `w:${id}`, kind: type, real: name, name, province: 'cyrodiil', lat, lng, fame: 0, note: '' }, here);
        }
      }
      // on the road
      const t = tripRef.current;
      if (t) {
        const p = progressAlong(t.route, here);
        setTrip({ ...t, step: p.step, toTurn: p.toTurn, remaining: p.remaining, gps: true });
        roadLayers.current.me?.setPosition(here);
        if (p.remaining < 60) arrive(t.to);
      }
    }, () => { setFollowing(false); say('THE ROAD CANNOT FIND YOU: LOCATION IS OFF'); });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following, world, discover]);

  const locate = async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const fix = await getFix();
      map.setCenter({ lat: fix.lat, lng: fix.lng });
      map.setZoom(10);
      setFollowing(true);
    } catch { say('THE ROAD CANNOT FIND YOU: LOCATION IS OFF'); }
  };

  // ---- fast travel: the road to a place, on the flat sketched map ----
  const streets = useRef<StreetLayer | null>(null);
  const clearRoad = useCallback(() => {
    streets.current?.detach();
    streets.current = null;
    const r = roadLayers.current;
    r.line?.setMap(null); r.halo?.setMap(null); r.end?.setMap(null); r.me?.setMap(null);
    roadLayers.current = {};
  }, []);

  const endTrip = useCallback(() => {
    stopSpeaking();
    clearRoad();
    const map = mapRef.current;
    setTrip(null);
    tripRef.current = null;
    if (map) {
      map.setOptions({ styles: WORLD_STYLES[lookRef.current], maxZoom: MAX_ZOOM, backgroundColor: PALETTE[lookRef.current].backdrop });
      // back to the map the look calls for (the vivid relief with its clouds, or Google's terrain)
      if (lookRef.current === 'vivid' && vividRef.current) {
        map.mapTypes.set('vivid', vividRef.current.base);
        map.setMapTypeId('vivid');
        map.overlayMapTypes.clear();
        if (cloudsRef.current) map.overlayMapTypes.push(vividRef.current.clouds);
        map.data.setStyle(() => ({ visible: true, clickable: false, fillOpacity: 0, strokeColor: '#ffffff', strokeOpacity: 0.3, strokeWeight: 1 }));
      } else map.setMapTypeId('terrain');
      if (savedView.current) { map.setCenter(savedView.current.center); map.setZoom(Math.min(MAX_ZOOM, savedView.current.zoom)); }
    }
  }, [clearRoad]);

  function arrive(to: Spot) {
    speak(nordify('Arrive at your destination'));
    discover(to);
    say(`YOU HAVE ARRIVED AT ${to.name.toUpperCase()}`);
    window.setTimeout(endTrip, 2600);
  }

  const startTravel = async (to: Spot) => {
    const map = mapRef.current;
    if (!map) return;
    say('FINDING THE ROAD…');
    const here = await getFix({ timeout: 8000 }).then((f) => ({ lat: f.lat, lng: f.lng })).catch(() => null);
    const from = here ?? { lat: map.getCenter()?.lat() ?? to.lat, lng: map.getCenter()?.lng() ?? to.lng };
    const dest = { lat: to.lat, lng: to.lng };
    if (isOverseas(from, dest)) {
      say('TOO FAR FOR ANY ROAD: A SEA VOYAGE');
      window.open(flightsUrl(to.real), '_blank', 'noopener');
      return;
    }
    const answer = await requestRoute(from, dest);
    if (answer.kind !== 'route') { say(answer.kind === 'no_route' ? 'NO ROAD LEADS THERE' : 'THE ROAD CANNOT BE DRAWN RIGHT NOW'); return; }
    const route = answer.route;
    savedView.current = { center: { lat: map.getCenter()?.lat() ?? from.lat, lng: map.getCenter()?.lng() ?? from.lng }, zoom: map.getZoom() ?? 6 };
    pins.current.forEach((p) => p.handle.setMap(null));
    pins.current.clear();
    labels.current.forEach((h) => h.setMap(null));
    labels.current = [];
    setSelected(null);
    // the flat map
    // the streets are drawn in the style of the region the journey starts in (cold stone tracks in the north, cobbles in the heartland, ash roads, sand, mud...)
    const region = world ? world.provinceAt(from.lat, from.lng) : 'cyrodiil';
    const kit = roadKitFor(region);
    map.setOptions({ styles: world ? localStyleFor(region) : LOCAL_STYLE, maxZoom: 19, backgroundColor: kit.ground });
    map.setMapTypeId('roadmap');
    map.overlayMapTypes.clear();
    map.data.setStyle(() => ({ visible: false, clickable: false }));
    // the real streets and buildings of the view, redrawn in the region's style on top (cobbles, ruts, ash, sand, mud)
    streets.current?.detach();
    streets.current = createStreetLayer(map, kit, roadKitName(region));
    const bounds = new google.maps.LatLngBounds();
    route.path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 90);
    roadLayers.current.halo = new google.maps.Polyline({ map, path: route.path, strokeColor: '#e9dcb8', strokeWeight: 9, strokeOpacity: 0.95, zIndex: 3 });
    roadLayers.current.line = new google.maps.Polyline({ map, path: route.path, strokeColor: '#7a2a1a', strokeWeight: 4.5, strokeOpacity: 0.95, zIndex: 4 });
    const endEl = pinElement(to, '#7a2a1a', true, true, () => undefined);
    roadLayers.current.end = createHtmlMarker({ position: dest, element: endEl, zIndex: 6 });
    roadLayers.current.end.setMap(map);
    const meEl = document.createElement('div');
    meEl.className = 'em-me';
    roadLayers.current.me = createHtmlMarker({ position: route.path[0] ?? from, element: meEl, zIndex: 7 });
    roadLayers.current.me.setMap(map);
    spokenStep.current = -1;
    spokenNear.current = -1;
    const t = { to, route, step: 0, toTurn: route.steps[0]?.meters ?? 0, remaining: route.meters, gps: !!here };
    tripRef.current = t;
    setTrip(t);
    setFollowing(!!here);
  };

  // the road speaks each new instruction, and again as the turn comes close
  useEffect(() => {
    if (!trip) return;
    const step = trip.route.steps[trip.step];
    if (!step) return;
    if (spokenStep.current !== trip.step) {
      spokenStep.current = trip.step;
      spokenNear.current = -1;
      speak(`${nordify(step.text)}. Then ${spokenDistance(step.meters)}.`);
    } else if (trip.gps && trip.toTurn < 300 && spokenNear.current !== trip.step && trip.step + 1 < trip.route.steps.length) {
      spokenNear.current = trip.step;
      speak(`In ${spokenDistance(trip.toTurn)}, ${nordify(trip.route.steps[trip.step + 1].text)}`);
    }
  }, [trip]);

  // without a position to follow, the traveller steps along by hand
  const nextStep = () => {
    const t = tripRef.current;
    if (!t) return;
    const next = t.step + 1;
    if (next >= t.route.steps.length) { arrive(t.to); return; }
    const from = t.route.steps[next].start;
    roadLayers.current.me?.setPosition(from);
    mapRef.current?.panTo(from);
    const rest = t.route.steps.slice(next).reduce((a, s) => a + s.meters, 0);
    setTrip({ ...t, step: next, toTurn: t.route.steps[next].meters, remaining: rest });
  };

  const pal = PALETTE[look];
  const step = trip?.route.steps[trip.step];
  const province = selected ? PROVINCES[selected.province] : null;
  const seenCount = seen.size;
  const hint = useMemo(() => (zoomShown >= MAX_ZOOM ? 'THE MAP ENDS AT THE CITY GATES' : ''), [zoomShown]);

  return (
    <div className={`em-app em-${look}${trip ? ' em-road' : ''}`} style={{ background: pal.backdrop }}>
      <div className="em-stage">
        <div ref={mapBox} className="em-map" />
        {ready && world && !trip && look !== 'vivid' && <TintLayer map={mapRef.current} world={world} look={look} />}
        <div className="em-vignette" aria-hidden="true" />
        {look === 'oblivion' && !trip && <TornFrame />}

        {!trip && (
          <header className="em-head">
            <div className="em-title"><h1>ELDERMAPS</h1><small>the world as an age-old realm</small></div>
            <form className="em-search" onSubmit={(e) => void search(e)}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Seek a city, a keep, a waterfall…" aria-label="Search for a place" />
              <button type="submit" aria-label="Search">⌕</button>
            </form>
            <div className="em-tools">
              <button type="button" onClick={() => setLook(look === 'skyrim' ? 'vivid' : look === 'vivid' ? 'oblivion' : 'skyrim')} title="Change the map's look">{look === 'skyrim' ? 'NORTHERN' : look === 'vivid' ? 'VIVID' : 'PARCHMENT'}</button>
              {look === 'vivid' && <button type="button" onClick={() => setCloudsOn(!cloudsOn)} title="Clouds over the map (yesterday's, from a satellite)">{cloudsOn ? '☁ CLOUDS' : '☁ OFF'}</button>}
              {accountsEnabled && <button type="button" onClick={() => setAccountOpen(true)} title="Your account">{account.session ? (account.profile?.characterName ?? 'YOU').toUpperCase().slice(0, 12) : 'ENTER'}</button>}
              <button type="button" onClick={() => void locate()} title="Find where you stand and discover what is near">{following ? '◉ ME' : '○ ME'}</button>
              {voiceAvailable() && <button type="button" onClick={() => { setVoiceEnabled(!voiceOn); setVoiceOn(!voiceOn); }} title="The road's voice">{voiceOn ? '♪ VOICE' : '♪ OFF'}</button>}
            </div>
          </header>
        )}

        {!trip && <div className="em-compass" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 3 29 24 24 45 19 24Z" fill="currentColor" /><path d="M3 24 24 19 45 24 24 29Z" fill="currentColor" opacity="0.5" /><text x="24" y="14" textAnchor="middle" fontSize="9" fill="#000">N</text></svg></div>}
        {!trip && <div className="em-count">{seenCount} PLACES DISCOVERED{hint ? ` · ${hint}` : ''}</div>}

        {!ready && !problem && <div className="em-loading">UNROLLING THE MAP…</div>}
        {problem && <div className="em-loading em-problem">{problem}</div>}
        {toast && <div className="em-toast" role="status">{toast}</div>}

        {selected && province && !trip && (
          <aside className="em-card" style={{ ['--prov' as string]: province.ink }}>
            <button type="button" className="em-card-x" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="em-card-icon" dangerouslySetInnerHTML={{ __html: selected.kind === 'crest' ? crestSvg(selected.real, selected.iso2) : glyph(selected.pic ?? (selected.kind === 'landmark' ? glyphForCategory(selected.note) : selected.kind)) }} />
            <h2>{selected.name}</h2>
            <p className="em-card-kind">{KIND_TITLE[selected.kind] ?? selected.kind} · {province.name}</p>
            {selected.real !== selected.name && <p className="em-card-real">in the old tongue: {selected.real}</p>}
            {selected.kind === 'crest' && <p className="em-card-note">{selected.note}</p>}
            <p className="em-card-blurb">{placeLine(province.id, regionName)}</p>
            <div className="em-card-buttons">
              <button type="button" className="em-btn" onClick={() => void startTravel(selected)}>FAST TRAVEL</button>
              <button type="button" className="em-btn em-btn-ghost" onClick={() => setViewing(selected)}>VIEW</button>
            </div>
          </aside>
        )}

        {viewing && !trip && (
          <SceneView spot={viewing} province={PROVINCES[viewing.province]} icon={viewing.kind === 'crest' ? crestSvg(viewing.real, viewing.iso2) : glyph(viewing.pic ?? (viewing.kind === 'landmark' ? glyphForCategory(viewing.note) : viewing.kind))}
            onNeedsAccount={(what) => { if (accountsEnabled && !account.session) { setViewing(null); setAccountOpen(true); } else say(`${what} IS NOT OPEN YET: IT COMES NEXT`); }} onTravel={() => { const v = viewing; setViewing(null); setSelected(null); void startTravel(v); }} onClose={() => setViewing(null)} />
        )}

        {accountOpen && !trip && <AccountModal account={account} onClose={() => setAccountOpen(false)} />}

        {trip && step && (
          <div className="em-nav">
            <div className="em-nav-turn">
              <span className="em-nav-arrow" aria-hidden="true">{turnArrow(step.text)}</span>
              <div className="em-nav-text"><b>{step.text}</b><i>{formatDistance(trip.toTurn)}</i></div>
            </div>
            <div className="em-nav-foot">
              <small>{formatDistance(trip.remaining)} · {formatMinutes((trip.remaining / Math.max(1, trip.route.meters)) * trip.route.seconds)} to {trip.to.name}</small>
              <div className="em-nav-buttons">
                {!trip.gps && <button type="button" className="em-btn em-btn-ghost" onClick={nextStep}>NEXT</button>}
                {voiceAvailable() && <button type="button" className="em-btn em-btn-ghost" onClick={() => { setVoiceEnabled(!voiceOn); setVoiceOn(!voiceOn); }}>{voiceOn ? '♪' : '♪ OFF'}</button>}
                <button type="button" className="em-btn" onClick={endTrip}>END</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
