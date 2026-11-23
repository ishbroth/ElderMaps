// The combat game's rules. Enemies walk out of the picture's ground toward the traveller, growing as they come (their size follows the picture's perspective: see Spawns.person);
// the traveller holds a finger on the screen to charge an attack and lets go to strike, so a quick tap is a weak blow and a held one a heavy one. A sword or axe needs its swing
// to finish before the next blow counts; the bow draws and arcs its arrow; magic builds a bolt, a spike or a fireball; life drain is a stream that runs while the finger is down.

import { BOSSES, ENEMIES, STRIKE_SHARE, enemyById, healthForLevel, isSpell, scaledWaves, strengthForLevel, threatOf, weaponAt, type Arsenal, type BossId, type EnemyId, type EnemyType, type ItemCls, type RaidPlan, type Weapon } from './data';

/** Where enemies come from: the horizon line (v), spots on the ground (u, v) they step out of, and how big people look in the picture. */
export interface Spawns {
  horizon: number;
  points: { u: number; v: number }[];
  scale?: number;
  buildingM?: number;
  person?: { v: number; h: number };
  high?: { u: number; v: number }[];
  edges?: { u: number; v: number }[];
}
export const DEFAULT_SPAWNS: Spawns = { horizon: 0.56, points: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.18, 0.5, 0.78].map((u, i) => ({ u, v: 0.62 + (i % 3) * 0.05 })) };

const PERSON_HEIGHT = 0.3;
const STRIKE_V = 0.98;
const strikeHeight = (size: number) => Math.min(0.95, 0.5 * Math.pow(size, 0.7));
export const SLOW_FACTOR = 0.3;
export const SLOW_SECONDS = 8;
/** How close an enemy must be (how far along its walk) for a sword or axe to reach it. */
const REACH_P = 0.45;
/** Seconds the drain is shut off after the finger is lifted (shorter when a weapon struck at the same moment). */
const DRAIN_REST = 1.5;
const DRAIN_REST_WITH_BLOW = 0.8;
const TAP_STRENGTH = 0.2;

export interface Enemy {
  id: number;
  type: EnemyType;
  boss: boolean;
  u0: number; v0: number; toU: number;
  u: number; v: number;
  /** How far along its way (0 to 1). */
  p: number;
  /** The seconds the whole way takes. */
  travel: number;
  hp: number; maxHp: number;
  state: 'walking' | 'striking' | 'leaving' | 'dying';
  t: number;
  hurt: number;
  phase: number;
  exit: number;
  /** Seconds it is slowed by frost, and its walking pose clock. */
  chill: number;
  gait: number;
  lift: number;
  /** A dragon in the sky of a city picture: circling far off, swooping in close and pausing to strike, then back up. */
  sky?: { mode: 'circle' | 'swoop' | 'hover' | 'retreat'; t: number; next: number; baseV: number; hit: number; attacking: boolean };
}

export interface Effect {
  kind: 'slash' | 'arrow' | 'bolt' | 'spike' | 'fireball' | 'burst' | 'miss' | 'shout' | 'number';
  u0: number; v0: number; u: number; v: number;
  t: number; life: number; size: number;
  /** A number to show (damage), and whether it was a full-strength blow. */
  value?: number; crit?: boolean;
}

export type Outcome = 'fighting' | 'won' | 'lost';

/** One hand's weapon or spell and what it is doing. */
export interface Slot {
  weapon: Weapon;
  /** 0 to 1 while the finger is down. */
  charge: number;
  /** Seconds before it can begin charging again (the swing, shot or cast is still going on, or the drain is resting). */
  cd: number;
  /** 0 to 1: how far through the swing it is (for the picture of the hands), and 0 when it is not swinging. */
  swing: number;
  charging: boolean;
}

