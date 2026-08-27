import { Eye, EyeOff } from "lucide-react";
import type { LayerVisibility, MapLayerId } from "../../hooks/useMapLayers";

interface LayerDef {
  id: MapLayerId;
  label: string;
  color: string;
}

const LAYERS: LayerDef[] = [
  { id: "boundary", label: "Watershed Boundary", color: "#2563eb" },
  { id: "interventions", label: "Interventions", color: "#2563eb" },
  { id: "evidence", label: "Field Evidence", color: "#16a34a" },
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
    <div className="leaflet-control bg-white rounded-md shadow-md border border-gray-200 w-52 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          Map Layers
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xs"
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
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0 border"
                  style={{
                    backgroundColor: visible ? layer.color : "transparent",
                    borderColor: layer.color,
                  }}
                />
                <span
                  className={`flex-1 text-left ${visible ? "text-gray-700" : "text-gray-400"}`}
                >
                  {layer.label}
                </span>
                {visible ? (
                  <Eye size={12} className="text-gray-400" />
                ) : (
                  <EyeOff size={12} className="text-gray-300" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
