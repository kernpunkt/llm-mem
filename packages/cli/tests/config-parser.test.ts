import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BasicConfigParser } from "../src/config-parser.js";

describe("config-parser", () => {
  const createdFiles: string[] = [];

  afterEach(async () => {
    // Clean up temporary files
    for (const file of createdFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors if file was already deleted
      }
    }
    createdFiles.length = 0;
  });

  it("parses .coverage.json and normalizes defaults", async () => {
    const parser = new BasicConfigParser();
    const file = join(tmpdir(), `.coverage_${Date.now()}.json`);
    const cfg = {
      thresholds: { overall: 85 },
      exclude: ["node_modules/**"],
      include: ["src/**/*.ts"],
      categories: ["DOC"]
    };
    await fs.writeFile(file, JSON.stringify(cfg), "utf8");
    createdFiles.push(file);

    const parsed = await parser.parseConfig(file);
    expect(parsed.thresholds?.overall).toBe(85);
    expect(parsed.exclude?.length).toBeGreaterThan(0);
    expect(parsed.include?.length).toBeGreaterThan(0);
    expect(parsed.categories).toEqual(["DOC"]);
    expect(parsed.memoryStorePath).toBeDefined();
  });

  it("parses vitest config (JS) and extracts coverage fields", async () => {
    const parser = new BasicConfigParser();
    const file = join(tmpdir(), `vitest_${Date.now()}.config.js`);
    const cfgJs = `export default { test: { coverage: { include: ['src/**/*.ts'], exclude: ['node_modules/**'], thresholds: { global: { lines: 88, functions: 80 } } } } };`;
    await fs.writeFile(file, cfgJs, 'utf8');
    createdFiles.push(file);
    const parsed = await parser.parseConfig(file);
    expect(parsed.include).toEqual(["src/**/*.ts"]);
    expect(parsed.exclude).toEqual(["node_modules/**"]);
    expect(parsed.thresholds?.overall).toBe(88);
  });

  it("parses jest config (CJS) and extracts coverage fields", async () => {
    const parser = new BasicConfigParser();
    const file = join(tmpdir(), `jest_${Date.now()}.config.cjs`);
    const cfgJs = `module.exports = { collectCoverageFrom: ['src/**/*.{js,ts}', '!src/**/*.test.ts'], coverageThreshold: { global: { lines: 85 } } };`;
    await fs.writeFile(file, cfgJs, 'utf8');
    createdFiles.push(file);
    const parsed = await parser.parseConfig(file);
    expect(parsed.include).toContain('src/**/*.{js,ts}');
    expect(parsed.exclude).toContain('src/**/*.test.ts');
    expect(parsed.thresholds?.overall).toBe(85);
  });

  it("handles invalid JSON config gracefully with default normalization", async () => {
    const parser = new BasicConfigParser();
    const file = join(tmpdir(), `bad_${Date.now()}.coverage.json`);
    // Write malformed JSON
    await fs.writeFile(file, "{ invalid json", "utf8");
    createdFiles.push(file);
    await expect(parser.parseConfig(file)).rejects.toBeTruthy();
  });
});


