// What lives in the places of the realm, and what the traveller fights with. The ids are working names; `name` is what people read, and it is our own (nothing from the games on screen).

export type EnemyId = 'skeleton' | 'wight' | 'bandit' | 'banditmaned' | 'banditscale' | 'brassspider' | 'brasssphere' | 'marshcrab' | 'troll' | 'sabretiger' | 'mammoth' | 'giant' | 'vampire' | 'sorcerer';
export type BossId = 'gjenganger' | 'colossus' | 'dragon';

export interface EnemyType {
  id: EnemyId | BossId;
  name: string;
  plural: string;
  hp: number;
  /** Screen widths a second it crosses (kept from the old game: it sets how long it takes to arrive). */
  speed: number;
  /** Seconds between its blows once it is close. */
  every: number;
  /** How big it is next to a person at the same distance (1 = a man). */
  size: number;
  flying?: boolean;
  /** Strikes from a distance instead of closing in. */
  ranged?: boolean;
  /** What the journal says about it living in the place. */
  now: string;
}

/** Hit points are scaled so the weakest enemy falls to two blows of the starting sword (16 damage each). */
const S = 0.9;
export const ENEMIES: Record<EnemyId, EnemyType> = {
  skeleton: { id: 'skeleton', name: 'Skeleton', plural: 'skeletons', hp: Math.round(30 * S), speed: 0.055, every: 1.5, size: 1, now: 'Skeletons rattle through it with rusted blades, and they do not tire.' },
  bandit: { id: 'bandit', name: 'Bandit', plural: 'bandits', hp: Math.round(30 * S), speed: 0.06, every: 1.5, size: 1, ranged: true, now: 'A gang of bandits has made a camp of it, and they do not welcome visitors.' },
  banditmaned: { id: 'banditmaned', name: 'Maned Raider', plural: 'maned raiders', hp: Math.round(34 * S), speed: 0.075, every: 1.3, size: 1, now: 'Maned raiders prowl it, quick and silent, with curved knives.' },
  banditscale: { id: 'banditscale', name: 'Scalekin Raider', plural: 'scalekin raiders', hp: Math.round(36 * S), speed: 0.065, every: 1.4, size: 1, now: 'Scalekin raiders hold it, hissing from the shadows with bone spears.' },
  brassspider: { id: 'brassspider', name: 'Brasspider', plural: 'brasspiders', hp: Math.round(40 * S), speed: 0.1, every: 1.1, size: 0.6, now: 'Brasspiders, clockwork and old, skitter out of the walls.' },
  marshcrab: { id: 'marshcrab', name: 'Marsh Crab', plural: 'marsh crabs', hp: Math.round(45 * S), speed: 0.07, every: 1.2, size: 0.7, now: 'Marsh crabs have crept up out of the water and nest among the stones.' },
  wight: { id: 'wight', name: 'Barrow Wight', plural: 'barrow wights', hp: Math.round(70 * S), speed: 0.05, every: 1.5, size: 1.1, now: 'Barrow wights, bound by old oaths, have not left their posts.' },
  brasssphere: { id: 'brasssphere', name: 'Brassphere', plural: 'brasspheres', hp: Math.round(90 * S), speed: 0.07, every: 1.2, size: 0.9, now: 'Brasspheres roll the halls and unfold into whirling blades.' },
  vampire: { id: 'vampire', name: 'Vampire', plural: 'vampires', hp: Math.round(110 * S), speed: 0.055, every: 1.6, size: 1.1, ranged: true, now: 'Vampires keep court in it, elegant and starving.' },
  sorcerer: { id: 'sorcerer', name: 'Sorcerer', plural: 'sorcerers', hp: Math.round(95 * S), speed: 0.05, every: 1.7, size: 1.05, ranged: true, now: 'A sorcerer has made it a tower of experiments, and the experiments walk.' },
  sabretiger: { id: 'sabretiger', name: 'Sabre Tiger', plural: 'sabre tigers', hp: Math.round(160 * S), speed: 0.09, every: 1.2, size: 1.5, now: 'Sabre tigers hunt the slopes around it, and they hunt in pairs.' },
  troll: { id: 'troll', name: 'Troll', plural: 'trolls', hp: Math.round(200 * S), speed: 0.055, every: 1.6, size: 1.8, now: 'A troll has taken it for a den and guards its bones.' },
  mammoth: { id: 'mammoth', name: 'Mammoth', plural: 'mammoths', hp: Math.round(380 * S), speed: 0.05, every: 1.9, size: 2.4, now: 'Mammoths graze round it, and they are not gentle when disturbed.' },
  giant: { id: 'giant', name: 'Giant', plural: 'giants', hp: Math.round(470 * S), speed: 0.05, every: 2, size: 2.8, now: 'A giant stands in the middle of it with a club the size of a tree.' },
};

