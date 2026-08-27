import type { Marker as LeafletMarker } from "leaflet";
import { Layers } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { LayerPanel } from "../components/map/LayerPanel";
import { MapControls } from "../components/map/MapControls";
import { MapLegend } from "../components/map/MapLegend";
import { MapStatusBar } from "../components/map/MapStatusBar";
import { makeMarkerIcon } from "../components/map/markerIcons";
import { NdviPanel } from "../components/map/NdviPanel";
import { getInterventions, getFieldEvidenceByWatershed } from "../services/gisService";
import { satelliteAnalysisByWatershed } from "../data/analysis";
import { useMapLayers } from "../hooks/useMapLayers";
import { useWatershedGeo } from "../hooks/useWatershedGeo";
import type { Watershed } from "../types";
import "leaflet/dist/leaflet.css";

function FocusOnSelection({
  markerRefs,
}: {
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
}) {
  const map = useMap();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("intervention");

  useEffect(() => {
    if (!selectedId) return;
    const marker = markerRefs.current[selectedId];
    if (!marker) return;
    map.flyTo(marker.getLatLng(), 15, { duration: 0.6 });
    const timer = setTimeout(() => marker.openPopup(), 650);
    return () => clearTimeout(timer);
  }, [selectedId, map, markerRefs]);

  return null;
}

/**
 * Restores saved map position from URL search params on mount.
 * Only applies when no `?intervention=` param is set (i.e. not a "View on Map" navigation).
 */
function RestoreSavedPosition() {
  const map = useMap();
  const [searchParams] = useSearchParams();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    // Don't override if we're navigating to a specific intervention
    if (searchParams.get("intervention")) return;

    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const z = searchParams.get("z");

    if (lat != null && lng != null && z != null) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const zNum = parseFloat(z);
      if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(zNum)) {
        map.setView([latNum, lngNum], zNum);
      }
    }
  }, [map, searchParams]);

  return null;
}

/**
 * Tracks map position (center + zoom) and writes it to URL search params
 * on every `moveend` event.  Uses `replaceState` to avoid polluting history.
 */
function MapPositionTracker() {
  const map = useMap();
  const [, setSearchParams] = useSearchParams();

  const handleMoveEnd = useCallback(() => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("lat", center.lat.toFixed(5));
      next.set("lng", center.lng.toFixed(5));
      next.set("z", String(zoom));
      return next;
    }, { replace: true });
  }, [map, setSearchParams]);

  useMapEvents({
    moveend: handleMoveEnd,
  });

  return null;
}

