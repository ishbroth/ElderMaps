// Points and levels. Reaching a place earns points; points fill a level bar. Level 1 is eight of the least valuable places (8 x 10 = 80 points), and every level after asks for 5% more than the one before.

export const FIRST_LEVEL_POINTS = 80;
export const LEVEL_GROWTH = 1.05;

/** Total points needed to reach a level (level 0 needs none). */
export const pointsForLevel = (level: number): number => Math.ceil((FIRST_LEVEL_POINTS * (Math.pow(LEVEL_GROWTH, level) - 1)) / (LEVEL_GROWTH - 1) - 1e-9);

export interface LevelInfo { level: number; into: number; needed: number; toGo: number }

/** Where a points total puts someone: their level and how far through the next one they are. */
export function levelInfo(points: number): LevelInfo {
  let level = Math.max(0, Math.floor(Math.log(1 + (points * (LEVEL_GROWTH - 1)) / FIRST_LEVEL_POINTS) / Math.log(LEVEL_GROWTH) + 1e-9));
  while (pointsForLevel(level + 1) <= points) level++;
  while (level > 0 && pointsForLevel(level) > points) level--;
  const from = pointsForLevel(level), to = pointsForLevel(level + 1);
  return { level, into: points - from, needed: to - from, toGo: to - points };
}
