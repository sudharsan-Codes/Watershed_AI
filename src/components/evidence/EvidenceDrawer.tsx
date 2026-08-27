import { Map as MapIcon, Sparkles, X } from "lucide-react";
import { Badge } from "../common/Badge";
import { getInterventionById } from "../../data/interventions";
import { getWatershedById } from "../../data/watersheds";
import type { FieldEvidence } from "../../types";

export function EvidenceDrawer({
  evidence,
  onClose,
  onViewOnMap,
}: {
  evidence: FieldEvidence;
  onClose: () => void;
  onViewOnMap: () => void;
}) {
  const intervention = getInterventionById(evidence.interventionId);
  const watershed = getWatershedById(evidence.watershedId);
  const dateLabel = new Date(evidence.captureDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Selected Evidence
        </span>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
          <X size={15} />
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto">
        <div className="relative rounded-md overflow-hidden bg-gray-100">
          <img src={evidence.imageUrl} alt={intervention?.code ?? "Field evidence"} className="w-full h-40 object-cover" />
          <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
            Prototype Demonstration Data
          </span>
        </div>

        <dl className="text-[13px] space-y-2">
          <Row label="Capture Date" value={dateLabel} />
          <Row
            label="GPS Coordinates"
            value={`${evidence.latitude.toFixed(4)}° N, ${evidence.longitude.toFixed(4)}° E`}
          />
          <Row label="Watershed" value={watershed?.name ?? "—"} />
          <Row label="Intervention" value={intervention?.code ?? "—"} />
          <div className="flex items-center justify-between">
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Verification</dt>
            <dd>
              <Badge tone={evidence.verificationStatus === "Field Verified" ? "success" : "warning"}>
                {evidence.verificationStatus}
              </Badge>
            </dd>
          </div>
        </dl>

        {evidence.aiClassification && (
          <div className="border border-brand-100 bg-brand-50/60 rounded-md p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 mb-1">
              <Sparkles size={12} />
              AI-Assisted Classification
            </div>
            <div className="text-sm font-semibold text-gray-800">
              {evidence.aiClassification.label}
              <span className="ml-2 text-xs font-normal text-gray-500">
                {Math.round(evidence.aiClassification.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 leading-snug">
              Model-generated suggestion, not verified ground truth. Confirm against field records.
            </p>
          </div>
        )}

        <button
          onClick={onViewOnMap}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md py-2 transition-colors"
        >
          <MapIcon size={13} />
          View on Map
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-800 font-medium text-right">{value}</dd>
    </div>
  );
}
