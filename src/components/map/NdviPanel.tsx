import { Info } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import type { SatelliteAnalysis } from "../../types";

export function NdviPanel({ analysis }: { analysis: SatelliteAnalysis }) {
  return (
    <div className="leaflet-control bg-gis-surface/95 backdrop-blur-md rounded-lg shadow-xl border border-gis-border w-64 overflow-hidden text-gis-text">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gis-border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gis-text-dim">
          Vegetation (NDVI)
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gis-text-dim">
          <Info size={11} />
          Prototype
        </span>
      </div>

      <div className="px-3.5 py-2.5 grid grid-cols-3 gap-2 text-center border-b border-gis-border">
        <div>
          <div className="text-[9px] uppercase text-gis-text-dim tracking-wide font-bold">Before (2023)</div>
          <div className="text-sm font-bold text-gis-text mt-0.5">{analysis.before.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-gis-text-dim tracking-wide font-bold">After (2026)</div>
          <div className="text-sm font-bold text-gis-text mt-0.5">{analysis.after.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-gis-text-dim tracking-wide font-bold">Change</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">+{analysis.observedChange.toFixed(2)}</div>
        </div>
      </div>

      <div className="h-14 px-2 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analysis.timeseries}>
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Bar dataKey="value" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-gis-text-dim px-3.5 pb-2.5 leading-snug">{analysis.note}</p>
    </div>
  );
}
