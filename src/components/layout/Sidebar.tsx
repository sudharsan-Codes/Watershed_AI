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
    <aside className="w-56 shrink-0 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search watersheds..."
            className="bg-transparent text-xs text-gray-700 placeholder:text-gray-400 outline-none w-full"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.title} className="px-3 mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1">
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
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors border-l-2",
                        isActive
                          ? "bg-brand-50 text-brand-700 border-brand-600 font-medium"
                          : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900",
                      ].join(" ")
                    }
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={[
                          "text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none",
                          item.badge.tone === "alert"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600",
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

      <div className="p-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span>System Status</span>
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Online
        </span>
      </div>
    </aside>
  );
}