export interface GameOptions {
  plan: RaidPlan;
  spawns: Spawns;
  arsenal: Arsenal;
  /** What is in the hands (one or two items: a second only when two hands are unlocked). */
  hands: ItemCls[];
  level?: number;
  /** Health potions and Legendary Time (shouts) the traveller carries. */
  potions?: number;
  shouts?: number;
  random?: () => number;
  /** How wide an enemy's picture is against its height, for aiming (given by the screen). */
  ratio?: (e: Enemy) => number;
  /** The picture has sky to fly in and the plan is a dragon: where the sky ends (the dragon circles above that). */
  dragonSky?: { v: number };
}

export class Game {
  readonly plan: RaidPlan;
  readonly spawns: Spawns;
  readonly arsenal: Arsenal;
  slots: Slot[] = [];
  maxHealth: number;
  health: number;
  paused = false;
  potions: number;
  shouts: number;
  /** Seconds of slowed time left, and of the shout's flash. */
  slowLeft = 0;
  shoutT = 0;
  /** Struck down with a potion in the pack: the fight waits for the answer. */
  downed = false;
  enemies: Enemy[] = [];
  effects: Effect[] = [];
  outcome: Outcome = 'fighting';
  killed = 0;
  escaped = 0;
  banner = '';
  bannerT = 0;
  shake = 0;
  hitFlash = 0;
  /** The finger: down or up, and where. */
  holding = false;
  aim = { u: 0.5, v: 0.6 };
  /** The enemy the drain is on now, if it is streaming. */
  drainOn: Enemy | null = null;
  ratio: (e: Enemy) => number;
  private random: () => number;
  private nextId = 1;
  private wave = -1;
  private toSpawn: { type: EnemyType; boss: boolean }[] = [];
  private spawnGap = 0;
  private pause = 1.2;
  private bossDone = false;
  private waves: number[];
  private order: { type: EnemyType; boss: boolean }[][];
  private strength: number;
  private pending: { t: number; run: () => void }[] = [];
  private finalBoss: BossId | null;
  private dragonSky: { v: number } | null;

  constructor(o: GameOptions) {
    this.plan = o.plan; this.spawns = o.spawns; this.arsenal = o.arsenal;
    this.random = o.random ?? Math.random;
    this.ratio = o.ratio ?? (() => 0.5);
    this.maxHealth = healthForLevel(o.level ?? 0);
    this.health = this.maxHealth;
    this.potions = o.potions ?? 0;
    this.shouts = o.shouts ?? 0;
    this.strength = strengthForLevel(o.level ?? 0);
    this.setHands(o.hands);
    this.waves = scaledWaves(o.plan, o.level ?? 0);
    this.order = this.waves.map((size) => Array.from({ length: size }, () => ({ type: enemyById(o.plan.enemies[Math.floor(this.random() * o.plan.enemies.length)]), boss: false })));
    // a dragon turns up at random, never as an ordinary enemy: as the last boss, one fight in eight (and a worth 30 place or more can have one even with no boss of its own)
    this.finalBoss = o.plan.boss;
    this.dragonSky = o.dragonSky ?? null;
    if (o.plan.worth >= 30 && this.random() < 0.125) this.finalBoss = 'dragon';
    this.banner = 'WAVE 1'; this.bannerT = 2.2;
  }

  /** Puts these into the hands (the weapons the traveller owns, up to two, and a two-handed weapon or a bow takes both). */
  setHands(classes: ItemCls[]) {
    const owned = classes.filter((c) => this.arsenal[c] > 0);
    const list = owned.length ? owned : (['onehand'] as ItemCls[]);
    const first = list[0];
    const picked = first === 'twohand' || first === 'bow' ? [first] : list.filter((c) => c !== 'twohand' && c !== 'bow').slice(0, 2);
    this.slots = picked.map((c) => ({ weapon: weaponAt(c, (this.arsenal[c] || 1) as 1 | 2 | 3 | 4), charge: 0, cd: 0, swing: 0, charging: false }));
  }

