// The written lore of the larger places (made by _tools/gen-lore.mjs from what each place is really known for, with a fantasy twist in the voice of its part of the world).
// A place without an entry gets the general lines of scenes.ts.

const BASE = import.meta.env.BASE_URL;
let loading: Promise<Record<string, string[]>> | null = null;

export function loadLore(): Promise<Record<string, string[]>> {
  loading ??= fetch(`${BASE}data/lore.json`).then((r) => (r.ok ? (r.json() as Promise<Record<string, string[]>>) : {})).catch(() => ({}));
  return loading;
}

/** The lines written for a place (its name put in), or null. */
export async function loreFor(id: string, name: string): Promise<string[] | null> {
  const lines = (await loadLore())[id];
  return lines ? lines.map((l) => l.split('{n}').join(name)) : null;
}
