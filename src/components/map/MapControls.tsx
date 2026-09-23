import { Home, Minus, Plus, RotateCcw } from "lucide-react";
import { useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

export function MapControls({ homeBounds }: { homeBounds: LatLngBoundsExpression }) {
  const map = useMap();

  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: 10, marginLeft: 10 }}>
      <div className="leaflet-control flex flex-col bg-gis-surface/95 backdrop-blur-md rounded-lg shadow-xl border border-gis-border overflow-hidden mb-2 w-8 text-gis-text">
        <button
          className="p-2 hover:bg-gis-card border-b border-gis-border text-gis-text-muted hover:text-gis-text transition-colors flex items-center justify-center"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
        >
          <Plus size={14} />
        </button>
        <button
          className="p-2 hover:bg-gis-card text-gis-text-muted hover:text-gis-text transition-colors flex items-center justify-center"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
        >
          <Minus size={14} />
        </button>
      </div>

      <div className="leaflet-control flex flex-col bg-gis-surface/95 backdrop-blur-md rounded-lg shadow-xl border border-gis-border overflow-hidden w-8 text-gis-text">
        <button
          className="p-2 hover:bg-gis-card border-b border-gis-border text-gis-text-muted hover:text-gis-text transition-colors flex items-center justify-center"
          onClick={() => map.fitBounds(homeBounds, { padding: [24, 24] })}
          aria-label="Reset to watershed extent"
        >
          <Home size={14} />
        </button>
        <button
          className="p-2 hover:bg-gis-card text-gis-text-muted hover:text-gis-text transition-colors flex items-center justify-center"
          onClick={() => map.setView(map.getCenter(), map.getZoom())}
          aria-label="Refresh map"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