export const BOSSES: Record<BossId, EnemyType> = {
  gjenganger: { id: 'gjenganger', name: 'Gjenganger', plural: 'gjengangers', hp: Math.round(700 * S), speed: 0.045, every: 1.6, size: 2.4, now: 'A Gjenganger, lord of the dead, sits on the oldest throne of it.' },
  colossus: { id: 'colossus', name: 'Brass Colossus', plural: 'brass colossi', hp: Math.round(1000 * S), speed: 0.04, every: 2, size: 3.2, now: 'A brass colossus still keeps its watch over the machinery.' },
  dragon: { id: 'dragon', name: 'Dragon', plural: 'dragons', hp: Math.round(1400 * S), speed: 0.045, every: 1.8, size: 3.6, flying: true, now: 'A dragon has come to roost on it, and the sky itself is afraid.' },
};
export const enemyById = (id: EnemyId | BossId): EnemyType => (ENEMIES as Record<string, EnemyType>)[id] ?? (BOSSES as Record<string, EnemyType>)[id];

export type Threat = 'weak' | 'medium' | 'strong';
export const threatOf = (t: EnemyType): Threat => (t.id in BOSSES || t.id === 'mammoth' || t.id === 'giant' ? 'strong' : ['wight', 'brasssphere', 'vampire', 'sorcerer', 'sabretiger', 'troll'].includes(t.id) ? 'medium' : 'weak');
/** The share of the health bar one blow takes (about a third, a bit more for the strong). */
export const STRIKE_SHARE: Record<Threat, [number, number]> = { weak: [0.25, 0.33], medium: [0.3, 0.38], strong: [0.33, 0.4] };

// ---- what the traveller fights with ----

/** The hands: one-handed weapons (what you begin with), two-handed ones, the bow, and four kinds of magic. */
export type ItemCls = 'onehand' | 'twohand' | 'bow' | 'shock' | 'frost' | 'fire' | 'drain';
export const ITEM_CLASSES: ItemCls[] = ['onehand', 'twohand', 'bow', 'shock', 'frost', 'fire', 'drain'];
export const isSpell = (c: ItemCls): boolean => c === 'shock' || c === 'frost' || c === 'fire' || c === 'drain';
export type Tier = 1 | 2 | 3 | 4;
/** What the traveller owns: the tier of each (0 = not yet). */
export type Arsenal = Record<ItemCls, 0 | Tier>;
export const STARTING_ARSENAL: Arsenal = { onehand: 1, twohand: 0, bow: 0, shock: 0, frost: 0, fire: 0, drain: 0 };

export interface Weapon {
  cls: ItemCls;
  tier: Tier;
  name: string;
  /** Damage at full charge (a drain's is damage a second). */
  damage: number;
  /** Seconds to charge fully, and seconds the swing (or shot, or cast) takes before the next can begin. */
  charge: number;
  swing: number;
  /** Melee reaches only enemies that have come close; the bow and magic reach all. */
  melee: boolean;
  /** The picture of the hands holding it. */
  art: string;
}

