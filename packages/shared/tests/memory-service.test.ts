import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { MemoryService } from "../src/memory/memory-service.js";
import { parseFrontmatter } from "../src/utils/yaml.js";

describe("MemoryService", () => {
  let tempDir: string;
  let indexPath: string;
  let service: MemoryService;

  beforeEach(async () => {
    // Create unique test directories for each test
    const testId = Math.random().toString(36).substring(7);
    tempDir = join(process.cwd(), `memories-test-${testId}`);
    indexPath = join(process.cwd(), `memories-test-index-${testId}`);
    
    // Ensure clean dirs
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(indexPath, { force: true }).catch(() => {});
    
    // Create the directories
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(indexPath, { recursive: true });
    
    service = new MemoryService({ notestorePath: tempDir, indexPath });
    // Skip FlexSearch initialization to avoid SQLite lock issues in tests
    await service.initialize();
  }, 20000);

  afterEach(async () => {
    // Clean up with comprehensive cleanup to avoid SQLite lock issues
    try {
      // Properly destroy the service to release all resources including FlexSearch
      if (service) {
        await service.destroy();
      }
      
      // Wait a bit to ensure all file handles are released
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Remove the entire test directory and all its contents recursively
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
        // Ignore cleanup errors, but log them for debugging
        console.error(`Failed to remove test directory: ${tempDir}`);
      });
      
      // Remove the index file
      await fs.rm(indexPath, { force: true }).catch(() => {
        // File doesn't exist or can't be removed, ignore
      });
      
      // Also try to remove any SQLite files that might be in the current directory
      try {
        const entries = await fs.readdir(process.cwd());
        for (const entry of entries) {
          if (entry.startsWith("memory-store") && (entry.endsWith(".sqlite") || entry.endsWith(".db"))) {
            await fs.rm(entry, { force: true }).catch(() => {
              // Ignore cleanup errors for SQLite files
            });
          }
        }
      } catch (error) {
        // Ignore errors when trying to clean up SQLite files
      }
    } catch (error) {
      console.error("Error during test cleanup:", error);
    }
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
  }, 10000);

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
  }, 10000);

  it("should create a memory with abstract field", async () => {
    const memory = await service.createMemory({
      title: "Memory with Abstract",
      content: "# Content\n\nFull content here",
      abstract: "Short summary of the memory",
      tags: ["test"],
      category: "test"
    });

    expect(memory.abstract).toBe("Short summary of the memory");
    expect(memory.title).toBe("Memory with Abstract");

    // Verify abstract is stored in file
    const md = await fs.readFile(memory.file_path, "utf-8");
    const parsed = parseFrontmatter(md);
    expect(parsed.frontmatter.abstract).toBe("Short summary of the memory");
  }, 10000);

  it("should create a memory without abstract field (backward compatibility)", async () => {
    const memory = await service.createMemory({
      title: "Memory without Abstract",
      content: "# Content\n\nFull content here",
      tags: ["test"],
      category: "test"
    });

    expect(memory.abstract).toBeUndefined();
    expect(memory.title).toBe("Memory without Abstract");

    // Verify abstract is not in file
    const md = await fs.readFile(memory.file_path, "utf-8");
    const parsed = parseFrontmatter(md);
    expect(parsed.frontmatter.abstract).toBeUndefined();
  }, 10000);

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
  }, 10000);

  it("should update memory abstract field", async () => {
    const memory = await service.createMemory({
      title: "Memory for Abstract Update",
      content: "# Content\n\nFull content here",
      abstract: "Original abstract",
      tags: ["test"],
      category: "test"
    });

    expect(memory.abstract).toBe("Original abstract");

    // Update abstract
    const updated = await service.updateMemory({
      id: memory.id,
      abstract: "Updated abstract summary"
    });

    expect(updated.abstract).toBe("Updated abstract summary");
    expect(updated.title).toBe("Memory for Abstract Update"); // Title should remain unchanged

    // Verify abstract is updated in file
    const md = await fs.readFile(updated.file_path, "utf-8");
    const parsed = parseFrontmatter(md);
    expect(parsed.frontmatter.abstract).toBe("Updated abstract summary");
  }, 10000);

    it("should create memory with template fields", async () => {
      const template = {
        author: "John Doe",
        status: "draft",
        version: "1.0",
      };

      const memory = await service.createMemory({
        title: "Memory with Template",
        content: "# Content\n\nFull content here",
        tags: ["test"],
        category: "test",
        template,
      });

      // Read the file to verify custom fields are written
      const md = await fs.readFile(memory.file_path, "utf-8");
      const parsed = parseFrontmatter(md);

      expect((parsed.frontmatter as any).author).toBe("John Doe");
      expect((parsed.frontmatter as any).status).toBe("draft");
      expect((parsed.frontmatter as any).version).toBe("1.0");
    });

    it("should preserve custom fields when reading memory", async () => {
      const template = {
        author: "Jane Smith",
        status: "published",
        metadata: {
          department: "engineering",
          priority: "high",
        },
      };

      const memory = await service.createMemory({
        title: "Memory with Custom Fields",
        content: "# Content\n\nFull content here",
        tags: ["test"],
        category: "test",
        template,
      });

      // Read memory back
      const readMemory = await service.readMemory({ id: memory.id });

      expect(readMemory).not.toBeNull();
      expect((readMemory as any).author).toBe("Jane Smith");
      expect((readMemory as any).status).toBe("published");
      expect((readMemory as any).metadata).toEqual({
        department: "engineering",
        priority: "high",
      });
    });

    it("should update memory with template fields", async () => {
      const memory = await service.createMemory({
        title: "Memory to Update",
        content: "# Content\n\nFull content here",
        tags: ["test"],
        category: "test",
      });

      const template = {
        author: "Updated Author",
        status: "updated",
        version: "2.0",
      };

      const updated = await service.updateMemory(
        {
          id: memory.id,
          title: "Updated Title",
        },
        template
      );

      // Read the file to verify custom fields
      const md = await fs.readFile(updated.file_path, "utf-8");
      const parsed = parseFrontmatter(md);

      expect(parsed.frontmatter.title).toBe("Updated Title");
      expect((parsed.frontmatter as any).author).toBe("Updated Author");
      expect((parsed.frontmatter as any).status).toBe("updated");
      expect((parsed.frontmatter as any).version).toBe("2.0");
    });

    it("should preserve existing custom fields when updating", async () => {
      const initialTemplate = {
        author: "Original Author",
        status: "draft",
        version: "1.0",
      };

      const memory = await service.createMemory({
        title: "Memory with Existing Fields",
        content: "# Content\n\nFull content here",
        tags: ["test"],
        category: "test",
        template: initialTemplate,
      });

      // Update with new template that adds fields
      const updateTemplate = {
        status: "published", // Override existing
        reviewer: "Reviewer Name", // Add new
      };

      const updated = await service.updateMemory(
        {
          id: memory.id,
        },
        updateTemplate
      );

      // Read back to verify
      const readMemory = await service.readMemory({ id: memory.id });

      expect((readMemory as any).author).toBe("Original Author"); // Preserved
      expect((readMemory as any).status).toBe("published"); // Overridden
      expect((readMemory as any).version).toBe("1.0"); // Preserved
      expect((readMemory as any).reviewer).toBe("Reviewer Name"); // Added
    });

    it("should throw error when creating memory with template containing protected 'id' field", async () => {
      const invalidTemplate = {
        id: "should-not-be-allowed",
        author: "John Doe",
      };

      await expect(
        service.createMemory({
          title: "Test Memory",
          content: "# Content",
          tags: ["test"],
          category: "test",
          template: invalidTemplate,
        })
      ).rejects.toThrow("Template cannot override protected frontmatter fields: id");
    });

    it("should throw error when creating memory with template containing protected 'title' field", async () => {
      const invalidTemplate = {
        title: "should-not-be-allowed",
        author: "John Doe",
      };

      await expect(
        service.createMemory({
          title: "Test Memory",
          content: "# Content",
          tags: ["test"],
          category: "test",
          template: invalidTemplate,
        })
      ).rejects.toThrow("Template cannot override protected frontmatter fields: title");
    });

    it("should throw error when creating memory with template containing protected 'category' field", async () => {
      const invalidTemplate = {
        category: "should-not-be-allowed",
        author: "John Doe",
      };

      await expect(
        service.createMemory({
          title: "Test Memory",
          content: "# Content",
          tags: ["test"],
          category: "test",
          template: invalidTemplate,
        })
      ).rejects.toThrow("Template cannot override protected frontmatter fields: category");
    });

    it("should throw error when creating memory with template containing protected timestamp fields", async () => {
      for (const field of ["created_at", "updated_at", "last_reviewed"] as const) {
        const invalidTemplate = {
          [field]: "2024-01-01T00:00:00Z",
          author: "John Doe",
        };

        await expect(
          service.createMemory({
            title: "Test Memory",
            content: "# Content",
            tags: ["test"],
            category: "test",
            template: invalidTemplate,
          })
        ).rejects.toThrow(`Template cannot override protected frontmatter fields: ${field}`);
      }
    });

    it("should throw error when creating memory with template containing protected 'links' field", async () => {
      const invalidTemplate = {
        links: ["should-not-be-allowed"],
        author: "John Doe",
      };

      await expect(
        service.createMemory({
          title: "Test Memory",
          content: "# Content",
          tags: ["test"],
          category: "test",
          template: invalidTemplate,
        })
      ).rejects.toThrow("Template cannot override protected frontmatter fields: links");
    });

    it("should throw error when updating memory with template containing protected fields", async () => {
      const memory = await service.createMemory({
        title: "Test Memory",
        content: "# Content",
        tags: ["test"],
        category: "test",
      });

      const invalidTemplate = {
        id: "should-not-be-allowed",
        author: "John Doe",
      };

      await expect(
        service.updateMemory(
          {
            id: memory.id,
          },
          invalidTemplate
        )
      ).rejects.toThrow("Template cannot override protected frontmatter fields: id");
    });

    it("should index template fields and make them searchable", async () => {
      const template = {
        author: "Jane Smith",
        status: "published",
        version: "2.0",
        department: "Engineering",
      };

      const memory = await service.createMemory({
        title: "Technical Documentation",
        content: "# Documentation\n\nThis is the main content.",
        tags: ["docs"],
        category: "DOC",
        template,
      });

      // Small delay to ensure index is fully ready for searching
      await new Promise(resolve => setTimeout(resolve, 100));

      // Search for template field values
      const resultsByAuthor = await service.searchMemories({
        query: "Jane Smith",
        limit: 10,
      });
      expect(resultsByAuthor.results.length).toBeGreaterThan(0);
      expect(resultsByAuthor.results[0].id).toBe(memory.id);

      const resultsByStatus = await service.searchMemories({
        query: "published",
        limit: 10,
      });
      expect(resultsByStatus.results.length).toBeGreaterThan(0);
      expect(resultsByStatus.results[0].id).toBe(memory.id);

      const resultsByDepartment = await service.searchMemories({
        query: "Engineering",
        limit: 10,
      });
      expect(resultsByDepartment.results.length).toBeGreaterThan(0);
      expect(resultsByDepartment.results[0].id).toBe(memory.id);
    }, 15000);

    it("should index template fields with arrays and objects", async () => {
      const template = {
        author: "John Doe",
        tags_custom: ["important", "review"],
        metadata: { priority: "high", project: "Alpha" },
      };

      const memory = await service.createMemory({
        title: "Project Alpha Notes",
        content: "# Notes\n\nProject notes here.",
        tags: ["project"],
        category: "NOTES",
        template,
      });

      // Small delay to ensure index is fully ready for searching
      await new Promise(resolve => setTimeout(resolve, 100));

      // Search for array values
      const resultsByTag = await service.searchMemories({
        query: "important",
        limit: 10,
      });
      expect(resultsByTag.results.length).toBeGreaterThan(0);
      expect(resultsByTag.results[0].id).toBe(memory.id);

      // Search for object values (JSON stringified)
      const resultsByProject = await service.searchMemories({
        query: "Alpha",
        limit: 10,
      });
      expect(resultsByProject.results.length).toBeGreaterThan(0);
      expect(resultsByProject.results[0].id).toBe(memory.id);
    }, 15000);

    it("should update indexed template fields when memory is updated", async () => {
      const initialTemplate = {
        author: "Original Author",
        status: "draft",
      };

      const memory = await service.createMemory({
        title: "Update Test",
        content: "# Content",
        tags: ["test"],
        category: "test",
        template: initialTemplate,
      });

      // Verify initial template values are searchable (new format: "field:author Original Author")
      // Values are still searchable because they're included in the searchable text
      const initialResults = await service.searchMemories({
        query: "Original Author",
        limit: 10,
      });
      expect(initialResults.results.length).toBeGreaterThan(0);
      expect(initialResults.results[0].id).toBe(memory.id);

      // Verify field prefix format is searchable
      const fieldAuthorResults = await service.searchMemories({
        query: "field:author",
        limit: 10,
      });
      expect(fieldAuthorResults.results.length).toBeGreaterThan(0);
      expect(fieldAuthorResults.results[0].id).toBe(memory.id);

      // Update with new template
      const updatedTemplate = {
        author: "Updated Author",
        status: "published",
        reviewer: "Reviewer Name",
      };

      await service.updateMemory(
        {
          id: memory.id,
        },
        updatedTemplate
      );

      // Small delay to ensure index is fully ready for searching after update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify new template field values are searchable (new format: "field:author Updated Author")
      const updatedResults = await service.searchMemories({
        query: "Updated Author",
        limit: 10,
      });
      expect(updatedResults.results.length).toBeGreaterThan(0);
      expect(updatedResults.results[0].id).toBe(memory.id);

      // Verify new field prefix format is searchable
      const fieldReviewerResults = await service.searchMemories({
        query: "field:reviewer",
        limit: 10,
      });
      expect(fieldReviewerResults.results.length).toBeGreaterThan(0);
      expect(fieldReviewerResults.results[0].id).toBe(memory.id);

      // Verify reviewer value is searchable
      const reviewerResults = await service.searchMemories({
        query: "Reviewer Name",
        limit: 10,
      });
      expect(reviewerResults.results.length).toBeGreaterThan(0);
      expect(reviewerResults.results[0].id).toBe(memory.id);
    }, 15000);

    it("should reindex template fields when reindexing memories", async () => {
      const template = {
        author: "Reindex Author",
        status: "archived",
      };

      const memory = await service.createMemory({
        title: "Reindex Test",
        content: "# Content",
        tags: ["test"],
        category: "test",
        template,
      });

      // Reindex all memories
      const reindexResult = await service.reindexMemories();
      expect(reindexResult.success).toBe(true);
      expect(reindexResult.indexedCount).toBeGreaterThan(0);

      // Small delay to ensure index is fully ready for searching after reindex
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify template fields are still searchable after reindex
      const results = await service.searchMemories({
        query: "Reindex Author",
        limit: 10,
      });
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0].id).toBe(memory.id);
    }, 15000);

    it("should update memory abstract when memory initially has no abstract", async () => {
      const memory = await service.createMemory({
        title: "Memory without Abstract",
        content: "# Content\n\nFull content here",
        tags: ["test"],
        category: "test"
      });

      expect(memory.abstract).toBeUndefined();

      // Add abstract via update
      const updated = await service.updateMemory({
        id: memory.id,
      abstract: "Newly added abstract"
    });

    expect(updated.abstract).toBe("Newly added abstract");
  }, 10000);

  it("should update memory content without renaming when only content changes", async () => {
    const memory = await service.createMemory({
      title: "Update Test Memory",
      content: "# Original Content\n\nThis is the original content.",
      tags: ["test", "update"],
      category: "testing"
    });

    const originalFilePath = memory.file_path;
    
    // Update only content
    const updated = await service.updateMemory({
      id: memory.id,
      content: "# Updated Content\n\nThis is the updated content with new information."
    });

    expect(updated.content).toContain("Updated Content");
    expect(updated.content).toContain("new information");
    expect(updated.file_path).toBe(originalFilePath); // File path should not change
    expect(updated.title).toBe("Update Test Memory"); // Title should remain the same
    expect(updated.category).toBe("testing"); // Category should remain the same
  }, 10000);

  it("should rename file when title changes", async () => {
    const memory = await service.createMemory({
      title: "Original Title",
      content: "# Original Content\n\nContent here.",
      tags: ["test", "rename"],
      category: "testing"
    });

    const originalFilePath = memory.file_path;
    
    // Update title
    const updated = await service.updateMemory({
      id: memory.id,
      title: "New Updated Title"
    });

    expect(updated.title).toBe("New Updated Title");
    expect(updated.file_path).not.toBe(originalFilePath); // File path should change
    expect(updated.file_path).toContain("new-updated-title"); // New path should contain new title
    expect(updated.category).toBe("testing"); // Category should remain the same
    
    // Verify old file doesn't exist and new file does
    const oldFileExists = await service.readMemory({ id: memory.id });
    expect(oldFileExists).not.toBeNull();
    expect(oldFileExists!.file_path).toBe(updated.file_path);
  }, 10000);

  it("should rename file when category changes", async () => {
    const memory = await service.createMemory({
      title: "Category Test Memory",
      content: "# Category Test\n\nContent here.",
      tags: ["test", "category"],
      category: "old-category"
    });

    const originalFilePath = memory.file_path;
    
    // Update category
    const updated = await service.updateMemory({
      id: memory.id,
      category: "new-category"
    });

    expect(updated.category).toBe("new-category");
    expect(updated.file_path).not.toBe(originalFilePath); // File path should change
    expect(updated.file_path).toContain("new-category"); // New path should contain new category
    expect(updated.title).toBe("Category Test Memory"); // Title should remain the same
    
    // Verify old file doesn't exist and new file does
    const oldFileExists = await service.readMemory({ id: memory.id });
    expect(oldFileExists).not.toBeNull();
    expect(oldFileExists!.file_path).toBe(updated.file_path);
  }, 10000);

  it("should rename file when both title and category change", async () => {
    const memory = await service.createMemory({
      title: "Original Title",
      content: "# Original Content\n\nContent here.",
      tags: ["test", "both"],
      category: "old-category"
    });

    const originalFilePath = memory.file_path;
    
    // Update both title and category
    const updated = await service.updateMemory({
      id: memory.id,
      title: "Completely New Title",
      category: "completely-new-category"
    });

    expect(updated.title).toBe("Completely New Title");
    expect(updated.category).toBe("completely-new-category");
    expect(updated.file_path).not.toBe(originalFilePath); // File path should change
    expect(updated.file_path).toContain("completely-new-title"); // New path should contain new title
    expect(updated.file_path).toContain("completely-new-category"); // New path should contain new category
    
    // Verify old file doesn't exist and new file does
    const oldFileExists = await service.readMemory({ id: memory.id });
    expect(oldFileExists).not.toBeNull();
    expect(oldFileExists!.file_path).toBe(updated.file_path);
  }, 10000);

  it("should update tags and sources without renaming", async () => {
    const memory = await service.createMemory({
      title: "Tags Test Memory",
      content: "# Tags Test\n\nContent here.",
      tags: ["original", "tags"],
      category: "testing",
      sources: ["original-source"]
    });

    const originalFilePath = memory.file_path;
    
    // Update tags and sources
    const updated = await service.updateMemory({
      id: memory.id,
      tags: ["new", "updated", "tags"],
      sources: ["new-source-1", "new-source-2"]
    });

    expect(updated.tags).toEqual(["new", "updated", "tags"]);
    expect(updated.sources).toEqual(["new-source-1", "new-source-2"]);
    expect(updated.file_path).toBe(originalFilePath); // File path should not change
    expect(updated.title).toBe("Tags Test Memory"); // Title should remain the same
    expect(updated.category).toBe("testing"); // Category should remain the same
  }, 10000);

  it("should handle complex updates with mixed changes", async () => {
    const memory = await service.createMemory({
      title: "Complex Update Test",
      content: "# Complex Test\n\nOriginal content.",
      tags: ["original"],
      category: "original-category",
      sources: ["original-source"]
    });

    const originalFilePath = memory.file_path;
    
    // Update multiple fields including title and category
    const updated = await service.updateMemory({
      id: memory.id,
      title: "Simplified Title",
      content: "# Simplified Content\n\nUpdated content with changes.",
      tags: ["simplified", "updated"],
      category: "simplified-category",
      sources: ["new-source"]
    });

    expect(updated.title).toBe("Simplified Title");
    expect(updated.content).toContain("Simplified Content");
    expect(updated.tags).toEqual(["simplified", "updated"]);
    expect(updated.category).toBe("simplified-category");
    expect(updated.sources).toEqual(["new-source"]);
    expect(updated.file_path).not.toBe(originalFilePath); // File path should change due to title/category changes
    expect(updated.file_path).toContain("simplified-title");
    expect(updated.file_path).toContain("simplified-category");
  }, 10000);

  it("should preserve all metadata during updates", async () => {
    const memory = await service.createMemory({
      title: "Metadata Test",
      content: "# Metadata Test\n\nContent here.",
      tags: ["metadata", "test"],
      category: "metadata-category",
      sources: ["metadata-source"]
    });

    const originalCreatedAt = memory.created_at;
    const originalLastReviewed = memory.last_reviewed;
    
    // Update title and content
    const updated = await service.updateMemory({
      id: memory.id,
      title: "Updated Metadata Test",
      content: "# Updated Metadata\n\nNew content here."
    });

    expect(updated.created_at).toBe(originalCreatedAt); // Created date should be preserved
    expect(updated.last_reviewed).toBe(originalLastReviewed); // Last reviewed should be preserved
    expect(updated.updated_at).not.toBe(memory.updated_at); // Updated date should change
    expect(updated.tags).toEqual(["metadata", "test"]); // Tags should be preserved
    expect(updated.sources).toEqual(["metadata-source"]); // Sources should be preserved
    expect(updated.category).toBe("metadata-category"); // Category should be preserved
  }, 10000);

  it("should update wiki-style links in linked memories when title changes", async () => {
    // Create a memory that will be linked to
    const targetMemory = await service.createMemory({
      title: "Target Memory",
      content: "# Target Memory\n\nThis is the target content.",
      tags: ["target"],
      category: "testing"
    });

    // Create a memory that links to the target
    const linkingMemory = await service.createMemory({
      title: "Linking Memory",
      content: "# Linking Memory\n\nSee [[Target Memory]] for more information.\n\nAlso check [[Target Memory|this link]] with display text.",
      tags: ["linking"],
      category: "testing"
    });

    // Create a third memory that also links to the target
    const anotherLinkingMemory = await service.createMemory({
      title: "Another Linking Memory",
      content: "# Another Linking Memory\n\nReference: [[Target Memory]]\n\nMore content here.",
      tags: ["linking"],
      category: "testing"
    });

    // Link the memories together
    await service.linkMemories({ source_id: linkingMemory.id, target_id: targetMemory.id, link_text: "Target Memory" });
    await service.linkMemories({ source_id: anotherLinkingMemory.id, target_id: targetMemory.id, link_text: "Target Memory" });

    // Verify the links are established
    const updatedTarget = await service.readMemory({ id: targetMemory.id });
    expect(updatedTarget!.links).toContain(linkingMemory.id);
    expect(updatedTarget!.links).toContain(anotherLinkingMemory.id);

    // Now rename the target memory - this should update wiki-style links in linked memories
    const renamedTarget = await service.updateMemory({
      id: targetMemory.id,
      title: "Renamed Target Memory"
    });

    expect(renamedTarget.title).toBe("Renamed Target Memory");

    // Verify that wiki-style links in linked memories were updated
    const updatedLinkingMemory = await service.readMemory({ id: linkingMemory.id });
    expect(updatedLinkingMemory!.content).toContain("[[Renamed Target Memory]]");
    expect(updatedLinkingMemory!.content).toContain("[[Renamed Target Memory|this link]]");
    expect(updatedLinkingMemory!.content).not.toContain("[[Target Memory]]");

    const updatedAnotherLinkingMemory = await service.readMemory({ id: anotherLinkingMemory.id });
    expect(updatedAnotherLinkingMemory!.content).toContain("[[Renamed Target Memory]]");
    expect(updatedAnotherLinkingMemory!.content).not.toContain("[[Target Memory]]");
  }, 15000);

  it("should not update wiki-style links when only content changes", async () => {
    // Create a memory that will be linked to
    const targetMemory = await service.createMemory({
      title: "Content Target",
      content: "# Content Target\n\nThis is the target content.",
      tags: ["target"],
      category: "testing"
    });

    // Create a memory that links to the target
    const linkingMemory = await service.createMemory({
      title: "Content Linking Memory",
      content: "# Content Linking Memory\n\nSee [[Content Target]] for more information.",
      tags: ["linking"],
      category: "testing"
    });

    // Link the memories together
    await service.linkMemories({ source_id: linkingMemory.id, target_id: targetMemory.id, link_text: "Content Target" });

    // Update only the content of the target memory (no title change)
    const updatedTarget = await service.updateMemory({
      id: targetMemory.id,
      content: "# Content Target\n\nThis is the updated target content with new information."
    });

    expect(updatedTarget.title).toBe("Content Target"); // Title unchanged
    expect(updatedTarget.content).toContain("updated target content");

    // Verify that wiki-style links in linked memory were NOT updated
    const updatedLinkingMemory = await service.readMemory({ id: linkingMemory.id });
    expect(updatedLinkingMemory!.content).toContain("[[Content Target]]"); // Link unchanged
  }, 10000);

  it("should handle wiki-style link updates with special characters in titles", async () => {
    // Create a memory with special characters in title
    const targetMemory = await service.createMemory({
      title: "Special Title (with parentheses) & symbols!",
      content: "# Special Title\n\nThis is the target content.",
      tags: ["special"],
      category: "testing"
    });

    // Create a memory that links to the target
    const linkingMemory = await service.createMemory({
      title: "Special Linking Memory",
      content: "# Special Linking Memory\n\nSee [[Special Title (with parentheses) & symbols!]] for more information.",
      tags: ["linking"],
      category: "testing"
    });

    // Link the memories together
    await service.linkMemories({ source_id: linkingMemory.id, target_id: targetMemory.id, link_text: "Special Title" });

    // Rename the target memory to a simpler title
    const renamedTarget = await service.updateMemory({
      id: targetMemory.id,
      title: "Simple Title"
    });

    expect(renamedTarget.title).toBe("Simple Title");

    // Verify that wiki-style links in linked memory were updated
    const updatedLinkingMemory = await service.readMemory({ id: linkingMemory.id });
    expect(updatedLinkingMemory!.content).toContain("[[Simple Title]]");
    expect(updatedLinkingMemory!.content).not.toContain("[[Special Title (with parentheses) & symbols!]]");
  }, 10000);

  it("should update wiki-style links in multiple linked memories", async () => {
    // Create a target memory
    const targetMemory = await service.createMemory({
      title: "Multi Target",
      content: "# Multi Target\n\nThis is the target content.",
      tags: ["target"],
      category: "testing"
    });

    // Create multiple memories that link to the target
    const linkingMemory1 = await service.createMemory({
      title: "Linking Memory 1",
      content: "# Linking Memory 1\n\nSee [[Multi Target]] for more information.",
      tags: ["linking"],
      category: "testing"
    });

    const linkingMemory2 = await service.createMemory({
      title: "Linking Memory 2",
      content: "# Linking Memory 2\n\nReference: [[Multi Target]]\n\nMore content.",
      tags: ["linking"],
      category: "testing"
    });

    const linkingMemory3 = await service.createMemory({
      title: "Linking Memory 3",
      content: "# Linking Memory 3\n\nCheck [[Multi Target|this link]] with display text.",
      tags: ["linking"],
      category: "testing"
    });

    // Link all memories to the target
    await service.linkMemories({ source_id: linkingMemory1.id, target_id: targetMemory.id, link_text: "Multi Target" });
    await service.linkMemories({ source_id: linkingMemory2.id, target_id: targetMemory.id, link_text: "Multi Target" });
    await service.linkMemories({ source_id: linkingMemory3.id, target_id: targetMemory.id, link_text: "Multi Target" });

    // Rename the target memory
    const renamedTarget = await service.updateMemory({
      id: targetMemory.id,
      title: "Renamed Multi Target"
    });

    expect(renamedTarget.title).toBe("Renamed Multi Target");

    // Verify that wiki-style links in all linked memories were updated
    const updatedLinkingMemory1 = await service.readMemory({ id: linkingMemory1.id });
    expect(updatedLinkingMemory1!.content).toContain("[[Renamed Multi Target]]");

    const updatedLinkingMemory2 = await service.readMemory({ id: linkingMemory2.id });
    expect(updatedLinkingMemory2!.content).toContain("[[Renamed Multi Target]]");

    const updatedLinkingMemory3 = await service.readMemory({ id: linkingMemory3.id });
    expect(updatedLinkingMemory3!.content).toContain("[[Renamed Multi Target|this link]]");
  }, 15000);
});

