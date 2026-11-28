// Checks the style map against the places the user named: each line is a place, where it is, and the style it should have. Prints the ones that come out different.
//   npx tsx _tools/check-styles.mts
import fs from 'node:fs';
import sharp from 'sharp';
import { STYLES } from '../src/lib/styleRules.ts';

const cities = JSON.parse(fs.readFileSync('public/data/cities.json', 'utf8')) as [string, number, number, number, string, string][];
const cityStyles = JSON.parse(fs.readFileSync('public/data/city-styles.json', 'utf8')) as Record<string, number>;
const { data, info } = await sharp('public/data/style-grid.png').raw().toBuffer({ resolveWithObject: true });
const grid = (lat: number, lng: number): number => {
  const r0 = Math.min(899, Math.max(0, Math.floor((90 - lat) / 0.2))), c0 = Math.min(1799, Math.max(0, Math.floor((lng + 180) / 0.2)));
  for (let d = 0; d < 12; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) { if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue; const rr = r0 + dr, cc = c0 + dc; if (rr >= 0 && rr < 900 && cc >= 0 && cc < 1800) { const v = data[(rr * info.width + cc) * info.channels]; if (v) return v; } }
  return 0;
};
const ID = (n: number) => (n ? STYLES[n - 1].id : 'sea');

