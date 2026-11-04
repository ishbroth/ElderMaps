const fs = require('fs');
const p = 'src/App.tsx';
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b, l) => { if (!s.includes(a)) throw new Error('missing ' + l); s = s.replace(a, () => b); };
rep("    const written: { x: number; y: number }[] = [];", "    const written: { x: number; y: number; w: number }[] = [];", 'type');
rep("        if (labelled && written.some((q) => Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 20)) labelled = false;\n        if (labelled) written.push({ x, y: y + 18 });",
  "        const w = Math.min(190, spot.name.length * 9);\n        if (labelled && written.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 8 && Math.abs(q.y - y) < 17)) labelled = false;\n        if (labelled) written.push({ x, y, w });", 'collide');
rep("clickable: false, visible: !tripRef.current };\n    });\n  }, [look, ready, trip === null]);", "clickable: false, visible: !tripRef.current && zoomShown <= 6 };\n    });\n  }, [look, ready, trip === null, zoomShown <= 6]);", 'vis');
fs.writeFileSync(p, s);
console.log('ok');
