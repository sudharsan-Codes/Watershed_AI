import { Info } from "lucide-react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../components/common/Badge";
import { MapControls } from "../components/map/MapControls";
import { changeDetectionByWatershed } from "../data/analysis";
import { useWatershedGeo } from "../hooks/useWatershedGeo";
import type { Watershed } from "../types";
import "leaflet/dist/leaflet.css";

export default function ChangeDetection() {
  const { watershed } = useOutletContext<{ watershed: Watershed }>();
  const result = changeDetectionByWatershed[watershed.id];
  const { geo } = useWatershedGeo(watershed);

  if (!result) {
    return <div className="p-6 text-sm text-gray-400">No change-detection results for this watershed.</div>;
  }

  const bounds = geo?.bounds ?? ([
    [10.99, 76.93],
    [11.04, 76.98],
  ] as [[number, number], [number, number]]);

  return (
    <div className="flex h-full">
      <div className="relative flex-1 min-h-[480px]">
        <MapContainer bounds={bounds} className="h-full w-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {(geo?.priorityZones ?? []).map((zone, idx) => (
            <GeoJSON
              key={idx}
              data={zone}
              style={{
                color: zone.properties?.severity === "positive" ? "#16a34a" : "#dc2626",
                weight: 1,
                fillColor: zone.properties?.severity === "positive" ? "#22c55e" : "#f87171",
                fillOpacity: 0.35,
              }}
            />
          ))}
          <MapControls homeBounds={bounds} />
        </MapContainer>

        <div className="absolute top-2.5 right-2.5 z-[400] bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-[11px]">
          <div className="font-semibold text-gray-600 mb-1.5 uppercase tracking-wide text-[10px]">
            Difference Layer
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Positive Change
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Negative Change
          </div>
        </div>
      </div>

      <div className="w-72 shrink-0 bg-white border-l border-gray-200 p-4 space-y-3 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-800">Spatial Change Detection</h2>

        {result.metrics.map((m) => (
          <div
            key={m.label}
            className={[
              "rounded-md px-3 py-2.5 flex items-center justify-between border",
              m.polarity === "positive" ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100",
            ].join(" ")}
          >
            <span className="text-sm text-gray-700">{m.label}</span>
            <span
              className={[
                "text-sm font-bold",
                m.polarity === "positive" ? "text-emerald-600" : "text-red-600",
              ].join(" ")}
            >
              {m.percentChange > 0 ? "+" : ""}
              {m.percentChange}%
            </span>
          </div>
        ))}

        <div className="border border-gray-200 rounded-md p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
            <Info size={13} />
            Interpretation
          </div>
          <p className="text-[12px] text-gray-500 leading-snug mb-2">{result.interpretation}</p>
          {result.requiresFieldVerification && (
            <Badge tone="warning">Requires Field Verification</Badge>
          )}
        </div>

        <button className="w-full text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md py-2 transition-colors">
          Generate Difference Report
        </button>
      </div>
    </div>
  );
}
