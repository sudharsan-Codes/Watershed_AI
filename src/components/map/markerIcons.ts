import L from "leaflet";

function pinSvg(color: string, ringColor: string): string {
  return `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="10" fill="${color}" stroke="${ringColor}" stroke-width="2.5" />
      <circle cx="13" cy="13" r="3" fill="white" />
    </svg>`;
}

export function makeMarkerIcon(kind: "intervention" | "evidence" | "selected" = "intervention") {
  const colorMap = {
    intervention: { color: "#2563eb", ring: "#ffffff" },
    evidence: { color: "#16a34a", ring: "#ffffff" },
    selected: { color: "#dc2626", ring: "#fecaca" },
  } as const;
  const { color, ring } = colorMap[kind];

  return L.divIcon({
    className: "watersight-marker",
    html: pinSvg(color, ring),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
