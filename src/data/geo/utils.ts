import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";
import type { FieldEvidence, Intervention } from "../../types";

// ---------------------------------------------------------------------------
// GeoJSON conversion utilities for WATERSIGHT AI
// Pure functions — no side-effects, no UI coupling.
// ---------------------------------------------------------------------------

/** Properties carried on each intervention GeoJSON point. */
export interface InterventionPointProps {
  id: string;
  code: string;
  type: Intervention["type"];
  status: Intervention["status"];
  watershedId: string;
}

/** Properties carried on each field-evidence GeoJSON point. */
export interface EvidencePointProps {
  id: string;
  imageUrl: string;
  captureDate: string;
  interventionId: string;
  verificationStatus: FieldEvidence["verificationStatus"];
  watershedId: string;
  aiLabel?: string;
  aiConfidence?: number;
}

/**
 * Convert an array of Intervention objects into a typed GeoJSON
 * FeatureCollection of Point features.
 */
export function interventionsToGeoJson(
  items: Intervention[],
): FeatureCollection<Point, InterventionPointProps> {
  return {
    type: "FeatureCollection",
    features: items.map(
      (iv): Feature<Point, InterventionPointProps> => ({
        type: "Feature",
        properties: {
          id: iv.id,
          code: iv.code,
          type: iv.type,
          status: iv.status,
          watershedId: iv.watershedId,
        },
        geometry: {
          type: "Point",
          coordinates: [iv.longitude, iv.latitude],
        },
      }),
    ),
  };
}

/**
 * Convert an array of FieldEvidence objects into a typed GeoJSON
 * FeatureCollection of Point features.
 */
export function evidenceToGeoJson(
  items: FieldEvidence[],
): FeatureCollection<Point, EvidencePointProps> {
  return {
    type: "FeatureCollection",
    features: items.map(
      (ev): Feature<Point, EvidencePointProps> => ({
        type: "Feature",
        properties: {
          id: ev.id,
          imageUrl: ev.imageUrl,
          captureDate: ev.captureDate,
          interventionId: ev.interventionId,
          verificationStatus: ev.verificationStatus,
          watershedId: ev.watershedId,
          aiLabel: ev.aiClassification?.label,
          aiConfidence: ev.aiClassification?.confidence,
        },
        geometry: {
          type: "Point",
          coordinates: [ev.longitude, ev.latitude],
        },
      }),
    ),
  };
}

/**
 * Compute a Leaflet-compatible bounds expression from a GeoJSON Polygon
 * feature by scanning all coordinate rings for min/max lat/lng.
 *
 * Returns `[[minLat, minLng], [maxLat, maxLng]]`.
 */
export function computeBoundsFromPolygon(
  feature: Feature<Polygon>,
): LatLngBoundsExpression {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const ring of feature.geometry.coordinates) {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
