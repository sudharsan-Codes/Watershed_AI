import type { FieldEvidence } from "../types";

// Prototype Demonstration Data — sample field photographs are illustrative imagery,
// not verified government field capture.
export const fieldEvidence: FieldEvidence[] = [
  {
    id: "ev-001",
    imageUrl: "/demo-check-dam.jpg",
    captureDate: "2026-08-20",
    latitude: 11.0168,
    longitude: 76.9558,
    watershedId: "ws-demo-a",
    interventionId: "int-checkdam-024",
    verificationStatus: "Field Verified",
    aiClassification: { label: "Check Dam", confidence: 0.92, modelConnected: false },
  },
  {
    id: "ev-002",
    imageUrl: "/demo-farm-pond.jpg",
    captureDate: "2026-08-18",
    latitude: 11.0122,
    longitude: 76.9511,
    watershedId: "ws-demo-a",
    interventionId: "int-farmpond-012",
    verificationStatus: "Requires Verification",
    aiClassification: { label: "Farm Pond", confidence: 0.78, modelConnected: false },
  },
  {
    id: "ev-003",
    imageUrl: "/demo-contour-trench.jpg",
    captureDate: "2026-08-15",
    latitude: 11.019,
    longitude: 76.9602,
    watershedId: "ws-demo-a",
    interventionId: "int-contourtrench-007",
    verificationStatus: "Field Verified",
    aiClassification: { label: "Contour Trench", confidence: 0.87, modelConnected: false },
  },
  {
    id: "ev-004",
    imageUrl: "/demo-farm-pond-2.jpg",
    captureDate: "2026-08-12",
    latitude: 11.021,
    longitude: 76.9487,
    watershedId: "ws-demo-a",
    interventionId: "int-farmpond-012",
    verificationStatus: "Field Verified",
  },
];

export const getEvidenceById = (id: string): FieldEvidence | undefined =>
  fieldEvidence.find((e) => e.id === id);
