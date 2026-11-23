// The lore of a place: a few lines of made-up history and rumour for the "scene" that opens from a place's card (the twin of WastelandMaps' scenes). It is written in our own
// words, and nothing here may use names from the games. The same place always gets the same lines (picked by a hash of its name), and the land colours the voice.

import type { ProvinceId } from './lore';

interface Lines { first: string[]; second: string[] }

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = <T,>(list: T[], seed: number, shift = 0): T => list[(seed >>> shift) % list.length];

/** {n} is the place's name. */
const BY_KIND: Record<string, Lines> = {
  waterfall: { first: ['{n} falls white and loud over a lip of black rock, and the spray never quite settles.', 'Travellers hear {n} long before they see it, a low roar under the trees.', 'The water at {n} drops in three steps, each pool a different shade of green.'],
    second: ['Hunters say a stag with silver horns drinks here at dawn. No one has ever brought it home.', 'Behind the curtain of water there is a ledge, and on the ledge a bundle of old arrows.', 'Pilgrims leave a coin in the lowest pool and walk away without looking back.'] },
  cave: { first: ['The mouth of {n} is low and wet, and the cold that breathes out of it smells of old stone.', '{n} is a crack in the hillside that opens, a few steps in, into something much larger.', 'Bones of animals litter the floor at the mouth of {n}, and not all of them were carried in by wolves.'],
    second: ['A rope hangs from a ledge in the dark. Nobody remembers who tied it.', 'Scratches on the walls count something, row after row, and then stop.', 'Those who go in with a torch come out talking about the sound, not the sights.'] },
  ruin: { first: ['What is left of {n} is a ring of fallen walls and a doorway that leads nowhere.', 'Moss has taken most of {n}, but the arches still stand, and the stones are cut too well for any farmer.', '{n} was grand once. The roof is gone, the hearths are cold, and the wind keeps the only company.'],
    second: ['A scholar once spent a winter here drawing the carvings, and left in a hurry without his notes.', 'The locals say it is lucky to leave bread on the old threshold. The bread is always gone by morning.', 'Under the largest stone there is a cellar, and under the cellar, they say, another.'] },
  fort: { first: ['{n} sits on its rise with its walls half down, still watching the road it was built to guard.', 'The gate of {n} has gone, but the gatehouse remains, and the arrow slits still face the valley.', 'Soldiers held {n} against three winters. The fourth took it, and nobody can say who held it last.'],
    second: ['The well in the yard is still sweet, and still deep enough that a dropped stone is never heard to land.', 'Banners rotted long ago, but a single rusted standard leans in the great hall.', 'The captain\'s room has a map on the wall. The ink has faded, but the roads on it are the roads you walk now.'] },
  camp: { first: ['{n} is a ring of stones round old ashes, and the ashes are never quite cold.', 'Wanderers keep returning to {n}: a sheltered hollow, a spring, and a view of anyone coming.'],
    second: ['Someone carved a rough map on the flat rock beside the fire. It shows more than this valley.', 'A good place to rest, if you do not mind that the dogs will not enter it.'] },
  lighthouse: { first: ['The beacon of {n} burned every night for a hundred years, and then, one night, did not.', '{n} stands on its rock above the water, white and weathered, with a stair that winds like a snail\'s shell.'],
    second: ['The keeper\'s log ends mid-sentence. The last line is about a ship that was not on any list.', 'On clear nights the lamp still seems to turn, though no one has trimmed the wick in living memory.'] },
  volcano: { first: ['{n} smokes on the horizon, and the ground round it is warm underfoot and strange with colour.', 'The slopes of {n} are black ash and bright lichen, and the air tastes of coins.'],
    second: ['Pilgrims climb to the rim at dawn and drop an offering into the glow.', 'Nothing grows near the summit, but a single twisted tree stands halfway up, and it is always in leaf.'] },
  spring: { first: ['The water at {n} comes up warm and smelling of minerals, and steams in the cold.', '{n} bubbles out of the rock into a basin worn smooth by a thousand years of bathers.'],
    second: ['The old folk swear a soak here mends a broken heart, though not a broken bone.', 'A carved face over the spring looks pleased, or perhaps merely patient.'] },
  pass: { first: ['{n} is the one gap in the hills that is not a death trap in winter, and every traveller knows it.', 'The road through {n} is narrow and old, worn into the rock by more boots than anyone counted.'],
    second: ['A cairn at the top holds a stone for every crossing that went well. It is a big cairn.', 'Bandits have tried to hold the pass many times. The pass has outlasted every one of them.'] },
  glacier: { first: ['{n} grinds down its valley, blue in the cracks and white on top, groaning in the night.', 'The ice of {n} is older than any kingdom, and it keeps what falls into it.'],
    second: ['Things emerge from the ice at its foot, now and then: a spear shaft, a boot, once a whole frozen boat.', 'Herders will not graze their flocks within sight of it after dark.'] },
  grove: { first: ['The trees of {n} are older than the road and stand closer together than trees have any right to.', '{n} is a stand of great old trees where the light comes down green and the birds go quiet.'],
    second: ['A circle of stones lies in the middle, and the grass in the circle never grows tall.', 'The woodcutters leave it alone. They will not say why, only that it was agreed.'] },
  shrine: { first: ['{n} is a small, weathered place of prayer, kept swept by someone no one has ever seen.', 'Offerings crowd the stone at {n}: ribbons, coins, a lock of hair, a carved wooden bird.'],
    second: ['The inscription is worn, but the last word can still be read: "return".', 'Travellers say the place is quiet in a way that feels listened to.'] },
  peak: { first: ['{n} rises above its neighbours, a snow-streaked tooth against the sky.', 'The climb to the top of {n} is hard, and the view is worth every step of it.'],
    second: ['A hermit is said to live somewhere on the upper slope, though no one has seen smoke.', 'The summit has a flat stone with a hollow in it. The hollow is always full of clear water.'] },
  stones: { first: ['The stones of {n} stand in their ring as they have since before the first record.', '{n} is a cluster of tall, leaning stones, each marked with a pattern nobody has been able to read.'],
    second: ['At the right season the sun comes through a gap in the stones and lights one in the middle. Those who see it do not say what it means.', 'Compasses spin near the largest stone, and the sheep avoid it.'] },
  mill: { first: ['The wheel of {n} turns still, slow and patient, and the miller\'s door is always on the latch.', '{n} stands at the edge of the fields, its sails or its wheel quiet against the sky, grinding what the farms bring.'],
    second: ['The miller keeps a cat, a ledger and a long memory. Ask about any family in the district.', 'Flour from here is said to make the best bread in three valleys. Nobody has tested the claim.'] },
  keep: { first: ['{n} stands at the end of a long drive, grand and a little forlorn, its windows catching the sun.', 'The lords of {n} built it to be seen from the road, and to be remembered after they were gone.'],
    second: ['The cellars are bigger than the house above, and the servants of old never agreed on how many there were.', 'Behind the great stair hangs a portrait. The face has been scratched out, but the ring on the hand remains.'] },
  tower: { first: ['{n} stands alone on its hill, tall and narrow, with one lit window at the very top.', 'A watcher built {n} to see further than anyone else, and the habit seems to have stayed with the stones.'],
    second: ['The stair has more steps going up than coming down, so say the people who have climbed it.', 'A bell hangs in the top room. It rings on its own on the longest night.'] },
  landmark: { first: ['{n} is known to every traveller in these parts, and no two of them tell the same story about it.', 'People orient themselves by {n}: when you can see it, you know roughly where you are.'],
    second: ['A plaque near the base lists those who built it. The last name has been chiselled off.', 'Pigeons roost on it by the hundred and have never once been seen to leave together.'] },
  town: { first: ['{n} is a market town of good size, with a crowded square and an inn on every corner.', 'The roads of the district meet at {n}, so everything that moves through the country passes through its gates.'],
    second: ['The mayor is elected every year. The same family has held the office for eleven.', 'There is a bounty board by the well, and the best-paying notices are always at the bottom.'] },
  village: { first: ['{n} is a handful of farmhouses round a green, with a mill on the stream and a smithy by the road.', 'Smoke rises from every chimney of {n} at dusk, and the dogs announce every stranger.'],
    second: ['The harvest feast is the great event of the year, and visitors are welcome if they bring a dish.', 'The old well in the middle of the green has been dry for a century, but no one will fill it in.'] },
  keepCity: { first: ['{n} is the seat of the district, a stout keep above a crowded town.', 'Over {n} flies the banner of the lord, and under it the day\'s business never ends.'], second: ['Anyone may petition the lord on market day, if they can bear the queue.', 'The dungeons are said to be empty. The jailers say that too, and quickly.'] },
  crest: { first: ['{n} is one of the great cities of the realm, a place of crowded streets, towering halls and endless business.', 'Roads from every direction lead to {n}, and everyone who has ever left it has promised to return.'],
    second: ['Guilds fill the streets with their banners, and rumour travels faster than the horses.', 'Under the old quarter run tunnels older than the walls, and most of the city pretends they are not there.'] },
};

