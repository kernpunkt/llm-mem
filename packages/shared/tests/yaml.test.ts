import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  serializeFrontmatter,
  updateFrontmatter,
  validateFrontmatter,
  createFrontmatter,
  MemoryFrontmatter
} from "../src/utils/yaml.js";

describe("YAML Frontmatter Utilities", () => {
  const sampleFrontmatter: MemoryFrontmatter = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Meeting with John about Q4 goals",
    tags: ["meeting", "goals", "q4"],
    category: "work",
    created_at: "2024-01-15T10:30:00.000Z",
    updated_at: "2024-01-15T10:30:00.000Z",
    last_reviewed: "2024-01-15T10:30:00.000Z",
    links: [],
    sources: []
  };

  const sampleContent = `# Q4 Goals Discussion

**Date:** 2024-01-15

**Key Points:**
- Revenue target: $2M
- New product launch in March
- Team expansion planned

**Action Items:**
- [ ] Draft budget proposal
- [ ] Schedule follow-up meeting
- [ ] Update project timeline`;

  const sampleMarkdown = `---
id: 550e8400-e29b-41d4-a716-446655440000
title: Meeting with John about Q4 goals
tags:
  - meeting
  - goals
  - q4
category: work
created_at: 2024-01-15T10:30:00Z
updated_at: 2024-01-15T10:30:00Z
last_reviewed: 2024-01-15T10:30:00Z
links: []
sources: []
---

# Q4 Goals Discussion

**Date:** 2024-01-15

**Key Points:**
- Revenue target: $2M
- New product launch in March
- Team expansion planned

**Action Items:**
- [ ] Draft budget proposal
- [ ] Schedule follow-up meeting
- [ ] Update project timeline`;

  describe("parseFrontmatter", () => {
    it("should parse valid frontmatter successfully", () => {
      const result = parseFrontmatter(sampleMarkdown);
      
      expect(result.frontmatter).toEqual(sampleFrontmatter);
      expect(result.content).toBe(sampleContent);
    });

    it("should handle frontmatter with missing optional fields", () => {
      const minimalMarkdown = `---
id: 550e8400-e29b-41d4-a716-446655440000
title: Test Memory
category: test
---

# Test Content`;

      const result = parseFrontmatter(minimalMarkdown);
      
      expect(result.frontmatter.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.frontmatter.title).toBe("Test Memory");
      expect(result.frontmatter.category).toBe("test");
      expect(result.frontmatter.tags).toEqual([]);
      expect(result.frontmatter.links).toEqual([]);
      expect(result.content).toBe("# Test Content");
    });

    it("should throw error for content without frontmatter", () => {
      const contentWithoutFrontmatter = "# Test Content\n\nThis has no frontmatter.";
      
      expect(() => parseFrontmatter(contentWithoutFrontmatter)).toThrow(
        "No YAML frontmatter found in content"
      );
    });

    it("should throw error for invalid frontmatter format", () => {
      const invalidMarkdown = `---
id: 550e8400-e29b-41d4-a716-446655440000
title: Test Memory
category: test
# Missing closing ---

# Test Content`;

      expect(() => parseFrontmatter(invalidMarkdown)).toThrow(
        "Invalid YAML frontmatter format"
      );
    });

    it("should throw error for missing required fields", () => {
      const incompleteMarkdown = `---
title: Test Memory
category: test
---

# Test Content`;

      expect(() => parseFrontmatter(incompleteMarkdown)).toThrow(
        "Missing required frontmatter fields: id, title, category"
      );
    });

    it("should handle frontmatter with non-array tags, links and sources", () => {
      const markdownWithInvalidArrays = `---
id: 550e8400-e29b-41d4-a716-446655440000
title: Test Memory
category: test
tags: "single-tag"
links: "single-link"
sources: "single-source"
---

# Test Content`;

      const result = parseFrontmatter(markdownWithInvalidArrays);
      
      expect(result.frontmatter.tags).toEqual([]);
      expect(result.frontmatter.links).toEqual([]);
      expect(result.frontmatter.sources).toEqual([]);
    });

    it("should parse frontmatter with abstract field", () => {
      const markdownWithAbstract = `---
id: 550e8400-e29b-41d4-a716-446655440000
title: Test Memory
category: test
abstract: This is a short summary of the memory content
tags: []
links: []
sources: []
---

# Test Content`;

      const result = parseFrontmatter(markdownWithAbstract);
      
      expect(result.frontmatter.abstract).toBe("This is a short summary of the memory content");
      expect(result.frontmatter.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.frontmatter.title).toBe("Test Memory");
    });

    it("should handle frontmatter without abstract field (backward compatibility)", () => {
      const markdownWithoutAbstract = `---
id: 550e8400-e29b-41d4-a716-446655440000
title: Test Memory
category: test
tags: []
links: []
sources: []
---

# Test Content`;

      const result = parseFrontmatter(markdownWithoutAbstract);
      
      expect(result.frontmatter.abstract).toBeUndefined();
      expect(result.frontmatter.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.frontmatter.title).toBe("Test Memory");
    });
  });

  describe("serializeFrontmatter", () => {
    it("should serialize frontmatter and content correctly", () => {
      const result = serializeFrontmatter(sampleFrontmatter, sampleContent);
      
      // Should contain the frontmatter structure
      expect(result).toContain("---");
      expect(result).toContain("id: 550e8400-e29b-41d4-a716-446655440000");
      expect(result).toContain("title: Meeting with John about Q4 goals");
      expect(result).toContain("category: work");
      expect(result).toContain("tags:");
      expect(result).toContain("- meeting");
      expect(result).toContain("- goals");
      expect(result).toContain("- q4");
      
      // Should contain the content
      expect(result).toContain("# Q4 Goals Discussion");
      expect(result).toContain("Revenue target: $2M");
    });

    it("should throw error for missing required fields", () => {
      const invalidFrontmatter = {
        ...sampleFrontmatter,
        title: "" // Missing title
      };
      
      expect(() => serializeFrontmatter(invalidFrontmatter, sampleContent)).toThrow(
        "Missing required frontmatter fields: id, title, category"
      );
    });

    it("should handle empty content", () => {
      const result = serializeFrontmatter(sampleFrontmatter, "");
      
      expect(result).toContain("---");
      expect(result).toContain("id: 550e8400-e29b-41d4-a716-446655440000");
      expect(result.endsWith("\n\n")).toBe(true);
    });

    it("should serialize frontmatter with abstract field", () => {
      const frontmatterWithAbstract = {
        ...sampleFrontmatter,
        abstract: "Short summary of the meeting discussion"
      };
      
      const result = serializeFrontmatter(frontmatterWithAbstract, sampleContent);
      
      expect(result).toContain("abstract: Short summary of the meeting discussion");
      expect(result).toContain("id: 550e8400-e29b-41d4-a716-446655440000");
      expect(result).toContain("title: Meeting with John about Q4 goals");
    });

    it("should serialize frontmatter without abstract field", () => {
      const result = serializeFrontmatter(sampleFrontmatter, sampleContent);
      
      // Abstract should not appear in serialized output if not present
      const hasAbstract = result.match(/^abstract:/m);
      expect(hasAbstract).toBeNull();
      expect(result).toContain("id: 550e8400-e29b-41d4-a716-446655440000");
    });

    it("should handle content with special characters", () => {
      const specialContent = `# Test Content

With special characters: $2M, 100%, & symbols

**Bold text** and *italic text*

\`\`\`code block\`\`\``;

      const result = serializeFrontmatter(sampleFrontmatter, specialContent);
      
      expect(result).toContain("$2M");
      expect(result).toContain("100%");
      expect(result).toContain("& symbols");
      expect(result).toContain("**Bold text**");
      expect(result).toContain("*italic text*");
      expect(result).toContain("```code block```");
    });
  });

  describe("updateFrontmatter", () => {
    it("should update specific fields in existing frontmatter", () => {
      const updates = {
        title: "Updated Meeting Title",
        tags: ["meeting", "goals", "q4", "updated"]
      };
      
      const result = updateFrontmatter(sampleMarkdown, updates);
      
      // Parse the result to verify updates
      const parsed = parseFrontmatter(result);
      
      expect(parsed.frontmatter.title).toBe("Updated Meeting Title");
      expect(parsed.frontmatter.tags).toEqual(["meeting", "goals", "q4", "updated"]);
      
      // Should always update updated_at timestamp
      expect(parsed.frontmatter.updated_at).not.toBe("2024-01-15T10:30:00Z");
      
      // Content should remain unchanged
      expect(parsed.content).toBe(sampleContent);
    });

    it("should update abstract field in frontmatter", () => {
      const updates = {
        abstract: "Updated abstract summary"
      };
      
      const result = updateFrontmatter(sampleMarkdown, updates);
      const parsed = parseFrontmatter(result);
      
      expect(parsed.frontmatter.abstract).toBe("Updated abstract summary");
      // Original fields should remain unchanged
      expect(parsed.frontmatter.title).toBe("Meeting with John about Q4 goals");
      
      // Content should remain unchanged
      expect(parsed.content).toBe(sampleContent);
    });

    it("should handle partial updates", () => {
      const updates = {
        tags: ["new", "tags"]
      };
      
      const result = updateFrontmatter(sampleMarkdown, updates);
      const parsed = parseFrontmatter(result);
      
      expect(parsed.frontmatter.tags).toEqual(["new", "tags"]);
      expect(parsed.frontmatter.title).toBe("Meeting with John about Q4 goals"); // Unchanged
      expect(parsed.frontmatter.category).toBe("work"); // Unchanged
    });

    it("should always update the updated_at timestamp", () => {
      const originalUpdatedAt = sampleFrontmatter.updated_at;
      const updates = {};
      
      const result = updateFrontmatter(sampleMarkdown, updates);
      const parsed = parseFrontmatter(result);
      
      expect(parsed.frontmatter.updated_at).not.toBe(originalUpdatedAt);
      expect(new Date(parsed.frontmatter.updated_at).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it("should throw error for invalid markdown", () => {
      const invalidMarkdown = "This is not valid markdown with frontmatter";
      
      expect(() => updateFrontmatter(invalidMarkdown, { title: "New Title" })).toThrow(
        "No YAML frontmatter found in content"
      );
    });
  });

  describe("validateFrontmatter", () => {
    it("should validate correct frontmatter", () => {
      expect(validateFrontmatter(sampleFrontmatter)).toBe(true);
    });

    it("should throw error for non-object input", () => {
      expect(() => validateFrontmatter(null)).toThrow("Frontmatter must be an object");
      expect(() => validateFrontmatter("string")).toThrow("Frontmatter must be an object");
      expect(() => validateFrontmatter(123)).toThrow("Frontmatter must be an object");
    });

    it("should throw error for missing id", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, id: "" };
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter must have a valid 'id' field"
      );
    });

    it("should throw error for missing title", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, title: "" };
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter must have a valid 'title' field"
      );
    });

    it("should throw error for missing category", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, category: "" };
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter must have a valid 'category' field"
      );
    });

    it("should throw error for non-array tags", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, tags: "not-an-array" };
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter 'tags' field must be an array"
      );
    });

    it("should throw error for non-array links", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, links: "not-an-array" };
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter 'links' field must be an array"
      );
    });

    it("should throw error for non-array sources", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, sources: "not-an-array" } as any;
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter 'sources' field must be an array"
      );
    });

    it("should throw error for invalid date fields", () => {
      const invalidFrontmatter = { ...sampleFrontmatter, created_at: 123 };
      expect(() => validateFrontmatter(invalidFrontmatter)).toThrow(
        "Frontmatter 'created_at' field must be a string"
      );
    });
  });

  describe("createFrontmatter", () => {
    it("should create frontmatter with required fields", () => {
      const result = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Test Memory",
        "test"
      );
      
      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.title).toBe("Test Memory");
      expect(result.category).toBe("test");
      expect(result.tags).toEqual([]);
      expect(result.links).toEqual([]);
      
      // Should have current timestamps
      const now = new Date();
      const created = new Date(result.created_at);
      const updated = new Date(result.updated_at);
      const reviewed = new Date(result.last_reviewed);
      
      expect(created.getTime()).toBeCloseTo(now.getTime(), -2); // Within 2 seconds
      expect(updated.getTime()).toBeCloseTo(now.getTime(), -2);
      expect(reviewed.getTime()).toBeCloseTo(now.getTime(), -2);
    });

    it("should create frontmatter with optional tags", () => {
      const tags = ["tag1", "tag2", "tag3"];
      const result = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Test Memory",
        "test",
        tags
      );
      
      expect(result.tags).toEqual(tags);
    });

    it("should create frontmatter with abstract field", () => {
      const frontmatter = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Test Memory",
        "test",
        [],
        "Short abstract of the memory"
      );
      
      expect(frontmatter.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(frontmatter.title).toBe("Test Memory");
      expect(frontmatter.abstract).toBe("Short abstract of the memory");
    });

    it("should create frontmatter without abstract field", () => {
      const frontmatter = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Test Memory",
        "test"
      );
      
      expect(frontmatter.abstract).toBeUndefined();
    });

    it("should create valid frontmatter that passes validation", () => {
      const result = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Test Memory",
        "test"
      );
      
      expect(validateFrontmatter(result)).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should round-trip frontmatter correctly", () => {
      // Create frontmatter
      const frontmatter = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Test Memory",
        "test",
        ["tag1", "tag2"]
      );
      
      // Serialize to markdown
      const markdown = serializeFrontmatter(frontmatter, sampleContent);
      
      // Parse back
      const parsed = parseFrontmatter(markdown);
      
      // Should match original
      expect(parsed.frontmatter.id).toBe(frontmatter.id);
      expect(parsed.frontmatter.title).toBe(frontmatter.title);
      expect(parsed.frontmatter.category).toBe(frontmatter.category);
      expect(parsed.frontmatter.tags).toEqual(frontmatter.tags);
      expect(parsed.content).toBe(sampleContent);
    });

    it("should handle complex content with frontmatter", () => {
      const complexContent = `# Complex Content

## Section 1
- Item 1
- Item 2

## Section 2
\`\`\`javascript
const code = "example";
console.log(code);
\`\`\`

**Bold text** and *italic text*

> Blockquote with special characters: $100, 50%, & symbols

---

End of content`;

      const frontmatter = createFrontmatter(
        "550e8400-e29b-41d4-a716-446655440000",
        "Complex Test Memory",
        "test",
        ["complex", "test"]
      );
      
      const markdown = serializeFrontmatter(frontmatter, complexContent);
      const parsed = parseFrontmatter(markdown);
      
      expect(parsed.content).toBe(complexContent);
      expect(parsed.frontmatter.title).toBe("Complex Test Memory");
      expect(parsed.frontmatter.tags).toEqual(["complex", "test"]);
    });
  });
}); 