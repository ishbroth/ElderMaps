/** A padlock of old forged iron and worn brass, drawn in the page: shut or open. Dark outlines and a pale rim keep it readable on any button. */
export default function Padlock({ open = false, size = 16 }: { open?: boolean; size?: number }) {
  const id = open ? 'padO' : 'padC';
  return (
    <svg className="em-padlock" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}B`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6d29a" /><stop offset=".45" stopColor="#b38f45" /><stop offset="1" stopColor="#6a5224" /></linearGradient>
        <linearGradient id={`${id}S`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d7d9d6" /><stop offset=".5" stopColor="#8d9393" /><stop offset="1" stopColor="#4c5254" /></linearGradient>
      </defs>
      {/* the shackle: an iron bow, outlined dark so it shows on both light and dark buttons */}
      <g transform={open ? 'translate(0 -1.7)' : undefined}>
        <path d="M7.2 11V7.4a4.8 4.8 0 0 1 9.6 0V11" fill="none" stroke="#14100a" strokeWidth="4" strokeLinecap="round" />
        <path d="M7.2 11V7.4a4.8 4.8 0 0 1 9.6 0V11" fill="none" stroke={`url(#${id}S)`} strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {/* the body: worn brass in an iron frame, riveted, with a keyhole */}
      <rect x="3.6" y="10.6" width="16.8" height="11.6" rx="2" fill={`url(#${id}B)`} stroke="#14100a" strokeWidth="1.5" />
      <rect x="5" y="12" width="14" height="8.8" rx="1.2" fill="none" stroke="#f3e6bb" strokeOpacity=".55" strokeWidth=".7" />
      <circle cx="6.4" cy="13.4" r=".85" fill="#3b2e14" /><circle cx="17.6" cy="13.4" r=".85" fill="#3b2e14" />
      <circle cx="6.4" cy="19.4" r=".85" fill="#3b2e14" /><circle cx="17.6" cy="19.4" r=".85" fill="#3b2e14" />
      <circle cx="12" cy="15.2" r="1.7" fill="#17110a" /><path d="M11.1 16 12 19.2 12.9 16Z" fill="#17110a" />
    </svg>
  );
}
