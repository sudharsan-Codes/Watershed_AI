export function MapStatusBar({
  scale = "1:50,000",
  coordinates,
  analysisPeriod = "2023–2026",
}: {
  scale?: string;
  coordinates: string;
  analysisPeriod?: string;
}) {
  return (
    <div className="absolute left-0 right-0 bottom-0 z-[400] flex items-center justify-between px-3 py-1.5 bg-white/95 border-t border-gray-200 text-[11px] text-gray-500 pointer-events-none">
      <span>Scale: {scale}</span>
      <span>{coordinates}</span>
      <span>Analysis Period: {analysisPeriod}</span>
      <span className="hidden md:inline text-gray-400">
        © WATERSIGHT AI · Source: Bhuvan / ISRO Prototype (demo) · Spatial Res: 10m
      </span>
    </div>
  );
}
