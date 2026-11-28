// WHICH BUILDING STYLE EACH PART OF THE EARTH IS RENDERED IN. These rules are read by _tools/build-styles.mts, which turns them into a picture of the world (public/data/style-grid.png)
// and the style of every city (public/data/city-styles.json); the app reads those. To change the map of styles, edit the rules here and run that tool.
// (The app can also go back to the older one-style-per-country layout: see STYLE_MODE in styleMap.ts.)
//
// A point is given with the country (as a two-letter code), its state or province (lower case, accents removed) and the style the old layout would give it.
// The first rule that matches wins, so the specific places come first and the broad ones last.

export type StyleId = 'nordic' | 'breton' | 'imperial' | 'argonian' | 'redguard' | 'khajiit' | 'hlaalu' | 'telvanni' | 'redoran' | 'velothi' | 'bosmer' | 'altmer' | 'ayleid' | 'orcish';

export interface Pt { lat: number; lng: number; iso2: string; adm1: string; legacy: StyleId }

const rad = (d: number) => (d * Math.PI) / 180;
const km = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};
const near = (p: Pt, la: number, lo: number, r: number): boolean => km(p.lat, p.lng, la, lo) <= r;
const inPoly = (p: Pt, poly: [number, number][]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const box = (p: Pt, w: number, s: number, e: number, n: number): boolean => p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n;
const any = (v: string, list: string[]): boolean => list.includes(v);

// ---- the shapes that cross borders (longitude, latitude)
/** The path from Colorado up between Montana and Idaho to Calgary and Edmonton. */
const CORRIDOR: [number, number][] = [[-108, 40.6], [-110.6, 43.2], [-113.2, 44.6], [-115.4, 46], [-116.4, 48], [-116, 49.2], [-115.2, 51], [-114.5, 53.9], [-112, 54], [-112.2, 51], [-112.9, 49], [-112.7, 47.5], [-113.2, 45.8], [-111.6, 44.6], [-109.4, 43.4], [-106.5, 41.5]];
/** The coast of west Africa from Luanda up to Douala, with Kinshasa inland. */
const WEST_AFRICA_COAST: [number, number][] = [[8.4, 5], [10, 5], [12, 2], [14, -1], [16.8, -3.2], [16.8, -5.6], [14.8, -8], [14, -10], [12, -9.5], [11.5, -5.5], [9, -1], [8.4, 2]];
/** The river country from Bangkok up to Vientiane. */
const BANGKOK_VIENTIANE: [number, number][] = [[99.6, 12.8], [101.4, 12.6], [101.2, 15], [103.4, 16.6], [104.2, 18.3], [102.2, 18.6], [100.7, 17.2], [99.4, 15.2]];

/** The style of a place. */
export function styleFor(p: Pt): StyleId {
  const { iso2: c, adm1: a } = p;

  // ===== places picked out by themselves (circles and shapes that must win over the country they sit in)
  if (near(p, 37.34, -121.89, 26)) return 'bosmer';                  // San Jose (not San Francisco, Oakland, Berkeley, San Mateo)
  if (near(p, 22.32, 114.17, 28)) return 'imperial';                 // Hong Kong
  if (near(p, 19.43, -99.13, 140)) return 'imperial';                // Mexico City
  if (near(p, 38.08, 46.29, 250) && c === 'IR') return 'hlaalu';     // Tabriz
  if (near(p, -12.97, -38.5, 230) || near(p, -2.53, -44.3, 230)) return 'orcish'; // Salvador and Sao Luis, Brazil
  if (near(p, 35.69, -105.94, 75)) return 'redoran';                // Santa Fe
  if (near(p, 31.76, -106.49, 130)) return 'hlaalu';                 // El Paso
  if (near(p, 43.12, 131.9, 380) || near(p, 53.04, 158.65, 420)) return 'velothi'; // Vladivostok and Petropavlovsk
  if (near(p, 49.9, -97.14, 230) || near(p, 48.38, -89.25, 230)) return 'nordic';  // Winnipeg and Thunder Bay
  if (near(p, 61.2, -149.9, 70) && c === 'US') return 'ayleid';      // Anchorage
  if (inPoly(p, CORRIDOR)) return 'imperial';                        // Colorado to Calgary and Edmonton, between Montana and Idaho
  if (inPoly(p, WEST_AFRICA_COAST) && any(c, ['AO', 'CD', 'CG', 'GA', 'GQ', 'CM', 'ST'])) return 'argonian'; // Luanda, Kinshasa, Douala
  if (inPoly(p, BANGKOK_VIENTIANE) && any(c, ['TH', 'LA'])) return 'argonian'; // Bangkok up the river to Vientiane
  if (c === 'SG') return 'ayleid';

  // ===== the United States
  if (c === 'US') {
    if (any(a, ['maine', 'massachusetts', 'vermont', 'new hampshire', 'rhode island', 'arkansas', 'missouri', 'iowa', 'nebraska', 'kansas', 'west virginia', 'oregon', 'wyoming', 'idaho'])) return 'breton';
    if (any(a, ['minnesota', 'north dakota', 'south dakota', 'montana', 'wisconsin'])) return 'nordic';
    if (any(a, ['new york', 'connecticut', 'new jersey', 'pennsylvania', 'delaware', 'maryland', 'district of columbia', 'ohio', 'indiana', 'illinois', 'colorado', 'oklahoma'])) return 'imperial';
    if (a === 'michigan') return p.lat >= 45.85 && p.lng <= -83.9 ? 'nordic' : 'imperial';
    if (a === 'kentucky') return p.lat >= 38.15 ? 'imperial' : 'breton';
    if (a === 'tennessee') return p.lng <= -88 ? 'orcish' : 'breton';
    if (a === 'north carolina') return p.lng < -81.3 ? 'breton' : 'imperial';
    if (a === 'south carolina') return p.lng < -81.9 ? 'breton' : 'imperial';
    if (a === 'virginia') return p.lng < -80.1 && p.lat < 38.2 ? 'breton' : 'imperial';
    if (a === 'georgia') return p.lng > -82.3 ? 'imperial' : p.lng < -83.2 || p.lat < 31.7 ? 'orcish' : 'imperial';
    if (any(a, ['alabama', 'mississippi'])) return 'orcish';
    if (a === 'louisiana') return 'argonian';
    if (a === 'florida') return p.lng < -85.3 ? 'orcish' : 'argonian';
    if (a === 'washington') return p.lng > -121 ? 'breton' : 'telvanni';
    if (a === 'texas') {
      if (p.lng >= -96.2 && p.lat <= 31.4) return 'argonian';        // Houston and the Gulf
      if (p.lat <= 28.8 && p.lng >= -98.1) return 'argonian';        // Corpus Christi
      if (p.lat >= 33.3 && p.lng < -100.2) return 'redoran';          // the panhandle
      if (p.lat >= 29.9 && p.lat <= 34.7 && p.lng >= -99.2 && p.lng <= -94) return 'imperial'; // north Texas down to Austin
      return 'redguard';
    }
    if (a === 'new mexico') return 'redguard';
    if (a === 'arizona') return p.lat >= 33 ? 'hlaalu' : 'redguard';
    if (a === 'utah') return p.lat >= 39.3 ? 'imperial' : 'hlaalu';
    if (a === 'nevada') return p.lat >= 38 ? 'imperial' : 'velothi';
    if (a === 'california') return p.lat >= 35.1 ? 'imperial' : p.lat >= 33.3 ? 'velothi' : 'hlaalu';
    if (a === 'alaska') return p.lng > 100 ? 'ayleid' : p.lng < -148 && p.lat < 62 ? 'ayleid' : p.lng < -165 ? 'ayleid' : 'telvanni';
    if (a === 'hawaii') return 'altmer';
  }

  // ===== Canada
  if (c === 'CA') {
    if (any(a, ['nova scotia', 'newfoundland and labrador', 'prince edward island'])) return 'nordic';
    if (a === 'ontario') return p.lat >= 46.9 ? 'breton' : 'imperial';
    if (a === 'alberta') return p.lat < 55.5 ? 'imperial' : 'breton';
    if (any(a, ['british columbia', 'yukon'])) return 'telvanni';
    return 'breton';                                                   // Quebec, New Brunswick, Manitoba, Saskatchewan, the north
  }
  if (c === 'GL') return 'nordic';

  // ===== Mexico, Central America and the Caribbean
  if (c === 'MX') {
    if (any(a, ['baja california', 'baja california sur'])) return 'hlaalu';
    if (any(a, ['yucatan', 'quintana roo', 'campeche', 'tabasco', 'veracruz', 'tamaulipas', 'chiapas'])) return 'argonian';
    return 'redguard';
  }
  if (any(c, ['BZ', 'HN', 'NI', 'PA', 'GT', 'SV', 'CR', 'CU', 'BS', 'DO', 'KY', 'TC'])) return 'argonian';
  if (c === 'PR') return 'khajiit';
  if (any(c, ['JM', 'HT'])) return 'orcish';
  if (box(p, -66, 10, -58, 19.5) || any(c, ['VI', 'VG', 'AG', 'KN', 'AI', 'MF', 'SX', 'BL', 'MS', 'GP', 'MQ', 'DM', 'LC', 'VC', 'BB', 'GD', 'TT'])) {
    if (any(c, ['VI', 'VG', 'AG', 'KN', 'AI', 'MF', 'SX', 'BL', 'MS']) || (p.lat >= 16.7 && p.lng > -67)) return 'orcish';  // the Virgin Islands through Antigua
    return 'argonian';                                                  // the south-east Caribbean
  }
  if (a === 'guyane francaise' || c === 'GF') return 'breton';
  if (any(a, ['martinique', 'guadeloupe'])) return 'argonian';
  if (any(a, ['la reunion', 'mayotte'])) return 'khajiit';

  // ===== South America
  if (c === 'BR') {
    if (any(a, ['sao paulo', 'parana', 'santa catarina', 'rio grande do sul'])) return 'imperial';
    return 'argonian';
  }
  if (c === 'UY') return 'breton';
  if (c === 'AR') {
    if (p.lat < -51.3 || a === 'tierra del fuego') return 'ayleid';
    if (p.lat < -39.5) return 'breton';
    if (p.lat < -28.5) return 'imperial';
    return 'argonian';
  }
  if (c === 'CL') {
    if (p.lat < -51.3 || a === 'magallanes y antartica chilena') return 'ayleid';
    if (p.lat < -39.5) return 'breton';
    if (p.lat < -28.5) return 'imperial';
    return 'argonian';
  }
  if (any(c, ['PY', 'BO'])) return 'argonian';
  if (c === 'VE') return 'argonian';
  if (any(c, ['GY', 'SR'])) return 'orcish';
  if (c === 'CO') return p.lng <= -73.8 ? 'bosmer' : 'argonian';
  if (c === 'EC') return 'bosmer';
  if (c === 'PE') return p.lng < -75.2 ? 'bosmer' : 'argonian';
  if (c === 'FK' || c === 'GS') return 'nordic';

  // ===== Europe
  if (any(c, ['DK', 'SE', 'NO', 'IS', 'FI', 'EE', 'LV', 'LT', 'FO', 'SJ', 'AX'])) return 'nordic';
  if (any(c, ['GB', 'IE', 'BE', 'NL', 'CZ', 'SK', 'BY', 'RS', 'BG', 'RO', 'LU', 'GG', 'JE', 'IM'])) return 'breton';
  if (c === 'FR') return p.lat >= 46.5 ? 'breton' : 'imperial';
  if (c === 'ES') {
    if (p.lat < 31) return 'redguard';                                 // the Canaries
    if (p.lat < 38.2) return 'redguard';
    if (p.lat >= 42 || (p.lng < -6.5 && p.lat >= 41.8)) return 'breton';
    return 'imperial';
  }
  if (c === 'PT') return p.lat < 37.4 && p.lng > -9.3 ? 'redguard' : 'imperial';
  if (any(c, ['IT', 'CH', 'GR', 'AL', 'MT', 'SM', 'VA', 'LI', 'MC', 'AD', 'AT'])) return 'imperial';
  if (c === 'DE') return p.lat >= 50.8 ? 'breton' : 'imperial';
  if (c === 'TR') return p.lng < 34.5 ? 'imperial' : 'hlaalu';
  if (c === 'UA') {
    if (p.lng >= 35.5) return 'telvanni';
    if (p.lat < 48.5) return 'imperial';
    return 'breton';
  }
  if (c === 'IL' || c === 'PS') return 'imperial';

  // ===== Russia, Central Asia and the Caucasus
  if (c === 'RU') {
    if (p.lat < 44.8 && p.lng >= 37) return 'redoran';                 // the Caucasus
    return 'telvanni';
  }
  if (c === 'KZ') return p.lat >= 48 ? 'telvanni' : 'redoran';
  if (any(c, ['GE', 'AM', 'AZ', 'AF', 'NP', 'KP'])) return 'redoran';
  if (any(c, ['TM', 'UZ', 'TJ', 'KG', 'SY', 'LB', 'IQ'])) return 'hlaalu';
  if (c === 'MN') return 'redguard';

  // ===== the Middle East and Africa
  if (c === 'YE') return p.lat < 14.9 && p.lng > 43 ? 'hlaalu' : 'redguard';
  if (any(c, ['SA', 'OM', 'IR', 'AE', 'QA', 'KW', 'BH', 'JO', 'CY'])) return 'redguard';
  if (any(c, ['SO', 'DJ'])) return 'hlaalu';
  if (c === 'ZA') return 'imperial';
  if (c === 'NA') return p.lng < 16 ? 'imperial' : 'orcish';
  if (any(c, ['ML', 'SD'])) return 'redoran';
  if (c === 'DZ') return p.lat < 31 ? 'redoran' : 'redguard';
  if (c === 'LY') return p.lat < 28 ? 'redoran' : 'redguard';
  if (any(c, ['MA', 'TN', 'EG', 'EH', 'MR'])) return 'redguard';
  if (any(c, ['MG', 'SC', 'MU', 'KM', 'RE', 'YT'])) return 'khajiit';

  // ===== South Asia
  if (c === 'PK') return p.lat >= 33 ? 'redoran' : 'khajiit';
  if (c === 'IN') return p.lat >= 32 || (p.lat >= 30.5 && p.lng >= 76.5 && p.lng <= 81.2) ? 'redoran' : 'khajiit';
  if (any(c, ['BD', 'BT', 'LK', 'MV'])) return 'khajiit';

  // ===== East and South-East Asia
  if (c === 'CN') {
    if (any(a, ['xinjiang'])) return 'redguard';
    if (any(a, ['xizang', 'qinghai'])) return 'redoran';
    if (a === 'gansu' && p.lng < 100) return 'redguard';
    if (a === 'inner mongol') return p.lng < 104 ? 'redguard' : 'velothi';
    if (a === 'sichuan' && p.lng < 102.5 && p.lat > 28.5) return 'redoran';
    if (p.lat >= 39 && p.lng > 104) return 'velothi';                  // from Beijing north
    return 'bosmer';
  }
  if (c === 'MO') return 'bosmer';
  if (c === 'TW') return 'altmer';
  if (c === 'KR') return 'altmer';
  if (c === 'JP') return a === 'hokkaido' ? 'velothi' : 'altmer';
  if (c === 'PH') return 'altmer';
  if (any(c, ['VN', 'KH', 'LA', 'MM', 'TH', 'MY', 'BN'])) return 'bosmer';
  if (c === 'ID') return box(p, 94.9, -6.1, 106.2, 5.95) ? 'khajiit' : 'ayleid';

  // ===== Oceania
  if (c === 'AU') {
    if (a === 'tasmania') return 'nordic';
    if (near(p, -31.95, 115.86, 480)) return 'altmer';                // Perth
    if (near(p, -34.93, 138.6, 340)) return 'breton';                 // Adelaide
    if (near(p, -37.81, 144.96, 340)) return 'imperial';              // Melbourne
    return 'ayleid';
  }
  if (c === 'NZ') return p.lng < 174.5 && p.lat < -40.3 ? 'breton' : p.lat < -43 ? 'breton' : 'imperial';
  if (c === 'AQ' || p.lat < -60) return 'nordic';
  if (any(c, ['PG', 'FJ', 'SB', 'VU', 'NC', 'WS', 'TO', 'KI', 'FM', 'MH', 'PW', 'NR', 'TV', 'GU', 'MP', 'PF', 'CK', 'NU', 'TL'])) return 'ayleid';

  // ===== anything left: the older layout
  return p.legacy;
}

/** The styles, in the order of their numbers in the grid (1 to 14; 0 is the sea), each with its colour on the map and the building style it renders in. */
export const STYLES: { id: StyleId; tint: string; name: string }[] = [
  { id: 'nordic', tint: '#8fa3b5', name: 'Nordic' },
  { id: 'breton', tint: '#7c5a8a', name: 'Breton' },
  { id: 'imperial', tint: '#a68a3c', name: 'Imperial' },
  { id: 'argonian', tint: '#2f6b55', name: 'Argonian' },
  { id: 'redguard', tint: '#d0873a', name: 'Redguard' },
  { id: 'khajiit', tint: '#e3bf4a', name: 'Khajiit' },
  { id: 'hlaalu', tint: '#c8ae8c', name: 'Hlaalu' },
  { id: 'telvanni', tint: '#3f86a6', name: 'Telvanni' },
  { id: 'redoran', tint: '#8c3f33', name: 'Redoran' },
  { id: 'velothi', tint: '#4d4a63', name: 'Velothi' },
  { id: 'bosmer', tint: '#4d8a3a', name: 'Bosmer' },
  { id: 'altmer', tint: '#efe3a0', name: 'Altmer' },
  { id: 'ayleid', tint: '#d44fa0', name: 'Fever Isles' },
  { id: 'orcish', tint: '#6e6558', name: 'Orcish' },
];
