import { Eye, EyeOff } from "lucide-react";
import type { LayerVisibility, MapLayerId } from "../../hooks/useMapLayers";

interface LayerDef {
  id: MapLayerId;
  label: string;
  color: string;
}

const LAYERS: LayerDef[] = [
  { id: "boundary", label: "Watershed Boundary", color: "#3b82f6" },
  { id: "interventions", label: "Interventions", color: "#60a5fa" },
  { id: "evidence", label: "Prototype Evidence", color: "#10b981" },
  { id: "uploadedEvidence", label: "Uploaded Evidence", color: "#a855f7" },
  { id: "priorityZones", label: "Priority Zones", color: "#f59e0b" },
];

export function LayerPanel({
  visibility,
  onToggle,
  onClose,
}: {
  visibility: LayerVisibility;
  onToggle: (id: MapLayerId) => void;
  onClose: () => void;
}) {
  return (
    <div className="leaflet-control bg-gis-surface/95 backdrop-blur-md rounded-lg shadow-xl border border-gis-border w-56 overflow-hidden text-gis-text">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gis-border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gis-text-dim">
          Map Layers
        </span>
        <button
          onClick={onClose}
          className="text-gis-text-dim hover:text-gis-text text-xs p-1"
          aria-label="Close layers panel"
        >
          ✕
        </button>
      </div>

      <ul className="py-1.5">
        {LAYERS.map((layer) => {
          const visible = visibility[layer.id];
          return (
            <li key={layer.id}>
              <button
                onClick={() => onToggle(layer.id)}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs hover:bg-gis-card transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-xs shrink-0 border"
                  style={{
                    backgroundColor: visible ? layer.color : "transparent",
                    borderColor: layer.color,
                  }}
                />
                <span
                  className={`flex-1 text-left font-medium ${visible ? "text-gis-text" : "text-gis-text-dim"}`}
                >
                  {layer.label}
                </span>
                {visible ? (
                  <Eye size={13} className="text-brand-400" />
                ) : (
                  <EyeOff size={13} className="text-gis-text-dim" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
