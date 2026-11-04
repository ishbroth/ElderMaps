// The crests of the big cities. Every crest city has its own shield: one of four shapes, a field of one colour with a pattern laid over it, and a device that
// stands for something real about the city (its animal, tree, flower, landmark or trade). The choices were researched city by city and are kept in
// public/data/crests.json; a city without an entry gets a steady pick from its name.

import { ALL_EMBLEMS, FIELDS, PATTERNS, type EmblemId, type Field, type Pattern } from './emblems/vocabulary';
import type { EmblemPart } from './emblems/types';
import ANIMALS from './emblems/animals';
import PLANTS from './emblems/plants';
import THINGS from './emblems/things';

const EMBLEMS: Record<string, EmblemPart[]> = { ...ANIMALS, ...PLANTS, ...THINGS };

export interface CrestChoice { e: EmblemId; f: Field; p: Pattern; s?: number }
let table: Record<string, CrestChoice> = {};

/** Loads the researched choices (one fetch; crests drawn before it arrives use the fallback and are redrawn on the next refresh). */
export async function loadCrests(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/crests.json`);
    if (res.ok) table = (await res.json()) as Record<string, CrestChoice>;
  } catch { /* the fallback does as well */ }
}
export const crestsLoaded = (): boolean => Object.keys(table).length > 0;

const SHAPES = [
  'M4.2 2.4h15.6v9.8c0 4.7-3.5 7.9-7.8 9.9-4.3-2-7.8-5.2-7.8-9.9Z',
  'M4.2 4.6 6.2 2.4l2.2 1.9 3.6-1.9 3.6 1.9 2.2-1.9 2 2.2v7.6c0 4.7-3.5 7.9-7.8 9.9-4.3-2-7.8-5.2-7.8-9.9Z',
  'M12 1.8 19.8 5v7.2c0 4.6-3.4 7.8-7.8 9.8-4.4-2-7.8-5.2-7.8-9.8V5Z',
  'M4.2 8.4a7.8 7.8 0 0 1 15.6 0v4c0 4.6-3.5 7.7-7.8 9.6-4.3-1.9-7.8-5-7.8-9.6Z',
];

/** The field colours: the main colour, a second shade for the pattern, and whether the device on it is dark or light. */
const COLOURS: Record<Field, { main: string; second: string; ink: string }> = {
  crimson: { main: '#8e1f26', second: '#c4474a', ink: '#f6efe0' },
  azure: { main: '#1f4f8f', second: '#4d83c8', ink: '#f6efe0' },
  emerald: { main: '#1f7a4a', second: '#46aa72', ink: '#f6efe0' },
  gold: { main: '#d6a82e', second: '#f1d27a', ink: '#1d160c' },
  purple: { main: '#5a2b82', second: '#8d5bbb', ink: '#f6efe0' },
  black: { main: '#15181c', second: '#434a52', ink: '#f2f2ee' },
  teal: { main: '#1e7f84', second: '#48b3b7', ink: '#f6efe0' },
  orange: { main: '#d9702a', second: '#f2a45e', ink: '#1d160c' },
  silver: { main: '#aeb6bd', second: '#e1e6ea', ink: '#1a1f24' },
  brown: { main: '#6b4226', second: '#a36d42', ink: '#f6efe0' },
  rose: { main: '#c25a85', second: '#e792b3', ink: '#1d160c' },
  forest: { main: '#1f4d2b', second: '#3f7d4d', ink: '#f6efe0' },
};

const hashOf = (text: string): number => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function patternSvg(pattern: Pattern, second: string): string {
  const f = (d: string) => `<path d="${d}" fill="${second}" opacity="0.62"/>`;
  switch (pattern) {
    case 'chevron': return f('M3 10.6 12 16.4l9-5.8v4L12 20.4 3 14.6Z');
    case 'bend': return f('M3 4.2 21 17.4v4.4L3 8.6Z');
    case 'fess': return f('M3 9h18v4.2H3Z');
    case 'pale': return f('M9.8 1h4.4v22H9.8Z');
    case 'chief': return f('M3 1h18v6.4H3Z');
    case 'stripes': return f('M5 1h2.6v22H5ZM10.7 1h2.6v22h-2.6ZM16.4 1H19v22h-2.6Z');
    case 'saltire': return `<path d="M4 3.4 20 20.6M20 3.4 4 20.6" stroke="${second}" stroke-width="2.8" opacity="0.62" fill="none"/>`;
    case 'roundels': return `<g fill="${second}" opacity="0.7"><circle cx="7.4" cy="6.4" r="1.7"/><circle cx="16.6" cy="6.4" r="1.7"/><circle cx="12" cy="20" r="1.7"/></g>`;
    case 'checks': {
      let d = '';
      for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) d += `M${4 + c * 4} ${2 + r * 3.8}h4v3.8h-4Z`;
      return f(d);
    }
    default: return '';
  }
}

/** The choice for a city: the researched one, or a steady pick from its name. */
function choiceFor(name: string, iso2: string): CrestChoice {
  const hit = table[`${name}|${iso2}`];
  if (hit && EMBLEMS[hit.e]) return hit;
  const h = hashOf(`${name}|${iso2}`);
  return { e: ALL_EMBLEMS[h % ALL_EMBLEMS.length], f: FIELDS[(h >>> 5) % FIELDS.length], p: PATTERNS[(h >>> 9) % PATTERNS.length] };
}

/** A city's crest as an SVG. The rim and the device take the marker's ink where the field is dark; otherwise a dark device. */
export function crestSvg(name: string, iso2 = ''): string {
  const c = choiceFor(name, iso2);
  const shape = SHAPES[(c.s ?? hashOf(name)) % SHAPES.length];
  const col = COLOURS[c.f] ?? COLOURS.black;
  const id = `cr${hashOf(`${name}${iso2}`).toString(36)}`;
  const dark = col.ink.startsWith('#1');
  const outline = dark ? 'rgba(246,239,224,0.9)' : 'rgba(10,12,14,0.9)';
  const parts = (EMBLEMS[c.e] ?? EMBLEMS.star ?? []).map((q) => (q.line
    ? `<path d="${q.d}" fill="none" stroke="${outline}" stroke-width="${q.line + 1.5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${q.d}" fill="none" stroke="${col.ink}" stroke-width="${q.line}" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${q.d}" fill="${col.ink}" fill-rule="evenodd" stroke="${outline}" stroke-width="0.9" stroke-linejoin="round" paint-order="stroke"/>`)).join('');
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>`
    + `<path d="${shape}" fill="${col.main}"/><g clip-path="url(#${id})">${patternSvg(c.p, col.second)}</g>`
    + `<path d="${shape}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>${parts}</svg>`;
}
