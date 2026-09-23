/**
 * Combined Evidence Location and Ingestion Pipeline for WATERSIGHT AI.
 *
 * Implements the full pipeline:
 * 1. Image
 * 2. EXIF GPS extraction
 * 3. Visual GPS OCR / Gemini Vision (if EXIF unavailable)
 * 4. Coordinate validation
 * 5. Watershed spatial matching
 * 6. Nearest intervention proximity matching
 * 7. Evidence verification record creation
 *
 * Priority Rule:
 * EXIF > VISUAL_OVERLAY > NONE
 *
 * Security & Trust Rule:
 * Never fabricate coordinates.
 */

import type {
  ExtractedGPS,
  ExtractedTimestamp,
  UploadedEvidence,
  UploadedEvidenceInterventionMatch,
  UploadedEvidenceValidation,
  UploadedEvidenceWatershedMatch,
} from "../types";
import { demoWatershedABoundary } from "../data/geo/demoWatershedA";
import { interventions } from "../data/interventions";
import { watersheds } from "../data/watersheds";
import { extractExifGPS, extractExifTimestamp } from "./imageMetadata";
import { extractVisualGPS, extractVisualTimestamp } from "./visualGpsExtraction";

/**
 * Extract GPS coordinates from evidence file using EXIF with fallback to Visual Overlay.
 */
export async function extractEvidenceLocation(file: File): Promise<ExtractedGPS> {
  const exifGPS = await extractExifGPS(file);

  if (exifGPS.latitude !== null && exifGPS.longitude !== null) {
    console.log(`[GPS] EXIF: found (${exifGPS.latitude}, ${exifGPS.longitude})`);
  } else {
    console.log("[GPS] EXIF: not found");
  }

  // Priority 1: If EXIF GPS is found, we still check for conflict if visual extraction is run, but we can prioritize EXIF
  if (exifGPS.latitude !== null && exifGPS.longitude !== null) {
    console.log("[GPS] Source: EXIF");
    return exifGPS;
  }

  // Priority 2: Fallback to Visual Overlay (Gemini Vision pixel inspection)
  const visualGPS = await extractVisualGPS(file);

  if (visualGPS.status === "VISUAL_GPS_UNAVAILABLE") {
    console.log("[GPS] Visual extraction: unavailable (API key not configured)");
    return visualGPS;
  }

  if (visualGPS.latitude !== null && visualGPS.longitude !== null) {
    console.log(`[GPS] Final Visual GPS Source: ${visualGPS.source} (${visualGPS.latitude}, ${visualGPS.longitude})`);
    return visualGPS;
  }

  if (visualGPS.status === "NEEDS_REVIEW" || visualGPS.status === "INVALID") {
    return visualGPS;
  }

  // Priority 3: None
  console.log("[GPS] Source: None");
  return {
    latitude: null,
    longitude: null,
    source: "NONE",
    confidence: "NONE",
    status: "MISSING",
  };
}

/**
 * Extract timestamp from evidence file using EXIF with fallback to Visual Overlay.
 */
export async function extractEvidenceTimestamp(file: File): Promise<ExtractedTimestamp> {
  const exifTimestamp = await extractExifTimestamp(file);
  if (exifTimestamp.value !== null) {
    return exifTimestamp;
  }

  const visualTimestamp = await extractVisualTimestamp(file);
  if (visualTimestamp.value !== null) {
    return visualTimestamp;
  }

  return {
    value: null,
    source: "NONE",
    confidence: "NONE",
    status: "MISSING",
  };
}

/**
 * Full Evidence Ingestion Pipeline.
 * Processes an uploaded image file and returns a complete UploadedEvidence record.
 */