  get totalEnemies(): number { return this.waves.reduce((a, b) => a + b, 0) + (this.finalBoss ? 1 : 0); }
  get remaining(): number { return Math.max(0, this.totalEnemies - this.killed - this.escaped); }
  get alive(): Enemy[] { return this.enemies.filter((e) => e.state !== 'dying' && e.state !== 'leaving'); }
  get shouting(): boolean { return this.slowLeft > 0; }

  // ---- the finger ----

  press(u: number, v: number) {
    if (this.outcome !== 'fighting' || this.paused || this.downed) return;
    this.holding = true; this.aim = { u, v };
    for (const s of this.slots) if (!isSpell(s.weapon.cls) || s.weapon.cls !== 'drain') { if (s.cd <= 0) { s.charging = true; s.charge = 0; } }
  }
  move(u: number, v: number) { this.aim = { u, v }; }
  /** Lifts the finger: whatever was charging strikes, with a strength by how long it was held. */
  release() {
    if (!this.holding) return;
    this.holding = false;
    let struck = false;
    for (const s of this.slots) {
      if (s.weapon.cls === 'drain') continue;
      if (s.charging) { this.strike(s, Math.max(TAP_STRENGTH, s.charge)); s.charging = false; s.charge = 0; struck = true; }
    }
    for (const s of this.slots) if (s.weapon.cls === 'drain') { s.charging = false; s.cd = struck ? DRAIN_REST_WITH_BLOW : DRAIN_REST; }
    this.drainOn = null;
  }

  // ---- finding what was aimed at ----

  /** The enemy at this point (the one in front if several), or the nearest within a hand's width. */
  pick(u: number, v: number, meleeOnly = false): Enemy | null {
    let best: Enemy | null = null; let bestScore = Infinity;
    for (const e of this.alive) {
      if (meleeOnly && e.p < REACH_P) continue;
      const h = this.heightOf(e), w = h * this.ratio(e);
      const inside = u >= e.u - w / 2 && u <= e.u + w / 2 && v >= e.v - h && v <= e.v + 0.02;
      const d = Math.hypot(u - e.u, (v - (e.v - h / 2)) * 1.1);
      const score = inside ? -e.v : d + 1;
      if ((inside || d < 0.14) && score < bestScore) { best = e; bestScore = score; }
    }
    return best;
  }

  // ---- blows ----

  private damage(e: Enemy, amount: number, crit = false) {
    if (e.state === 'dying') return;
    e.hp -= amount; e.hurt = 0.18;
    this.effects.push({ kind: 'number', u0: e.u, v0: e.v - this.heightOf(e) * 0.8, u: e.u, v: e.v - this.heightOf(e) * 0.8, t: 0, life: 0.8, size: crit ? 1.4 : 1, value: Math.round(amount), crit });
    if (e.hp <= 0) { e.state = 'dying'; e.t = 0; this.killed++; }
  }

