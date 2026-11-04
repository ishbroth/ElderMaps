const fs = require('fs');
const p = 'src/App.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b, l) => { if (!s.includes(a)) throw new Error('missing ' + l); s = s.replace(a, () => b); };

rep("    const add = (spot: Spot, labelled: boolean) => { if (wanted.size < 380) wanted.set(spot.id, { spot, labelled }); };",
`    // nothing sits on top of anything else: a pin yields to one placed before it (cities first) within a few pixels, and a name is only written where it has room
    const proj = map.getProjection();
    const scale = 256 * 2 ** (map.getZoom() ?? zoom);
    const taken: { x: number; y: number }[] = [];
    const written: { x: number; y: number }[] = [];
    const add = (spot: Spot, labelled: boolean) => {
      if (wanted.size >= 380) return;
      let x = 0, y = 0;
      if (proj) {
        const pt = proj.fromLatLngToPoint(new google.maps.LatLng(spot.lat, spot.lng));
        if (pt) { x = pt.x * scale; y = pt.y * scale; }
        if (taken.some((q) => Math.abs(q.x - x) < 15 && Math.abs(q.y - y) < 15)) return;
        taken.push({ x, y });
        if (labelled && written.some((q) => Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 20)) labelled = false;
        if (labelled) written.push({ x, y: y + 18 });
      }
      wanted.set(spot.id, { spot, labelled });
    };`, 'add');

rep(`    if (zoom >= 8) {
      let count = 0;
      for (const m of world.metros) {
        if (count > 160) break;
        if (!inView(m.lat, m.lng)) continue;
        const province = world.provinceOfCountry(m.country);
        for (const [name, lat, lng, kind, category, fame] of world.keys[m.id] ?? []) {
          if ((kind === 'landmark' || kind === 'town') && zoom < 9) continue;`,
`    if (zoom >= 9) {
      let count = 0;
      // how many of each kind round a city, by how close in the view is: a few at first, all of them at the closest
      const room = zoom === 9 ? 2 : zoom === 10 ? 4 : 7;
      for (const m of world.metros) {
        if (count > 160) break;
        if (!inView(m.lat, m.lng)) continue;
        const province = world.provinceOfCountry(m.country);
        const used = { landmark: 0, town: 0, keep: 0 };
        for (const [name, lat, lng, kind, category, fame] of world.keys[m.id] ?? []) {
          if (used[kind] >= room) continue;
          // the keep stands where the crest does unless the seat of government is out in the city
          if (kind === 'keep' && distanceMeters({ lat, lng }, { lat: m.lat, lng: m.lng }) < 2500) continue;
          used[kind]++;`, 'keys');
fs.writeFileSync(p, s);
console.log('ok');