// [name, iso2 or '' , lat, lng, expected]   (lat/lng are used when the place is not a shield or town)
const EXPECT: [string, string, number, number, string][] = [
  // Breton
  ['London', 'GB', 51.5, -0.12, 'breton'], ['Dublin', 'IE', 53.35, -6.26, 'breton'], ['Paris', 'FR', 48.85, 2.35, 'breton'], ['Lille', 'FR', 50.63, 3.06, 'breton'], ['Bilbao', 'ES', 43.26, -2.93, 'breton'],
  ['Brussels', 'BE', 50.85, 4.35, 'breton'], ['Amsterdam', 'NL', 52.37, 4.9, 'breton'], ['Hamburg', 'DE', 53.55, 10, 'breton'], ['Prague', 'CZ', 50.08, 14.43, 'breton'], ['Bratislava', 'SK', 48.15, 17.1, 'breton'],
  ['Belgrade', 'RS', 44.8, 20.46, 'breton'], ['Sofia', 'BG', 42.7, 23.32, 'breton'], ['Bucharest', 'RO', 44.43, 26.1, 'breton'], ['Minsk', 'BY', 53.9, 27.56, 'breton'], ['Lviv', 'UA', 49.84, 24.03, 'breton'],
  ['Boston', 'US', 42.36, -71.06, 'breton'], ['Burlington', 'US', 44.48, -73.21, 'breton'], ['Providence', 'US', 41.82, -71.41, 'breton'], ['Portland', 'US', 43.66, -70.26, 'breton'], ['Manchester', 'US', 42.99, -71.46, 'breton'],
  ['Montréal', 'CA', 45.5, -73.57, 'breton'], ['Québec', 'CA', 46.81, -71.21, 'breton'], ['Sudbury', 'CA', 46.5, -81, 'breton'], ['Regina', 'CA', 50.45, -104.62, 'breton'], ['Saskatoon', 'CA', 52.13, -106.67, 'breton'],
  ['Charleston', 'US', 38.35, -81.63, 'breton'], ['Lexington', 'US', 38.04, -84.5, 'breton'], ['Knoxville', 'US', 35.96, -83.92, 'breton'], ['Asheville', 'US', 35.6, -82.55, 'breton'], ['Greenville', 'US', 34.85, -82.4, 'breton'],
  ['Little Rock', 'US', 34.75, -92.29, 'breton'], ['St. Louis', 'US', 38.63, -90.2, 'breton'], ['Kansas City', 'US', 39.1, -94.58, 'breton'], ['Des Moines', 'US', 41.59, -93.62, 'breton'], ['Omaha', 'US', 41.26, -95.93, 'breton'],
  ['Wichita', 'US', 37.69, -97.34, 'breton'], ['Cheyenne', 'US', 41.14, -104.82, 'breton'], ['Boise', 'US', 43.62, -116.2, 'breton'], ['Portland', 'US', 45.52, -122.68, 'breton'], ['Spokane', 'US', 47.66, -117.43, 'breton'],
  ['Montevideo', 'UY', -34.9, -56.16, 'breton'], ['Bariloche', 'AR', -41.13, -71.31, 'breton'], ['Adelaide', 'AU', -34.93, 138.6, 'breton'], ['Christchurch', 'NZ', -43.53, 172.63, 'breton'], ['Cayenne', 'GF', 4.94, -52.33, 'breton'],
  // Nordic
  ['Stockholm', 'SE', 59.33, 18.07, 'nordic'], ['Oslo', 'NO', 59.91, 10.75, 'nordic'], ['Copenhagen', 'DK', 55.68, 12.57, 'nordic'], ['Reykjavik', 'IS', 64.15, -21.94, 'nordic'], ['Helsinki', 'FI', 60.17, 24.94, 'nordic'],
  ['Riga', 'LV', 56.95, 24.1, 'nordic'], ['Vilnius', 'LT', 54.69, 25.28, 'nordic'], ['Tallinn', 'EE', 59.44, 24.75, 'nordic'], ['Nuuk', 'GL', 64.18, -51.72, 'nordic'], ['Minneapolis', 'US', 44.98, -93.27, 'nordic'],
  ['Fargo', 'US', 46.88, -96.79, 'nordic'], ['Sioux Falls', 'US', 43.55, -96.7, 'nordic'], ['Billings', 'US', 45.78, -108.5, 'nordic'], ['Marquette', 'US', 46.54, -87.4, 'nordic'], ['Milwaukee', 'US', 43.04, -87.91, 'nordic'],
  ['Winnipeg', 'CA', 49.9, -97.14, 'nordic'], ['Thunder Bay', 'CA', 48.38, -89.25, 'nordic'], ['Halifax', 'CA', 44.65, -63.58, 'nordic'], ["St. John's", 'CA', 47.56, -52.71, 'nordic'], ['Charlottetown', 'CA', 46.24, -63.13, 'nordic'],
  ['Stanley', 'FK', -51.7, -57.85, 'nordic'], ['Hobart', 'AU', -42.88, 147.33, 'nordic'],
  // Imperial
  ['Madrid', 'ES', 40.42, -3.7, 'imperial'], ['Porto', 'PT', 41.15, -8.61, 'imperial'], ['Lisbon', 'PT', 38.72, -9.14, 'imperial'], ['Marseille', 'FR', 43.3, 5.37, 'imperial'], ['Lyon', 'FR', 45.76, 4.84, 'imperial'],
  ['Zürich', 'CH', 47.37, 8.54, 'imperial'], ['Milan', 'IT', 45.46, 9.19, 'imperial'], ['Rome', 'IT', 41.9, 12.5, 'imperial'], ['Athens', 'GR', 37.98, 23.73, 'imperial'], ['İzmir', 'TR', 38.42, 27.14, 'imperial'],
  ['Istanbul', 'TR', 41.01, 28.98, 'imperial'], ['Tirana', 'AL', 41.33, 19.82, 'imperial'], ['Odesa', 'UA', 46.48, 30.73, 'imperial'], ['Tel Aviv', 'IL', 32.08, 34.78, 'imperial'],
  ['New York City', 'US', 40.71, -74, 'imperial'], ['Hartford', 'US', 41.76, -72.67, 'imperial'], ['Philadelphia', 'US', 39.95, -75.17, 'imperial'], ['Baltimore', 'US', 39.29, -76.61, 'imperial'], ['Washington', 'US', 38.9, -77.04, 'imperial'],
  ['Richmond', 'US', 37.54, -77.44, 'imperial'], ['Charleston', 'US', 32.78, -79.93, 'imperial'], ['Savannah', 'US', 32.08, -81.09, 'imperial'], ['Columbus', 'US', 39.96, -83, 'imperial'], ['Indianapolis', 'US', 39.77, -86.16, 'imperial'],
  ['Detroit', 'US', 42.33, -83.05, 'imperial'], ['Toronto', 'CA', 43.65, -79.38, 'imperial'], ['Denver', 'US', 39.74, -104.99, 'imperial'], ['Salt Lake City', 'US', 40.76, -111.89, 'imperial'], ['Reno', 'US', 39.53, -119.81, 'imperial'],
  ['Sacramento', 'US', 38.58, -121.49, 'imperial'], ['San Francisco', 'US', 37.77, -122.42, 'imperial'], ['Fresno', 'US', 36.74, -119.79, 'imperial'], ['Bakersfield', 'US', 35.37, -119.02, 'imperial'], ['Calgary', 'CA', 51.05, -114.07, 'imperial'],
  ['Edmonton', 'CA', 53.55, -113.49, 'imperial'], ['Oklahoma City', 'US', 35.47, -97.52, 'imperial'], ['Dallas', 'US', 32.78, -96.8, 'imperial'], ['Austin', 'US', 30.27, -97.74, 'imperial'], ['Mexico City', 'MX', 19.43, -99.13, 'imperial'],
  ['Hong Kong', 'HK', 22.32, 114.17, 'imperial'], ['São Paulo', 'BR', -23.55, -46.63, 'imperial'], ['Curitiba', 'BR', -25.43, -49.27, 'imperial'], ['Porto Alegre', 'BR', -30.03, -51.23, 'imperial'], ['Buenos Aires', 'AR', -34.6, -58.38, 'imperial'],
  ['Santiago', 'CL', -33.45, -70.67, 'imperial'], ['Melbourne', 'AU', -37.81, 144.96, 'imperial'], ['Cape Town', 'ZA', -33.92, 18.42, 'imperial'], ['Johannesburg', 'ZA', -26.2, 28.05, 'imperial'], ['Walvis Bay', 'NA', -22.96, 14.5, 'imperial'],
  ['Auckland', 'NZ', -36.85, 174.76, 'imperial'], ['Wellington', 'NZ', -41.29, 174.78, 'imperial'],
  // Argonian
  ['Rio de Janeiro', 'BR', -22.9, -43.17, 'argonian'], ['Brasília', 'BR', -15.78, -47.93, 'argonian'], ['Manaus', 'BR', -3.12, -60.02, 'argonian'], ['Asunción', 'PY', -25.26, -57.58, 'argonian'], ['La Paz', 'BO', -16.5, -68.15, 'argonian'],
  ['Havana', 'CU', 23.11, -82.37, 'argonian'], ['Nassau', 'BS', 25.05, -77.35, 'argonian'], ['Santo Domingo', 'DO', 18.49, -69.93, 'argonian'], ['Panama City', 'PA', 8.98, -79.52, 'argonian'], ['Managua', 'NI', 12.13, -86.25, 'argonian'],
  ['Tegucigalpa', 'HN', 14.07, -87.19, 'argonian'], ['Belize City', 'BZ', 17.5, -88.2, 'argonian'], ['Mérida', 'MX', 20.97, -89.62, 'argonian'], ['Cancún', 'MX', 21.16, -86.85, 'argonian'], ['Veracruz', 'MX', 19.2, -96.13, 'argonian'],
  ['Houston', 'US', 29.76, -95.37, 'argonian'], ['New Orleans', 'US', 29.95, -90.07, 'argonian'], ['Miami', 'US', 25.77, -80.19, 'argonian'], ['Orlando', 'US', 28.54, -81.38, 'argonian'], ['Tampa', 'US', 27.95, -82.46, 'argonian'],
  ['Jacksonville', 'US', 30.33, -81.66, 'argonian'], ['Luanda', 'AO', -8.84, 13.23, 'argonian'], ['Kinshasa', 'CD', -4.32, 15.31, 'argonian'], ['Douala', 'CM', 4.05, 9.7, 'argonian'], ['Bangkok', 'TH', 13.75, 100.5, 'argonian'],
  ['Vientiane', 'LA', 17.97, 102.6, 'argonian'], ['Port of Spain', 'TT', 10.66, -61.51, 'argonian'], ['Bridgetown', 'BB', 13.1, -59.61, 'argonian'], ['Baton Rouge', 'US', 30.45, -91.19, 'argonian'], ['Corpus Christi', 'US', 27.8, -97.4, 'argonian'],
  // Redguard
  ['Cairo', 'EG', 30.04, 31.24, 'redguard'], ['Alexandria', 'EG', 31.2, 29.92, 'redguard'], ['Tunis', 'TN', 36.8, 10.18, 'redguard'], ['Casablanca', 'MA', 33.57, -7.59, 'redguard'], ['Seville', 'ES', 37.39, -5.98, 'redguard'],
  ['Málaga', 'ES', 36.72, -4.42, 'redguard'], ['Riyadh', 'SA', 24.71, 46.68, 'redguard'], ["Sana'a", 'YE', 15.37, 44.19, 'redguard'], ['Muscat', 'OM', 23.59, 58.41, 'redguard'], ['Tehran', 'IR', 35.69, 51.39, 'redguard'],
  ['Monterrey', 'MX', 25.69, -100.32, 'redguard'], ['Guadalajara', 'MX', 20.66, -103.35, 'redguard'], ['Chihuahua', 'MX', 28.64, -106.09, 'redguard'], ['Albuquerque', 'US', 35.08, -106.65, 'redguard'], ['Tucson', 'US', 32.22, -110.97, 'redguard'],
  ['San Antonio', 'US', 29.42, -98.49, 'redguard'], ['Ulaanbaatar', 'MN', 47.89, 106.91, 'redguard'], ['Ürümqi', 'CN', 43.83, 87.62, 'redguard'], ['Algiers', 'DZ', 36.75, 3.06, 'redguard'],
  // Khajiit
  ['Karachi', 'PK', 24.86, 67.01, 'khajiit'], ['Delhi', 'IN', 28.61, 77.21, 'khajiit'], ['Mumbai', 'IN', 19.08, 72.88, 'khajiit'], ['Dhaka', 'BD', 23.81, 90.41, 'khajiit'], ['Colombo', 'LK', 6.93, 79.86, 'khajiit'],
  ['Thimphu', 'BT', 27.47, 89.64, 'khajiit'], ['Malé', 'MV', 4.18, 73.51, 'khajiit'], ['Port Louis', 'MU', -20.16, 57.5, 'khajiit'], ['Antananarivo', 'MG', -18.88, 47.51, 'khajiit'], ['Victoria', 'SC', -4.62, 55.45, 'khajiit'],
  ['Medan', 'ID', 3.59, 98.67, 'khajiit'], ['Palembang', 'ID', -2.98, 104.76, 'khajiit'], ['San Juan', 'PR', 18.47, -66.1, 'khajiit'],
  // Hlaalu
  ['Diyarbakır', 'TR', 37.91, 40.24, 'hlaalu'], ['Kayseri', 'TR', 38.73, 35.48, 'hlaalu'], ['Tabriz', 'IR', 38.08, 46.29, 'hlaalu'], ['Ashgabat', 'TM', 37.96, 58.33, 'hlaalu'], ['Tashkent', 'UZ', 41.3, 69.24, 'hlaalu'],
  ['Bishkek', 'KG', 42.87, 74.59, 'hlaalu'], ['Dushanbe', 'TJ', 38.56, 68.77, 'hlaalu'], ['Damascus', 'SY', 33.51, 36.28, 'hlaalu'], ['Beirut', 'LB', 33.89, 35.5, 'hlaalu'], ['Baghdad', 'IQ', 33.31, 44.36, 'hlaalu'],
  ['Tijuana', 'MX', 32.51, -117.04, 'hlaalu'], ['Mexicali', 'MX', 32.66, -115.47, 'hlaalu'], ['Phoenix', 'US', 33.45, -112.07, 'hlaalu'], ['St. George', 'US', 37.1, -113.58, 'hlaalu'], ['El Paso', 'US', 31.76, -106.49, 'hlaalu'],
  ['Aden', 'YE', 12.78, 45.04, 'hlaalu'], ['Mogadishu', 'SO', 2.05, 45.32, 'hlaalu'], ['San Diego', 'US', 32.72, -117.16, 'hlaalu'],
  // Telvanni
  ['Kharkiv', 'UA', 49.99, 36.23, 'telvanni'], ['Donetsk', 'UA', 48, 37.8, 'telvanni'], ['Moscow', 'RU', 55.75, 37.62, 'telvanni'], ['Saint Petersburg', 'RU', 59.93, 30.34, 'telvanni'], ['Novosibirsk', 'RU', 55.03, 82.92, 'telvanni'],
  ['Yakutsk', 'RU', 62.03, 129.73, 'telvanni'], ['Seattle', 'US', 47.61, -122.33, 'telvanni'], ['Vancouver', 'CA', 49.28, -123.12, 'telvanni'], ['Astana', 'KZ', 51.17, 71.43, 'telvanni'], ['Fairbanks', 'US', 64.84, -147.72, 'telvanni'],
  // Redoran
  ['Tbilisi', 'GE', 41.72, 44.79, 'redoran'], ['Yerevan', 'AM', 40.18, 44.51, 'redoran'], ['Baku', 'AZ', 40.41, 49.87, 'redoran'], ['Kabul', 'AF', 34.53, 69.17, 'redoran'], ['Kathmandu', 'NP', 27.72, 85.32, 'redoran'],
  ['Lhasa', 'CN', 29.65, 91.1, 'redoran'], ['Srinagar', 'IN', 34.08, 74.8, 'redoran'], ['Islamabad', 'PK', 33.68, 73.05, 'redoran'], ['Bamako', 'ML', 12.64, -8, 'redoran'], ['Khartoum', 'SD', 15.5, 32.56, 'redoran'],
  ['Santa Fe', 'US', 35.69, -105.94, 'redoran'], ['Amarillo', 'US', 35.22, -101.83, 'redoran'], ['Pyongyang', 'KP', 39.04, 125.76, 'redoran'], ['Almaty', 'KZ', 43.24, 76.89, 'redoran'], ['Grozny', 'RU', 43.32, 45.69, 'redoran'],
  // Velothi
  ['Beijing', 'CN', 39.9, 116.4, 'velothi'], ['Shenyang', 'CN', 41.8, 123.43, 'velothi'], ['Harbin', 'CN', 45.8, 126.53, 'velothi'], ['Sapporo', 'JP', 43.06, 141.35, 'velothi'], ['Vladivostok', 'RU', 43.12, 131.89, 'velothi'],
  ['Petropavlovsk-Kamchatsky', 'RU', 53.04, 158.65, 'velothi'], ['Los Angeles', 'US', 34.05, -118.24, 'velothi'], ['Las Vegas', 'US', 36.17, -115.14, 'velothi'],
  // Bosmer
  ['Shanghai', 'CN', 31.23, 121.47, 'bosmer'], ['Guangzhou', 'CN', 23.13, 113.26, 'bosmer'], ['Hanoi', 'VN', 21.03, 105.85, 'bosmer'], ['Ho Chi Minh City', 'VN', 10.82, 106.63, 'bosmer'], ['Kuala Lumpur', 'MY', 3.14, 101.69, 'bosmer'],
  ['San Jose', 'US', 37.34, -121.89, 'bosmer'], ['Lima', 'PE', -12.05, -77.04, 'bosmer'], ['Medellín', 'CO', 6.24, -75.58, 'bosmer'], ['Cali', 'CO', 3.45, -76.53, 'bosmer'], ['Bogotá', 'CO', 4.71, -74.07, 'bosmer'],
  // Altmer
  ['Tokyo', 'JP', 35.69, 139.69, 'altmer'], ['Osaka', 'JP', 34.69, 135.5, 'altmer'], ['Seoul', 'KR', 37.57, 126.98, 'altmer'], ['Honolulu', 'US', 21.31, -157.86, 'altmer'], ['Taipei', 'TW', 25.03, 121.57, 'altmer'],
  ['Manila', 'PH', 14.6, 120.98, 'altmer'], ['Perth', 'AU', -31.95, 115.86, 'altmer'],
  // Fever Isles
  ['Sydney', 'AU', -33.87, 151.21, 'ayleid'], ['Brisbane', 'AU', -27.47, 153.03, 'ayleid'], ['Jakarta', 'ID', -6.21, 106.85, 'ayleid'], ['Singapore', 'SG', 1.35, 103.82, 'ayleid'], ['Port Moresby', 'PG', -9.44, 147.18, 'ayleid'],
  ['Suva', 'FJ', -18.14, 178.44, 'ayleid'], ['Anchorage', 'US', 61.22, -149.9, 'ayleid'], ['Punta Arenas', 'CL', -53.16, -70.91, 'ayleid'], ['Ushuaia', 'AR', -54.8, -68.3, 'ayleid'],
  // Orcish (Tuskholds)
  ['Lagos', 'NG', 6.52, 3.38, 'orcish'], ['Nairobi', 'KE', -1.29, 36.82, 'orcish'], ['Kingston', 'JM', 18, -76.79, 'orcish'], ['Port-au-Prince', 'HT', 18.54, -72.34, 'orcish'], ['Georgetown', 'GY', 6.8, -58.16, 'orcish'],
  ['Paramaribo', 'SR', 5.85, -55.2, 'orcish'], ['Salvador', 'BR', -12.97, -38.5, 'orcish'], ['Belém', 'BR', -1.46, -48.5, 'orcish'], ['São Luís', 'BR', -2.53, -44.3, 'orcish'], ['Biloxi', 'US', 30.4, -88.89, 'orcish'],
  ['Mobile', 'US', 30.69, -88.04, 'orcish'], ['Montgomery', 'US', 32.37, -86.3, 'orcish'], ['Jackson', 'US', 32.3, -90.18, 'orcish'], ['Memphis', 'US', 35.15, -90.05, 'orcish'], ['Atlanta', 'US', 33.75, -84.39, 'orcish'],
  ['Birmingham', 'US', 33.52, -86.8, 'orcish'], ['Macon', 'US', 32.84, -83.63, 'orcish'], ['Pensacola', 'US', 30.42, -87.22, 'orcish'], ['Panama City', 'US', 30.16, -85.66, 'orcish'], ['Addis Ababa', 'ET', 9.03, 38.74, 'orcish'],
];
let bad = 0;
for (const [name, iso2, lat, lng, want] of EXPECT) {
  const hit = cities.find((c) => c[0] === name && c[5] === iso2 && c[4] !== 'village' && Math.abs(c[1] - lat) < 2.5) ?? cities.find((c) => c[0] === name && Math.abs(c[1] - lat) < 1 && Math.abs(c[2] - lng) < 1 && c[4] !== 'village');
  const got = hit ? ID(cityStyles[`c:${hit[0]}:${hit[1]}`]) : ID(grid(lat, lng));
  if (got !== want) { bad++; console.log(`WRONG  ${name} (${iso2}): got ${got}, wanted ${want}${hit ? '' : '  [not a shield: grid]'}`); }
}
console.log(`${EXPECT.length - bad} of ${EXPECT.length} as asked`);
