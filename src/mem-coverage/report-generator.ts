import { CoverageReport, FileCoverageReport } from "./types.js";

function color(text: string, code: number): string { return `\u001b[${code}m${text}\u001b[0m`; }
function green(text: string): string { return color(text, 32); }
function yellow(text: string): string { return color(text, 33); }
function red(text: string): string { return color(text, 31); }
function blue(text: string): string { return color(text, 34); }
function bold(text: string): string { return color(text, 1); }

function colorForPct(pct: number): (s: string) => string {
  if (pct >= 90) return green;
  if (pct >= 60) return yellow;
  return red;
}

export function generateConsoleReport(report: CoverageReport): string {
  const lines: string[] = [];
  
  // Calculate maximum filename length for consistent column width
  const maxFileNameLength = Math.max(
    ...report.files.map(file => {
      const dir = file.path.split("/")[0] || ".";
      return file.path.replace(dir + "/", "").length;
    })
  );
  
  // Ensure minimum width for readability
  const fileNameColumnWidth = Math.max(maxFileNameLength, 16);
  
  // Header
  lines.push(bold("Documentation Coverage Report"));
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  
  // Summary section
  lines.push(bold("Summary:"));
  const summaryPct = report.summary.coveragePercentage;
  const summaryColor = colorForPct(summaryPct);
  lines.push(`  Overall Coverage: ${summaryColor(summaryPct.toFixed(2) + "%")} (${report.summary.coveredLines}/${report.summary.totalLines} lines)`);
  lines.push(`  Files: ${report.summary.totalFiles} | Functions: ${report.summary.functionsCovered}/${report.summary.functionsTotal} | Classes: ${report.summary.classesCovered}/${report.summary.classesTotal}`);
  lines.push("");
  
  // Coverage table header with dynamic width
  const headerSeparator = "-".repeat(fileNameColumnWidth + 2) + "|---------|----------|---------|---------|-------------------";
  lines.push(" % Coverage report");
  lines.push(headerSeparator);
  lines.push(`File${" ".repeat(fileNameColumnWidth - 4)} | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s `);
  lines.push(headerSeparator);
  
  // Overall summary row
  const overallFuncPct = (report.summary.functionsTotal ?? 0) === 0 ? 100 : ((report.summary.functionsCovered ?? 0) / (report.summary.functionsTotal ?? 0)) * 100;
  const overallClassPct = (report.summary.classesTotal ?? 0) === 0 ? 100 : ((report.summary.classesCovered ?? 0) / (report.summary.classesTotal ?? 0)) * 100;
  
  lines.push(`All files${" ".repeat(fileNameColumnWidth - 9)} | ${summaryColor(summaryPct.toFixed(2).padStart(7))} | ${summaryColor(summaryPct.toFixed(2).padStart(9))} | ${summaryColor(overallFuncPct.toFixed(2).padStart(7))} | ${summaryColor(summaryPct.toFixed(2).padStart(7))} |                   `);
  
  // Group files by directory
  const fileGroups = groupFilesByDirectory(report.files);
  
  // Render each directory group
  for (const [dir, files] of fileGroups) {
    if (dir === "All files") continue; // Skip the overall row
    
    // Directory summary row
    const dirStats = calculateDirectoryStats(files);
    const dirFuncPct = dirStats.functionsTotal === 0 ? 100 : (dirStats.functionsCovered / dirStats.functionsTotal) * 100;
    const dirClassPct = dirStats.classesTotal === 0 ? 100 : (dirStats.classesCovered / dirStats.classesTotal) * 100;
    
    lines.push(` ${dir.padEnd(fileNameColumnWidth)} | ${summaryColor(dirStats.coveragePct.toFixed(2).padStart(7))} | ${summaryColor(dirStats.coveragePct.toFixed(2).padStart(9))} | ${summaryColor(dirFuncPct.toFixed(2).padStart(7))} | ${summaryColor(dirStats.coveragePct.toFixed(2).padStart(7))} |                   `);
    
    // Individual files in directory
    for (const file of files) {
      const filePct = file.totalLines === 0 ? 100 : (file.coveredLines / file.totalLines) * 100;
      const fileFuncPct = (file.functionsTotal ?? 0) === 0 ? 100 : ((file.functionsCovered ?? 0) / (file.functionsTotal ?? 0)) * 100;
      const fileClassPct = (file.classesTotal ?? 0) === 0 ? 100 : ((file.classesCovered ?? 0) / (file.classesTotal ?? 0)) * 100;
      
      const fileName = file.path.replace(dir + "/", "").padEnd(fileNameColumnWidth);
      const uncoveredLines = formatUncoveredLines(file.uncoveredSections);
      
      lines.push(`  ${fileName} | ${colorForPct(filePct)(filePct.toFixed(2).padStart(7))} | ${colorForPct(filePct)(filePct.toFixed(2).padStart(9))} | ${colorForPct(fileFuncPct)(fileFuncPct.toFixed(2).padStart(7))} | ${colorForPct(filePct)(filePct.toFixed(2).padStart(7))} | ${uncoveredLines.padEnd(18)}`);
    }
  }
  
  lines.push(headerSeparator);
  lines.push("");
  
  // Key metrics
  if (report.summary.undocumentedFiles.length > 0) {
    lines.push(bold("Undocumented Files:") + ` ${report.summary.undocumentedFiles.length}`);
    for (const f of report.summary.undocumentedFiles.slice(0, 5)) {
      lines.push(`  ${f}`);
    }
    if (report.summary.undocumentedFiles.length > 5) {
      lines.push(`  ... and ${report.summary.undocumentedFiles.length - 5} more`);
    }
    lines.push("");
  }
  
  if (report.summary.lowCoverageFiles.length > 0) {
    lines.push(bold("Low Coverage Files:") + ` ${report.summary.lowCoverageFiles.length}`);
    for (const f of report.summary.lowCoverageFiles.slice(0, 3)) {
      lines.push(`  ${f}`);
    }
    if (report.summary.lowCoverageFiles.length > 3) {
      lines.push(`  ... and ${report.summary.lowCoverageFiles.length - 3} more`);
    }
    lines.push("");
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push(bold("Recommendations:"));
    for (const r of report.recommendations.slice(0, 3)) {
      const priorityColor = r.priority === "high" ? red : r.priority === "medium" ? yellow : green;
      lines.push(`  [${priorityColor(r.priority)}] ${r.file}: ${r.message}`);
    }
    if (report.recommendations.length > 3) {
      lines.push(`  ... and ${report.recommendations.length - 3} more recommendations`);
    }
  }
  
  return lines.join("\n");
}

