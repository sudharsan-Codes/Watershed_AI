import type {
  ChangeDetectionResult,
  DashboardSummary,
  PriorityArea,
  SatelliteAnalysis,
} from "../types";

// Prototype Demonstration Data — indicative values for the SIH26015 hackathon prototype.
// These are NOT live satellite processing outputs or verified government measurements.

export const dashboardSummary: DashboardSummary = {
  activeWatersheds: 124,
  monitoredInterventions: 1842,
  interventionsDelta: 12,
  fieldEvidenceCount: 12480,
  fieldEvidenceDelta: 340,
  vegetationChangePct: 14.8,
  waterAreaChangePct: 8.6,
  dataUpdatedAt: "2026-08-24T08:30:00+05:30",
  isDemoData: true,
};

export const satelliteAnalysisByWatershed: Record<string, SatelliteAnalysis> = {
  "ws-demo-a": {
    watershedId: "ws-demo-a",
    indicator: "NDVI (Vegetation)",
    dateA: "2023-01-15",
    dateB: "2026-08-20",
    before: 0.31,
    after: 0.48,
    observedChange: 0.17,
    timeseries: [
      { year: 2023, value: 0.31 },
      { year: 2024, value: 0.37 },
      { year: 2025, value: 0.43 },
      { year: 2026, value: 0.48 },
    ],
    note:
      "Indicative vegetation increase observed within selected boundaries. Requires field verification.",
  },
};

export const changeDetectionByWatershed: Record<string, ChangeDetectionResult> = {
  "ws-demo-a": {
    watershedId: "ws-demo-a",
    metrics: [
      { label: "Vegetation", percentChange: 16.4, polarity: "positive" },
      { label: "Water Bodies", percentChange: 8.2, polarity: "positive" },
      { label: "Barren Land", percentChange: -11.7, polarity: "negative" },
    ],
    interpretation:
      "Observed vegetation increase within the selected boundary during the comparison period.",
    requiresFieldVerification: true,
  },
};

export const priorityAreas: PriorityArea[] = [
  {
    id: "pa-001",
    watershedId: "ws-demo-a",
    label: "North Ridge Sector",
    severity: "High",
    reason: "Indicative barren-land expansion; requires field verification.",
  },
  {
    id: "pa-002",
    watershedId: "ws-demo-a",
    label: "Lower Basin Outlet",
    severity: "Medium",
    reason: "Water-body boundary shift observed between comparison periods.",
  },
  {
    id: "pa-003",
    watershedId: "ws-demo-a",
    label: "East Slope Cluster",
    severity: "Low",
    reason: "Minor vegetation decline flagged for periodic review.",
  },
];
