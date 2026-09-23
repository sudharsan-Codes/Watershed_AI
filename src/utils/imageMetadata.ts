/**
 * Browser-compatible EXIF metadata extraction utility.
 * Pure TypeScript implementation with zero external runtime dependencies.
 *
 * Security & Trust Rules:
 * - Never invent or fabricate GPS coordinates or timestamps.
 * - Extracts and converts GPS rational tags into WGS84 decimal degrees.
 * - Validates latitude [-90, 90] and longitude [-180, 180].
 */

import type { ExtractedGPS, ExtractedTimestamp } from "../types";

export interface ExtractedExifMetadata {
  gps: ExtractedGPS;
  timestamp: ExtractedTimestamp;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Extract GPS coordinates from image EXIF metadata.
 */
export async function extractExifGPS(file: File): Promise<ExtractedGPS> {
  try {
    const meta = await parseExifFromFile(file);
    return meta.gps;
  } catch {
    return {
      latitude: null,
      longitude: null,
      source: "NONE",
      confidence: "NONE",
      status: "MISSING",
    };
  }
}

/**
 * Extract capture timestamp from image EXIF metadata.
 */
export async function extractExifTimestamp(file: File): Promise<ExtractedTimestamp> {
  try {
    const meta = await parseExifFromFile(file);
    return meta.timestamp;
  } catch {
    return {
      value: null,
      source: "NONE",
      confidence: "NONE",
      status: "MISSING",
    };
  }
}

/**
 * Extract full EXIF metadata (GPS, timestamp, dimensions) from an image file.
 */
export async function extractExifMetadata(file: File): Promise<ExtractedExifMetadata> {
  try {
    return await parseExifFromFile(file);
  } catch {
    return {
      gps: {
        latitude: null,
        longitude: null,
        source: "NONE",
        confidence: "NONE",
        status: "MISSING",
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
// Internal EXIF binary parser
// ---------------------------------------------------------------------------

async function parseExifFromFile(file: File): Promise<ExtractedExifMetadata> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  // Default empty result
  let extractedLat: number | null = null;
  let extractedLon: number | null = null;
  let extractedDate: string | null = null;

  // Basic check for JPEG (0xFFD8)
  if (view.byteLength > 4 && view.getUint16(0, false) === 0xffd8) {
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 Marker (0xFFE1) contains EXIF
      if (marker === 0xffe1) {
        const length = view.getUint16(offset, false);
        const exifHeader = view.getUint32(offset + 2, false);
        // "Exif" = 0x45786966 followed by 0x0000
        if (exifHeader === 0x45786966 && view.getUint16(offset + 6, false) === 0x0000) {
          const tiffOffset = offset + 8;
          const parsed = parseTiffHeader(view, tiffOffset);
          if (parsed.lat !== null && parsed.lon !== null) {
            extractedLat = parsed.lat;
            extractedLon = parsed.lon;
          }
          if (parsed.dateTime) {
            extractedDate = parsed.dateTime;
          }
        }
        offset += length;
        break;
      } else if ((marker & 0xff00) === 0xff00) {
        // Skip other markers (APP0, APP2, SOF, etc.)
        if (marker === 0xffda || marker === 0xffd9) {
          // Start of scan or End of image
          break;
        }
        const length = view.getUint16(offset, false);
        offset += length;
      } else {
        break;
      }
    }
  }

  // Coordinate range validation
  let gpsValid = false;
  if (extractedLat !== null && extractedLon !== null) {
    if (
      !isNaN(extractedLat) &&
      !isNaN(extractedLon) &&
      extractedLat >= -90 &&
      extractedLat <= 90 &&
      extractedLon >= -180 &&
      extractedLon <= 180
    ) {
      gpsValid = true;
    } else {
      extractedLat = null;
      extractedLon = null;
    }
  }

  const gps: ExtractedGPS = gpsValid
    ? {
        latitude: extractedLat,
        longitude: extractedLon,
        source: "EXIF",
        confidence: "HIGH",
        status: "DETECTED",
      }
    : {
        latitude: null,
        longitude: null,
        source: "NONE",
        confidence: "NONE",
        status: "MISSING",
      };

  const timestamp: ExtractedTimestamp = extractedDate
    ? {
        value: extractedDate,
        source: "EXIF",
        confidence: "HIGH",
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

interface ParsedTiffData {
  lat: number | null;
  lon: number | null;
  dateTime: string | null;
}

function parseTiffHeader(view: DataView, tiffStart: number): ParsedTiffData {
  const result: ParsedTiffData = { lat: null, lon: null, dateTime: null };
  if (tiffStart + 8 > view.byteLength) return result;

  const byteOrder = view.getUint16(tiffStart, false);
  const isLittle = byteOrder === 0x4949; // "II"
  if (!isLittle && byteOrder !== 0x4d4d) {
    return result;
  }

  const fortyTwo = view.getUint16(tiffStart + 2, isLittle);
  if (fortyTwo !== 0x002a) return result;

  const firstIfdOffset = view.getUint32(tiffStart + 4, isLittle);
  if (firstIfdOffset < 8) return result;

  let exifSubIfdOffset: number | null = null;
  let gpsIfdOffset: number | null = null;

  // Parse IFD0
  const ifd0Start = tiffStart + firstIfdOffset;
  if (ifd0Start + 2 <= view.byteLength) {
    const numEntries = view.getUint16(ifd0Start, isLittle);
    let entryOffset = ifd0Start + 2;

    for (let i = 0; i < numEntries; i++) {
      if (entryOffset + 12 > view.byteLength) break;
      const tag = view.getUint16(entryOffset, isLittle);

      // ExifSubIFD Pointer: 0x8769
      if (tag === 0x8769) {
        exifSubIfdOffset = view.getUint32(entryOffset + 8, isLittle);
      }
      // GPSInfoIFD Pointer: 0x8825
      else if (tag === 0x8825) {
        gpsIfdOffset = view.getUint32(entryOffset + 8, isLittle);
      }
      // DateTime: 0x0132
      else if (tag === 0x0132 && !result.dateTime) {
        result.dateTime = readStringTag(view, tiffStart, entryOffset, isLittle);
      }

      entryOffset += 12;
    }
  }

  // Parse ExifSubIFD for DateTimeOriginal (0x9003)
  if (exifSubIfdOffset !== null) {
    const subIfdStart = tiffStart + exifSubIfdOffset;
    if (subIfdStart + 2 <= view.byteLength) {
      const numEntries = view.getUint16(subIfdStart, isLittle);
      let entryOffset = subIfdStart + 2;
      for (let i = 0; i < numEntries; i++) {
        if (entryOffset + 12 > view.byteLength) break;
        const tag = view.getUint16(entryOffset, isLittle);
        if (tag === 0x9003 || (tag === 0x9004 && !result.dateTime)) {
          const dt = readStringTag(view, tiffStart, entryOffset, isLittle);
          if (dt) result.dateTime = dt;
        }
        entryOffset += 12;
      }
    }
  }

  // Format EXIF DateTime string ("YYYY:MM:DD HH:MM:SS" -> ISO)
  if (result.dateTime) {
    result.dateTime = formatExifDate(result.dateTime);
  }

  // Parse GPSInfoIFD
  if (gpsIfdOffset !== null) {
    const gpsIfdStart = tiffStart + gpsIfdOffset;
    if (gpsIfdStart + 2 <= view.byteLength) {
      const numEntries = view.getUint16(gpsIfdStart, isLittle);
      let entryOffset = gpsIfdStart + 2;

      let latRef: string | null = null;
      let lonRef: string | null = null;
      let latDMS: [number, number, number] | null = null;
      let lonDMS: [number, number, number] | null = null;

      for (let i = 0; i < numEntries; i++) {
        if (entryOffset + 12 > view.byteLength) break;
        const tag = view.getUint16(entryOffset, isLittle);

        if (tag === 0x0001) {
          // GPSLatitudeRef (ASCII 2 bytes)
          latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        } else if (tag === 0x0002) {
          // GPSLatitude (3 RATIONALs)
          latDMS = readRationals(view, tiffStart, entryOffset, isLittle);
        } else if (tag === 0x0003) {
          // GPSLongitudeRef (ASCII 2 bytes)
          lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        } else if (tag === 0x0004) {
          // GPSLongitude (3 RATIONALs)
          lonDMS = readRationals(view, tiffStart, entryOffset, isLittle);
        }

        entryOffset += 12;
      }

      if (latDMS && lonDMS) {
        let lat = latDMS[0] + latDMS[1] / 60.0 + latDMS[2] / 3600.0;
        let lon = lonDMS[0] + lonDMS[1] / 60.0 + lonDMS[2] / 3600.0;
        if (latRef === "S") lat = -lat;
        if (lonRef === "W") lon = -lon;
        result.lat = lat;
        result.lon = lon;
      }
    }
  }

  return result;
}

function readStringTag(view: DataView, tiffStart: number, entryOffset: number, isLittle: boolean): string | null {
  const count = view.getUint32(entryOffset + 4, isLittle);
  if (count <= 0) return null;
  const valueOffset = count > 4
    ? tiffStart + view.getUint32(entryOffset + 8, isLittle)
    : entryOffset + 8;

  if (valueOffset + count > view.byteLength) return null;

  let str = "";
  for (let i = 0; i < count; i++) {
    const charCode = view.getUint8(valueOffset + i);
    if (charCode === 0) break; // null terminator
    str += String.fromCharCode(charCode);
  }
  return str.trim() || null;
}

function readRationals(
  view: DataView,
  tiffStart: number,
  entryOffset: number,
  isLittle: boolean,
): [number, number, number] | null {
  const valueOffset = tiffStart + view.getUint32(entryOffset + 8, isLittle);
  if (valueOffset + 24 > view.byteLength) return null;

  const vals: number[] = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(valueOffset + i * 8, isLittle);
    const den = view.getUint32(valueOffset + i * 8 + 4, isLittle);
    vals.push(den === 0 ? 0 : num / den);
  }
  return [vals[0], vals[1], vals[2]];
}

function formatExifDate(raw: string): string | null {
  const match = raw.match(/^(\d{4})[:/-](\d{2})[:/-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return raw;
  const [, year, month, day, hours, minutes, seconds] = match;
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
