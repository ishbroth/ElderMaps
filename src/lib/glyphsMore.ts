// More pictograms for the map, so places of one kind do not all wear the same mark: several kinds of ruin (arch, columns, broken tower, wall, chapel, castle, ziggurat), caves, forts,
// towers, shrines, groves, mills and manors, and the building marks for towns and cities: a lone cottage, chapel, barn or inn for the smallest, and for the bigger ones a cluster
// of little buildings, the bigger the city the more of them (and a steeple and a tower once it is large). All original drawings on the 24-point grid.

import { SHIRES, shirePic, singleShire } from './shires';
import type { ProvinceId } from './lore';

export type Part = { d: string; line?: number };
const fill = (d: string): Part => ({ d });
const line = (d: string, w = 1.8): Part => ({ d, line: w });

/** A gabled house standing on the ground line (y 21.5): x is its left edge, w its width, h the height of its walls, peak the height of its roof. */
const house = (x: number, w: number, h: number, peak: number): string => `M${x} 21.5V${21.5 - h}l${w / 2} -${peak}l${w / 2} ${peak}V21.5Z`;
/** A tower with a pointed roof. */
const spire = (x: number, w: number, h: number, peak: number): string => `M${x} 21.5V${21.5 - h}l${w / 2} -${peak}l${w / 2} ${peak}V21.5Z`;
/** A flat-roofed block with a battlement. */
const keepBlock = (x: number, w: number, h: number): string => `M${x} 21.5V${21.5 - h}h${w * 0.2}v-1.4h${w * 0.2}v1.4h${w * 0.2}v-1.4h${w * 0.2}v1.4h${w * 0.2}V21.5Z`;
const door = (x: number, w: number, h: number): string => `M${x} 21.5v-${h - w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0v${h - w / 2}Z`;

