import { useEffect, useRef, useState } from "react";
import type { WatershedGeoLayers } from "../data/geo";
import { computeBoundsFromPolygon, evidenceToGeoJson, interventionsToGeoJson } from "../data/geo/utils";
import { fieldEvidence } from "../data/evidence";
import { interventions } from "../data/interventions";
import type { FieldEvidence, Intervention, Watershed } from "../types";
import { fetchWatershedBoundary } from "../services/gisService";

// Priority zones are still local-only data
import { priorityZones } from "../data/geo/demoWatershedA";
import type { Feature, Polygon } from "geojson";

const priorityZoneRegistry: Record<string, Feature<Polygon>[]> = {
  "ws-demo-a": priorityZones,
};

/** Return value from useWatershedGeo, including async state. */
export interface UseWatershedGeoResult {
  /** The assembled GeoJSON layers, or null while loading / on error. */
  geo: WatershedGeoLayers | null;
  /** True while the boundary is being fetched from the backend. */
  loading: boolean;
  /** Error message if the fetch failed, otherwise null. */
  error: string | null;
}

/**
 * Fetches the watershed boundary from FastAPI, then assembles the full
 * WatershedGeoLayers object using local data for interventions, evidence,
 * and priority zones.
 *
 * Re-fetches only when `watershed.id` changes.
 */
export function useWatershedGeo(watershed: Watershed): UseWatershedGeoResult {
  const [geo, setGeo] = useState<WatershedGeoLayers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentId = useRef<string>("");

  useEffect(() => {
    // Track which watershed we're fetching to avoid race conditions
    const watershedId = watershed.id;
    currentId.current = watershedId;
    setLoading(true);
    setError(null);

    fetchWatershedBoundary(watershedId)
      .then((boundary) => {
        // Discard stale responses
        if (currentId.current !== watershedId) return;

        const wsInterventions = interventions.filter(
          (i: Intervention) => i.watershedId === watershedId,
        );
        const wsEvidence = fieldEvidence.filter(
          (e: FieldEvidence) => e.watershedId === watershedId,
        );

        setGeo({
          boundary,
          interventionPoints: interventionsToGeoJson(wsInterventions),
          evidencePoints: evidenceToGeoJson(wsEvidence),
          priorityZones: priorityZoneRegistry[watershedId] ?? [],
          bounds: computeBoundsFromPolygon(boundary),
        });
        setLoading(false);
      })
      .catch((err) => {
        if (currentId.current !== watershedId) return;
        console.error("[useWatershedGeo] Failed to fetch boundary:", err);
        setError(err instanceof Error ? err.message : String(err));
        setGeo(null);
        setLoading(false);
      });
  }, [watershed.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { geo, loading, error };
}
