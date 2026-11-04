// Loading Google Maps once, and the one thing asked of it besides the map: where a typed place is.

import type { LatLng } from './geo';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const hasMapsKey = (): boolean => !!KEY && KEY.trim().length > 10;

let loading: Promise<void> | null = null;

export function loadGoogle(): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    if (!hasMapsKey()) { reject(new Error('NO MAPS KEY: add VITE_GOOGLE_MAPS_API_KEY to .env.local')); return; }
    const w = window as unknown as Record<string, unknown>;
    w.gm_authFailure = () => reject(new Error('GOOGLE REFUSED THE MAPS KEY'));
    w.__eldermapsReady = () => {
      Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('geocoding')])
        .then(() => resolve())
        .catch(() => reject(new Error('GOOGLE MAPS FAILED TO LOAD')));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY as string)}&v=weekly&loading=async&callback=__eldermapsReady`;
    script.async = true;
    script.onerror = () => reject(new Error('COULD NOT REACH GOOGLE'));
    document.head.appendChild(script);
  });
  loading.catch(() => { loading = null; });
  return loading;
}

export interface Found {
  name: string;
  center: LatLng;
  bounds: google.maps.LatLngBoundsLiteral | null;
}

/** Where a typed place is (a city, an address, a landmark). Null if Google does not know it. */
export async function findPlace(query: string): Promise<Found | null> {
  const { results } = await new google.maps.Geocoder().geocode({ address: query }).catch(() => ({ results: [] as google.maps.GeocoderResult[] }));
  const hit = results[0];
  if (!hit) return null;
  const vp = hit.geometry.viewport;
  return {
    name: hit.formatted_address,
    center: { lat: hit.geometry.location.lat(), lng: hit.geometry.location.lng() },
    bounds: vp ? vp.toJSON() : null,
  };
}
