// What the image model is asked to do with a real photograph. The picture of a place is made FROM its own photograph: the same composition and the same structure, rebuilt in the
// style of the region (and, in a city, of the district). It is never replaced by a generic building. Names from the games may appear here (this text is never shown to anyone).

/** The look of each style kit: what things are built of, their shapes, the mood. Used by province (the countryside) and, later, by district (inside a city). */
export const KITS: Record<string, string> = {
  nordic: 'Nordic style: heavy stone footings and weathered dark timber, steep turf and shingle roofs, carved dragon-head gables, iron-bound doors, smoke from roof vents, fur banners, pine forests and snow, cold blue-grey light with warm firelight in windows.',
  imperial: 'Imperial style: pale stone and whitewash with dark timber framing, red clay-tile roofs, round arches and columns, wrought iron lamps, banners, tidy cobbled streets, a warm temperate light.',
  breton: 'Breton high-medieval style: grey stone keeps and towers with steep slate roofs, pointed arches, heraldic banners, mist over green hills.',
  redguard: 'Redguard desert style: sun-bleached white and sandstone domes and arches, flat roofs, striped awnings, palms, a hard bright sun and long shadows.',
  khajiit: 'Khajiit style: worn sandstone ornamented in layers eroded by time, stilted houses with pointed roofs on top of older ruins, moon motifs, silk awnings, savanna, canyon and jungle.',
  hlaalu: 'Morrowind Hlaalu style (like Balmora): low stepped blocks of pale plaster over stone, rounded wooden beam fronts, curved doors, plank walkways, warm creams and browns, lantern light.',
  redoran: 'Morrowind Redoran style (like Ald-ruhn and Gnisis): domed buildings of dark chitin-like shell and mudbrick, round doors, few windows, curved walls like a yurt, banded dark red-brown, built around a vast shell.',
  telvanni: 'Morrowind Telvanni style (like Sadrith Mora): huge living mushroom towers, bulbous and organic, spiral stairs, glowing fungus lights, grown rather than built, a wizard-tower feel.',
  velothi: 'Morrowind Vivec-canton style: massive stepped stone blocks the size of small towns, great arches, heavy dark stone with carved relief, domed courtyards on top, water in channels, incense smoke.',
  ashland: 'Dunmer ash-land style: ash-grey basalt strongholds and hide-and-bone yurts, volcanic rock, ash drifting in the wind, red glow on the horizon.',
  ayleid: 'Ayleid style: pale white-stone ruins with fluted columns, carved arches and glowing blue welkynd-stone lights, overgrown with ivy.',
  dwemer: 'Dwarven (Dwemer) style: verdigris-green bronze and brass machinery, gears and pipes, rectilinear halls, steam vents, brass-gold highlights.',
  barrow: 'Nordic barrow style: carved stone passages and doorways, dragon-claw motifs, burial alcoves, urns, cobwebs, cold blue light.',
  orcish: 'Orcish stronghold style: heavy stone and iron, tusk and hide longhouses, forges glowing orange, jagged palisades.',
  altmer: 'High-elf (Altmer) style: golden-white spired towers, flowing curved walls, crystal accents, ornate gardens, bright warm light.',
  bosmer: 'Wood-elf (Bosmer) style: buildings grown into living giant trees, rope bridges and platforms, leaf-carved details, dappled green light.',
  argonian: 'Argonian marsh style: stilt huts of reed, mud and wood over dark water, totems of wood and feathers, hanging moss, mist, drizzle, giant swamp trees.',
};

/** Which kit a province's countryside gets (a city's districts are given theirs separately). */
export const KIT_OF_PROVINCE: Record<string, string> = {
  skyrim: 'nordic', atmora: 'nordic', solstheim: 'nordic', highrock: 'breton', cyrodiil: 'imperial', hammerfell: 'redguard', elsweyr: 'khajiit',
  morrowind: 'ashland', summerset: 'altmer', valenwood: 'bosmer', blackmarsh: 'argonian', orsinium: 'orcish', shivering: 'ayleid',
};

/** The kit of an old ruin or a cave in each province's countryside: caves and ruins become ancient ruins of that land (Ayleid, barrow, Dwemer, ...). */
export const RUIN_KIT_OF_PROVINCE: Record<string, string> = {
  skyrim: 'barrow', atmora: 'barrow', solstheim: 'barrow', highrock: 'ayleid', cyrodiil: 'ayleid', summerset: 'ayleid', shivering: 'ayleid',
  morrowind: 'dwemer', hammerfell: 'khajiit', elsweyr: 'khajiit', valenwood: 'bosmer', blackmarsh: 'argonian', orsinium: 'dwemer',
};

/** The kit for a place: caves and ruins get their land's ancient-ruin kit, everything else its land's building kit. */
export const kitFor = (kind: string, province: string): string => (kind === 'cave' || kind === 'ruin' || NATURAL.has(kind) ? RUIN_KIT_OF_PROVINCE[province] : KIT_OF_PROVINCE[province]) ?? 'imperial';

/** Natural places: the landform stays the star. */
const NATURAL = new Set(['waterfall', 'peak', 'volcano', 'glacier', 'grove', 'spring', 'pass']);

