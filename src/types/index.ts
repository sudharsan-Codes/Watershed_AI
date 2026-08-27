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
