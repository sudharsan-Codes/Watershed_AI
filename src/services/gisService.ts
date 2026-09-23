import type {
  ChangeDetectionResult,
  DashboardSummary,
  FieldEvidence,
  Intervention,
  PriorityArea,
  SatelliteAnalysis,
  UploadedEvidence,
  Watershed,
} from "../types";
import type { Feature, Polygon } from "geojson";
import type { WatershedGeoLayers } from "../data/geo";

import { watersheds, getWatershedById } from "../data/watersheds";
import { interventions, getInterventionById } from "../data/interventions";
import { fieldEvidence } from "../data/evidence";
import {
  dashboardSummary,
  satelliteAnalysisByWatershed,
  changeDetectionByWatershed,
  priorityAreas,
} from "../data/analysis";
import { getLayersForWatershed } from "../data/geo";

// ---------------------------------------------------------------------------
// GIS Service — thin abstraction over the local data layer.
//
// Currently delegates to in-memory demo data and the GIS registry.
// The watershed boundary is fetched from FastAPI; all other data
// still comes from the local data layer.
// ---------------------------------------------------------------------------

/** FastAPI backend base URL for development. */
const API_BASE = "http://localhost:8000";

// -- Watershed Boundary (FastAPI) -------------------------------------------

/**
 * Fetch the watershed boundary GeoJSON Feature from the FastAPI backend.
 *
 * Returns the raw Feature object (typed as `Feature<Polygon>`).
 * Throws on network errors or non-OK responses with a descriptive message.
 */
export async function fetchWatershedBoundary(
  watershedId: string,
): Promise<Feature<Polygon>> {
  const url = `${API_BASE}/api/watersheds/${encodeURIComponent(watershedId)}/geo`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch watershed boundary: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.json() as Promise<Feature<Polygon>>;
}

// -- Watersheds -------------------------------------------------------------

/** Return all known watersheds. */
export function getWatersheds(): Watershed[] {
  return watersheds;
}

/** Return a single watershed by id, or `undefined` if not found. */
export function getWatershed(id: string): Watershed | undefined {
  return getWatershedById(id);
}

// -- GeoJSON layers ---------------------------------------------------------

/**
 * Return all GeoJSON layers (boundary, interventions, evidence, priority zones)
 * for the given watershed.
 *
 * Delegates to the central GIS registry.
 */
export function getWatershedGeo(watershed: Watershed): WatershedGeoLayers | null {
  return getLayersForWatershed(watershed);
}

// -- Interventions ----------------------------------------------------------

/** Return all interventions belonging to a watershed. */
export function getInterventions(watershedId: string): Intervention[] {
  return interventions.filter((i) => i.watershedId === watershedId);
}

/** Return a single intervention by id. */
export function getIntervention(id: string): Intervention | undefined {
  return getInterventionById(id);
}

// -- Field Evidence ---------------------------------------------------------

/** Return field evidence for a specific intervention. */
export function getFieldEvidenceByIntervention(interventionId: string): FieldEvidence[] {
  return fieldEvidence.filter((e) => e.interventionId === interventionId);
}

/** Return all field evidence for a watershed. */
export function getFieldEvidenceByWatershed(watershedId: string): FieldEvidence[] {
  return fieldEvidence.filter((e) => e.watershedId === watershedId);
}

// -- Analysis / Change Detection --------------------------------------------

/** Return satellite analysis for a watershed, if available. */
export function getSatelliteAnalysis(watershedId: string): SatelliteAnalysis | undefined {
  return satelliteAnalysisByWatershed[watershedId];
}

/** Return change-detection results for a watershed, if available. */
export function getChangeDetection(watershedId: string): ChangeDetectionResult | undefined {
  return changeDetectionByWatershed[watershedId];
}

/** Return priority areas for a watershed. */
export function getPriorityAreas(watershedId: string): PriorityArea[] {
  return priorityAreas.filter((p) => p.watershedId === watershedId);
}

// -- Dashboard --------------------------------------------------------------

/** Return the dashboard summary stats. */
export function getDashboardSummary(): DashboardSummary {
  return dashboardSummary;
}

// -- Uploaded Field Evidence (FastAPI) --------------------------------------

/**
 * Fetch persisted uploaded field evidence records from the FastAPI backend.
 *
 * Optionally filters by watershedId.
 */
export async function fetchUploadedEvidence(
  watershedId?: string,
): Promise<UploadedEvidence[]> {
  const query = watershedId ? `?watershedId=${encodeURIComponent(watershedId)}` : "";
  const url = `${API_BASE}/api/evidence${query}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch uploaded evidence: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.json() as Promise<UploadedEvidence[]>;
}

/**
 * Fetch a single uploaded field evidence record by ID from the FastAPI backend.
 */
export async function fetchUploadedEvidenceById(
  evidenceId: string,
): Promise<UploadedEvidence> {
  const url = `${API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch evidence ${evidenceId}: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.json() as Promise<UploadedEvidence>;
}

/**
 * Update verification status and review note for an uploaded evidence record.
 */
export async function updateEvidenceVerification(
  evidenceId: string,
  data: {
    status: "requires_verification" | "verified" | "rejected";
    reviewNote?: string;
  },
): Promise<UploadedEvidence> {
  const url = `${API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}/verification`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      detail.detail || `Failed to update verification: ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<UploadedEvidence>;
}


