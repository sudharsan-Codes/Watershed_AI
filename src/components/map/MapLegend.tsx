import type { LayerVisibility } from "../../hooks/useMapLayers";

interface LegendEntry {
  label: string;
  color: string;
  type: "line" | "fill" | "dot";
  layerKey: keyof LayerVisibility;
}

const ENTRIES: LegendEntry[] = [
  { label: "Watershed Boundary", color: "#2563eb", type: "line", layerKey: "boundary" },
  { label: "Intervention", color: "#2563eb", type: "dot", layerKey: "interventions" },
  { label: "Field Evidence", color: "#16a34a", type: "dot", layerKey: "evidence" },
  { label: "Positive Change", color: "#22c55e", type: "fill", layerKey: "priorityZones" },
  { label: "Negative Change", color: "#f87171", type: "fill", layerKey: "priorityZones" },
];

export function MapLegend({ visibility }: { visibility: LayerVisibility }) {
  const visibleEntries = ENTRIES.filter((e) => visibility[e.layerKey]);
  if (visibleEntries.length === 0) return null;

  return (
    <div className="leaflet-control bg-white/95 rounded-md shadow-sm border border-gray-200 px-2.5 py-2 space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
        Legend
      </div>
      {visibleEntries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-2 text-[11px] text-gray-600">
          <Swatch type={entry.type} color={entry.color} />
          {entry.label}
        </div>
      ))}
    </div>
  );
}

function Swatch({ type, color }: { type: "line" | "fill" | "dot"; color: string }) {
  if (type === "dot") {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-white"
        style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}` }}
      />
    );
  }
  if (type === "fill") {
    return (
      <span
        className="w-3 h-2.5 rounded-sm shrink-0"
        style={{ backgroundColor: color, opacity: 0.45 }}
      />
    );
  }
  // line
  return (
    <span
      className="w-3 h-0 shrink-0 border-t-2"
      style={{ borderColor: color }}
    />
  );
}
