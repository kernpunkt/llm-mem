import { describe, it, expect } from "vitest";
import {
  MemoryCreateRequestSchema,
  MemoryUpdateRequestSchema,
  MemorySearchRequestSchema,
  LinkRequestSchema,
  type MemoryCreateRequest,
  type MemoryUpdateRequest,
  type MemorySearchRequest,
  type LinkRequest,
} from "../src/memory/types.js";

describe("Memory Types and Schemas", () => {
  describe("MemoryCreateRequestSchema", () => {
    it("should validate a valid memory creation request", () => {
      const validRequest = {
        title: "Test Memory",
        content: "This is test content",
        tags: ["test", "example"],
        category: "testing",
        sources: ["https://example.com"],
      };

      const result = MemoryCreateRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it("should validate request with minimal required fields", () => {
      const minimalRequest = {
        title: "Minimal Memory",
        content: "Minimal content",
      };

      const result = MemoryCreateRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Minimal Memory");
        expect(result.data.content).toBe("Minimal content");
        expect(result.data.tags).toEqual([]);
        expect(result.data.category).toBe("general");
        expect(result.data.sources).toEqual([]);
      }
    });

    it("should reject request without title", () => {
      const invalidRequest = {
        content: "Content without title",
      };

      const result = MemoryCreateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["title"]);
      }
    });

    it("should reject request with empty title", () => {
      const invalidRequest = {
        title: "",
        content: "Content with empty title",
      };

      const result = MemoryCreateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["title"]);
      }
    });

    it("should reject request without content", () => {
      const invalidRequest = {
        title: "Title without content",
      };

      const result = MemoryCreateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["content"]);
      }
    });

    it("should reject request with empty content", () => {
      const invalidRequest = {
        title: "Title with empty content",
        content: "",
      };

      const result = MemoryCreateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["content"]);
      }
    });

    it("should handle empty arrays for optional fields", () => {
      const requestWithEmptyArrays = {
        title: "Test Memory",
        content: "Test content",
        tags: [],
        sources: [],
      };

      const result = MemoryCreateRequestSchema.safeParse(requestWithEmptyArrays);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
        expect(result.data.sources).toEqual([]);
      }
    });

    it("should handle undefined optional fields", () => {
      const requestWithUndefined = {
        title: "Test Memory",
        content: "Test content",
        tags: undefined,
        category: undefined,
        sources: undefined,
      };

      const result = MemoryCreateRequestSchema.safeParse(requestWithUndefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
        expect(result.data.category).toBe("general");
        expect(result.data.sources).toEqual([]);
      }
    });
  });

  describe("MemoryUpdateRequestSchema", () => {
    it("should validate a valid memory update request", () => {
      const validRequest = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Updated Title",
        content: "Updated content",
        tags: ["updated", "tag"],
        category: "updated-category",
        sources: ["https://updated.com"],
      };

      const result = MemoryUpdateRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it("should validate request with only ID", () => {
      const minimalRequest = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = MemoryUpdateRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(result.data.title).toBeUndefined();
        expect(result.data.content).toBeUndefined();
      }
    });

    it("should reject request without ID", () => {
      const invalidRequest = {
        title: "Updated Title",
      };

      const result = MemoryUpdateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["id"]);
      }
    });

    it("should reject request with invalid UUID", () => {
      const invalidRequest = {
        id: "invalid-uuid",
        title: "Updated Title",
      };

      const result = MemoryUpdateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["id"]);
      }
    });

    it("should accept partial updates", () => {
      const partialRequest = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Only Title Update",
      };

      const result = MemoryUpdateRequestSchema.safeParse(partialRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Only Title Update");
        expect(result.data.content).toBeUndefined();
        expect(result.data.tags).toBeUndefined();
      }
    });

    it("should handle empty string updates", () => {
      const emptyStringRequest = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "",
        content: "",
        tags: [],
        sources: [],
      };

      const result = MemoryUpdateRequestSchema.safeParse(emptyStringRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("");
        expect(result.data.content).toBe("");
        expect(result.data.tags).toEqual([]);
        expect(result.data.sources).toEqual([]);
      }
    });
  });

  describe("MemorySearchRequestSchema", () => {
    it("should validate a valid search request", () => {
      const validRequest = {
        query: "search term",
        limit: 20,
        category: "test-category",
        tags: ["tag1", "tag2"],
      };

      const result = MemorySearchRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it("should validate request with minimal required fields", () => {
      const minimalRequest = {
        query: "search term",
      };

      const result = MemorySearchRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe("search term");
        expect(result.data.limit).toBe(10);
        expect(result.data.category).toBeUndefined();
        expect(result.data.tags).toBeUndefined();
      }
    });

    it("should reject request without query", () => {
      const invalidRequest = {
        limit: 20,
      };

      const result = MemorySearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["query"]);
      }
    });

    it("should reject request with empty query", () => {
      const invalidRequest = {
        query: "",
      };

      const result = MemorySearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["query"]);
      }
    });

    it("should reject request with invalid limit", () => {
      const invalidRequest = {
        query: "search term",
        limit: 0,
      };

      const result = MemorySearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["limit"]);
      }
    });

    it("should reject request with negative limit", () => {
      const invalidRequest = {
        query: "search term",
        limit: -5,
      };

      const result = MemorySearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["limit"]);
      }
    });

    it("should reject request with non-integer limit", () => {
      const invalidRequest = {
        query: "search term",
        limit: 5.5,
      };

      const result = MemorySearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["limit"]);
      }
    });

    it("should handle high limit values", () => {
      const highLimitRequest = {
        query: "search term",
        limit: 1000,
      };

      const result = MemorySearchRequestSchema.safeParse(highLimitRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1000);
      }
    });

    it("should handle empty tags array", () => {
      const emptyTagsRequest = {
        query: "search term",
        tags: [],
      };

      const result = MemorySearchRequestSchema.safeParse(emptyTagsRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it("should handle undefined optional fields", () => {
      const undefinedFieldsRequest = {
        query: "search term",
        limit: undefined,
        category: undefined,
        tags: undefined,
      };

      const result = MemorySearchRequestSchema.safeParse(undefinedFieldsRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.category).toBeUndefined();
        expect(result.data.tags).toBeUndefined();
      }
    });
  });

  describe("LinkRequestSchema", () => {
    it("should validate a valid link request", () => {
      const validRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
        link_text: "Custom Link Text",
      };

      const result = LinkRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it("should validate request without optional link_text", () => {
      const minimalRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
      };

      const result = LinkRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_id).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(result.data.target_id).toBe("987fcdeb-51a2-43d1-b789-123456789abc");
        expect(result.data.link_text).toBeUndefined();
      }
    });

    it("should reject request without source_id", () => {
      const invalidRequest = {
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
      };

      const result = LinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["source_id"]);
      }
    });

    it("should reject request without target_id", () => {
      const invalidRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = LinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["target_id"]);
      }
    });

    it("should reject request with invalid source_id UUID", () => {
      const invalidRequest = {
        source_id: "invalid-uuid",
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
      };

      const result = LinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["source_id"]);
      }
    });

    it("should reject request with invalid target_id UUID", () => {
      const invalidRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "invalid-uuid",
      };

      const result = LinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["target_id"]);
      }
    });

    it("should handle empty link_text", () => {
      const emptyLinkTextRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
        link_text: "",
      };

      const result = LinkRequestSchema.safeParse(emptyLinkTextRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.link_text).toBe("");
      }
    });

    it("should handle special characters in link_text", () => {
      const specialCharsRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
        link_text: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
      };

      const result = LinkRequestSchema.safeParse(specialCharsRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.link_text).toBe("Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?");
      }
    });

    it("should handle same source and target IDs", () => {
      const sameIdRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = LinkRequestSchema.safeParse(sameIdRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_id).toBe(result.data.target_id);
      }
    });
  });

  describe("Type Inference", () => {
    it("should correctly infer MemoryCreateRequest type", () => {
      const request: MemoryCreateRequest = {
        title: "Test Memory",
        content: "Test content",
        tags: ["test"],
        category: "test-category",
        sources: ["https://example.com"],
      };

      expect(request.title).toBe("Test Memory");
      expect(request.content).toBe("Test content");
      expect(request.tags).toEqual(["test"]);
      expect(request.category).toBe("test-category");
      expect(request.sources).toEqual(["https://example.com"]);
    });

    it("should correctly infer MemoryUpdateRequest type", () => {
      const request: MemoryUpdateRequest = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Updated Title",
      };

      expect(request.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(request.title).toBe("Updated Title");
    });

    it("should correctly infer MemorySearchRequest type", () => {
      const request: MemorySearchRequest = {
        query: "search query",
        limit: 25,
        category: "category",
        tags: ["tag1", "tag2"],
      };

      expect(request.query).toBe("search query");
      expect(request.limit).toBe(25);
      expect(request.category).toBe("category");
      expect(request.tags).toEqual(["tag1", "tag2"]);
    });

    it("should correctly infer LinkRequest type", () => {
      const request: LinkRequest = {
        source_id: "123e4567-e89b-12d3-a456-426614174000",
        target_id: "987fcdeb-51a2-43d1-b789-123456789abc",
        link_text: "Custom Link",
      };

      expect(request.source_id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(request.target_id).toBe("987fcdeb-51a2-43d1-b789-123456789abc");
      expect(request.link_text).toBe("Custom Link");
    });
  });
});
