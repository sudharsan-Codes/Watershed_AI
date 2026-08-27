import { MapPin, GitCompareArrows } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { CompareSlider } from "../components/analytics/CompareSlider";
import { satelliteAnalysisByWatershed } from "../data/analysis";
import type { Watershed } from "../types";

// Prototype Demonstration Data — synthetic satellite-style imagery for the SIH26015 hackathon prototype.
// These images are NOT live satellite processing output. They illustrate the intended
// before/after comparison workflow using spatially-consistent demonstration imagery.
const BEFORE_IMG = "/demo-watershed-a-2023.jpg";
const AFTER_IMG = "/demo-watershed-a-2026.jpg";

export default function SatelliteAnalysis() {
  const { watershed } = useOutletContext<{ watershed: Watershed }>();
  const analysis = satelliteAnalysisByWatershed[watershed.id];
  const navigate = useNavigate();

  if (!analysis) {
    return <div className="p-6 text-sm text-gray-400">No satellite analysis available for this watershed.</div>;
  }

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Satellite Analysis</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <LabeledSelect label="Watershed" value={watershed.name} />
          <LabeledSelect label="Indicator" value={analysis.indicator} />
          <DateField label="Date A" value={analysis.dateA} />
          <span className="text-gray-300">→</span>
          <DateField label="Date B" value={analysis.dateB} />
        </div>
      </div>

      <div className="relative flex-1 min-h-[360px]">
        <CompareSlider
          beforeSrc={BEFORE_IMG}
          afterSrc={AFTER_IMG}
          beforeLabel="2023"
          afterLabel="2026"
        />

        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-md px-5 py-3 flex items-center gap-6">
          <Stat label="Demonstration NDVI Before" value={analysis.before.toFixed(2)} />
          <Stat label="Demonstration NDVI After" value={analysis.after.toFixed(2)} />
          <Stat label="Observed Change" value={`+${analysis.observedChange.toFixed(2)}`} tone="emerald" />
        </div>
      </div>

      {/* Analysis context metadata */}
      <div className="mt-8 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap text-[11px] text-gray-500">
          <MetaItem label="Watershed" value={watershed.name} />
          <MetaItem label="Comparison" value="2023 → 2026" />
          <MetaItem label="Indicator" value="NDVI (Vegetation)" />
          <MetaItem label="Data Status" value="Prototype Demonstration Data" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/watersheds/${watershed.id}/gis-map`)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300 rounded-md px-2.5 py-1.5 bg-white hover:bg-brand-50 transition-colors"
          >
            <MapPin size={12} />
            View on Map
          </button>
          <button
            onClick={() => navigate(`/watersheds/${watershed.id}/change-detection`)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300 rounded-md px-2.5 py-1.5 bg-white hover:bg-brand-50 transition-colors"
          >
            <GitCompareArrows size={12} />
            View Change Detection
          </button>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        Demonstration imagery for SIH26015 prototype — not live satellite processing. NDVI values shown are prototype demonstration indicators, not dynamically computed from the displayed imagery.
      </p>
    </div>
  );
}

function LabeledSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white">
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}

function DateField({ label, value }: { label: string; value: string }) {
  const formatted = new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white">
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium text-gray-700">{formatted}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={["text-base font-bold", tone === "emerald" ? "text-emerald-600" : "text-gray-800"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-gray-400">{label}:</span>{" "}
      <span className="font-medium text-gray-600">{value}</span>
    </span>
  );
}
