# ElderMaps: the plan (WastelandMaps, remade as Tamriel)

Working document. Everything WastelandMaps does is getting an Elder Scrolls twin: same flow, same logic, same schema where it fits, new theme.
Companion file: `../ElderMaps-research.md` (look of the Skyrim and Oblivion maps, province mapping, lore names).

How sure I am: lore below comes from what I know of the games plus the existing research file. Web research for this pass came back thin (UESP blocks automated reading), so the
Morrowind city details in section 3 are the part to check against screenshots before art is made. Marked **(check)** where I am least sure.

---

## 0. Decisions made (read first)

- **Currency: septims.** 1 credit = 100 septims (same as caps in WastelandMaps).
- **Home renders are styled by district** (section 4), never by one fixed style.
- **Rendering works exactly as in WastelandMaps, only the prompt changes:** the building's picture is taken from its free source first (Wikimedia Commons / Wikidata photo),
  Street View only as the last resort, then the same image-model pipeline makes the "after" picture. **The after picture must look like the original building** (same shape, size,
  windows, roofline, surroundings), re-imagined in the district's style: it is a transformation of that building, **never a generic longhouse or pre-made filler**. Shared renders per
  address and the "Discovered by" label work as they do now. Only the prompt (and the reveal animation) changes: a prompt per style kit that says "keep this building's exact structure
  and proportions, rebuild it in this style", with the kit's material and mood notes.
- **3D comes later**, on the same road as WastelandMaps' rubble view (beta there); the render pipeline is built so a 3D step can slot in afterwards.
- **Town Legend: one purchase per metro**, like Project: Atlas.
- **Names:** Elder Scrolls names stay in code and in image-model prompts, but **nothing user-facing may use them**. Province names, sea names, titles and tooltips use our own names (table in section 2).
  Done already: province and sea names, kind titles, the look labels (NORTHERN and PARCHMENT), the title line and the page description.
- **Town Legend map overlay** is to be built, in a believable game style, varied by region (section 6).

## 1. What carries over, and what it becomes

| WastelandMaps | ElderMaps | Notes |
|---|---|---|
| Pre-plotted icons in cities | Pre-plotted icons in the **countryside** (caves, ruins, forts, barrows, keeps, shrines, mills, standing stones, waterfalls) | Inversion: cities have **no** icons on the main map, only the city mark. Wastelandmaps' key places in cities become "Town Legend" content (below). |
| Discover places by walking near them | Same (120 m, background location, same server check) | Reuse `report-discovery` almost as is. |
| Caps, credits, welcome gift | Same currency, new name (gold/septims? see questions) | Keep 1 credit = 100 units so the shops and store prices port unchanged. |
| Snapshot unlock (bomb blast reveal, "after" render) | **Echo Rift**: an ethereal wave carries you into the alternate Tamriel; the real photo dissolves into the rendered Tamriel version | New reveal animation replaces `BlowApart`. |
| Project: Atlas (per-metro address atlas) | **Town Legend** (per-metro, paid) | Section 6. |
| Home vault + vault number + vacation vaults | **Home longhouse** (a house in Skyrim style, or a regional style) + number (door/hearth number) + vacation holds | One home per metro, same one-vault-per-metro rule. |
| Vault building game (isometric rooms) | **House building game** with realistic art | Section 8: the biggest art change. |
| Shooter mini-game (raid) | **Combat mini-game** (swords, bows, magic, hold to charge) | Section 9. |
| Gallery, discovered-by label, leaderboard, callsign | Same ("Discovered by" keeps working unchanged) | Callsign becomes a "name in the realm". |
| Fast travel + green arrow route | **Rider on a horse** on a path, parchment route | Section 7. |
| Scenes (journal text per place) | Scenes in Elder Scrolls voice | Section 5. |
| iOS and Android (Capacitor), Supabase | Same architecture, **its own Supabase project** (`spzkqfjdbzdbjemolhlx`) | Section 10. |

## 2. The world (already mapped, kept)

