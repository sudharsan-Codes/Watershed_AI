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
    <div className="absolute left-0 right-0 bottom-0 z-[400] flex items-center justify-between px-4 py-1.5 bg-gis-surface/95 backdrop-blur-md border-t border-gis-border text-[11px] text-gis-text-muted pointer-events-none">
      <span className="font-medium text-gis-text">Scale: {scale}</span>
      <span className="text-brand-400 font-medium">{coordinates}</span>
      <span>Analysis Period: {analysisPeriod}</span>
      <span className="hidden md:inline text-gis-text-dim">
        © WATERSIGHT AI · SIH26015 Prototype · Spatial Res: 10m
      </span>
    </div>
  );
}
