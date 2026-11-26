// The Earth, re-drawn as an old fantasy realm. (The province ids are working names; what people read are the names below, which are our own.) Every country belongs to one of the provinces (or islands or lost continents), and each province has its
// own mood: a tint for the land, an ink for its labels, and a way of naming towns. Real names are bent to fit: "Seattle" becomes "Seattlestead" in Skyrim,
// "Seattle-mont" in High Rock. The bending is by a hash of the name, so a place is always called the same thing.

export type ProvinceId =
  | 'skyrim' | 'highrock' | 'hammerfell' | 'orsinium' | 'elsweyr' | 'valenwood' | 'morrowind' | 'summerset' | 'shivering' | 'cyrodiil' | 'blackmarsh' | 'solstheim' | 'atmora';

export interface Province {
  id: ProvinceId;
  name: string;
  /** What the real land is, in small print. */
  real: string;
  /** The tint laid over the land, and the ink of its labels and crests. */
  tint: string;
  ink: string;
  /** Where its name is written on the world map. */
  label: { lat: number; lng: number };
  /** How names are made: {b} is the real name, cut to a stem. */
  patterns: string[];
  /** One line of what the land is like. */
  blurb: string;
}

export const PROVINCES: Record<ProvinceId, Province> = {
  skyrim: { id: 'skyrim', name: 'Hoarfell', real: 'Scandinavia', tint: '#8fa3b5', ink: '#f2f2ee', label: { lat: 63, lng: 15 }, blurb: 'Snow, pine and old stone. Home of the northern clans.',
    patterns: ['{b}stead', '{b}helm', '{b}hold', 'Fort {b}', '{b}winter', '{b}fall', '{b}wood', '{b} Watch'] },
  highrock: { id: 'highrock', name: 'Highmere', real: 'Europe and the British Isles', tint: '#7c5a8a', ink: '#e6dff0', label: { lat: 49, lng: 9 }, blurb: 'Castles, fog and fjords. Knights and mages of the misty keeps.',
    patterns: ['{b}mont', '{b}ford', '{b}vale', 'Castle {b}', '{b}wood', '{b}hall', '{b}ton', 'Fort {b}'] },
  hammerfell: { id: 'hammerfell', name: 'Sunreach', real: 'North Africa and Arabia', tint: '#c79a4e', ink: '#2b1a08', label: { lat: 27, lng: 22 }, blurb: 'Sandstone domes under a hard sun. The finest sword-masters in the world.',
    patterns: ['{b}ak', '{b}kar', 'Port {b}', '{b} Oasis', '{b}bek', '{b}nal', '{b}ra'] },
  orsinium: { id: 'orsinium', name: 'The Tuskholds', real: 'Sub-Saharan Africa', tint: '#6f7f56', ink: '#e5ecd6', label: { lat: -8, lng: 23 }, blurb: 'Stronghold country: basalt, iron and the stubborn pride of the orc clans.',
    patterns: ['{b}gash', 'Dun {b}', '{b}-bur', 'Fort {b}', '{b}gul', 'Mor {b}', '{b}ukh'] },
  elsweyr: { id: 'elsweyr', name: 'Sunmane Reach', real: 'The Indian subcontinent', tint: '#d8a24a', ink: '#3a2410', label: { lat: 22, lng: 79 }, blurb: 'Moon-sugar fields, savanna and sun-baked clay. Cat-folk caravans cross it.',
    patterns: ['{b}rai', '{b}dar', '{b} Sands', '{b}ra', 'Ri{b}', '{b}khan'] },
  valenwood: { id: 'valenwood', name: 'The Verdance', real: 'China, Southeast Asia and southwest Asia', tint: '#4d7a3a', ink: '#e5f1d3', label: { lat: 33, lng: 105 }, blurb: 'Canopy cities in living trees. The wood-elves eat no plant they have not asked.',
    patterns: ['{b}wynn', '{b}wood', '{b}ael', '{b} Grove', 'Green {b}', '{b}rim'] },
  morrowind: { id: 'morrowind', name: 'The Cinderlands', real: 'Russia, Siberia and the steppe', tint: '#8c4a3a', ink: '#f1d9c8', label: { lat: 60, lng: 85 }, blurb: 'Ash, basalt and mushroom towers beneath the red volcano. Proud houses and old grudges.',
    patterns: ['{b} Thar', 'Dur {b}', '{b}vek', 'Vel {b}', '{b}ras', '{b}ven', 'Kor {b}'] },
  summerset: { id: 'summerset', name: 'The Gilded Isle', real: 'Japan', tint: '#d6c27a', ink: '#2a2610', label: { lat: 37, lng: 138 }, blurb: 'Crystal spires and gardens in the sun. The high elves count their years in thousands.',
    patterns: ['{b}dil', '{b}iel', '{b}mar', '{b}wyn', 'Alin {b}', '{b}sethil'] },
  shivering: { id: 'shivering', name: 'The Fever Isles', real: 'Australia and Indonesia', tint: '#c15a9c', ink: '#fbe6f5', label: { lat: -24, lng: 134 }, blurb: 'A mad god\'s realm where nothing is quite as it was.',
    patterns: ['{b} Bliss', 'New {b}', '{b}-Split', '{b}nettle', 'Crooked {b}', '{b} Crucible'] },
  cyrodiil: { id: 'cyrodiil', name: 'Aurelia', real: 'North America', tint: '#a9863f', ink: '#2c2412', label: { lat: 42, lng: -100 }, blurb: 'The imperial heartland: marble, rivers and roads that all lead to one city.',
    patterns: ['{b}ia', '{b}um', '{b}us', '{b}icus', 'Fort {b}', '{b}ium'] },
  blackmarsh: { id: 'blackmarsh', name: 'The Sunken Mire', real: 'South America', tint: '#3f6a5a', ink: '#d9efe3', label: { lat: -12, lng: -60 }, blurb: 'Mangrove and hist-tree swamp, home of the lizard-folk.',
    patterns: ['{b} Hist', 'Shadow {b}', '{b}hill', '{b}moor', '{b}-Tava', 'Hist {b}'] },
  solstheim: { id: 'solstheim', name: 'Rimeholm', real: 'Greenland', tint: '#a8b8c4', ink: '#f2f2ee', label: { lat: 73, lng: -41 }, blurb: 'Snow in the north, ash in the south. An island of old stone and a long winter.',
    patterns: ['Fort {b}', '{b} Rock', 'Crow {b}', '{b}stead', 'Hel {b}'] },
  atmora: { id: 'atmora', name: 'Old Rime', real: 'Antarctica', tint: '#d4e3ee', ink: '#1d2a36', label: { lat: -78, lng: 20 }, blurb: 'The frozen homeland the northern clans left behind.',
    patterns: ['{b}thar', '{b}mor', '{b}ur', 'Old {b}'] },
};

