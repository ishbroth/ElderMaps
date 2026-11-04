# ElderMaps

The real world drawn as the Elder Scrolls map. A fan project in the spirit of WastelandMaps.

- **Skyrim look** (default): Google's shaded-relief terrain turned cold and grey, white spaced-out labels, hold crests over the cities. **Oblivion look**: sepia parchment with a ragged, burnt edge.
- The map stops at city level: a crest over each city, and round it a keep (the seat of government), a few landmarks, and towns and villages (the bigger neighbourhoods). The countryside has waterfalls, caves, ruins, forts, camps, beacons, fire mountains, springs, passes, glaciers, groves, shrines and peaks.
- **Fast travel** opens the flat, sketched parchment city map with the road drawn on it, turn-by-turn, spoken in a low English voice.
- Earth is cut into provinces: Scandinavia = Skyrim, Europe and the British Isles = High Rock, North Africa and Arabia = Hammerfell, sub-Saharan Africa = Orsinium, the Indian subcontinent = Elsweyr, Russia/Siberia/the steppe = Morrowind, China, Southeast and southwest Asia = Valenwood, Japan = Summerset Isle, Australia and Indonesia = the Shivering Isles, North America = Cyrodiil, South America = Black Marsh, Greenland = Solstheim, Antarctica = Atmora. Pacific = Padomaic Ocean, Atlantic = Eltheric Ocean. Real names are bent to the province's way of naming (`src/lib/lore.ts`).

```
npm install
# put VITE_GOOGLE_MAPS_API_KEY=... in .env.local
npm run dev
```

Data: `public/data/countries.json` (Natural Earth), `metros-index.json` and `keys.json` (from WastelandMaps' metro files, `npm run keys`), `wild.json` (Wikidata, `npm run wild`).
Research notes: `../ElderMaps-research.md`.

## Marks for cities

- **Crest** (a shield with a device): the anchor city of a metro of 1,000,000 or more (Cleveland, whose city is under a million but whose metro is over). Each name always gets the same shield and device.
- **Town** (two houses): the anchor of a smaller metro (200,000 to 1,000,000) that stands on its own (Akron, Youngstown).
- **Village** (a farm, a mill or a mine): any other city of 60,000 or more (Parma, Lorain, Canton).

`npm run cities` rebuilds `public/data/cities.json` from the metro index and GeoNames (see the header of `_tools/build-cities.mjs`).
