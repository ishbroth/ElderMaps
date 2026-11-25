// Places beside water are given the water in their picture, and a neighbourhood is dressed as a whole: of the addresses along a stream, one gets the mill and its waterwheel, another the old
// bridge, and the rest simply look onto the water, so a street reads as one place (and stitches together later into one view) instead of every house repeating the same thing.
// The rule is by area, not by address alone: before a picture is made, the pictures already made within about 300 m are looked at, and a special feature already used there is not used again.

export type Water = 'sea' | 'river' | 'canal' | 'lake' | 'wetland' | 'stream';

const MIRRORS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter'];

/** The water within a short walk of this point (null when none, or when it could not be asked: then nothing is added). */
export async function waterNear(lat: number, lng: number): Promise<Water | null> {
  const q = `[out:json][timeout:8];(way(around:150,${lat},${lng})[natural=coastline];way(around:120,${lat},${lng})[waterway~"^(river|canal|stream)$"];way(around:100,${lat},${lng})[natural=water];way(around:100,${lat},${lng})[natural=wetland];relation(around:100,${lat},${lng})[natural=water];);out tags 24;`;
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ElderMaps/1.0 (https://eldermaps.com)', Accept: '*/*' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      const body = (await res.json()) as { elements?: { tags?: Record<string, string> }[] };
      const found = new Set<Water>();
      for (const el of body.elements ?? []) {
        const t = el.tags ?? {};
        if (t.natural === 'coastline') found.add('sea');
        else if (t.waterway === 'river') found.add('river');
        else if (t.waterway === 'canal') found.add('canal');
        else if (t.waterway === 'stream') found.add('stream');
        else if (t.natural === 'wetland') found.add('wetland');
        else if (t.natural === 'water') found.add(t.water === 'river' ? 'river' : t.water === 'canal' ? 'canal' : 'lake');
      }
      for (const w of ['sea', 'river', 'canal', 'lake', 'wetland', 'stream'] as Water[]) if (found.has(w)) return w;
      return null;
    } catch { /* the next mirror */ }
  }
  return null;
}

const hashOf = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Features that stand out (used at most once in an area), by the kind of water. */
const SPECIALS: Record<Water, Record<string, string>> = {
  river: {
    waterwheel: 'Beside the main building, on the river, stands an old mill with a great wooden waterwheel turning in the current.',
    bridge: 'In the near distance an old arched stone bridge crosses the river, with a small gatehouse at one end.',
    rapids: 'The river runs over white rapids and mossy rocks close by, with spray in the air.',
  },
  stream: {
    waterwheel: 'A small stream runs beside the building and turns a modest wooden waterwheel on a mill or workshop wall.',
    bridge: 'A little humpbacked stone bridge crosses the stream beside it.',
    rapids: 'The stream tumbles over mossy rocks in small rapids close by.',
  },
  canal: {
    bridge: 'A graceful arched stone bridge crosses the canal beside it.',
    boats: 'Slim old boats are moored along the canal wall beside it, with lanterns on posts.',
  },
  sea: {
    sunken: 'The lowest street beside the building is half drowned: broken pillars, steps and arches of sunken ruins rise out of the still water.',
    harbour: 'Beyond it is an old stone harbour with a chain boom, moored sailing ships and a watch-tower on the mole.',
  },
  lake: {
    sunken: 'Old ruined steps and the tops of drowned columns rise from the lake at its edge.',
    pier: 'A long wooden pier with lanterns runs out into the lake beside it.',
  },
  wetland: {
    marsh: 'The ground around it is wet: puddles, reed beds and plank boardwalks between little stone-edged pools.',
  },
};

/** The water simply seen (the common case): the river bank, the shore, the pool. */
const VIEW: Record<Water, string> = {
  river: 'A river is seen beside or behind it, with its bank, willows and reeds.',
  stream: 'A small stream runs beside it between stones and ferns.',
  canal: 'A calm canal runs past it, edged by old stone.',
  sea: 'The sea is seen beyond it, with a rocky shore and gulls.',
  lake: 'A calm lake is seen beside it, with reeds at the edge.',
  wetland: 'Its ground is soft and marshy, with reeds and still pools.',
};

/** What the water looks like in each land. */
const REGION_WATER: Record<string, string> = {
  blackmarsh: 'The water is dark and mossy, under hanging trees.', morrowind: 'The water is grey with drifting ash.', summerset: 'The water is crystal clear and pale turquoise.',
  skyrim: 'The water is cold, clear and steel-blue, with ice at its margins.', valenwood: 'The water is green and dappled with leaf-light.', hammerfell: 'The water is a rare bright blue between pale sand.',
};

/** The feature for this address, given the ones already used in its area (their keys). Null when the place has no water to show. */
export function pickWaterFlavour(water: Water | null, province: string, placeId: string, used: string[]): { key: string; text: string } | null {
  if (!water) return null;
  const h = hashOf(placeId);
  const options = Object.entries(SPECIALS[water]).filter(([k]) => !used.includes(k) || (k === 'marsh' && used.filter((u) => u === 'marsh').length < 2));
  const specials = used.filter((u) => u !== 'view' && u !== 'plain').length;
  // the first special in an area is likely, the second less, then rare: one waterwheel, one bridge, and the rest look onto the water
  const chance = specials === 0 ? 0.4 : specials === 1 ? 0.12 : 0.04;
  const tone = REGION_WATER[province] ?? '';
  if (options.length > 0 && (h % 1000) / 1000 < chance) {
    const [key, text] = options[(h >>> 10) % options.length];
    return { key, text: `${text} ${tone}`.trim() };
  }
  if (((h >>> 12) % 100) < 80) return { key: 'view', text: `${VIEW[water]} ${tone}`.trim() };
  return { key: 'plain', text: '' };
}
