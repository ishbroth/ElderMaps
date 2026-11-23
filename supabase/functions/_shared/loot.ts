// The loot of the realm (the same list as src/lib/loot.ts, which is what the page shows; this copy is what the server rolls from). Materials and ingots are found everywhere, the herbs
// by region. The ids are working names.

export const MATERIALS = ['wood', 'stone', 'leather', 'iron', 'dwarven', 'gold', 'ebony'];
const PLAIN_HERBS = ['tundra_cotton', 'blisterwort', 'canis_root'];
const REGIONAL: Record<string, string[]> = {
  skyrim: ['snowberry'], atmora: ['snowberry'], solstheim: ['snowberry'], cyrodiil: ['nirnroot'], highrock: ['nirnroot'], summerset: ['nirnroot'],
  morrowind: ['ash_yam', 'comberry', 'glow_cap'], blackmarsh: ['comberry', 'hist_sap'], valenwood: ['hist_sap', 'glow_cap'], elsweyr: ['moon_sugar', 'sand_lily'], hammerfell: ['moon_sugar', 'sand_lily'],
  orsinium: ['tusk_thistle'], shivering: ['glow_cap', 'dream_blossom'],
};

/** The loot a place of this province can pay (the plain materials and ingots, the herbs that grow there). */
export function lootFor(province: string): string[] {
  const cold = province === 'skyrim' || province === 'solstheim' || province === 'atmora';
  const dry = province === 'hammerfell' || province === 'elsweyr';
  const damp = ['morrowind', 'blackmarsh', 'valenwood', 'shivering'].includes(province);
  const plain = PLAIN_HERBS.filter((h) => (h === 'tundra_cotton' ? cold : h === 'blisterwort' ? damp : !dry));
  return [...MATERIALS, ...plain, ...(REGIONAL[province] ?? [])];
}

/** The least and most pieces a win pays, by worth. */
export function lootRangeFor(worth: number): [number, number] {
  if (worth >= 75) return [7, 10];
  if (worth >= 50) return [5, 8];
  if (worth >= 30) return [4, 5];
  if (worth >= 15) return [3, 4];
  return [2, 3];
}

/** What a win pays: a number of pieces within the place's range, from one to three kinds (at least one of each). The rarer ingots are rarer. */
export function rollLoot(worth: number, province: string, random: () => number = Math.random): Record<string, number> {
  const [min, max] = lootRangeFor(worth);
  const pieces = min + Math.floor(random() * (max - min + 1));
  const all = lootFor(province);
  // weights: wood, stone, leather and the herbs are common; iron less; the three fine ingots rare (rarer in the small places)
  const weight = (id: string) => (id === 'iron' ? 0.7 : id === 'gold' ? 0.3 + worth / 200 : id === 'dwarven' || id === 'ebony' ? 0.12 + worth / 250 : 1);
  const kinds = Math.min(pieces, 1 + Math.floor(random() * 3));
  const chosen: string[] = [];
  while (chosen.length < kinds) {
    const pool = all.filter((i) => !chosen.includes(i));
    const total = pool.reduce((s, i) => s + weight(i), 0);
    let r = random() * total;
    chosen.push(pool.find((i) => (r -= weight(i)) <= 0) ?? pool[0]);
  }
  const out: Record<string, number> = {};
  chosen.forEach((i) => { out[i] = 1; });
  for (let n = chosen.length; n < pieces; n++) { const i = chosen[Math.floor(random() * chosen.length)]; out[i] = (out[i] ?? 0) + 1; }
  return out;
}