const SCANDI = new Set(['NOR', 'SWE', 'FIN', 'DNK', 'ISL']);
const NORTH_AFRICA_ARABIA = new Set(['SAU', 'YEM', 'OMN', 'ARE', 'QAT', 'KWT', 'BHR', 'JOR', 'IRQ', 'SYR', 'LBN', 'ISR', 'PSX', 'PSE', 'CYP']);
const SUBCONTINENT = new Set(['IND', 'PAK', 'BGD', 'LKA', 'NPL', 'BTN', 'MDV']);
const STEPPE = new Set(['RUS', 'KAZ', 'MNG']);
const SOUTHWEST_ASIA = new Set(['IRN', 'TUR', 'AFG', 'GEO', 'ARM', 'AZE', 'UZB', 'TKM', 'TJK', 'KGZ']);
const CHINA_SEA = new Set(['CHN', 'TWN', 'PRK', 'KOR', 'THA', 'VNM', 'LAO', 'KHM', 'MMR', 'MYS', 'PHL', 'BRN', 'SGP', 'TLS']);
const SHIVERING = new Set(['AUS', 'NZL', 'IDN', 'PNG', 'FJI', 'SLB', 'VUT', 'NCL']);

/** The province of a country, by its ISO three-letter code and continent (as Natural Earth writes them). */
export function provinceOf(iso3: string, continent: string, subregion: string): ProvinceId {
  if (iso3 === 'GRL') return 'solstheim';
  if (iso3 === 'ATA' || continent === 'Antarctica') return 'atmora';
  if (SCANDI.has(iso3)) return 'skyrim';
  if (iso3 === 'JPN') return 'summerset';
  if (STEPPE.has(iso3)) return 'morrowind';
  if (SUBCONTINENT.has(iso3)) return 'elsweyr';
  if (SHIVERING.has(iso3) || continent === 'Oceania') return 'shivering';
  if (NORTH_AFRICA_ARABIA.has(iso3)) return 'hammerfell';
  if (CHINA_SEA.has(iso3) || SOUTHWEST_ASIA.has(iso3)) return 'valenwood';
  if (continent === 'Africa') return /Northern/i.test(subregion) ? 'hammerfell' : 'orsinium';
  if (continent === 'Europe') return 'highrock';
  if (continent === 'North America') return 'cyrodiil';
  if (continent === 'South America') return 'blackmarsh';
  if (continent === 'Asia') return 'valenwood';
  return 'cyrodiil';
}

