// Core domain types for WATERSIGHT AI
// NOTE: All numeric "demo" values referenced in comments/data files are
// Prototype Demonstration Data for SIH26015 and are not real government measurements.

export type VerificationStatus = "Field Verified" | "Requires Verification" | "Unverified";

export interface Watershed {
  id: string;
  name: string;
  district: string;
  state: string;
  areaHectares: number;
  status: "Under Monitoring" | "Not Monitored" | "Priority";
  boundaryGeoJsonId: string;
  centerLat: number;
  centerLng: number;
}

export interface Intervention {
  id: string;
  code: string; // e.g. "Check Dam 024"
  type: "Check Dam" | "Farm Pond" | "Contour Trench" | "Percolation Tank" | "Afforestation";
  watershedId: string;
  latitude: number;
  longitude: number;
  status: "Active" | "Planned" | "Completed";
}

export interface FieldEvidence {
  id: string;
  imageUrl: string;
  captureDate: string; // ISO date
  latitude: number;
  longitude: number;
  watershedId: string;
  interventionId: string;
  verificationStatus: VerificationStatus;
  aiClassification?: AIClassificationResult;
}

export interface AIClassificationResult {
  label: string; // e.g. "Check Dam"
  confidence: number; // 0-1
  modelConnected: boolean; // false = using demo/stub service
}

export interface NdviDataPoint {
  year: number;
  value: number;
}

export interface SatelliteAnalysis {
  watershedId: string;
  indicator: "NDVI (Vegetation)" | "Water Extent";
  dateA: string;
  dateB: string;
  before: number;
  after: number;
  observedChange: number;
  timeseries: NdviDataPoint[];
  note: string;
}

export interface ChangeDetectionMetric {
  label: "Vegetation" | "Water Bodies" | "Barren Land";
  percentChange: number;
  polarity: "positive" | "negative";
}

export interface ChangeDetectionResult {
  watershedId: string;
  metrics: ChangeDetectionMetric[];
  interpretation: string;
  requiresFieldVerification: boolean;
}

export interface PriorityArea {
  id: string;
  watershedId: string;
  label: string;
  severity: "High" | "Medium" | "Low";
  reason: string;
}

export interface DashboardSummary {
  activeWatersheds: number;
  monitoredInterventions: number;
  interventionsDelta: number;
  fieldEvidenceCount: number;
  fieldEvidenceDelta: number;
  vegetationChangePct: number;
  waterAreaChangePct: number;
  dataUpdatedAt: string;
  isDemoData: true;
}

export interface UploadedEvidenceWatershedMatch {
  matched: boolean;
  watershedId: string | null;
  watershedName: string | null;
  distanceMeters: number | null;
}

export interface UploadedEvidenceInterventionMatch {
  matched: boolean;
  interventionId: string | null;
  code: string | null;
  type: string | null;
  distanceMeters: number | null;
}

export interface UploadedEvidenceValidation {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export type EvidenceVerificationStatus = "requires_verification" | "verified" | "rejected";

export interface UploadedEvidenceVerification {
  status: EvidenceVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  reviewNote: string | null;
}

export type GPSSource = "EXIF" | "VISUAL_OVERLAY" | "NONE";
export type GPSConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type GPSStatus = "DETECTED" | "MISSING" | "NEEDS_REVIEW" | "INVALID" | "CONFLICT" | "VISUAL_GPS_UNAVAILABLE";
export type TimestampStatus = "DETECTED" | "MISSING" | "NEEDS_REVIEW" | "UNAVAILABLE";

export interface ExtractedGPS {
  latitude: number | null;
  longitude: number | null;
  source: GPSSource;
  confidence: GPSConfidence;
  rawText?: string;
  status?: GPSStatus;
  conflictGps?: {
    latitude: number;
    longitude: number;
    source: GPSSource;
    rawText?: string;
  };
}

export interface ExtractedTimestamp {
  value: string | null;
  source: GPSSource;
  confidence: GPSConfidence;
  rawText?: string;
  status?: TimestampStatus;
}

export interface UploadedEvidence {
  id: string;
  filename: string;
  storedFilename: string;
  gpsAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
  gpsSource?: GPSSource;
  gpsConfidence?: GPSConfidence;
  gpsStatus?: GPSStatus;
  gpsRawText?: string;
  conflictGps?: {
    latitude: number;
    longitude: number;
    source: GPSSource;
    rawText?: string;
  };
  timestampAvailable: boolean;
  captureTimestamp: string | null;
  timestampSource?: GPSSource;
  timestampConfidence?: GPSConfidence;
  timestampStatus?: TimestampStatus;
  timestampRawText?: string;
  imageDimensions?: {
    width: number | null;
    height: number | null;
  };
  watershedMatch: UploadedEvidenceWatershedMatch;
  nearestIntervention: UploadedEvidenceInterventionMatch;
  validation: UploadedEvidenceValidation;
  verification: UploadedEvidenceVerification;
  source: "uploaded";
  createdAt: string;
}



