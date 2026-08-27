import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";
import type { FieldEvidence, Intervention, Watershed } from "../../types";
import { fieldEvidence } from "../evidence";
import { interventions } from "../interventions";
import { demoWatershedABoundary, priorityZones } from "./demoWatershedA";
import {
  computeBoundsFromPolygon,
  evidenceToGeoJson,
  interventionsToGeoJson,
  type EvidencePointProps,
  type InterventionPointProps,
} from "./utils";

// ---------------------------------------------------------------------------
// GIS data registry — single entry-point for all spatial layers per watershed
// ---------------------------------------------------------------------------

/** All GeoJSON layers available for a single watershed. */
export interface WatershedGeoLayers {
  /** Watershed boundary polygon. */
  boundary: Feature<Polygon>;
  /** Intervention locations as GeoJSON points. */
  interventionPoints: FeatureCollection<Point, InterventionPointProps>;
  /** Field evidence locations as GeoJSON points. */
  evidencePoints: FeatureCollection<Point, EvidencePointProps>;
  /** Change-detection priority zones (positive / negative). */
  priorityZones: Feature<Polygon>[];
  /** Leaflet-compatible bounds derived from the boundary polygon. */
  bounds: LatLngBoundsExpression;
}

// -- Boundary lookup by boundaryGeoJsonId -----------------------------------

const boundaryRegistry: Record<string, Feature<Polygon>> = {
  "ws-demo-a-boundary": demoWatershedABoundary,
};

/**
 * Look up a boundary Feature<Polygon> by its `boundaryGeoJsonId`.
 * Returns `undefined` if no matching boundary exists.
 */
export function getBoundaryById(geoJsonId: string): Feature<Polygon> | undefined {
  return boundaryRegistry[geoJsonId];
}

// -- Priority-zone lookup by watershedId ------------------------------------

const priorityZoneRegistry: Record<string, Feature<Polygon>[]> = {
  "ws-demo-a": priorityZones,
};

// -- Main API ---------------------------------------------------------------

/**
 * Return all GeoJSON layers for the given watershed.
 *
 * Filters interventions and evidence by `watershedId`, converts them to
 * FeatureCollections, resolves the boundary polygon, and computes bounds.
 *
 * Returns `null` if no boundary is registered for the watershed.
 */
export function getLayersForWatershed(
  watershed: Watershed,
): WatershedGeoLayers | null {
  const boundary = getBoundaryById(watershed.boundaryGeoJsonId);
  if (!boundary) return null;

  const wsInterventions = interventions.filter(
    (i: Intervention) => i.watershedId === watershed.id,
  );
  const wsEvidence = fieldEvidence.filter(
    (e: FieldEvidence) => e.watershedId === watershed.id,
  );

  return {
    boundary,
    interventionPoints: interventionsToGeoJson(wsInterventions),
    evidencePoints: evidenceToGeoJson(wsEvidence),
    priorityZones: priorityZoneRegistry[watershed.id] ?? [],
    bounds: computeBoundsFromPolygon(boundary),
  };
}