Provinces from the README (Scandinavia = Skyrim, Europe/British Isles = High Rock, North Africa/Arabia = Hammerfell, sub-Saharan Africa = Orsinium, India = Elsweyr, Russia/steppe =
Morrowind, China/SE Asia/SW Asia = Valenwood, Japan = Summerset Isle, Australia/Indonesia = Shivering Isles, North America = Cyrodiil, South America = Black Marsh, Greenland = Solstheim,
Antarctica = Atmora). Those names are the user's and are kept as they are. Note the games' own geography differs (for example Black Marsh is Argonian swampland, Valenwood is Bosmer jungle,
Summerset is Altmer, Elsweyr is Khajiit desert and jungle, Orsinium is an Orc stronghold, Morrowind is Dunmer ash land), so **each province gets a style kit named for the people the
game puts there**, not for the real continent.

### 2.1 Our names for the provinces (user-facing; the old names stay in code and prompts)

| Working id | Shown as | Seas and others |
|---|---|---|
| skyrim | Hoarfell | Padomaic Ocean = Voidwater Ocean, Eltheric Ocean = Dawnward Ocean |
| highrock | Highmere | Sea of Ghosts = Sea of Wraiths, Inner Sea = Middle Sea |
| hammerfell | Sunreach | Topal Sea = Tidemark Sea, Abecean Sea = Sunrise Sea |
| orsinium | The Tuskholds | Iliac Bay = Crescent Bay, Eastern Sea = Jade Sea |
| elsweyr | Sunmane Reach | Shivering Sea = Fever Sea |
| valenwood | The Verdance | Hold capital = Capital, Jarl's Keep = Lord's Keep |
| morrowind | The Cinderlands | (town name patterns reworked to avoid original place names) |
| summerset | The Gilded Isle | |
| shivering | The Fever Isles | |
| cyrodiil | Aurelia | |
| blackmarsh | The Sunken Mire | |
| solstheim | Rimeholm | |
| atmora | Old Rime | |

Still to do for names: the key-place and wild-place categories in the data, the combat enemies and the building game's items, and the in-app text we have not written yet. Rule: before any new text
ships, check it for names from the games.

## 3. Style kits (for renders, the Town Legend map, navigation maps and the house building game)

*These are the looks the image model is asked to rebuild a real building in. They colour and re-style a real building; they never replace it.*

**More research notes (from this pass; web sources were thin, so treat as a starting point):**
- **Telvanni towns (Sadrith Mora):** the buildings are grown, not built: huge organic mushrooms shaped for each owner, some one home, some a shop, dock or inn, grown in a loop around a
  central tower; the council hall is a large orb held up on giant mushroom stalks; an island settlement reached by sea. Good for: curved rooms, stalks, orbs, glowing fungus.
- **Vivec:** nine huge artificial islands ("cantons"), each a **multi-tiered building the size of a small town**, with a domed courtyard plaza on top; water is part of the architecture even
  indoors; the Hlaalu canton is on the west side; the Foreign Quarter is the northern and largest, three tiers.
- **Argonian (Black Marsh):** stilt huts of wattle-and-daub mud and wood, moved when the swamp shifts; totems of wood, mud and feathers; bamboo and reed in some regions; rain, mist, hist trees.
  (Most of the visual detail I found comes from the online game, not the main series.)
- **Khajiit (Elsweyr):** ancient stone architecture worn down by erosion, covered in layers of ornament; newer buildings on stilts with pointed roofs placed on top of old ruins; moon themes;
  the zone drew on West Africa, India, Indonesia and Thailand; terrain of savanna, canyon and jungle.
- **Redoran, Hlaalu, Balmora:** see below; Redoran buildings are domed and shell-shaped with curved insides like yurts, Hlaalu are cubic and tidy, built in rows.

Every kit needs: building shapes, materials and colours, roof and door shapes, interior look, ground and street, signature props, and enemy/loot flavour.

**Core kits (most of the world):**
- **Nordic (Skyrim, Atmora, Solstheim)**: timber longhouses on stone footings, turf or thatch and dark shingle roofs, carved dragon-head gables, smoke holes, fur and iron, torches, standing
  stones. Interiors: long central hearth, benches, hanging meat, stone and heavy plank, warm firelight.
