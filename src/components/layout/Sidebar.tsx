import {
  AlertTriangle,
  BarChart3,
  Camera,
  Database,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Target,
  TrendingUp,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: { text: string; tone: "neutral" | "alert" };
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    title: "Monitoring",
    items: [
      { label: "Watersheds", to: "/watersheds", icon: Waves },
      { label: "Interventions", to: "/interventions", icon: Wrench },
      { label: "Field Evidence", to: "/watersheds/ws-demo-a/field-evidence", icon: Camera },
      { label: "Satellite Analysis", to: "/watersheds/ws-demo-a/satellite-analysis", icon: Database },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Change Detection", to: "/watersheds/ws-demo-a/change-detection", icon: TrendingUp },
      { label: "Vegetation (NDVI)", to: "/vegetation", icon: BarChart3 },
    ],
  },
  {
    title: "Decision Support",
    items: [
      { label: "Priority Areas", to: "/priority-areas", icon: Target, badge: { text: "3", tone: "neutral" } },
      { label: "Alerts", to: "/alerts", icon: AlertTriangle, badge: { text: "12", tone: "alert" } },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", to: "/reports", icon: FileText },
      { label: "Data Sources", to: "/data-sources", icon: Database },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 h-full bg-gis-surface border-r border-gis-border flex flex-col z-10 select-none">
      <div className="p-3 border-b border-gis-border">
        <div className="flex items-center gap-2 bg-gis-card border border-gis-border rounded-md px-2.5 py-1.5 focus-within:border-brand-500 transition-colors">
          <Search size={14} className="text-gis-text-dim shrink-0" />
          <input
            type="text"
            placeholder="Search watersheds..."
            className="bg-transparent text-xs text-gis-text placeholder:text-gis-text-dim outline-none w-full"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.title} className="px-3 mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim px-2.5 mb-1">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all border-l-2",
                        isActive
                          ? "bg-brand-600/15 text-brand-400 border-brand-500 font-semibold"
                          : "text-gis-text-muted border-transparent hover:bg-gis-card hover:text-gis-text",
                      ].join(" ")
                    }
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={[
                          "text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none",
                          item.badge.tone === "alert"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-gis-card text-gis-text-muted border border-gis-border",
                        ].join(" ")}
                      >
                        {item.badge.text}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-gis-border flex items-center justify-between text-[11px] text-gis-text-muted bg-gis-surface/80">
        <span className="font-medium">System Status</span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>
    </aside>
  );
}
