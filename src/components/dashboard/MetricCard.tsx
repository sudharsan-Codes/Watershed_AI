interface CountCardProps {
  variant?: "count";
  label: string;
  value: string;
  delta?: string;
}

interface ChangeCardProps {
  variant: "change";
  label: string;
  value: string;
  caption: string;
}

type MetricCardProps = CountCardProps | ChangeCardProps;

export function MetricCard(props: MetricCardProps) {
  return (
    <div className="bg-gis-card border border-gis-border rounded-lg p-4 flex-1 min-w-[170px] shadow-sm hover:border-gis-border-light transition-colors">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gis-text-dim mb-2">
        {props.label}
      </div>

      {props.variant === "change" ? (
        <>
          <div className="text-2xl font-bold text-brand-400">{props.value}</div>
          <div className="text-[11px] text-gis-text-muted mt-0.5">{props.caption}</div>
        </>
      ) : (
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-gis-text">{props.value}</div>
          {props.delta && (
            <div className="text-[11px] text-emerald-400 mb-0.5 whitespace-nowrap font-medium">{props.delta}</div>
          )}
        </div>
      )}
    </div>
  );
}
