#!/usr/bin/env node
import { CoverageOptions } from "./types.js";
import { parseSourceString } from "./source-parser.js";
import { CoverageService } from "./coverage-service.js";
import { MemoryService } from "../memory/memory-service.js";
import { generateConsoleReport } from "./report-generator.js";
import { BasicConfigParser } from "./config-parser.js";
import { validateCoverageConfig, validateOptionsStrict, CoverageOptionsSchema } from "./validation.js";
import { FileScanner } from "./file-scanner.js";

export function parseArgs(argv: string[]): CoverageOptions {
  const opts: CoverageOptions = {};
  for (const arg of argv) {
    if (arg.startsWith("--config=")) opts.config = arg.split("=")[1];
    else if (arg.startsWith("--categories=")) opts.categories = arg.split("=")[1].split(",");
    else if (arg.startsWith("--threshold=")) opts.threshold = Number(arg.split("=")[1]);
    else if (arg.startsWith("--exclude=")) opts.exclude = arg.split("=")[1].split(",");
    else if (arg.startsWith("--include=")) opts.include = arg.split("=")[1].split(",");
    else if (arg === "--verbose") opts.verbose = true;
    else if (arg.startsWith("--memoryStorePath=")) opts.memoryStorePath = arg.split("=")[1];
    else if (arg.startsWith("--indexPath=")) opts.indexPath = arg.split("=")[1];
    else if (arg.startsWith("--root-dir=")) opts.rootDir = arg.split("=")[1];
    else if (arg === "--no-scan") opts.scanSourceFiles = false;
    else if (arg === "--dry-run") opts.dryRun = true;
  }
  return opts;
}

export function getUsageText(): string {
  return (
    `Usage: mem-coverage [options]\n\n` +
    `--config=PATH            Path to config file\n` +
    `--categories=A,B        Filter by memory categories\n` +
    `--threshold=NUMBER      Minimum coverage percentage\n` +
    `--exclude=PAT1,PAT2     File patterns to exclude\n` +
    `--include=PAT1,PAT2     File patterns to include\n` +
    `--root-dir=PATH         Root directory for filesystem scanning\n` +
    `--no-scan               Disable filesystem scanning (memory-only mode)\n` +
    `--dry-run               Show what files would be scanned without processing\n` +
    `--memoryStorePath=PATH  Path to memory store\n` +
    `--indexPath=PATH        Path to search index\n` +
    `--verbose               Verbose output`
  );
}

export function validateOptions(options: CoverageOptions): { ok: boolean; message?: string } {
  // Backward-compatible validation used by tests
  if (options.threshold !== undefined) {
    const t = options.threshold;
    if (!Number.isFinite(t) || t < 0 || t > 100) {
      return { ok: false, message: `Invalid --threshold value: ${options.threshold}. Must be between 0 and 100.` };
    }
  }
  // Extended validation (non-breaking): use schema but do not fail test expectations
  const strict = validateOptionsStrict(options);
  if (!strict.ok) return strict;
  return { ok: true };
}

