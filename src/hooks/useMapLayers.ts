import { useCallback, useState } from "react";

/** The toggleable map layer identifiers. */
export type MapLayerId =
  | "boundary"
  | "interventions"
  | "evidence"
  | "priorityZones";

/** All valid layer IDs for parsing/validation. */
const ALL_LAYER_IDS: readonly MapLayerId[] = [
  "boundary",
  "interventions",
  "evidence",
  "priorityZones",
];

/** Visibility state for every layer. */
export type LayerVisibility = Record<MapLayerId, boolean>;

const DEFAULT_VISIBILITY: LayerVisibility = {
  boundary: true,
  interventions: true,
  evidence: true,
  priorityZones: false, // off by default — opt-in to keep map clean
};

/** URL search param key used for layer visibility persistence. */
const LAYERS_PARAM = "layers";

/**
 * Parse a `?layers=boundary,interventions` param into a LayerVisibility map.
 * Every listed id is ON; every omitted id is OFF.
 * Returns null when the param is absent (→ use defaults).
 */
function parseLayersParam(raw: string | null): LayerVisibility | null {
  if (raw == null) return null;
  const enabled = new Set(raw.split(",").filter(Boolean));
  // Validate that at least one token is a known layer id
  const hasKnown = ALL_LAYER_IDS.some((id) => enabled.has(id));
  if (!hasKnown) return null;
  const result = {} as LayerVisibility;
  for (const id of ALL_LAYER_IDS) {
    result[id] = enabled.has(id);
  }
  return result;
}

/** Serialize a LayerVisibility map to a compact comma-separated string of enabled ids. */
function serializeLayersParam(vis: LayerVisibility): string {
  return ALL_LAYER_IDS.filter((id) => vis[id]).join(",");
}

/**
 * Optional URL-persistence binding.
 * When provided, the hook reads initial state from `?layers=` and writes
 * changes back via `setSearchParams` with `{ replace: true }`.
 */
export interface LayerSearchParams {
  searchParams: URLSearchParams;
  setSearchParams: (
    fn: (prev: URLSearchParams) => URLSearchParams,
    opts?: { replace?: boolean },
  ) => void;
}

/**
 * Manages on/off visibility for each GIS map layer.
 *
 * Returns the current visibility map and a toggle function.
 *
 * When `urlBinding` is supplied the initial state is read from
 * `?layers=…` (falling back to defaults) and every toggle/setLayer
 * call writes back to the URL with `replace: true`.
 */
export function useMapLayers(urlBinding?: LayerSearchParams) {
  const initialFromUrl = urlBinding
    ? parseLayersParam(urlBinding.searchParams.get(LAYERS_PARAM))
    : null;

  const [visibility, setVisibility] = useState<LayerVisibility>(
    initialFromUrl ?? { ...DEFAULT_VISIBILITY },
  );

  /** Sync a new visibility state to the URL (if binding is active). */
  const syncToUrl = useCallback(
    (next: LayerVisibility) => {
      if (!urlBinding) return;
      urlBinding.setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set(LAYERS_PARAM, serializeLayersParam(next));
        return updated;
      }, { replace: true });
    },
    [urlBinding],
  );

  const toggle = useCallback((layer: MapLayerId) => {
    setVisibility((prev) => {
      const next = { ...prev, [layer]: !prev[layer] };
      syncToUrl(next);
      return next;
    });
  }, [syncToUrl]);

  const setLayer = useCallback((layer: MapLayerId, visible: boolean) => {
    setVisibility((prev) => {
      const next = { ...prev, [layer]: visible };
      syncToUrl(next);
      return next;
    });
  }, [syncToUrl]);

  return { visibility, toggle, setLayer } as const;
}
