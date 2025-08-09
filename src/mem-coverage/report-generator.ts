import { CoverageReport, FileCoverageReport } from "./types.js";

function color(text: string, code: number): string { return `\u001b[${code}m${text}\u001b[0m`; }
function green(text: string): string { return color(text, 32); }
function yellow(text: string): string { return color(text, 33); }
function red(text: string): string { return color(text, 31); }

function colorForPct(pct: number): (s: string) => string {
  if (pct >= 90) return green;
  if (pct >= 60) return yellow;
  return red;
}

export function generateConsoleReport(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push(`Documentation Coverage Report`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`Summary:`);
  lines.push(`  Files: ${report.summary.totalFiles}`);
  lines.push(`  Lines: ${report.summary.totalLines}`);
  lines.push(`  Covered: ${report.summary.coveredLines}`);
  {
    const pct = report.summary.coveragePercentage;
    const paint = colorForPct(pct);
    lines.push(`  Coverage: ${paint(pct.toFixed(2) + "%")}`);
  }
  if (typeof report.summary.functionsTotal === "number") {
    const fTot = report.summary.functionsTotal ?? 0;
    const fCov = report.summary.functionsCovered ?? 0;
    const fPct = report.summary.functionsCoveragePercentage ?? (fTot === 0 ? 100 : (fCov / fTot) * 100);
    const paint = colorForPct(fPct);
    lines.push(`  Functions: ${fCov}/${fTot} (${paint(fPct.toFixed(2) + "%")})`);
  }
  if (typeof report.summary.classesTotal === "number") {
    const cTot = report.summary.classesTotal ?? 0;
    const cCov = report.summary.classesCovered ?? 0;
    const cPct = report.summary.classesCoveragePercentage ?? (cTot === 0 ? 100 : (cCov / cTot) * 100);
    const paint = colorForPct(cPct);
    lines.push(`  Classes: ${cCov}/${cTot} (${paint(cPct.toFixed(2) + "%")})`);
  }
  if (report.summary.undocumentedFiles.length > 0) {
    lines.push(`  Undocumented files (${report.summary.undocumentedFiles.length}):`);
    for (const f of report.summary.undocumentedFiles) lines.push(`    - ${f}`);
  }
  if (report.summary.lowCoverageFiles.length > 0) {
    lines.push(`  Low coverage files (${report.summary.lowCoverageFiles.length}):`);
    for (const f of report.summary.lowCoverageFiles) lines.push(`    - ${f}`);
  }
  lines.push("");
  lines.push(`Files:`);
  for (const f of report.files) {
    lines.push(renderFile(f));
  }
  if (report.recommendations.length > 0) {
    lines.push("");
    lines.push(`Recommendations:`);
    for (const r of report.recommendations) {
      lines.push(`  [${r.priority}] ${r.file}: ${r.message}`);
    }
  }
  return lines.join("\n");
}

function renderFile(file: FileCoverageReport): string {
  const parts: string[] = [];
  const pct = file.totalLines === 0 ? 100 : (file.coveredLines / file.totalLines) * 100;
  const paint = colorForPct(pct);
  parts.push(`- ${file.path} :: ${paint(pct.toFixed(2) + "%")} (${file.coveredLines}/${file.totalLines})`);
  if (
    (typeof file.functionsTotal === "number" && file.functionsTotal > 0) ||
    (typeof file.classesTotal === "number" && file.classesTotal > 0)
  ) {
    const fTot = file.functionsTotal ?? 0;
    const fCov = file.functionsCovered ?? 0;
    const cTot = file.classesTotal ?? 0;
    const cCov = file.classesCovered ?? 0;
    parts.push(`  Symbols: functions ${fCov}/${fTot}, classes ${cCov}/${cTot}`);
    if (Array.isArray(file.functionsDetails) && file.functionsDetails.length > 0) {
      const list = file.functionsDetails.map(d => `${d.name ?? "(anonymous)"}${d.isCovered ? "✓" : "✗"}`).join(", ");
      parts.push(`  Functions: ${list}`);
    }
    if (Array.isArray(file.classesDetails) && file.classesDetails.length > 0) {
      const list = file.classesDetails.map(d => `${d.name ?? "(anonymous)"}${d.isCovered ? "✓" : "✗"}`).join(", ");
      parts.push(`  Classes: ${list}`);
    }
  }
  if (file.uncoveredSections.length > 0) {
    const segments = file.uncoveredSections.map(s => `${s.start}-${s.end}`).join(", ");
    parts.push(`  Uncovered: ${segments}`);
  }
  return parts.join("\n");
}


