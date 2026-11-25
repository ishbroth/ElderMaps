/** The septim: a small gold coin, drawn in the page (no picture to load), for beside an amount. */
export default function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg className="em-coin" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="septims">
      <defs>
        <radialGradient id="coinFace" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff0a8" /><stop offset=".55" stop-color="#e2b63c" /><stop offset="1" stop-color="#8a5c12" /></radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#coinFace)" stroke="#5a3a08" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="#7a5010" strokeWidth="1" strokeOpacity=".8" />
      <path d="M12 6.2 15.4 16.6 12 14.6 8.6 16.6Z" fill="#7a5010" fillOpacity=".85" />
    </svg>
  );
}
