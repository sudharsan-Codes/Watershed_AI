import { Info } from "lucide-react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { useNavigate, useOutletContext } from "react-router-dom";
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
  const navigate = useNavigate();

  if (!result) {
    return <div className="p-6 text-sm text-gis-text-muted">No change-detection results for this watershed.</div>;
  }

  const bounds = geo?.bounds ?? ([
    [10.99, 76.93],
    [11.04, 76.98],
  ] as [[number, number], [number, number]]);

  return (
    <div className="flex h-full bg-gis-bg text-gis-text">
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
                color: zone.properties?.severity === "positive" ? "#10b981" : "#ef4444",
                weight: 1.5,
                fillColor: zone.properties?.severity === "positive" ? "#10b981" : "#ef4444",
                fillOpacity: 0.4,
              }}
            />
          ))}
          <MapControls homeBounds={bounds} />
        </MapContainer>

        <div className="absolute top-3 right-3 z-[400] bg-gis-surface/95 backdrop-blur-md border border-gis-border rounded-lg shadow-xl px-3.5 py-2.5 text-[11px] text-gis-text">
          <div className="font-bold text-gis-text-dim mb-1.5 uppercase tracking-wider text-[10px]">
            Difference Layer
          </div>
          <div className="flex items-center gap-2 mb-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shadow-xs" />
            Positive Change
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 shadow-xs" />
            Negative Change
          </div>
        </div>
      </div>

      <div className="w-80 shrink-0 bg-gis-surface border-l border-gis-border p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gis-text">Spatial Change Detection</h2>
          <span className="text-[10px] px-2 py-0.5 bg-gis-card text-gis-text-muted border border-gis-border rounded font-medium">
            Prototype
          </span>
        </div>

        <div className="space-y-2">
          {result.metrics.map((m) => (
            <div
              key={m.label}
              className={[
                "rounded-lg px-3.5 py-2.5 flex items-center justify-between border",
                m.polarity === "positive"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30",
              ].join(" ")}
            >
              <span className="text-xs font-semibold text-gis-text">{m.label}</span>
              <span
                className={[
                  "text-sm font-bold",
                  m.polarity === "positive" ? "text-emerald-400" : "text-rose-400",
                ].join(" ")}
              >
                {m.percentChange > 0 ? "+" : ""}
                {m.percentChange}%
              </span>
            </div>
          ))}
        </div>

        <div className="border border-gis-border bg-gis-card rounded-lg p-3.5 space-y-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gis-text-dim uppercase tracking-wider">
            <Info size={13} className="text-brand-400" />
            Interpretation
          </div>
          <p className="text-[12px] text-gis-text-muted leading-relaxed">{result.interpretation}</p>
          {result.requiresFieldVerification && (
            <div className="pt-1">
              <Badge tone="warning">Requires Field Verification</Badge>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/reports")}
          className="w-full text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-md py-2.5 transition-colors shadow-sm"
        >
          View Assessment Report
        </button>
      </div>
    </div>
  );
}
