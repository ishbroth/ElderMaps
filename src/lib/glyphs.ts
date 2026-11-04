// The pictograms of the map: flat, single-colour, drawn on a 24-point grid. Each one stands for a kind of place, the way the small marks on the game's map do
// (a tent for a camp, a gear for a Dwarven ruin, a tower for a fort, a house or two for a town). All of them are original drawings.

type Part = { d: string; line?: number };
const fill = (d: string): Part => ({ d });
const line = (d: string, w = 1.8): Part => ({ d, line: w });

const GLYPHS: Record<string, Part[]> = {
  // the capital: a keep inside a ring
  crest: [
    line('M12 1.8a10.2 10.2 0 1 0 0 20.4 10.2 10.2 0 0 0 0-20.4Z', 1.5),
    fill('M6.4 17.6V8.6h2.3v1.7h1.6V8.6h3.4v1.7h1.6V8.6h2.3v9Zm5.6 0v-3.3a1.3 1.3 0 0 0-2.6 0v3.3Z'),
    line('M12 8.4V5.2M12 5.2l2.4.9-2.4.9', 1.3),
  ],
  keep: [fill('M3.5 21.5V6h3.7v2.7h2V6h2.8v2.7h2V6h3.8v15.5Zm8.2 0v-4.4a1.9 1.9 0 0 0-3.8 0v4.4Z'), line('M12 6V2.6M12 2.6l3 1.2-3 1.2', 1.4)],
  town: [fill('M2.3 20.5v-7l4-3.4 4 3.4v7Zm9-0v-9.5l4.2-3.6 4.2 3.6v9.5Z'), line('M5.2 16.8v3.7M14 15v5.5', 1.2)],
  village: [fill('M4 20.5v-8l8-6.6 8 6.6v8Zm6.2 0v-3.6h3.6v3.6Z'), line('M16.6 7.4c-1.1-1.3.9-2.2 0-3.6', 1.4)],
  landmark: [fill('M12 2.4l2.3 5.8v9.4H9.7V8.2Z'), fill('M7.2 18.4h9.6v3H7.2Z')],
  waterfall: [fill('M2.5 3.5h19v4h-19Z'), line('M7 9v8.5M12 9v10.5M17 9v7', 2.3), line('M3.5 21.2c2.2-1.6 4.2 1.4 6.8 0s4.6 1.4 6.8 0 2.6-.4 3.4 0', 1.6)],
  cave: [fill('M2.3 20.8C3.4 12 7 7 12 7s8.6 5 9.7 13.8Zm6.4 0v-4.3a3.3 3.3 0 0 1 6.6 0v4.3Z')],
  ruin: [fill('M3.6 21.5V11.8h3.8v9.7Zm13-0v-8.6l3.8-2.4v11Z'), fill('M3.6 10C5.2 6.4 8.8 4.4 12.4 4.4l-1.2 3.2L7.6 9.4Z'), line('M10.5 21.5v-5', 1.4)],
  fort: [fill('M5.8 21.5V8h2.2V5.4h2.8V8h2.4V5.4H16V8h2.2v13.5Zm4.9 0v-3.7a1.4 1.4 0 0 1 2.8 0v3.7Z'), line('M12 5.4V2.4M12 2.4l2.6 1-2.6 1', 1.4)],
  camp: [fill('M2.3 21 12 4.6 21.7 21Zm7.9 0L12 15.4 13.8 21Z')],
  lighthouse: [fill('M9.4 21.5l1.1-13h3l1.1 13Zm.4-13.4V5.6L12 2.6l2.2 3v2.5Z'), fill('M6.8 21.5h10.4v1.7H6.8Z'), line('M3.6 5.8h3.6M16.8 5.8h3.6M5 2.6l2.4 1.8M19 2.6l-2.4 1.8', 1.3)],
  volcano: [fill('M2.2 21.5l6.6-11.8 2.1 1.9 1.7-2.5 1.9 2.2 6.3 10.2Z'), line('M12.5 6.6c-1.2-1.4 1.2-2.6 0-4.4', 1.5)],
  spring: [fill('M3.4 14.6h17.2a8.6 5.4 0 0 1-17.2 0Z'), line('M8 11.6c-1.6-1.9 1.4-3.2 0-5.4M12 11.6c-1.6-1.9 1.4-3.2 0-5.4M16 11.6c-1.6-1.9 1.4-3.2 0-5.4', 1.6)],
  pass: [fill('M1.6 21l5.6-12.2L11.3 21Zm11 0 4.7-12.4L22.4 21Z')],
  glacier: [line('M12 2.2v19.6M3.5 7.1l17 9.8M3.5 16.9l17-9.8', 2), line('M9.4 3.8 12 6.2l2.6-2.4M9.4 20.2 12 17.8l2.6 2.4', 1.4)],
  grove: [fill('M12 2.6c3.6 0 5.9 2.8 5.1 6 2.1.9 2.7 3.7 1 5.3-1.1 1-2.5 1.2-3.7.8l-1.3 6.3h-2.2l-1.3-6.3c-1.2.4-2.6.2-3.7-.8-1.7-1.6-1.1-4.4 1-5.3-.8-3.2 1.5-6 5.1-6Z')],
  shrine: [fill('M5.8 21.5v-3h12.4v3Zm2.4-3.4V12h7.6v6.1Z'), fill('M12 4.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z'), line('M12 1.2v1.9M5.6 3.7l1.4 1.4M18.4 3.7 17 5.1M3 9.4h1.9M19.1 9.4H21', 1.4)],
  peak: [fill('M1.6 21.5 9 7.4l3 5 3.1-4.4 7.3 13.5Z')],
  stones: [fill('M3.8 21.5l.9-11.4 2.8-.9 1 12.3Zm6.5 0 .8-15 2.5-.8 1 15.8Zm6.2 0 1-9.2 2.5.7.7 8.5Z')],
  arena: [fill('M12 4.6c5.6 0 9.7 2.8 9.7 6.9S17.6 18.4 12 18.4 2.3 15.6 2.3 11.5 6.4 4.6 12 4.6Zm0 3.3c-3.5 0-6.2 1.6-6.2 3.6S8.5 15.1 12 15.1s6.2-1.6 6.2-3.6S15.5 7.9 12 7.9Z')],
  tower: [fill('M7.6 21.5V9.2L12 2.6l4.4 6.6v12.3Zm3.2-9.6v3.2h2.4v-3.2Z')],
  carriage: [fill('M3 8.2h12.6l3 4.6H21v4.2H3Z'), fill('M7.6 16.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm9 0a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z')],
};

export function glyph(kind: string): string {
  const parts = GLYPHS[kind] ?? GLYPHS.landmark;
  const body = parts.map((p) => (p.line
    ? `<path d="${p.d}" fill="none" stroke="currentColor" stroke-width="${p.line}" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${p.d}" fill="currentColor" fill-rule="evenodd"/>`)).join('');
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
}

/** The glyph for a key place near a city, from the kind of building it is. */
export function glyphForCategory(category: string): string {
  switch (category) {
    case 'guard': return 'keep';
    case 'medical': case 'chapel': return 'shrine';
    case 'school': return 'tower';
    case 'park': return 'grove';
    case 'arena': return 'arena';
    default: return 'landmark';
  }
}