/** What a natural place may be given besides its own nature: one touch of the ancient, chosen by the name (so a place is always dressed the same) and sized to the feature. */
const NATURAL_FLAVORS: Record<string, string[]> = {
  waterfall: ['an ancient carved altar on a rock ledge beside the falls, with a few worn steps leading to it', 'the remains of a ruined stone bridge or aqueduct arch spanning the gorge above the falls', 'a half-hidden doorway of carved stone behind the curtain of water, the entrance to something old', 'a small ruined shrine with a glowing lantern on the cliff'],
  peak: ['a ruined watchtower or ancient shrine on a ridge or the summit, tiny against the mountain', 'a line of worn ancient steps and a broken gate climbing the slope', 'the lost walls of a mountain city half swallowed by the rock and snow, small against the mountain', 'a stone-ringed altar on a high shoulder with a faint glow'],
  volcano: ['an altar of sacrifice on a rim ledge, with a thin line of stairs', 'the ruins of a temple half buried in ash on the slope', 'a stone gate and bridge of an old forge-city at the foot'],
  glacier: ['a stone-guarded entrance to an ancient fortress, with carved pillars standing out of the ice', 'frozen ruins and broken statues emerging from the ice', 'an ancient cairn and standing stones on the ice shelf'],
  grove: ['a ring of standing stones and an overgrown altar in a clearing', 'the ivy-covered ruins of a lost city among the trees, small against the forest', 'a witch\'s lair: a crooked hut of bones and branches with hanging charms and a faint green glow', 'a stone-guarded entrance to an ancient underground fortress between the roots of a great tree'],
  spring: ['ancient ruined baths and a carved basin around the water', 'a stone altar with offerings beside the pool'],
  pass: ['a ruined gatehouse and wall of an old fortress across the pass', 'weathered watchtower ruins on the heights above the road', 'a stone-guarded gate to an old underground fortress at the side of the pass'],
};
const flavorHash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Extra guidance by the kind of place. */
const KIND_HINT: Record<string, string> = {
  ruin: 'It is an old ruin: keep its exact layout and the shape of what is left standing, rebuilt as a weathered, broken and overgrown ancient ruin in the style of this land. If it is an earthwork, a monument or a ring of stones, keep exactly that shape so it still reads as the same monument, and only age and enchant it.',
  cave: 'It is a cave: keep the exact shape of the rock, the water and the mouth of the cave, and reimagine it as an ancient ruin of this land built into and out of the cave (carved doorways, stairs, pillars, glowing lights), the way a fantasy game would dress a famous cave.',
  waterfall: 'It is a waterfall: keep the shape of the falls and the rock around them, in a vivid fantasy-game landscape.',
  peak: 'It is a mountain: keep its exact silhouette and its ridges, in the dramatic painted style of a fantasy-game landscape.',
  volcano: 'It is a volcano: keep its exact shape, with a faint glow and drifting ash.',
  glacier: 'It is a glacier: keep its shape, with blue-white ice in a fantasy-game landscape.',
  grove: 'It is a wild park or forest: keep the lie of the land and the trees, rendered as an enchanted fantasy-game wilderness.',
  fort: 'It is a fort or castle: keep its exact outline, towers and walls, rebuilt in this style (weathered, with banners).',
  keep: 'It is a grand house or palace: keep its exact outline and proportions, rebuilt in this style.',
  tower: 'It is a tower: keep its exact height and outline, rebuilt in this style.',
  mill: 'It is a mill: keep its form, with sails or a water wheel, rebuilt in this style.',
  shrine: 'It is a place of worship: keep its form, rebuilt as an old shrine or temple in this style.',
  lighthouse: 'It is a lighthouse: keep its form, rebuilt as an old coastal beacon tower in this style.',
  stones: 'It is a circle or group of standing stones: keep their arrangement, with a faint magical glow.',
  spring: 'It is a spring or pool: keep its shape, with steam or clear water, in a fantasy-game landscape.',
  pass: 'It is a mountain pass: keep the lie of the land and the road, in a fantasy-game landscape.',
  crest: 'It is a large city: recreate the general shape of its skyline or its main street from the photograph, with every building completely reimagined in this style (rooftops, towers, walls, bridges), keeping the layout and the sense of scale.',
  town: 'It is a large town: recreate the general shape of its skyline or its main street from the photograph, with every building completely reimagined in this style, keeping the layout and the sense of scale.',
  village: 'It is a small town: keep the layout and the main buildings, rebuilt in this style.',
  landmark: 'It is a landmark building: keep its exact outline and proportions, rebuilt in this style.',
};

export function glimpsePrompt(name: string, kind: string, kit: string): string {
  const style = KITS[kit] ?? KITS.imperial;
  const hint = KIND_HINT[kind] ?? KIND_HINT.landmark;
  return [
    `Re-imagine this real photograph as a scene from a high-fantasy realm, in ${style}`,
    `This is "${name}". ${hint}`,
    NATURAL.has(kind) ? `This is a natural place, and the landform itself stays the star: keep its exact shape and most of the frame natural. Give it just ONE touch of the ancient, in the style above and sized to the feature (small against a mountain, larger beside a stream): ${NATURAL_FLAVORS[kind][flavorHash(name) % NATURAL_FLAVORS[kind].length]}. Never hide or replace the natural feature; do not add a town or modern buildings.` : '',
    'IMPORTANT: keep the exact composition, camera angle and framing of the photograph, and keep the overall shape, size, proportions and layout of the main building or landscape, so anyone who knows the place would still recognise it; only its materials, roofs, details and surroundings are rebuilt in the fantasy style. Do NOT replace it with a generic building.',
    'Remove anything modern: cars, wires, road signs, glass-and-steel, modern clothing, text and logos. No people in the foreground.',
    'Painterly, realistic fantasy-game art with rich textures and soft atmospheric light, and a few faint floating motes of light in the air. The image must fill the whole frame to its edges: no glowing border, no vignette, no frame, no edge effect. No text, no letters, no watermark.',
  ].filter(Boolean).join(' ');
}
