/**
 * Shared helpers for drawing the shop delivery radius on Google Maps.
 * Used by live AddressLocationMap and the playground demo.
 */

export type MapLatLng = { lat: number; lng: number };

/** Shop hub + radius for the address map circle (shared client/server type). */
export type ShopDeliveryHub = {
  lat: number;
  lng: number;
  radiusM: number;
};

const RING_STEPS = 96;

/** Soft fill + slightly darker thin dotted stroke (inside / outside). */
export const DELIVERY_RADIUS_MAP_STYLE = {
  inside: {
    stroke: "#5fa85f",
    fill: "#b8e6b8",
    fillOpacity: 0.14,
  },
  outside: {
    stroke: "#e07070",
    fill: "#f5c2c2",
    fillOpacity: 0.12,
  },
} as const;

/** Bounds that cover the full delivery circle (plus optional pin). */
export function boundsForDeliveryRadius(
  hub: MapLatLng,
  radiusM: number,
  pin?: MapLatLng | null,
): google.maps.LatLngBounds {
  const latDelta = radiusM / 111_320;
  const lngDelta =
    radiusM / (111_320 * Math.max(0.2, Math.cos((hub.lat * Math.PI) / 180)));
  const bounds = new google.maps.LatLngBounds(
    { lat: hub.lat - latDelta, lng: hub.lng - lngDelta },
    { lat: hub.lat + latDelta, lng: hub.lng + lngDelta },
  );
  if (pin) bounds.extend(pin);
  return bounds;
}

/** Approximate a circle as a closed path (Maps Circle has no dashed stroke). */
export function circleRingPath(
  hub: MapLatLng,
  radiusM: number,
  steps = RING_STEPS,
): MapLatLng[] {
  const points: MapLatLng[] = [];
  const latRad = (hub.lat * Math.PI) / 180;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.max(0.2, Math.cos(latRad));
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * Math.PI * 2;
    points.push({
      lat: hub.lat + (radiusM * Math.cos(theta)) / metersPerDegLat,
      lng: hub.lng + (radiusM * Math.sin(theta)) / metersPerDegLng,
    });
  }
  return points;
}

export function dashedRingOptions(strokeColor: string): google.maps.PolylineOptions {
  return {
    strokeOpacity: 0,
    clickable: false,
    zIndex: 2,
    icons: [
      {
        icon: {
          path: "M 0,-1 0,1",
          strokeOpacity: 0.9,
          strokeColor,
          scale: 1.25,
        },
        offset: "0",
        repeat: "12px",
      },
    ],
  };
}
