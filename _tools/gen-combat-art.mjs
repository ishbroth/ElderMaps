// Paints the art for the combat game with the image model: a 4-pose sprite sheet per enemy and a first-person view per weapon, each on flat magenta so process-combat-art.mjs can cut them out.
//   node _tools/gen-combat-art.mjs [name ...]     names: enemy ids (wight), boss ids (dragon) or weapon ids (iron1h); none = everything missing
//   REDO=1 makes new ones.   Output: _data/combat/<name>.png     Needs GEMINI_API_KEY in .env.local
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '_data', 'combat');
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
if (!KEY) { console.log('no GEMINI_API_KEY in .env.local'); process.exit(1); }
const model = process.env.GEMINI_MODEL || 'gemini-3-pro-image';

const STYLE = 'Realistic high-fantasy video game render in the visual style of a modern open-world fantasy RPG: rich detailed textures, natural soft light from the upper left, painterly realism, no outline, no cartoon look, an original design.';
const SHEET = (what, poses) => `${STYLE} A game sprite sheet of ${what}. Four frames in a 2x2 grid, each frame in its own equal quadrant of a square image, on a perfectly flat solid magenta (#FF00FF) background with no floor, no shadow, no text, no border and no overlap between frames, the creature the same size in every frame, standing on the bottom of its quadrant. ${poses}`;
const WALK = 'Top-left: walking straight toward the camera, left foot forward. Top-right: walking straight toward the camera, right foot forward. Bottom-left: attacking, lunging forward at the camera with its weapon, claws or jaws swinging. Bottom-right: dead, collapsed on the ground.';
const FLY = 'Top-left: hovering and flying toward the camera, wings up. Top-right: hovering and flying toward the camera, wings down. Bottom-left: attacking, diving at the camera with its jaws open. Bottom-right: dead, fallen on the ground with its wings spread.';
const SHOOT = 'Top-left: advancing toward the camera, left foot forward, weapon held ready. Top-right: advancing toward the camera, right foot forward, weapon held ready. Bottom-left: attacking, drawing back and striking toward the camera. Bottom-right: dead, collapsed on the ground.';
const CAST = 'Top-left: advancing toward the camera, left foot forward, hands glowing. Top-right: advancing toward the camera, right foot forward, hands glowing. Bottom-left: attacking, casting a spell at the camera with both hands thrust forward. Bottom-right: dead, collapsed on the ground.';
const ROLL = 'Top-left: rolling and advancing toward the camera, one side forward. Top-right: rolling and advancing toward the camera, the other side forward. Bottom-left: attacking, lunging at the camera with its blades out. Bottom-right: destroyed, broken apart on the ground.';