export default function GISMap() {
  const { watershed } = useOutletContext<{ watershed: Watershed }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedInterventionId = searchParams.get("intervention");
  const analysis = satelliteAnalysisByWatershed[watershed.id];
  const { geo, loading: geoLoading, error: geoError } = useWatershedGeo(watershed);
  const { visibility, toggle } = useMapLayers({ searchParams, setSearchParams });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);

  // Intervention markers still need refs for FocusOnSelection fly-to
  const wsInterventions = getInterventions(watershed.id);
  const wsEvidence = getFieldEvidenceByWatershed(watershed.id);
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  // Fallback bounds in case no geo layers are available
  const bounds = geo?.bounds ?? ([
    [10.99, 76.93],
    [11.04, 76.98],
  ] as [[number, number], [number, number]]);

  return (
    <div className="relative h-full min-h-[560px]">
      {/* GIS data loading indicator */}
      {geoLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 pointer-events-none">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading GIS data…
          </div>
        </div>
      )}

      {/* GIS data error banner */}
      {geoError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 rounded-lg shadow-sm px-4 py-2 text-xs text-red-700 max-w-md text-center">
          <span className="font-semibold">GIS Error:</span> {geoError}
        </div>
      )}

      <MapContainer
        bounds={bounds}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Watershed boundary */}
        {geo && visibility.boundary && (
          <GeoJSON
            key={`boundary-${watershed.id}`}
            data={geo.boundary}
            style={{ color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.08 }}
            onEachFeature={(_feature, layer) => {
              layer.bindPopup(`
                <div style="font-size: 12px; line-height: 1.4;">
                  <div style="font-weight: 600; margin-bottom: 4px;">${watershed.name}</div>
                  <div style="color: #6b7280;">District: <span style="color: #374151;">${watershed.district}</span></div>
                  <div style="color: #6b7280;">State: <span style="color: #374151;">${watershed.state}</span></div>
                  <div style="color: #6b7280;">Area: <span style="color: #374151;">${watershed.areaHectares.toLocaleString("en-IN")} ha</span></div>
                  <div style="color: #6b7280;">Status: <span style="color: #374151;">${watershed.status}</span></div>
                </div>
              `);
            }}
          />
        )}

        {/* Priority zones */}
        {geo && visibility.priorityZones &&
          geo.priorityZones.map((zone, idx) => (
            <GeoJSON
              key={`pz-${idx}`}
              data={zone}
              style={{
                color: zone.properties?.severity === "positive" ? "#16a34a" : "#dc2626",
                weight: 1,
                fillColor: zone.properties?.severity === "positive" ? "#22c55e" : "#f87171",
                fillOpacity: 0.35,
              }}
              onEachFeature={(feature, layer) => {
                const severity = feature.properties?.severity;
                layer.bindPopup(`
                  <div style="font-size: 12px; line-height: 1.4;">
                    <div style="font-weight: 600; margin-bottom: 2px;">Priority Zone</div>
                    ${severity ? `<div style="color: #6b7280;">Severity: <span style="color: #374151; text-transform: capitalize;">${severity}</span></div>` : ""}
                  </div>
                `);
              }}
            />
          ))}

        {/* Field evidence markers — rendered first so intervention markers sit above */}
        {visibility.evidence &&
          wsEvidence.map((ev) => (
            <Marker
              key={ev.id}
              position={[ev.latitude, ev.longitude]}
              icon={makeMarkerIcon("evidence")}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{ev.verificationStatus}</div>
                  <div className="text-gray-500">
                    {new Date(ev.captureDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  {ev.aiClassification && (
                    <div className="text-gray-400 mt-0.5">
                      AI: {ev.aiClassification.label} ({Math.round(ev.aiClassification.confidence * 100)}%)
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Intervention markers — rendered after evidence so selected red marker sits on top */}
        {visibility.interventions &&
          wsInterventions.map((iv) => (
            <Marker
              key={iv.id}
              position={[iv.latitude, iv.longitude]}
              icon={makeMarkerIcon(
                iv.id === selectedInterventionId ? "selected" : "intervention",
              )}
              ref={(ref) => {
                markerRefs.current[iv.id] = ref;
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{iv.code}</div>
                  <div className="text-gray-500">{iv.type}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        <FocusOnSelection markerRefs={markerRefs} />
        <RestoreSavedPosition />
        <MapPositionTracker />

        <MapControls homeBounds={bounds} />

        {/* Layers button + panel */}
        <div className="leaflet-top leaflet-right" style={{ marginTop: 10, marginRight: 10 }}>
          {layerPanelOpen ? (
            <LayerPanel
              visibility={visibility}
              onToggle={toggle}
              onClose={() => setLayerPanelOpen(false)}
            />
          ) : (
            <button
              onClick={() => setLayerPanelOpen(true)}
              className="leaflet-control flex items-center gap-1.5 bg-white rounded-md shadow-sm border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Layers size={13} />
              Layers
            </button>
          )}
        </div>

        {/* Legend */}
        <div
          className="leaflet-bottom leaflet-right"
          style={{ marginBottom: 34, marginRight: 10 }}
        >
          <MapLegend visibility={visibility} />
        </div>

        {analysis && (
          <div
            className="leaflet-bottom leaflet-left"
            style={{ marginBottom: 34, marginLeft: 10 }}
          >
            <NdviPanel analysis={analysis} />
          </div>
        )}
      </MapContainer>

      <MapStatusBar
        coordinates={`${watershed.centerLat.toFixed(4)}° N, ${watershed.centerLng.toFixed(4)}° E`}
      />
    </div>
  );
}
