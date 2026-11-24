// The marks for towns and cities, one family for each land: its own kind of building (longhouses of the north, domes and minarets of the south, shell-houses and fungal towers of the ash lands,
// tree-houses of the forest, and so on), in three sizes and two layouts, open or behind a wall with a gate. Buildings touch, so a mark reads as one skyline and not a scatter.
// All drawn on the 24-point grid, ground line y 21.5.

import type { ProvinceId } from './lore';

export type ShirePart = { d: string; line?: number };
const G = 21.5;
const f = (d: string): ShirePart => ({ d });
const gable = (x: number, w: number, h: number, p: number): string => `M${x} ${G}V${G - h}l${w / 2} -${p}l${w / 2} ${p}V${G}Z`;
const box = (x: number, w: number, h: number): string => `M${x} ${G}V${G - h}h${w}V${G}Z`;
const horns = (cx: number, top: number): string => `M${cx - 0.2} ${top}l-1.5 -1.9l.6 -.1l1.6 1.8Z M${cx + 0.2} ${top}l1.5 -1.9l-.6 -.1l-1.6 1.8Z`;
const dome = (cx: number, base: number, r: number): string => `M${cx - r} ${base}a${r} ${r} 0 0 1 ${2 * r} 0Z`;
const canopy = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const cone = (x: number, w: number, base: number, p: number): string => `M${x - 0.5} ${base}L${x + w / 2} ${base - p}L${x + w + 0.5} ${base}Z`;
/** A stepped block (terraces): n steps up to the middle and down again. */
const steps = (x: number, w: number, h: number, n: number): string => {
  const sh = h / n, sw = w / 2 / n;
  let d = `M${x} ${G}`;
  for (let i = 0; i < n; i++) d += `V${G - sh * (i + 1)}h${sw}`;
  for (let i = n - 1; i >= 0; i--) d += `h${sw}V${G - sh * i}`;
  return `${d}Z`;
};
const leg = (x: number): string => `M${x} ${G - 3}v3h0.9v-3Z`;

type Prim = (x: number, w: number, h: number) => string;
interface Kit { home: Prim; mid: Prim; tall: Prim; grand: Prim; tower: Prim }

