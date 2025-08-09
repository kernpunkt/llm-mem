import { describe, it, expect, vi, beforeEach } from "vitest";
import { CoverageService } from "../../src/mem-coverage/coverage-service.js";
import { MemoryService } from "../../src/memory/memory-service.js";

describe("CoverageService", () => {
  let memoryService: MemoryService;
  let svc: CoverageService;

  beforeEach(() => {
    memoryService = {
      // @ts-expect-error - partial mock
      getAllMemories: vi.fn().mockResolvedValue([
        { id: "1", title: "A", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
          "src/index.ts:1-10",
          "src/index.ts:20-30"
        ] },
        { id: "2", title: "B", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
          "src/utils/a.ts:5-5"
        ] }
      ])
    } as unknown as MemoryService;
    svc = new CoverageService(memoryService);
  });

  it("builds coverage map from memory sources", async () => {
    const map = await svc.buildCoverageMap();
    expect(map.size).toBe(2);
    expect(map.get("src/index.ts")?.length).toBe(2);
    expect(map.get("src/utils/a.ts")?.length).toBe(1);
  });

  it("generates a basic coverage report with merged ranges", async () => {
    // Stub file totals
    // @ts-expect-error access private field for test by as any
    (svc as any).cachedTotals.set("src/index.ts", 40);
    // @ts-expect-error access private field for test by as any
    (svc as any).cachedTotals.set("src/utils/a.ts", 10);

    // Bypass populateTotals to use the stubbed totals
    // @ts-expect-error override private method
    svc.populateTotals = vi.fn();

    const report = await svc.generateReport({ threshold: 80 });
    expect(report.summary.totalFiles).toBe(2);
    expect(report.summary.totalLines).toBe(50);
    expect(report.summary.coveredLines).toBe(10 + 11 + 1); // 1-10 (10 lines), 20-30 (11), 5-5 (1)
    expect(report.files.find(f => f.path === "src/index.ts")?.coveragePercentage).toBeCloseTo(((21)/40)*100, 5);
  });
});


