// The traveller on the road: seen from above, an armoured rider on a horse, galloping along the way instead of a plain dot. It faces the way it is going. An original drawing;
// the legs move in turn so it seems to ride (see .em-rider in index.css).

import type { LatLng } from './geo';

/** The rider and horse, facing up (north); the page turns it. */
export const riderSvg = (): string => `
<svg viewBox="0 0 56 76" width="100%" height="100%" aria-hidden="true">
  <!-- the cloak, streaming out behind -->
  <path d="M22 37c-5 8-7 16-6 24 4-3 8-4 12-4s8 1 12 4c1-8-1-16-6-24Z" fill="#8c2b1f" opacity="0.92"/>
  <path d="M25 40c-2 6-3 12-2 17 3-2 6-2 10 0 1-5 0-11-2-17Z" fill="#a8372a" opacity="0.8"/>
  <!-- the tail -->
  <path d="M28 60c-4 4-6 9-4 13 3-1 4-4 4-7 0 3 1 6 4 7 2-4 0-9-4-13Z" fill="#2c1c12"/>
  <!-- the legs (two pairs, moving in turn) -->
  <g class="em-leg-a"><rect x="17" y="20" width="4" height="11" rx="2" fill="#3a2517"/><rect x="35" y="44" width="4" height="11" rx="2" fill="#3a2517"/></g>
  <g class="em-leg-b"><rect x="35" y="20" width="4" height="11" rx="2" fill="#3a2517"/><rect x="17" y="44" width="4" height="11" rx="2" fill="#3a2517"/></g>
  <!-- the horse's body, neck and head -->
  <ellipse cx="28" cy="38" rx="10.5" ry="19" fill="#6b4529"/>
  <ellipse cx="25" cy="34" rx="3.4" ry="11" fill="#7d5233" opacity="0.8"/>
  <path d="M23 21c1-6 2-10 5-13 3 3 4 7 5 13Z" fill="#6b4529"/>
  <path d="M24 9c0-3 1-6 4-7 3 1 4 4 4 7-1 2-2 3-4 3s-3-1-4-3Z" fill="#5a3a22"/>
  <path d="M24.5 5.5 23 1.8l3 1.6ZM31.5 5.5 33 1.8l-3 1.6Z" fill="#3a2517"/>
  <path d="M26 22c0 6-1 10 2 12 3-2 2-6 2-12Z" fill="#2c1c12"/>
  <!-- the saddle blanket and the rider's shield -->
  <ellipse cx="28" cy="40" rx="8" ry="7" fill="#2f4c7a"/>
  <circle cx="18.5" cy="35" r="5.6" fill="#b9bdc4"/><circle cx="18.5" cy="35" r="4" fill="#8c2b1f"/><circle cx="18.5" cy="35" r="1.3" fill="#d8c07a"/>
  <!-- the rider: shoulders, arms to the reins, helmet with a crest -->
  <ellipse cx="28" cy="37" rx="8.4" ry="5.2" fill="#9aa1ab"/>
  <ellipse cx="28" cy="36" rx="6.2" ry="3.4" fill="#c4cad2" opacity="0.7"/>
  <path d="M21.5 36l-1 -7M34.5 36l1 -7" stroke="#8a919b" stroke-width="3.2" stroke-linecap="round"/>
  <circle cx="28" cy="35" r="4.4" fill="#aeb4bd"/>
  <path d="M28 30.4c0-3 0-6 0-8 1 2 1.5 5 1 8Z" fill="#8c2b1f"/>
  <path d="M26 33.4h4" stroke="#4a4f58" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M33 38l7-14" stroke="#cfd3da" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

/** The compass bearing, in degrees clockwise from north, of the way from one point to another. */
export function bearingBetween(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
