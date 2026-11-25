/** Little pictures for the forge and the alchemist: a sword for one-handed, a greatsword for two-handed, a bow, four kinds of magic, a flask for a potion, a ringing wave for a shout, two crossed blades for both hands. */
const PATHS: Record<string, { d: string; line?: boolean }[]> = {
  onehand: [{ d: 'M12 1.5l1.7 11.2h-3.4Z' }, { d: 'M7.8 12.7h8.4v1.8H7.8Z' }, { d: 'M11 14.5h2V20h-2Z' }, { d: 'M10 20h4v1.6h-4Z' }],
  twohand: [{ d: 'M12 0.8l2 14.2h-4Z' }, { d: 'M6.8 15h10.4v1.7H6.8Z' }, { d: 'M11 16.7h2V22h-2Z' }],
  bow: [{ d: 'M7 3c7 3.5 7 14.5 0 18', line: true }, { d: 'M7 3v18', line: true }, { d: 'M3 12h16M16.5 9.8 19 12l-2.5 2.2', line: true }],
  shock: [{ d: 'M13.5 1.8 5.8 13.2h5.2l-1.2 9 8.4-12.4h-5.4Z' }],
  frost: [{ d: 'M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7', line: true }, { d: 'M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5', line: true }],
  fire: [{ d: 'M12 1.8c3.2 3.6 5.2 6.2 3.6 9.8 2.1-.5 3.1 1.6 3.1 3.6a6.7 6.7 0 0 1-13.4 0c0-3.1 2.1-4.1 3.6-7.3.5 2 1.6 3 2.6 3C11 8.6 10.4 5.2 12 1.8Z' }],
  drain: [{ d: 'M12 3a9 9 0 1 1-9 9', line: true }, { d: 'M12 7a5 5 0 1 1-5 5', line: true }, { d: 'M12 11a1 1 0 1 1-1 1', line: true }],
  potion: [{ d: 'M9.4 1.8h5.2v2.2l-1 1v4.4l4.2 7.4a3.1 3.1 0 0 1-2.7 4.6H8.9a3.1 3.1 0 0 1-2.7-4.6l4.2-7.4V5l-1-1Z' }],
  shout: [{ d: 'M2.5 12h2.6M7.5 8v8M11.5 4.5v15M15.5 8v8M18.9 12h2.6', line: true }],
  dual: [{ d: 'M5 3l8 12-1.6 1L4 4.6Z' }, { d: 'M19 3 11 15l1.6 1L20 4.6Z' }, { d: 'M3 17.5l2.2-2 4 3.4-2.2 2Z' }, { d: 'M21 17.5l-2.2-2-4 3.4 2.2 2Z' }],
};

export default function ItemIcon({ kind, size = 26 }: { kind: string; size?: number }) {
  const parts = PATHS[kind] ?? PATHS.onehand;
  return (
    <svg className="em-item-ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {parts.map((p, i) => (p.line ? <path key={i} d={p.d} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /> : <path key={i} d={p.d} fill="currentColor" />))}
    </svg>
  );
}
