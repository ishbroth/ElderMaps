// ElderMaps' icon: an old map, half unfurled and lying at an angle (the left half still rolled up), on the cold dark of Skyrim's loading screens, with the half-outlined
// navigation arrow pasted on top, upright, in the middle. Drawn as vectors, so it is crisp at every size.
//   node _tools/make-icon.mjs
import sharp from 'sharp';
import fs from 'node:fs';

fs.mkdirSync('resources', { recursive: true });
const n = (v) => Math.round(v * 10) / 10;

function iconSvg(withBackground) {
  // the arrow, from the lower-left of the navigation set: tip, left wing, notch, right wing; turned to point straight up, centred on (512, 520)
  const src = { T: [422, 590], L: [158, 687], N: [280, 730], B: [322, 855] };
  const rot = (-45 * Math.PI) / 180, k = 1.25;
  const turned = {};
  for (const [name, [x, y]] of Object.entries(src)) turned[name] = [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
  const xs = Object.values(turned).map((q) => q[0]), ys = Object.values(turned).map((q) => q[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
  const at = (q) => n(512 + (q[0] - mx) * k) + ' ' + n(520 + (q[1] - my) * k);
  const outline = 'M' + at(turned.T) + 'L' + at(turned.L) + 'L' + at(turned.N) + 'L' + at(turned.B) + 'Z';
  const solid = 'M' + at(turned.T) + 'L' + at(turned.N) + 'L' + at(turned.B) + 'Z';

  // the map: an open sheet with a ragged, burnt edge, and on its left the roll it came from
  const sheet = 'M338 262 C420 246 520 270 610 252 C700 236 790 262 872 250 L880 292 C868 360 884 430 874 500 C866 580 886 650 872 740 L866 790 C780 804 690 780 600 796 C510 812 420 790 338 800 C346 720 330 640 340 560 C348 480 332 400 340 330 Z';
  const roll = `
    <path d="M232 262 C232 236 348 236 348 262 L348 800 C348 826 232 826 232 800 Z" fill="url(#rollShade)"/>
    <ellipse cx="290" cy="262" rx="58" ry="24" fill="#d9c493"/>
    <ellipse cx="290" cy="262" rx="58" ry="24" fill="none" stroke="#6a4a24" stroke-width="5"/>
    <path d="M290 262m-44 0a44 17 0 1 0 88 0a44 17 0 1 0 -88 0M290 262m-30 0a30 12 0 1 0 60 0a30 12 0 1 0 -60 0M290 262m-16 0a16 7 0 1 0 32 0a16 7 0 1 0 -32 0" fill="none" stroke="#8a6a3a" stroke-width="4"/>
    <path d="M232 300H348M232 360H348M232 440H348M232 520H348M232 600H348M232 680H348M232 760H348" stroke="#7a5a2c" stroke-width="3" opacity="0.28"/>
    <path d="M232 262 C232 236 348 236 348 262 L348 800 C348 826 232 826 232 800 Z" fill="none" stroke="#5a4128" stroke-width="6"/>`;
  const features = `
    <g fill="none" stroke="#6a4a24" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
      <path d="M392 360 C430 330 470 350 500 330 C540 304 590 340 620 330 C660 318 700 340 740 322 C780 308 820 330 842 320" stroke-width="5"/>
      <path d="M392 700 C450 668 500 700 560 676 C620 650 680 690 740 668 C790 650 820 676 846 664" stroke-width="5"/>
      <path d="M420 470 l26 -50 l22 36 l20 -26 l30 40" stroke-width="5"/>
      <path d="M690 560 l22 -44 l20 32 l18 -22 l26 34" stroke-width="5"/>
      <path d="M744 420 c14 -24 40 -24 54 0 M730 438 c24 -34 70 -34 94 0" stroke-width="4"/>
      <path d="M404 590 C450 600 470 580 510 596" stroke-width="3" stroke-dasharray="3 10"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.45" r="0.8"><stop offset="0" stop-color="#2a3a46"/><stop offset="0.6" stop-color="#141c23"/><stop offset="1" stop-color="#0b0d10"/></radialGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecdcb0"/><stop offset="0.55" stop-color="#d9c08a"/><stop offset="1" stop-color="#bf9f66"/></linearGradient>
    <linearGradient id="rollShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e6c3a"/><stop offset="0.28" stop-color="#e4d09e"/><stop offset="0.55" stop-color="#cdb27a"/><stop offset="1" stop-color="#7d5c30"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="pop" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dy="8"/><feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${withBackground ? '<rect width="1024" height="1024" fill="url(#bg)"/>' : ''}
  <g transform="rotate(-11 540 530)">
    <path d="${sheet}" transform="translate(14 26)" fill="#000" opacity="0.55" filter="url(#soft)"/>
    <path d="${sheet}" fill="url(#paper)" stroke="#6a4a24" stroke-width="6" stroke-linejoin="round"/>
    <path d="M338 262 C420 246 520 270 610 252 C700 236 790 262 872 250 L880 292 L338 330Z" fill="#fff" opacity="0.08"/>
    <path d="M338 800 C420 790 510 812 600 796 C690 780 780 804 866 790 L866 760 C780 770 690 750 600 764 C510 778 420 758 338 770Z" fill="#5a4128" opacity="0.2"/>
    ${features}
    <path d="M348 270 C372 300 372 780 348 796" fill="none" stroke="#5a4128" stroke-width="12" opacity="0.28"/>
    ${roll}
    <path d="M866 790 L826 770 C842 790 856 790 866 790Z" fill="#a98a52"/>
  </g>
  <g filter="url(#pop)">
    <path d="${outline}" fill="#f4ecd6" fill-opacity="0.9" stroke="#2a1d10" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${solid}" fill="#2a1d10" stroke="#2a1d10" stroke-width="22" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png();
await png(iconSvg(true), 1024).toFile('resources/icon-only.png');
const small = await png(iconSvg(false), 676).toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: small, gravity: 'center' }]).png().toFile('resources/icon-foreground.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#141c23' } }).png().toFile('resources/icon-background.png');
// the website's icons
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/favicon.svg', iconSvg(true).replace(/<filter id="soft"[\s\S]*?<\/filter>/, '').replace(' filter="url(#soft)"', ''));
await png(iconSvg(true), 180).toFile('public/apple-touch-icon.png');
await png(iconSvg(true), 192).toFile('public/icon-192.png');
await png(iconSvg(true), 512).toFile('public/icon-512.png');
await png(iconSvg(true), 32).toFile('public/favicon-32.png');
console.log('icons written');
