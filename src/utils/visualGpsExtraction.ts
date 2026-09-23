/**
 * Visual GPS and Timestamp Extraction Service using Gemini Vision.
 *
 * Real Image Pixel Analysis Pipeline:
 * 1. Checks for configured Gemini API Key (from env or localStorage).
 * 2. If missing, returns diagnostic VISUAL_GPS_UNAVAILABLE state.
 * 3. Encodes actual image pixels into Base64 inline_data payload.
 * 4. Calls Gemini Vision model with strict extraction prompt.
 * 5. Passes extracted raw overlay text to the coordinate & timestamp regex parser.
 * 6. Validates coordinates and returns structured ExtractedGPS & ExtractedTimestamp.
 *
 * Security & Trust Rules:
 * - Never invent or hallucinate GPS coordinates.
 * - Coordinates are only extracted when explicitly visible in image pixels.
 * - Latitude must be within [-90, 90], Longitude within [-180, 180].
 */

import type { ExtractedGPS, ExtractedTimestamp, GPSConfidence, GPSStatus } from "../types";

export interface VisualExtractionResult {
  gps: ExtractedGPS;
  timestamp: ExtractedTimestamp;
}

export interface GeminiGpsResponse {
  gpsFound: boolean;
  latitude: number | null;
  longitude: number | null;
  rawText: string;
  confidence: GPSConfidence;
  timestamp?: string | null;
  rawTimestampText?: string | null;
}

const GEMINI_PROMPT = `You are a geographic evidence metadata extractor.

Inspect the provided image pixels.

Your ONLY task is to determine whether the image visibly contains explicit latitude and longitude coordinates.

Look specifically for GPS Map Camera overlays, location stamps, latitude/longitude labels, and coordinate text.

The image may contain text such as:

Lat 12.85086° Long 80.172001°

Latitude: 12.85086 Longitude: 80.172001

Lat: 12.85086, Lon: 80.172001

12.85086 N, 80.172001 E

12.85086°N 80.172001°E

Extract coordinates ONLY if explicitly visible in image pixels.

DO NOT infer coordinates from:
- landmarks
- buildings
- roads
- city names
- filenames
- image context
- expected project location
- reverse geocoding
- visual appearance

If the coordinates are not visibly present, return null for latitude and longitude and set gpsFound to false.

Also inspect for any visible camera timestamp overlay (e.g. 'Saturday, 29/08/2026 10:37 AM GMT +05:30' or '29/08/2026 10:37 AM' or similar).

Return ONLY valid JSON matching this schema:

{
  "gpsFound": true,
  "latitude": 12.85086,
  "longitude": 80.172001,
  "rawText": "Lat 12.85086° Long 80.172001°",
  "confidence": "HIGH",
  "timestamp": "2026-08-29T10:37:00",
  "rawTimestampText": "Saturday, 29/08/2026 10:37 AM GMT +05:30"
}

If not found:

{
  "gpsFound": false,
  "latitude": null,
  "longitude": null,
  "rawText": "",
  "confidence": "NONE",
  "timestamp": null,
  "rawTimestampText": ""
}`;

/**
 * Retrieve the Gemini API Key from environment or local storage.
 */
export function getGeminiApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("WATERSIGHT_GEMINI_API_KEY");
    if (stored) return stored.trim();
    if ((window as unknown as { __GEMINI_API_KEY__?: string }).__GEMINI_API_KEY__) {
      return (window as unknown as { __GEMINI_API_KEY__?: string }).__GEMINI_API_KEY__!;
    }
  }
  return "";
}

/**
 * Persist Gemini API Key in browser storage for instant UI testing.
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (key.trim()) {
      window.localStorage.setItem("WATERSIGHT_GEMINI_API_KEY", key.trim());
    } else {
      window.localStorage.removeItem("WATERSIGHT_GEMINI_API_KEY");
    }
  }
}

/**
 * Extract GPS coordinates visible as an overlay in the image.
 */
export async function extractVisualGPS(image: File): Promise<ExtractedGPS> {
  const result = await extractVisualMetadata(image);
  return result.gps;
}

