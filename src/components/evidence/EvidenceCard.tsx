import { MapPin } from "lucide-react";
import { Badge } from "../common/Badge";
import { getInterventionById } from "../../data/interventions";
import type { FieldEvidence } from "../../types";

export function EvidenceCard({
  evidence,
  selected,
  onSelect,
}: {
  evidence: FieldEvidence;
  selected: boolean;
  onSelect: () => void;
}) {
  const intervention = getInterventionById(evidence.interventionId);
  const dateLabel = new Date(evidence.captureDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      onClick={onSelect}
      className={[
        "text-left bg-white rounded-lg border overflow-hidden transition-shadow hover:shadow-md",
        selected ? "border-brand-500 ring-1 ring-brand-500" : "border-gray-200",
      ].join(" ")}
    >
      <div className="relative h-28 bg-gray-100">
        <img src={evidence.imageUrl} alt={intervention?.code ?? "Field evidence"} className="w-full h-full object-cover" />
        <span className="absolute top-1.5 right-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
          {dateLabel}
        </span>
      </div>
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-gray-800 truncate">
            {intervention?.code ?? "Unlinked"}
          </span>
          <Badge tone={evidence.verificationStatus === "Field Verified" ? "success" : "warning"}>
            {evidence.verificationStatus}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
          <MapPin size={11} />
          {evidence.latitude.toFixed(4)}° N, {evidence.longitude.toFixed(4)}° E
        </div>
      </div>
    </button>
  );
}
