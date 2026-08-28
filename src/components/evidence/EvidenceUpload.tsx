import { Camera, CheckCircle, MapPin, AlertTriangle, Upload, X, Clock, Layers, Navigation } from "lucide-react";
import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types for the evidence ingestion API response
// ---------------------------------------------------------------------------

interface ImageDimensions {
  width: number | null;
  height: number | null;
}

interface ValidationResponse {
  valid: boolean;
  errors: string[];
}

interface WatershedMatchResponse {
  matched: boolean;
  watershedId: string | null;
  watershedName: string | null;
  distanceMeters: number | null;
}

interface InterventionMatchResponse {
  matched: boolean;
  interventionId: string | null;
  code: string | null;
  type: string | null;
  distanceMeters: number | null;
}

interface EvidenceIngestResponse {
  evidenceId: string;
  filename: string;
  storedFilename: string;
  gpsAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
  timestampAvailable: boolean;
  captureTimestamp: string | null;
  imageDimensions: ImageDimensions | null;
  validation: ValidationResponse;
  watershedMatch: WatershedMatchResponse;
  nearestIntervention: InterventionMatchResponse;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:8000";

type UploadState = "idle" | "uploading" | "success" | "error";

export function EvidenceUpload() {
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<EvidenceIngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous state
    setResult(null);
    setError(null);
    setState("idle");
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setState("uploading");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(`${API_BASE}/api/evidence/ingest`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Upload failed: ${response.status} ${response.statusText}`);
      }

      const data: EvidenceIngestResponse = await response.json();
      setResult(data);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Camera size={16} className="text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">Upload Field Evidence</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium uppercase tracking-wide">
          Live Pipeline
        </span>
      </div>

      <p className="text-[11px] text-blue-600/70 leading-relaxed">
        Upload a geo-tagged field photograph to extract GPS coordinates, match to watershed, and link to the nearest intervention.
      </p>

      {/* File input */}
      {!result && (
        <div className="space-y-2">
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-lg py-4 px-3 cursor-pointer transition-colors">
            <Upload size={16} className="text-blue-400" />
            <span className="text-xs text-blue-500">
              {selectedFile ? selectedFile.name : "Select image file…"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {previewUrl && (
            <div className="relative rounded-md overflow-hidden bg-gray-100">
              <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={state === "uploading"}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md py-2 transition-colors"
            >
              {state === "uploading" ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Processing…
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Ingest Evidence
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-2.5">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-2.5">
          {/* Image preview */}
          {previewUrl && (
            <div className="relative rounded-md overflow-hidden bg-gray-100">
              <img src={previewUrl} alt={result.filename} className="w-full h-32 object-cover" />
              <span className="absolute top-1.5 left-1.5 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                Uploaded Evidence
              </span>
            </div>
          )}

          {/* Metadata rows */}
          <div className="text-[13px] space-y-1.5 bg-white rounded-md border border-gray-100 p-2.5">
            {/* GPS */}
            <ResultRow
              icon={<MapPin size={12} />}
              label="GPS"
              value={result.gpsAvailable ? "Available" : "Missing"}
              tone={result.gpsAvailable ? "success" : "warning"}
            />
            {result.gpsAvailable && result.latitude != null && result.longitude != null && (
              <ResultRow
                icon={<Navigation size={12} />}
                label="Coordinates"
                value={`${result.latitude.toFixed(4)}° N, ${result.longitude.toFixed(4)}° E`}
                tone="neutral"
              />
            )}

            {/* Timestamp */}
            <ResultRow
              icon={<Clock size={12} />}
              label="Timestamp"
              value={result.timestampAvailable
                ? new Date(result.captureTimestamp!).toLocaleString("en-IN")
                : "Missing"}
              tone={result.timestampAvailable ? "success" : "warning"}
            />

            {/* Watershed */}
            <ResultRow
              icon={<Layers size={12} />}
              label="Watershed"
              value={result.watershedMatch.matched
                ? `${result.watershedMatch.watershedName}`
                : "Not Matched"}
              tone={result.watershedMatch.matched ? "success" : "warning"}
            />
            {result.watershedMatch.distanceMeters != null && !result.watershedMatch.matched && (
              <ResultRow
                icon={<Navigation size={12} />}
                label="Distance"
                value={`${formatDistance(result.watershedMatch.distanceMeters)} from watershed`}
                tone="neutral"
              />
            )}

            {/* Intervention */}
            <ResultRow
              icon={<CheckCircle size={12} />}
              label="Intervention"
              value={result.nearestIntervention.matched
                ? `${result.nearestIntervention.code} (${result.nearestIntervention.type})`
                : "Not Matched"}
              tone={result.nearestIntervention.matched ? "success" : "warning"}
            />
            {result.nearestIntervention.distanceMeters != null && (
              <ResultRow
                icon={<Navigation size={12} />}
                label="Distance"
                value={`${formatDistance(result.nearestIntervention.distanceMeters)}`}
                tone="neutral"
              />
            )}

            {/* Validation */}
            <ResultRow
              icon={result.validation.valid ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
              label="Validation"
              value={result.validation.valid ? "Valid" : "Needs Review"}
              tone={result.validation.valid ? "success" : "warning"}
            />
          </div>

          {/* Validation errors */}
          {result.validation.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 block mb-1">
                Validation Notes
              </span>
              {result.validation.errors.map((err, i) => (
                <p key={i} className="text-[11px] text-amber-700">{err}</p>
              ))}
            </div>
          )}

          {/* Evidence ID */}
          <div className="text-[10px] text-gray-400 text-center">
            Evidence ID: {result.evidenceId}
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md py-1.5 transition-colors"
          >
            <X size={12} />
            Upload Another
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function ResultRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-gray-600";

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-xs font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}
