import { MapPin, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { EvidenceCard } from "../components/evidence/EvidenceCard";
import { EvidenceDrawer } from "../components/evidence/EvidenceDrawer";
import { EvidenceUpload } from "../components/evidence/EvidenceUpload";
import { fieldEvidence } from "../data/evidence";
import { getInterventionById } from "../data/interventions";
import { fetchUploadedEvidence } from "../services/gisService";
import type { FieldEvidence as FieldEvidenceType, UploadedEvidence, Watershed } from "../types";

export default function FieldEvidence() {
  const { watershed } = useOutletContext<{ watershed: Watershed }>();
  const navigate = useNavigate();
  const [uploadedItems, setUploadedItems] = useState<UploadedEvidence[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(fieldEvidence[0]?.id ?? null);
  const [interventionFilter, setInterventionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadUploaded = useCallback(() => {
    fetchUploadedEvidence()
      .then((data) => setUploadedItems(data))
      .catch((err) => console.warn("[FieldEvidence] Failed to load uploaded evidence:", err));
  }, []);

  useEffect(() => {
    loadUploaded();
  }, [loadUploaded]);

  const prototypeItems = useMemo(() => {
    return fieldEvidence.filter((ev) => {
      if (ev.watershedId !== watershed.id) return false;
      const iv = getInterventionById(ev.interventionId);
      if (interventionFilter !== "all" && iv?.type !== interventionFilter) return false;
      if (statusFilter !== "all" && ev.verificationStatus !== statusFilter) return false;
      return true;
    });
  }, [watershed.id, interventionFilter, statusFilter]);

  const filteredUploaded = useMemo(() => {
    return uploadedItems.filter((ev) => {
      if (ev.watershedMatch?.matched && ev.watershedMatch?.watershedId && ev.watershedMatch.watershedId !== watershed.id) {
        return false;
      }
      if (interventionFilter !== "all") {
        if (ev.nearestIntervention?.type !== interventionFilter) return false;
      }
      if (statusFilter !== "all") {
        const vStatus = ev.verification?.status ?? "requires_verification";
        if (statusFilter === "Field Verified" && vStatus !== "verified") return false;
        if (statusFilter === "Requires Verification" && vStatus !== "requires_verification") return false;
        if (statusFilter === "Rejected" && vStatus !== "rejected") return false;
      }
      return true;
    });
  }, [uploadedItems, watershed.id, interventionFilter, statusFilter]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const fromUploaded = uploadedItems.find((e) => e.id === selectedId);
    if (fromUploaded) return fromUploaded;
    return fieldEvidence.find((e) => e.id === selectedId) ?? null;
  }, [selectedId, uploadedItems]);

  const handleViewOnMap = () => {
    if (!selected) return;
    if ("source" in selected && selected.source === "uploaded") {
      const upEv = selected as UploadedEvidence;
      if (upEv.nearestIntervention?.matched && upEv.nearestIntervention.interventionId) {
        navigate(`../gis-map?intervention=${upEv.nearestIntervention.interventionId}`);
      } else if (upEv.latitude != null && upEv.longitude != null) {
        navigate(`../gis-map?lat=${upEv.latitude}&lng=${upEv.longitude}&z=15`);
      } else {
        navigate(`../gis-map`);
      }
    } else {
      const fieldEv = selected as FieldEvidenceType;
      const intervention = getInterventionById(fieldEv.interventionId);
      navigate(`../gis-map?intervention=${intervention?.id ?? ""}`);
    }
  };

  return (
    <div className="flex h-full bg-gis-bg text-gis-text">
      {/* Sidebar Filters & Ingestion */}
      <div className="w-64 shrink-0 border-r border-gis-border bg-gis-surface p-3.5 space-y-3.5 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gis-text-dim">
          <SlidersHorizontal size={13} className="text-brand-400" />
          Filter Evidence
        </div>

        <FilterSelect label="Date Range" defaultValue="Last 30 Days" />
        <FilterSelect label="Watershed" defaultValue={watershed.name} />

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim block mb-1">
            Intervention Type
          </label>
          <select
            value={interventionFilter}
            onChange={(e) => setInterventionFilter(e.target.value)}
            className="w-full text-xs border border-gis-border rounded-md px-2.5 py-1.5 text-gis-text bg-gis-card outline-none focus:border-brand-500 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="Check Dam">Check Dam</option>
            <option value="Farm Pond">Farm Pond</option>
            <option value="Contour Trench">Contour Trench</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim block mb-1">
            Verification Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs border border-gis-border rounded-md px-2.5 py-1.5 text-gis-text bg-gis-card outline-none focus:border-brand-500 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="Field Verified">Field Verified</option>
            <option value="Requires Verification">Requires Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="border-t border-gis-border pt-3 mt-3">
          <EvidenceUpload onUploaded={loadUploaded} />
        </div>
      </div>

      {/* Main Evidence Grid Area */}
      <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-6">
        {/* Uploaded Evidence Section */}
        {filteredUploaded.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gis-text">Uploaded Field Evidence</h2>
                <span className="text-[10px] px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full font-bold uppercase tracking-wide">
                  Live Registry ({filteredUploaded.length})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredUploaded.map((ev) => {
                const vStatus = ev.verification?.status ?? "requires_verification";
                const isSelected = selectedId === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    className={[
                      "text-left bg-gis-card rounded-lg border overflow-hidden transition-all hover:border-purple-500 shadow-sm",
                      isSelected ? "border-purple-500 ring-1 ring-purple-500" : "border-gis-border",
                    ].join(" ")}
                  >
                    <div className="relative h-28 bg-gis-surface">
                      <img
                        src={`http://localhost:8000/uploads/${ev.storedFilename}`}
                        alt={ev.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="absolute top-1.5 left-1.5 text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow">
                        Uploaded
                      </span>
                      <span className="absolute top-1.5 right-1.5 text-[10px] bg-black/70 backdrop-blur-xs text-white px-1.5 py-0.5 rounded">
                        {ev.captureTimestamp
                          ? new Date(ev.captureTimestamp).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "No Date"}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gis-text truncate" title={ev.filename}>
                          {ev.nearestIntervention?.matched ? ev.nearestIntervention.code : ev.filename}
                        </span>
                        {vStatus === "verified" && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                            ✓ Verified
                          </span>
                        )}
                        {vStatus === "rejected" && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded shrink-0">
                            ✕ Rejected
                          </span>
                        )}
                        {vStatus === "requires_verification" && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                            Requires Review
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gis-text-dim mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-gis-text-dim" />
                          {ev.gpsAvailable && ev.latitude != null && ev.longitude != null
                            ? `${ev.latitude.toFixed(4)}°, ${ev.longitude.toFixed(4)}°`
                            : "GPS Missing"}
                        </div>
                        {ev.gpsSource === "VISUAL_OVERLAY" && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded font-medium">
                            Visual GPS
                          </span>
                        )}
                        {ev.gpsSource === "EXIF" && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-medium">
                            EXIF GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Prototype Demonstration Data Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gis-text">Field Evidence Repository</h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] px-2.5 py-0.5 bg-gis-card text-gis-text-muted border border-gis-border rounded-full font-medium uppercase tracking-wide">
                Prototype Demonstration Data
              </span>
              <span className="text-xs text-gis-text-dim">Showing {prototypeItems.length} results</span>
            </div>
          </div>

          {prototypeItems.length === 0 && filteredUploaded.length === 0 ? (
            <div className="text-sm text-gis-text-muted border border-dashed border-gis-border bg-gis-card/50 rounded-lg p-8 text-center">
              No field evidence matches the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {prototypeItems.map((ev) => (
                <EvidenceCard
                  key={ev.id}
                  evidence={ev}
                  selected={ev.id === selectedId}
                  onSelect={() => setSelectedId(ev.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <EvidenceDrawer
          evidence={selected}
          onClose={() => setSelectedId(null)}
          onViewOnMap={handleViewOnMap}
          onVerificationUpdated={loadUploaded}
        />
      )}
    </div>
  );
}

function FilterSelect({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim block mb-1">{label}</label>
      <select
        defaultValue={defaultValue}
        className="w-full text-xs border border-gis-border rounded-md px-2.5 py-1.5 text-gis-text bg-gis-card outline-none focus:border-brand-500 transition-colors"
      >
        <option>{defaultValue}</option>
      </select>
    </div>
  );
}
