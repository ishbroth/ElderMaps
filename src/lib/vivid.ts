// The VIVID look of the large map: relief drawn by us from elevation tiles, the way the game's own map draws it: realistic but a little cartoony, mountains made taller than
// they are, greener grass, whiter snow, sandier desert, bright blue seas, and (as a second layer) real clouds from yesterday's satellite picture.
//
//  - Land and sea: Terrarium elevation tiles (Mapzen, hosted free on AWS) are read in the browser; a hillshade with the heights exaggerated gives the mountains; colour comes from
//    height, from how far from the equator (the snow line), and from the province's own palette, blended smoothly across borders (so the Cinderlands are ash, Sunreach is sand,
//    the Sunken Mire is murky green, and the seas change tone too).
//  - Lakes and rivers: from Natural Earth (public domain), drawn on top.
//  - Clouds: NASA's GIBS service (free, no key) serves a true-colour picture of the whole Earth for each day; its white, colourless parts are the clouds, laid over the map with
//    some transparency. They are yesterday's clouds, not live ones: a live global cloud layer needs a paid service (see DESIGN.md).
//
// Everything runs on the phone, tile by tile, only for the tiles in view.

import type { ProvinceId } from './lore';

const BASE = import.meta.env.BASE_URL;
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default';

type RGB = [number, number, number];
/** The sea, the same everywhere (only the land takes the colours of its province). */
const SEA: { shallow: RGB; deep: RGB } = { shallow: [48, 140, 204], deep: [14, 66, 124] };

interface Palette { low: RGB; mid: RGB; rock: RGB; deep: RGB; shallow: RGB }

/** Each province's land and sea colours: bright, like a game's, and imagined from what the land is like. */
const PALETTES: Record<ProvinceId, Palette> = {
  skyrim: { low: [104, 156, 98], mid: [132, 160, 112], rock: [150, 156, 164], deep: [16, 56, 112], shallow: [60, 132, 196] },
  atmora: { low: [160, 186, 160], mid: [178, 190, 178], rock: [170, 176, 186], deep: [20, 62, 118], shallow: [90, 150, 205] },
  solstheim: { low: [136, 166, 132], mid: [150, 170, 146], rock: [138, 142, 150], deep: [18, 58, 112], shallow: [70, 140, 198] },
  highrock: { low: [84, 164, 86], mid: [120, 156, 94], rock: [132, 130, 146], deep: [18, 60, 118], shallow: [56, 132, 192] },
  cyrodiil: { low: [96, 182, 62], mid: [166, 174, 80], rock: [156, 134, 110], deep: [14, 66, 124], shallow: [48, 140, 204] },
  hammerfell: { low: [232, 196, 108], mid: [220, 164, 86], rock: [182, 112, 70], deep: [10, 84, 126], shallow: [40, 170, 190] },
  elsweyr: { low: [196, 184, 72], mid: [222, 156, 62], rock: [176, 102, 62], deep: [8, 92, 120], shallow: [34, 176, 178] },
  valenwood: { low: [30, 156, 70], mid: [62, 138, 62], rock: [112, 124, 100], deep: [8, 84, 98], shallow: [36, 170, 150] },
  morrowind: { low: [116, 96, 88], mid: [138, 100, 84], rock: [88, 76, 74], deep: [20, 56, 76], shallow: [60, 120, 130] },
  telvanni: { low: [96, 128, 124], mid: [118, 138, 126], rock: [92, 100, 104], deep: [18, 60, 82], shallow: [54, 128, 140] },
  redoran: { low: [140, 92, 76], mid: [158, 100, 76], rock: [104, 72, 66], deep: [22, 56, 76], shallow: [64, 118, 126] },
  hlaalu: { low: [190, 160, 110], mid: [196, 150, 100], rock: [150, 118, 92], deep: [16, 72, 100], shallow: [54, 150, 164] },
  velothi: { low: [100, 98, 112], mid: [116, 108, 116], rock: [84, 82, 98], deep: [20, 52, 82], shallow: [62, 116, 140] },
  summerset: { low: [156, 204, 84], mid: [204, 196, 104], rock: [196, 176, 146], deep: [8, 96, 132], shallow: [44, 184, 204] },
  orsinium: { low: [146, 158, 76], mid: [158, 134, 84], rock: [90, 88, 90], deep: [16, 64, 106], shallow: [50, 130, 176] },
  blackmarsh: { low: [48, 124, 84], mid: [66, 114, 70], rock: [100, 102, 90], deep: [14, 70, 72], shallow: [60, 140, 120] },
  shivering: { low: [156, 94, 170], mid: [176, 112, 156], rock: [122, 86, 134], deep: [34, 36, 110], shallow: [96, 110, 190] },
};
const ORDER = Object.keys(PALETTES) as ProvinceId[];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// the tiles come from other servers, so they are drawn with permission to read their pixels
const loadImage = (url: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = url;
});

