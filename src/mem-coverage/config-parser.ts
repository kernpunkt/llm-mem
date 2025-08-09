import { CoverageConfig } from "./types.js";

export type DetectedConfigType = "coverage" | "vitest" | "jest";

export interface ConfigParser {
  parseConfig(filePath: string): Promise<CoverageConfig>;
  detectConfigType(filePath: string): DetectedConfigType;
  normalizeConfig(config: unknown, type: DetectedConfigType): CoverageConfig;
}

export class BasicConfigParser implements ConfigParser {
  detectConfigType(filePath: string): DetectedConfigType {
    if (filePath.endsWith(".coverage.json")) return "coverage";
    if (filePath.endsWith("vitest.config.ts") || filePath.endsWith("vitest.config.js")) return "vitest";
    if (filePath.endsWith("jest.config.js") || filePath.endsWith("jest.config.ts")) return "jest";
    return "coverage";
  }

  async parseConfig(filePath: string): Promise<CoverageConfig> {
    // Basic implementation: JSON for .coverage.json, dynamic import otherwise
    const type = this.detectConfigType(filePath);
    if (type === "coverage") {
      const fs = await import("node:fs/promises");
      const rawText = await fs.readFile(filePath, "utf8");
      const json = JSON.parse(rawText);
      return this.normalizeConfig(json, type);
    } else {
      const mod = await import(filePath);
      const raw = (mod as any)?.default ?? mod;
      return this.normalizeConfig(raw, type);
    }
  }

  normalizeConfig(config: unknown, _type: DetectedConfigType): CoverageConfig {
    // For initial phase, accept already-normalized JSON-like objects
    if (config && typeof config === "object") {
      const c = config as Partial<CoverageConfig>;
      return {
        thresholds: c.thresholds,
        exclude: c.exclude ?? [],
        include: c.include ?? ["src/**/*.ts", "src/**/*.js"],
        categories: c.categories ?? ["DOC", "ADR", "CTX"],
        memoryStorePath: c.memoryStorePath ?? "./memories",
        indexPath: c.indexPath ?? "./memories/index",
      };
    }
    return {
      exclude: ["node_modules/**", "dist/**"],
      include: ["src/**/*.ts", "src/**/*.js"],
      categories: ["DOC", "ADR", "CTX"],
      memoryStorePath: "./memories",
      indexPath: "./memories/index",
    };
  }
}


