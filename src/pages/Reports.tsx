import { FileText } from "lucide-react";
import { changeDetectionByWatershed, satelliteAnalysisByWatershed } from "../data/analysis";
import { fieldEvidence } from "../data/evidence";
import { interventions } from "../data/interventions";
import { watersheds } from "../data/watersheds";

export default function Reports() {
  const watershed = watersheds[0];
  const analysis = satelliteAnalysisByWatershed[watershed.id];
  const changeResult = changeDetectionByWatershed[watershed.id];
  const wsInterventions = interventions.filter((i) => i.watershedId === watershed.id);
  const wsEvidence = fieldEvidence.filter((e) => e.watershedId === watershed.id);
  const verifiedCount = wsEvidence.filter((e) => e.verificationStatus === "Field Verified").length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={18} className="text-brand-600" />
        <h1 className="text-lg font-semibold text-gray-800">Watershed Assessment Report</h1>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Prototype report generation workflow — observed data is separated from interpretation below.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Watershed</h2>
          <p className="text-sm text-gray-700">
            {watershed.name} — {watershed.district}, {watershed.state} ·{" "}
            {watershed.areaHectares.toLocaleString("en-IN")} ha
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Interventions</h2>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
            {wsInterventions.map((iv) => (
              <li key={iv.id}>
                {iv.code} — {iv.type} ({iv.status})
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Field Evidence</h2>
          <p className="text-sm text-gray-700">
            {wsEvidence.length} records collected · {verifiedCount} field verified
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Observed Change (Data)
          </h2>
          {analysis && (
            <p className="text-sm text-gray-700">
              NDVI: {analysis.before.toFixed(2)} → {analysis.after.toFixed(2)} (
              {analysis.dateA.slice(0, 4)}–{analysis.dateB.slice(0, 4)})
            </p>
          )}
          {changeResult && (
            <ul className="text-sm text-gray-700 list-disc list-inside mt-1 space-y-0.5">
              {changeResult.metrics.map((m) => (
                <li key={m.label}>
                  {m.label}: {m.percentChange > 0 ? "+" : ""}
                  {m.percentChange}%
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Interpretation
          </h2>
          <p className="text-sm text-gray-500">
            {changeResult?.interpretation} Field verification is required before these indicative
            changes are attributed to specific interventions.
          </p>
        </section>
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        Generated from Prototype Demonstration Data for SIH26015. Not a verified government record.
      </p>
    </div>
  );
}