const nord: Kit = {
  home: (x, w, h) => gable(x, w, h * 0.8, h * 0.55) + horns(x + w / 2, G - h * 1.35),
  mid: (x, w, h) => gable(x, w, h * 0.65, h * 0.5) + gable(x + w * 0.2, w * 0.6, h * 0.95, h * 0.45) + horns(x + w / 2, G - h * 1.4),
  tall: (x, w, h) => gable(x, w, h * 0.75, h * 0.4) + horns(x + w / 2, G - h * 1.15),
  grand: (x, w, h) => gable(x, w, h * 0.5, h * 0.3) + gable(x + w * 0.12, w * 0.76, h * 0.72, h * 0.28) + gable(x + w * 0.3, w * 0.4, h * 0.88, h * 0.12) + horns(x + w / 2, G - h * 1.0),
  tower: (x, w, h) => `M${x} ${G}V${G - h}l${w * 0.25} -1.6l${w * 0.25} 1.6l${w * 0.25} -1.6l${w * 0.25} 1.6V${G}Z`,
};
const imperial: Kit = {
  home: (x, w, h) => gable(x, w, h, h * 0.8) + `M${x + w * 0.66} ${G - h - h * 0.45}v-1.8h1.3v1.8Z`,
  mid: (x, w, h) => `M${x} ${G}V${G - h * 0.8}l${w / 2} -${h * 0.9}l${w / 2} ${h * 0.9}V${G}Z`,
  tall: (x, w, h) => `M${x} ${G}V${G - h * 0.7}h${w}V${G}Z M${x - 0.4} ${G - h * 0.7}h${w + 0.8}l-0.4 -1h-${w}Z M${x + w * 0.2} ${G - h * 0.7 - 1}h${w * 0.6}V${G - h}h-${w * 0.6}Z`,
  grand: (x, w, h) => {
    const tw = w * 0.24, yt = G - h * 0.62, yn = G - h * 0.4;
    return `M${x} ${G}V${yt}L${x + tw / 2} ${G - h}L${x + tw} ${yt}V${yn}L${x + w / 2} ${yn - h * 0.16}L${x + w - tw} ${yn}V${yt}L${x + w - tw / 2} ${G - h}L${x + w} ${yt}V${G}Z`;
  },
  tower: (x, w, h) => box(x, w, h) + cone(x, w, G - h, 3.4),
};
const highrock: Kit = {
  home: (x, w, h) => gable(x, w, h * 0.8, h * 0.6),
  mid: (x, w, h) => box(x, w, h) + `M${x} ${G - h}v-1.2h${w * 0.2}v1.2Z M${x + w * 0.4} ${G - h}v-1.2h${w * 0.2}v1.2Z M${x + w * 0.8} ${G - h}v-1.2h${w * 0.2}v1.2Z`,
  tall: (x, w, h) => box(x, w, h * 0.8) + cone(x, w, G - h * 0.8, h * 0.45),
  grand: (x, w, h) => box(x, w * 0.28, h * 0.78) + cone(x, w * 0.28, G - h * 0.78, 3.6) + box(x + w * 0.72, w * 0.28, h * 0.78) + cone(x + w * 0.72, w * 0.28, G - h * 0.78, 3.6)
    + box(x + w * 0.2, w * 0.6, h * 0.95) + `M${x + w * 0.2} ${G - h * 0.95}v-1.3h${w * 0.15}v1.3Z M${x + w * 0.65} ${G - h * 0.95}v-1.3h${w * 0.15}v1.3Z`,
  tower: (x, w, h) => box(x, w, h) + cone(x, w, G - h, 3.4),
};
const redguard: Kit = {
  home: (x, w, h) => box(x, w, h * 0.8) + `M${x} ${G - h * 0.8}h${w}v-0.7h-${w}Z`,
  mid: (x, w, h) => box(x, w, h * 0.6) + dome(x + w / 2, G - h * 0.6, w * 0.46) + `M${x + w / 2 - 0.15} ${G - h * 0.6 - w * 0.46}v-1.5h0.3v1.5Z`,
  tall: (x, w, h) => box(x + w * 0.2, w * 0.6, h * 0.82) + dome(x + w / 2, G - h * 0.82, w * 0.46) + `M${x + w / 2 - 0.15} ${G - h * 0.82 - w * 0.46}v-1.8h0.3v1.8Z`,
  grand: (x, w, h) => box(x + w * 0.1, w * 0.8, h * 0.55) + dome(x + w / 2, G - h * 0.55, w * 0.4) + `M${x + w / 2 - 0.15} ${G - h * 0.55 - w * 0.4}v-2h0.3v2Z`
    + box(x, w * 0.14, h * 0.9) + dome(x + w * 0.07, G - h * 0.9, w * 0.1) + box(x + w * 0.86, w * 0.14, h * 0.9) + dome(x + w * 0.93, G - h * 0.9, w * 0.1),
  tower: (x, w, h) => box(x, w, h) + dome(x + w / 2, G - h, w * 0.6),
};
const khajiit: Kit = {
  home: (x, w, h) => steps(x, w, h * 0.8, 2),
  mid: (x, w, h) => steps(x, w, h, 3),
  tall: (x, w, h) => box(x + w * 0.15, w * 0.7, h * 0.85) + dome(x + w / 2, G - h * 0.85, w * 0.42),
  grand: (x, w, h) => steps(x, w, h * 0.9, 4) + `M${x + w / 2 - 0.15} ${G - h * 0.9}v-2.2h0.3v2.2Z`,
  tower: (x, w, h) => box(x, w, h) + dome(x + w / 2, G - h, w * 0.55),
};
const woodelf: Kit = {
  home: (x, w, h) => `M${x + w / 2 - 0.5} ${G}V${G - h * 0.5}h1V${G}Z` + canopy(x + w / 2, G - h * 0.65, w * 0.48),
  mid: (x, w, h) => `M${x + w / 2 - 0.6} ${G}V${G - h * 0.5}h1.2V${G}Z` + canopy(x + w * 0.35, G - h * 0.65, w * 0.34) + canopy(x + w * 0.68, G - h * 0.6, w * 0.32),
  tall: (x, w, h) => `M${x + w / 2 - 0.6} ${G}V${G - h * 0.6}h1.2V${G}Z` + canopy(x + w / 2, G - h * 0.75, w * 0.5),
  grand: (x, w, h) => `M${x + w / 2 - 1} ${G}V${G - h * 0.6}h2V${G}Z` + canopy(x + w * 0.3, G - h * 0.65, w * 0.3) + canopy(x + w * 0.7, G - h * 0.65, w * 0.3) + canopy(x + w / 2, G - h * 0.85, w * 0.32),
  tower: (x, w, h) => `M${x + w / 2 - 0.5} ${G}V${G - h * 0.7}h1V${G}Z` + canopy(x + w / 2, G - h * 0.82, w * 0.5),
};
const cinder: Kit = {
  home: (x, w, h) => `M${x} ${G}A${w / 2} ${h * 0.9} 0 0 1 ${x + w} ${G}Z`,
  mid: (x, w, h) => `M${x} ${G}A${w * 0.3} ${h * 0.75} 0 0 1 ${x + w * 0.55} ${G}Z M${x + w * 0.35} ${G}A${w * 0.33} ${h} 0 0 1 ${x + w} ${G}Z`,
  tall: (x, w, h) => `M${x + w * 0.4} ${G}V${G - h * 0.7}h${w * 0.2}V${G}Z M${x} ${G - h * 0.62}Q${x + w / 2} ${G - h * 1.25} ${x + w} ${G - h * 0.62}Q${x + w / 2} ${G - h * 0.7} ${x} ${G - h * 0.62}Z`,
  grand: (x, w, h) => `M${x + w * 0.42} ${G}V${G - h * 0.7}h${w * 0.16}V${G}Z M${x} ${G - h * 0.66}Q${x + w / 2} ${G - h * 1.3} ${x + w} ${G - h * 0.66}Q${x + w / 2} ${G - h * 0.74} ${x} ${G - h * 0.66}Z M${x + w * 0.05} ${G}A${w * 0.2} ${h * 0.4} 0 0 1 ${x + w * 0.45} ${G}Z`,
  tower: (x, w, h) => `M${x} ${G}Q${x + w * 0.2} ${G - h * 0.5} ${x + w * 0.8} ${G - h}Q${x + w * 0.75} ${G - h * 0.45} ${x + w} ${G}Z`,
};
const orc: Kit = {
  home: (x, w, h) => `M${x} ${G}V${G - h * 0.7}L${x + w * 0.2} ${G - h}H${x + w * 0.8}L${x + w} ${G - h * 0.7}V${G}Z`,
  mid: (x, w, h) => `M${x} ${G}V${G - h * 0.7}L${x + w * 0.2} ${G - h}H${x + w * 0.8}L${x + w} ${G - h * 0.7}V${G}Z M${x + w * 0.05} ${G - h * 0.95}l-0.5 -2l1.1 1.4Z M${x + w * 0.95} ${G - h * 0.95}l0.5 -2l-1.1 1.4Z`,
  tall: (x, w, h) => `M${x} ${G}V${G - h * 0.5}h${w * 0.15}V${G - h * 0.7}h${w * 0.2}V${G - h}h${w * 0.3}V${G - h * 0.7}h${w * 0.2}V${G - h * 0.5}h${w * 0.15}V${G}Z`,
  grand: (x, w, h) => `M${x} ${G}V${G - h * 0.55}h${w * 0.15}V${G - h * 0.8}h${w * 0.2}V${G - h}h${w * 0.3}V${G - h * 0.8}h${w * 0.2}V${G - h * 0.55}h${w * 0.15}V${G}Z M${x + w * 0.3} ${G - h}l-1 -2.2l1.5 1.4Z M${x + w * 0.7} ${G - h}l1 -2.2l-1.5 1.4Z`,
  tower: (x, w, h) => `M${x} ${G}V${G - h}l${w * 0.25} -1.8l${w * 0.25} 1.8l${w * 0.25} -1.8l${w * 0.25} 1.8V${G}Z`,
};
const gilded: Kit = {
  home: (x, w, h) => box(x + w * 0.1, w * 0.8, h * 0.6) + `M${x - 0.6} ${G - h * 0.6}L${x + w * 0.2} ${G - h}H${x + w * 0.8}L${x + w + 0.6} ${G - h * 0.6}Z`,
  mid: (x, w, h) => box(x + w * 0.12, w * 0.76, h * 0.45) + `M${x - 0.5} ${G - h * 0.45}L${x + w * 0.2} ${G - h * 0.7}H${x + w * 0.8}L${x + w + 0.5} ${G - h * 0.45}Z M${x + w * 0.2} ${G - h * 0.7}h${w * 0.6}V${G - h * 0.85}h-${w * 0.6}Z M${x + w * 0.1} ${G - h * 0.85}L${x + w / 2} ${G - h * 1.1}L${x + w * 0.9} ${G - h * 0.85}Z`,
  tall: (x, w, h) => `M${x + w / 2} ${G - h}L${x + w * 0.85} ${G - h * 0.45}L${x + w / 2} ${G}L${x + w * 0.15} ${G - h * 0.45}Z`,
  grand: (x, w, h) => box(x + w * 0.1, w * 0.8, h * 0.3) + `M${x} ${G - h * 0.3}H${x + w}L${x + w * 0.85} ${G - h * 0.5}H${x + w * 0.15}Z M${x + w * 0.1} ${G - h * 0.5}H${x + w * 0.9}V${G - h * 0.6}H${x + w * 0.1}Z M${x + w * 0.2} ${G - h * 0.6}L${x + w / 2} ${G - h}L${x + w * 0.8} ${G - h * 0.6}Z`,
  tower: (x, w, h) => `M${x + w / 2} ${G - h}L${x + w} ${G - h * 0.4}L${x + w / 2} ${G}L${x} ${G - h * 0.4}Z`,
};
const marsh: Kit = {
  home: (x, w, h) => `M${x} ${G - 3}V${G - 3 - h * 0.6}l${w / 2} -${h * 0.5}l${w / 2} ${h * 0.5}V${G - 3}Z` + leg(x + 0.7) + leg(x + w - 1.6),
  mid: (x, w) => dome(x + w / 2, G - 3, w * 0.5) + leg(x + 0.7) + leg(x + w - 1.6) + leg(x + w / 2 - 0.4),
  tall: (x, w, h) => `M${x + w * 0.15} ${G - 3}V${G - 3 - h * 0.7}l${w * 0.35} -${h * 0.3}l${w * 0.35} ${h * 0.3}V${G - 3}Z` + leg(x + w * 0.2) + leg(x + w * 0.7),
  grand: (x, w, h) => `M${x} ${G - 3}V${G - 3 - h * 0.3}h${w}V${G - 3}Z M${x + w * 0.12} ${G - 3 - h * 0.3}V${G - 3 - h * 0.6}h${w * 0.76}V${G - 3 - h * 0.3}Z M${x + w * 0.26} ${G - 3 - h * 0.6}V${G - 3 - h * 0.85}h${w * 0.48}V${G - 3 - h * 0.6}Z` + leg(x + 0.5) + leg(x + w - 1.5) + leg(x + w / 2 - 0.5),
  tower: (x, w, h) => `M${x} ${G - 3}V${G - 3 - h * 0.8}l${w / 2} -${h * 0.25}l${w / 2} ${h * 0.25}V${G - 3}Z` + leg(x + w / 2 - 0.45),
};

