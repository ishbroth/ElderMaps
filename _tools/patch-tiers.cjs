const fs = require('fs');
const edit = (p, fn) => { let s = fs.readFileSync(p, 'utf8'); s = fn(s); fs.writeFileSync(p, s); };
const rep = (s, a, b, l) => { if (!s.includes(a)) throw new Error('missing ' + l); return s.replace(a, () => b); };

edit('src/lib/world.ts', (s) => {
  s = rep(s, "/** [id, name, lat, lng, type, fame] */", "/** [name, lat, lng, population, tier (crest, town, village), country] */\nexport type City = [string, number, number, number, 'crest' | 'town' | 'village', string];\n/** [id, name, lat, lng, type, fame] */", 'city type');
  s = rep(s, "  metros: Metro[];\n", "  metros: Metro[];\n  /** The cities by mark: crests (anchors of metros over a million), towns (smaller metros on their own), villages (every other city over 60,000), biggest first. */\n  cities: { crest: City[]; town: City[]; village: City[] };\n  /** The outlines of the countries, with the province each belongs to, for tinting the land. */\n  provinceRings: { province: ProvinceId; pts: number[][] }[];\n", 'iface');
  s = rep(s, "    const [countriesJson, metros, keys, wild] = await Promise.all([", "    const [countriesJson, metros, keys, wild, cityList] = await Promise.all([", 'all');
  s = rep(s, "      fetch(`${BASE}data/wild.json`).then((r) => r.json() as Promise<WildPlace[]>),\n", "      fetch(`${BASE}data/wild.json`).then((r) => r.json() as Promise<WildPlace[]>),\n      fetch(`${BASE}data/cities.json`).then((r) => r.json() as Promise<City[]>),\n", 'fetch');
  s = rep(s, "    return {\n      countries,", "    const cities = { crest: [] as City[], town: [] as City[], village: [] as City[] };\n    for (const c of cityList.sort((a, b) => b[3] - a[3])) cities[c[4]].push(c);\n    return {\n      cities, provinceRings: countries.flatMap((c) => c.rings.map((r) => ({ province: c.province, pts: r.pts }))),\n      countries,", 'ret');
  return s;
});

edit('src/lib/lore.ts', (s) => rep(s, "  crest: 'Hold capital', keep:", "  crest: 'Hold capital', village: 'Settlement', keep:", 'title'));

edit('src/App.tsx', (s) => {
  s = rep(s, "import { glyph, glyphForCategory } from './lib/glyphs';", "import { crestSvg, glyph, glyphForCategory } from './lib/glyphs';", 'imp');
  s = rep(s, "import TornFrame from './TornFrame';", "import TornFrame from './TornFrame';\nimport TintLayer from './TintLayer';", 'imp2');
  s = rep(s, "  /** A line about it (a hold capital's metro size, a wild place's kind). */\n  note: string;", "  /** A line about it (a hold capital's metro size, a wild place's kind). */\n  note: string;\n  /** Which pictogram, when the kind has more than one (farm, mill or mine for a village). */\n  pic?: string;", 'spot');
  s = rep(s, "const crestCount = (zoom: number): number =>", "const townCount = (zoom: number): number => (zoom < 6 ? 0 : zoom === 6 ? 150 : zoom === 7 ? 400 : zoom === 8 ? 900 : 5000);\nconst villageCount = (zoom: number): number => (zoom < 7 ? 0 : zoom === 7 ? 250 : zoom === 8 ? 700 : zoom === 9 ? 2000 : 8000);\nconst crestCount = (zoom: number): number =>", 'counts');
  s = rep(s, "  icon.innerHTML = glyph(spot.kind === 'crest' ? 'crest' : spot.kind === 'landmark' ? glyphForCategory(spot.note) : spot.kind === 'keep' ? 'keep' : spot.kind === 'town' ? 'town' : spot.kind);",
    "  icon.innerHTML = spot.kind === 'crest' ? crestSvg(spot.real) : glyph(spot.pic ?? (spot.kind === 'landmark' ? glyphForCategory(spot.note) : spot.kind));", 'icon');
  // the cities, by tier
  const a = s.indexOf("    // the hold capitals: the cities, biggest first");
  const b = s.indexOf("    // the key places round a city");
  if (a < 0 || b < 0) throw new Error('crest bounds');
  s = s.slice(0, a) + `    // the cities, biggest first and more of them as you come in: crests (the anchors of metros over a million), towns (smaller metros that stand alone),
    // and villages (every other city over 60,000, drawn as a farm, a mill or a mine)
    const hashName = (t: string) => { let h = 7; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; };
    const tiers: [typeof world.cities.crest, number, 'crest' | 'town' | 'village', number][] = [
      [world.cities.crest, crestCount(zoom), 'crest', 140], [world.cities.town, townCount(zoom), 'town', 110], [world.cities.village, villageCount(zoom), 'village', 110],
    ];
    for (const [list, allowed, kind, cap] of tiers) {
      let shown = 0;
      for (let i = 0; i < list.length && i < allowed && shown < cap; i++) {
        const [name, lat, lng, pop, , iso2] = list[i];
        if (!inView(lat, lng)) continue;
        const province = world.provinceOfCountry(iso2);
        const pic = kind === 'village' ? (['farm', 'mill', 'mine'] as const)[hashName(name) % 3] : undefined;
        add({ id: \`c:\${name}:\${lat}\`, kind, real: name, name: loreName(name, province), province, lat, lng, fame: pop, pic,
          note: kind === 'village' ? 'A settlement of farms, mills and mines about a bigger place' : \`\${Math.round(pop / 1000).toLocaleString('en-US')} thousand souls\` }, kind !== 'village' || zoom >= 8);
        shown++;
      }
    }
` + s.slice(b);
  // key places only round the anchors, and the neighborhoods are no longer marked (the cities are the towns)
  s = rep(s, "      for (const m of world.metros) {\n        if (count > 160) break;\n        if (!inView(m.lat, m.lng)) continue;", "      for (const m of world.metros) {\n        if (count > 160) break;\n        if (m.pop < 200_000 || !inView(m.lat, m.lng)) continue;", 'metros');
  s = rep(s, "          if (used[kind] >= room) continue;", "          if (kind === 'town' || used[kind] >= room) continue;", 'town skip');
  s = rep(s, "dangerouslySetInnerHTML={{ __html: glyph(selected.kind === 'landmark' ? glyphForCategory(selected.note) : selected.kind) }}", "dangerouslySetInnerHTML={{ __html: selected.kind === 'crest' ? crestSvg(selected.real) : glyph(selected.pic ?? (selected.kind === 'landmark' ? glyphForCategory(selected.note) : selected.kind)) }}", 'card icon');
  // the soft tint replaces the hard-edged country polygons
  s = rep(s, "      return { fillColor: p.tint, fillOpacity: look === 'skyrim' ? 0.27 : 0.2, strokeWeight: 0, clickable: false, visible: !tripRef.current && zoomShown <= 6 };\n    });\n  }, [look, ready, trip === null, zoomShown <= 6]);", "      void p;\n      return { visible: false, clickable: false };\n    });\n  }, [look, ready]);", 'tint');
  s = rep(s, "        <div className=\"em-vignette\" aria-hidden=\"true\" />", "        {ready && world && !trip && <TintLayer map={mapRef.current} world={world} look={look} />}\n        <div className=\"em-vignette\" aria-hidden=\"true\" />", 'layer');
  return s;
});
console.log('ok');
