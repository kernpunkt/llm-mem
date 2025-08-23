import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
// Note: tmpdir is available but not used in this test file
import { CoverageService } from "../src/coverage-service.js";
import { MemoryService } from "@llm-mem/shared";

describe("Granular coverage analysis (Step 8)", () => {
  let memoryService: MemoryService;
  let svc: CoverageService;
  const tmpDir = join(process.cwd(), "tests/tmp/granular");
  const createdFiles: string[] = [];

  beforeEach(async () => {
    // Ensure the directory exists for all tests
    try {
      await fs.mkdir(tmpDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
    
    // @ts-expect-error partial mock for tests
    memoryService = { getAllMemories: async () => [] } as unknown as MemoryService;
    svc = new CoverageService(memoryService);
  });

  afterEach(async () => {
    // Clean up individual test files
    for (const file of createdFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors if file was already deleted
      }
    }
    createdFiles.length = 0;
  });

  afterAll(async () => {
    // Clean up the test-specific tmp directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory was already deleted
    }
  });

  it("analyzes function coverage (one of two functions covered)", async () => {
    const file = join(tmpDir, "granular_fn.ts");
    const content = [
      "export function a() { return 1 }", // line 1
      "",
      "export function b() { return 2 }", // line 3
      "",
    ].join("\n");
    await fs.writeFile(file, content, "utf8");
    createdFiles.push(file);

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m1", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular/granular_fn.ts:1-1" // covers only function a
      ]
    }]);

    const report = await svc.generateReport({ scanSourceFiles: false });
    const fr = report.files.find(f => f.path === "tests/tmp/granular/granular_fn.ts")!;
    expect(fr.functionsTotal).toBe(2);
    expect(fr.functionsCovered).toBe(1);
    expect(report.summary.functionsTotal).toBeGreaterThanOrEqual(2);
    expect(report.summary.functionsCovered).toBeGreaterThanOrEqual(1);
  });

  it("analyzes class coverage (class covered, function not covered)", async () => {
    const file = join(tmpDir, "granular_class.ts");
    const content = [
      "export class C {",     // 1
      "  m() { return 3 }",   // 2
      "}",                    // 3
      "",                     // 4
      "export function a(){}" // 5
    ].join("\n");
    await fs.writeFile(file, content, "utf8");
    createdFiles.push(file);

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m2", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular/granular_class.ts:1-3" // covers class only
      ]
    }]);

    const report = await svc.generateReport({ scanSourceFiles: false });
    const fr = report.files.find(f => f.path === "tests/tmp/granular/granular_class.ts")!;
    expect(fr.classesTotal).toBe(1);
    expect(fr.classesCovered).toBe(1);
    expect(fr.functionsTotal).toBe(1);
    expect(fr.functionsCovered).toBe(0);
  });

  it("analyzes mixed coverage (two functions covered, class not covered)", async () => {
    const file = join(tmpDir, "granular_mixed.ts");
    const content = [
      "export function a(){}", // 1
      "",                      // 2
      "export class C { m(){} }", // 3
      "",                      // 4
      "export const b = () => {}", // 5
    ].join("\n");
    await fs.writeFile(file, content, "utf8");
    createdFiles.push(file);

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m3", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular/granular_mixed.ts:1-1,5-5" // covers func a and const-arrow func b
      ]
    }]);

    const report = await svc.generateReport({ scanSourceFiles: false });
    const fr = report.files.find(f => f.path === "tests/tmp/granular/granular_mixed.ts")!;
    expect(fr.functionsTotal).toBe(2);
    expect(fr.functionsCovered).toBe(2);
    expect(fr.classesTotal).toBe(1);
    expect(fr.classesCovered).toBe(0);
  });

  it("treats file-only source as covering all symbols (edge case)", async () => {
    const file = join(tmpDir, "granular_full.ts");
    const content = [
      "export function a(){}",
      "export class C { m(){} }",
      "export const b = () => {}",
    ].join("\n");
    await fs.writeFile(file, content, "utf8");
    createdFiles.push(file);

    // @ts-expect-error override
    memoryService.getAllMemories = async () => ([{
      id: "m4", title: "T", content: "", tags: [], category: "DOC", created_at: "", updated_at: "", last_reviewed: "", file_path: "", links: [],
      sources: [
        "tests/tmp/granular/granular_full.ts" // whole file covered
      ]
    }]);

    const report = await svc.generateReport({ scanSourceFiles: false });
    const fr = report.files.find(f => f.path === "tests/tmp/granular/granular_full.ts")!;
    expect(fr.functionsCovered).toBe(fr.functionsTotal);
    expect(fr.classesCovered).toBe(fr.classesTotal);
  });
});