const KITS: Record<string, Kit> = { nord, imperial, highrock, redguard, khajiit, woodelf, cinder, orc, gilded, marsh };
export const KIT_OF: Record<ProvinceId, string> = {
  skyrim: 'nord', shivering: 'nord', atmora: 'nord', solstheim: 'nord', cyrodiil: 'imperial', highrock: 'highrock', hammerfell: 'redguard', elsweyr: 'khajiit',
  valenwood: 'woodelf', morrowind: 'cinder', orsinium: 'orc', summerset: 'gilded', blackmarsh: 'marsh',
};

type Slot = [keyof Kit, number, number, number];
type Tier = 'S' | 'M' | 'L';
/** Open layouts: buildings touch. [kind, x, width, height] */
const OPEN: Record<Tier, Slot[][]> = {
  S: [[['home', 2, 8, 5.4], ['tall', 9.5, 5.6, 10], ['home', 14.5, 7.5, 5]], [['tall', 3, 5.6, 9.5], ['mid', 8, 8, 7], ['home', 15.5, 6.5, 5]]],
  M: [[['home', 1, 7, 5.2], ['mid', 7.5, 6.6, 7.5], ['tall', 13.6, 4.6, 10.5], ['home', 17.6, 5.4, 5.4]], [['tall', 1.5, 4.6, 10], ['home', 5.6, 6, 5.4], ['mid', 11, 7, 7.5], ['home', 17.6, 5.4, 5]]],
  L: [[['home', 0.8, 5, 5.2], ['tall', 5.2, 4.2, 10], ['grand', 9, 6.4, 13.5], ['tall', 15, 4.2, 10], ['home', 19, 4.2, 5.2]], [['mid', 1, 6, 7.5], ['grand', 6.5, 7.2, 14], ['tall', 13.2, 4.4, 10.5], ['mid', 17.4, 5.8, 7]]],
};
/** Walled layouts: a wall with a gate in the middle (x 10.5 to 13.5), towers at the ends, the town behind it. */
const WALLED: Record<Tier, Slot[][]> = {
  S: [[['tower', 0.8, 3.4, 8.5], ['home', 4, 5.2, 6], ['tall', 14.2, 4.6, 9.5], ['tower', 19.8, 3.4, 8.5]], [['tower', 0.8, 3.4, 8.5], ['mid', 4, 6.4, 7.5], ['home', 14.2, 5, 6], ['tower', 19.8, 3.4, 8.5]]],
  M: [[['tower', 0.8, 3.4, 9], ['home', 3.8, 3.6, 6], ['tall', 6.8, 3.8, 10.5], ['mid', 14, 4.8, 8], ['home', 18.2, 2.6, 6], ['tower', 19.8, 3.4, 9]], [['tower', 0.8, 3.4, 9], ['mid', 4, 6.2, 8], ['tall', 14.2, 3.8, 11], ['home', 17.6, 2.8, 6.2], ['tower', 19.8, 3.4, 9]]],
  L: [[['tower', 0.8, 3.4, 9], ['tall', 3.8, 3.6, 11], ['mid', 6.8, 3.9, 8], ['grand', 13.8, 6, 14], ['tower', 19.8, 3.4, 9]], [['tower', 0.8, 3.4, 9], ['grand', 3.6, 6.6, 14], ['tall', 14, 3.8, 11], ['mid', 17.4, 3.4, 7.5], ['tower', 19.8, 3.4, 9]]],
};

