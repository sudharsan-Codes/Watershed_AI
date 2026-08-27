import type { Watershed } from "../types";

// Prototype Demonstration Data — not sourced from live government records.
export const watersheds: Watershed[] = [
  {
    id: "ws-demo-a",
    name: "Demo Watershed A",
    district: "Coimbatore",
    state: "Tamil Nadu",
    areaHectares: 1248,
    status: "Under Monitoring",
    boundaryGeoJsonId: "ws-demo-a-boundary",
    centerLat: 11.0168,
    centerLng: 76.9558,
  },
];

export const getWatershedById = (id: string): Watershed | undefined =>
  watersheds.find((w) => w.id === id);
