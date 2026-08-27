# WATERSIGHT AI — Frontend Prototype (SIH26015)

Steps 1–4 of the development strategy: frontend shell, dashboard, Leaflet GIS map,
Field Evidence, Satellite Analysis, and Change Detection tabs, implemented against
the approved Figma screens.

## Run locally

```
npm install
npm run dev
```

Then open the printed local URL. Build for production with `npm run build`.

## What's implemented
- Application shell: header, grouped left navigation, watershed breadcrumb/title/tabs
- Dashboard (Overview tab) with the approved metric cards
- GIS Map tab: Leaflet map, watershed boundary, intervention markers, NDVI panel,
  custom zoom/home controls, status bar
- Field Evidence tab: filterable grid, detail drawer, AI-assisted classification label,
  and the "View on Map" interaction that flies to and highlights the selected marker
- Satellite Analysis tab: before/after comparison slider with NDVI stats
- Change Detection tab: difference-layer map + spatial change metrics panel
- Reports: a basic Watershed Assessment report view

## Not yet built (backend, per the phased plan)
- FastAPI backend (Phase 8), SQLite/SQLAlchemy models (Phase 9), and wiring the
  frontend `services/api.ts` to it — currently the frontend reads local demo data
  from `src/data/*.ts` (clearly labeled Prototype Demonstration Data)
- Real AI classification service (Phase 11) — the UI and data shape are in place;
  `aiClassification` is stubbed with `modelConnected: false`
- Watersheds / Interventions / Alerts / Data Sources / Settings pages are placeholders

## Notes
- All numeric values (dashboard metrics, NDVI figures, change percentages) are
  Prototype Demonstration Data for the hackathon and are labeled as such in the UI.
- Tailwind v4 (CSS-first config via `@theme` in `src/index.css`).
