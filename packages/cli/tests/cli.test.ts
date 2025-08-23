import { describe, it, expect, vi } from "vitest";

// Mock the coverage-service BEFORE importing the CLI to prevent real database operations
vi.mock("../src/coverage-service.js", () => {
  class MockCoverageService {
    constructor(_ms: unknown) {}
    async generateReport() {
      return {
        summary: {
          totalFiles: 1,
          totalLines: 100,
          coveredLines: 100,
          coveragePercentage: 100,
          undocumentedFiles: [],
          lowCoverageFiles: [],
          scopes: [],
          scopeThresholdViolations: [],
          functionsTotal: 0,
          functionsCovered: 0,
          classesTotal: 0,
          classesCovered: 0,
        },
        files: [],
        recommendations: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }
  return { CoverageService: MockCoverageService };
});

// Mock report-generator to prevent stdout pollution
vi.mock("../src/report-generator.js", () => ({
  generateConsoleReport: vi.fn().mockReturnValue("Mock Coverage Report"),
}));

import { runCoverageCLI, parseArgs, getUsageText, validateOptions } from "../src/mem-coverage.js";

describe("coverage CLI", () => {
  it("runs with default options and returns exitCode 0 without threshold", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { exitCode } = await runCoverageCLI({ memoryStorePath: "./memories", indexPath: "./memories/index" });
    expect(exitCode).toBe(0);
    spy.mockRestore();
  });

  it("parses CLI arguments", () => {
    const opts = parseArgs([
      "--config=.coverage.json",
      "--categories=DOC,ADR",
      "--threshold=85",
      "--exclude=dist/**,*.test.ts",
      "--include=src/**/*.ts",
      "--memoryStorePath=./memories",
      "--indexPath=./memories/index",
      "--verbose",
    ]);
    expect(opts.config).toBe(".coverage.json");
    expect(opts.categories).toEqual(["DOC", "ADR"]);
    expect(opts.threshold).toBe(85);
    expect(opts.exclude?.length).toBe(2);
    expect(opts.include?.length).toBe(1);
    expect(opts.memoryStorePath).toBe("./memories");
    expect(opts.indexPath).toBe("./memories/index");
    expect(opts.verbose).toBe(true);
  });

  it("returns usage text", () => {
    const text = getUsageText();
    expect(text).toContain("Usage: mem-coverage");
    expect(text).toContain("--config=PATH");
  });

  it("validates options and rejects invalid threshold", () => {
    expect(validateOptions({ threshold: -1 }).ok).toBe(false);
    expect(validateOptions({ threshold: 101 }).ok).toBe(false);
    expect(validateOptions({ threshold: 50 }).ok).toBe(true);
  });
});


