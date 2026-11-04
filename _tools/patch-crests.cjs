const fs = require('fs');
const p = 'src/lib/glyphs.ts';
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b, l) => { if (!s.includes(a)) throw new Error('missing ' + l); s = s.replace(a, () => b); };

// farm, mill and mine: the marks of the villages round a bigger place
rep("  carriage: [", `  farm: [fill('M2.8 21.5v-9.6L12 4.8l9.2 7.1v9.6Zm6.6 0V15.8h5.2v5.7Z'), line('M8.2 11.4h7.6M12 4.8V3', 1.5), fill('M19.6 21.5v-7.6h2.6v7.6Z')],
  mill: [fill('M9.2 21.5l1.3-9.6h3l1.3 9.6Z'), fill('M12 9.4a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z'), line('M12 11.7 5.6 5.2M12 11.7l6.4-6.5M12 11.7 5.6 18.2M12 11.7l6.4 6.5', 2.2)],
  mine: [fill('M2.8 21.5v-3.2a9.2 9.2 0 0 1 18.4 0v3.2Zm6.2 0v-3.3a3 3 0 0 1 6 0v3.3Z'), line('M7.6 9.6l-2.4-2.4M16.4 9.6l2.4-2.4M12 8V4.6', 1.8)],
  carriage: [`, 'villages');

// the crests of the big cities: a shield, one of two shapes, with a device cut from the heraldry of the old kingdoms (originals, drawn here)
s += `
const SHIELDS = [
  'M4.2 2.4h15.6v9.8c0 4.7-3.5 7.9-7.8 9.9-4.3-2-7.8-5.2-7.8-9.9Z',
  'M4.2 4.6 6.2 2.4l2.2 1.9 3.6-1.9 3.6 1.9 2.2-1.9 2 2.2v7.6c0 4.7-3.5 7.9-7.8 9.9-4.3-2-7.8-5.2-7.8-9.9Z',
];
/** The devices: each is drawn in the shield's ink on its dark field. */
const DEVICES: Part[][] = [
  [fill('M7.2 15.4V8.4l2.4 2.8L12 7l2.4 4.2 2.4-2.8v7Z'), fill('M12 16.6l1.3 1.3-1.3 1.5-1.3-1.5Z')], // a crown
  [line('M7 6.4l10 10M17 6.4 7 16.4', 1.9), line('M6.4 13.4l3.6 3.6M17.6 13.4 14 17', 1.7)], // crossed swords
  [fill('M12 14.8l1.5-2L12 11.2l-1.5 1.6Z'), line('M12 11.2V6.4M12 9.6 9.4 7.4 8 5.4M9.4 7.4l-2.2.2M12 9.6l2.6-2.2 1.4-2M14.6 7.4l2.2.2M12 8l-1.2-2M12 8l1.2-2', 1.6)], // antlers
  [fill('M12 15l1.3 1.4L12 18l-1.3-1.6Z'), line('M11 13.2C8 14.2 6.2 11.8 7.2 9.6c.9-1.8 3.4-1.5 3.6.3.1 1.1-1.2 1.6-1.8.9M13 13.2c3 1 4.8-1.4 3.8-3.6-.9-1.8-3.4-1.5-3.6.3-.1 1.1 1.2 1.6 1.8.9', 1.7)], // a ram
  [fill('M12 5.6l1.9 4.5 4.8 1.4-4.8 1.4L12 17.4l-1.9-4.5-4.8-1.4 4.8-1.4Z')], // a star
  [fill('M8.2 17.4V8.4h1.8v1.5h1.1V8.4h1.8v1.5H14V8.4h1.8v9Zm3.8 0v-2.6a1.1 1.1 0 0 0-2.2 0v2.6Z')], // a tower
  [fill('M6.4 14.2h11.2l-2 3.4H8.4Z'), fill('M12.6 6.2v6.9h4.4Z'), line('M12 5.6v8', 1.4)], // a longship
  [line('M8.4 17.6v-5.2a3.6 3.6 0 0 1 7.2 0v5.2', 2.4), fill('M7.2 9.6h2v1.6h-2ZM14.8 9.6h2v1.6h-2Z')], // a horseshoe
  [fill('M12 8.6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'), line('M12 4.6v2M12 16.6v2M6 11.6h2M16 11.6h2M7.8 7.4l1.4 1.4M16.2 7.4l-1.4 1.4M7.8 15.8l1.4-1.4M16.2 15.8l-1.4-1.4', 1.5)], // a sun
  [fill('M12 5.6c2.7 0 4.2 2.1 3.6 4.2 1.5.6 1.7 2.6.4 3.6-.8.6-1.9.6-2.7.3l-.5 3.7h-1.6l-.5-3.7c-.8.3-1.9.3-2.7-.3-1.3-1-1.1-3 .4-3.6-.6-2.1.9-4.2 3.6-4.2Z')], // a tree
  [line('M12 11.6c0-2.2 2.2-3.2 3.4-2.1s.8 3.2-1.1 3.2M12 11.6c1.8 1 1.7 3.4 0 4s-3.2-.9-2.8-2.6M12 11.6c-2 .6-3.8-.5-3.7-2.2s2.2-2.7 3.5-1.7', 1.7)], // a triskele
  [fill('M12 14.6 10.8 9.4 6.6 6.4l1.2 5.2Zm0 0 1.2-5.2 4.2-3-1.2 5.2Z'), fill('M12 15.6l1.2 1.6-1.2 1.6-1.2-1.6Z')], // wings
  [fill('M12 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4ZM8.4 10.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4ZM15.6 10.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z'), line('M12 13v5', 1.6)], // a trefoil
  [fill('M15 5.8a5.8 5.8 0 1 0 0 11.8 4.6 4.6 0 0 1 0-11.8Z')], // a crescent
  [fill('M6.6 8.4h10.8L16 13.4H8Z'), fill('M10.6 13.4h2.8v3.2h-2.8Z'), fill('M8.4 16.6h7.2v1.4H8.4Z')], // an anvil
];

const hashOf = (text: string): number => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** A city's crest: always the same shield and device for the same name. The field is --crest-bg; the rim and device take the marker's ink. */
export function crestSvg(seed: string): string {
  const h = hashOf(seed);
  const shield = SHIELDS[h % SHIELDS.length];
  const device = DEVICES[(h >>> 3) % DEVICES.length];
  const body = device.map((q) => (q.line
    ? \`<path d="\${q.d}" fill="none" stroke="currentColor" stroke-width="\${q.line}" stroke-linecap="round" stroke-linejoin="round"/>\`
    : \`<path d="\${q.d}" fill="currentColor" fill-rule="evenodd"/>\`)).join('');
  return \`<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="\${shield}" fill="var(--crest-bg, #11161b)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>\${body}</svg>\`;
}
`;
fs.writeFileSync(p, s);
console.log('ok');