  private strike(slot: Slot, strength: number) {
    const w = slot.weapon;
    const crit = strength >= 0.98;
    const dmg = w.damage * (0.25 + 0.75 * strength) * (crit ? 1.25 : 1);
    const target = this.pick(this.aim.u, this.aim.v, w.melee);
    slot.cd = w.swing; slot.swing = 0.0001;
    const fromU = w.cls === 'bow' ? 0.5 : slot.weapon === this.slots[0]?.weapon && this.slots.length > 1 ? 0.7 : this.slots.length > 1 ? 0.3 : 0.5;
    if (!target) { this.effects.push({ kind: w.melee ? 'miss' : w.cls === 'bow' ? 'arrow' : w.cls === 'shock' ? 'bolt' : w.cls === 'frost' ? 'spike' : 'fireball', u0: fromU, v0: 1, u: this.aim.u, v: this.aim.v, t: 0, life: w.melee ? 0.3 : 0.4, size: strength }); return; }
    const tu = target.u, tv = target.v - this.heightOf(target) * 0.55;
    const id = target.id;
    const alive = () => this.enemies.find((x) => x.id === id && x.state !== 'dying');
    if (w.melee) {
      this.effects.push({ kind: 'slash', u0: fromU, v0: 1, u: tu, v: tv, t: 0, life: 0.32, size: w.cls === 'twohand' ? 1.5 : 1 });
      this.pending.push({ t: w.swing * 0.5, run: () => { const e = alive(); if (e) { this.damage(e, dmg, crit); this.shake = Math.max(this.shake, w.cls === 'twohand' ? 0.35 : 0.15); } if (w.cls === 'twohand') for (const o of this.alive) if (o.id !== id && Math.hypot(o.u - tu, o.v - tv) < 0.12 && o.p >= REACH_P) this.damage(o, dmg * 0.5); } });
      return;
    }
    if (w.cls === 'bow') {
      this.effects.push({ kind: 'arrow', u0: 0.5, v0: 1, u: tu, v: tv, t: 0, life: 0.34, size: strength });
      this.pending.push({ t: 0.34, run: () => { const e = alive(); if (e) this.damage(e, dmg, crit); this.effects.push({ kind: 'burst', u0: tu, v0: tv, u: tu, v: tv, t: 0, life: 0.25, size: 0.5 }); } });
    } else if (w.cls === 'shock') {
      this.effects.push({ kind: 'bolt', u0: fromU, v0: 1, u: tu, v: tv, t: 0, life: 0.3, size: strength });
      this.pending.push({ t: 0.06, run: () => { const e = alive(); if (e) this.damage(e, dmg, crit); } });
      // it leaps to the nearest others: one at the first two tiers, two from the third
      let last = target; const chains = w.tier >= 3 ? 2 : 1;
      for (let c = 0; c < chains; c++) {
        const next = this.alive.filter((o) => o.id !== last.id && o.id !== id).sort((a, b) => Math.hypot(a.u - last.u, a.v - last.v) - Math.hypot(b.u - last.u, b.v - last.v))[0];
        if (!next || Math.hypot(next.u - last.u, next.v - last.v) > 0.3) break;
        const nid = next.id, nu = next.u, nv = next.v - this.heightOf(next) * 0.55;
        this.effects.push({ kind: 'bolt', u0: last.u, v0: last.v - this.heightOf(last) * 0.55, u: nu, v: nv, t: 0, life: 0.3, size: strength * 0.7 });
        this.pending.push({ t: 0.1 + c * 0.08, run: () => { const e = this.enemies.find((x) => x.id === nid && x.state !== 'dying'); if (e) this.damage(e, dmg * 0.5); } });
        last = next;
      }
    } else if (w.cls === 'frost') {
      this.effects.push({ kind: 'spike', u0: fromU, v0: 1, u: tu, v: tv, t: 0, life: 0.28, size: strength });
      this.pending.push({ t: 0.28, run: () => { const e = alive(); if (e) { this.damage(e, dmg, crit); e.chill = 2.5 + 2 * strength; } this.effects.push({ kind: 'burst', u0: tu, v0: tv, u: tu, v: tv, t: 0, life: 0.3, size: 0.6 }); } });
    } else if (w.cls === 'fire') {
      this.effects.push({ kind: 'fireball', u0: fromU, v0: 1, u: tu, v: tv, t: 0, life: 0.36, size: 0.5 + strength });
      this.pending.push({ t: 0.36, run: () => {
        const e = alive(); if (e) this.damage(e, dmg, crit);
        for (const o of this.alive) if (o.id !== id && Math.hypot(o.u - tu, (o.v - tv) * 1.2) < 0.13 + 0.07 * strength) this.damage(o, dmg * 0.5);
        this.effects.push({ kind: 'burst', u0: tu, v0: tv, u: tu, v: tv, t: 0, life: 0.45, size: 1 + strength }); this.shake = Math.max(this.shake, 0.2);
      } });
    }
  }

  // ---- potions and shouts ----