const readPixels = (img: HTMLImageElement, sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight): ImageData => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = true;
  g.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
  return g.getImageData(0, 0, 256, 256);
};

const tileLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tileLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

let lakes: { box: [number, number, number, number]; pts: number[] }[] | null = null;
let rivers: { box: [number, number, number, number]; rank: number; pts: number[] }[] | null = null;
let waterLoading: Promise<void> | null = null;
function loadWater(): Promise<void> {
  waterLoading ??= (async () => {
    const boxOf = (pts: number[]): [number, number, number, number] => { let a = 180, b = 90, c = -180, d = -90; for (let i = 0; i < pts.length; i += 2) { a = Math.min(a, pts[i]); c = Math.max(c, pts[i]); b = Math.min(b, pts[i + 1]); d = Math.max(d, pts[i + 1]); } return [a, b, c, d]; };
    try {
      const [l, r] = await Promise.all([fetch(`${BASE}data/lakes.json`).then((x) => x.json() as Promise<number[][]>), fetch(`${BASE}data/rivers.json`).then((x) => x.json() as Promise<[number, number[]][]>)]);
      lakes = l.map((pts) => ({ box: boxOf(pts), pts }));
      rivers = r.map(([rank, pts]) => ({ box: boxOf(pts), rank, pts }));
    } catch { lakes = []; rivers = []; }
  })();
  return waterLoading;
}

