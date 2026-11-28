// The map of building styles over the world (built by _tools/build-styles.mts from the rules in styleRules.ts): which style a place is rendered in, and the colour wash on the map.
// To go back to the older layout (one style for each country's realm), set STYLE_MODE to 'legacy'.

import { STYLES, type StyleId } from './styleRules';

export const STYLE_MODE: 'regions' | 'legacy' = 'regions';

const BASE = import.meta.env.BASE_URL;
const W = 1800, H = 900, STEP = 0.2;

export interface StyleMap {
  grid: Uint8Array;
  cities: Record<string, number>;
  /** The colours laid out the way the map draws them (Mercator: one pixel row for each slice of the map's height). */
  tint: HTMLCanvasElement;
}

/** The colour of each style on the map: its realm-free wash. */
export const STYLE_TINT: Record<StyleId, string> = Object.fromEntries(STYLES.map((s) => [s.id, s.tint])) as Record<StyleId, string>;

let loading: Promise<StyleMap | null> | null = null;

export function loadStyleMap(): Promise<StyleMap | null> {
  loading ??= (async () => {
    try {
      const [blob, cities] = await Promise.all([
        fetch(`${BASE}data/style-grid.png`).then((r) => r.blob()),
        fetch(`${BASE}data/city-styles.json`).then((r) => r.json() as Promise<Record<string, number>>),
      ]);
      const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
      g.drawImage(bmp, 0, 0);
      const px = g.getImageData(0, 0, W, H).data;
      const grid = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) grid[i] = px[i * 4];
      return { grid, cities, tint: buildTint(grid) };
    } catch { return null; }
  })();
  return loading;
}

function buildTint(grid: Uint8Array): HTMLCanvasElement {
  const S = 1800;                                        // the world as a square, from 85 degrees south to 85 north
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  const img = g.createImageData(S, S);
  const rgb = STYLES.map((s) => [parseInt(s.tint.slice(1, 3), 16), parseInt(s.tint.slice(3, 5), 16), parseInt(s.tint.slice(5, 7), 16)]);
  for (let y = 0; y < S; y++) {
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / S))) * 180) / Math.PI;
    const row = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / STEP)));
    for (let x = 0; x < S; x++) {
      const v = grid[row * W + Math.floor((x / S) * W)];
      if (!v) continue;
      const o = (y * S + x) * 4, c = rgb[v - 1];
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/** The style number at a point (the nearest painted cell if the point is on a coast the grid does not reach), or 0. */
function gridAt(sm: StyleMap, lat: number, lng: number): number {
  const r0 = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / STEP))), c0 = Math.min(W - 1, Math.max(0, Math.floor(((((lng + 180) % 360) + 360) % 360) / STEP)));
  if (sm.grid[r0 * W + c0]) return sm.grid[r0 * W + c0];
  for (let d = 1; d <= 12; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
    if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
    const rr = r0 + dr, cc = c0 + dc;
    if (rr >= 0 && rr < H && cc >= 0 && cc < W && sm.grid[rr * W + cc]) return sm.grid[rr * W + cc];
  }
  return 0;
}

/** The building style a place is rendered in: a shield or town by its own exact entry, anything else by where it lies. Null in the older layout (or before the map has loaded). */
export function styleOfSpot(sm: StyleMap | null, spot: { id: string; lat: number; lng: number }): StyleId | null {
  if (STYLE_MODE !== 'regions' || !sm) return null;
  const n = sm.cities[spot.id] || gridAt(sm, spot.lat, spot.lng);
  return n ? STYLES[n - 1].id : null;
}