- **Imperial (Cyrodiil, Oblivion towns, much of High Rock's cities)**: pale stone and whitewash with dark timber framing, red-tiled roofs, arches, banners, courtyards, tidy cobbled streets,
  wrought iron. Interiors: timber beams, tapestries, brass lamps, wood floors, mild tones.
- **Breton (High Rock)**: Imperial-leaning with tall steep roofs, towers and keeps, grey stone, heraldry.

**Morrowind kits (the user's four named looks, used for districts and the Morrowind province) (check):**
- **Hlaalu / Balmora**: low stepped blocks of pale plaster over stone, rounded wooden-beam fronts, curved doors, plank walkways and bridges over the Odai river, warm browns and creams.
  Interiors: rooms with curved corners, wooden floors, hanging lamps, rugs, shelves cut into the walls.
- **Redoran / Ald-ruhn and Gnisis**: dome and shell shapes in dark chitin and mudbrick, built round a huge shell (Ald-ruhn's emperor-crab shell), round doors, few windows, curved interiors like
  Ashlander yurts, banded in dark red-brown. Gnisis reads as a rugged hold with a Temple.
- **Telvanni / Sadrith Mora**: huge living mushroom towers, organic and bulbous, spiral stairs, odd lights, grown not built; rooms are rounded pods, glowing fungus, wizard clutter.
- **Vivec / Velothi and Indoril**: massive stone canton blocks with grand stepped, sloped faces and arches; heavy dark stone, great halls, incense, carved reliefs; the most monumental kit.
- **Dunmer stronghold and Ashlander camp**: ash-grey stone strongholds, yurt tents of hide and bone.

**Other kits:**
- **Ayleid ruins** (Oblivion): white-stone elegant ruins with glowing blue Welkynd stones, carved arches and fluted columns; good for natural-cave places and ruined mansions.
- **Dwemer ruins** (Morrowind, Skyrim): bronze and verdigris machinery, gears, pipes, steam, rectilinear halls; good for industrial ruins, mills, factories, locks, dams, big steel structures.
- **Nordic barrows and Nordic ruins**: carved stone passages, dragon claws, burial alcoves, urns, cobwebs, draugr tombs.
- **Redguard (Hammerfell)**: sun-bleached white stone, domes, arches, sandstone, bazaars.
- **Altmer (Summerset)**: golden-white towers, spires, crystal, flowing curves, gardens.
- **Bosmer (Valenwood)**: grown wooden buildings in living trees, bridges and platforms, leaf-carved details.
- **Orsinium (Orc)**: heavy stone and iron strongholds, longhouses of tusk and hide, forges.
- **Khajiit (Elsweyr)**: warm sandstone, striped awnings, moon-sugar towns, jungle ruins.
- **Argonian (Black Marsh)**: raised huts of reed and mud on stilts over swamp, hist trees, grown bridges.

Important: games' interiors are **not** all green and cartoony: this time the rule is realistic, game-like (Skyrim) textures and lighting for all kits.

## 4. Splitting every metro into style districts

Each metro in `public/data/metros-index.json` gets an internal map of **districts**, each assigned a kit, used whenever an address is rendered or drawn on the Town Legend map.
- The metro's **default kit comes from its province** (a Cyrodiil city defaults Imperial, a Skyrim city defaults Nordic, and so on).
- Districts then **override** it so no city is a single style: examples from the request: south-west Detroit in Telvanni (Sadrith Mora), downtown Detroit in Imperial stone and timber.
- Method: split each metro into a handful of districts using the city's real neighbourhood names (the neighbourhood data WastelandMaps already has), plus a deterministic rule so the result is stable:
  1. The centre (downtown) gets the province's main kit.
  2. Surrounding districts rotate through a fixed list of 3 to 5 secondary kits chosen for the province (for Cyrodiil: Imperial, Hlaalu, Redoran, Breton, Nordic-in-the-hills).
  3. The choice is hashed from the neighbourhood name so it never changes.
- Stored as data: `public/data/districts/<metro>.json` (polygons or neighbourhood id lists), with a function `kitFor(lat, lng)` used by the renderer.
- Outside metros (the countryside icons): the kit comes from the **province**, adjusted by terrain (cave, ruin, barrow, keep, waterfall) rather than by district.

## 5. Scenes and lore voice

WastelandMaps' scenes (see `sceneLines.ts`, `describeSpot`) become Elder Scrolls in-world lines: shop signs, notes, book titles, guard barks, rumours, kill-count style text.
- Each place type gets a lore category (the research file has 40 categories) and 5 to 10 variants of text per type, reworded by province style.
- Lore names must be consistent: keep the existing `lore.ts` bending of real names to the province.
- Keep the humour and warmth of the original; avoid long copied game text (write original lines in the game's voice).

## 6. Town Legend (the Project: Atlas twin) and the city map

- The main map zooms only to city level (just the city mark). Zooming into a city is not possible there.
- **Town Legend** (paid, per metro) unlocks a button on a city's mark that opens a **separate map window** of that city:
  - Streets drawn as dirt paths, cobblestone and old roads; buildings as simple Skyrim, Morrowind or Oblivion style footprints, coloured by the district kit.
  - Zoom from neighbourhood out to the whole city, no further.
  - Every address any user paid to render in that metro is plotted and can be opened.
  - Free: the close-up street map that appears automatically while navigating (below).
- Needs: a styled Google map with custom styles (roads brown, water dark, parks green, buildings as muted blocks) plus an overlay tile or SVG layer for textures, per kit.
  Google Maps styling can restyle roads and landscape, but cannot make real cobblestones: that needs a custom overlay of textured polylines, which is a real piece of work.

## 7. Navigation

- Start: the whole route is previewed on the larger parchment/relief map (city mark style) when it leaves the metro, then zooms into street level.
- Route line: a **rider on horseback in armour, seen from above**, moving along the road (drawn as an animated sprite; the pulsing green arrow goes away). Horse speed follows the real
  speed, direction follows the road.
- Street level while navigating (always free): the road network styled as ancient paths and ruined roads, **changing style by province** (Nordic stone track, Imperial cobbles, Morrowind ash
  road, Hammerfell sand track, and so on), with ruined path overlays.
- Voice: keep the existing Nord voice (`voice.ts`); can add provincial accents later.
- Reuses most of the WastelandMaps navigation code (`navigation.ts`, heading-up rotation, overview).

## 8. House building game (from the vault game)

- Same rules and structure: a grid of rooms, connected, stairs, number of rooms for vacation holds, settlers, furniture.
- Rename: home vault = **home longhouse (or house in the district style)**; vacation vaults = vacation holds; vault door = front door with a number; furniture: enchanting table instead of TV,
  alchemy station, forge, bed, hearth, weapon rack, bookshelf, dragon-shout wall, trophy room, mannequins, storage chests, cooking pot.
- **Art direction change: realistic (Skyrim-like), not green wireframe.** This is the largest art task. Options, in order of realism and cost:
  1. **Pre-rendered isometric images** made with an image model, per room type and per kit, then composited in the grid (fast, but consistency across rooms is hard).
  2. **3D scene in the browser (three.js / Babylon.js)** with a small library of textured models, lit like Skyrim, with camera locked isometric. Highest quality, more work, heavier on phones.
  3. A mix: 3D models rendered once (offline) to sprite sheets for each piece in each kit.
  I would start with option 1 for one kit (Nordic) to test the look, and decide on 2 or 3 after seeing it on a phone.
- Texture packs: one per kit (Nordic, Imperial, Hlaalu, Redoran, Telvanni, Vivec, Dwemer...), swapping materials and some room shapes (curved rooms for Hlaalu, Redoran, Telvanni).
  Curved rooms mean the grid can't be only squares: allow room types with rounded corners or circular footprints that occupy a square cell.

## 9. Combat mini-game (from the shooter)

- **Enemies (waves):** skeletons, draugr, bandits (with Khajiit and Argonian variants common), Dwemer spiders and spheres, mudcrabs, trolls, sabre cats, mammoths, giants, vampires and
  sorcerers. **Boss:** a draugr boss (you named it **Gjenganger**), the Dwemer centurion; **dragons** appear randomly as bosses only, never in waves.
  Every enemy keeps the engine's idea of size, health, speed and walking.
- **Weapon wheel:** top = two-handed weapons; bottom = bow and arrow; right = one-handed weapon (the start); left = magic (shock, frost spike, fireball, **life drain**, which heals you).
  Purchasable upgrade: use left and right at once (magic and weapon, two magics, two weapons).
- **Tap and hold to charge (all but life drain):** hold builds an attack-strength bar while enemies advance; release makes the attack happen (swing, shot, spell) with more damage the longer you
  held. A quick tap hits for the minimum. You cannot tap-tap-tap like a gun: the swing animation has to finish before the next attack counts.
- **Life drain:** a constant stream while held, no charge; stops on release; then a **1.5 s cool-down** before the stream can start again. With a weapon in the other hand, releasing the weapon
  attack interrupts the stream briefly, then it resumes while the next attack charges.
- **Bow:** like the sniper rifle: it zooms in, with **no crosshair, only a dot**, and the arrow **arcs slightly**.
- Spawn points and sizes use the new perspective-based analysis already built in WastelandMaps (ground level, building height against a person's height).

## 10. Backend

- Own Supabase project for ElderMaps (created: `spzkqfjdbzdbjemolhlx`). Start by porting only what is needed, in this order:
  1. Accounts (email link, vault/house number as password, callsign), caps/credits, leaderboard names.
  2. Discovery: `found_places`, `discoveries`, `report-discovery`, welcome bonus.
  3. Personal places and snapshot unlocks (`unlock-render`, `unlock-streetview` equivalents) with a **new render prompt** per kit (the Echo Rift look).
  4. Gallery, discovered-by, shared renders per address.
  5. Home house and vacation holds with the one-per-metro rule.
  6. Combat raids and loot.
  7. Town Legend purchases and the city map data.
  8. Store purchases (Apple and Google) once there are apps.
- Row-level security on every table from the start. Keep the publishable key in the app only.

## 11. Risks and decisions

- **Trademark and store rules:** "Elder Scrolls", "Skyrim", "Morrowind" and similar names belong to Bethesda. A free fan project is usually tolerated, but taking payments (caps, Town Legend) and putting
  it in the app stores is a real risk: a store listing can be refused or pulled, and a takedown is possible. Worth a lawyer's look, or building original-sounding names (like "Gjenganger")
  where easy. I will not use game art, fonts or music.
- **Realistic house art** is the hardest part to get consistent; pick the approach (section 8) before the building game is ported.
- **Cobblestone map** needs a custom overlay (section 6), not just Google styling.
- **Image generation cost** for every kit and district (renders are paid with the same credit system as in WastelandMaps).

## 12. Suggested build order

1. Backend accounts and caps (sign in, balance, callsign) in ElderMaps, with the deployed site working.
2. Countryside discovery: walking near icons, discovered state, XP, notifications, replacing the current map-only app.
3. Echo Rift snapshots for pre-plotted places, one kit at first (Nordic) and a first district map for one metro.
4. Combat (new enemies, weapon wheel, hold-to-charge), reusing the existing engine.
5. Navigation (rider sprite, provincial road styles).
6. Home house building game (art approach chosen first).
7. Town Legend and city maps; vacation holds; gallery.
8. Apps, store purchases.

## 13. Open questions

1. Currency name: caps become "septims", "gold" or something original?
2. Which kit renders the **home house** by default: by province, by district (as you described), or can the user choose?
3. Home building game art: pre-rendered images, 3D, or a mix (section 8)?
4. Is the Town Legend map one purchase per metro, at the same price as Project: Atlas?
5. Do we start with accounts (step 1) before any rendering, as above?
