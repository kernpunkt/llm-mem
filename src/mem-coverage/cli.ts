#!/usr/bin/env node
import { CoverageOptions } from "./types.js";
import { parseSourceString } from "./source-parser.js";
import { CoverageService } from "./coverage-service.js";
import { MemoryService } from "../memory/memory-service.js";
import { generateConsoleReport } from "./report-generator.js";
import { BasicConfigParser } from "./config-parser.js";

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
    `--memoryStorePath=PATH  Path to memory store\n` +
    `--indexPath=PATH        Path to search index\n` +
    `--verbose               Verbose output`
  );
}

export function validateOptions(options: CoverageOptions): { ok: boolean; message?: string } {
  if (options.threshold !== undefined) {
    const t = options.threshold;
    if (!Number.isFinite(t) || t < 0 || t > 100) {
      return { ok: false, message: `Invalid --threshold value: ${options.threshold}. Must be between 0 and 100.` };
    }
  }
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
  const report = await coverageService.generateReport(options);
  console.log(generateConsoleReport(report));

  let exitCode = 0;
  if (typeof options.threshold === "number") {
    const ok = report.summary.coveragePercentage >= options.threshold;
    if (!ok) {
      exitCode = 1;
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
      options = { ...cfg, ...options };
      if (options.verbose) console.log("Loaded config:", JSON.stringify(cfg));
    } catch (e) {
      console.error(`Failed to load config from ${options.config}:`, e);
    }
  }
  // If threshold not explicitly provided, use config overall threshold if present
  if (options.threshold === undefined) {
    const overall = (options as any)?.thresholds?.overall;
    if (typeof overall === "number") options.threshold = overall;
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


