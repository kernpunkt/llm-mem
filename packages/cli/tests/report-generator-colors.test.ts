import { describe, it, expect } from "vitest";
import { generateConsoleReport } from "../src/report-generator.js";
import { CoverageReport } from "../src/types.js";

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
    // Check ANSI sequences exist (using string search to avoid regex control character issues)
    expect(out).toContain("\x1b[");
    // Check that our new table format shows the coverage percentages
    expect(out).toContain("90.00");
    expect(out).toContain("50.00"); // Function coverage: 1/2 = 50%
    expect(out).toContain("0.00");  // Class coverage: 0/1 = 0%
    expect(out).toContain("10");    // Uncovered line number
  });
});


