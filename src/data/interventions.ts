import type { Intervention } from "../types";

// Prototype Demonstration Data.
export const interventions: Intervention[] = [
  {
    id: "int-checkdam-024",
    code: "Check Dam 024",
    type: "Check Dam",
    watershedId: "ws-demo-a",
    latitude: 11.0168,
    longitude: 76.9558,
    status: "Active",
  },
  {
    id: "int-farmpond-012",
    code: "Farm Pond 012",
    type: "Farm Pond",
    watershedId: "ws-demo-a",
    latitude: 11.0122,
    longitude: 76.9511,
    status: "Active",
  },
  {
    id: "int-contourtrench-007",
    code: "Contour Trench 007",
    type: "Contour Trench",
    watershedId: "ws-demo-a",
    latitude: 11.019,
    longitude: 76.9602,
    status: "Active",
  },
];

export const getInterventionById = (id: string): Intervention | undefined =>
  interventions.find((i) => i.id === id);

export const getInterventionByCode = (code: string): Intervention | undefined =>
  interventions.find((i) => i.code === code);
