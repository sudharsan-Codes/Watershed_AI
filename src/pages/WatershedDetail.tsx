import { FileText, MapPin, Ruler } from "lucide-react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { Badge } from "../components/common/Badge";
import { getWatershedById } from "../data/watersheds";

const TABS = [
  { label: "Overview", to: "" },
  { label: "GIS Map", to: "gis-map" },
  { label: "Field Evidence", to: "field-evidence" },
  { label: "Satellite Analysis", to: "satellite-analysis" },
  { label: "Change Detection", to: "change-detection" },
];

export default function WatershedDetail() {
  const { watershedId = "ws-demo-a" } = useParams();
  const watershed = getWatershedById(watershedId);

  if (!watershed) {
    return (
      <div className="p-6 text-sm text-gis-text-muted">
        Watershed not found. It may have been removed or the ID is incorrect.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gis-bg">
      <div className="shrink-0 bg-gis-surface border-b border-gis-border px-5 pt-4">
        <div className="text-[11px] text-gis-text-dim font-medium tracking-wide mb-1">
          <span className="uppercase">Watersheds</span>
          <span className="mx-1.5">/</span>
          <span className="uppercase text-gis-text-muted">{watershed.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gis-text">{watershed.name}</h1>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gis-text-muted">
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-brand-400" />
                {watershed.district}, {watershed.state}
              </span>
              <span className="flex items-center gap-1">
                <Ruler size={12} className="text-gis-text-dim" />
                {watershed.areaHectares.toLocaleString("en-IN")} ha
              </span>
              <Badge tone="success">Under Monitoring</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="text-xs border border-gis-border rounded-md px-2.5 py-1.5 text-gis-text bg-gis-card outline-none focus:border-brand-500 transition-colors"
              defaultValue="12m"
              aria-label="Reporting period"
            >
              <option value="12m">Period: Last 12 Months</option>
              <option value="6m">Period: Last 6 Months</option>
              <option value="30d">Period: Last 30 Days</option>
            </select>
            <NavLink
              to="/reports"
              className="flex items-center gap-1.5 text-xs font-semibold border border-gis-border rounded-md px-3 py-1.5 text-gis-text bg-gis-card hover:bg-gis-border/50 hover:border-gis-border-light transition-colors"
            >
              <FileText size={13} className="text-brand-400" />
              Generate Report
            </NavLink>
          </div>
        </div>

        <div className="flex gap-5 mt-4 -mb-px">
          {TABS.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.to === ""}
              className={({ isActive }) =>
                [
                  "text-xs font-bold uppercase tracking-wider pb-2.5 border-b-2 transition-colors",
                  isActive
                    ? "text-brand-400 border-brand-500"
                    : "text-gis-text-dim border-transparent hover:text-gis-text-muted",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-gis-bg">
        <Outlet context={{ watershed }} />
      </div>
    </div>
  );
}