export const MORE: Record<string, Part[]> = {
  // ---- ruins ----
  ruinarch: [fill('M3.5 21.5V10.5h3.2v11Zm13.8 0V8.2h3.2v13.3Z'), line('M6.7 10.5C7.2 5.8 12 4.4 14 6.2', 2.1), fill('M9 21.5l.7-3.2 1.5 1.1 1.3-2.5.8 4.6Z')],
  ruincolumns: [fill('M3.6 21.5V9.6h2.8v11.9Zm6.2 0V5.6h2.8v15.9Zm6.2 0v-9.4h2.8v9.4Z'), fill('M2.8 8.4h4.4V9.8H2.8Zm6.2-4h4.4v1.4H9Z'), fill('M2.5 21.5h19v1.1h-19Z')],
  ruintower: [fill('M7.4 21.5V11l1.8 1.3 1.4-3 1.9 1.7 1.7-3.2 1.7 2.8v11.9Zm3.5 0v-3.4a1.2 1.2 0 0 1 2.4 0v3.4Z'), fill('M2.6 21.5l1.2-2.2 1.6 1 1-1.6.6 2.8Zm14.6 0 .8-2 1.8.9 1.2-1.5.6 2.6Z')],
  ruinwall: [fill('M2.5 21.5V12l2.8-1.3 2.2 1.1 2.4-2.6 2.2 1.2v11.1Zm2.6 0v-3.6a1.2 1.2 0 0 1 2.4 0v3.6Z'), fill('M15.2 21.5v-6.6l2.1-1.3 2 1.5 2.2-1v7.4Z')],
  ruinchapel: [fill('M4.6 21.5V11l5.4-3.8 5.4 3.8v10.5ZM10 12.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z'), line('M10 7.2V3.8M8.2 5.4h3.6', 1.5), fill('M16.8 21.5l.9-2.6 2 .9 1.6-1.6.9 3.3Z')],
  ruincastle: [fill('M2.5 21.5V9.2h2.3v1.6h1.6V9.2h2.3v12.3Zm12 0V9.8h2.3v1.6h1.6V9.8h2.3v1.6h1.3v10.1Z'), fill('M9.4 21.5l1.2-3.4 1.8 1.3 1.1-2.2.5 4.3Z')],
  ruinziggurat: [fill('M2.4 21.5v-2.7h3.2v-2.9h3.2V13h6.4v2.9h3.2v2.9h3.2v2.7Z'), line('M12 13V9.6', 1.6)],
  ruincircle: [fill('M3.5 21.5V15h2.6v6.5Zm5.5 0v-8.6h2.6v8.6Zm5.8 0V15h2.6v6.5Zm5.4 0v-9.6h-2.6v9.6Z'), fill('M3 12.4h6.4v1.6H3Z')],
  ruinhall: [fill('M2.8 21.5V12l4-3.2 4 3.2v9.5Zm2.6 0v-3.4h2.8v3.4Z'), fill('M14 21.5v-6.4l2.6-2.2 2.2 1.6 2.4-1v8Z'), line('M10.8 12l2.2-1.8', 1.5)],
  // ---- caves, forts, towers, shrines ----
  cavemouth: [fill('M2.3 21.5C2.3 11 6.6 6.4 12 6.4s9.7 4.6 9.7 15.1ZM7.5 21.5c0-5 1.8-8 4.5-8s4.5 3 4.5 8Z'), fill('M9.4 13.6l.8 2.6.8-2.6Zm3.2 0l.8 2.2.8-2.2Z')],
  fortgate: [fill('M3.4 21.5V6.4h4.2v2h1.2v-2H11V8h2V6.4h2.1v2h1.2v-2h4.2v15.1ZM9.9 21.5v-6.8a2.1 2.1 0 0 1 4.2 0v6.8Z')],
  fortkeep: [fill('M5.5 21.5V9h2.2V7.4H10V9h4V7.4h2.3V9h2.2v12.5Z'), fill('M10.1 21.5v-4a1.9 1.9 0 0 1 3.8 0v4Z'), line('M12 7.4V3.2M12 3.2l2.6 1-2.6 1', 1.3)],
  tower2: [fill('M12 1.8l3.4 6.4v13.3H8.6V8.2ZM12 11.2a1.3 1.3 0 0 0-1.3 1.3V15h2.6v-2.5A1.3 1.3 0 0 0 12 11.2Z')],
  watchtower: [fill('M7 21.5l1.4-9.2h7.2l1.4 9.2ZM6 10.6h12V7.4h-2V5.8h-2.4v1.6h-3.2V5.8H8v1.6H6Z')],
  obelisk: [fill('M12 2.6l2.4 4.8V19H9.6V7.4Z'), fill('M7.4 19h9.2v2.5H7.4Z')],
  chapel: [fill('M4.6 21.5v-8.2L12 9l7.4 4.3v8.2Zm5.8 0v-3.4a1.6 1.6 0 0 1 3.2 0v3.4Z'), line('M12 9V3.2M9.8 5.2h4.4', 1.5)],
  statue: [fill('M8 21.5v-2.4h8v2.4ZM10 19.1v-4.6L8.6 12.8l1.6-4.4 1.8-1 1.8 1 1.6 4.4-1.4 1.7v4.6Z'), fill('M12 3.6a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z')],
  // ---- the country: groves, mills, manors, peaks ----
  pines: [fill('M12 2.6l4.4 6.2h-2.4l3.6 5H14.6l3.2 4.4H6.2l3.2-4.4H6.4l3.6-5H7.6Z'), fill('M10.8 18.6h2.4v2.9h-2.4Z')],
  windmill: [fill('M10.2 21.5l1-9h1.6l1 9Z'), line('M12 11.8 5.4 5.4M12 11.8l6.6 5.8M12 11.8l6.6-6.4M12 11.8l-6.4 5.8', 1.7), fill('M12 10.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z')],
  watermill: [fill('M2.8 21.5V12l5-3.6 5 3.6v9.5Z'), line('M18 11.4a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4ZM18 11.4v9.4M13.3 16.1h9.4', 1.5)],
  manor: [fill('M2.5 21.5V11l4-2.4 3 1.6V7.4l2.5-1.8 2.5 1.8v2.8l3-1.6 4 2.4v10.5ZM10.4 21.5v-3.6a1.6 1.6 0 0 1 3.2 0v3.6Z')],
  peaks2: [fill('M1.8 21.5 8 9.6l3.2 5 4.6-9 6.4 15.9Z'), line('M13.6 9l2.2 2.6 2-1.6', 1.2)],
  // ---- lighthouses and beacons ----
  lighthouse2: [fill('M9 21.5l.9-11h4.2l.9 11Z'), fill('M8 10h8v1.3H8Z'), fill('M10.2 10V6.4h3.6V10Z'), fill('M9.5 6.4 12 3.4l2.5 3Z'), line('M5 6.6l3.2.8M19 6.6l-3.2.8M12 1.6V2.6', 1.3)],
  lighthouse3: [fill('M5.5 21.5V12.5h4.2v9Z'), fill('M5 12.5h5.2l-.4-1.3H5.4Z'), fill('M6.3 11.2V8.6h2.6v2.6Z'), fill('M5.8 8.6 7.6 6.4l1.8 2.2Z'), fill('M10.6 21.5v-4.6l3.7-2.6 4.2 2.6v4.6Z'), line('M3 7.4l1.8.6M12 7.4l-1.6.6', 1.2)],
  lighthouse4: [fill('M6.8 21.5l1.4-5.6h7.6l1.4 5.6Z'), fill('M11.1 15.9V10h1.8v5.9Z'), fill('M9.2 10l.9-2.2h3.8l.9 2.2Z'), fill('M12 2.4c2 1.9 2.9 3.4 2.2 5.2H9.8C9.1 5.8 10 4.3 12 2.4Z')],
  lighthouse5: [fill('M2.6 21.5l3.2-3.4 3.2 1.3 3-2.2 3.6 1.7 2.6-1.5 3.2 4.1Z'), fill('M9.9 17.5V10h4.2v7.5Z'), fill('M10.5 10V7.4h3V10Z'), fill('M9.9 7.4 12 4.6l2.1 2.8Z'), line('M7 5.4l2.4 1M17 5.4l-2.4 1', 1.2)],
  beacon: [fill('M8 21.5V13h8v8.5Z'), fill('M7 13h10v-1.6H7Z'), fill('M12 3c2.2 2.2 3.2 3.9 2.4 6H9.6C8.8 6.9 9.8 5.2 12 3Z')],
  // ---- the smallest settlements ----
  cottage: [fill(house(4.5, 15, 7.5, 6)), fill(door(10.5, 3, 5)), line('M16.4 8.6V4.8h2v5.2', 1.4)],
  chapelvillage: [fill('M3 21.5V14.2l4.6-3.2v10.5Z'), fill('M7.6 21.5V9.6h8.4v11.9Z'), fill('M7.6 9.6 11.8 3.2l4.2 6.4Z'), fill('M16 21.5v-7l5 2.6v4.4Z'), fill('M10.2 21.5v-3.4a1.6 1.6 0 0 1 3.2 0v3.4Z'), line('M11.8 3.2V1.4', 1.2)],
  barn: [fill('M2.5 21.5V11.6L6.6 7h10.8l4.1 4.6v9.9ZM9.4 21.5v-5h5.2v5Z'), line('M9.4 16.5l5.2 5M14.6 16.5l-5.2 5', 1.1)],
  inn: [fill(house(3.5, 14, 7.5, 6)), fill(door(8.3, 3.2, 5)), line('M17.5 11h3.6M19.3 11v3.4', 1.5), fill('M17.9 14.4h2.8v2.2h-2.8Z')],
  granary: [fill('M5 21.5V10.4a7 7 0 0 1 14 0v11.1Zm4-0v-4h6v4Z'), line('M12 3.4V1.8', 1.3)],
};

