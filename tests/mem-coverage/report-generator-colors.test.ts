import { describe, it, expect } from "vitest";
import { generateConsoleReport } from "../../src/mem-coverage/report-generator.js";
import { CoverageReport } from "../../src/mem-coverage/types.js";

describe("report-generator colors and breakdowns", () => {
  it("adds ANSI colors based on percentages and shows symbol breakdowns", () => {
    const report: CoverageReport = {
      summary: {
        totalFiles: 1,
        totalLines: 10,
        coveredLines: 9,
        coveragePercentage: 90,
        undocumentedFiles: [],
        lowCoverageFiles: [],
        functionsTotal: 2,
        functionsCovered: 1,
        classesTotal: 1,
        classesCovered: 0,
      },
      files: [{
        path: "src/a.ts",
        totalLines: 10,
        coveredLines: 9,
        coveragePercentage: 90,
        uncoveredSections: [{ start: 10, end: 10 }],
        functionsTotal: 2,
        functionsCovered: 1,
        classesTotal: 1,
        classesCovered: 0,
        functionsDetails: [
          { name: "foo", isCovered: true },
          { name: "bar", isCovered: false },
        ],
        classesDetails: [
          { name: "Baz", isCovered: false },
        ]
      }],
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };
    const out = generateConsoleReport(report);
    // Check ANSI sequences exist
    expect(out).toMatch(/\u001b\[/);
    // Check symbol breakdown lines
    expect(out).toContain("Functions: foo✓, bar✗");
    expect(out).toContain("Classes: Baz✗");
  });
});


