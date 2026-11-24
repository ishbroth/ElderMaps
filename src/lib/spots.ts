// A discovered place is remembered by its id; this turns an id back into a mark the map can open (the same marks the map draws).

import type { Spot } from '../App';
import { settlementPic, wildPic } from './glyphsMore';
import { KIND_TITLE, loreName } from './lore';
import type { World } from './world';

let wildById: Map<string, World['wild'][number]> | null = null;

export function spotById(world: World, id: string): Spot | null {
  if (id.startsWith('w:')) {
    wildById ??= new Map(world.wild.map((w) => [w[0], w]));
    const w = wildById.get(id.slice(2));
    if (!w) return null;
    const [, name, lat, lng, type, fame] = w;
    const province = world.provinceAt(lat, lng);
    return { id, kind: type, real: name, name: ['peak', 'volcano', 'glacier', 'grove'].includes(type) ? name : loreName(name, province), province, lat, lng, fame, pic: wildPic(type, name), note: KIND_TITLE[type] ?? type };
  }
  if (id.startsWith('c:')) {
    const [, name, latText] = id.split(':');
    const lat = Number(latText);
    for (const tier of ['crest', 'town', 'village'] as const) {
      const c = world.cities[tier].find((x) => x[0] === name && Math.abs(x[1] - lat) < 0.01);
      if (c) {
        const province = world.provinceOfCountry(c[5]);
        return { id, kind: tier, real: c[0], name: loreName(c[0], province), province, lat: c[1], lng: c[2], fame: c[3], pic: tier === 'crest' ? undefined : settlementPic(tier, c[0], c[3], province), iso2: c[5], note: tier === 'village' ? 'A settlement of farms, mills and mines about a bigger place' : `${Math.round(c[3] / 1000).toLocaleString('en-US')} thousand souls` };
      }
    }
    return null;
  }
  if (id.startsWith('k:')) {
    const [, metroId, ...rest] = id.split(':');
    const name = rest.join(':');
    const m = world.metros.find((x) => x.id === metroId);
    const k = world.keys[metroId]?.find((x) => x[0] === name);
    if (!m || !k) return null;
    const province = world.provinceOfCountry(m.country);
    return { id, kind: k[3], real: k[0], name: k[3] === 'keep' ? `${loreName(m.name, province)} Keep` : k[0], province, lat: k[1], lng: k[2], fame: k[5], note: k[3] === 'landmark' ? k[4] : `Round ${loreName(m.name, province)}` };
  }
  return null;
}
