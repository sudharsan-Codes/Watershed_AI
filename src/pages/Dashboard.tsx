import { Link, useOutletContext } from "react-router-dom";
import { Badge } from "../components/common/Badge";
import { MetricCard } from "../components/dashboard/MetricCard";
import { dashboardSummary, priorityAreas } from "../data/analysis";
import { fieldEvidence } from "../data/evidence";
import { getInterventionById } from "../data/interventions";
import type { Watershed } from "../types";

const severityTone = { High: "danger", Medium: "warning", Low: "neutral" } as const;

export default function Dashboard() {
  const { watershed } = useOutletContext<{ watershed: Watershed }>();
  const recentEvidence = fieldEvidence.filter((e) => e.watershedId === watershed.id).slice(0, 4);
  const areas = priorityAreas.filter((p) => p.watershedId === watershed.id);

  return (
    <div className="p-5 space-y-4 max-w-7xl">
      <div className="flex gap-4 flex-wrap">
        <MetricCard label="Active Watersheds" value={dashboardSummary.activeWatersheds.toString()} />
        <MetricCard
          label="Monitored Interventions"
          value={dashboardSummary.monitoredInterventions.toLocaleString("en-IN")}
          delta={`+${dashboardSummary.interventionsDelta} vs previous period`}
        />
        <MetricCard
          label="Field Evidence"
          value={dashboardSummary.fieldEvidenceCount.toLocaleString("en-IN")}
          delta={`+${dashboardSummary.fieldEvidenceDelta} vs previous period`}
        />
        <MetricCard
          variant="change"
          label="Vegetation Change"
          value={`+${dashboardSummary.vegetationChangePct}%`}
          caption="Observed change"
        />
        <MetricCard
          variant="change"
          label="Water Area Change"
          value={`+${dashboardSummary.waterAreaChangePct}%`}
          caption="Observed change"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gis-card border border-gis-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gis-text-dim">
              Recent Field Evidence (Prototype)
            </h2>
            <Link to="field-evidence" className="text-xs text-brand-400 font-semibold hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gis-border">
            {recentEvidence.map((ev) => {
              const intervention = getInterventionById(ev.interventionId);
              return (
                <li key={ev.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-gis-text">{intervention?.code ?? "Unlinked"}</div>
                    <div className="text-[11px] text-gis-text-dim">
                      {new Date(ev.captureDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <Badge tone={ev.verificationStatus === "Field Verified" ? "success" : "warning"}>
                    {ev.verificationStatus}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-gis-card border border-gis-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gis-text-dim">
              Priority Areas (Indicative)
            </h2>
            <Link to="/priority-areas" className="text-xs text-brand-400 font-semibold hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gis-border">
            {areas.map((area) => (
              <li key={area.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-gis-text">{area.label}</div>
                  <div className="text-[11px] text-gis-text-dim">{area.reason}</div>
                </div>
                <Badge tone={severityTone[area.severity]}>{area.severity}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-gis-text-dim">
        Metrics above are Prototype Demonstration Data for SIH26015 and do not represent verified government measurements.
      </p>
    </div>
  );
}
