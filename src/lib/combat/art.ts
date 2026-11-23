// The pictures the combat game draws: four poses for each enemy (walk, walk, attack, dead) and the traveller's hands holding each weapon, painted by the image model and cut
// out by _tools/process-combat-art.mjs. A missing one is drawn as a plain silhouette instead.

export interface EnemySprites { frames: HTMLImageElement[] }
export interface CombatAssets { enemies: Record<string, EnemySprites>; weapons: Record<string, HTMLImageElement> }

interface Manifest { enemies: Record<string, { frames: { file: string }[] }>; weapons: Record<string, { file: string }> }

const base = `${import.meta.env.BASE_URL}combat/`;
let manifest: Promise<Manifest | null> | null = null;
const cache = new Map<string, Promise<HTMLImageElement | null>>();

function image(file: string): Promise<HTMLImageElement | null> {
  if (!cache.has(file)) {
    cache.set(file, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = base + file;
    }));
  }
  return cache.get(file) as Promise<HTMLImageElement | null>;
}

export async function loadCombatAssets(enemyIds: string[], weaponArt: string[]): Promise<CombatAssets> {
  manifest ??= fetch(`${base}manifest.json`).then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null)).catch(() => null);
  const m = await manifest;
  const out: CombatAssets = { enemies: {}, weapons: {} };
  if (!m) return out;
  await Promise.all([
    ...enemyIds.map(async (id) => {
      const entry = m.enemies[id]; if (!entry) return;
      const frames = await Promise.all(entry.frames.map((f) => image(f.file)));
      if (frames.every(Boolean)) out.enemies[id] = { frames: frames as HTMLImageElement[] };
    }),
    ...weaponArt.map(async (id) => { const entry = m.weapons[id]; if (!entry) return; const img = await image(entry.file); if (img) out.weapons[id] = img; }),
  ]);
  return out;
}
