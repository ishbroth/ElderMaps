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
