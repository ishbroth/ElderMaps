export interface LatLng {
  lat: number;
  lng: number;
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface GeoFix extends LatLng {
  accuracy: number;
}

export function getFix(options: { timeout?: number; maximumAge?: number } = {}): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no geolocation')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: options.timeout ?? 15_000, maximumAge: options.maximumAge ?? 10_000 },
    );
  });
}

/** Follows the traveller; returns the function that stops it. */
export function watchFix(onFix: (fix: GeoFix) => void, onError?: () => void): () => void {
  if (!navigator.geolocation) { onError?.(); return () => undefined; }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    () => onError?.(),
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
