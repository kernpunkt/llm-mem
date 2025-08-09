#!/usr/bin/env node
import { CoverageOptions } from "./types.js";
import { parseSourceString } from "./source-parser.js";
import { CoverageService } from "./coverage-service.js";
import { MemoryService } from "../memory/memory-service.js";
import { generateConsoleReport } from "./report-generator.js";

function parseArgs(argv: string[]): CoverageOptions {
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: mem-coverage [options]\n\n` +
      `--config=PATH            Path to config file\n` +
      `--categories=A,B        Filter by memory categories\n` +
      `--threshold=NUMBER      Minimum coverage percentage\n` +
      `--exclude=PAT1,PAT2     File patterns to exclude\n` +
      `--include=PAT1,PAT2     File patterns to include\n` +
      `--memoryStorePath=PATH  Path to memory store\n` +
      `--indexPath=PATH        Path to search index\n` +
      `--verbose               Verbose output`);
    process.exit(0);
  }

  const options = parseArgs(args);
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

  // Generate a basic report
  const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
  const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
  const coverageService = new CoverageService(memoryService);
  const report = await coverageService.generateReport(options);
  console.log(generateConsoleReport(report));

  if (typeof options.threshold === "number") {
    const ok = report.summary.coveragePercentage >= options.threshold;
    if (!ok) {
      process.exitCode = 1;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();


