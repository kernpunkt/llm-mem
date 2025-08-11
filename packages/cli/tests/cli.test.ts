import { describe, it, expect, vi } from "vitest";
import { runCoverageCLI, parseArgs, getUsageText, validateOptions } from "../src/cli.js";

describe("coverage CLI", () => {
  it("runs with default options and returns exitCode 0 without threshold", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { exitCode } = await runCoverageCLI({ memoryStorePath: "./memories", indexPath: "./memories/index" });
    expect(exitCode).toBe(0);
    spy.mockRestore();
  });

  it("parses CLI arguments", () => {
    const opts = parseArgs([
      "--config=.coverage.json",
      "--categories=DOC,ADR",
      "--threshold=85",
      "--exclude=dist/**,*.test.ts",
      "--include=src/**/*.ts",
      "--memoryStorePath=./memories",
      "--indexPath=./memories/index",
      "--verbose",
    ]);
    expect(opts.config).toBe(".coverage.json");
    expect(opts.categories).toEqual(["DOC", "ADR"]);
    expect(opts.threshold).toBe(85);
    expect(opts.exclude?.length).toBe(2);
    expect(opts.include?.length).toBe(1);
    expect(opts.memoryStorePath).toBe("./memories");
    expect(opts.indexPath).toBe("./memories/index");
    expect(opts.verbose).toBe(true);
  });

  it("returns usage text", () => {
    const text = getUsageText();
    expect(text).toContain("Usage: mem-coverage");
    expect(text).toContain("--config=PATH");
  });

  it("validates options and rejects invalid threshold", () => {
    expect(validateOptions({ threshold: -1 }).ok).toBe(false);
    expect(validateOptions({ threshold: 101 }).ok).toBe(false);
    expect(validateOptions({ threshold: 50 }).ok).toBe(true);
  });
});