/**
 * Extract timestamp visible as an overlay in the image.
 */
export async function extractVisualTimestamp(image: File): Promise<ExtractedTimestamp> {
  const result = await extractVisualMetadata(image);
  return result.timestamp;
}

/**
 * Extract both GPS coordinates and timestamp by analyzing image pixels with Gemini Vision.
 */
export async function extractVisualMetadata(image: File): Promise<VisualExtractionResult> {
  console.log("[GPS] Visual extraction: started for file:", image.name, `(${image.size} bytes)`);

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn("[GPS] Gemini Vision: Gemini Vision API key is not configured.");
    return {
      gps: {
        latitude: null,
        longitude: null,
        source: "NONE",
        confidence: "NONE",
        status: "VISUAL_GPS_UNAVAILABLE",
        rawText: "Gemini Vision API key is not configured.",
      },
      timestamp: {
        value: null,
        source: "NONE",
        confidence: "NONE",
        status: "UNAVAILABLE",
        rawText: "Gemini Vision API key is not configured.",
      },
    };
  }

  try {
    console.log("[GPS] Gemini Vision: called");
    const geminiResponse = await callGeminiVisionApi(image, apiKey);
    console.log("[GPS] Gemini response received:", geminiResponse);

    const result = processGeminiResponse(geminiResponse);
    console.log("[GPS] Raw extraction:", result.gps.rawText || "(none)");
    console.log("[GPS] Parsed:", result.gps.latitude, result.gps.longitude);
    console.log("[GPS] Validation:", result.gps.status === "DETECTED" ? "passed" : "failed");
    console.log("[GPS] Source:", result.gps.source);

    return result;
  } catch (err) {
    console.error("[GPS] Gemini Vision API execution failed:", err);
    return {
      gps: {
        latitude: null,
        longitude: null,
        source: "NONE",
        confidence: "NONE",
        status: "NEEDS_REVIEW",
        rawText: err instanceof Error ? err.message : "Visual extraction error",
      },
      timestamp: {
        value: null,
        source: "NONE",
        confidence: "NONE",
        status: "MISSING",
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Gemini Vision API Call
// ---------------------------------------------------------------------------

async function callGeminiVisionApi(image: File, apiKey: string): Promise<GeminiGpsResponse> {
  const base64Data = await fileToBase64(image);
  const mimeType = image.type || "image/jpeg";

  // Try models in order of capability: gemini-2.0-flash -> gemini-1.5-flash
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: Error | null = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: GEMINI_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Gemini API (${model}) failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error(`Empty response from Gemini Vision (${model})`);
      }

      const cleanedText = candidateText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanedText) as GeminiGpsResponse;
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[GPS] Gemini Vision attempt with ${model} failed, trying fallback...`, lastError.message);
    }
  }

  throw lastError || new Error("All Gemini Vision model requests failed.");
}

// ---------------------------------------------------------------------------
// Regex Parser & Coordinate Validation
// ---------------------------------------------------------------------------

function processGeminiResponse(res: GeminiGpsResponse): VisualExtractionResult {
  let lat = res.latitude;
  let lon = res.longitude;
  let rawText = res.rawText || "";
  let confidence: GPSConfidence = res.confidence || "NONE";
  let status: GPSStatus = "MISSING";

  // If rawText is provided, verify/refine using regex parser
  if (rawText) {
    const parsedRegex = parseCoordinatesFromText(rawText);
    if (parsedRegex.latitude !== null && parsedRegex.longitude !== null) {
      lat = parsedRegex.latitude;
      lon = parsedRegex.longitude;
      if (!rawText) rawText = parsedRegex.rawText;
    }
  }

  // Range validation
  if (res.gpsFound && lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      status = "DETECTED";
      if (confidence === "NONE") confidence = "HIGH";
    } else {
      status = "INVALID";
      lat = null;
      lon = null;
    }
  } else if (lat !== null || lon !== null) {
    status = "NEEDS_REVIEW";
    confidence = "LOW";
  } else {
    status = "MISSING";
    confidence = "NONE";
  }

  const gps: ExtractedGPS = {
    latitude: lat,
    longitude: lon,
    source: status === "DETECTED" ? "VISUAL_OVERLAY" : "NONE",
    confidence,
    rawText: rawText || undefined,
    status,
  };

  // Timestamp extraction
  let timestampValue: string | null = null;
  let timestampRaw = res.rawTimestampText || "";

  if (res.timestamp && typeof res.timestamp === "string") {
    timestampValue = parseIsoTimestamp(res.timestamp);
  } else if (timestampRaw) {
    timestampValue = parseTimestampFromText(timestampRaw);
  }

  const timestamp: ExtractedTimestamp = timestampValue
    ? {
        value: timestampValue,
        source: "VISUAL_OVERLAY",
        confidence: "HIGH",
        rawText: timestampRaw || undefined,
        status: "DETECTED",
      }
    : {
        value: null,
        source: "NONE",
        confidence: "NONE",
        status: "MISSING",
      };

  return { gps, timestamp };
}

/**
 * Parse latitude and longitude from raw recognized text string.
 * Supports:
 * - Lat 12.85086° Long 80.172001°
 * - Latitude: 12.85086 Longitude: 80.172001
 * - Lat: 12.85086, Lon: 80.172001
 * - 12.85086 N, 80.172001 E
 * - 12.85086°N 80.172001°E
 */
export function parseCoordinatesFromText(text: string): {
  latitude: number | null;
  longitude: number | null;
  rawText: string;
} {
  const normalized = text.replace(/[\r\n]+/g, " ");

  // Pat 1: Lat 12.85086° Long 80.172001° or Lat: 12.85086, Lon: 80.172001
  const pat1 = /(?:lat(?:itude)?[:\s]*)([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?[\s,;]+(?:lon(?:g(?:itude)?)?[:\s]*)([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i;
  const m1 = normalized.match(pat1);
  if (m1) {
    let lat = parseFloat(m1[1]);
    if (m1[2] && m1[2].toUpperCase() === "S") lat = -Math.abs(lat);
    let lon = parseFloat(m1[3]);
    if (m1[4] && m1[4].toUpperCase() === "W") lon = -Math.abs(lon);
    return { latitude: lat, longitude: lon, rawText: m1[0] };
  }

  // Pat 2: 12.85086 N, 80.172001 E or 12.85086°N 80.172001°E
  const pat2 = /([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])[\s,;]+([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])/i;
  const m2 = normalized.match(pat2);
  if (m2) {
    let lat = parseFloat(m2[1]);
    if (m2[2].toUpperCase() === "S") lat = -Math.abs(lat);
    let lon = parseFloat(m2[3]);
    if (m2[4].toUpperCase() === "W") lon = -Math.abs(lon);
    return { latitude: lat, longitude: lon, rawText: m2[0] };
  }

  // Pat 3: Generic decimal pair (e.g. "12.85086, 80.172001")
  const pat3 = /([+-]?\d{1,2}\.\d{3,8})\s*°?\s*,\s*([+-]?\d{1,3}\.\d{3,8})\s*°?/;
  const m3 = normalized.match(pat3);
  if (m3) {
    return { latitude: parseFloat(m3[1]), longitude: parseFloat(m3[2]), rawText: m3[0] };
  }

  return { latitude: null, longitude: null, rawText: "" };
}

/**
 * Parse visible camera timestamp formats into ISO-8601 string.
 * Example: "Saturday, 29/08/2026 10:37 AM GMT +05:30" -> "2026-08-29T10:37:00"
 */
export function parseTimestampFromText(text: string): string | null {
  const normalized = text.replace(/[\r\n]+/g, " ");

  const dmyPat = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i;
  const match = normalized.match(dmyPat);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3];
    let hours = parseInt(match[4], 10);
    const minutes = match[5].padStart(2, "0");
    const ampm = match[7]?.toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    const hoursStr = hours.toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hoursStr}:${minutes}:00`;
  }

  return null;
}

function parseIsoTimestamp(iso: string): string | null {
  try {
    const dt = new Date(iso);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  } catch {
    // fallback
  }
  return parseTimestampFromText(iso);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
