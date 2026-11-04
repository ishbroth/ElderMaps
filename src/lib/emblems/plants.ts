import type { EmblemPart } from './types';

const f = (n: number) => +n.toFixed(2);
const circ = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** n points round a centre, first one straight up. */
const ring = (cx: number, cy: number, dist: number, n: number, start = -90) =>
  Array.from({ length: n }, (_, i) => [cx + dist * Math.cos(rad(start + (360 / n) * i)), cy + dist * Math.sin(rad(start + (360 / n) * i))] as const);

const roseParts: EmblemPart[] = [
  ...ring(12, 12, 3.5, 5).map(([x, y]) => ({ d: circ(f(x), f(y), 2.4), line: 1.3 })),
  { d: circ(12, 12, 1.4) },
];

const blossomParts: EmblemPart[] = [
  ...ring(12, 12, 3.8, 5).map(([x, y]) => ({ d: circ(f(x), f(y), 2.1) })),
  { d: circ(12, 12, 0.8) },
];

const sunflowerParts: EmblemPart[] = [
  ...ring(12, 11.6, 5.1, 12).map(([x, y], i) => {
    const a = rad(-90 + 30 * i);
    return { d: `M${f(x - Math.cos(a) * 0.9)} ${f(y - Math.sin(a) * 0.9)}L${f(x + Math.cos(a) * 0.9)} ${f(y + Math.sin(a) * 0.9)}`, line: 2 };
  }),
  { d: circ(12, 11.6, 3.7) + circ(12, 11.6, 1.5) },
];

const laurelParts: EmblemPart[] = (() => {
  const out: EmblemPart[] = [{ d: 'M12 18.3A6 6 0 0 1 7.6 7M12 18.3A6 6 0 0 0 16.4 7', line: 1 }];
  for (const s of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const phi = rad(25 + i * 35);
      const R = 5.8;
      const px = 12 - s * R * Math.sin(phi), py = 12.2 + R * Math.cos(phi);
      const tx = -s * Math.cos(phi), ty = -Math.sin(phi);
      const nx = -s * Math.sin(phi), ny = Math.cos(phi); // outward
      for (const side of [1, -1]) {
        const ex = px + 3 * tx + side * 1.7 * nx, ey = py + 3 * ty + side * 1.7 * ny;
        out.push({ d: `M${f(px)} ${f(py)}L${f(ex)} ${f(ey)}`, line: 1.9 });
      }
    }
  }
  return out;
})();

const fernParts: EmblemPart[] = (() => {
  const P = (t: number) => [(1 - t) * (1 - t) * 9.5 + 2 * t * (1 - t) * 13.5 + t * t * 12, (1 - t) * (1 - t) * 18.5 + 2 * t * (1 - t) * 11 + t * t * 5.2];
  const out: EmblemPart[] = [{ d: 'M9.5 18.5Q13.5 11 12 5.2', line: 1.3 }];
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.15;
    const [x, y] = P(t), [x2, y2] = P(t + 0.02);
    const a = Math.atan2(y2 - y, x2 - x);
    const len = 4.2 - i * 0.55;
    for (const s of [1, -1]) {
      const b = a + s * rad(60);
      out.push({ d: `M${f(x)} ${f(y)}L${f(x + len * Math.cos(b))} ${f(y + len * Math.sin(b))}`, line: 1.7 });
    }
  }
  return out;
})();

