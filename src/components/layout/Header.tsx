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
    <header className="h-14 shrink-0 bg-navy-950 text-white flex items-center justify-between px-4 border-b border-white/10">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-sm font-bold">
          WI
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">WATERSIGHT AI</div>
          <div className="text-[11px] text-white/50">Watershed Intelligence &amp; Monitoring</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="hidden md:flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-3 py-1.5 transition-colors">
          <MapPin size={13} className="text-white/60" />
          <span>Tamil Nadu / Coimbatore</span>
          <ChevronDown size={13} className="text-white/40" />
        </button>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Data updated: {formatUpdatedAt(dashboardSummary.dataUpdatedAt)}</span>
        </div>

        <button className="relative p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label="Notifications">
          <Bell size={16} className="text-white/70" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        <button className="flex items-center gap-1 p-1 rounded-md hover:bg-white/10 transition-colors" aria-label="Account menu">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <User size={14} className="text-white/70" />
          </div>
          <ChevronDown size={13} className="text-white/40" />
        </button>
      </div>
    </header>
  );
}