const VOICE: Record<ProvinceId, string[]> = {
  skyrim: ['The cold here is honest, and so are the people.', 'Snow comes early and leaves late, and the old songs say it always will.'],
  highrock: ['Mist hangs on the keeps, and every house keeps a coat of arms.', 'Knights and scholars argue here with equal conviction.'],
  hammerfell: ['The sun is a hammer here, and shade is wealth.', 'Sword-masters walk the streets as other places have scribes.'],
  orsinium: ['The stone here is dark and the people are darker in temper, but their word holds.', 'Forge-smoke stains the sky and the smiths wear it with pride.'],
  elsweyr: ['Moonlight and dust, caravans and quiet bargains.', 'The market runs till the moons set, and the best prices go to the patient.'],
  valenwood: ['The canopy muffles everything, and the forest remembers every footstep.', 'Rope bridges and quiet laughter, and a rule against cutting what you have not planted.'],
  morrowind: ['Ash drifts down like grey snow, and old houses keep older grudges.', 'The land smokes and mutters, and the people have learned to read its moods.'],
  summerset: ['Spires of pale crystal catch the light, and everyone is exquisitely polite.', 'Gardens here are older than most nations, and tended as such.'],
  shivering: ['Nothing here is quite as it was a moment ago, and the locals have stopped noticing.', 'The sky has opinions in this country.'],
  cyrodiil: ['The roads are good, the laws are written, and everything leads back to the centre.', 'Marble and brick, banners and bureaucracy.'],
  blackmarsh: ['The water is the road here, and the road is full of eyes.', 'Mist in the morning, rain at noon, and the hist trees humming through the night.'],
  solstheim: ['An island of ash and ice, where two seasons share one shore.', 'Wind-scoured and proud, a land of people who stayed when they could have left.'],
  atmora: ['The oldest cold in the world, and a silence that remembers.', 'Nothing lives here that has not made peace with the ice.'],
};

/** The lore of a place: [what it is, what is whispered about it, a line about the land]. */
export function sceneFor(name: string, kind: string, province: ProvinceId): string[] {
  const lines = BY_KIND[kind] ?? BY_KIND.landmark;
  const h = hash(name + kind);
  return [pick(lines.first, h).split('{n}').join(name), pick(lines.second, h, 7), pick(VOICE[province] ?? VOICE.cyrodiil, h, 13)];
}

/** What a glimpse of a place costs, in septims: a big city (crest or town) 400, anywhere else 100. */
export const glimpseCost = (kind: string): number => (kind === 'crest' || kind === 'town' ? 400 : 100);

/** Whether a place has a Town Legend to buy (a city mark). */
export const hasTownLegend = (kind: string): boolean => kind === 'crest' || kind === 'town';
