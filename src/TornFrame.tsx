import { useEffect, useRef, useState } from 'react';

/** The fringed, burnt edge of an old parchment map (Oblivion's): a frame with a ragged inner edge, drawn over the map. */
export default function TornFrame() {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const watch = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    watch.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => watch.disconnect();
  }, []);
  const { w, h } = size;
  // a ragged line round the inside of the page, the same every time
  let s = 7;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const inset = 16;
  const pts: string[] = [];
  const jag = (x: number, y: number, nx: number, ny: number) => `${(x + nx * rand() * 9).toFixed(1)},${(y + ny * rand() * 9).toFixed(1)}`;
  for (let x = inset; x < w - inset; x += 11) pts.push(jag(x, inset, 0, 1));
  for (let y = inset; y < h - inset; y += 11) pts.push(jag(w - inset, y, -1, 0));
  for (let x = w - inset; x > inset; x -= 11) pts.push(jag(x, h - inset, 0, -1));
  for (let y = h - inset; y > inset; y -= 11) pts.push(jag(inset, y, 1, 0));
  const hole = `M${pts.join('L')}Z`;
  return (
    <div ref={box} className="em-torn" aria-hidden="true">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <filter id="em-paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="3" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.55 0" />
          </filter>
        </defs>
        <path d={`M0 0H${w}V${h}H0Z${hole}`} fillRule="evenodd" fill="#d8c7a0" />
        <path d={`M0 0H${w}V${h}H0Z${hole}`} fillRule="evenodd" filter="url(#em-paper)" opacity="0.8" />
        <path d={hole} fill="none" stroke="#5a4128" strokeWidth="2.2" strokeOpacity="0.8" />
        <path d={hole} fill="none" stroke="#2f2316" strokeWidth="9" strokeOpacity="0.16" />
      </svg>
    </div>
  );
}
