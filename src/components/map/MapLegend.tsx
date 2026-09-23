import type { LayerVisibility } from "../../hooks/useMapLayers";

interface LegendEntry {
  label: string;
  color: string;
  type: "line" | "fill" | "dot";
  layerKey: keyof LayerVisibility;
}

const ENTRIES: LegendEntry[] = [
  { label: "Watershed Boundary", color: "#3b82f6", type: "line", layerKey: "boundary" },
  { label: "Intervention", color: "#60a5fa", type: "dot", layerKey: "interventions" },
  { label: "Prototype Evidence", color: "#10b981", type: "dot", layerKey: "evidence" },
  { label: "Uploaded Evidence", color: "#a855f7", type: "dot", layerKey: "uploadedEvidence" },
  { label: "Positive Change", color: "#10b981", type: "fill", layerKey: "priorityZones" },
  { label: "Negative Change", color: "#f43f5e", type: "fill", layerKey: "priorityZones" },
];

export function MapLegend({ visibility }: { visibility: LayerVisibility }) {
  const visibleEntries = ENTRIES.filter((e) => visibility[e.layerKey]);
  if (visibleEntries.length === 0) return null;

  return (
    <div className="leaflet-control bg-gis-surface/95 backdrop-blur-md rounded-lg shadow-xl border border-gis-border px-3.5 py-2.5 space-y-1.5 text-gis-text">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim mb-1">
        Legend
      </div>
      {visibleEntries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-2 text-[11px] text-gis-text font-medium">
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
        className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-gis-surface"
        style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}` }}
      />
    );
  }
  if (type === "fill") {
    return (
      <span
        className="w-3 h-2.5 rounded-xs shrink-0"
        style={{ backgroundColor: color, opacity: 0.55 }}
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