/** Old-world buildings for the clusters: a steep timber cottage with a chimney, a church with a spired tower, a cathedral (two spired towers and a pointed nave), a round tower with a conical roof, a battlemented rampart. */
const cot = (x: number, w: number, h: number, p: number): string => house(x, w, h, p) + `M${x + w * 0.66} ${21.5 - h - p * 0.55}v-${p * 0.55 + 1}h1.3v${p * 0.55 + 1}Z`;
const cathedral = (x: number, w: number, h: number): string => {
  const tw = w * 0.24, yt = 21.5 - h * 0.62, yn = 21.5 - h * 0.4, ya = yn - h * 0.16, top = 21.5 - h;
  return `M${x} 21.5V${yt}L${x + tw / 2} ${top}L${x + tw} ${yt}V${yn}L${x + w / 2} ${ya}L${x + w - tw} ${yn}V${yt}L${x + w - tw / 2} ${top}L${x + w} ${yt}V21.5Z`;
};
const roundTower = (x: number, w: number, h: number, p: number): string => `M${x} 21.5V${21.5 - h}H${x + w}V21.5ZM${x - 0.5} ${21.5 - h}L${x + w / 2} ${21.5 - h - p}L${x + w + 0.5} ${21.5 - h}Z`;

/** The cluster for a town or city: the more people, the more of an old shire it is: cottages and a church, then a cathedral, round towers and ramparts. n runs from 2 to 7. */
function cluster(n: number): Part[] {
  // each building: [kind (c cottage, s church, g cathedral, r round tower, w rampart), x, w, h, peak]; the ground line is y 21.5
  const sets: Record<number, [string, number, number, number, number][]> = {
    2: [['c', 2, 8.4, 5, 4.6], ['s', 12, 5.2, 9, 6.6], ['c', 17.6, 4.6, 3.8, 3]],
    3: [['c', 1.2, 6.4, 5, 4.2], ['s', 8, 5.2, 10, 6.8], ['c', 14, 8, 6, 4.6]],
    4: [['c', 1, 5.6, 4.6, 3.8], ['s', 6.8, 5, 10, 6.8], ['c', 12.4, 5.4, 6, 4.2], ['r', 18.4, 4, 7, 3.6]],
    5: [['c', 0.8, 4.6, 4.4, 3.6], ['g', 5.4, 8.8, 13, 0], ['r', 14.6, 3.8, 8, 4], ['w', 18.4, 5.2, 5, 0]],
    6: [['c', 0.6, 4, 4, 3.4], ['g', 4.6, 9.4, 14.5, 0], ['r', 14.4, 3.6, 9, 4.2], ['w', 17.8, 5.6, 5.4, 0]],
    7: [['w', 0.6, 6, 6, 0], ['r', 5.6, 3.4, 10, 4], ['g', 9.6, 9.6, 15.5, 0], ['r', 19.8, 3.4, 10, 4]],
  };
  const parts: Part[] = [];
  for (const [t, x, w, h, p] of sets[Math.max(2, Math.min(7, n))]) parts.push(fill(t === 'c' ? cot(x, w, h, p) : t === 's' ? spire(x, w, h, p) : t === 'g' ? cathedral(x, w, h) : t === 'r' ? roundTower(x, w, h, p) : keepBlock(x, w, h)));
  parts.push(fill('M0.8 21.5h22.4v1H0.8Z'));
  return parts;
}
for (let n = 2; n <= 7; n++) MORE[`cluster${n}`] = cluster(n);
Object.assign(MORE, SHIRES);
MORE.house = MORE.cottage;

