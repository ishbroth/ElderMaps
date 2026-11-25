import Coin from './Coin';
import { useEffect, useRef, useState } from 'react';
import type { Spot } from './App';
import { createHtmlMarker, type HtmlMarkerHandle } from './lib/htmlMarker';
import { glyph } from './lib/glyphs';
import { settlementPic, wildPic } from './lib/glyphsMore';
import { PROVINCES, loreName, type ProvinceId } from './lib/lore';
import { createStreetLayer, type StreetLayer } from './lib/streets';
import { localStyleFor, roadKitFor, roadKitName } from './lib/styles';
import { legendPlaces, legendStatus, legendUnlock, type LegendStatus } from './lib/townLegend';
import type { Metro, World } from './lib/world';

interface Props {
  /** Tells the page which places the legend shows (for the Quests list). */
  onPlaces?: (spots: Spot[]) => void;
  metro: Metro;
  province: ProvinceId;
  world: World;
  signedIn: boolean;
  /** Septims held. */
  septims: number;
  onNeedsAccount: () => void;
  onSpent: () => void;
  onOpenSpot: (spot: Spot) => void;
  onClose: () => void;
}

/** A small pin for the city map: just the mark (no name: the name is on the card when it is tapped). */
function pin(spot: Spot, glimpsed: boolean, onPick: () => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `em-pin em-legend-pin em-k-${spot.kind}${glimpsed ? ' em-glimpsed' : ''}`;
  el.setAttribute('aria-label', spot.name);
  const icon = document.createElement('span');
  icon.className = 'em-ico';
  icon.innerHTML = glyph(spot.pic ?? spot.kind);
  el.appendChild(icon);
  el.addEventListener('click', (e) => { e.stopPropagation(); onPick(); });
  return el;
}

