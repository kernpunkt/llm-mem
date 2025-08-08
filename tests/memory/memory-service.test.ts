import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { MemoryService } from "../../src/memory/memory-service.js";
import { parseFrontmatter } from "../../src/utils/yaml.js";

describe("MemoryService", () => {
  let tempDir: string;
  let indexPath: string;
  let service: MemoryService;

  beforeEach(async () => {
    // Create unique test directories for each test
    const testId = Math.random().toString(36).substring(7);
    tempDir = join(process.cwd(), `memories-test-${testId}`);
    indexPath = join(process.cwd(), `memories-test-index-${testId}.json`);
    
    // Ensure clean dirs
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(indexPath, { force: true }).catch(() => {});
    service = new MemoryService({ notestorePath: tempDir, indexPath });
    // Skip FlexSearch initialization to avoid SQLite lock issues in tests
    await service.initialize();
  }, 20000);

  afterEach(async () => {
    // Clean up with delay to avoid SQLite lock issues
    await new Promise(resolve => setTimeout(resolve, 100));
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(indexPath, { force: true }).catch(() => {});
  });

  it("should create a memory, write markdown with YAML, and index it", async () => {
    const memory = await service.createMemory({
      title: "Project Ideas",
      content: "# Ideas\n\n- Memory management system\n- Knowledge graph",
      tags: ["ideas", "projects"],
      category: "personal",
      sources: ["internal:doc/1"]
    });

    expect(memory.id).toMatch(/[0-9a-f-]{36}/i);
    expect(memory.title).toBe("Project Ideas");
    expect(memory.category).toBe("personal");
    expect(memory.tags).toEqual(["ideas", "projects"]);
    expect(memory.file_path).toContain(tempDir);

    // Verify file contents round-trip
    const md = await fs.readFile(memory.file_path, "utf-8");
    const parsed = parseFrontmatter(md);
    expect(parsed.frontmatter.id).toBe(memory.id);
    expect(parsed.frontmatter.title).toBe(memory.title);
    expect(parsed.frontmatter.category).toBe("personal");
    expect(parsed.frontmatter.tags).toEqual(["ideas", "projects"]);
    expect(parsed.frontmatter.sources).toEqual(["internal:doc/1"]);
    expect(parsed.content).toContain("# Ideas");
  });

  it("should read a memory by id and by title", async () => {
    const created = await service.createMemory({
      title: "Meeting with John about Q4 goals",
      content: "# Q4 Goals\n- Revenue target: $2M",
      tags: ["meeting", "goals", "q4"],
      category: "work"
    });

    const byId = await service.readMemory({ id: created.id });
    expect(byId).not.toBeNull();
    expect(byId!.title).toBe(created.title);
    expect(byId!.content).toContain("Q4 Goals");

    const byTitle = await service.readMemory({ title: created.title });
    expect(byTitle).not.toBeNull();
    expect(byTitle!.id).toBe(created.id);
  }, 10000);

  it("should handle various input scenarios for write_mem", async () => {
    // Test with minimal required fields
    const minimal = await service.createMemory({
      title: "Minimal Memory",
      content: "Just content"
    });
    expect(minimal.title).toBe("Minimal Memory");
    expect(minimal.category).toBe("general");
    expect(minimal.tags).toEqual([]);

    // Test with special characters in title
    const specialTitle = await service.createMemory({
      title: "Special @#$%^&*() Characters!",
      content: "# Special Content\n\nWith symbols: $100, 50%, & more",
      tags: ["special", "test"],
      category: "test",
      sources: ["https://example.com", "internal:doc/123"]
    });
    expect(specialTitle.title).toBe("Special @#$%^&*() Characters!");
    expect(specialTitle.content).toContain("$100");
    expect(specialTitle.sources).toEqual(["https://example.com", "internal:doc/123"]);

    // Test with empty tags and sources
    const emptyArrays = await service.createMemory({
      title: "Empty Arrays Test",
      content: "# Test\n\nContent here",
      tags: [],
      sources: []
    });
    expect(emptyArrays.tags).toEqual([]);
    expect(emptyArrays.sources).toEqual([]);
  });

  it("should handle various retrieval scenarios for read_mem", async () => {
    // Create test memories
    const memory1 = await service.createMemory({
      title: "First Memory",
      content: "# First\n\nContent one",
      tags: ["first"],
      category: "work"
    });

    const memory2 = await service.createMemory({
      title: "Second Memory",
      content: "# Second\n\nContent two",
      tags: ["second"],
      category: "personal"
    });

    // Test retrieval by ID
    const byId = await service.readMemory({ id: memory1.id });
    expect(byId).not.toBeNull();
    expect(byId!.title).toBe("First Memory");
    expect(byId!.category).toBe("work");

    // Test retrieval by title
    const byTitle = await service.readMemory({ title: "Second Memory" });
    expect(byTitle).not.toBeNull();
    expect(byTitle!.id).toBe(memory2.id);
    expect(byTitle!.category).toBe("personal");

    // Test non-existent memory
    const notFound = await service.readMemory({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(notFound).toBeNull();

    // Test non-existent title
    const notFoundTitle = await service.readMemory({ title: "Non-existent Memory" });
    expect(notFoundTitle).toBeNull();
  }, 15000);

  it("should handle edge cases and error scenarios", async () => {
    // Test with unicode characters
    const unicodeMemory = await service.createMemory({
      title: "Unicode Test 🚀 中文 Español",
      content: "# Unicode Content\n\n🚀 🎉 📝\n中文 Español Français",
      tags: ["unicode", "test"],
      category: "international"
    });
    expect(unicodeMemory.title).toBe("Unicode Test 🚀 中文 Español");
    expect(unicodeMemory.content).toContain("🚀");

    // Test with markdown content
    const markdownContent = `# Markdown Test

## Section 1
- Item 1
- Item 2

\`\`\`javascript
const code = "example";
console.log(code);
\`\`\`

**Bold text** and *italic text*

> Blockquote

---

End of content`;

    const markdownMemory = await service.createMemory({
      title: "Markdown Memory",
      content: markdownContent,
      tags: ["markdown", "test"]
    });
    expect(markdownMemory.content).toContain("```javascript");
    expect(markdownMemory.content).toContain("**Bold text**");
    expect(markdownMemory.content).toContain("> Blockquote");
  });
});

