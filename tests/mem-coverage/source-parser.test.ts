import { describe, it, expect } from "vitest";
import { parseSourceString } from "../../src/mem-coverage/source-parser.js";

describe("parseSourceString", () => {
  it("parses file-only source", () => {
    const parsed = parseSourceString("src/index.ts");
    expect(parsed.filePath).toBe("src/index.ts");
    expect(parsed.ranges).toEqual([]);
  });

  it("parses single range", () => {
    const parsed = parseSourceString("src/index.ts:10-50");
    expect(parsed.filePath).toBe("src/index.ts");
    expect(parsed.ranges).toEqual([{ start: 10, end: 50 }]);
  });

  it("parses multiple ranges", () => {
    const parsed = parseSourceString("src/index.ts:10-20,30-40,50-60");
    expect(parsed.filePath).toBe("src/index.ts");
    expect(parsed.ranges).toEqual([
      { start: 10, end: 20 },
      { start: 30, end: 40 },
      { start: 50, end: 60 },
    ]);
  });

  it("throws on empty string", () => {
    expect(() => parseSourceString("")).toThrow();
  });

  it("throws on invalid numbers", () => {
    expect(() => parseSourceString("src/a.ts:10-x")).toThrow();
  });

  it("throws on reversed range", () => {
    expect(() => parseSourceString("src/a.ts:20-10")).toThrow();
  });

  it("throws on non-positive numbers", () => {
    expect(() => parseSourceString("src/a.ts:0-5")).toThrow();
  });
});


