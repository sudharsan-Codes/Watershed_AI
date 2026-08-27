import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PlaceholderPage } from "./components/common/PlaceholderPage";
import ChangeDetection from "./pages/ChangeDetection";
import Dashboard from "./pages/Dashboard";
import FieldEvidence from "./pages/FieldEvidence";
import GISMap from "./pages/GISMap";
import PriorityAreas from "./pages/PriorityAreas";
import Reports from "./pages/Reports";
import SatelliteAnalysis from "./pages/SatelliteAnalysis";
import WatershedDetail from "./pages/WatershedDetail";

const DEFAULT_WATERSHED_ID = "ws-demo-a";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to={`/watersheds/${DEFAULT_WATERSHED_ID}`} replace />} />

        <Route path="/watersheds/:watershedId" element={<WatershedDetail />}>
          <Route index element={<Dashboard />} />
          <Route path="gis-map" element={<GISMap />} />
          <Route path="field-evidence" element={<FieldEvidence />} />
          <Route path="satellite-analysis" element={<SatelliteAnalysis />} />
          <Route path="change-detection" element={<ChangeDetection />} />
        </Route>

        <Route
          path="/watersheds"
          element={<PlaceholderPage title="Watersheds" note="Full watershed registry list — planned for next build increment." />}
        />
        <Route
          path="/interventions"
          element={<PlaceholderPage title="Interventions" note="Intervention registry across all watersheds — planned for next build increment." />}
        />
        <Route path="/priority-areas" element={<PriorityAreas />} />
        <Route
          path="/vegetation"
          element={<PlaceholderPage title="Vegetation (NDVI)" note="Cross-watershed NDVI trends — planned for next build increment." />}
        />
        <Route
          path="/alerts"
          element={<PlaceholderPage title="Alerts" note="System alerts feed — planned for next build increment." />}
        />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/data-sources"
          element={<PlaceholderPage title="Data Sources" note="Connected data source configuration — planned for next build increment." />}
        />
        <Route
          path="/settings"
          element={<PlaceholderPage title="Settings" note="Application settings — planned for next build increment." />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
