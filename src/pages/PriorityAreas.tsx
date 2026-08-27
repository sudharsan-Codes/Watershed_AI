import { Badge } from "../components/common/Badge";
import { priorityAreas } from "../data/analysis";
import { getWatershedById } from "../data/watersheds";

const severityTone = { High: "danger", Medium: "warning", Low: "neutral" } as const;

export default function PriorityAreas() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-1">Priority Areas</h1>
      <p className="text-xs text-gray-400 mb-4">
        Indicative areas flagged from change-detection results. Requires field verification.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {priorityAreas.map((area) => {
          const watershed = getWatershedById(area.watershedId);
          return (
            <div key={area.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-800">{area.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {watershed?.name} · {area.reason}
                </div>
              </div>
              <Badge tone={severityTone[area.severity]}>{area.severity} Priority</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