/** Draws the lakes and rivers that touch this tile. */
function drawWater(g: CanvasRenderingContext2D, x: number, y: number, z: number, water: RGB) {
  if (!lakes || !rivers) return;
  const west = tileLng(x, z), east = tileLng(x + 1, z), north = tileLat(y, z), south = tileLat(y + 1, z);
  const px = (lng: number) => ((lng - west) / (east - west)) * 256;
  const toY = (lat: number) => { const m = (v: number) => Math.log(Math.tan(Math.PI / 4 + (v * Math.PI) / 360)); return ((m(north) - m(lat)) / (m(north) - m(south))) * 256; };
  const hits = (b: [number, number, number, number]) => b[2] >= west && b[0] <= east && b[3] >= south && b[1] <= north;
  const col = `rgb(${water.map((v) => Math.round(v)).join(',')})`;
  g.fillStyle = col;
  for (const l of lakes) {
    if (!hits(l.box)) continue;
    g.beginPath();
    for (let i = 0; i < l.pts.length; i += 2) { const X = px(l.pts[i]), Y = toY(l.pts[i + 1]); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
  }
  const maxRank = z < 4 ? 2 : z < 5 ? 3 : z < 7 ? 5 : 9;
  // thin and a little see-through when zoomed out, so a river is a fine line along the valley and not a drawn stripe; it only fattens as you come in
  const fine = Math.min(1.25, Math.max(0.22, (z - 2) / 5));
  g.globalAlpha = z < 6 ? 0.72 : 0.85;
  g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const r of rivers) {
    if (r.rank > maxRank || !hits(r.box)) continue;
    g.lineWidth = Math.max(0.45, (r.rank <= 3 ? 1.9 : r.rank <= 6 ? 1.25 : 0.85) * fine);
    g.beginPath();
    for (let i = 0; i < r.pts.length; i += 2) { const X = px(r.pts[i]), Y = toY(r.pts[i + 1]); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** Paints one relief tile. */
async function paintRelief(canvas: HTMLCanvasElement, x: number, y: number, z: number, provinceAt: (lat: number, lng: number) => ProvinceId) {
  const [img] = await Promise.all([loadImage(`${TERRARIUM}/${z}/${x}/${y}.png`), loadWater()]);
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (!img) { g.fillStyle = '#2a6ab0'; g.fillRect(0, 0, 256, 256); return; }
  const src = readPixels(img).data;
  const elev = new Float32Array(256 * 256);
  for (let i = 0; i < 65536; i++) elev[i] = src[i * 4] * 256 + src[i * 4 + 1] + src[i * 4 + 2] / 256 - 32768;

  const land = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) land[i] = elev[i] > 1.2 ? 1 : 0; // the flat water of sounds and lakes reads as a mix of -0.4 and +0.4 metres in the height data: only above a metre or so is land
  // close up, the sounds and lakes show blocks of "land" a few hundred pixels across that are only noise in the height data: a patch of land that does not touch the tile's edge and is small is dropped
  if (z >= 10) {
    const seen = new Uint8Array(65536);
    const stack: number[] = [];
    for (let start = 0; start < 65536; start++) {
      if (land[start] !== 1 || seen[start]) continue;
      const cells: number[] = [];
      let touches = false;
      stack.push(start); seen[start] = 1;
      while (stack.length) {
        const c = stack.pop() as number;
        cells.push(c);
        const cx = c & 255, cy = c >> 8;
        if (cx === 0 || cy === 0 || cx === 255 || cy === 255) touches = true;
        for (const n of [c - 1, c + 1, c - 256, c + 256]) {
          if (n < 0 || n >= 65536 || seen[n] || land[n] !== 1) continue;
          if ((n === c - 1 && cx === 0) || (n === c + 1 && cx === 255)) continue;
          seen[n] = 1; stack.push(n);
        }
      }
      if (!touches && cells.length < 700) for (const c of cells) land[c] = 0;
    }
  }
  // close up, the height data over sounds and lakes has stray specks: a speck smaller than a few pixels is not land (an erosion, then a dilation of the same size)
  let mask: Float32Array = land;
  if (z >= 8) {
    const R = z >= 10 ? 4 : 2;
    const sweep = (src: Float32Array, grow: boolean, horizontal: boolean): Float32Array => {
      const dst = new Float32Array(65536);
      for (let y2 = 0; y2 < 256; y2++) for (let x2 = 0; x2 < 256; x2++) {
        let v = grow ? 0 : 1;
        for (let k = -R; k <= R; k++) {
          const xx = horizontal ? Math.min(255, Math.max(0, x2 + k)) : x2, yy = horizontal ? y2 : Math.min(255, Math.max(0, y2 + k));
          const t = src[yy * 256 + xx];
          v = grow ? Math.max(v, t) : Math.min(v, t);
        }
        dst[y2 * 256 + x2] = v;
      }
      return dst;
    };
    mask = sweep(sweep(sweep(sweep(land, false, true), false, false), true, true), true, false);
  }
  let soft: Float32Array = mask;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(65536);
    for (let y2 = 0; y2 < 256; y2++) for (let x2 = 0; x2 < 256; x2++) {
      let sum = 0;
      for (let k = -2; k <= 2; k++) { const xx = pass === 0 ? Math.min(255, Math.max(0, x2 + k)) : x2, yy = pass === 0 ? y2 : Math.min(255, Math.max(0, y2 + k)); sum += soft[yy * 256 + xx] * (3 - Math.abs(k)); }
      tmp[y2 * 256 + x2] = sum / 9;
    }
    soft = tmp;
  }

  // which province's colours sit at each point of a coarse grid over the tile (blended between grid points, so borders fade)
  const N = 8;
  const grid: Palette[][] = [];
  for (let j = 0; j <= N; j++) { const row: Palette[] = []; for (let i = 0; i <= N; i++) row.push(PALETTES[provinceAt(tileLat(y + j / N, z), tileLng(x + i / N, z))] ?? PALETTES[ORDER[0]]); grid.push(row); }

  const out = g.createImageData(256, 256);
  const o = out.data;
  const mpp = (156543.03392 * Math.cos((tileLat(y + 0.5, z) * Math.PI) / 180)) / 2 ** z; // metres per pixel here
  const EXAG = 7;
  // how strong the colours are: 1 is the full game-bright palette; lower is calmer. (A middle road between the cold map and the bright one.)
  const SAT = 0.54;
  const lx = -0.55, ly = -0.55, lz = 0.65; // the light comes from the upper left
  const ln = Math.hypot(lx, ly, lz);
  const flat = lz / ln;
  for (let py = 0; py < 256; py++) {
    const lat = tileLat(y + py / 256, z);
    const snowLine = 200 + 5200 * Math.cos((lat * Math.PI) / 180) ** 2.4;
    const gy = (py / 256) * N, j = Math.min(N - 1, Math.floor(gy)), fy = gy - j;
    for (let px = 0; px < 256; px++) {
      const i = py * 256 + px;
      const e = elev[i];
      const gx = (px / 256) * N, k = Math.min(N - 1, Math.floor(gx)), fx = gx - k;
      // the four palettes round this pixel, blended by how near each is
      const p00 = grid[j][k], p10 = grid[j][k + 1], p01 = grid[j + 1][k], p11 = grid[j + 1][k + 1];
      const blend = (pick: (p: Palette) => RGB): RGB => {
        const a = mix(pick(p00), pick(p10), fx), b = mix(pick(p01), pick(p11), fx);
        return mix(a, b, fy);
      };
      const cover = smooth(0.32, 0.68, soft[i]); // 0 sea, 1 land, in between along the coast
      const x0 = elev[py * 256 + Math.max(0, px - 1)], x1 = elev[py * 256 + Math.min(255, px + 1)], y0 = elev[Math.max(0, py - 1) * 256 + px], y1 = elev[Math.min(255, py + 1) * 256 + px];
      let sea: RGB = [0, 0, 0], terrain: RGB = [0, 0, 0];
      if (cover < 0.999) {
        // sea: lighter near the coast, deep and dark far out, the same colours all over the world
        const depth = smooth(0, 4500, Math.max(0, -e));
        let c = mix(SEA.shallow, SEA.deep, Math.pow(depth, 0.6));
        const gry = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; const s2 = SAT + 0.1; c = [gry + (c[0] - gry) * s2, gry + (c[1] - gry) * s2, gry + (c[2] - gry) * s2];
        const sh = 0.94 + 0.12 * Math.max(-1, Math.min(1, (x0 - x1) / 400)); // a soft shading of the sea floor, so the shelves show
        sea = [c[0] * sh, c[1] * sh, c[2] * sh];
      }
      if (cover > 0.001) {
        const el = Math.max(e, 1);
        // the mountains are made taller than they are: the steeper and higher, the more the heights count
        const boost = EXAG * (1 + el / 1500);
        const dzdx = ((Math.max(x1, 0) - Math.max(x0, 0)) / (Math.max(1, Math.min(255, px + 1) - Math.max(0, px - 1)) * mpp)) * boost, dzdy = ((Math.max(y1, 0) - Math.max(y0, 0)) / (Math.max(1, Math.min(255, py + 1) - Math.max(0, py - 1)) * mpp)) * boost; // (at a tile's edge the slope is taken over the one side that exists, so no line shows along the seam)
        const nl = Math.hypot(dzdx, dzdy, 1);
        const lit = ((-dzdx * lx - dzdy * ly + lz) / (nl * ln));
        const shade = 0.5 + (lit - flat) * 3.4; // contrast: flat ground is about 0.5
        // the colour by height: lowland, then hills, then bare rock, then snow above the snow line (lower towards the poles)
        let col = mix(blend((p) => p.low), blend((p) => p.mid), smooth(150, 1100, el));
        col = mix(col, blend((p) => p.rock), smooth(1400, 3200, el));
        const snow = smooth(snowLine - 250, snowLine + 350, el);
        const steepRock = smooth(0.15, 0.6, Math.hypot(dzdx, dzdy) / boost * 14);
        col = mix(col, blend((p) => p.rock), steepRock * 0.45 * (1 - snow));
        col = mix(col, [246, 249, 252], snow);
        { const gry = col[0] * 0.3 + col[1] * 0.59 + col[2] * 0.11; col = [gry + (col[0] - gry) * SAT, gry + (col[1] - gry) * SAT, gry + (col[2] - gry) * SAT]; }
        const k2 = Math.max(0.35, Math.min(1.5, 0.62 + shade * 0.7 + (snow > 0.5 ? 0.12 : 0)));
        terrain = [Math.min(255, col[0] * k2), Math.min(255, col[1] * k2), Math.min(255, col[2] * k2)];
      }
      let fin: RGB = cover >= 0.999 ? terrain : cover <= 0.001 ? sea : mix(sea, terrain, cover);
      // a fine pale line of surf right along the coast, narrow and smooth
      const rim = Math.pow(1 - Math.abs(2 * cover - 1), 2.2);
      if (rim > 0.01) fin = mix(fin, [214, 240, 246], rim * 0.55);
      o[i * 4] = fin[0]; o[i * 4 + 1] = fin[1]; o[i * 4 + 2] = fin[2]; o[i * 4 + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  // lakes and rivers on top, in the tone of the local sea
  drawWater(g, x, y, z, mix(SEA.shallow, SEA.deep, 0.18));
}

/** Paints one cloud tile from yesterday's true-colour picture of the Earth: white, colourless parts become soft clouds, the rest is clear. */
async function paintClouds(canvas: HTMLCanvasElement, x: number, y: number, z: number, date: string) {
  const zg = Math.min(z, 9), shift = z - zg;
  const img = await loadImage(`${GIBS}/${date}/GoogleMapsCompatible_Level9/${zg}/${y >> shift}/${x >> shift}.jpg`);
  if (!img) return;
  const side = 256 >> shift;
  const sx = (x - ((x >> shift) << shift)) * side, sy = (y - ((y >> shift) << shift)) * side;
  const px = readPixels(img, sx, sy, shift ? side : 256, shift ? side : 256).data;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const out = g.createImageData(256, 256);
  const lat = tileLat(y + 0.5, z);
  const polar = Math.abs(lat) > 66 ? 0.15 : Math.abs(lat) > 52 ? 0.45 : 1; // snow and ice are white too: toward the poles most of it is left out
  let alpha = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) {
    const r = px[i * 4], gr = px[i * 4 + 1], b = px[i * 4 + 2];
    const min = Math.min(r, gr, b), max = Math.max(r, gr, b);
    alpha[i] = smooth(198, 248, min) * (1 - smooth(26, 60, max - min)) * 150 * polar;
  }
  // the satellite picture is stitched from orbit passes taken at different times, so clouds change abruptly along straight seams: a soft blur turns each seam from a ruled line into a gentle fade
  const rad = z < 6 ? 5 : z < 8 ? 3 : 2;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(65536);
    const w = 2 * rad + 1;
    for (let y2 = 0; y2 < 256; y2++) {
      for (let x2 = 0; x2 < 256; x2++) {
        let sum = 0;
        for (let k = -rad; k <= rad; k++) { const xx = Math.min(255, Math.max(0, pass === 0 ? x2 + k : x2)), yy = Math.min(255, Math.max(0, pass === 0 ? y2 : y2 + k)); sum += alpha[yy * 256 + xx]; }
        tmp[y2 * 256 + x2] = sum / w;
      }
    }
    alpha = tmp;
  }
  for (let i = 0; i < 65536; i++) { out.data[i * 4] = 248; out.data[i * 4 + 1] = 250; out.data[i * 4 + 2] = 255; out.data[i * 4 + 3] = Math.round(alpha[i]); }
  g.putImageData(out, 0, 0);
}

export interface Vivid { base: google.maps.MapType; clouds: google.maps.MapType }

const yesterday = (): string => { const d = new Date(Date.now() - 30 * 3600 * 1000); return d.toISOString().slice(0, 10); };

/** The two layers of the vivid map. (Call it only after Google Maps has loaded.) */
export function createVivid(provinceAt: (lat: number, lng: number) => ProvinceId): Vivid {
  const size = new google.maps.Size(256, 256);
  const tile = (paint: (c: HTMLCanvasElement, x: number, y: number, z: number) => Promise<void>) => (coord: google.maps.Point, zoom: number, doc: Document) => {
    const c = doc.createElement('canvas'); c.width = 256; c.height = 256;
    // a pixel bigger than its place, so on screens that scale the map by a fraction the tiles overlap a hair and no dark hairline shows between them
    c.style.width = '257px'; c.style.height = '257px';
    const n = 2 ** zoom;
    if (coord.y >= 0 && coord.y < n) void paint(c, ((coord.x % n) + n) % n, coord.y, zoom);
    return c;
  };
  const date = yesterday();
  const base: google.maps.MapType = { tileSize: size, maxZoom: 11, minZoom: 2, radius: 6378137, name: 'Vivid', alt: 'Vivid relief', getTile: tile((c, x, y, z) => paintRelief(c, x, y, z, provinceAt)), releaseTile: () => undefined, projection: null };
  const clouds: google.maps.MapType = { tileSize: size, maxZoom: 11, minZoom: 2, radius: 6378137, name: 'Clouds', alt: 'Clouds', getTile: tile((c, x, y, z) => paintClouds(c, x, y, z, date)), releaseTile: () => undefined, projection: null };
  return { base, clouds };
}
