import { describe, it, expect, vi } from "vitest";

// Mock the coverage-service BEFORE importing the CLI
vi.mock("../../src/mem-coverage/coverage-service.js", () => {
  class MockCoverageService {
    constructor(_ms: unknown) {}
    async generateReport() {
      return {
        summary: {
          totalFiles: 1,
          totalLines: 100,
          coveredLines: 50,
          coveragePercentage: 50,
          undocumentedFiles: [],
          lowCoverageFiles: [],
        },
        files: [],
        recommendations: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }
  return { CoverageService: MockCoverageService };
});

describe("coverage CLI threshold", () => {
  it("exits with code 1 and prints message when below threshold", async () => {
    const { runCoverageCLI } = await import("../../src/mem-coverage/cli.js");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { exitCode } = await runCoverageCLI({ threshold: 80, memoryStorePath: "./memories", indexPath: "./memories/index" });
    expect(exitCode).toBe(1);
    expect(errSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});


