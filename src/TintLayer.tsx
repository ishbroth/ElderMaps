import { useEffect, useRef } from 'react';
import { PROVINCES } from './lib/lore';
import type { LookId } from './lib/styles';
import type { World } from './lib/world';
import type { StyleMap } from './lib/styleMap';

/**
 * The tint of each province over the land, drawn soft: the outlines of the countries filled in their province's colour and then blurred, so one kind of
 * land fades into the next across a border (snow into High Rock's heath, steppe into forest) instead of stopping at a line. It is drawn by hand on a canvas
 * from the map's centre and zoom, which keeps it in step with the map as it moves, and it fades away as you come in toward the cities.
 */
export default function TintLayer({ map, world, look, styleMap }: { map: google.maps.Map | null; world: World; look: LookId; styleMap: StyleMap | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!map || !el) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
      const ctx = el.getContext('2d');
      const center = map.getCenter();
      const zoom = map.getZoom() ?? 4;
      if (!ctx || !center) return;
      ctx.clearRect(0, 0, w, h);
      const fade = zoom <= 5 ? 1 : zoom <= 8 ? 1 - (zoom - 5) / 3.4 : 0;
      el.style.opacity = String(Math.max(0, fade));
      if (fade <= 0) return;
      // the blur is a fixed number of pixels, which is more kilometres the further out you are
      el.style.filter = `blur(${Math.round(Math.max(10, 38 - (zoom - 3) * 5) * (look === 'vivid' ? 0.55 : 1))}px)`;
      const world256 = 256 * 2 ** zoom;
      const mercY = (lat: number) => { const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
      const cx = ((center.lng() + 180) / 360) * world256, cy = mercY(center.lat()) * world256;
      ctx.globalAlpha = look === 'vivid' ? 0.62 : 1;
      for (const copy of [-1, 0, 1]) {
        if (styleMap) {
          // the washes of the building styles, from the picture of the world (one pixel of it is a slice of the Mercator square, so it is laid straight onto the map)
          const S = styleMap.tint.width, k = world256 / S, dx = copy * world256 - cx + w / 2, dy = -cy + h / 2;
          const sx = Math.max(0, -dx / k), sy = Math.max(0, -dy / k), ex = Math.min(S, (w - dx) / k), ey = Math.min(S, (h - dy) / k);
          if (ex > sx && ey > sy) ctx.drawImage(styleMap.tint, sx, sy, ex - sx, ey - sy, dx + sx * k, dy + sy * k, (ex - sx) * k, (ey - sy) * k);
          continue;
        }
        for (const ring of world.provinceRings) {
          const tint = PROVINCES[ring.province].tint;
          ctx.fillStyle = tint;
          ctx.beginPath();
          let started = false;
          for (const [lng, lat] of ring.pts) {
            const x = ((lng + 180) / 360) * world256 + copy * world256 - cx + w / 2;
            const y = mercY(lat) * world256 - cy + h / 2;
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const handles = [map.addListener('bounds_changed', schedule), map.addListener('zoom_changed', schedule), map.addListener('center_changed', schedule)];
    const watch = new ResizeObserver(schedule);
    watch.observe(el);
    schedule();
    return () => { handles.forEach((hnd) => hnd.remove()); watch.disconnect(); cancelAnimationFrame(frame); };
  }, [map, world, styleMap, look]);

  return <canvas ref={canvas} className={`em-tint em-tint-${look}`} aria-hidden="true" />;
}