const PLANTS: Record<string, EmblemPart[]> = {
  palm: [
    { d: 'M12.6 18.5Q12.2 13 11.4 9', line: 1.9 },
    { d: 'M11.4 9Q8 5.5 6.5 9.5', line: 1.6 },
    { d: 'M11.4 9Q9.5 4.5 7.5 5.5', line: 1.6 },
    { d: 'M11.4 9Q12 4.5 14.5 5', line: 1.6 },
    { d: 'M11.4 9Q15 5.5 17.5 9', line: 1.6 },
    { d: 'M11.4 9Q14.5 8 16 11', line: 1.6 },
    { d: circ(11, 10.2, 1) },
    { d: circ(12.7, 10.2, 1) },
  ],
  pine: [{ d: 'M12 5L15.6 9.8H14L17 14.2H13.2V18.5H10.8V14.2H7L10 9.8H8.4Z' }],
  oak: [
    { d: 'M9.3 10.5H14.7', line: 6 },
    { d: 'M12 8.3V9', line: 6.5 },
    { d: 'M10.8 18.5L11.2 12.5H12.8L13.2 18.5Z' },
    { d: 'M12 14.5L14.8 12', line: 1.1 },
  ],
  lotus: [
    { d: 'M12 5.3Q15.2 9.5 12 14.8Q8.8 9.5 12 5.3Z' },
    { d: 'M7.4 8.3Q11 9.2 11.3 15Q7.2 13.5 7.4 8.3Z' },
    { d: 'M16.6 8.3Q13 9.2 12.7 15Q16.8 13.5 16.6 8.3Z' },
    { d: 'M6.5 12.2Q9 16 11.3 16.2Q8 18 6.5 12.2Z' },
    { d: 'M17.5 12.2Q15 16 12.7 16.2Q16 18 17.5 12.2Z' },
    { d: 'M8.5 18H15.5', line: 1.3 },
  ],
  rose: roseParts,
  maple: [{ d: 'M11.3 18.5V15.6L7 16.2L8.3 12.6L6.5 11L9.6 10.2L9 7.6L11 8.8L12 5.3L13 8.8L15 7.6L14.4 10.2L17.5 11L15.7 12.6L17 16.2L12.7 15.6V18.5Z' }],
  wheat: [
    { d: 'M12 18.5V7', line: 1.2 },
    { d: 'M12 6.8V6', line: 2.6 },
    { d: 'M11.2 14.2L8.4 12', line: 2.4 },
    { d: 'M12.8 14.2L15.6 12', line: 2.4 },
    { d: 'M11.2 11L8.6 8.8', line: 2.4 },
    { d: 'M12.8 11L15.4 8.8', line: 2.4 },
    { d: 'M11.2 8.2L9.6 6.4', line: 2.2 },
    { d: 'M12.8 8.2L14.4 6.4', line: 2.2 },
  ],
  grapes: [
    ...[[8.8, 10], [12, 10], [15.2, 10], [10.4, 13.1], [13.6, 13.1], [12, 16.2]].map(([x, y]) => ({ d: circ(x, y, 1.9) })),
    { d: 'M12 8.5Q12 6.8 12.8 5.8', line: 1.3 },
    { d: 'M12.8 6.6Q15 4.6 17.2 6Q15.2 8 12.8 6.6Z' },
  ],
  blossom: blossomParts,
  olive: [
    { d: 'M7.5 17.8Q12.5 14.5 16.5 6.2', line: 1.2 },
    { d: 'M9.2 15.9L6.8 13.4', line: 2.3 },
    { d: 'M11.6 14.2L9.4 11', line: 2.3 },
    { d: 'M13.5 11.6L11.5 8', line: 2.3 },
    { d: 'M15.4 8.6L13.8 6', line: 2.3 },
    { d: 'M11.6 14.8L13 15.6', line: 3.4 },
    { d: 'M13.8 12.5L15.4 13.4', line: 3.4 },
    { d: 'M15.5 9.8L17 10.4', line: 3.4 },
  ],
  cactus: [
    { d: 'M12 17.5V7', line: 3.8 },
    { d: 'M12 14.3H8.5V10.5', line: 2.6 },
    { d: 'M12 12.8H15.5V8.8', line: 2.6 },
    { d: 'M7.5 18.5H16.5', line: 1.2 },
  ],
  sunflower: sunflowerParts,
  tulip: [
    { d: 'M7.5 6L9.8 8.4L12 5.6L14.2 8.4L16.5 6Q17.8 12.8 12 15Q6.2 12.8 7.5 6Z' },
    { d: 'M12 14.5V18.5', line: 1.6 },
    { d: 'M12 18.3Q8.5 17.5 8 14.5Q11.2 15 12 18.3Z' },
    { d: 'M12 18.3Q15.5 17.5 16 14.5Q12.8 15 12 18.3Z' },
  ],
  lily: [
    { d: 'M12 5Q15 9 13.3 13.2H10.7Q9 9 12 5Z' },
    { d: 'M6.8 7.2Q9.8 7.5 11 11.5V14Q6 13 6.8 7.2Z' },
    { d: 'M17.2 7.2Q14.2 7.5 13 11.5V14Q18 13 17.2 7.2Z' },
    { d: 'M9.6 14.4H14.4V15.7H9.6Z' },
    { d: 'M12 15.5V18.5', line: 1.6 },
  ],
  laurel: laurelParts,
  orange: [
    { d: circ(12, 12.6, 5.6) + circ(12, 9.6, 0.9) },
    { d: 'M12 7Q12 6 12.8 5.4', line: 1.2 },
    { d: 'M12.6 6.4Q15 4.6 17 6Q15 8 12.6 6.4Z' },
  ],
  apple: [
    { d: 'M12 8.6C10 6.6 6.5 7.6 6.8 12C7 16 9.5 18.5 11 18.2Q12 17.8 13 18.2C14.5 18.5 17 16 17.2 12C17.5 7.6 14 6.6 12 8.6Z' },
    { d: 'M12 8.6Q12 6.6 13 5.3', line: 1.4 },
    { d: 'M12.8 7Q15 5 17 6.2Q15 8.2 12.8 7Z' },
  ],
  pineapple: [
    { d: 'M7.8 13.4a4.2 4.6 0 1 0 8.4 0a4.2 4.6 0 1 0 -8.4 0Z' + 'M12 10.2L13 11.4L12 12.6L11 11.4Z' + 'M9.8 12.8L10.8 14L9.8 15.2L8.8 14Z' + 'M14.2 12.8L15.2 14L14.2 15.2L13.2 14Z' + 'M12 15L13 16.2L12 17.4L11 16.2Z' },
    { d: 'M8.8 9.2L8.8 6.2L10.5 7.8L12 5L13.5 7.8L15.2 6.2L15.2 9.2Z' },
  ],
  bamboo: [
    { d: 'M8.3 6.8V10.6', line: 2.6 }, { d: 'M8.3 13V17.4', line: 2.6 },
    { d: 'M12 5.8V10.2', line: 2.6 }, { d: 'M12 12.6V17.4', line: 2.6 },
    { d: 'M15.7 6.8V11', line: 2.6 }, { d: 'M15.7 13.4V17.4', line: 2.6 },
    { d: 'M16 11.6L17.6 10.2', line: 1.3 },
    { d: 'M8 11.8L6.6 10.4', line: 1.3 },
  ],
  fern: fernParts,
};

export default PLANTS;
