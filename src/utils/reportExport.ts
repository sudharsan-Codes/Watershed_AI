import type { UploadedEvidence, Watershed } from "../types";
import type { UploadedEvidenceAudit } from "../pages/Reports";

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "Not available";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Export uploaded field evidence to CSV.
 * Strict data provenance: Exports uploaded evidence only (no prototype records).
 */
export function exportEvidenceToCSV(watershed: Watershed, items: UploadedEvidence[]): void {
  const uploadedOnly = items.filter((item) => item.source === "uploaded");

  const headers = [
    "Evidence ID",
    "Filename",
    "GPS Available",
    "Latitude",
    "Longitude",
    "Timestamp Available",
    "Capture Timestamp",
    "Watershed Matched",
    "Watershed ID",
    "Watershed Name",
    "Intervention Matched",
    "Intervention ID",
    "Intervention Code",
    "Intervention Type",
    "Distance Meters",
    "Validation Status",
    "Verification Status",
  ];

  const rows = uploadedOnly.map((item) => [
    formatCsvCell(item.id || "Not available"),
    formatCsvCell(item.filename || "Not available"),
    formatCsvCell(item.gpsAvailable ? "Yes" : "No"),
    formatCsvCell(item.latitude != null ? item.latitude : "Not available"),
    formatCsvCell(item.longitude != null ? item.longitude : "Not available"),
    formatCsvCell(item.timestampAvailable ? "Yes" : "No"),
    formatCsvCell(item.captureTimestamp || "Not available"),
    formatCsvCell(item.watershedMatch?.matched ? "Yes" : "No"),
    formatCsvCell(item.watershedMatch?.watershedId || "Not available"),
    formatCsvCell(item.watershedMatch?.watershedName || "Not available"),
    formatCsvCell(item.nearestIntervention?.matched ? "Yes" : "No"),
    formatCsvCell(item.nearestIntervention?.interventionId || "Not available"),
    formatCsvCell(item.nearestIntervention?.code || "Not available"),
    formatCsvCell(item.nearestIntervention?.type || "Not available"),
    formatCsvCell(
      item.nearestIntervention?.distanceMeters != null
        ? Math.round(item.nearestIntervention.distanceMeters * 10) / 10
        : "Not available"
    ),
    formatCsvCell(item.validation?.valid ? "Valid" : "Needs Review"),
    formatCsvCell(item.verification?.status || "requires_verification"),
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `watersight_evidence_audit_${watershed.id}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Watershed Assessment Report and Evidence Verification Audit to PDF
 * via standard browser print interface targeting a high-fidelity formatted document.
 */
export function exportReportToPDF(
  watershed: Watershed,
  audit: UploadedEvidenceAudit,
  items: UploadedEvidence[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const uploadedOnly = items.filter((item) => item.source === "uploaded");
      const generatedAt = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const evidenceRowsHtml =
        uploadedOnly.length > 0
          ? uploadedOnly
              .map((item, idx) => {
                const gpsText =
                  item.gpsAvailable && item.latitude != null && item.longitude != null
                    ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
                    : "Not available";
                const timeText = item.captureTimestamp || "Not available";
                const wsMatchText = item.watershedMatch?.matched
                  ? item.watershedMatch.watershedName || "Matched"
                  : "Unmatched";
                const intMatchText = item.nearestIntervention?.matched
                  ? `${item.nearestIntervention.code || "Matched"} (${item.nearestIntervention.type || "Intervention"})`
                  : "Unmatched";
                const distText =
                  item.nearestIntervention?.distanceMeters != null
                    ? `${Math.round(item.nearestIntervention.distanceMeters)} m`
                    : "Not available";
                const validText = item.validation?.valid ? "Valid" : "Needs Review";
                const verifText =
                  item.verification?.status === "verified"
                    ? "Verified"
                    : item.verification?.status === "rejected"
                    ? "Rejected"
                    : "Requires Review";

                return `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td style="font-weight: 600; color: #0f172a;">${escapeHtml(item.filename)}</td>
                  <td style="font-family: monospace; font-size: 11px;">${escapeHtml(gpsText)}</td>
                  <td>${escapeHtml(timeText)}</td>
                  <td>${escapeHtml(wsMatchText)}</td>
                  <td>${escapeHtml(intMatchText)}</td>
                  <td>${escapeHtml(distText)}</td>
                  <td>
                    <span class="badge ${item.validation?.valid ? "badge-valid" : "badge-warning"}">
                      ${escapeHtml(validText)}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${
                      item.verification?.status === "verified"
                        ? "badge-verified"
                        : item.verification?.status === "rejected"
                        ? "badge-rejected"
                        : "badge-review"
                    }">
                      ${escapeHtml(verifText)}
                    </span>
                  </td>
                </tr>
              `;
              })
              .join("")
          : `<tr><td colspan="9" style="text-align: center; padding: 18px; color: #64748b; font-style: italic;">No uploaded field evidence recorded for this watershed.</td></tr>`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WATERSIGHT AI — Watershed Assessment Report (${escapeHtml(watershed.name)})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
      padding: 10px;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0369a1;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .demo-pill {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-top: 4px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0369a1;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 10px;
    }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .card-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
    }
    .card-value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .audit-summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .audit-summary-table th, .audit-summary-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      font-size: 11.5px;
    }
    .audit-summary-table th {
      background: #f1f5f9;
      text-align: left;
      font-weight: 600;
      color: #334155;
      width: 50%;
    }
    .audit-summary-table td {
      background: #ffffff;
      font-weight: 500;
    }
    .table-evidence {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 6px;
      margin-bottom: 16px;
    }
    .table-evidence th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .table-evidence td {
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 8px;
      vertical-align: middle;
    }
    .table-evidence tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-valid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-verified { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-review { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 20px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        padding: 0;
      }
      tr {
        page-break-inside: avoid;
      }
      .card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">WATERSIGHT AI</div>
      <div class="brand-subtitle">Watershed Assessment Report</div>
    </div>
    <div class="report-meta">
      <div><strong>Date Generated:</strong> ${escapeHtml(generatedAt)}</div>
      <div><strong>SIH Problem:</strong> SIH26015</div>
      <div><span class="demo-pill">Demonstration Mode</span></div>
    </div>
  </div>

  <div class="section-title">Watershed Overview</div>
  <div class="overview-grid">
    <div class="card">
      <div class="card-label">Watershed</div>
      <div class="card-value">${escapeHtml(watershed.name)}</div>
    </div>
    <div class="card">
      <div class="card-label">Location</div>
      <div class="card-value">${escapeHtml(watershed.district)}, ${escapeHtml(watershed.state)}</div>
    </div>
    <div class="card">
      <div class="card-label">Area</div>
      <div class="card-value">${escapeHtml(watershed.areaHectares.toLocaleString("en-IN"))} ha</div>
    </div>
    <div class="card">
      <div class="card-label">Status</div>
      <div class="card-value">${escapeHtml(watershed.status)}</div>
    </div>
  </div>

  <div class="section-title">Field Evidence Audit (Uploaded Field Evidence Only)</div>
  <table class="audit-summary-table">
    <tr>
      <th>Total Uploaded Evidence</th>
      <td><strong>${audit.totalUploaded}</strong> ingested records</td>
    </tr>
    <tr>
      <th>GPS Available / Missing</th>
      <td><span style="color: #166534; font-weight: 700;">${audit.gpsAvailable} Available</span> / <span style="color: #b91c1c;">${audit.gpsMissing} Missing</span></td>
    </tr>
    <tr>
      <th>Timestamp Available / Missing</th>
      <td><span style="color: #166534; font-weight: 700;">${audit.timestampAvailable} Available</span> / <span style="color: #b91c1c;">${audit.timestampMissing} Missing</span></td>
    </tr>
    <tr>
      <th>Watershed Matched / Unmatched</th>
      <td><span style="color: #166534; font-weight: 700;">${audit.watershedMatched} Matched</span> / <span style="color: #b91c1c;">${audit.watershedUnmatched} Unmatched</span></td>
    </tr>
    <tr>
      <th>Intervention Matched / Unmatched</th>
      <td><span style="color: #166534; font-weight: 700;">${audit.interventionMatched} Matched</span> / <span style="color: #b91c1c;">${audit.interventionUnmatched} Unmatched</span></td>
    </tr>
    <tr>
      <th>Valid / Needs Review</th>
      <td><span style="color: #166534; font-weight: 700;">${audit.validCount} Valid</span> / <span style="color: #b45309;">${audit.needsReviewCount} Needs Review</span></td>
    </tr>
    <tr>
      <th>Verified / Requires Review / Rejected</th>
      <td>
        <span style="color: #15803d; font-weight: 700;">${audit.verifiedCount} Verified (${audit.verifiedPct}%)</span> · 
        <span style="color: #b45309;">${audit.requiresVerificationCount} Requires Review</span> · 
        <span style="color: #b91c1c;">${audit.rejectedCount} Rejected</span>
      </td>
    </tr>
    <tr>
      <th>Field Verification Rate</th>
      <td><strong style="color: #15803d; font-size: 13px;">${audit.verifiedPct}%</strong> (Confirmed by field reviewers)</td>
    </tr>
  </table>

  <div class="section-title">Evidence Details (Uploaded Field Evidence)</div>
  <table class="table-evidence">
    <thead>
      <tr>
        <th style="width: 28px; text-align: center;">#</th>
        <th>Filename</th>
        <th>GPS Coordinates</th>
        <th>Capture Timestamp</th>
        <th>Watershed Match</th>
        <th>Intervention Match</th>
        <th>Distance</th>
        <th>Validation</th>
        <th>Verification</th>
      </tr>
    </thead>
    <tbody>
      ${evidenceRowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div><strong>WATERSIGHT AI</strong> — Geospatial Intelligence & Evidence Monitoring</div>
    <div>Prototype Demonstration — Not a verified government record</div>
  </div>
</body>
</html>`;

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        document.body.removeChild(iframe);
        throw new Error("Unable to create printable frame document");
      }

      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve();
          }, 1500);
        } catch (err) {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          reject(err);
        }
      }, 300);
    } catch (err) {
      reject(err);
    }
  });
}