/** Each real point on Earth, to a province, for places that are only coordinates (a metro, a waterfall): the nearest country's province by its bounding box. */
export interface CountryBox { province: ProvinceId; iso3: string; minLat: number; maxLat: number; minLng: number; maxLng: number; area: number }

// ---- names ----
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** The stem of a real name: first word(s), letters only, accents folded, with a closing vowel dropped so a suffix joins neatly. */
function stem(name: string): string {
  const folded = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').split(/[,/]/)[0].replace(/[^A-Za-z' -]/g, '').trim();
  const words = folded.split(/\s+/).filter(Boolean);
  const first = words[0] ?? folded;
  return (words.length > 1 && first.length <= 4 ? `${first} ${words[1]}` : first).slice(0, 14);
}

/** A real name cut back so a suffix joins it smoothly (a single word; longer names are cut at nine letters). */
export function blend(base: string, suffix: string): string {
  if (/[ -]/.test(base) || base.length <= 4) return base;
  let g = base.replace(/gh$/i, 'g').replace(/h$/i, '');
  if (g.length > 5) g = g.replace(/(us|um|ia|on|an|ey|ay|ie)$/i, '');
  while (g.length > 4 && /[aeiouy]$/i.test(g)) g = g.slice(0, -1);
  if (g.length > 9) { g = g.slice(0, 9); while (g.length > 4 && /[aeiouy]$/i.test(g)) g = g.slice(0, -1); }
  if (g.slice(-1).toLowerCase() === suffix[0].toLowerCase()) g = g.slice(0, -1);
  return g;
}

