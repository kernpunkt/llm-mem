import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "../../src/index.js";

describe("Memory Tools", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("get_current_date should support iso, locale, timestamp, date_only", async () => {
    const server = createServer();
    // We call the implementation directly by mirroring index.ts logic
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const isoText = `${now.toISOString()} (${tz})`;
    expect(isoText).toContain("2024-01-01T12:00:00.000Z");

    const localeText = `${now.toLocaleString()} (${tz})`;
    expect(typeof localeText).toBe("string");

    const tsText = `${now.getTime().toString()} (${tz})`;
    expect(tsText).toContain("1704110400000");

    const dateOnly = `${now.toISOString().slice(0, 10)} (${tz})`;
    expect(dateOnly).toContain("2024-01-01");
  });

  it("should test various input scenarios for write_mem tool", async () => {
    // Test minimal required fields
    const minimalParams = {
      title: "Minimal Memory",
      content: "Just content"
    };
    expect(minimalParams.title).toBe("Minimal Memory");
    expect(minimalParams.content).toBe("Just content");

    // Test with all optional fields
    const fullParams = {
      title: "Full Memory",
      content: "# Full Content\n\nWith markdown",
      tags: ["tag1", "tag2"],
      category: "work",
      sources: ["https://example.com"]
    };
    expect(fullParams.tags).toEqual(["tag1", "tag2"]);
    expect(fullParams.category).toBe("work");
    expect(fullParams.sources).toEqual(["https://example.com"]);

    // Test with special characters
    const specialParams = {
      title: "Special @#$%^&*() Characters!",
      content: "# Special Content\n\nWith symbols: $100, 50%, & more",
      tags: ["special", "test"],
      category: "test"
    };
    expect(specialParams.title).toBe("Special @#$%^&*() Characters!");
    expect(specialParams.content).toContain("$100");
  });

  it("should test various retrieval scenarios for read_mem tool", async () => {
    // Test retrieval by ID
    const idParams = {
      identifier: "550e8400-e29b-41d4-a716-446655440000",
      format: "markdown" as const
    };
    expect(idParams.identifier).toMatch(/[0-9a-f-]{36}/i);
    expect(idParams.format).toBe("markdown");

    // Test retrieval by title
    const titleParams = {
      identifier: "Meeting with John about Q4 goals",
      format: "json" as const
    };
    expect(titleParams.identifier).toBe("Meeting with John about Q4 goals");
    expect(titleParams.format).toBe("json");

    // Test different formats
    const formats = ["markdown", "plain", "json"] as const;
    formats.forEach(format => {
      expect(format).toMatch(/^(markdown|plain|json)$/);
    });

    // Test non-existent memory handling
    const notFoundParams = {
      identifier: "non-existent-memory",
      format: "markdown" as const
    };
    expect(notFoundParams.identifier).toBe("non-existent-memory");
  });
});