  /** The shout of Legendary Time: a wave that knocks the enemies back, then slows the whole fight. */
  useShout(): boolean {
    if (this.shouts <= 0 || this.outcome !== 'fighting' || this.slowLeft > 0) return false;
    this.shouts--; this.slowLeft = SLOW_SECONDS; this.shoutT = 1.2;
    this.effects.push({ kind: 'shout', u0: 0.5, v0: 1, u: 0.5, v: 0.6, t: 0, life: 1.2, size: 1 });
    for (const e of this.alive) { e.p = Math.max(0, e.p - 0.12); this.damage(e, 6); }
    return true;
  }
  /** Drinks a potion when struck down: back to full health, and the fight goes on. */
  drink() { if (this.downed && this.potions > 0) { this.potions--; this.health = this.maxHealth; this.downed = false; } }
  fall() { if (this.downed) { this.downed = false; this.outcome = 'lost'; } }

  // ---- the enemies ----

  /** How tall an enemy is in picture heights: small at the start, filling the screen when it strikes. */
  heightOf(e: Enemy): number {
    const pr = this.spawns.person;
    const scale = this.spawns.scale ?? 1;
    // a dragon over a city: small and far off in the sky, filling the view when it hovers close
    if (e.sky) return 0.09 + 0.62 * Math.pow(Math.max(0, (e.p - 0.12) / 0.74), 1.1);
    const vv = e.type.flying ? Math.max(e.v0, this.spawns.horizon + 0.15) : e.v0;
    const start = pr
      ? Math.max(0.016, pr.h * Math.max(0, vv - this.spawns.horizon) / Math.max(0.05, pr.v - this.spawns.horizon)) * Math.pow(e.type.size, 0.55)
      : Math.max(0.035 * Math.max(1, scale * 0.7), PERSON_HEIGHT * Math.min(1, Math.max(0, (e.v0 - this.spawns.horizon) / (1 - this.spawns.horizon))) * scale * Math.pow(e.type.size, 0.55));
    const end = Math.max(start, strikeHeight(e.type.size));
    const lunge = e.state === 'striking' ? 1 + 0.12 * Math.min(1, e.t / 0.35) : 1;
    return start * Math.pow(end / start, Math.min(1, Math.max(0, e.p))) * lunge;
  }

  private spawn(type: EnemyType, boss: boolean) {
    if (this.dragonSky && type.id === 'dragon') {
      const v = Math.max(0.12, Math.min(0.5, this.dragonSky.v * 0.5));
      this.enemies.push({ id: this.nextId++, type, boss: true, u0: 0.5, v0: v, toU: 0.5, u: 0.5, v, p: 0.12, travel: 1, hp: Math.round(type.hp * 1.4 * this.strength), maxHp: Math.round(type.hp * 1.4 * this.strength), state: 'walking', t: 0, hurt: 0, phase: 0, exit: 1, chill: 0, gait: 0, lift: 0, sky: { mode: 'circle', t: 0, next: 10 + this.random() * 6, baseV: v, hit: 0, attacking: false } });
      return;
    }
    const pts = this.spawns.points;
    const point = pts[Math.floor(this.random() * pts.length)] ?? { u: 0.5, v: 0.64 };
    const v0 = Math.max(this.spawns.horizon + 0.02, point.v);
    const wavePace = Math.max(0.65, 1.2 - 0.07 * Math.max(0, this.wave));
    const travel = Math.min(15, Math.max(4.5, 6.5 * (0.065 / type.speed) * wavePace * (boss ? 1.2 : 1))) * (0.88 + this.random() * 0.24);
    this.enemies.push({
      id: this.nextId++, type, boss, u0: point.u, v0, toU: 0.2 + this.random() * 0.6, u: point.u, v: v0, p: 0, travel,
      hp: Math.round(type.hp * this.strength), maxHp: Math.round(type.hp * this.strength), state: 'walking', t: 0, hurt: 0, phase: this.random() * 6.28, exit: this.random() < 0.5 ? -1 : 1, chill: 0, gait: 0, lift: 0,
    });
  }

