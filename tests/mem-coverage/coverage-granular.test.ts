import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CoverageService } from "../../src/mem-coverage/coverage-service.js";
import { MemoryService } from "../../src/memory/memory-service.js";

describe("Granular coverage analysis (Step 8)", () => {
  let memoryService: MemoryService;
  let svc: CoverageService;

  beforeEach(() => {
    // @ts-expect-error partial mock for tests
    memoryService = { getAllMemories: async () => [] } as unknown as MemoryService;
    svc = new CoverageService(memoryService);
  });

  it("analyzes function coverage (one of two functions covered)", async () => {
    const file = join(process.cwd(), "tests/tmp/granular_fn.ts");
    await fs.mkdir(join(process.cwd(), "tests/tmp"), { recursive: true });
    const content = [
      "export function a() { return 1 }", // line 1
      "",
      "export function b() { return 2 }", // line 3
      "",
    ].join("\n");
    await fs.writeFile(file, content, "utf8");

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m1", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular_fn.ts:1-1" // covers only function a
      ]
    }]);

    const report = await svc.generateReport({});
    const fr = report.files.find(f => f.path === "tests/tmp/granular_fn.ts")!;
    expect(fr.functionsTotal).toBe(2);
    expect(fr.functionsCovered).toBe(1);
    expect(report.summary.functionsTotal).toBeGreaterThanOrEqual(2);
    expect(report.summary.functionsCovered).toBeGreaterThanOrEqual(1);
  });

  it("analyzes class coverage (class covered, function not covered)", async () => {
    const file = join(process.cwd(), "tests/tmp/granular_class.ts");
    await fs.mkdir(join(process.cwd(), "tests/tmp"), { recursive: true });
    const content = [
      "export class C {",     // 1
      "  m() { return 3 }",   // 2
      "}",                    // 3
      "",                     // 4
      "export function a(){}" // 5
    ].join("\n");
    await fs.writeFile(file, content, "utf8");

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m2", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular_class.ts:1-3" // covers class only
      ]
    }]);

    const report = await svc.generateReport({});
    const fr = report.files.find(f => f.path === "tests/tmp/granular_class.ts")!;
    expect(fr.classesTotal).toBe(1);
    expect(fr.classesCovered).toBe(1);
    expect(fr.functionsTotal).toBe(1);
    expect(fr.functionsCovered).toBe(0);
  });

  it("analyzes mixed coverage (two functions covered, class not covered)", async () => {
    const file = join(process.cwd(), "tests/tmp/granular_mixed.ts");
    await fs.mkdir(join(process.cwd(), "tests/tmp"), { recursive: true });
    const content = [
      "export function a(){}", // 1
      "",                      // 2
      "export class C { m(){} }", // 3
      "",                      // 4
      "export const b = () => {}", // 5
    ].join("\n");
    await fs.writeFile(file, content, "utf8");

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m3", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular_mixed.ts:1-1,5-5" // covers func a and const-arrow func b
      ]
    }]);

    const report = await svc.generateReport({});
    const fr = report.files.find(f => f.path === "tests/tmp/granular_mixed.ts")!;
    expect(fr.functionsTotal).toBe(2);
    expect(fr.functionsCovered).toBe(2);
    expect(fr.classesTotal).toBe(1);
    expect(fr.classesCovered).toBe(0);
  });

  it("treats file-only source as covering all symbols (edge case)", async () => {
    const file = join(process.cwd(), "tests/tmp/granular_full.ts");
    await fs.mkdir(join(process.cwd(), "tests/tmp"), { recursive: true });
    const content = [
      "export function a(){}",
      "export class C { m(){} }",
      "export const b = () => {}",
    ].join("\n");
    await fs.writeFile(file, content, "utf8");

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m4", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular_full.ts" // whole file covered
      ]
    }]);

    const report = await svc.generateReport({});
    const fr = report.files.find(f => f.path === "tests/tmp/granular_full.ts")!;
    expect(fr.functionsCovered).toBe(fr.functionsTotal);
    expect(fr.classesCovered).toBe(fr.classesTotal);
  });
});


