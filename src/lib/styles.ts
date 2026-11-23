// The map's looks, as Google Maps styles. SKYRIM keeps Google's own shaded relief (the terrain map) and turns it cold and grey, like the render of the game's map;
// OBLIVION warms it to the sepia of old parchment; LOCAL is the flat sketched city map you see when you enter a city: used for the road to a place.

export type LookId = 'skyrim' | 'oblivion' | 'vivid';

const off = [{ visibility: 'off' }];

const skyrim: google.maps.MapTypeStyle[] = [
  { elementType: 'labels', stylers: off },
  { elementType: 'geometry', stylers: [{ saturation: -88 }, { lightness: -26 }, { gamma: 0.9 }] },
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

// ---- the street map while travelling, as an old game would draw it: one kit of colours per region ----
// Each region's streets are imagined differently: cold stone tracks in the north, grey cobbles in the imperial heartland, ash roads in the cinderlands, sand tracks in the south,
// churned mud in the swamps. Google can only colour roads, so the kit sets the ground, the road fill and edge, the building footprints, the water and the parks.
export interface RoadKit { ground: string; roadFill: string; roadEdge: string; highway: string; buildings: string; buildingEdge: string; water: string; park: string; ink: string; halo: string }
const KITS: Record<string, RoadKit> = {
  // cold slate and dark packed-earth tracks
  north: { ground: '#b8b6a8', roadFill: '#8f8068', roadEdge: '#34291f', highway: '#a4957a', buildings: '#7b766b', buildingEdge: '#3a342c', water: '#6c8088', park: '#86957a', ink: '#2a2118', halo: '#d9d4c0' },
  // pale cobbles between whitewashed and timber-framed blocks
  imperial: { ground: '#d2c7a8', roadFill: '#aaa293', roadEdge: '#4a4236', highway: '#bdb5a3', buildings: '#a89a82', buildingEdge: '#4a3f30', water: '#8ea3a6', park: '#abb57e', ink: '#33281a', halo: '#ece2c4' },
  // ash-grey ground and dark volcanic roads
  ash: { ground: '#9a9086', roadFill: '#6f665c', roadEdge: '#2b2520', highway: '#857b70', buildings: '#7e5e4c', buildingEdge: '#2f241d', water: '#5f716e', park: '#73796a', ink: '#201914', halo: '#c9bfb2' },
  // sun-bleached sand and sandstone
  sand: { ground: '#e3c997', roadFill: '#cdaa70', roadEdge: '#6a4d28', highway: '#d8b982', buildings: '#d4b27c', buildingEdge: '#6a4d28', water: '#86a6a1', park: '#a9a560', ink: '#47311a', halo: '#f1e1bb' },
  // churned mud and green water
  swamp: { ground: '#8d9c72', roadFill: '#7b6c47', roadEdge: '#2f3520', highway: '#8c7c55', buildings: '#69573a', buildingEdge: '#2a2518', water: '#566f60', park: '#70875d', ink: '#1f2a18', halo: '#c4cba6' },
  // living green: packed earth between the trees
  jungle: { ground: '#86a06b', roadFill: '#89724a', roadEdge: '#2f3b22', highway: '#98825a', buildings: '#6d6a45', buildingEdge: '#2a3320', water: '#5a7f6a', park: '#6f9a58', ink: '#1d2c17', halo: '#c9d4a8' },
  // gold-white stone in gardens
  gilded: { ground: '#e6dcb4', roadFill: '#efe6c2', roadEdge: '#8a7740', highway: '#f4ecc9', buildings: '#d9c88a', buildingEdge: '#8a7740', water: '#98b3b0', park: '#b2c07f', ink: '#3b3216', halo: '#f9f3d8' },
  // dark basalt and iron
  basalt: { ground: '#8f918a', roadFill: '#6c6e68', roadEdge: '#26282a', highway: '#80827b', buildings: '#5d5f5c', buildingEdge: '#202224', water: '#5d7078', park: '#77855f', ink: '#1c1e20', halo: '#c2c4bb' },
  // strange violet dusk
  fever: { ground: '#b79ac0', roadFill: '#9c7fa8', roadEdge: '#3d2748', highway: '#ab8eb7', buildings: '#8a6c97', buildingEdge: '#35213f', water: '#6b7fa6', park: '#9db06f', ink: '#2c1a36', halo: '#e4d3ea' },
};
const KIT_OF: Record<string, keyof typeof KITS> = {
  skyrim: 'north', atmora: 'north', solstheim: 'north', highrock: 'imperial', cyrodiil: 'imperial', morrowind: 'ash', hammerfell: 'sand', elsweyr: 'sand',
  blackmarsh: 'swamp', valenwood: 'jungle', summerset: 'gilded', orsinium: 'basalt', shivering: 'fever',
};

/** The colours of the street map for a region (by its working id). */
export const roadKitFor = (province: string): RoadKit => KITS[KIT_OF[province] ?? 'imperial'];
/** The name of a region's kit (north, imperial, ash, sand, swamp, jungle, gilded, basalt, fever). */
export const roadKitName = (province: string): string => KIT_OF[province] ?? 'imperial';

/** The flat sketched street map in a region's kit. */
export function localStyleFor(province: string): google.maps.MapTypeStyle[] {
  const k = roadKitFor(province);
  return [
    { elementType: 'geometry', stylers: [{ color: k.ground }] },
    { elementType: 'labels.text.fill', stylers: [{ color: k.ink }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: k.halo }, { weight: 3 }] },
    { elementType: 'labels.icon', stylers: off },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: k.roadEdge }, { weight: 1 }] },
    { featureType: 'poi', stylers: off },
    { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: k.park }] },
    { featureType: 'poi.park', elementType: 'labels', stylers: off },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: k.buildings }] },
    { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: k.buildingEdge }, { weight: 0.8 }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: k.roadFill }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: k.roadEdge }, { weight: 1.1 }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: k.highway }] },
    { featureType: 'transit', stylers: off },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: k.water }] },
  ];
}

export const WORLD_STYLES: Record<LookId, google.maps.MapTypeStyle[]> = { skyrim, oblivion, vivid: skyrim };
export const LOCAL_STYLE = local;

/** What the page itself draws on top, per look. */
export const PALETTE: Record<LookId, { ink: string; dim: string; ocean: string; backdrop: string; panel: string; line: string }> = {
  skyrim: { ink: '#f2f2ee', dim: '#9aa3a8', ocean: '#b9cbd6', backdrop: '#0b0d10', panel: 'rgba(12,16,20,0.82)', line: 'rgba(201,194,176,0.45)' },
  vivid: { ink: '#f4f4ee', dim: '#a9b3b8', ocean: '#e4f3fa', backdrop: '#12385f', panel: 'rgba(12,16,20,0.82)', line: 'rgba(201,194,176,0.45)' },
  oblivion: { ink: '#2f2316', dim: '#6b563a', ocean: '#4d6a73', backdrop: '#5a4128', panel: 'rgba(224,206,160,0.92)', line: 'rgba(90,65,40,0.6)' },
};
