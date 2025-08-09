import { describe, it, expect, vi, beforeEach } from "vitest";
import { CoverageService } from "../../src/mem-coverage/coverage-service.js";
import { MemoryService } from "../../src/memory/memory-service.js";

describe("Coverage recommendations", () => {
  let memoryService: MemoryService;
  let svc: CoverageService;

  beforeEach(() => {
    // @ts-expect-error partial mock
    memoryService = {
      getAllMemories: vi.fn().mockResolvedValue([
        { id: "1", title: "Low", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
          "src/low.ts:1-5"
        ] }
      ])
    } as unknown as MemoryService;
    svc = new CoverageService(memoryService);
  });

  it("adds recommendations for low coverage files based on threshold", async () => {
    // Stub totals and bypass populateTotals
    // @ts-expect-error access private for test
    (svc as any).cachedTotals.set("src/low.ts", 100);
    // @ts-expect-error override private
    svc.populateTotals = vi.fn();

    const report = await svc.generateReport({ threshold: 80 });
    expect(report.summary.lowCoverageFiles).toContain("src/low.ts");
    expect(report.recommendations.length).toBeGreaterThan(0);
    const rec = report.recommendations[0];
    expect(rec.file).toBe("src/low.ts");
    expect(rec.priority).toBe("medium");
    expect(rec.message.toLowerCase()).toContain("uncovered");
  });
});


