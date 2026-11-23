// Paints the character portraits with the image model (once; they ship with the app): one head-and-shoulders painting per character type, saved as public/portraits/<id>.jpg.
// Needs GEMINI_API_KEY in .env.local. Raw results are kept in _data/portraits (not committed) so a picture can be redone without paying again for the others.
//   node _tools/make-portraits.mjs                (every type that has no picture yet)
//   node _tools/make-portraits.mjs maned tuskborn (just these; made again even if they exist)

import fs from 'node:fs';
import sharp from 'sharp';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const KEY = env.GEMINI_API_KEY;
if (!KEY) { console.log('no GEMINI_API_KEY in .env.local'); process.exit(1); }
const MODEL = env.GEMINI_MODEL || 'gemini-3-pro-image';

const STYLE = 'A painterly, realistic fantasy-game character portrait: head and shoulders, three-quarter view, centred, dramatic soft lighting, rich detail, a moody blurred background that suggests the homeland. '
  + 'Vertical 4:5 frame. An original character design: it must not depict or imitate any existing named character or any specific video-game artwork. No text, no letters, no logo, no watermark, no frame.';

const TYPES = {
  frostkin: 'A weathered, broad-shouldered northern clan warrior, human, long braided fair hair and a trimmed beard, blue war paint across the eyes, a fur-lined cloak over riveted mail, snow and dark pines behind.',
  highmarcher: 'A noble human knight-mage of a misty kingdom, auburn hair, calm sharp eyes, a velvet surcoat bearing an invented heraldic device over fine plate, grey castle walls and fog behind.',
  sunblade: 'A dark-skinned human desert swordmaster, short black hair, a white-and-gold linen wrap and head scarf, the hilt of a curved sabre at the shoulder, sun-baked sandstone arches behind.',
  maned: 'A feline humanoid cat-person with tawny fur striped like a tiger, a thick mane, amber eyes and pointed ears, wearing silk and supple leather with small gold charms, a lantern-lit desert bazaar behind. Clearly a cat-folk face, dignified and clever.',
  scalekin: 'A reptilian lizard-person of the swamps, green-brown scales with a darker crest, yellow slit-pupil eyes, a long snout, reed-and-bone ornaments and a woven collar, misty mangrove marsh behind. Dignified and strange.',
  emberkin: 'A slender elf with ash-grey skin, glowing red eyes, sharp angular features and white swept-back hair, wearing dark segmented shell-like armour with red trim, a drifting ash storm and a smoking volcano behind.',
  gilded: 'A tall, golden-skinned high elf with long pointed ears, high cheekbones and pale amber eyes, wearing ornate gilded armour and a pale silk cape, crystal spires and sunlit gardens behind.',
  greenkin: 'A lithe forest elf with tan skin, leaf-brown face paint, pointed ears and sharp green eyes, a hooded cloak of leaves and bark-brown leather, a bow strap across the chest, a dense canopy of giant trees behind.',
  tuskborn: 'A powerful green-skinned orc with prominent lower tusks, a scarred brow and a braided topknot, wearing heavy dark iron armour trimmed with fur, a glowing forge and a basalt fortress behind. Fierce but noble.',
  aurelian: 'An imperial human of the marble cities, olive skin, short dark hair, a thin gold laurel, wearing red-and-gold ornate legionary armour with a heavy red cloak, white marble columns and a busy city behind.',
  // the women (saved as <id>-f.jpg)
  'frostkin-f': 'A strong northern clan shieldmaiden, human, long braided fair hair threaded with small bone beads, blue war paint across the eyes, a fur-lined cloak over riveted mail, snow and dark pines behind.',
  'highmarcher-f': 'A noble human woman knight-mage of a misty kingdom, auburn hair in a braided crown, calm sharp eyes, a velvet surcoat bearing an invented heraldic device over fine plate, a crystal-tipped staff over the shoulder, grey castle walls and fog behind.',
  'sunblade-f': 'A dark-skinned human desert swordswoman, tight black curls, a white-and-gold linen wrap and head scarf, the hilt of a curved sabre at the shoulder, sun-baked sandstone arches behind.',
  'maned-f': 'A feline humanoid cat-woman with golden-tawny fur finely striped, a shorter mane braided with small gold rings, green eyes and pointed ears, wearing silk and supple leather with small gold charms, a lantern-lit desert bazaar at dusk behind. Clearly a cat-folk face, dignified and clever.',
  'scalekin-f': 'A reptilian lizard-woman of the swamps, smoother green-gold scales with a low crest of soft spines, orange slit-pupil eyes, a long snout, a woven collar of shells, feathers and beads, misty mangrove marsh behind. Dignified and strange.',
  'emberkin-f': 'A slender elf woman with ash-grey skin, glowing red eyes, sharp angular features and long white hair in a braid, wearing dark segmented shell-like armour with red trim, a drifting ash storm and a smoking volcano behind.',
  'gilded-f': 'A tall, golden-skinned high elf woman with long pointed ears, high cheekbones and pale amber eyes, wearing ornate gilded armour and a pale silk cape, crystal spires and sunlit gardens behind.',
  'greenkin-f': 'A lithe forest elf woman with tan skin, leaf-brown face paint, pointed ears and sharp green eyes, a hooded cloak of leaves and bark-brown leather, a bow strap across the chest, a dense canopy of giant trees behind.',
  'tuskborn-f': 'A powerful green-skinned orc woman with prominent lower tusks, a scarred cheek and braided hair with iron rings, wearing heavy dark iron armour trimmed with fur, a glowing forge and a basalt fortress behind. Fierce but noble.',
  'aurelian-f': 'An imperial human woman of the marble cities, olive skin, dark hair in an elegant braided updo with a thin gold laurel, wearing red-and-gold ornate armour with a heavy red cloak, white marble columns and a busy city behind.',
};

async function paint(id) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${TYPES[id]} ${STYLE}` }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
  });
  if (!res.ok) throw new Error(`model said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  const part = (body.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data || p.inline_data?.data);
  const b64 = part?.inlineData?.data ?? part?.inline_data?.data;
  if (!b64) throw new Error('no image: ' + JSON.stringify(body).slice(0, 200));
  return Buffer.from(b64, 'base64');
}

fs.mkdirSync('_data/portraits', { recursive: true });
fs.mkdirSync('public/portraits', { recursive: true });
const asked = process.argv.slice(2);
const todo = asked.length ? asked : Object.keys(TYPES).filter((id) => !fs.existsSync(`public/portraits/${id}.jpg`));
for (const id of todo) {
  if (!TYPES[id]) { console.log('unknown type', id); continue; }
  try {
    const raw = await paint(id);
    fs.writeFileSync(`_data/portraits/${id}.png`, raw);
    await sharp(raw).resize(480, 600, { fit: 'cover', position: 'attention' }).jpeg({ quality: 84 }).toFile(`public/portraits/${id}.jpg`);
    console.log('painted', id);
  } catch (e) { console.log('failed', id, e.message); }
  await new Promise((r) => setTimeout(r, 2500));
}