function groupFilesByDirectory(files: FileCoverageReport[]): Map<string, FileCoverageReport[]> {
  const groups = new Map<string, FileCoverageReport[]>();
  
  for (const file of files) {
    const dir = file.path.split("/")[0] || ".";
    if (!groups.has(dir)) {
      groups.set(dir, []);
    }
    groups.get(dir)!.push(file);
  }
  
  // Sort directories and files within directories
  const sortedGroups = new Map<string, FileCoverageReport[]>();
  for (const [dir, dirFiles] of groups) {
    sortedGroups.set(dir, dirFiles.sort((a, b) => a.path.localeCompare(b.path)));
  }
  
  return sortedGroups;
}

function calculateDirectoryStats(files: FileCoverageReport[]): {
  coveragePct: number;
  functionsTotal: number;
  functionsCovered: number;
  classesTotal: number;
  classesCovered: number;
} {
  let totalLines = 0;
  let coveredLines = 0;
  let functionsTotal = 0;
  let functionsCovered = 0;
  let classesTotal = 0;
  let classesCovered = 0;
  
  for (const file of files) {
    totalLines += file.totalLines;
    coveredLines += file.coveredLines;
    functionsTotal += file.functionsTotal || 0;
    functionsCovered += file.functionsCovered || 0;
    classesTotal += file.classesTotal || 0;
    classesCovered += file.classesCovered || 0;
  }
  
  const coveragePct = totalLines === 0 ? 100 : (coveredLines / totalLines) * 100;
  
  return {
    coveragePct,
    functionsTotal,
    functionsCovered,
    classesTotal,
    classesCovered
  };
}

function formatUncoveredLines(uncoveredSections: Array<{ start: number; end: number }>): string {
  if (uncoveredSections.length === 0) return "";
  
  const segments = uncoveredSections.map(s => {
    if (s.start === s.end) return s.start.toString();
    return `${s.start}-${s.end}`;
  });
  
  const result = segments.join(", ");
  
  // Make it more compact like pnpm test:coverage
  if (result.length > 18) {
    // Try to fit more by using shorter separators
    const compactResult = segments.map(s => {
      if (s.includes("-")) {
        const [start, end] = s.split("-");
        // If range is small, just show start
        if (parseInt(end) - parseInt(start) <= 2) {
          return s;
        }
        // For larger ranges, show start-end
        return s;
      }
      return s;
    }).join(", ");
    
    if (compactResult.length <= 18) {
      return compactResult;
    }
    
    // If still too long, truncate with ellipsis
    return result.substring(0, 15) + "...";
  }
  
  return result;
}