/** The lore name of a real place in a province. Famous names stay recognisable; it only adds the flavour of the land. */
export function loreName(real: string, province: ProvinceId): string {
  const p = PROVINCES[province];
  const base = stem(real);
  if (!base) return real;
  const pattern = p.patterns[hash(real) % p.patterns.length];
  // a pattern that glues a suffix on is joined by blending: the name is cut back to its bones (Sydney + nettle = Sydnettle, Columbus + icus = Columbicus, Pittsburgh + ium = Pittsburgium)
  const suffix = pattern.match(/{b}([a-z-]+)/)?.[1];
  const b = suffix ? blend(base, suffix) : base;
  const out = pattern.replace('{b}', b);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** The colour to write a land's name in on the dark cards: its own ink when that is light, otherwise its tint (the dark inks are for text on its light map). */
export function readableInk(p: Province): string {
  const n = parseInt(p.ink.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.5 ? p.ink : p.tint;
}

/** What the capital of a land is called there: several forms each, one picked by the city's name. */
const CAPITAL_TITLE: Record<ProvinceId, string[]> = {
  skyrim: ['Hold Capital', "Jarl's Seat", 'High Hold'],
  shivering: ['Realm Seat', 'Court of Two Moods'],
  solstheim: ['Moot Seat', 'Steading Capital'],
  atmora: ['Winter Seat', 'Rime Capital'],
  highrock: ['Principality', 'Regent Capital', "Duke's Seat", "Count's Seat"],
  cyrodiil: ['Provincial Capital', 'Imperial Seat', 'Palatine City'],
  hammerfell: ["Sultan's Seat", 'Emirate Capital', "Caliph's Seat"],
  elsweyr: ['Khanate Capital', 'Warren Seat', 'Sunmane Court'],
  valenwood: ['Grove Capital', 'Canopy Seat', 'Verdant Court'],
  orsinium: ['Stronghold Capital', "Chieftain's Hold", 'Warhold'],
  morrowind: ['Great House Seat', 'Ash Capital', 'Council Seat'],
  summerset: ['Crystal Court', 'Gilded Capital', 'Sovereign Seat'],
  blackmarsh: ['Marsh Capital', 'Reed Capital', "Fenwarden's Seat"],
};

/** The title of a kind of place; the capitals (the shield cities) are named for their land. */
export function kindTitle(kind: string, province: ProvinceId, name: string): string {
  if (kind === 'crest') { const forms = CAPITAL_TITLE[province]; return forms[titleHash(name) % forms.length]; }
  return KIND_TITLE[kind] ?? kind;
}

/** What a kind of place is called in the games. */
export const KIND_TITLE: Record<string, string> = {
  crest: 'Capital', keep: 'Lord\'s Keep', landmark: 'Landmark', town: 'Town', village: 'Settlement',
  waterfall: 'Waterfall', cave: 'Cave', ruin: 'Ancient Ruin', fort: 'Fort', camp: 'Camp', lighthouse: 'Beacon', volcano: 'Fire Mountain',
  spring: 'Hot Spring', pass: 'Mountain Pass', glacier: 'Glacier', grove: 'Wild Grove', shrine: 'Shrine', peak: 'Peak', stones: 'Standing Stones', mill: 'Mill', tower: 'Watchtower',
};

/** The seas and oceans, written across the water. */
export const SEAS: { name: string; at: { lat: number; lng: number }; big: boolean }[] = [
  { name: 'Voidwater Ocean', at: { lat: 8, lng: -150 }, big: true },
  { name: 'Dawnward Ocean', at: { lat: 22, lng: -42 }, big: true },
  { name: 'Southern Sea', at: { lat: -22, lng: 82 }, big: true },
  { name: 'Sea of Wraiths', at: { lat: 74, lng: 12 }, big: false },
  { name: 'Middle Sea', at: { lat: 34.5, lng: 18 }, big: false },
  { name: 'Tidemark Sea', at: { lat: 15.5, lng: -74 }, big: false },
  { name: 'Sunrise Sea', at: { lat: 38, lng: 132.5 }, big: false },
  { name: 'Crescent Bay', at: { lat: 43, lng: -6 }, big: false },
  { name: 'Jade Sea', at: { lat: 30, lng: 125 }, big: false },
  { name: 'Fever Sea', at: { lat: -33, lng: 158 }, big: false },
];

/** A short name for what each province is like, said after its name on a place's card. */
export const EPITHET: Record<ProvinceId, string> = {
  skyrim: 'the Frozen North', highrock: 'the Misty Marches', hammerfell: 'the Sunlit Sands', orsinium: 'the Stronghold Lands', elsweyr: 'the Sunmane Plains', valenwood: 'the Living Canopy',
  morrowind: 'the Ashen Lands', summerset: 'the Crystal Isle', shivering: 'the Mad Isles', cyrodiil: 'the Imperial Heartland', blackmarsh: 'the Drowned Marsh', solstheim: 'the Ash and Ice Isle', atmora: 'the Frozen Homeland',
};

/**
 * What a state or province of the real world is called inside each of ours: several forms for each region, so its states are not all the same kind of place ("Dominion of Ohio", "The Michigan
 * Marches", "Barony of Texas"). The form is picked from the state's own name, so a state is always the same thing. {x} is the real name.
 */
export const REGION_TITLES: Record<ProvinceId, string[]> = {
  skyrim: ['Hold of {x}', '{x} Steading', 'Jarldom of {x}', 'The {x} Fells', 'Reach of {x}', '{x} Vale', 'Thanedom of {x}'],
  highrock: ['Duchy of {x}', 'Barony of {x}', 'County of {x}', 'The {x} Marches', 'Earldom of {x}', '{x} Shire', 'Principality of {x}'],
  hammerfell: ['Emirate of {x}', 'Sultanate of {x}', '{x} Oasis', 'The {x} Sands', 'Caliphate of {x}', '{x} Dunes', 'Protectorate of {x}'],
  orsinium: ['Clanlands of {x}', '{x} Stronghold', 'Warhold of {x}', 'The {x} Crags', 'Chiefdom of {x}', '{x} Iron March', 'Tuskhold of {x}'],
  elsweyr: ['Reach of {x}', 'Moonfields of {x}', 'The {x} Plains', 'Warren of {x}', '{x} Savanna', 'Caravanate of {x}', 'Pride of {x}'],
  valenwood: ['Canopy of {x}', 'Grove of {x}', 'The {x} Wilds', 'Heartwood of {x}', '{x} Glade', 'Bough of {x}', 'Woodland of {x}'],
  morrowind: ['Houselands of {x}', 'The {x} Ashlands', 'Stronghold of {x}', '{x} Caldera', 'Fief of {x}', 'Cinder-march of {x}', 'Council Seat of {x}'],
  summerset: ['Court of {x}', 'Spire of {x}', 'The {x} Gardens', 'Isle of {x}', 'Crystal March of {x}', 'Conclave of {x}', 'Gilded Reach of {x}'],
  shivering: ['Fancy of {x}', 'The {x} Folly', 'Madness of {x}', '{x} Whimsy', 'Realm of {x}', 'Dream of {x}', 'The Curious {x}'],
  cyrodiil: ['Dominion of {x}', 'County of {x}', 'The {x} Marches', 'Palatinate of {x}', 'Princedom of {x}', '{x} Reach', 'Grand Duchy of {x}', 'Protectorate of {x}', 'Viscounty of {x}', 'Province of {x}'],
  blackmarsh: ['Fen of {x}', 'Mire of {x}', 'The {x} Bayou', 'Hist Grove of {x}', '{x} Backwater', 'Delta of {x}', 'The Drowned {x}'],
  solstheim: ['Steading of {x}', 'The {x} Strand', 'Holdfast of {x}', '{x} Cairn', 'Shore of {x}', 'Moot of {x}', 'Rimeland of {x}'],
  atmora: ['Rime of {x}', 'The {x} Wastes', 'Cairn of {x}', 'Old {x}', 'Winterhold of {x}', 'Barrow of {x}', 'Glacier of {x}'],
};

const titleHash = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** The line on a place's card: "Dominion of Ohio, Aurelia, the Imperial Heartland" (the first part only when the state or province is known). */
export function placeLine(province: ProvinceId, region?: string | null): string {
  const p = PROVINCES[province];
  const forms = REGION_TITLES[province];
  return [region ? forms[titleHash(region) % forms.length].split('{x}').join(region) : '', p.name, EPITHET[province]].filter(Boolean).join(', ');
}
