import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, Layers, MapPin, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { changeDetectionByWatershed, satelliteAnalysisByWatershed } from "../data/analysis";
import { fieldEvidence } from "../data/evidence";
import { interventions } from "../data/interventions";
import { watersheds } from "../data/watersheds";
import { fetchUploadedEvidence } from "../services/gisService";
import type { UploadedEvidence, Watershed } from "../types";
import { exportEvidenceToCSV, exportReportToPDF } from "../utils/reportExport";

export interface UploadedEvidenceAudit {
  totalUploaded: number;
  gpsAvailable: number;
  gpsMissing: number;
  timestampAvailable: number;
  timestampMissing: number;
  watershedMatched: number;
  watershedUnmatched: number;
  interventionMatched: number;
  interventionUnmatched: number;
  validCount: number;
  needsReviewCount: number;
  verifiedCount: number;
  requiresVerificationCount: number;
  rejectedCount: number;
  verifiedPct: number;
  requiresVerificationPct: number;
  rejectedPct: number;
}

export function computeUploadedEvidenceAudit(items: UploadedEvidence[]): UploadedEvidenceAudit {
  const uploadedOnly = items.filter((item) => item.source === "uploaded");
  const total = uploadedOnly.length;

  let gpsAvail = 0;
  let gpsMiss = 0;
  let timeAvail = 0;
  let timeMiss = 0;
  let wsMatched = 0;
  let wsUnmatched = 0;
  let intMatched = 0;
  let intUnmatched = 0;
  let valid = 0;
  let needsReview = 0;
  let verified = 0;
  let requiresVerification = 0;
  let rejected = 0;

  for (const item of uploadedOnly) {
    // GPS
    if (item.gpsAvailable === true && item.latitude != null && item.longitude != null) {
      gpsAvail += 1;
    } else {
      gpsMiss += 1;
    }

    // Timestamp
    if (item.timestampAvailable === true && item.captureTimestamp != null) {
      timeAvail += 1;
    } else {
      timeMiss += 1;
    }

    // Watershed match
    if (item.watershedMatch?.matched === true) {
      wsMatched += 1;
    } else {
      wsUnmatched += 1;
    }

    // Intervention proximity match
    if (item.nearestIntervention?.matched === true) {
      intMatched += 1;
    } else {
      intUnmatched += 1;
    }

    // Ingestion validation
    if (item.validation?.valid === true) {
      valid += 1;
    } else {
      needsReview += 1;
    }

    // Verification decision
    const status = item.verification?.status ?? "requires_verification";
    if (status === "verified") {
      verified += 1;
    } else if (status === "rejected") {
      rejected += 1;
    } else {
      requiresVerification += 1;
    }
  }

  return {
    totalUploaded: total,
    gpsAvailable: gpsAvail,
    gpsMissing: gpsMiss,
    timestampAvailable: timeAvail,
    timestampMissing: timeMiss,
    watershedMatched: wsMatched,
    watershedUnmatched: wsUnmatched,
    interventionMatched: intMatched,
    interventionUnmatched: intUnmatched,
    validCount: valid,
    needsReviewCount: needsReview,
    verifiedCount: verified,
    requiresVerificationCount: requiresVerification,
    rejectedCount: rejected,
    verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
    requiresVerificationPct: total > 0 ? Math.round((requiresVerification / total) * 100) : 0,
    rejectedPct: total > 0 ? Math.round((rejected / total) * 100) : 0,
  };
}

