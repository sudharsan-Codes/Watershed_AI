import { useState } from "react";

export function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-200 select-none">
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeSrc} alt={beforeLabel} className="h-full object-cover" style={{ width: "100vw", maxWidth: "none" }} />
      </div>

      <span className="absolute top-3 left-3 text-[11px] font-semibold bg-gray-900/80 text-white px-2.5 py-1 rounded">
        BEFORE — {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 text-[11px] font-semibold bg-emerald-600/90 text-white px-2.5 py-1 rounded">
        AFTER — {afterLabel}
      </span>

      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-500 text-xs">
          ↔
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Comparison slider"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  );
}
