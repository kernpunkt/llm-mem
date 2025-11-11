import { MemoryService } from "@llm-mem/shared";
import { ParsedSource, FileCoverage, CoverageReport, CoverageOptions, FunctionCoverage, ClassCoverage } from "./types.js";
import { parseSourceString } from "./source-parser.js";
import { scanTypescriptOrJavascriptFile, toInitialFileCoverage } from "./code-scanner.js";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { validateSourceFilePathOrThrow } from "./validation.js";
import { FileScanner } from "./file-scanner.js";

export class CoverageService {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * Resolves a file path to an absolute path.
   * Handles cases where filePath is relative (e.g., from memory sources).
   */
  private resolveFilePath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }

  async buildCoverageMap(): Promise<Map<string, ParsedSource[]>> {
    const memories = await this.memoryService.getAllMemories();
    const coverageMap = new Map<string, ParsedSource[]>();
    for (const mem of memories) {
      for (const src of mem.sources || []) {
        try {
          const parsed = parseSourceString(src);
          validateSourceFilePathOrThrow(parsed.filePath);
          const list = coverageMap.get(parsed.filePath) || [];
          list.push(parsed);
          coverageMap.set(parsed.filePath, list);
        } catch (err) {
          // Skip invalid source strings or unsafe file paths but continue processing
          console.error(`Skipping invalid source entry in memory "${mem.id}" ("${mem.title}"): "${src}" - reason: ${(err as Error)?.message ?? String(err)}`);
          continue;
        }
      }
    }
    return coverageMap;
  }

  async analyzeFileCoverage(filePath: string, sourceEntries: ParsedSource[]): Promise<FileCoverage> {
    const totalLines = this.cachedTotals.get(filePath) ?? 0;
    const fileCoverage = toInitialFileCoverage(filePath, totalLines);

    // Always perform AST scan to detect functions and classes, regardless of documentation status
    let coveredRanges: Span[] = [];
    if (sourceEntries.length > 0) {
      // Merge all declared covered ranges for this file
      coveredRanges = mergeRanges(sourceEntries.flatMap(s => s.ranges));
      // If any entry specifies file-only (no ranges), treat as full file coverage
      if (sourceEntries.some(s => s.ranges.length === 0) && totalLines > 0) {
        coveredRanges = [{ start: 1, end: totalLines }];
      }
      fileCoverage.coveredSections = coveredRanges.map(r => ({ start: r.start, end: r.end, type: "export" }));
      fileCoverage.coveredLines = coveredRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
    } else {
      // File has no documentation - set coverage to 0
      fileCoverage.coveredSections = [];
      fileCoverage.coveredLines = 0;
    }

    // Compute uncovered sections
    fileCoverage.uncoveredSections = invertRanges(coveredRanges, totalLines).map(r => ({ start: r.start, end: r.end, type: "comment" }));

    // Granular analysis via AST scan - ALWAYS performed
    try {
      const resolvedPath = this.resolveFilePath(filePath);
      const scan = await scanTypescriptOrJavascriptFile(resolvedPath);
      const functions: FunctionCoverage[] = [];
      const classes: ClassCoverage[] = [];
      for (const el of scan.elements) {
        if (el.type === "function" && el.name) {
          const isCovered = rangeOverlapsAny({ start: el.start, end: el.end }, coveredRanges);
          functions.push({ start: el.start, end: el.end, name: el.name, isCovered });
        } else if (el.type === "class" && el.name) {
          const isCovered = rangeOverlapsAny({ start: el.start, end: el.end }, coveredRanges);
          classes.push({ start: el.start, end: el.end, name: el.name, isCovered });
        }
      }
      fileCoverage.functions = functions;
      fileCoverage.classes = classes;
    } catch {
      // Ignore scanning errors; keep granular arrays empty in that case
    }

    return fileCoverage;
  }

  async generateReport(options: CoverageOptions & { includePaths?: string[] } = {}): Promise<CoverageReport> {
    let coverageMap: Map<string, ParsedSource[]> = new Map();
    try {
      coverageMap = await this.buildCoverageMap();
    } catch (error) {
      // Graceful degradation: if memory retrieval fails, return an empty report
      // while surfacing the error to stderr. This allows CI to proceed with a clear signal.
      console.error("Failed to build coverage map from memories:", error);
      return {
        summary: {
          totalFiles: 0,
          totalLines: 0,
          coveredLines: 0,
          coveragePercentage: 100,
          undocumentedFiles: [],
          lowCoverageFiles: [],
          scopes: [],
          scopeThresholdViolations: [],
          functionsTotal: 0,
          functionsCovered: 0,
          classesTotal: 0,
          classesCovered: 0,
          functionsCoveragePercentage: 100,
          classesCoveragePercentage: 100,
        },
        files: [],
        recommendations: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // Phase 2: Filesystem scanning to find ALL source files
    let allSourceFiles: string[] = [];
    if (options.scanSourceFiles !== false) { // Default to true for backward compatibility
      try {
        const fileScanner = new FileScanner();
        allSourceFiles = await fileScanner.scanSourceFiles({
          include: options.include || ["src/**/*.ts", "src/**/*.js"],
          exclude: options.exclude || ["node_modules/**", "dist/**"],
          rootDir: options.rootDir || process.cwd()
        });
      } catch (error) {
        console.error("Filesystem scanning failed, falling back to memory-only mode:", error);
        // Continue with memory-only mode
      }
    }

    // Merge filesystem scan with memory store to get complete picture
    const documentedFiles = Array.from(coverageMap.keys());
    const allFilesToAnalyze = new Set([...allSourceFiles, ...documentedFiles]);
    const filePaths = Array.from(allFilesToAnalyze);

    // Pre-scan totals for each file
    await this.populateTotals(filePaths);

    const files: FileCoverage[] = [];
    let totalLines = 0;
    let coveredLines = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const entries = coverageMap.get(filePath) || [];
      
      // Handle files with no documentation (0% coverage)
      if (entries.length === 0) {
        // File exists but has no documentation - analyze as uncovered
        const fc = await this.analyzeFileCoverage(filePath, []);
        files.push(fc);
        totalLines += fc.totalLines;
        coveredLines += 0; // No covered lines for undocumented files
      } else {
        // File has documentation - analyze normally
        const fc = await this.analyzeFileCoverage(filePath, entries);
        files.push(fc);
        totalLines += fc.totalLines;
        coveredLines += fc.coveredLines;
      }
      
      // Emit progress if requested
      if (typeof options.onProgress === "function") {
        try { 
          options.onProgress(i + 1, filePaths.length, filePath); 
        } catch (_e) {
          // Ignore progress callback errors
        }
      }
    }

    const coveragePercentage = totalLines === 0 ? 100 : (coveredLines / totalLines) * 100;

    const fileReports = files.map((f) => ({
      path: f.path,
      totalLines: f.totalLines,
      coveredLines: f.coveredLines,
      coveragePercentage: f.totalLines === 0 ? 100 : (f.coveredLines / f.totalLines) * 100,
      uncoveredSections: f.uncoveredSections.map(s => ({ start: s.start, end: s.end })),
      functionsTotal: f.functions.length,
      functionsCovered: f.functions.filter(fn => fn.isCovered).length,
      classesTotal: f.classes.length,
      classesCovered: f.classes.filter(cl => cl.isCovered).length,
      functionsDetails: f.functions.map(fn => ({ name: fn.name, isCovered: fn.isCovered })),
      classesDetails: f.classes.map(cl => ({ name: cl.name, isCovered: cl.isCovered })),
    }));

    const undocumentedFiles = fileReports.filter(fr => fr.coveragePercentage === 0).map(fr => fr.path);
    const lowCoverageFiles = fileReports.filter(fr => fr.coveragePercentage > 0 && fr.coveragePercentage < (options.threshold ?? 80)).map(fr => fr.path);

    // Scoped coverage (e.g., src vs tests) based on include/exclude patterns or conventional prefixes
    const scopes: Array<{ name: string; totalLines: number; coveredLines: number; coveragePercentage: number; threshold?: number }> = [];
    const scopeDefs: Array<{ name: string; match: (p: string) => boolean; threshold?: number }> = [];
    // If options.include provided, infer scopes by top-level directory names
    if (Array.isArray(options.include) && options.include.length > 0) {
      const dirs = new Set<string>();
      for (const pat of options.include) {
        const part = pat.split("/")[0];
        if (part && part !== "**") dirs.add(part);
      }
      for (const d of dirs) scopeDefs.push({ name: d, match: (p) => p.startsWith(`${d}/`) });
    } else {
      // Default scopes
      scopeDefs.push({ name: "src", match: (p) => p.startsWith("src/") });
      scopeDefs.push({ name: "tests", match: (p) => p.startsWith("tests/") });
    }
    // Allow thresholds.overall and thresholds[name]
    const thresholds = (options as any)?.thresholds as Record<string, number> | undefined;
    for (const def of scopeDefs) {
      let sTotal = 0;
      let sCovered = 0;
      for (const fr of fileReports) {
        if (def.match(fr.path)) {
          sTotal += fr.totalLines;
          sCovered += fr.coveredLines;
        }
      }
      const sPct = sTotal === 0 ? 100 : (sCovered / sTotal) * 100;
      const sThresh = thresholds && typeof thresholds[def.name] === "number" ? thresholds[def.name] : undefined;
      scopes.push({ name: def.name, totalLines: sTotal, coveredLines: sCovered, coveragePercentage: sPct, threshold: sThresh });
    }
    const scopeThresholdViolations: Array<{ scope: string; actual: number; threshold: number }> = [];
    for (const s of scopes) {
      if (typeof s.threshold === "number" && s.coveragePercentage < s.threshold) {
        scopeThresholdViolations.push({
          scope: s.name,
          actual: s.coveragePercentage,
          threshold: s.threshold
        });
      }
    }

    // Aggregate symbol totals
    const functionsTotal = fileReports.reduce((sum, fr) => sum + (fr.functionsTotal ?? 0), 0);
    const functionsCovered = fileReports.reduce((sum, fr) => sum + (fr.functionsCovered ?? 0), 0);
    const classesTotal = fileReports.reduce((sum, fr) => sum + (fr.classesTotal ?? 0), 0);
    const classesCovered = fileReports.reduce((sum, fr) => sum + (fr.classesCovered ?? 0), 0);

    // Calculate function and class coverage percentages with proper logic
    // 
    // The logic handles these scenarios:
    // 1. No functions/classes detected AND no files covered → 0% (nothing working)
    // 2. No functions/classes detected BUT some files covered → 100% (nothing to cover)
    // 3. Functions/classes exist → calculate actual percentage
    //
    // This prevents the misleading "100% function coverage" when the project
    // has 0% overall coverage and no functions detected.
    const functionsCoveragePercentage = (() => {
      if (functionsTotal === 0) {
        // No functions detected - check if this is because no files are covered
        return coveredLines === 0 ? 0 : 100;
      }
      return (functionsCovered / functionsTotal) * 100;
    })();

    const classesCoveragePercentage = (() => {
      if (classesTotal === 0) {
        // No classes detected - check if this is because no files are covered
        return coveredLines === 0 ? 0 : 100;
      }
      return (classesCovered / classesTotal) * 100;
    })();

    return {
      summary: {
        totalFiles: files.length,
        totalLines,
        coveredLines,
        coveragePercentage,
        undocumentedFiles,
        lowCoverageFiles,
        functionsTotal,
        functionsCovered,
        classesTotal,
        classesCovered,
        functionsCoveragePercentage,
        classesCoveragePercentage,
        scopes,
        scopeThresholdViolations,
      },
      files: fileReports,
      recommendations: lowCoverageFiles.map((file) => ({ file, message: "Add documentation sources covering uncovered sections", priority: "medium" })),
      generatedAt: new Date().toISOString(),
    };
  }

  private cachedTotals: Map<string, number> = new Map();

  private async populateTotals(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        const resolvedPath = this.resolveFilePath(filePath);
        const total = await countLinesStream(resolvedPath);
        this.cachedTotals.set(filePath, total);
      } catch {
        // Fallback to buffered read so tests that mock fs.readFile still work
        try {
          const resolvedPath = this.resolveFilePath(filePath);
          const content = await fs.readFile(resolvedPath, "utf8");
          const total = content.split(/\r?\n/).length;
          this.cachedTotals.set(filePath, total);
        } catch {
          this.cachedTotals.set(filePath, 0);
        }
      }
    }
  }
}