/** The map of a whole city: its streets in the style of its land, the villages, mills and country places round it, and every place travellers have glimpsed there. */
export default function TownLegend({ onPlaces, metro, province, world, signedIn, septims, onNeedsAccount, onSpent, onOpenSpot, onClose }: Props) {
  const [status, setStatus] = useState<LegendStatus | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const cost = status?.cost ?? 48;

  useEffect(() => {
    // (while developing, ?legendtest opens the map without the server, to look at it)
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('legendtest')) { setStatus({ unlocked: true, count: 0, cost: 48 }); return; }
    if (!signedIn) return;
    let off = false;
    void legendStatus(metro.id).then((r) => { if (!off) { if (r.ok) setStatus(r.data); else setProblem('THE MAP COULD NOT BE READ RIGHT NOW. TRY AGAIN IN A MOMENT'); } });
    return () => { off = true; };
  }, [signedIn, metro.id]);

  const buy = async () => {
    setBusy(true); setProblem('');
    const r = await legendUnlock(metro.id);
    setBusy(false);
    if (!r.ok) { setProblem(r.reason === 'no_credits' ? `YOU NEED ${(cost * 100).toLocaleString('en-US')} SEPTIMS (BUYING MORE OPENS SOON)` : 'THAT DID NOT GO THROUGH: NOTHING WAS TAKEN'); return; }
    if (r.data.charged) onSpent();
    setStatus((s) => (s ? { ...s, unlocked: true } : { unlocked: true, count: 0, cost }));
  };

  // the map itself, once it is bought
  useEffect(() => {
    if (!status?.unlocked || !box.current) return;
    let off = false;
    const markers: HtmlMarkerHandle[] = [];
    let streets: StreetLayer | null = null;
    const dLat = metro.radiusKm / 111.32, dLng = metro.radiusKm / (111.32 * Math.max(0.2, Math.cos((metro.lat * Math.PI) / 180)));
    const bounds = { north: metro.lat + dLat, south: metro.lat - dLat, east: metro.lng + dLng, west: metro.lng - dLng };
    // how far out it may go: about the whole metro on the screen
    const minZoom = Math.max(8, Math.min(12, Math.round(Math.log2((40075 * Math.cos((metro.lat * Math.PI) / 180)) / (metro.radiusKm * 2.4)) + 1)));
    const kit = roadKitFor(province);
    const map = new google.maps.Map(box.current, {
      center: { lat: metro.lat, lng: metro.lng }, zoom: Math.min(13, minZoom + 2), minZoom, maxZoom: 18, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false,
      restriction: { latLngBounds: bounds, strictBounds: false }, styles: [...localStyleFor(province), { elementType: 'labels', stylers: [{ visibility: 'off' }] }], backgroundColor: kit.ground, mapTypeId: 'roadmap', keyboardShortcuts: false,
    });
    if (import.meta.env.DEV) (window as unknown as { __legendMap?: google.maps.Map }).__legendMap = map; // for taking screenshots
    streets = createStreetLayer(map, kit, roadKitName(province));
    if (import.meta.env.DEV) (window as unknown as { __legend?: google.maps.Map }).__legend = map;
    const near = (lat: number, lng: number) => Math.hypot((lat - metro.lat) * 111.32, (lng - metro.lng) * 111.32 * Math.cos((metro.lat * Math.PI) / 180)) <= metro.radiusKm * 1.05;
    const shown: Spot[] = [];
    const put = (spot: Spot, glimpsed: boolean) => {
      shown.push(spot);
      const h = createHtmlMarker({ position: { lat: spot.lat, lng: spot.lng }, element: pin(spot, glimpsed, () => onOpenSpot(spot)), zIndex: glimpsed ? 8 : 5 });
      h.setMap(map);
      markers.push(h);
    };
    // the villages, towns and country places round the city, as on the large map
    for (const tier of ['town', 'village'] as const) {
      for (const [name, lat, lng, pop, , iso2] of world.cities[tier]) {
        if (!near(lat, lng) || Math.hypot((lat - metro.lat) * 111.32, (lng - metro.lng) * 111.32) < 1) continue;
        const prov = world.provinceOfCountry(iso2);
        put({ id: `c:${name}:${lat}`, kind: tier, real: name, name: loreName(name, prov), province: prov, lat, lng, fame: pop, pic: settlementPic(tier, name, pop, prov), iso2, note: 'A settlement about the city' }, false);
      }
    }
    for (const [id, name, lat, lng, type, fame] of world.wild) {
      if (!near(lat, lng)) continue;
      const prov = world.provinceAt(lat, lng);
      put({ id: `w:${id}`, kind: type, real: name, name: ['peak', 'volcano', 'glacier', 'grove'].includes(type) ? name : loreName(name, prov), province: prov, lat, lng, fame, pic: wildPic(type, name), note: type }, false);
    }
    // the key places inside the city: its keep and landmarks (kept off the large map, where they would cover the city's own icon)
    for (const [name, lat, lng, kind, category, fame] of world.keys[metro.id] ?? []) {
      if (kind === 'town') continue;
      put({ id: `k:${metro.id}:${name}`, kind, real: name, name: kind === 'keep' ? `${loreName(metro.name, province)} Keep` : name, province, lat, lng, fame, note: kind === 'landmark' ? category : `Round ${loreName(metro.name, province)}` }, false);
    }
    onPlaces?.([...shown]);
    // every place travellers have glimpsed in this city
    void legendPlaces(metro.id).then((r) => {
      if (off || !r.ok) return;
      for (const p of r.data.places) put({ id: p.id, kind: p.kind, real: p.name, name: p.name, province, lat: p.lat, lng: p.lng, fame: 0, pic: wildPic(p.kind, p.name), note: 'Glimpsed by travellers' }, true);
    });
    return () => { off = true; onPlaces?.([]); markers.forEach((m) => m.setMap(null)); streets?.detach(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.unlocked, metro.id]);

  return (
    <div className="em-legend" role="dialog" aria-modal="true" aria-label={`The Town Legend of ${metro.name}`}>
      <header className="em-legend-head">
        <b>{metro.name.toUpperCase()}</b><small>{PROVINCES[province].name}</small>
        <button type="button" className="em-btn em-btn-ghost" onClick={onClose}>CLOSE</button>
      </header>
      {!signedIn && !status?.unlocked && (
        <div className="em-legend-gate"><h2>THE TOWN LEGEND</h2><p>The whole city, its streets and every place travellers have glimpsed in it. Sign in to see it.</p><button type="button" className="em-btn" onClick={onNeedsAccount}>ENTER THE REALM</button></div>
      )}
      {signedIn && !status && !problem && <div className="em-legend-gate"><p>READING THE LEGEND…</p></div>}
      {signedIn && status && !status.unlocked && (
        <div className="em-legend-gate">
          <h2>THE TOWN LEGEND OF {metro.name.toUpperCase()}</h2>
          <p>The whole city on one map, its streets drawn as the old roads of this land, the villages and mills round it, and every place travellers have glimpsed there{status.count > 0 ? ` (${status.count} so far)` : ''}.</p>
          <p className="em-septims"><Coin size={20} /> {(cost * 100).toLocaleString('en-US')}</p>
          <p className="em-fine">You hold {septims.toLocaleString('en-US')}.</p>
          <button type="button" className="em-btn" disabled={busy} onClick={() => void buy()}>{busy ? 'BUYING…' : 'BUY THE TOWN LEGEND'}</button>
        </div>
      )}
      {problem && <p className="em-note em-legend-note">{problem}</p>}
      {status?.unlocked && <div ref={box} className="em-legend-map" />}
    </div>
  );
}