export async function runCoverageCLI(options: CoverageOptions): Promise<{ exitCode: number }> {
  // Generate a basic report
  const cfg = {
    notestorePath: options.memoryStorePath || (global as any).MEMORY_CONFIG?.notestorePath || "./memories",
    indexPath: options.indexPath || (global as any).MEMORY_CONFIG?.indexPath || "./memories/index",
  };
  const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
  const coverageService = new CoverageService(memoryService);

  // If called programmatically with a config path, load and merge it
  let usedOptions: any = { ...options };
  if (options.config) {
    try {
      const parser = new BasicConfigParser();
      const loaded = await parser.parseConfig(options.config);
      usedOptions = {
        ...loaded,
        ...options,
        thresholds: (options as any)?.thresholds ?? loaded.thresholds,
      };
      // If threshold not explicitly provided, use overall from config
      if (typeof usedOptions.threshold !== "number") {
        const overall = (usedOptions as any)?.thresholds?.overall;
        if (typeof overall === "number") usedOptions.threshold = overall;
      }
      // Validate merged options non-fatally for programmatic use
      const v = CoverageOptionsSchema.safeParse(usedOptions);
      if (!v.success) {
        // Log concise validation error but proceed to preserve backward compatibility
        const issue = v.error.issues[0];
        console.error(`Options validation warning: ${issue.path.join(".")}: ${issue.message}`);
      }
    } catch (_e) {
      // For programmatic usage, don't throw; proceed with provided options
    }
  }

  // Handle dry-run mode
  if (usedOptions.dryRun) {
    try {
      const fileScanner = new FileScanner();
      const dryRunResult = await fileScanner.dryRunScan({
        include: usedOptions.include || ["src/**/*.ts", "src/**/*.js"],
        exclude: usedOptions.exclude || ["node_modules/**", "dist/**"],
        rootDir: usedOptions.rootDir || process.cwd()
      });
      
      console.log("=== DRY RUN SCAN RESULTS ===");
      console.log(`Total source files found: ${dryRunResult.totalFiles}`);
      console.log(`Estimated total lines: ${dryRunResult.estimatedLines.toLocaleString()}`);
      console.log("\nSource files to be analyzed:");
      dryRunResult.sourceFiles.forEach(file => console.log(`  ${file}`));
      
      if (dryRunResult.excludedFiles.length > 0) {
        console.log("\nFiles excluded by patterns:");
        dryRunResult.excludedFiles.forEach(file => console.log(`  ${file}`));
      }
      
      console.log("\nRun without --dry-run to generate actual coverage report.");
      return { exitCode: 0 };
    } catch (error) {
      console.error("Dry run failed:", error);
      return { exitCode: 1 };
    }
  }

  // Provide a default progress indicator when verbose and no callback supplied
  if (usedOptions.verbose && typeof usedOptions.onProgress !== "function") {
    const progress = (current: number, total: number, filePath: string) => {
      console.error(`[progress] ${current}/${total} ${filePath}`);
    };
    usedOptions = { ...usedOptions, onProgress: progress };
  }

  const report = await coverageService.generateReport({
    ...usedOptions,
    thresholds: (usedOptions as any)?.thresholds,
  });
  console.log(generateConsoleReport(report));

  let exitCode = 0;
  // Check overall threshold
  if (typeof usedOptions.threshold === "number") {
    const ok = report.summary.coveragePercentage >= usedOptions.threshold;
    if (!ok) {
      exitCode = 1;
      console.error(`Coverage ${report.summary.coveragePercentage.toFixed(2)}% is below threshold ${usedOptions.threshold}%`);
    }
  }
  // Check scoped thresholds
  if (report.summary.scopeThresholdViolations && report.summary.scopeThresholdViolations.length > 0) {
    exitCode = 1;
    for (const violation of report.summary.scopeThresholdViolations) {
      console.error(`${violation.scope}:${violation.actual.toFixed(2)}<${violation.threshold}`);
    }
  }
  return { exitCode };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(getUsageText());
    process.exit(0);
  }

  let options = parseArgs(args);
  if (options.config) {
    try {
      const parser = new BasicConfigParser();
      const cfg = await parser.parseConfig(options.config);
      // Validate configuration strictly for CLI usage
      const cfgValid = validateCoverageConfig(cfg);
      if (!cfgValid.ok) {
        console.error(cfgValid.message);
        process.exitCode = 1;
        return;
      }
      // Merge config with options, but don't override explicit CLI args
      options = {
        ...cfg,
        ...options,
        // Preserve thresholds from config if not overridden by CLI
        thresholds: options.threshold !== undefined ? { overall: options.threshold } : cfg.thresholds
      } as any;
      if (options.verbose) console.log("Loaded config:", JSON.stringify(cfg));
                    } catch (_e) {
                  console.error(`Failed to load config from ${options.config}:`, _e);
                }
  }
  // If threshold not explicitly provided, use config overall threshold if present
  if ((options as any).threshold === undefined) {
    const overall = (options as any)?.thresholds?.overall;
    if (typeof overall === "number") (options as any).threshold = overall;
  }
  if (options.verbose) {
    console.log("Options:", JSON.stringify(options));
  }

  // Placeholder for initial wiring. We'll expand in later steps.
  // Demonstrate source parsing works as a smoke test when a sample is passed via env.
  const sample = process.env.MEM_COVERAGE_SAMPLE;
  if (sample) {
    const parsed = parseSourceString(sample);
    console.log("Parsed sample:", parsed);
  }

  const validation = validateOptions(options);
  if (!validation.ok) {
    console.error(validation.message);
    process.exitCode = 1;
    return;
  }

  const { exitCode } = await runCoverageCLI(options);
  if (exitCode !== 0) process.exitCode = exitCode;
}

if (import.meta.url === new URL(import.meta.url).href) {
  // call and handle promise
  main().catch((err) => {
    console.error("mem-coverage CLI failed:", err);
    process.exitCode = 1;
  });
}


