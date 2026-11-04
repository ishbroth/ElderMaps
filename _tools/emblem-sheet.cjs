// Renders a module of emblems to a PNG so the drawings can be looked at:   node _tools/emblem-sheet.cjs <groupfile (animals|plants|things)> <out.png>
// Each emblem is drawn light on a dark shield, at the size it has on the map (large here, and small beside it).
const fs = require('fs');
const esbuild = require('node:child_process');
const sharp = require('sharp');
const [group, out] = process.argv.slice(2);
const tmp = `_data/_emb_${group}.mjs`;
esbuild.execSync(`npx --yes esbuild src/lib/emblems/${group}.ts --bundle --format=esm --outfile=${tmp} --log-level=error`);
import(require('url').pathToFileURL(require('path').resolve(tmp)).href).then(async (m) => {
  const set = m.default ?? Object.values(m).find((v) => v && typeof v === 'object');
  const ids = Object.keys(set);
  const cols = 8, cell = 130, rows = Math.ceil(ids.length / cols);
  const shield = 'M4.2 2.4h15.6v9.8c0 4.7-3.5 7.9-7.8 9.9-4.3-2-7.8-5.2-7.8-9.9Z';
  let body = '';
  ids.forEach((id, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    const parts = set[id].map((q) => (q.line
      ? `<path d="${q.d}" fill="none" stroke="#f2f2ee" stroke-width="${q.line}" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="${q.d}" fill="#f2f2ee" fill-rule="evenodd"/>`)).join('');
    body += `<g transform="translate(${x + 8},${y + 4}) scale(3.6)"><path d="${shield}" fill="#11161b" stroke="#f2f2ee" stroke-width="1.2"/>${parts}</g>`;
    body += `<g transform="translate(${x + 98},${y + 8}) scale(1.2)"><path d="${shield}" fill="#11161b" stroke="#f2f2ee" stroke-width="1.4"/>${parts}</g>`;
    body += `<text x="${x + 6}" y="${y + 124}" font-size="11" fill="#9aa3a8" font-family="sans-serif">${id}</text>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#2a3036"/>${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log('wrote', out, ids.length, 'emblems');
});
