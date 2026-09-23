import { Badge } from "../components/common/Badge";
import { priorityAreas } from "../data/analysis";
import { getWatershedById } from "../data/watersheds";

const severityTone = { High: "danger", Medium: "warning", Low: "neutral" } as const;

export default function PriorityAreas() {
  return (
    <div className="p-6 max-w-4xl space-y-4 bg-gis-bg text-gis-text">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gis-text">Priority Areas</h1>
          <p className="text-xs text-gis-text-muted mt-0.5">
            Indicative zones flagged from change-detection prototype. Requires ground field verification.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-semibold uppercase tracking-wider">
          Demonstration Mode
        </span>
      </div>

      <div className="bg-gis-card border border-gis-border rounded-xl divide-y divide-gis-border overflow-hidden shadow-sm">
        {priorityAreas.map((area) => {
          const watershed = getWatershedById(area.watershedId);
          return (
            <div key={area.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gis-surface/50 transition-colors">
              <div>
                <div className="text-sm font-bold text-gis-text">{area.label}</div>
                <div className="text-xs text-gis-text-muted mt-0.5">
                  {watershed?.name} · {area.reason}
                </div>
              </div>
              <Badge tone={severityTone[area.severity]}>{area.severity} Priority</Badge>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gis-text-dim">
        Priority scores and zone boundaries are demonstration indicators for SIH26015.
      </p>
    </div>
  );
}
