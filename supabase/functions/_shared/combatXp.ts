// Experience from fighting, in tenths of a point (discovering a place gives 10 to 75 whole points; a whole place cleared here gives about 5 to 25). A foe is worth by how hard it is.
// A fight can happen once per place (and only for a glimpse that was paid for), so this cannot be farmed.

/** Tenths of a point for each kind of foe vanquished. */
export const KILL_TENTHS: Record<string, number> = {
  rathide: 3, skeleton: 4, bandit: 4, banditmaned: 4, banditscale: 4, marshcrab: 5, brassspider: 6, wight: 7, brasssphere: 8, vampire: 9, sorcerer: 9,
  sabretiger: 14, troll: 18, mammoth: 24, giant: 28,
  gjenganger: 70, vampirelord: 80, colossus: 90, giantchief: 100, dragon: 120,
};

/** What a fight is worth: the foes killed (capped, since the phone reports them), half of it for a lost fight, and a bonus for clearing the place. */
export function xpTenths(kills: Record<string, unknown>, won: boolean, worth: number): number {
  let total = 0, count = 0;
  for (const [id, n] of Object.entries(kills)) {
    const each = KILL_TENTHS[id];
    if (!each) continue;
    const k = Math.max(0, Math.min(40, Math.floor(Number(n) || 0)));
    count += k;
    if (count > 60) break;
    total += each * k;
  }
  total = Math.round(total * (won ? 1 : 0.5));
  if (won) total += Math.round(worth * 1.5);
  return Math.min(total, 600);
}
