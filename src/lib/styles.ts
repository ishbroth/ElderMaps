// The map's looks, as Google Maps styles. SKYRIM keeps Google's own shaded relief (the terrain map) and turns it cold and grey, like the render of the game's map;
// OBLIVION warms it to the sepia of old parchment; LOCAL is the flat sketched city map you see when you enter a city: used for the road to a place.

export type LookId = 'skyrim' | 'oblivion';

const off = [{ visibility: 'off' }];

const skyrim: google.maps.MapTypeStyle[] = [
  { elementType: 'labels', stylers: off },
  { elementType: 'geometry', stylers: [{ saturation: -78 }, { lightness: -26 }, { gamma: 0.9 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1b262e' }, { saturation: -10 }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ visibility: 'on' }, { color: '#c9c2b0' }, { weight: 0.5 }] },
  { featureType: 'administrative.province', stylers: off },
  { featureType: 'administrative.land_parcel', stylers: off },
  { featureType: 'administrative.neighborhood', stylers: off },
  { featureType: 'poi', stylers: off },
  { featureType: 'transit', stylers: off },
  { featureType: 'road.local', stylers: off },
  { featureType: 'road.arterial', stylers: off },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#a69a80' }, { weight: 0.5 }, { visibility: 'simplified' }] },
];

const oblivion: google.maps.MapTypeStyle[] = [
  { elementType: 'labels', stylers: off },
  { elementType: 'geometry', stylers: [{ hue: '#c9a45c' }, { saturation: -45 }, { lightness: 8 }, { gamma: 1.1 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#8aa1a5' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ visibility: 'on' }, { color: '#5a4128' }, { weight: 0.8 }] },
  { featureType: 'administrative.province', stylers: off },
  { featureType: 'administrative.land_parcel', stylers: off },
  { featureType: 'administrative.neighborhood', stylers: off },
  { featureType: 'poi', stylers: off },
  { featureType: 'transit', stylers: off },
  { featureType: 'road.local', stylers: off },
  { featureType: 'road.arterial', stylers: off },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#7a5a2a' }, { weight: 0.6 }, { visibility: 'simplified' }] },
];

/** The flat sketched city map for the road: parchment ground, dark-brown ink for the roads' edges, building footprints, and the names of streets. */
const local: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#d9c9a3' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3b2a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#e9dcb8' }, { weight: 3 }] },
  { elementType: 'labels.icon', stylers: off },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#7a5a2a' }, { weight: 1 }] },
  { featureType: 'poi', stylers: off },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c4c58f' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: off },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#c1ad82' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#7a5a2a' }, { weight: 0.6 }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#e7dcbc' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#3b2a1a' }, { weight: 0.8 }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#efe3bf' }] },
  { featureType: 'transit', stylers: off },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#9fb0b2' }] },
];

export const WORLD_STYLES: Record<LookId, google.maps.MapTypeStyle[]> = { skyrim, oblivion };
export const LOCAL_STYLE = local;

/** What the page itself draws on top, per look. */
export const PALETTE: Record<LookId, { ink: string; dim: string; ocean: string; backdrop: string; panel: string; line: string }> = {
  skyrim: { ink: '#f2f2ee', dim: '#9aa3a8', ocean: '#b9cbd6', backdrop: '#0b0d10', panel: 'rgba(12,16,20,0.82)', line: 'rgba(201,194,176,0.45)' },
  oblivion: { ink: '#2f2316', dim: '#6b563a', ocean: '#4d6a73', backdrop: '#5a4128', panel: 'rgba(224,206,160,0.92)', line: 'rgba(90,65,40,0.6)' },
};