const hashOf = (text: string): number => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pickBy = <T,>(list: T[], seed: string): T => list[hashOf(seed) % list.length];

/** The mark of a city that is not a capital: the bigger it is the more buildings. (`kind` is 'town' for the mid-size metros, 'village' for the smaller cities.) */
export function settlementPic(kind: 'town' | 'village', name: string, pop: number, province: ProvinceId = 'cyrodiil'): string {
  if (kind === 'town') return shirePic(province, pop < 480_000 ? 'M' : 'L', name);
  if (pop >= 140_000) return shirePic(province, 'M', name);
  if (pop >= 80_000) return shirePic(province, 'S', name);
  if (pop >= 45_000) return pickBy([shirePic(province, 'S', name), singleShire(province), 'chapelvillage'], name);
  // the smallest: one building, of a kind that varies from place to place (often one of the land's own)
  return pickBy([singleShire(province), 'cottage', 'chapelvillage', singleShire(province), 'barn', 'inn', 'farm', 'mill', 'windmill', 'granary', 'mine'], name);
}

/** A place in the countryside gets one of several marks of its kind (or one that fits its name: an abbey is a broken chapel, a castle a broken keep). */
export function wildPic(type: string, name: string): string {
  const n = name.toLowerCase();
  if (type === 'ruin') {
    if (/\b(abbey|priory|monastery|church|cathedral|chapel|minster|convent|basilica)\b/.test(n)) return 'ruinchapel';
    if (/\b(castle|fort|fortress|citadel|keep|château|chateau|burg|schloss|kasteel|castillo|castello)\b/.test(n)) return 'ruincastle';
    if (/\b(temple|pyramid|ziggurat|pagoda|shrine|stupa)\b/.test(n)) return 'ruinziggurat';
    if (/\b(bridge|aqueduct|arch|gate|viaduct)\b/.test(n)) return 'ruinarch';
    if (/\b(tower|torre|turm|lighthouse)\b/.test(n)) return 'ruintower';
    if (/\b(circle|henge|stones|dolmen|menhir|cairn)\b/.test(n)) return 'ruincircle';
    if (/\b(villa|palace|palais|manor|hall|house|baths?|thermae|forum|amphitheat\w*|theatre|theater)\b/.test(n)) return 'ruinhall';
    return pickBy(['ruin', 'ruinarch', 'ruincolumns', 'ruintower', 'ruinwall', 'ruinhall', 'ruincolumns', 'ruinwall'], name);
  }
  if (type === 'cave') return pickBy(['cave', 'cavemouth'], name);
  if (type === 'fort') return /\b(gate|tor|porte)\b/.test(n) ? 'fortgate' : pickBy(['fort', 'fortgate', 'fortkeep'], name);
  if (type === 'tower') return pickBy(['tower', 'tower2', 'watchtower'], name);
  if (type === 'lighthouse') return /\b(beacon|fire|signal|light)\b/i.test(n) && /\b(beacon|fire|signal)\b/i.test(n) ? 'beacon' : pickBy(['lighthouse', 'lighthouse2', 'lighthouse3', 'lighthouse4', 'lighthouse5'], name);
  if (type === 'shrine') return pickBy(['shrine', 'chapel', 'obelisk', 'statue'], name);
  if (type === 'grove') return pickBy(['grove', 'pines'], name);
  if (type === 'mill') return /\bwater|\bmühle|\bmoulin/.test(n) ? 'watermill' : pickBy(['mill', 'windmill', 'watermill'], name);
  if (type === 'keep') return pickBy(['keep', 'manor', 'fortkeep'], name);
  if (type === 'peak') return pickBy(['peak', 'peaks2'], name);
  if (type === 'stones') return pickBy(['stones', 'ruincircle'], name);
  return type;
}
