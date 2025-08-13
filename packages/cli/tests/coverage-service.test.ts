import { describe, it, expect, vi, beforeEach } from "vitest";
import { CoverageService } from "../src/coverage-service.js";
import { MemoryService } from "@llm-mem/shared";

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

    const report = await svc.generateReport({ threshold: 80, scanSourceFiles: false });
    expect(report.summary.totalFiles).toBe(2);
    expect(report.summary.totalLines).toBe(50);
    expect(report.summary.coveredLines).toBe(10 + 11 + 1); // 1-10 (10 lines), 20-30 (11), 5-5 (1)
    expect(report.files.find(f => f.path === "src/index.ts")?.coveragePercentage).toBeCloseTo(((21)/40)*100, 5);
  });

  it("treats file-only sources as full coverage for that file", async () => {
    (memoryService.getAllMemories as any).mockResolvedValueOnce([
      { id: "1", title: "A", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
        "src/whole.ts"
      ] }
    ]);
    // @ts-expect-error access private field for test by as any
    (svc as any).cachedTotals.set("src/whole.ts", 25);
    // @ts-expect-error override private method
    svc.populateTotals = vi.fn();
    const report = await svc.generateReport({ scanSourceFiles: false });
    const file = report.files.find(f => f.path === "src/whole.ts");
    expect(file?.coveragePercentage).toBe(100);
  });

  it("includes function/class granular coverage using AST spans when available", async () => {
    // Add a file path to map and totals
    // @ts-expect-error access private field for test by as any
    (svc as any).cachedTotals.set("tests/tmp/sample.ts", 10);
    // @ts-expect-error override populateTotals to no-op
    svc.populateTotals = vi.fn();
    // Mock memory service to point to the sample file
    (memoryService.getAllMemories as any).mockResolvedValueOnce([
      { id: "x", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [], sources: [
        "tests/tmp/sample.ts:1-10"
      ]}
    ]);

    // Create a temp file with a function and class
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const tmp = path.join(process.cwd(), "tests/tmp/sample.ts");
    await fs.mkdir(path.dirname(tmp), { recursive: true });
    await fs.writeFile(tmp, `export function a(){}\nexport class C { m(){} }\n`, "utf8");

    const report = await svc.generateReport({ scanSourceFiles: false });
    const fc = report.files.find(f => f.path === "tests/tmp/sample.ts");
    expect(fc?.coveredLines).toBe(10);
    // We do not expose granular arrays in report currently, but ensure no throw occurred
  });

  it("logs invalid source entries with memory ID and title to stderr", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Mock memory service with invalid source entries
    (memoryService.getAllMemories as any).mockResolvedValueOnce([
      { 
        id: "test-memory-id-123", 
        title: "Test Memory Title", 
        content: "", 
        tags: [], 
        category: "DOC", 
        created_at: "", 
        updated_at: "", 
        last_reviewed: "", 
        file_path: "", 
        links: [], 
        sources: [
          "",
          "src/valid.ts:1-10"
        ] 
      }
    ]);

    const map = await svc.buildCoverageMap();
    
    // Should log the invalid source entry
    expect(consoleSpy).toHaveBeenCalledWith(
      'Skipping invalid source entry in memory "test-memory-id-123" ("Test Memory Title"): "" - reason: Source string is empty'
    );
    
    // Should still process valid sources
    expect(map.size).toBe(1);
    expect(map.get("src/valid.ts")?.length).toBe(1);
    
    consoleSpy.mockRestore();
  });
});