export default function Reports() {
  const outletCtx = useOutletContext<{ watershed?: Watershed }>();
  const watershed = outletCtx?.watershed ?? watersheds[0];
  const [uploadedEvidence, setUploadedEvidence] = useState<UploadedEvidence[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Export states
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadEvidence = () => {
    setIsLoading(true);
    setFetchError(null);
    fetchUploadedEvidence()
      .then((data) => {
        setUploadedEvidence(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("[Reports] Failed to fetch uploaded evidence:", err);
        setFetchError(err instanceof Error ? err.message : "Failed to load uploaded evidence");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  const wsUploaded = useMemo(() => {
    return uploadedEvidence.filter((ev) => {
      if (ev.watershedMatch?.matched && ev.watershedMatch?.watershedId) {
        return ev.watershedMatch.watershedId === watershed.id;
      }
      return true;
    });
  }, [uploadedEvidence, watershed.id]);

  const audit = useMemo(() => computeUploadedEvidenceAudit(wsUploaded), [wsUploaded]);

  const analysis = satelliteAnalysisByWatershed[watershed.id];
  const changeResult = changeDetectionByWatershed[watershed.id];
  const wsInterventions = interventions.filter((i) => i.watershedId === watershed.id);
  const wsPrototypeEvidence = fieldEvidence.filter((e) => e.watershedId === watershed.id);
  const prototypeVerifiedCount = wsPrototypeEvidence.filter((e) => e.verificationStatus === "Field Verified").length;

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setExportFeedback(null);
      await exportReportToPDF(watershed, audit, wsUploaded);
      setExportFeedback({
        type: "success",
        message: "PDF print preview ready. Save as PDF or print directly from your browser dialog.",
      });
    } catch (err) {
      console.error("[Reports] Export PDF failed:", err);
      setExportFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to generate PDF report.",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    try {
      setIsExportingCsv(true);
      setExportFeedback(null);
      exportEvidenceToCSV(watershed, wsUploaded);
      setExportFeedback({
        type: "success",
        message: `CSV report generated successfully for ${wsUploaded.filter((i) => i.source === "uploaded").length} uploaded records.`,
      });
    } catch (err) {
      console.error("[Reports] Export CSV failed:", err);
      setExportFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to export CSV file.",
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-brand-400" />
            <h1 className="text-xl font-bold text-gis-text">Watershed Assessment Report</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export Actions */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isLoading || isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Export Watershed Assessment and Audit Report as PDF"
            >
              <Printer size={13} className={isExportingPdf ? "animate-spin" : ""} />
              <span>{isExportingPdf ? "Generating PDF…" : "Export PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isLoading || isExportingCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gis-surface hover:bg-gis-card text-gis-text border border-gis-border hover:border-gis-border-light shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Export Uploaded Field Evidence to CSV"
            >
              <FileSpreadsheet size={13} className={isExportingCsv ? "animate-spin" : ""} />
              <span>{isExportingCsv ? "Generating CSV…" : "Export CSV"}</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Demonstration Mode
            </span>
          </div>
        </div>

        <p className="text-xs text-gis-text-muted">
          Executive reporting workflow — observed data, verification audit, and satellite interpretation.
        </p>

        {/* Export Feedback Banner */}
        {exportFeedback && (
          <div
            className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
              exportFeedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {exportFeedback.type === "success" ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              )}
              <span>{exportFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportFeedback(null)}
              className="text-[11px] hover:underline px-1 py-0.5 rounded text-gis-text-dim hover:text-gis-text"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Main Report Container */}
      <div className="bg-gis-card border border-gis-border rounded-xl p-6 space-y-6 shadow-sm">
        {/* Section 1: Watershed Overview */}
        <section>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim mb-1.5 flex items-center gap-1.5">
            <MapPin size={12} className="text-brand-400" />
            Target Watershed
          </div>
          <div className="text-base font-semibold text-gis-text">
            {watershed.name}
          </div>
          <div className="text-xs text-gis-text-muted mt-0.5">
            {watershed.district}, {watershed.state} · Area: {watershed.areaHectares.toLocaleString("en-IN")} ha · Status: {watershed.status}
          </div>
        </section>

        {/* Section 2: Interventions Registry */}
        <section className="border-t border-gis-border pt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim mb-2 flex items-center gap-1.5">
            <Layers size={12} className="text-brand-400" />
            Monitored Interventions ({wsInterventions.length})
          </div>
          {wsInterventions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {wsInterventions.map((iv) => (
                <div key={iv.id} className="bg-gis-surface border border-gis-border rounded-md px-3 py-2 text-xs">
                  <div className="font-semibold text-gis-text">{iv.code}</div>
                  <div className="text-gis-text-muted text-[11px] flex justify-between mt-0.5">
                    <span>{iv.type}</span>
                    <span className="text-brand-400 font-medium">{iv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gis-text-muted italic">No interventions registered for this watershed.</p>
          )}
        </section>

        {/* Section 3: Evidence Verification Audit (Uploaded Field Evidence) */}
        <section className="border-t border-gis-border pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Evidence Verification Audit (Uploaded Field Evidence)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Live Registry Data
              </span>
              <button
                onClick={loadEvidence}
                disabled={isLoading}
                aria-label="Refresh audit data"
                className="p-1 rounded text-gis-text-dim hover:text-gis-text hover:bg-gis-surface transition-colors"
                title="Refresh uploaded evidence"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <p className="text-xs text-gis-text-muted mb-4">
            Audited metrics extracted from geo-coded field evidence uploaded to this watershed.
          </p>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-gis-text-muted bg-gis-surface rounded-lg border border-gis-border">
              <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-brand-400" />
              Loading uploaded evidence records…
            </div>
          ) : fetchError ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Failed to fetch uploaded evidence:</span>
                <span>{fetchError}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Comprehensive Audit Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* 1. Total Uploaded */}
                <div className="bg-gis-surface border border-gis-border rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gis-text-dim">
                    Total Uploaded
                  </div>
                  <div className="text-xl font-bold text-gis-text mt-1">
                    {audit.totalUploaded}
                  </div>
                  <div className="text-[10px] text-gis-text-muted mt-0.5">Ingested records</div>
                </div>

                {/* 2. GPS Metadata */}
                <div className="bg-gis-surface border border-gis-border rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gis-text-dim">
                    GPS Coordinates
                  </div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center justify-between">
                    <span>Available</span>
                    <span>{audit.gpsAvailable}</span>
                  </div>
                  <div className="text-xs text-rose-400 flex items-center justify-between mt-0.5">
                    <span>Missing</span>
                    <span>{audit.gpsMissing}</span>
                  </div>
                </div>

                {/* 3. Timestamp Metadata */}
                <div className="bg-gis-surface border border-gis-border rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gis-text-dim">
                    EXIF Timestamp
                  </div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center justify-between">
                    <span>Available</span>
                    <span>{audit.timestampAvailable}</span>
                  </div>
                  <div className="text-xs text-rose-400 flex items-center justify-between mt-0.5">
                    <span>Missing</span>
                    <span>{audit.timestampMissing}</span>
                  </div>
                </div>

                {/* 4. Validation Status */}
                <div className="bg-gis-surface border border-gis-border rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-gis-text-dim">
                    Validation Pipeline
                  </div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center justify-between">
                    <span>Valid</span>
                    <span>{audit.validCount}</span>
                  </div>
                  <div className="text-xs text-amber-400 flex items-center justify-between mt-0.5">
                    <span>Needs Review</span>
                    <span>{audit.needsReviewCount}</span>
                  </div>
                </div>
              </div>

              {/* Spatial Matching & Verification Decisions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* Spatial Matching Audit */}
                <div className="bg-gis-surface border border-gis-border rounded-lg p-3.5 space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-gis-text-dim">
                    Spatial Matching Audit
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-gis-border/60">
                      <span className="text-gis-text-muted">Watershed Matched:</span>
                      <span className="font-semibold text-emerald-400">{audit.watershedMatched}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gis-border/60">
                      <span className="text-gis-text-muted">Watershed Unmatched:</span>
                      <span className="font-semibold text-rose-400">{audit.watershedUnmatched}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gis-border/60">
                      <span className="text-gis-text-muted">Intervention Matched:</span>
                      <span className="font-semibold text-emerald-400">{audit.interventionMatched}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gis-text-muted">Intervention Unmatched:</span>
                      <span className="font-semibold text-rose-400">{audit.interventionUnmatched}</span>
                    </div>
                  </div>
                </div>

                {/* Verification Decisions */}
                <div className="bg-gis-surface border border-gis-border rounded-lg p-3.5 space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-gis-text-dim">
                    Verification Decisions
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-gis-border/60">
                      <span className="text-gis-text-muted">Verified:</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {audit.verifiedCount} {audit.totalUploaded > 0 ? `(${audit.verifiedPct}%)` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gis-border/60">
                      <span className="text-gis-text-muted">Requires Review:</span>
                      <span className="font-semibold text-amber-400">
                        {audit.requiresVerificationCount} {audit.totalUploaded > 0 ? `(${audit.requiresVerificationPct}%)` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gis-text-muted">Rejected:</span>
                      <span className="font-semibold text-rose-400">
                        {audit.rejectedCount} {audit.totalUploaded > 0 ? `(${audit.rejectedPct}%)` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {audit.totalUploaded > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs text-gis-text-muted bg-gis-surface/60 p-3 rounded-lg border border-gis-border space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gis-text">Field Verification Rate:</span>
                      <span className="text-emerald-400 font-bold text-sm">{audit.verifiedPct}%</span>
                    </div>
                    <div className="w-full bg-gis-card rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${audit.verifiedPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gis-text-dim pt-1">
                      * Ground truth confirmation requires explicit review by an authorized field reviewer. Only verified records are treated as confirmed evidence.
                    </p>
                  </div>

                  {/* Uploaded Evidence Records Table */}
                  <div className="bg-gis-surface border border-gis-border rounded-lg overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-gis-border flex items-center justify-between bg-gis-card/50">
                      <div className="text-xs font-bold text-gis-text flex items-center gap-2">
                        <span>Uploaded Field Evidence Records</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                          {wsUploaded.length} {wsUploaded.length === 1 ? "Record" : "Records"}
                        </span>
                      </div>
                      <span className="text-[10px] text-gis-text-dim uppercase tracking-wider">
                        Live Registry Data
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gis-border bg-gis-card/30 text-[11px] font-semibold text-gis-text-dim uppercase">
                            <th className="py-2 px-3">Filename</th>
                            <th className="py-2 px-3">GPS Coordinates</th>
                            <th className="py-2 px-3">Timestamp</th>
                            <th className="py-2 px-3">Watershed Match</th>
                            <th className="py-2 px-3">Intervention Match</th>
                            <th className="py-2 px-3">Validation</th>
                            <th className="py-2 px-3">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gis-border/60">
                          {wsUploaded.map((item) => {
                            const gpsText =
                              item.gpsAvailable && item.latitude != null && item.longitude != null
                                ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                                : "Not available";
                            const timeText = item.captureTimestamp || "Not available";
                            const wsMatchText = item.watershedMatch?.matched
                              ? item.watershedMatch.watershedName || "Matched"
                              : "Unmatched";
                            const intMatchText = item.nearestIntervention?.matched
                              ? `${item.nearestIntervention.code || "Matched"} (${item.nearestIntervention.type || "Intervention"})`
                              : "Unmatched";

                            return (
                              <tr key={item.id} className="hover:bg-gis-card/40 transition-colors">
                                <td className="py-2 px-3 font-medium text-gis-text">
                                  {item.filename}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-gis-text-muted">
                                  {gpsText}
                                </td>
                                <td className="py-2 px-3 text-gis-text-muted text-[11px]">
                                  {timeText}
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      item.watershedMatch?.matched
                                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                                        : "text-rose-400 bg-rose-500/10 border border-rose-500/30"
                                    }`}
                                  >
                                    {wsMatchText}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      item.nearestIntervention?.matched
                                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                                        : "text-rose-400 bg-rose-500/10 border border-rose-500/30"
                                    }`}
                                  >
                                    {intMatchText}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.validation?.valid
                                        ? "text-emerald-400 bg-emerald-500/10"
                                        : "text-amber-400 bg-amber-500/10"
                                    }`}
                                  >
                                    {item.validation?.valid ? "Valid" : "Needs Review"}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.verification?.status === "verified"
                                        ? "text-emerald-400 bg-emerald-500/10"
                                        : item.verification?.status === "rejected"
                                        ? "text-rose-400 bg-rose-500/10"
                                        : "text-amber-400 bg-amber-500/10"
                                    }`}
                                  >
                                    {item.verification?.status === "verified"
                                      ? "Verified"
                                      : item.verification?.status === "rejected"
                                      ? "Rejected"
                                      : "Requires Review"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gis-text-muted italic bg-gis-surface/60 p-3.5 rounded-lg border border-gis-border text-center">
                  No field evidence has been uploaded for this watershed yet. Upload geo-tagged photos in the Field Evidence tab.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 4: Prototype Demonstration Evidence */}
        <section className="border-t border-gis-border pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gis-text-dim">
              Prototype Demonstration Field Evidence
            </h2>
            <span className="text-[10px] bg-gis-surface text-gis-text-muted border border-gis-border px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wide">
              Prototype Demonstration Data
            </span>
          </div>
          <div className="bg-gis-surface border border-gis-border rounded-lg p-3.5 text-xs text-gis-text-muted flex justify-between items-center">
            <span>
              Synthetic demonstration records bundled for SIH26015 presentation:
            </span>
            <span className="font-semibold text-gis-text">
              {wsPrototypeEvidence.length} prototype records · {prototypeVerifiedCount} field verified
            </span>
          </div>
        </section>

        {/* Section 5: Observed Satellite Change (Demonstration Data) */}
        <section className="border-t border-gis-border pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gis-text-dim">
              Observed Change (Satellite Demonstration Data)
            </h2>
            <span className="text-[10px] bg-gis-surface text-gis-text-dim border border-gis-border px-2 py-0.5 rounded font-medium">
              Demo Model
            </span>
          </div>

          {analysis ? (
            <div className="bg-gis-surface border border-gis-border rounded-lg p-3.5 space-y-2 text-xs">
              <div className="text-gis-text">
                <span className="text-gis-text-dim font-medium">Indicator:</span> {analysis.indicator} ({analysis.dateA.slice(0, 4)} → {analysis.dateB.slice(0, 4)})
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-gis-card border border-gis-border px-3 py-1.5 rounded text-gis-text-muted">
                  Baseline: <strong className="text-gis-text">{analysis.before.toFixed(2)}</strong>
                </div>
                <span className="text-gis-text-dim">→</span>
                <div className="bg-gis-card border border-gis-border px-3 py-1.5 rounded text-gis-text-muted">
                  Observed: <strong className="text-gis-text">{analysis.after.toFixed(2)}</strong>
                </div>
                <div className="text-emerald-400 font-bold ml-auto">
                  +{analysis.observedChange.toFixed(2)} change
                </div>
              </div>

              {changeResult && (
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gis-border/60">
                  {changeResult.metrics.map((m) => (
                    <div key={m.label} className="bg-gis-card/60 p-2 rounded text-center">
                      <div className="text-[10px] text-gis-text-dim uppercase">{m.label}</div>
                      <div className={`text-xs font-bold ${m.polarity === "positive" ? "text-emerald-400" : "text-rose-400"}`}>
                        {m.percentChange > 0 ? "+" : ""}{m.percentChange}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gis-text-muted italic">Not available</p>
          )}
        </section>

        {/* Section 6: Interpretation & Field Guidance */}
        <section className="border-t border-gis-border pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gis-text-dim mb-1.5">
            Interpretation &amp; Decision Support
          </h2>
          <div className="bg-gis-surface/80 border border-gis-border rounded-lg p-3.5 text-xs text-gis-text-muted leading-relaxed">
            {changeResult?.interpretation ?? "Not available"}{" "}
            <span className="text-amber-400/90 font-medium">
              Ground-level field verification is required before these indicative changes are attributed to specific watershed interventions.
            </span>
          </div>
        </section>
      </div>

      {/* Footer disclaimer */}
      <p className="text-[11px] text-gis-text-dim">
        Generated for SIH26015 Watershed Intelligence prototype. Demonstration imagery and synthetic indicators are not official government records.
      </p>
    </div>
  );
}