const ENEMIES = {
  skeleton: SHEET('an animated skeleton warrior: bleached yellowed bones, a rusted iron helmet, a notched sword and a battered wooden shield, empty eye sockets with a faint blue glow', SHOOT),
  wight: SHEET('an undead barrow warrior of the north: a desiccated, grey-skinned corpse in ancient horned bone-and-iron armour with a rotted cloak, glowing pale blue eyes, an old axe', SHOOT),
  bandit: SHEET('a human bandit raider: a scruffy outlaw in patched leather and fur armour with a hood, a scarred face and a notched steel sword', SHOOT),
  banditmaned: SHEET('a feline humanoid cat-person bandit with tiger-striped fur and a mane, in ragged leather armour, with a curved dagger, snarling', SHOOT),
  banditscale: SHEET('a reptilian lizard-person bandit of the marshes with green scales and a crest, in reed-and-leather armour, with a bone-hafted spear, hissing', SHOOT),
  brassspider: SHEET('an ancient automaton spider made of tarnished brass and bronze: segmented metal legs, glowing amber core, gears showing, the size of a large dog', WALK),
  brasssphere: SHEET('an ancient automaton sphere made of tarnished brass: a rolling metal ball that unfolds into a bladed construct with spinning blades, glowing amber core', ROLL),
  marshcrab: SHEET('a giant marsh crab the size of a dog: a mottled brown-green shell, two big snapping claws, stalk eyes, wet muck on it', WALK),
  rathide: SHEET('(the background must be perfectly flat pure magenta #FF00FF everywhere, with no ground, no gradient and no shadow) a rathide: a huge dirty rat the size of a hound, matted grey-brown fur, a long scaly tail, big yellow chisel teeth, red beady eyes and pink clawed hands, hunched and snarling', WALK),
  troll: SHEET('a hulking cave troll: a hunched, long-armed brute with pale grey-white shaggy fur, a bony face with four tusks, heavy knuckles, a spiked club', WALK),
  sabretiger: SHEET('a huge sabre-toothed tiger: a massive striped cat with long curved fangs, powerful shoulders, snarling, the size of a horse', WALK),
  mammoth: SHEET('a woolly mammoth of the north: an enormous shaggy brown elephant with long curved tusks and a thick coat, with a giant club-wielding herder not shown, just the mammoth charging', WALK),
  giant: SHEET('a colossal giant of the tundra: a towering muscular humanoid with weathered tan skin, a fur loincloth, a huge tree-trunk club, tangled hair, mountain-sized', WALK),
  vampire: SHEET('a vampire noble: a gaunt pale figure with red eyes and fangs, long dark hair, an elegant dark red high-collared robe, claws, a faint red glow in the hands', CAST),
  sorcerer: SHEET('a hostile sorcerer: a robed mage in layered dark blue and black robes with a hood, a gnarled staff topped with a glowing crystal, crackling arcane energy in one hand', CAST),
  gjenganger: SHEET('a Gjenganger, the lord of an ancient barrow: a towering undead warrior-king in black horned iron armour with a tattered fur cloak, a skeletal grey face with burning blue eyes and a great two-handed war axe, much larger and grander than an ordinary barrow warrior', SHOOT),
  vampirelord: SHEET('a Vampire Lord: a towering ancient vampire noble with a gaunt, pale, fanged face and burning red eyes, long clawed hands, wearing ornate black-and-crimson armoured robes with a tall bladed collar and a long dark cloak, tattered bat-like wings folded behind, wreathed in a faint red mist, far more imposing than an ordinary vampire', CAST),
  colossus: SHEET('an ancient brass colossus: a giant bronze-and-brass automaton warrior, heavily armoured, with a glowing amber core in its chest, steam vents, one arm a huge hammer and the other a bladed spinning weapon, three storeys tall', WALK),
  dragon: SHEET('a great dragon: a huge winged reptile with horned head, scaled dark grey-bronze body, spined back, massive leathery wings and a jaw full of teeth, seen from the front, ancient and terrifying, drawn SMALLER in each frame so that the whole dragon including both wing tips and the tail sits fully inside its own quadrant with a wide empty magenta margin on every side (nothing touches or crosses the edge of a quadrant)', FLY),
};

