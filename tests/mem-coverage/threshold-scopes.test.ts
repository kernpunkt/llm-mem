import { describe, it, expect, vi, beforeEach } from "vitest";
import { CoverageService } from "../../src/mem-coverage/coverage-service.js";
import { MemoryService } from "../../src/memory/memory-service.js";

describe("Scoped thresholds", () => {
  let memoryService: MemoryService;
  let svc: CoverageService;

  beforeEach(() => {
    // @ts-expect-error partial mock
    memoryService = {
      getAllMemories: vi.fn().mockResolvedValue([
        { id: "1", title: "", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
          "src/a.ts:1-10",
        ]},
        { id: "2", title: "", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
          "tests/t.spec.ts:1-1",
        ]},
      ])
    } as unknown as MemoryService;
    svc = new CoverageService(memoryService);
  });

  it("includes scope summaries and flags violations when thresholds provided", async () => {
    // stub totals and bypass populateTotals
    // @ts-expect-error
    (svc as any).cachedTotals.set("src/a.ts", 100);
    // @ts-expect-error
    (svc as any).cachedTotals.set("tests/t.spec.ts", 50);
    // @ts-expect-error
    svc.populateTotals = vi.fn();

    const report = await svc.generateReport({ include: ["src/**", "tests/**"], thresholds: { src: 50, tests: 10 } as any });
    const scopes = report.summary.scopes ?? [];
    const src = scopes.find(s => s.name === "src")!;
    const tests = scopes.find(s => s.name === "tests")!;
    expect(src.coveragePercentage).toBeCloseTo(10);
    expect(tests.coveragePercentage).toBeCloseTo(2);
    expect(report.summary.scopeThresholdViolations?.length).toBeGreaterThan(0);
  });
});


