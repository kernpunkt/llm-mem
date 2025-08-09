import { CoverageReport, FileCoverageReport } from "./types.js";

export function generateConsoleReport(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push(`Documentation Coverage Report`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`Summary:`);
  lines.push(`  Files: ${report.summary.totalFiles}`);
  lines.push(`  Lines: ${report.summary.totalLines}`);
  lines.push(`  Covered: ${report.summary.coveredLines}`);
  lines.push(`  Coverage: ${report.summary.coveragePercentage.toFixed(2)}%`);
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
  parts.push(`- ${file.path} :: ${pct.toFixed(2)}% (${file.coveredLines}/${file.totalLines})`);
  if (
    (typeof file.functionsTotal === "number" && file.functionsTotal > 0) ||
    (typeof file.classesTotal === "number" && file.classesTotal > 0)
  ) {
    const fTot = file.functionsTotal ?? 0;
    const fCov = file.functionsCovered ?? 0;
    const cTot = file.classesTotal ?? 0;
    const cCov = file.classesCovered ?? 0;
    parts.push(`  Symbols: functions ${fCov}/${fTot}, classes ${cCov}/${cTot}`);
  }
  if (file.uncoveredSections.length > 0) {
    const segments = file.uncoveredSections.map(s => `${s.start}-${s.end}`).join(", ");
    parts.push(`  Uncovered: ${segments}`);
  }
  return parts.join("\n");
}


