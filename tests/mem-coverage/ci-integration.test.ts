import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { runCoverageCLI } from "../../src/mem-coverage/cli.js";
import { MemoryService } from "../../src/memory/memory-service.js";
import { FileService } from "../../src/memory/file-service.js";

describe("CI/CD integration", () => {
  const tmpDir = join(process.cwd(), "tests/tmp/ci");
  let logSpy: any;
  let errSpy: any;

  beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock memory service to return a test memory
    vi.spyOn(MemoryService.prototype, "getAllMemories").mockResolvedValue([{
      id: "test", title: "Test", content: "", tags: [], category: "DOC",
      created_at: "", updated_at: "", last_reviewed: "", file_path: join(tmpDir, "test.md"),
      links: [], sources: ["src/test.ts:1-50"]
    }]);

    // Mock FileService's readMemoryFileById
    vi.spyOn(FileService.prototype, "readMemoryFileById").mockResolvedValue({
      id: "test", title: "Test", content: "", tags: [], category: "DOC",
      created_at: "", updated_at: "", last_reviewed: "", file_path: join(tmpDir, "test.md"),
      links: [], sources: ["src/test.ts:1-50"]
    });

    // Mock fs.readFile for line counting and config files
    const readFileSpy = vi.spyOn(fs, "readFile");
    readFileSpy.mockImplementation((path: string | Buffer | URL) => {
      const p = path.toString();
      if (p.includes("src/test.ts")) {
        return Promise.resolve("line\n".repeat(100)); // 100 lines
      }
      if (p.includes("coverage.fail.json")) {
        return Promise.resolve(JSON.stringify({
          thresholds: { overall: 99 },
          include: ["src/**", "tests/**"]
        }));
      }
      if (p.includes("coverage.pass.json")) {
        return Promise.resolve(JSON.stringify({
          thresholds: { overall: 0 },
          include: ["src/**", "tests/**"]
        }));
      }
      if (p.includes("coverage.scoped.fail.json")) {
        return Promise.resolve(JSON.stringify({
          thresholds: { overall: 0, src: 95, tests: 0 },
          include: ["src/**", "tests/**"]
        }));
      }
      if (p.includes("vitest.config.js")) {
        return Promise.resolve(`
          export default {
            test: {
              coverage: {
                include: ['src/**'],
                thresholds: { global: { lines: 99 } }
              }
            }
          };
        `);
      }
      if (p.includes("jest.config.cjs")) {
        return Promise.resolve(`
          module.exports = {
            collectCoverageFrom: ['src/**/*.{js,ts}'],
            coverageThreshold: { global: { lines: 99 } }
          };
        `);
      }
      return Promise.resolve("");
    });
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("exits with code 1 when global threshold not met", async () => {
    const configPath = join(tmpDir, "coverage.fail.json");
    await fs.writeFile(configPath, JSON.stringify({
      thresholds: { overall: 99 },
      include: ["src/**", "tests/**"]
    }));

    const { exitCode } = await runCoverageCLI({ config: configPath, threshold: 99 });
    expect(exitCode).toBe(1);
  });

  it("exits with code 0 when global threshold met", async () => {
    const configPath = join(tmpDir, "coverage.pass.json");
    await fs.writeFile(configPath, JSON.stringify({
      thresholds: { overall: 0 },
      include: ["src/**", "tests/**"]
    }));

    const { exitCode } = await runCoverageCLI({ config: configPath, threshold: 0 });
    expect(exitCode).toBe(0);
  });

  it("exits with code 1 when scoped threshold not met", async () => {
    const configPath = join(tmpDir, "coverage.scoped.fail.json");
    await fs.writeFile(configPath, JSON.stringify({
      thresholds: { overall: 0, src: 95, tests: 0 },
      include: ["src/**", "tests/**"]
    }));

    const { exitCode } = await runCoverageCLI({ config: configPath });
    expect(exitCode).toBe(1);
    // Verify scope violation message
    const errCalls = errSpy.mock.calls.flat().join("\n");
    expect(errCalls).toMatch(/src:.+<95/);
  });

  it("emits progress lines to stderr when verbose", async () => {
    const configPath = join(tmpDir, "coverage.verbose.json");
    await fs.writeFile(configPath, JSON.stringify({
      thresholds: { overall: 0 },
      include: ["src/**"]
    }));

    await runCoverageCLI({ config: configPath, verbose: true });
    const errCalls = errSpy.mock.calls.flat().join("\n");
    expect(errCalls).toMatch(/\[progress\]/);
  });

  it("parses vitest config thresholds", async () => {
    const configPath = join(tmpDir, "vitest.config.js");
    await fs.writeFile(configPath, `
      export default {
        test: {
          coverage: {
            include: ['src/**'],
            thresholds: { global: { lines: 99 } }
          }
        }
      };
    `);

    const { exitCode } = await runCoverageCLI({ config: configPath, threshold: 99 });
    expect(exitCode).toBe(1); // 99% threshold should fail
  });

  it("parses jest config thresholds", async () => {
    const configPath = join(tmpDir, "jest.config.cjs");
    await fs.writeFile(configPath, `
      module.exports = {
        collectCoverageFrom: ['src/**/*.{js,ts}'],
        coverageThreshold: { global: { lines: 99 } }
      };
    `);

    const { exitCode } = await runCoverageCLI({ config: configPath, threshold: 99 });
    expect(exitCode).toBe(1); // 99% threshold should fail
  });
});
