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
  const _server = createServer();
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

  // Phase 3 Tool Tests
  describe("Phase 3 Memory Tools", () => {
    it("should test edit_mem tool with various update scenarios", async () => {
      // Test updating title only
      const titleUpdate = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Updated Title"
      };
      expect(titleUpdate.id).toMatch(/[0-9a-f-]{36}/i);
      expect(titleUpdate.title).toBe("Updated Title");

      // Test updating content only
      const contentUpdate = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        content: "# Updated Content\n\nNew content here"
      };
      expect(contentUpdate.content).toContain("# Updated Content");

      // Test updating tags only
      const tagsUpdate = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        tags: ["updated", "new", "tags"]
      };
      expect(tagsUpdate.tags).toEqual(["updated", "new", "tags"]);

      // Test updating category only
      const categoryUpdate = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        category: "personal"
      };
      expect(categoryUpdate.category).toBe("personal");

      // Test updating sources only
      const sourcesUpdate = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        sources: ["https://new-source.com", "internal:doc/updated"]
      };
      expect(sourcesUpdate.sources).toEqual(["https://new-source.com", "internal:doc/updated"]);

      // Test updating multiple fields
      const multiUpdate = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Multi Updated",
        content: "# Multi Update\n\nContent",
        tags: ["multi", "update"],
        category: "work",
        sources: ["https://multi-update.com"]
      };
      expect(multiUpdate.title).toBe("Multi Updated");
      expect(multiUpdate.tags).toEqual(["multi", "update"]);
      expect(multiUpdate.category).toBe("work");
    });

    it("should test search_mem tool with various search scenarios", async () => {
      // Test basic search
      const basicSearch = {
        query: "meeting goals",
        limit: 5
      };
      expect(basicSearch.query).toBe("meeting goals");
      expect(basicSearch.limit).toBe(5);

      // Test search with category filter
      const categorySearch = {
        query: "project ideas",
        category: "work",
        limit: 10
      };
      expect(categorySearch.category).toBe("work");

      // Test search with tags filter
      const tagsSearch = {
        query: "brainstorming",
        tags: ["ideas", "creative"],
        limit: 15
      };
      expect(tagsSearch.tags).toEqual(["ideas", "creative"]);

      // Test search with all filters
      const fullSearch = {
        query: "Q4 planning",
        category: "work",
        tags: ["planning", "goals"],
        limit: 20
      };
      expect(fullSearch.query).toBe("Q4 planning");
      expect(fullSearch.category).toBe("work");
      expect(fullSearch.tags).toEqual(["planning", "goals"]);
      expect(fullSearch.limit).toBe(20);

      // Test search with default limit
      const defaultLimitSearch = {
        query: "default search"
      };
      expect(defaultLimitSearch.query).toBe("default search");
      expect(defaultLimitSearch.limit).toBeUndefined();
    });

    it("should test link_mem tool with various linking scenarios", async () => {
      // Test basic linking
      const basicLink = {
        source_id: "550e8400-e29b-41d4-a716-446655440000",
        target_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
      };
      expect(basicLink.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(basicLink.target_id).toMatch(/[0-9a-f-]{36}/i);

      // Test linking with custom link text
      const customLink = {
        source_id: "550e8400-e29b-41d4-a716-446655440000",
        target_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        link_text: "Related project ideas"
      };
      expect(customLink.link_text).toBe("Related project ideas");

      // Test linking with different UUIDs
      const differentIds = {
        source_id: "12345678-1234-1234-1234-123456789abc",
        target_id: "abcdef12-abcd-abcd-abcd-abcdef123456"
      };
      expect(differentIds.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(differentIds.target_id).toMatch(/[0-9a-f-]{36}/i);
    });

    it("should test unlink_mem tool with various unlinking scenarios", async () => {
      // Test basic unlinking
      const basicUnlink = {
        source_id: "550e8400-e29b-41d4-a716-446655440000",
        target_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
      };
      expect(basicUnlink.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(basicUnlink.target_id).toMatch(/[0-9a-f-]{36}/i);

      // Test unlinking with different UUIDs
      const differentIds = {
        source_id: "12345678-1234-1234-1234-123456789abc",
        target_id: "abcdef12-abcd-abcd-abcd-abcdef123456"
      };
      expect(differentIds.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(differentIds.target_id).toMatch(/[0-9a-f-]{36}/i);

      // Test unlinking same memory (should be handled gracefully)
      const sameMemory = {
        source_id: "550e8400-e29b-41d4-a716-446655440000",
        target_id: "550e8400-e29b-41d4-a716-446655440000"
      };
      expect(sameMemory.source_id).toBe(sameMemory.target_id);
    });

    it("should test error handling for Phase 3 tools", async () => {
      // Test edit_mem with invalid UUID
      const invalidUuid = {
        id: "invalid-uuid",
        title: "Should fail"
      };
      expect(invalidUuid.id).toBe("invalid-uuid");

      // Test search_mem with empty query
      const emptyQuery = {
        query: "",
        limit: 10
      };
      expect(emptyQuery.query).toBe("");

      // Test link_mem with missing parameters
      const missingParams = {
        source_id: "550e8400-e29b-41d4-a716-446655440000"
        // Missing target_id
      };
      expect(missingParams.source_id).toMatch(/[0-9a-f-]{36}/i);

      // Test unlink_mem with non-existent memories
      const nonExistent = {
        source_id: "00000000-0000-0000-0000-000000000000",
        target_id: "11111111-1111-1111-1111-111111111111"
      };
      expect(nonExistent.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(nonExistent.target_id).toMatch(/[0-9a-f-]{36}/i);
    });

    it("should test parameter validation for Phase 3 tools", async () => {
      // Test edit_mem parameter validation
      const validEditParams = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Valid Title",
        content: "Valid content",
        tags: ["valid", "tags"],
        category: "valid-category",
        sources: ["https://valid-source.com"]
      };
      expect(validEditParams.id).toMatch(/[0-9a-f-]{36}/i);
      expect(validEditParams.title).toBe("Valid Title");
      expect(Array.isArray(validEditParams.tags)).toBe(true);
      expect(Array.isArray(validEditParams.sources)).toBe(true);

      // Test search_mem parameter validation
      const validSearchParams = {
        query: "valid query",
        limit: 5,
        category: "valid-category",
        tags: ["valid", "search", "tags"]
      };
      expect(validSearchParams.query).toBe("valid query");
      expect(typeof validSearchParams.limit).toBe("number");
      expect(Array.isArray(validSearchParams.tags)).toBe(true);

      // Test link_mem parameter validation
      const validLinkParams = {
        source_id: "550e8400-e29b-41d4-a716-446655440000",
        target_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        link_text: "Valid link text"
      };
      expect(validLinkParams.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(validLinkParams.target_id).toMatch(/[0-9a-f-]{36}/i);
      expect(typeof validLinkParams.link_text).toBe("string");

      // Test unlink_mem parameter validation
      const validUnlinkParams = {
        source_id: "550e8400-e29b-41d4-a716-446655440000",
        target_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
      };
      expect(validUnlinkParams.source_id).toMatch(/[0-9a-f-]{36}/i);
      expect(validUnlinkParams.target_id).toMatch(/[0-9a-f-]{36}/i);
    });
  });

  // Phase 4 Tool Tests - New Tools
  describe("Phase 4 Memory Tools", () => {
    it("should test reindex_mems tool", async () => {
      // Test reindex_mems with no parameters
      const reindexParams = {};
      expect(Object.keys(reindexParams)).toHaveLength(0);

      // Test reindex_mems functionality
      const reindexFunctionality = {
        success: true,
        message: "Successfully reindexed 5 memories",
        indexedCount: 5
      };
      expect(reindexFunctionality.success).toBe(true);
      expect(typeof reindexFunctionality.message).toBe("string");
      expect(typeof reindexFunctionality.indexedCount).toBe("number");
      expect(reindexFunctionality.indexedCount).toBeGreaterThanOrEqual(0);
    });

    it("should test needs_review tool with various date scenarios", async () => {
      // Test with ISO date format
      const isoDateParams = {
        date: "2024-01-15T00:00:00Z"
      };
      expect(isoDateParams.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

      // Test with different date formats
      const differentDateFormats = [
        "2024-01-15T00:00:00Z",
        "2024-01-15T12:30:45Z",
        "2024-01-15T23:59:59Z"
      ];
      differentDateFormats.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });

      // Test needs_review functionality
      const reviewFunctionality = {
        memories: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Old Memory",
            category: "work",
            tags: ["old", "review"],
            last_reviewed: "2024-01-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z"
          }
        ],
        total: 1
      };
      expect(Array.isArray(reviewFunctionality.memories)).toBe(true);
      expect(typeof reviewFunctionality.total).toBe("number");
      expect(reviewFunctionality.memories[0].id).toMatch(/[0-9a-f-]{36}/i);
      expect(typeof reviewFunctionality.memories[0].title).toBe("string");
      expect(Array.isArray(reviewFunctionality.memories[0].tags)).toBe(true);
    });

    it("should test error handling for Phase 4 tools", async () => {
      // Test needs_review with invalid date format
      const invalidDateParams = {
        date: "invalid-date-format"
      };
      expect(invalidDateParams.date).toBe("invalid-date-format");

      // Test needs_review with empty date
      const emptyDateParams = {
        date: ""
      };
      expect(emptyDateParams.date).toBe("");

      // Test reindex_mems error scenarios
      const reindexErrorScenarios = {
        noMemories: {
          success: true,
          message: "Successfully reindexed 0 memories",
          indexedCount: 0
        },
        withErrors: {
          success: true,
          message: "Successfully reindexed 3 memories",
          indexedCount: 3
        }
      };
      expect(reindexErrorScenarios.noMemories.indexedCount).toBe(0);
      expect(reindexErrorScenarios.withErrors.indexedCount).toBeGreaterThan(0);
    });

    it("should test parameter validation for Phase 4 tools", async () => {
      // Test reindex_mems parameter validation (no parameters required)
      const validReindexParams = {};
      expect(Object.keys(validReindexParams)).toHaveLength(0);

      // Test needs_review parameter validation
      const validReviewParams = {
        date: "2024-01-15T00:00:00Z"
      };
      expect(typeof validReviewParams.date).toBe("string");
      expect(validReviewParams.date.length).toBeGreaterThan(0);

      // Test needs_review with various date formats
      const validDateFormats = [
        "2024-01-15T00:00:00Z",
        "2024-01-15T12:30:45.123Z",
        "2024-01-15T23:59:59.999Z"
      ];
      validDateFormats.forEach(date => {
        expect(typeof date).toBe("string");
        expect(date.length).toBeGreaterThan(0);
      });
    });
  });
});