const WALL_H = 4.4;
function wallPath(): string {
  let d = `M0.8 ${G}V${G - WALL_H}`;
  for (let i = 0; i < 14; i++) d += 'h0.8v-1h0.8v1';
  d += `V${G}Z`;
  // the gate: an arch cut out of the wall (drawn the other way round, so it is a hole)
  d += `M13.5 ${G}V${G - 3}a1.5 1.5 0 0 0 -3 0V${G}Z`;
  return d;
}

const GROUND = `M0.8 ${G}h22.4v1H0.8Z`;
export const SHIRES: Record<string, ShirePart[]> = {};
for (const [name, kit] of Object.entries(KITS)) {
  SHIRES[`${name}_1`] = [f(kit.home(4.5, 15, 9)), f(GROUND)];
  for (const tier of ['S', 'M', 'L'] as Tier[]) {
    for (let v = 0; v < 2; v++) {
      SHIRES[`${name}_${tier}${v}`] = [...OPEN[tier][v].map(([k, x, w, h]) => f(kit[k](x, w, h))), f(GROUND)];
      SHIRES[`${name}_${tier}${v}w`] = [f(wallPath()), ...WALLED[tier][v].map(([k, x, w, h]) => f(kit[k](x, w, h))), f(GROUND)];
    }
  }
}

const hashOf = (text: string): number => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** The mark for a town or city of this land: its building style, its size, one of two layouts, and a wall for about a quarter of the smaller and over half of the larger. */
export function shirePic(province: ProvinceId, tier: Tier, name: string): string {
  const h = hashOf(name);
  const walled = (h >>> 8) % 100 < (tier === 'L' ? 55 : tier === 'M' ? 40 : 25);
  return `${KIT_OF[province]}_${tier}${h % 2}${walled ? 'w' : ''}`;
}
export const singleShire = (province: ProvinceId): string => `${KIT_OF[province]}_1`;
