import { describe, it, expect, vi } from "vitest";

// Mock coverage-service to control file list and invoke progress
vi.mock("../src/coverage-service.js", () => {
  class MockCoverageService {
    constructor(_ms: unknown) {}
    async generateReport(options: { onProgress?: (c: number, t: number, f: string) => void }) {
      const files = ["a.ts", "b.ts", "c.ts"];
      files.forEach((f, i) => options.onProgress?.(i + 1, files.length, f));
      return {
        summary: {
          totalFiles: files.length,
          totalLines: 3,
          coveredLines: 3,
          coveragePercentage: 100,
          undocumentedFiles: [],
          lowCoverageFiles: [],
        },
        files: files.map((f) => ({ path: f, totalLines: 1, coveredLines: 1, coveragePercentage: 100, uncoveredSections: [] })),
        recommendations: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }
  return { CoverageService: MockCoverageService };
});

describe("CLI progress", () => {
  it("emits progress lines in verbose mode when no onProgress provided", async () => {
    const { runCoverageCLI } = await import("../src/cli.js");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { exitCode } = await runCoverageCLI({ verbose: true, memoryStorePath: "./memories", indexPath: "./memories/index" });
    expect(exitCode).toBe(0);
    const calls = errSpy.mock.calls.map(args => args.join(" "));
    // At least three progress lines
    expect(calls.filter(c => c.includes("[progress]")).length).toBeGreaterThanOrEqual(3);
    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});