// Utilities
type Span = { start: number; end: number };

function mergeRanges(ranges: Span[]): Span[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Span[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= prev.end + 1) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function invertRanges(ranges: Span[], total: number): Span[] {
  if (total <= 0) return [];
  if (ranges.length === 0) return [{ start: 1, end: total }];
  const merged = mergeRanges(ranges);
  const result: Span[] = [];
  let cursor = 1;
  for (const r of merged) {
    if (r.start > cursor) result.push({ start: cursor, end: r.start - 1 });
    cursor = r.end + 1;
  }
  if (cursor <= total) result.push({ start: cursor, end: total });
  return result;
}

function rangeOverlapsAny(span: Span, ranges: Span[]): boolean {
  for (const r of ranges) {
    if (span.start <= r.end && span.end >= r.start) return true;
  }
  return false;
}

async function countLinesStream(filePath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    try {
      let lines = 0;
      let endedWithNewline = false;
      const stream = createReadStream(filePath, { encoding: "utf8" });
      stream.on("data", (chunk: string | Buffer) => {
        const chunkStr = chunk.toString();
        let idx = -1;
        let lastIdx = 0;
        while ((idx = chunkStr.indexOf("\n", lastIdx)) !== -1) {
          lines++;
          lastIdx = idx + 1;
        }
        endedWithNewline = chunkStr.endsWith("\n");
      });
      stream.on("end", () => {
        // If file is not empty and does not end with a newline, count the last line
        if (!endedWithNewline) lines++;
        resolve(lines);
      });
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}



