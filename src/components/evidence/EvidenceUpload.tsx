import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Key,
  Layers,
  MapPin,
  Navigation,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { GPSSource, UploadedEvidence } from "../../types";
import { processEvidencePipeline } from "../../utils/evidencePipeline";
import { getGeminiApiKey, setGeminiApiKey } from "../../utils/visualGpsExtraction";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type UploadState = "idle" | "uploading" | "success" | "error";

export function EvidenceUpload({
  onUploaded,
}: {
  onUploaded?: (result: UploadedEvidence) => void;
}) {
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<UploadedEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // API Key config toggle
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey());
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setError(null);
    setState("idle");
    setSelectedFile(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setState("uploading");
    setError(null);
    setResult(null);

    try {
      // Execute the multi-stage extraction pipeline: EXIF -> Visual Overlay (Gemini Vision) -> Spatial Matching
      const evidence = await processEvidencePipeline(selectedFile);

      // Attempt to sync with backend if running
      try {
        const formData = new FormData();
        formData.append("image", selectedFile);
        const res = await fetch("http://localhost:8000/api/evidence/ingest", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.storedFilename) evidence.storedFilename = apiData.storedFilename;
          if (apiData.evidenceId) evidence.id = apiData.evidenceId;
        }
      } catch {
        // Local mode fallback
      }

      setResult(evidence);
      setState("success");
      if (onUploaded) {
        onUploaded(evidence);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  }, [selectedFile, onUploaded]);

  const handleReset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  return (
    <div className="border border-gis-border bg-gis-card rounded-lg p-3.5 space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Camera size={16} className="text-brand-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-gis-text">Upload Evidence</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            title="Configure Gemini API Key"
            className="text-[10px] flex items-center gap-1 text-gis-text-dim hover:text-brand-400 transition-colors px-1.5 py-0.5 rounded border border-gis-border hover:border-brand-500/50"
          >
            <Key size={10} />
            API Key
          </button>
          <span className="text-[10px] px-2 py-0.5 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full font-bold uppercase tracking-wide">
            Vision Pipeline
          </span>
        </div>
      </div>

      {/* Inline API Key Config Box */}
      {showKeyConfig && (
        <div className="bg-gis-surface border border-brand-500/30 rounded-md p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-gis-text">Gemini Vision API Key</span>
            {keySaved && <span className="text-[10px] text-emerald-400 font-semibold">Saved!</span>}
          </div>
          <p className="text-[10px] text-gis-text-muted leading-tight">
            Required for visual GPS OCR when images have no EXIF metadata.
          </p>
          <div className="flex gap-1.5">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste Gemini API Key (or set VITE_GEMINI_API_KEY)"
              className="flex-1 text-[11px] bg-gis-card border border-gis-border rounded px-2 py-1 text-gis-text placeholder:text-gis-text-dim outline-none focus:border-brand-500"
            />
            <button
              onClick={handleSaveKey}
              className="text-[11px] font-semibold bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-gis-text-muted leading-relaxed">
        Upload a geo-tagged field photo to extract EXIF metadata or detect visual GPS camera overlays, match watershed boundary, and link nearest intervention.
      </p>

      {/* File input */}
      {!result && (
        <div className="space-y-2.5">
          <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gis-border hover:border-brand-500 bg-gis-surface/50 rounded-lg py-4 px-3 cursor-pointer transition-colors text-center">
            <Upload size={18} className="text-brand-400" />
            <span className="text-xs text-gis-text-muted">
              {selectedFile ? selectedFile.name : "Select JPEG / PNG image…"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {previewUrl && (
            <div className="relative rounded-md overflow-hidden bg-gis-surface border border-gis-border">
              <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={state === "uploading"}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white rounded-md py-2 transition-colors shadow-sm"
            >
              {state === "uploading" ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Extracting EXIF & Gemini Vision GPS…
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
        <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-md p-2.5">
          <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
          <span className="text-xs text-rose-300">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-2.5">
          {/* Image preview */}
          {previewUrl && (
            <div className="relative rounded-md overflow-hidden bg-gis-surface border border-gis-border">
              <img src={previewUrl} alt={result.filename} className="w-full h-32 object-cover" />
              <span className="absolute top-1.5 left-1.5 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow">
                Uploaded Evidence
              </span>
              {result.gpsSource === "VISUAL_OVERLAY" && (
                <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-amber-500/90 backdrop-blur-xs text-amber-950 font-bold px-1.5 py-0.5 rounded shadow">
                  Visual GPS
                </span>
              )}
              {result.gpsSource === "EXIF" && (
                <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-emerald-600/90 backdrop-blur-xs text-white font-bold px-1.5 py-0.5 rounded shadow">
                  EXIF GPS
                </span>
              )}
            </div>
          )}

          {/* Metadata rows */}
          <div className="text-[12px] space-y-1.5 bg-gis-surface rounded-md border border-gis-border p-2.5">
            {/* GPS Status */}
            <ResultRow
              icon={<MapPin size={12} />}
              label="GPS"
              value={
                result.gpsStatus === "CONFLICT"
                  ? "⚠ Conflict"
                  : result.gpsAvailable
                    ? "✓ Detected"
                    : result.gpsStatus === "VISUAL_GPS_UNAVAILABLE"
                      ? "API Key Required"
                      : result.gpsStatus === "NEEDS_REVIEW"
                        ? "Needs Review"
                        : result.gpsStatus === "INVALID"
                          ? "Invalid"
                          : "Missing"
              }
              tone={
                result.gpsStatus === "CONFLICT" ||
                result.gpsStatus === "NEEDS_REVIEW" ||
                result.gpsStatus === "VISUAL_GPS_UNAVAILABLE"
                  ? "warning"
                  : result.gpsAvailable
                    ? "success"
                    : "warning"
              }
            />

            {/* Coordinates */}
            {result.gpsAvailable && result.latitude != null && result.longitude != null && (
              <ResultRow
                icon={<Navigation size={12} />}
                label="Coordinates"
                value={`${result.latitude.toFixed(5)}°, ${result.longitude.toFixed(5)}°`}
                tone="neutral"
              />
            )}

            {/* GPS Source & Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-gis-text-dim">
                <ShieldCheck size={12} />
                <span className="text-[11px] uppercase font-bold tracking-wider">Source</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gis-text">
                  {formatGpsSource(result.gpsSource)}
                </span>
                {result.gpsSource === "VISUAL_OVERLAY" && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-medium">
                    Visual GPS
                  </span>
                )}
                {result.gpsSource === "EXIF" && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-medium">
                    EXIF GPS
                  </span>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <ResultRow
              icon={<Clock size={12} />}
              label="Timestamp"
              value={
                result.timestampAvailable && result.captureTimestamp
                  ? new Date(result.captureTimestamp).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : result.timestampStatus === "UNAVAILABLE"
                    ? "API Key Required"
                    : "Missing"
              }
              tone={result.timestampAvailable ? "success" : "warning"}
            />

            {/* Watershed */}
            <ResultRow
              icon={<Layers size={12} />}
              label="Watershed"
              value={
                result.watershedMatch.matched
                  ? `${result.watershedMatch.watershedName}`
                  : "Not Matched"
              }
              tone={result.watershedMatch.matched ? "success" : "warning"}
            />
            {result.watershedMatch.distanceMeters != null && !result.watershedMatch.matched && (
              <ResultRow
                icon={<Navigation size={12} />}
                label="Distance"
                value={`${formatDistance(result.watershedMatch.distanceMeters)} from boundary`}
                tone="neutral"
              />
            )}

            {/* Intervention */}
            <ResultRow
              icon={<CheckCircle size={12} />}
              label="Intervention"
              value={
                result.nearestIntervention.matched
                  ? `${result.nearestIntervention.code} (${result.nearestIntervention.type})`
                  : "Not Matched"
              }
              tone={result.nearestIntervention.matched ? "success" : "warning"}
            />
            {result.nearestIntervention.distanceMeters != null && (
              <ResultRow
                icon={<Navigation size={12} />}
                label="Intervention Dist"
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

          {/* Validation & Fallback Notes */}
          <div className="space-y-1.5">
            {/* Visual GPS Notice */}
            {result.gpsSource === "VISUAL_OVERLAY" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  Extraction Notice
                </span>
                <p className="text-[11px] text-amber-300 leading-snug">
                  EXIF GPS unavailable. Coordinates detected from visible GPS camera overlay.
                </p>
                {result.gpsConfidence === "LOW" && (
                  <p className="text-[10px] text-amber-400/90 mt-1">
                    Coordinates detected from visible image text. Manual verification recommended.
                  </p>
                )}
              </div>
            )}

            {/* API Key Missing Notice */}
            {result.gpsStatus === "VISUAL_GPS_UNAVAILABLE" && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  Visual OCR Notice
                </span>
                <p className="text-[11px] text-amber-300 leading-snug">
                  Gemini Vision API key is not configured. Configure key above or set VITE_GEMINI_API_KEY in .env.
                </p>
              </div>
            )}

            {/* No GPS Note (when visual extraction was actually performed and found nothing) */}
            {!result.gpsAvailable && result.gpsStatus !== "VISUAL_GPS_UNAVAILABLE" && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-0.5">
                  Location Status
                </span>
                <p className="text-[11px] text-rose-300 leading-snug">
                  No GPS coordinates detected from EXIF metadata or visible image text.
                </p>
              </div>
            )}

            {/* Conflict Note */}
            {result.conflictGps && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  GPS Conflict Warning
                </span>
                <p className="text-[11px] text-amber-300 leading-snug">
                  GPS source conflict detected. EXIF primary: {result.latitude?.toFixed(5)}°, {result.longitude?.toFixed(5)}° vs Visual: {result.conflictGps.latitude.toFixed(5)}°, {result.conflictGps.longitude.toFixed(5)}°.
                </p>
              </div>
            )}

            {/* Other validation errors */}
            {result.validation.errors.filter(
              (e) =>
                !e.includes("No GPS coordinates") &&
                !e.includes("EXIF") &&
                !e.includes("conflict") &&
                !e.includes("Gemini Vision API key"),
            ).map((err, i) => (
              <p key={i} className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-1.5">{err}</p>
            ))}
          </div>

          {/* Evidence ID */}
          <div className="text-[10px] text-gis-text-dim text-center">
            Evidence ID: {result.evidenceId}
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gis-text-muted hover:text-gis-text border border-gis-border rounded-md py-1.5 bg-gis-surface hover:bg-gis-card transition-colors"
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

function formatGpsSource(source?: GPSSource): string {
  if (source === "EXIF") return "EXIF";
  if (source === "VISUAL_OVERLAY") return "Visual Overlay";
  return "Not available";
}

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
      ? "text-emerald-400"
      : tone === "warning"
        ? "text-amber-400"
        : "text-gis-text";

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-gis-text-dim">
        {icon}
        <span className="text-[11px] uppercase font-bold tracking-wider">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
