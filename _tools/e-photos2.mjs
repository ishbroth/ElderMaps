import fs from 'node:fs';
let s = fs.readFileSync('supabase/functions/_shared/photoSources.ts', 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing ' + a.slice(0, 80)); s = s.replace(a, b); };

// the city route: skyline searches first, categories second, and a picture only counts as a skyline if its name says so
const a = s.indexOf("  let best: { page: CommonsPage; score: number } | null = null;\n  for (const cat of cats) {");
const b = s.indexOf("  if (ent?.p18) { const hit = await commonsFile(ent.p18, 'wikidata', headers).catch(() => null);");
if (a < 0 || b < 0) throw new Error('city block');
s = s.slice(0, a) + `  let best: { page: CommonsPage; score: number } | null = null;
  const consider = (page: CommonsPage, bonus: number) => {
    if (!hitFromPage(page, 'commons-category', 800)) return; // freely licensed, a JPEG or PNG
    const sc = skylineScore(page as never) + bonus;
    if (!best || sc > best.score) best = { page, score: sc };
  };
  // 1. Commons' own search for "<city> skyline" and "<city> panorama": the best-known pictures come first
  for (const word of ['skyline', 'panorama', 'cityscape']) {
    try {
      const data = await json(COMMONS + new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: \`"\${name}" \${word} filetype:bitmap\`, gsrnamespace: '6', gsrlimit: '30', ...imageinfo }), headers);
      for (const page of Object.values((data.query?.pages ?? {}) as Record<string, CommonsPage>)) {
        const t = (page.title ?? '').replace(/^File:/, '');
        if (!photoIsOf(name, t) && !new RegExp(name.split(/[ ,-]/)[0].replace(/[^\p{L}\p{N}]/gu, ''), 'iu').test(t)) continue; // its name must name the city
        consider(page, 1);
      }
    } catch { /* the categories follow */ }
  }
  // 2. the skyline and panorama categories
  if (!best || (best as { score: number }).score < 5) {
    for (const cat of cats) {
      let data;
      try { data = await json(COMMONS + new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'categorymembers', gcmtitle: \`Category:\${cat}\`, gcmtype: 'file', gcmlimit: '200', ...imageinfo }), headers); } catch { continue; }
      for (const page of Object.values((data.query?.pages ?? {}) as Record<string, CommonsPage>)) consider(page, /skyline|panorama|cityscape/i.test(cat) ? 1.5 : 0);
      if (best && (best as { score: number }).score > 6) break;
    }
  }
  // only a picture that is a skyline or panorama by name (or a featured one) is taken; otherwise the city's own article pictures are tried first
  const strong = best && (best as { score: number }).score >= 3.2 ? (best as { page: CommonsPage }).page : null;
  if (strong) return hitFromPage(strong, 'commons-category', 800);
` + s.slice(b);
// after p18 and the leads, a weaker category pick is still better than nothing
rep("    const hit = await wikiLeadIn(lang, title, headers).catch(() => null);\n    if (hit) return hit;\n  }\n  return null;\n}", "    const hit = await wikiLeadIn(lang, title, headers).catch(() => null);\n    if (hit) return hit;\n  }\n  return best && (best as { score: number }).score > 0 ? hitFromPage((best as { page: CommonsPage }).page, 'commons-category', 800) : null;\n}");
// not an interior, a vehicle, a notice or an event
rep("/** Commons' own text search: a file whose name carries the place's name. */", "/** Titles that are not a picture of the place's outside: rooms, notices, vehicles, events. */\nconst NOT_OUTSIDE = /\b(inside|interior|interieur|room|lobby|corridor|notice|board|tank|exhibit|exhibition|meeting|awareness|award|conference|ceremony|ticket|menu|plane|airbus|boeing|aircraft|airliner|flight|bus|train|locomotive|truck|taxi|car|cars|portrait|selfie|group|map|plan|logo|flag|poster|sign|signage)\b/i;\n\n/** Commons' own text search: a file whose name carries the place's name. */");
rep("    if (/\b(map|flag|logo|diagram|plan|coat of arms|poster|stamp)\b/i.test(page.title ?? '')) continue;\n    if (!hitFromPage(page, 'commons-search', 800)) continue;", "    if (NOT_OUTSIDE.test(page.title ?? '')) continue;\n    if (!hitFromPage(page, 'commons-search', 800)) continue;");
rep("    if (!photoIsOf(name, text) || /(view (from|of|toward|towards|across)|seen from|from (the )?(top|atop|inside|window|observation)|looking (at|from|toward))/i.test(page.title ?? \"\")) continue;", "    if (!photoIsOf(name, text) || NOT_OUTSIDE.test(page.title ?? '') || /(view (from|of|toward|towards|across)|seen from|from (the )?(top|atop|inside|window|observation)|looking (at|from|toward))/i.test(page.title ?? \"\")) continue;");
fs.writeFileSync('supabase/functions/_shared/photoSources.ts', s);
