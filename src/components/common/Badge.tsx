import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "purple";

const toneClasses: Record<Tone, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  neutral: "bg-gis-card text-gis-text-muted border-gis-border",
  info: "bg-brand-500/15 text-brand-400 border-brand-500/30",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export function Badge({ tone = "neutral", children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border",
        toneClasses[tone],
      ].join(" ")}
    >
      {icon}
      {children}
    </span>
  );
}