// the dragon's other poses (made with the first dragon sheet as the reference, so it is the same dragon): the body, and the head close up
const SAME = 'It must be exactly the same dragon as in the reference picture: the same dark grey-bronze scales, the same horns, the same leathery wing membranes and bones.';
const DRAGON_BODY = SHEET('a great dragon (' + SAME + ') in four poses. Each pose is drawn SMALLER so that the whole dragon including both wing tips and the tail sits fully inside its own quadrant with a wide empty magenta margin on every side', 'Top-left: GLIDING toward the camera, seen from the front and slightly below, both wings spread FULLY OUT, STRAIGHT AND LEVEL to each side like a soaring eagle, perfectly symmetrical, head forward with the mouth closed, legs tucked, tail trailing behind. Top-right: EXACTLY the same pose and wings as top-left (wings spread fully out, straight and level, perfectly symmetrical) but the neck bent so the head points DOWN and forward with the jaws wide open, roaring, about to breathe fire downward. Bottom-left: the dragon turned about 70 degrees to the left, seen from the side and slightly in front, wings half raised, the long tail drawn far back to one side and curled, coiled ready to whip, head turned toward the camera. Bottom-right: the same sideways pose, the body twisted, the long tail whipping hard ACROSS and TOWARD the camera in a wide arc, tail tip large and near, wings swept back.');
const DRAGON_HEAD = SHEET('the HEAD and upper neck of a great dragon, close up (' + SAME + '), each head drawn at about 70% of its quadrant with a clear empty magenta margin on every side, the horns and the whole head fully inside the quadrant, with the neck going down and ending in a soft fade-out (not a hard straight cut) before the bottom edge', 'Top-left: the head seen straight from the front, looking at the camera, mouth CLOSED, menacing. Top-right: the head tilted about 25 degrees to one side, the mouth OPEN WIDE with every fang and the tongue showing, snarling, about to bite. Bottom-left: the head seen straight from the front with NO tilt, lowered a little, the mouth OPEN WIDE straight at the camera, a glowing throat, about to breathe fire. Bottom-right: the head tilted about 25 degrees to the OTHER side, the jaws snapping SHUT with the teeth interlocked, in the instant of the bite.');
const HANDS = (what) => `${STYLE} A first-person video game view of the player's gloved hands holding ${what}, seen from behind and slightly above, the weapon pointing away from the camera and up, centred, cropped at the forearms, on a perfectly flat solid magenta (#FF00FF) background with no floor and no shadow, no text.`;
const HAND1 = (what) => `${STYLE} A first-person video game view of the player's SINGLE right gloved hand and forearm holding ${what}, seen from behind and slightly above, the weapon pointing away from the camera and up, the arm coming up from the bottom right, only ONE hand and ONE arm in the picture, centred, cropped at the forearm, on a perfectly flat solid magenta (#FF00FF) background with no floor and no shadow, no text.`;
const WEAPONS = {
  iron1h: HAND1('a plain iron one-handed sword with a leather-wrapped grip'),
  steel1h: HAND1('a fine steel one-handed sword with a curved guard'),
  gilded1h: HAND1('a gilded golden elven one-handed sword with a curved, leaf-shaped blade'),
  night1h: HAND1('(ONE hand only, the left side of the picture empty) a black glass-like volcanic one-handed sword with a jagged green-black blade'),
  iron2h: HANDS('a heavy iron two-handed greatsword with a long plain blade'),
  steel2h: HANDS('a steel two-handed battleaxe with a broad double blade'),
  gilded2h: HANDS('a gilded golden two-handed warhammer with ornate engraving'),
  night2h: HANDS('a black glass-like two-handed greatsword with a jagged green-black blade'),
  hunterbow: HANDS('a simple wooden hunting bow with an arrow nocked, drawn back slightly'),
  longbow: HANDS('a long steel-reinforced longbow with an arrow nocked and drawn back'),
  gildedbow: HANDS('a gilded golden elven recurve bow with an arrow nocked and drawn back'),
  nightbow: HANDS('a black glass-like recurve bow with a green-black arrow nocked and drawn back'),
  shock: HANDS('an open hand crackling with blue-white lightning, fingers spread'),
  frost: HANDS('an open hand holding a swirl of pale blue ice shards and frost, fingers spread'),
  fire: HANDS('an open hand holding a ball of roaring orange flame, fingers spread'),
  drain: HANDS('an open hand with a stream of dark red-and-violet swirling energy, fingers spread'),
};

const PROMPTS = { ...ENEMIES, ...WEAPONS, dragonb: DRAGON_BODY, dragonh: DRAGON_HEAD };
const REFS = { dragonb: 'dragon', dragonh: 'dragon' };
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(PROMPTS);
for (const name of names) {
  const prompt = PROMPTS[name];
  if (!prompt) { console.log('unknown', name); continue; }
  const file = path.join(OUT, `${name}.png`);
  if (fs.existsSync(file) && !process.env.REDO) { console.log(name, 'done already'); continue; }
  const started = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [...(REFS[name] ? [{ inlineData: { mimeType: 'image/png', data: fs.readFileSync(path.join(OUT, REFS[name] + '.png')).toString('base64') } }, { text: 'The reference picture above shows the design of the dragon to draw.' }] : []), { text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } } }),
    });
    if (!res.ok) { console.log(name, 'failed', res.status, (await res.text()).slice(0, 160)); continue; }
    const body = await res.json();
    const part = (body.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data || p.inline_data?.data);
    const b64 = part?.inlineData?.data ?? part?.inline_data?.data;
    if (!b64) { console.log(name, 'no image'); continue; }
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log(name, 'made in', Math.round((Date.now() - started) / 1000), 's');
  } catch (e) { console.log(name, 'error', e.message); }
  await new Promise((r) => setTimeout(r, 2000));
}
