import { describe, it, expect } from "vitest";
import { generateConsoleReport } from "../../src/mem-coverage/report-generator.js";
import { CoverageReport } from "../../src/mem-coverage/types.js";

describe("report-generator", () => {
  it("renders a report with summary, files, and recommendations", () => {
    const report: CoverageReport = {
      summary: {
        totalFiles: 2,
        totalLines: 100,
        coveredLines: 60,
        coveragePercentage: 60,
        undocumentedFiles: ["src/a.ts"],
        lowCoverageFiles: ["src/a.ts", "src/b.ts"],
      },
      files: [
        { path: "src/a.ts", totalLines: 50, coveredLines: 10, coveragePercentage: 20, uncoveredSections: [{ start: 11, end: 50 }], functionsTotal: 2, functionsCovered: 1, classesTotal: 1, classesCovered: 0 },
        { path: "src/b.ts", totalLines: 50, coveredLines: 50, coveragePercentage: 100, uncoveredSections: [], functionsTotal: 1, functionsCovered: 1, classesTotal: 0, classesCovered: 0 },
      ],
      recommendations: [
        { file: "src/a.ts", message: "Add docs", priority: "high" }
      ],
      generatedAt: new Date().toISOString(),
    };

    const output = generateConsoleReport(report);
    expect(output).toContain("Documentation Coverage Report");
    expect(output).toContain("Summary:");
    expect(output).toContain("Files:");
    expect(output).toContain("Recommendations:");
    expect(output).toContain("src/a.ts");
    expect(output).toContain("20.00%");
    expect(output).toContain("Symbols: functions 1/2, classes 0/1");
  });

  it("renders an all-covered scenario (100%)", () => {
    const report: CoverageReport = {
      summary: {
        totalFiles: 1,
        totalLines: 10,
        coveredLines: 10,
        coveragePercentage: 100,
        undocumentedFiles: [],
        lowCoverageFiles: [],
      },
      files: [
        { path: "src/all.ts", totalLines: 10, coveredLines: 10, coveragePercentage: 100, uncoveredSections: [] },
      ],
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };
    const output = generateConsoleReport(report);
    expect(output).toContain("100.00%");
    expect(output).toContain("src/all.ts");
  });

  it("renders a none-covered scenario (0%)", () => {
    const report: CoverageReport = {
      summary: {
        totalFiles: 1,
        totalLines: 10,
        coveredLines: 0,
        coveragePercentage: 0,
        undocumentedFiles: ["src/none.ts"],
        lowCoverageFiles: ["src/none.ts"],
      },
      files: [
        { path: "src/none.ts", totalLines: 10, coveredLines: 0, coveragePercentage: 0, uncoveredSections: [{ start: 1, end: 10 }] },
      ],
      recommendations: [{ file: "src/none.ts", message: "Add docs", priority: "high" }],
      generatedAt: new Date().toISOString(),
    };
    const output = generateConsoleReport(report);
    expect(output).toContain("0.00%");
    expect(output).toContain("src/none.ts");
    expect(output).toContain("Uncovered: 1-10");
  });
});


