import type { Feature, Polygon } from "geojson";

// Prototype Demonstration Data — an illustrative boundary, not a surveyed watershed polygon.
export const demoWatershedABoundary: Feature<Polygon> = {
  type: "Feature",
  properties: { id: "ws-demo-a-boundary", name: "Demo Watershed A" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [76.938, 11.032],
        [76.958, 11.038],
        [76.975, 11.028],
        [76.978, 11.008],
        [76.963, 10.995],
        [76.942, 10.999],
        [76.932, 11.015],
        [76.938, 11.032],
      ],
    ],
  },
};

export const priorityZones: Feature<Polygon>[] = [
  {
    type: "Feature",
    properties: { severity: "positive" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [76.948, 11.024],
          [76.958, 11.026],
          [76.956, 11.016],
          [76.947, 11.015],
          [76.948, 11.024],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: { severity: "negative" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [76.962, 11.004],
          [76.972, 11.006],
          [76.966, 10.997],
          [76.962, 11.004],
        ],
      ],
    },
  },
];