  /** The dragon over a city: circle, swoop in, hover and strike, retreat, and again. */
  private flyDragon(e: Enemy, dt: number) {
    const s = e.sky as NonNullable<Enemy['sky']>;
    s.t += dt; e.gait += dt * 4.5;
    if (s.mode === 'circle') {
      e.p = 0.12 + 0.02 * Math.sin(s.t * 0.8);
      e.u = 0.5 + 0.34 * Math.sin(s.t * 0.45); e.v = s.baseV + 0.03 * Math.sin(s.t * 0.9);
      if (s.t >= s.next) { s.mode = 'swoop'; s.t = 0; }
    } else if (s.mode === 'swoop') {
      e.p = Math.min(0.86, e.p + dt / 2.4);
      e.u += (0.5 - e.u) * Math.min(1, dt * 2.2); e.v = s.baseV + (0.84 - s.baseV) * ((e.p - 0.12) / 0.74);
      if (e.p >= 0.86) { s.mode = 'hover'; s.t = 0; s.hit = 0; }
    } else if (s.mode === 'hover') {
      // it pauses in front, in reach of a sword, and strikes
      e.p = 0.86; e.u = 0.5 + 0.06 * Math.sin(s.t * 1.6); e.v = 0.84 + 0.01 * Math.sin(s.t * 3);
      const cycle = e.type.every;
      const phase = s.t - s.hit * cycle;
      s.attacking = phase > cycle - 0.45;
      if (phase >= cycle) {
        const [lo, hi] = STRIKE_SHARE.strong;
        this.health -= this.maxHealth * (lo + this.random() * (hi - lo)) * this.strength; this.shake = 0.7; this.hitFlash = 1; s.hit++;
        if (this.health <= 0) { if (this.potions > 0) { this.health = 0; this.downed = true; } else { this.health = 0; this.outcome = 'lost'; } }
      }
      if (s.t >= 5.5) { s.mode = 'retreat'; s.t = 0; s.attacking = false; }
    } else {
      e.p = Math.max(0.12, e.p - dt / 2.2);
      e.v = s.baseV + (0.84 - s.baseV) * ((e.p - 0.12) / 0.74); e.u += (0.5 + 0.34 * Math.sin(s.t) - e.u) * Math.min(1, dt);
      if (e.p <= 0.121) { s.mode = 'circle'; s.t = 0; s.next = 11 + this.random() * 6; }
    }
  }

  update(dt: number) {
    if (this.outcome !== 'fighting' || this.paused || this.downed) return;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.4);
    this.shoutT = Math.max(0, this.shoutT - dt);
    this.slowLeft = Math.max(0, this.slowLeft - dt);
    const edt = dt * (this.slowLeft > 0 ? SLOW_FACTOR : 1);

    // pending blows and the effects
    for (const q of this.pending) q.t -= dt;
    const due = this.pending.filter((q) => q.t <= 0); this.pending = this.pending.filter((q) => q.t > 0);
    for (const q of due) q.run();
    for (const f of this.effects) f.t += dt;
    this.effects = this.effects.filter((f) => f.t < f.life);

    // the hands
    for (const s of this.slots) {
      if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
      if (s.swing > 0) { s.swing += dt / Math.max(0.05, s.weapon.swing); if (s.swing >= 1) s.swing = 0; }
      if (s.charging && s.weapon.charge > 0) s.charge = Math.min(1, s.charge + dt / s.weapon.charge);
    }
    // the drain: a stream while the finger is down and it is not resting
    this.drainOn = null;
    const drain = this.slots.find((s) => s.weapon.cls === 'drain');
    if (drain && this.holding && drain.cd <= 0) {
      const t = this.pick(this.aim.u, this.aim.v) ?? this.alive.sort((a, b) => b.v - a.v)[0] ?? null;
      if (t) {
        const dealt = drain.weapon.damage * dt;
        this.drainOn = t; t.hp -= dealt; t.hurt = Math.max(t.hurt, 0.05);
        this.health = Math.min(this.maxHealth, this.health + dealt * 0.5);
        if (t.hp <= 0 && t.state !== 'dying') { t.state = 'dying'; t.t = 0; this.killed++; }
      }
    }

