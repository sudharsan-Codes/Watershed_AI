import { Bell, ChevronDown, MapPin, User } from "lucide-react";
import { dashboardSummary } from "../../data/analysis";

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datePart}, ${timePart} IST`;
}

export function Header() {
  return (
    <header className="h-14 shrink-0 bg-gis-surface text-gis-text flex items-center justify-between px-4 border-b border-gis-border z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-sm font-bold text-white shadow-sm shadow-brand-600/30">
          WI
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide text-gis-text flex items-center gap-2">
            <span>WATERSIGHT AI</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              DEMONSTRATION MODE
            </span>
          </div>
          <div className="text-[11px] text-gis-text-muted">Watershed Intelligence &amp; Evidence Monitoring System</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="hidden md:flex items-center gap-1.5 text-xs bg-gis-card hover:bg-gis-card/80 border border-gis-border text-gis-text-muted hover:text-gis-text rounded-md px-3 py-1.5 transition-colors">
          <MapPin size={13} className="text-brand-400" />
          <span>Tamil Nadu / Coimbatore</span>
          <ChevronDown size={13} className="text-gis-text-dim" />
        </button>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-gis-text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span>Data updated: {formatUpdatedAt(dashboardSummary.dataUpdatedAt)}</span>
        </div>

        <button className="relative p-1.5 rounded-md text-gis-text-muted hover:text-gis-text hover:bg-gis-card transition-colors" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
        </button>

        <button className="flex items-center gap-1 p-1 rounded-md hover:bg-gis-card transition-colors" aria-label="Account menu">
          <div className="w-7 h-7 rounded-full bg-gis-card border border-gis-border flex items-center justify-center text-gis-text-muted">
            <User size={14} />
          </div>
          <ChevronDown size={13} className="text-gis-text-dim" />
        </button>
      </div>
    </header>
  );
}
