/**
 * Geo utilitários puros — usados pelo motor de despacho, zonas de entrega
 * e pelo frete por quilômetro (Plano Básico: entrega pela loja).
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Distância Haley-Haversine entre dois pontos em quilômetros.
 * Precisão adequada (± 0,3%) para logística urbana de delivery.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const arc = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return arc * EARTH_RADIUS_KM;
}