const W = (cls: ItemCls, tier: Tier, name: string, damage: number, charge: number, swing: number, melee: boolean, art: string): Weapon => ({ cls, tier, name, damage, charge, swing, melee, art });
const TABLE: Record<ItemCls, Weapon[]> = {
  onehand: [W('onehand', 1, 'Iron Sword', 16, 0.7, 0.45, true, 'iron1h'), W('onehand', 2, 'Steel Sword', 24, 0.7, 0.45, true, 'steel1h'), W('onehand', 3, 'Gilded Blade', 36, 0.7, 0.45, true, 'gilded1h'), W('onehand', 4, 'Nightglass Blade', 52, 0.7, 0.45, true, 'night1h')],
  twohand: [W('twohand', 1, 'Iron Greatsword', 32, 1.3, 0.8, true, 'iron2h'), W('twohand', 2, 'Steel Battleaxe', 48, 1.3, 0.8, true, 'steel2h'), W('twohand', 3, 'Gilded Warhammer', 72, 1.3, 0.8, true, 'gilded2h'), W('twohand', 4, 'Nightglass Greatblade', 104, 1.3, 0.8, true, 'night2h')],
  bow: [W('bow', 1, 'Hunting Bow', 22, 1, 0.5, false, 'hunterbow'), W('bow', 2, 'Longbow', 32, 1, 0.5, false, 'longbow'), W('bow', 3, 'Gilded Bow', 48, 1, 0.5, false, 'gildedbow'), W('bow', 4, 'Nightglass Bow', 70, 1, 0.5, false, 'nightbow')],
  shock: [W('shock', 1, 'Sparks', 18, 0.8, 0.4, false, 'shock'), W('shock', 2, 'Lightning', 28, 0.8, 0.4, false, 'shock'), W('shock', 3, 'Chain Lightning', 42, 0.8, 0.4, false, 'shock'), W('shock', 4, 'Thunderstorm', 60, 0.8, 0.4, false, 'shock')],
  frost: [W('frost', 1, 'Ice Spike', 20, 0.9, 0.45, false, 'frost'), W('frost', 2, 'Ice Lance', 30, 0.9, 0.45, false, 'frost'), W('frost', 3, 'Glacier Spear', 46, 0.9, 0.45, false, 'frost'), W('frost', 4, 'Winter\'s Fang', 66, 0.9, 0.45, false, 'frost')],
  fire: [W('fire', 1, 'Firebolt', 26, 1, 0.5, false, 'fire'), W('fire', 2, 'Fireball', 38, 1, 0.5, false, 'fire'), W('fire', 3, 'Inferno', 58, 1, 0.5, false, 'fire'), W('fire', 4, 'Sun\'s Wrath', 84, 1, 0.5, false, 'fire')],
  drain: [W('drain', 1, 'Life Drain', 12, 0, 0.1, false, 'drain'), W('drain', 2, 'Soul Siphon', 18, 0, 0.1, false, 'drain'), W('drain', 3, 'Vampiric Grasp', 26, 0, 0.1, false, 'drain'), W('drain', 4, 'Heart Tide', 38, 0, 0.1, false, 'drain')],
};
export const weaponAt = (cls: ItemCls, tier: Tier): Weapon => TABLE[cls][tier - 1];
/** What each class is called on the wheel. */
export const CLASS_NAME: Record<ItemCls, string> = { onehand: 'ONE-HANDED', twohand: 'TWO-HANDED', bow: 'BOW', shock: 'SHOCK', frost: 'FROST', fire: 'FIRE', drain: 'LIFE DRAIN' };

// ---- what waits in a place ----

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seeded = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

export interface RaidPlan {
  worth: number;
  enemies: (EnemyId | BossId)[];
  boss: BossId | null;
  waves: number[];
  total: number;
}

const COLD = new Set(['skyrim', 'atmora', 'solstheim']);

/** The kinds of enemy a place can have, by what it is and where. A dragon is never here: it only ever comes as a boss, at random (see the game). */
function poolFor(kind: string, worth: number, province: string): EnemyId[] {
  const raider: EnemyId = province === 'elsweyr' || province === 'hammerfell' ? 'banditmaned' : province === 'blackmarsh' || province === 'valenwood' ? 'banditscale' : 'bandit';
  const pool: EnemyId[] = [];
  if (kind === 'cave') pool.push('skeleton', 'wight', 'brassspider', 'marshcrab');
  else if (kind === 'ruin' || kind === 'stones') pool.push('skeleton', 'wight', 'brassspider', raider);
  else if (kind === 'waterfall' || kind === 'spring' || kind === 'lighthouse') pool.push('marshcrab', raider, 'sabretiger');
  else if (kind === 'peak' || kind === 'glacier' || kind === 'pass' || kind === 'volcano' || kind === 'grove') pool.push('sabretiger', raider, 'skeleton');
  else if (kind === 'fort' || kind === 'camp') pool.push(raider, 'skeleton', 'sorcerer');
  else pool.push(raider, 'skeleton', 'brassspider'); // cities, towns, mills, manors, landmarks
  if (worth >= 15 && (kind === 'keep' || kind === 'tower' || kind === 'shrine' || kind === 'fort' || kind === 'crest' || kind === 'town')) pool.push('vampire', 'sorcerer');
  if (worth >= 20 && (kind === 'ruin' || kind === 'cave') && (province === 'morrowind' || province === 'orsinium' || province === 'skyrim')) pool.push('brasssphere');
  if (worth >= 20 && (kind === 'peak' || kind === 'glacier' || kind === 'pass' || kind === 'grove')) pool.push('troll');
  if (worth >= 30 && (kind === 'peak' || kind === 'glacier' || kind === 'pass' || kind === 'grove' || kind === 'volcano') && COLD.has(province)) pool.push('mammoth');
  if (worth >= 50 && (kind === 'peak' || kind === 'glacier' || kind === 'volcano' || kind === 'grove')) pool.push('giant');
  return pool;
}

