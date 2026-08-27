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
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 min-w-[170px]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {props.label}
      </div>

      {props.variant === "change" ? (
        <>
          <div className="text-2xl font-bold text-brand-600">{props.value}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">{props.caption}</div>
        </>
      ) : (
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-gray-900">{props.value}</div>
          {props.delta && (
            <div className="text-[11px] text-gray-400 mb-0.5 whitespace-nowrap">{props.delta}</div>
          )}
        </div>
      )}
    </div>
  );
}
