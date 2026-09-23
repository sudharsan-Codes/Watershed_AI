import { CheckCircle, Map as MapIcon, Sparkles, X, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "../common/Badge";
import { getInterventionById } from "../../data/interventions";
import { getWatershedById } from "../../data/watersheds";
import { updateEvidenceVerification } from "../../services/gisService";
import type {
  EvidenceVerificationStatus,
  FieldEvidence,
  UploadedEvidence,
} from "../../types";

export function EvidenceDrawer({
  evidence,
  onClose,
  onViewOnMap,
  onVerificationUpdated,
}: {
  evidence: FieldEvidence | UploadedEvidence;
  onClose: () => void;
  onViewOnMap: () => void;
  onVerificationUpdated?: (updated: UploadedEvidence) => void;
}) {
  const [actionState, setActionState] = useState<"idle" | "verifying" | "rejecting" | "re-evaluating">("idle");
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isUploaded = "source" in evidence && evidence.source === "uploaded";

  const handleConfirmVerification = async (targetStatus: EvidenceVerificationStatus) => {
    if (!isUploaded) return;
    const upEv = evidence as UploadedEvidence;

    if (targetStatus === "rejected" && !reviewNote.trim()) {
      setActionError("Rejection reason is required.");
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const updated = await updateEvidenceVerification(upEv.id, {
        status: targetStatus,
        reviewNote: reviewNote.trim() || undefined,
      });
      setActionState("idle");
      setReviewNote("");
      if (onVerificationUpdated) {
        onVerificationUpdated(updated);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  if (isUploaded) {
    const upEv = evidence as UploadedEvidence;
    const verificationStatus = upEv.verification?.status ?? "requires_verification";
    const dateLabel = upEv.captureTimestamp
      ? new Date(upEv.captureTimestamp).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Not available";

    return (
      <div className="w-80 shrink-0 bg-gis-surface border-l border-gis-border flex flex-col h-full z-10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gis-border">
          <span className="text-xs font-bold uppercase tracking-wider text-gis-text-dim">
            Selected Evidence
          </span>
          <button onClick={onClose} aria-label="Close" className="text-gis-text-dim hover:text-gis-text transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Photo preview */}
          <div className="relative rounded-lg overflow-hidden bg-gis-card border border-gis-border">
            <img
              src={`http://localhost:8000/uploads/${upEv.storedFilename}`}
              alt={upEv.filename}
              className="w-full h-44 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="absolute top-2 left-2 text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow">
              Uploaded Evidence
            </span>
          </div>

          <div className="font-semibold text-gis-text text-xs truncate" title={upEv.filename}>
            {upEv.filename}
          </div>

          {/* Verification Workflow Panel */}
          <div className="border border-gis-border bg-gis-card rounded-lg p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gis-text-dim">
                Verification
              </span>
              {verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle size={11} /> Field Verified
                </span>
              )}
              {verificationStatus === "rejected" && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <XCircle size={11} /> Rejected
                </span>
              )}
              {verificationStatus === "requires_verification" && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ⚠ Requires Review
                </span>
              )}
            </div>

            {/* Reviewer Details */}
            {upEv.verification?.verifiedBy && (
              <div className="text-[11px] text-gis-text-muted space-y-1 border-t border-gis-border pt-2.5">
                <div>
                  Reviewer: <span className="font-semibold text-gis-text">{upEv.verification.verifiedBy}</span>
                </div>
                {upEv.verification.verifiedAt && (
                  <div>
                    Timestamp:{" "}
                    <span className="font-semibold text-gis-text">
                      {new Date(upEv.verification.verifiedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {upEv.verification.reviewNote && (
                  <div className="mt-1.5 bg-gis-surface p-2.5 rounded border border-gis-border text-gis-text text-[11px] leading-relaxed">
                    <span className="font-bold text-gis-text-dim block mb-0.5">Note:</span>
                    {upEv.verification.reviewNote}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {actionState === "idle" && (
              <div className="pt-1">
                {verificationStatus === "requires_verification" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setActionState("verifying");
                        setReviewNote("");
                        setActionError(null);
                      }}
                      className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded py-1.5 text-xs font-semibold transition-colors shadow-sm"
                    >
                      <CheckCircle size={12} />
                      Verify
                    </button>
                    <button
                      onClick={() => {
                        setActionState("rejecting");
                        setReviewNote("");
                        setActionError(null);
                      }}
                      className="flex items-center justify-center gap-1 border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 rounded py-1.5 text-xs font-semibold transition-colors"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActionState("re-evaluating");
                      setReviewNote(upEv.verification?.reviewNote ?? "");
                      setActionError(null);
                    }}
                    className="w-full text-center text-[11px] text-gis-text-dim hover:text-gis-text underline transition-colors"
                  >
                    Change Verification Decision
                  </button>
                )}
              </div>
            )}

            {/* Verification Form */}
            {(actionState === "verifying" || (actionState === "re-evaluating" && verificationStatus !== "verified")) && (
              <div className="bg-gis-surface border border-emerald-500/40 rounded-md p-3 space-y-2.5">
                <div className="text-xs font-bold text-emerald-400">
                  Confirm Field Verification
                </div>
                <div className="text-[11px] text-gis-text-muted space-y-0.5 bg-gis-card p-2 rounded border border-gis-border">
                  <div>GPS: {upEv.latitude ? `${upEv.latitude.toFixed(4)}°, ${upEv.longitude?.toFixed(4)}°` : "N/A"}</div>
                  <div>Watershed: {upEv.watershedMatch.watershedName ?? "Unmatched"}</div>
                  <div>Intervention: {upEv.nearestIntervention.code ?? "Unmatched"}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim block mb-1">
                    Review Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Confirmed on-site intervention."
                    className="w-full text-xs bg-gis-card border border-gis-border rounded px-2.5 py-1.5 text-gis-text placeholder:text-gis-text-dim outline-none focus:border-emerald-500"
                  />
                </div>
                {actionError && <div className="text-[11px] text-rose-400">{actionError}</div>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setActionState("idle"); setActionError(null); }}
                    disabled={submitting}
                    className="flex-1 py-1.5 border border-gis-border rounded text-xs text-gis-text-muted hover:bg-gis-card"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmVerification("verified")}
                    disabled={submitting}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded text-xs font-semibold shadow-sm"
                  >
                    {submitting ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}

            {/* Rejection Form */}
            {(actionState === "rejecting" || (actionState === "re-evaluating" && verificationStatus === "verified")) && (
              <div className="bg-gis-surface border border-rose-500/40 rounded-md p-3 space-y-2.5">
                <div className="text-xs font-bold text-rose-400">
                  Reject Field Evidence
                </div>
                <p className="text-[11px] text-gis-text-muted">
                  Please provide a clear reason for rejecting this evidence record.
                </p>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim block mb-1">
                    Rejection Reason (Required)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Photograph does not match coordinate terrain or intervention structure."
                    rows={2}
                    className="w-full text-xs bg-gis-card border border-gis-border rounded px-2.5 py-1.5 text-gis-text placeholder:text-gis-text-dim outline-none focus:border-rose-500 resize-none"
                  />
                </div>
                {actionError && <div className="text-[11px] text-rose-400">{actionError}</div>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setActionState("idle"); setActionError(null); }}
                    disabled={submitting}
                    className="flex-1 py-1.5 border border-gis-border rounded text-xs text-gis-text-muted hover:bg-gis-card"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmVerification("rejected")}
                    disabled={submitting || !reviewNote.trim()}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded text-xs font-semibold shadow-sm"
                  >
                    {submitting ? "Saving…" : "Reject"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <dl className="text-[13px] space-y-2 bg-gis-card border border-gis-border rounded-lg p-3">
            <Row label="Capture Date" value={dateLabel} />
            <Row
              label="GPS Coordinates"
              value={
                upEv.gpsAvailable && upEv.latitude != null && upEv.longitude != null
                  ? `${upEv.latitude.toFixed(5)}°, ${upEv.longitude.toFixed(5)}°`
                  : "Not available"
              }
            />
            <Row
              label="GPS Source"
              value={
                upEv.gpsSource === "EXIF"
                  ? "EXIF"
                  : upEv.gpsSource === "VISUAL_OVERLAY"
                    ? "Visual Overlay"
                    : "Not available"
              }
            />
            <Row
              label="GPS Confidence"
              value={
                upEv.gpsConfidence && upEv.gpsConfidence !== "NONE"
                  ? upEv.gpsConfidence.charAt(0).toUpperCase() + upEv.gpsConfidence.slice(1).toLowerCase()
                  : "None"
              }
            />
            <Row
              label="Watershed"
              value={upEv.watershedMatch.matched ? (upEv.watershedMatch.watershedName ?? "Matched") : "Not matched"}
            />
            <Row
              label="Intervention"
              value={
                upEv.nearestIntervention.matched
                  ? `${upEv.nearestIntervention.code} (${upEv.nearestIntervention.type})`
                  : "Not matched"
              }
            />
            {upEv.nearestIntervention.distanceMeters != null && (
              <Row
                label="Distance"
                value={`${Math.round(upEv.nearestIntervention.distanceMeters)} m`}
              />
            )}
            <Row label="Evidence Type" value="Uploaded Field Evidence" />
          </dl>

          {upEv.gpsAvailable && upEv.latitude != null && upEv.longitude != null && (
            <button
              onClick={onViewOnMap}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-md py-2.5 transition-colors shadow-sm"
            >
              <MapIcon size={14} />
              View on Map
            </button>
          )}
        </div>
      </div>
    );
  }

  const fieldEv = evidence as FieldEvidence;
  const intervention = getInterventionById(fieldEv.interventionId);
  const watershed = getWatershedById(fieldEv.watershedId);
  const dateLabel = new Date(fieldEv.captureDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="w-80 shrink-0 bg-gis-surface border-l border-gis-border flex flex-col h-full z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gis-border">
        <span className="text-xs font-bold uppercase tracking-wider text-gis-text-dim">
          Selected Evidence
        </span>
        <button onClick={onClose} aria-label="Close" className="text-gis-text-dim hover:text-gis-text transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="relative rounded-lg overflow-hidden bg-gis-card border border-gis-border">
          <img src={fieldEv.imageUrl} alt={intervention?.code ?? "Field evidence"} className="w-full h-44 object-cover" />
          <span className="absolute top-2 left-2 text-[10px] bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded font-medium">
            Prototype Demonstration Data
          </span>
        </div>

        <dl className="text-[13px] space-y-2 bg-gis-card border border-gis-border rounded-lg p-3">
          <Row label="Capture Date" value={dateLabel} />
          <Row
            label="GPS Coordinates"
            value={`${fieldEv.latitude.toFixed(4)}° N, ${fieldEv.longitude.toFixed(4)}° E`}
          />
          <Row label="Watershed" value={watershed?.name ?? "—"} />
          <Row label="Intervention" value={intervention?.code ?? "—"} />
          <div className="flex items-center justify-between">
            <dt className="text-[11px] uppercase font-bold tracking-wider text-gis-text-dim">Verification</dt>
            <dd>
              <Badge tone={fieldEv.verificationStatus === "Field Verified" ? "success" : "warning"}>
                {fieldEv.verificationStatus}
              </Badge>
            </dd>
          </div>
        </dl>

        {fieldEv.aiClassification && (
          <div className="border border-brand-500/30 bg-brand-500/10 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-400 mb-1">
              <Sparkles size={12} />
              AI-Assisted Classification (Prototype)
            </div>
            <div className="text-sm font-semibold text-gis-text">
              {fieldEv.aiClassification.label}
              <span className="ml-2 text-xs font-normal text-gis-text-muted">
                {Math.round(fieldEv.aiClassification.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-[10px] text-gis-text-dim mt-1.5 leading-snug">
              Demonstration prediction stub for SIH26015. Confirm against verified field records.
            </p>
          </div>
        )}

        <button
          onClick={onViewOnMap}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-md py-2.5 transition-colors shadow-sm"
        >
          <MapIcon size={14} />
          View on Map
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[11px] uppercase font-bold tracking-wider text-gis-text-dim">{label}</dt>
      <dd className="text-gis-text font-medium text-right">{value}</dd>
    </div>
  );
}
