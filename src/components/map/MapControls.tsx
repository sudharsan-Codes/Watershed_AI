import { Home, Minus, Plus, RotateCcw } from "lucide-react";
import { useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

export function MapControls({ homeBounds }: { homeBounds: LatLngBoundsExpression }) {
  const map = useMap();

  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: 10, marginLeft: 10 }}>
      <div className="leaflet-control flex flex-col bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden mb-2 w-8">
        <button
          className="p-2 hover:bg-gray-50 border-b border-gray-100 text-gray-600"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
        >
          <Plus size={14} />
        </button>
        <button
          className="p-2 hover:bg-gray-50 text-gray-600"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
        >
          <Minus size={14} />
        </button>
      </div>

      <div className="leaflet-control flex flex-col bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden w-8">
        <button
          className="p-2 hover:bg-gray-50 border-b border-gray-100 text-gray-600"
          onClick={() => map.fitBounds(homeBounds, { padding: [24, 24] })}
          aria-label="Reset to watershed extent"
        >
          <Home size={14} />
        </button>
        <button
          className="p-2 hover:bg-gray-50 text-gray-600"
          onClick={() => map.setView(map.getCenter(), map.getZoom())}
          aria-label="Refresh map"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
