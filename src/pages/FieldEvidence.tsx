import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { EvidenceCard } from "../components/evidence/EvidenceCard";
import { EvidenceDrawer } from "../components/evidence/EvidenceDrawer";
import { fieldEvidence } from "../data/evidence";
import { getInterventionById } from "../data/interventions";
import type { Watershed } from "../types";

export default function FieldEvidence() {
  const { watershed } = useOutletContext<{ watershed: Watershed }>();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(fieldEvidence[0]?.id ?? null);
  const [interventionFilter, setInterventionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const items = useMemo(() => {
    return fieldEvidence.filter((ev) => {
      if (ev.watershedId !== watershed.id) return false;
      const iv = getInterventionById(ev.interventionId);
      if (interventionFilter !== "all" && iv?.type !== interventionFilter) return false;
      if (statusFilter !== "all" && ev.verificationStatus !== statusFilter) return false;
      return true;
    });
  }, [watershed.id, interventionFilter, statusFilter]);

  const selected = items.find((e) => e.id === selectedId) ?? null;

  const handleViewOnMap = () => {
    if (!selected) return;
    const intervention = getInterventionById(selected.interventionId);
    navigate(`../gis-map?intervention=${intervention?.id ?? ""}`);
  };

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-gray-200 bg-white p-3 space-y-3 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <SlidersHorizontal size={13} />
          Filters
        </div>

        <FilterSelect label="Date Range" defaultValue="Last 30 Days" />
        <FilterSelect label="Watershed" defaultValue={watershed.name} />

        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-400 block mb-1">
            Intervention Type
          </label>
          <select
            value={interventionFilter}
            onChange={(e) => setInterventionFilter(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 outline-none"
          >
            <option value="all">All Types</option>
            <option value="Check Dam">Check Dam</option>
            <option value="Farm Pond">Farm Pond</option>
            <option value="Contour Trench">Contour Trench</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-400 block mb-1">
            Verification Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Field Verified">Field Verified</option>
            <option value="Requires Verification">Requires Verification</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Field Evidence Repository</h2>
          <span className="text-xs text-gray-400">Showing {items.length} results</span>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-8 text-center">
            No field evidence matches the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((ev) => (
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

      {selected && (
        <EvidenceDrawer evidence={selected} onClose={() => setSelectedId(null)} onViewOnMap={handleViewOnMap} />
      )}
    </div>
  );
}

function FilterSelect({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-gray-400 block mb-1">{label}</label>
      <select
        defaultValue={defaultValue}
        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 outline-none"
      >
        <option>{defaultValue}</option>
      </select>
    </div>
  );
}
