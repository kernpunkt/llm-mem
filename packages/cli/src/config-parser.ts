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
    const lower = filePath.toLowerCase();
    // Support a variety of common naming patterns and extensions
    if ((/vitest/.test(lower) && /\.config\.(js|ts|cjs|mjs)$/.test(lower)) ||
        lower.endsWith("vitest.config.ts") || lower.endsWith("vitest.config.js")) {
      return "vitest";
    }
    if ((/jest/.test(lower) && /\.config\.(js|ts|cjs|mjs)$/.test(lower)) ||
        lower.endsWith("jest.config.js") || lower.endsWith("jest.config.ts") || lower.endsWith("jest.config.cjs")) {
      return "jest";
    }
    return "coverage";
  }

  async parseConfig(filePath: string): Promise<CoverageConfig> {
    // Support .coverage.json (JSON) and JS/TS config modules (vitest/jest)
    const type = this.detectConfigType(filePath);
    if (type === "coverage") {
      const fs = await import("node:fs/promises");
      const rawText = await fs.readFile(filePath, "utf8");
      const json = JSON.parse(rawText);
      return this.normalizeConfig(json, type);
    }
    // Dynamic import works for JS (and CJS via default). TS may fail without a loader.
    // Tests will exercise JS configs. If TS is used at runtime without a loader, users should provide JS.
    const mod = await import(filePath);
    const raw = (mod as any)?.default ?? mod;
    return this.normalizeConfig(raw, type);
  }

  normalizeConfig(config: unknown, type: DetectedConfigType): CoverageConfig {
    // Normalize various config formats to CoverageConfig
    if (!config || typeof config !== "object") {
      return {
        exclude: ["node_modules/**", "dist/**"],
        include: ["src/**/*.ts", "src/**/*.js"],
        categories: ["DOC", "ADR", "CTX"],
        memoryStorePath: "./memories",
        indexPath: "./memories/index",
      };
    }

    if (type === "vitest") {
      const c = config as any;
      const vitestCoverage = c?.test?.coverage ?? {};
      const thresholdsGlobal = vitestCoverage?.thresholds?.global ?? {};
      const overall = ["lines", "functions", "branches", "statements"]
        .map((k) => (typeof thresholdsGlobal[k] === "number" ? thresholdsGlobal[k] : undefined))
        .filter((v) => typeof v === "number") as number[];
      return {
        thresholds: overall.length > 0 ? { overall: overall[0] } : undefined,
        exclude: Array.isArray(vitestCoverage.exclude) ? vitestCoverage.exclude : ["node_modules/**", "dist/**"],
        include: Array.isArray(vitestCoverage.include) ? vitestCoverage.include : ["src/**/*.ts", "src/**/*.js"],
        categories: ["DOC", "ADR", "CTX"],
        memoryStorePath: "./memories",
        indexPath: "./memories/index",
      };
    }

    if (type === "jest") {
      const c = config as any;
      const collect = Array.isArray(c?.collectCoverageFrom) ? c.collectCoverageFrom : [];
      const include: string[] = collect.filter((p: string) => typeof p === "string" && !p.startsWith("!"));
      const exclude: string[] = collect
        .filter((p: string) => typeof p === "string" && p.startsWith("!"))
        .map((p: string) => p.slice(1));
      const globalThresh = c?.coverageThreshold?.global ?? {};
      const overall = ["lines", "functions", "branches", "statements"]
        .map((k) => (typeof globalThresh[k] === "number" ? globalThresh[k] : undefined))
        .filter((v) => typeof v === "number") as number[];
      return {
        thresholds: overall.length > 0 ? { overall: overall[0] } : undefined,
        exclude: exclude.length > 0 ? exclude : ["node_modules/**", "dist/**"],
        include: include.length > 0 ? include : ["src/**/*.ts", "src/**/*.js"],
        categories: ["DOC", "ADR", "CTX"],
        memoryStorePath: "./memories",
        indexPath: "./memories/index",
      };
    }

    // Already-normalized JSON-like object
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
}


