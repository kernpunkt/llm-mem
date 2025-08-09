import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BasicConfigParser } from "../../src/mem-coverage/config-parser.js";

describe("config-parser", () => {
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

    const parsed = await parser.parseConfig(file);
    expect(parsed.thresholds?.overall).toBe(85);
    expect(parsed.exclude?.length).toBeGreaterThan(0);
    expect(parsed.include?.length).toBeGreaterThan(0);
    expect(parsed.categories).toEqual(["DOC"]);
    expect(parsed.memoryStorePath).toBeDefined();
  });
});


