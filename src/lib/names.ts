// A random name for a new character: a first name from the old north, the sunlit south, the marble cities or the elf-lands, then a surname that sounds like a deed or a place. Made up here; none of it is anyone's trademark.

const FIRST = [
  'Hrolf', 'Brynja', 'Eirik', 'Sigrun', 'Torvald', 'Aslaug', 'Ragnar', 'Helga', 'Ulfric', 'Freydis', 'Bjorn', 'Ingrid',
  'Ahmir', 'Zahra', 'Rashid', 'Safiya', 'Tariq', 'Layla', 'Jaffar', 'Nadira',
  'Marcus', 'Livia', 'Cassian', 'Octavia', 'Lucan', 'Valeria', 'Aurelio', 'Sabina',
  'Aelindra', 'Thalion', 'Mirelle', 'Faelar', 'Isilme', 'Caladrel', 'Elowen', 'Soren',
  'Grosh', 'Durza', 'Mogra', 'Thokk', 'Ushnar', 'Borka',
  'Vexa', 'Sethis', 'Ishka', 'Zarra', 'Khalo', 'Rasha',
];
const SURNAME = [
  'Stonefist', 'Ashwalker', 'Greycloak', 'Ironbrow', 'Wolfsbane', 'Dawnbringer', 'Marshwarden', 'Frostmantle', 'Emberhand', 'Oakenshield',
  'of the Pale Road', 'Hollowmere', 'Thornwick', 'Redwater', 'Stormcaller', 'Candlewick', 'Highcrag', 'Dunmoor', 'Silverbrook', 'the Wanderer',
  'Blackbriar', 'Longstride', 'Skyreach', 'Ravenmoor', 'Goldleaf', 'Bonecarver',
];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** A new name of at most twenty letters (the most the account allows). */
export function randomCharacterName(): string {
  for (let i = 0; i < 20; i++) {
    const n = `${pick(FIRST)} ${pick(SURNAME)}`;
    if (n.length <= 20) return n;
  }
  return pick(FIRST);
}
