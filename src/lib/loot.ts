// The things a survivor picks up (the twin of WastelandMaps' steel, wood, springs...). The ids are working names; the `name` is what people read, and it is our own:
// nothing here may use a name from the games on screen. Materials are found everywhere; the herbs and the rare ingots depend on the region.

import type { ProvinceId } from './lore';

export type LootKind = 'material' | 'ingot' | 'herb';

export interface Loot {
  id: string;
  /** What it is called on screen. */
  name: string;
  kind: LootKind;
  /** What it is, in a line. */
  blurb: string;
  /** The working name it comes from (code and image prompts only, never shown). */
  inspiredBy?: string;
}

export const LOOT: Loot[] = [
  { id: 'wood', name: 'Timber', kind: 'material', blurb: 'Split logs and beams.' },
  { id: 'stone', name: 'Quarry Stone', kind: 'material', blurb: 'Dressed blocks from old walls.' },
  { id: 'leather', name: 'Tanned Hide', kind: 'material', blurb: 'Strips of cured leather.' },
  { id: 'iron', name: 'Iron Ingot', kind: 'ingot', blurb: 'A bar of plain, workable iron.' },
  { id: 'dwarven', name: 'Deepforge Ingot', kind: 'ingot', blurb: 'A bronze-gold bar from the old underground forges.', inspiredBy: 'dwarven ingot' },
  { id: 'gold', name: 'Gold Ingot', kind: 'ingot', blurb: 'A heavy bar of gold.' },
  { id: 'ebony', name: 'Nightglass Ingot', kind: 'ingot', blurb: 'A bar of black volcanic glass-metal, cold to the touch.', inspiredBy: 'ebony ingot' },
  { id: 'tundra_cotton', name: 'Frostdown', kind: 'herb', blurb: 'A soft white tuft that grows in the snow.', inspiredBy: 'tundra cotton' },
  { id: 'blisterwort', name: 'Blisterbloom', kind: 'herb', blurb: 'A pale fungus that raises welts on bare skin.', inspiredBy: 'blisterwort' },
  { id: 'canis_root', name: 'Houndroot', kind: 'herb', blurb: 'A gnarled root the wolves dig for.', inspiredBy: 'canis root' },
];

/** More herbs, each at home in some regions: this is where the loot changes with the land. Names are our own; `inspiredBy` is for the image prompts. */
export const REGIONAL_HERBS: { loot: Loot; provinces: ProvinceId[] }[] = [
  { loot: { id: 'snowberry', name: 'Rimeberry', kind: 'herb', blurb: 'A frost-bitten red berry.', inspiredBy: 'snowberries' }, provinces: ['skyrim', 'solstheim', 'atmora'] },
  { loot: { id: 'nirnroot', name: 'Chimeroot', kind: 'herb', blurb: 'A root that rings faintly in the dark.', inspiredBy: 'nirnroot' }, provinces: ['cyrodiil', 'highrock', 'summerset'] },
  { loot: { id: 'ash_yam', name: 'Cinder Yam', kind: 'herb', blurb: 'A yam that grows in volcanic ash.', inspiredBy: 'ash yam' }, provinces: ['morrowind'] },
  { loot: { id: 'comberry', name: 'Marshberry', kind: 'herb', blurb: 'A swollen berry from the wet ground.', inspiredBy: 'comberry' }, provinces: ['morrowind', 'blackmarsh'] },
  { loot: { id: 'hist_sap', name: 'Heartwood Sap', kind: 'herb', blurb: 'A bitter sap from the great marsh trees.', inspiredBy: 'hist sap' }, provinces: ['blackmarsh', 'valenwood'] },
  { loot: { id: 'moon_sugar', name: 'Moonsugar', kind: 'herb', blurb: 'A pale crystal from sun-baked fields.', inspiredBy: 'moon sugar' }, provinces: ['elsweyr', 'hammerfell'] },
  { loot: { id: 'sand_lily', name: 'Dune Lily', kind: 'herb', blurb: 'A flower that opens only at dusk.' }, provinces: ['hammerfell', 'elsweyr'] },
  { loot: { id: 'glow_cap', name: 'Glowcap', kind: 'herb', blurb: 'A mushroom that gives off a soft light.', inspiredBy: 'glowing mushroom' }, provinces: ['valenwood', 'shivering', 'morrowind'] },
  { loot: { id: 'tusk_thistle', name: 'Tuskthistle', kind: 'herb', blurb: 'A tough thistle, prized by the stronghold smiths.' }, provinces: ['orsinium'] },
  { loot: { id: 'dream_blossom', name: 'Fevernettle', kind: 'herb', blurb: 'A flower no two people describe the same way.' }, provinces: ['shivering'] },
];

/** The herbs and the rarer ingots that can drop in a region (the common materials drop everywhere). */
export function lootFor(province: ProvinceId): Loot[] {
  const herbs = LOOT.filter((l) => l.kind === 'herb');
  const local = REGIONAL_HERBS.filter((h) => h.provinces.includes(province)).map((h) => h.loot);
  const cold = province === 'skyrim' || province === 'solstheim' || province === 'atmora';
  // the three plain herbs are only common where they grow: frostdown in the cold, blisterbloom in the damp, houndroot in the woods and hills
  const plain = herbs.filter((h) => (h.id === 'tundra_cotton' ? cold : h.id === 'blisterwort' ? ['morrowind', 'blackmarsh', 'valenwood', 'shivering'].includes(province) : !['hammerfell', 'elsweyr'].includes(province)));
  return [...LOOT.filter((l) => l.kind !== 'herb'), ...plain, ...local];
}