/** Pieces of loot a win pays, least and most, by the place's worth. */
export function lootRangeFor(worth: number): [number, number] {
  if (worth >= 75) return [7, 10];
  if (worth >= 50) return [5, 8];
  if (worth >= 30) return [4, 5];
  if (worth >= 15) return [3, 4];
  return [2, 3];
}

/** One wave after another: one enemy, then two, growing until the rest arrive together. */
export function wavesFor(total: number): number[] {
  const waves: number[] = [];
  let left = total, next = 1;
  while (left > 0) {
    const size = Math.min(left, next);
    waves.push(size); left -= size;
    next = next < 3 ? next + 1 : Math.ceil(next * 1.6);
  }
  if (waves.length > 1) { const prev = waves[waves.length - 2]; waves[waves.length - 1] = Math.max(waves[waves.length - 1], 4, prev >= 4 ? prev + 1 : prev); }
  return waves;
}

/** The plan for a place: the same for everyone, from its id, what it is and what it is worth. */
export function planFor(id: string, kind: string, worth: number, province: string): RaidPlan {
  const rand = seeded(hash(`${id}|raid`));
  const pool = poolFor(kind, worth, province);
  const first = pool[Math.floor(rand() * pool.length)];
  const second = rand() < 0.34 ? pool.filter((e) => e !== first)[Math.floor(rand() * (pool.length - 1))] : null;
  const enemies: EnemyId[] = second ? [first, second] : [first];
  // the lords of the old places: a Gjenganger in a barrow or ruin, a brass colossus in a brass ruin, from worth 50
  let boss: BossId | null = null;
  if (worth >= 50) boss = (kind === 'ruin' || kind === 'cave' || kind === 'stones' || kind === 'shrine') ? (province === 'morrowind' || province === 'orsinium' ? 'colossus' : 'gjenganger') : kind === 'mill' || kind === 'tower' || kind === 'fort' ? 'colossus' : 'gjenganger';
  const budget = 120 + worth * 24;
  const avgHp = enemies.reduce((sum, e) => sum + enemyById(e).hp, 0) / enemies.length;
  let total = Math.max(hashLeast(enemies), Math.min(40, Math.round((boss ? budget * 0.6 : budget) / avgHp)));
  if (boss) total = Math.max(3, Math.min(total, 24));
  const waves = wavesFor(total);
  return { worth, enemies, boss, waves, total: waves.reduce((a, b) => a + b, 0) };
}
const hashLeast = (enemies: EnemyId[]): number => { const hardest = Math.max(...enemies.map((e) => enemyById(e).hp)); return hardest > 270 ? 2 : hardest > 135 ? 3 : 5; };

/** How much a place is worth, by how widely the world writes about it (more than that and it has a boss). */
export const worthFor = (kind: string, fame: number): number => (kind === 'crest' ? 50 : kind === 'town' ? 30 : fame >= 90 ? 75 : fame >= 50 ? 50 : fame >= 20 ? 30 : fame >= 8 ? 20 : fame >= 3 ? 15 : 10);

export const BASE_HEALTH = 100;
export const healthForLevel = (level: number): number => BASE_HEALTH * (1 + 0.01 * Math.max(0, level));
export const strengthForLevel = (level: number): number => 1 + 0.005 * Math.max(0, level);
export function scaledWaves(plan: RaidPlan, level: number): number[] {
  if (level <= 0) return plan.waves;
  const waves = plan.waves.map((size) => Math.max(size, Math.floor(size * (1 + 0.1 * level) + 1e-9)));
  for (let i = 0; i < Math.floor(level / 20); i++) waves.push(waves[waves.length - 1]);
  return waves;
}