export async function processEvidencePipeline(file: File): Promise<UploadedEvidence> {
  // 1. Extract GPS & Timestamp
  const gps = await extractEvidenceLocation(file);
  const timestamp = await extractEvidenceTimestamp(file);

  // 2. Validate coordinates
  const validation = validateCoordinates(gps);

  // 3. Match Watershed Boundary
  const watershedMatch = matchWatershedBoundary(gps.latitude, gps.longitude);

  // 4. Match Nearest Intervention
  const nearestIntervention = matchNearestIntervention(gps.latitude, gps.longitude);

  // 5. Generate Evidence Record
  const evidenceId = `ev-upload-${Math.random().toString(36).substring(2, 10)}`;
  const captureTimestamp = timestamp.value;

  const record: UploadedEvidence = {
    id: evidenceId,
    filename: file.name,
    storedFilename: file.name,
    gpsAvailable: gps.latitude !== null && gps.longitude !== null,
    latitude: gps.latitude,
    longitude: gps.longitude,
    gpsSource: gps.source,
    gpsConfidence: gps.confidence,
    gpsStatus: gps.status,
    gpsRawText: gps.rawText,
    conflictGps: gps.conflictGps,
    timestampAvailable: captureTimestamp !== null,
    captureTimestamp,
    timestampSource: timestamp.source,
    timestampConfidence: timestamp.confidence,
    timestampStatus: timestamp.status,
    timestampRawText: timestamp.rawText,
    watershedMatch,
    nearestIntervention,
    validation,
    verification: {
      status: "requires_verification",
      verifiedBy: null,
      verifiedAt: null,
      reviewNote: null,
    },
    source: "uploaded",
    createdAt: new Date().toISOString(),
  };

  return record;
}

// ---------------------------------------------------------------------------
// Spatial & Validation Helpers
// ---------------------------------------------------------------------------

function validateCoordinates(gps: ExtractedGPS): UploadedEvidenceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (gps.status === "CONFLICT") {
    warnings.push("GPS source conflict detected between EXIF metadata and visual camera overlay.");
  }

  if (gps.latitude === null || gps.longitude === null) {
    if (gps.status === "VISUAL_GPS_UNAVAILABLE") {
      errors.push("Gemini Vision API key is not configured.");
    } else if (gps.status === "NEEDS_REVIEW") {
      errors.push("Incomplete coordinates detected in image text. Manual verification required.");
    } else if (gps.status === "INVALID") {
      errors.push("Detected coordinates are outside valid geographic range [-90 to 90, -180 to 180].");
    } else {
      errors.push("No GPS coordinates detected from EXIF metadata or visible image text.");
    }
    return { valid: false, errors, warnings };
  }

  if (gps.latitude < -90 || gps.latitude > 90) {
    errors.push(`Latitude ${gps.latitude}° is outside valid range [-90, +90].`);
  }

  if (gps.longitude < -180 || gps.longitude > 180) {
    errors.push(`Longitude ${gps.longitude}° is outside valid range [-180, +180].`);
  }

  if (gps.source === "VISUAL_OVERLAY") {
    if (gps.confidence === "LOW") {
      warnings.push("Coordinates detected from visible image text. Manual verification recommended.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function matchWatershedBoundary(
  lat: number | null,
  lng: number | null,
): UploadedEvidenceWatershedMatch {
  if (lat === null || lng === null) {
    return {
      matched: false,
      watershedId: null,
      watershedName: null,
      distanceMeters: null,
    };
  }

  const boundary = demoWatershedABoundary;
  const poly = boundary.geometry.coordinates[0]; // array of [lng, lat]
  const inside = isPointInPolygon([lng, lat], poly);

  const ws = watersheds[0];
  if (inside) {
    return {
      matched: true,
      watershedId: ws?.id ?? "ws-demo-a",
      watershedName: ws?.name ?? "Demo Watershed A",
      distanceMeters: 0,
    };
  }

  // Calculate distance to centroid / boundary
  const centerLat = ws?.centerLat ?? 11.0168;
  const centerLng = ws?.centerLng ?? 76.9558;
  const dist = calculateHaversineMeters(lat, lng, centerLat, centerLng);

  return {
    matched: false,
    watershedId: ws?.id ?? "ws-demo-a",
    watershedName: ws?.name ?? "Demo Watershed A",
    distanceMeters: Math.round(dist),
  };
}

function matchNearestIntervention(
  lat: number | null,
  lng: number | null,
): UploadedEvidenceInterventionMatch {
  if (lat === null || lng === null || interventions.length === 0) {
    return {
      matched: false,
      interventionId: null,
      code: null,
      type: null,
      distanceMeters: null,
    };
  }

  let minDistance = Infinity;
  let nearest = interventions[0];

  for (const iv of interventions) {
    const d = calculateHaversineMeters(lat, lng, iv.latitude, iv.longitude);
    if (d < minDistance) {
      minDistance = d;
      nearest = iv;
    }
  }

  // 500m matching threshold
  const matched = minDistance <= 500;

  return {
    matched,
    interventionId: nearest.id,
    code: nearest.code,
    type: nearest.type,
    distanceMeters: Math.round(minDistance),
  };
}

export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPointInPolygon(point: [number, number], vs: number[][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