    // who comes next
    if (this.toSpawn.length === 0 && this.alive.length === 0 && !this.enemies.some((e) => e.state === 'leaving')) {
      if (this.wave + 1 < this.waves.length) {
        this.pause -= dt;
        if (this.pause <= 0) { this.wave++; this.toSpawn = [...this.order[this.wave]]; this.banner = `WAVE ${this.wave + 1}`; this.bannerT = 2; this.pause = 1.6; this.spawnGap = 0; }
      } else if (this.finalBoss && !this.bossDone) {
        this.pause -= dt;
        if (this.pause <= 0) { this.bossDone = true; this.toSpawn = [{ type: enemyById(this.finalBoss), boss: true }]; this.banner = this.finalBoss === 'dragon' ? 'A DRAGON!' : 'BOSS'; this.bannerT = 2.6; this.spawnGap = 0; }
      } else if (this.enemies.every((e) => e.state === 'dying' ? e.t > 0.9 : true)) {
        this.outcome = 'won';
      }
    }
    this.spawnGap -= edt;
    if (this.toSpawn.length > 0 && this.spawnGap <= 0) {
      const next = this.toSpawn.shift() as { type: EnemyType; boss: boolean };
      this.spawn(next.type, next.boss);
      this.spawnGap = Math.max(0.5, 1.6 - 0.1 * Math.max(0, this.wave)) + this.random() * 0.7;
    }

    // the enemies
    for (const e of this.enemies) {
      e.t += dt; e.hurt = Math.max(0, e.hurt - dt);
      if (e.chill > 0) e.chill = Math.max(0, e.chill - dt);
      const slow = e.chill > 0 ? 0.4 : 1;
      if (e.sky && e.state === 'walking') { this.flyDragon(e, edt); continue; }
      if (e.state === 'walking') {
        const stopAt = e.type.ranged ? 0.8 : 1;
        e.p = Math.min(stopAt, e.p + (edt * slow) / e.travel);
        e.gait += edt * slow * (0.9 + 0.3 / Math.max(0.3, e.type.size));
        e.v = e.v0 + (STRIKE_V - e.v0) * e.p;
        e.u = e.u0 + (e.toU - e.u0) * e.p * 0.7 + Math.sin(e.phase + e.p * 6.5) * 0.018 * (1 - e.p);
        e.lift = e.type.flying ? 0.02 + 0.015 * Math.sin(e.gait * 2) : Math.abs(Math.sin(e.gait * Math.PI)) * 0.006;
        if (e.p >= stopAt) { e.state = 'striking'; e.t = 0; }
      } else if (e.state === 'striking') {
        // the wind-up, then the blow
        if (e.t >= 0.42) {
          const [lo, hi] = STRIKE_SHARE[threatOf(e.type)];
          this.health -= this.maxHealth * (lo + this.random() * (hi - lo)) * this.strength;
          this.shake = 0.6; this.hitFlash = 1;
          e.state = 'leaving'; e.t = 0; this.escaped++;
          if (this.health <= 0) { if (this.potions > 0) { this.health = 0; this.downed = true; } else { this.health = 0; this.outcome = 'lost'; } }
        }
      } else if (e.state === 'leaving') {
        e.u += e.exit * edt * 0.25; e.v = Math.min(1, e.v + edt * 0.05);
      }
    }
    this.enemies = this.enemies.filter((e) => (e.state === 'dying' ? e.t < 1.6 : e.state === 'leaving' ? e.t < 1.1 : true));
  }
}

export { BOSSES, ENEMIES };
export type { BossId, EnemyId };
