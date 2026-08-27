import { Info } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import type { SatelliteAnalysis } from "../../types";

export function NdviPanel({ analysis }: { analysis: SatelliteAnalysis }) {
  return (
    <div className="leaflet-control bg-white rounded-md shadow-md border border-gray-200 w-64 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          Vegetation (NDVI)
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <Info size={11} />
          Info
        </span>
      </div>

      <div className="px-3 py-2.5 grid grid-cols-3 gap-2 text-center border-b border-gray-100">
        <div>
          <div className="text-[9px] uppercase text-gray-400 tracking-wide">Before (2023)</div>
          <div className="text-sm font-bold text-gray-800">{analysis.before.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-gray-400 tracking-wide">After (2026)</div>
          <div className="text-sm font-bold text-gray-800">{analysis.after.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-gray-400 tracking-wide">Observed Change</div>
          <div className="text-sm font-bold text-emerald-600">+{analysis.observedChange.toFixed(2)}</div>
        </div>
      </div>

      <div className="h-14 px-2 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analysis.timeseries}>
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Bar dataKey="value" fill="#34d399" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-gray-400 px-3 pb-2.5 leading-snug">{analysis.note}</p>
    </div>
  );
}
