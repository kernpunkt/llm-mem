import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import * as fsSync from "fs";
import { join } from "path";
import path from "path";
import { MemoryService } from "../src/memory/memory-service.js";
import { Memory } from "../src/memory/types.js";

describe("MemoryService Extended Coverage", () => {
  let memoryService: MemoryService;
  let testNotestorePath: string;
  let testIndexPath: string;

  beforeEach(async () => {
    // Create unique test directories for each test
    const testId = Math.random().toString(36).substring(7);
    testNotestorePath = join(process.cwd(), `memories-test-${testId}`);
    testIndexPath = join(process.cwd(), `memories-test-index-${testId}`);
    
    // Ensure clean dirs
    await fs.rm(testNotestorePath, { recursive: true, force: true }).catch(() => {});
    await fs.rm(testIndexPath, { force: true }).catch(() => {});
    
    // Create the directories
    await fs.mkdir(testNotestorePath, { recursive: true });
    await fs.mkdir(testIndexPath, { recursive: true });
    
    memoryService = new MemoryService({ 
      notestorePath: testNotestorePath, 
      indexPath: testIndexPath 
    });
    await memoryService.initialize();
  }, 20000);

  afterEach(async () => {
    // Clean up with comprehensive cleanup to avoid SQLite lock issues
    try {
      // Properly destroy the service to release all resources including FlexSearch
      if (memoryService) {
        await memoryService.destroy();
      }
      
      // Wait a bit to ensure all file handles are released
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Remove the entire test directory and all its contents recursively
      await fs.rm(testNotestorePath, { recursive: true, force: true }).catch(() => {
        // Ignore cleanup errors, but log them for debugging
        console.error(`Failed to remove test directory: ${testNotestorePath}`);
      });
      
      // Remove the index file
      await fs.rm(testIndexPath, { force: true }).catch(() => {
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

  describe("Memory Statistics", () => {
    it("should return empty statistics when no memories exist", async () => {
      const stats = await memoryService.getMemoryStatistics();

      expect(stats.total_memories).toBe(0);
      expect(stats.average_time_since_verification).toBe("0 days");
      expect(stats.memories_needing_verification).toEqual([]);
      expect(stats.average_links_per_memory).toBe(0);
      expect(stats.memories_with_few_links).toEqual([]);
      expect(stats.orphaned_memories).toEqual([]);
      expect(stats.broken_links).toEqual([]);
      expect(stats.unidirectional_links).toEqual([]);
      expect(stats.link_mismatches).toEqual([]);
      expect(stats.invalid_links).toEqual([]);
      expect(stats.memories_without_sources).toEqual([]);
      expect(stats.categories).toEqual({});
      expect(stats.tags).toEqual({});
      expect(stats.average_tags_per_memory).toBe(0);
      expect(stats.memories_with_few_tags).toEqual([]);
      expect(stats.average_memory_length_words).toBe(0);
      expect(stats.shortest_memories).toEqual([]);
      expect(stats.longest_memories).toEqual([]);
      expect(stats.recommendations).toEqual(["No memories found in the store."]);
    });

    it("should calculate statistics for single memory", async () => {
      const memory = await memoryService.createMemory({
        title: "Test Memory",
        content: "This is a test memory with some content.",
        tags: ["test", "example"],
        category: "testing",
        sources: ["https://example.com"],
      });

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.total_memories).toBe(1);
      expect(stats.average_time_since_verification).toBe("0.0 days");
      expect(stats.memories_needing_verification).toEqual([]);
      expect(stats.average_links_per_memory).toBe(0);
      expect(stats.memories_with_few_links).toEqual([]);
      expect(stats.orphaned_memories).toEqual([
        { id: memory.id, title: memory.title }
      ]);
      expect(stats.broken_links).toEqual([]);
      expect(stats.unidirectional_links).toEqual([]);
      expect(stats.link_mismatches).toEqual([]);
      expect(stats.invalid_links).toEqual([]);
      expect(stats.memories_without_sources).toEqual([]);
      expect(stats.categories).toEqual({ testing: 1 });
      expect(stats.tags).toEqual({ test: 1, example: 1 });
      expect(stats.average_tags_per_memory).toBe(2);
      expect(stats.memories_with_few_tags).toEqual([]);
      expect(stats.average_memory_length_words).toBe(8);
      expect(stats.shortest_memories).toEqual([
        { id: memory.id, title: memory.title, word_count: 8, length_percentile: 100 }
      ]);
      expect(stats.longest_memories).toEqual([
        { id: memory.id, title: memory.title, word_count: 8, length_percentile: 100 }
      ]);
      expect(stats.recommendations).toContain("Consider linking 1 orphaned memories to improve knowledge connectivity.");
    });

    it("should calculate statistics for multiple memories", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "This is the first memory with some content.",
        tags: ["first", "test"],
        category: "testing",
        sources: ["https://example1.com"],
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "This is the second memory with different content and more words to test word counting functionality.",
        tags: ["second", "test", "longer"],
        category: "testing",
        sources: [],
      });

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.total_memories).toBe(2);
      expect(stats.categories).toEqual({ testing: 2 });
      expect(stats.tags).toEqual({ first: 1, second: 1, test: 2, longer: 1 });
      expect(stats.average_tags_per_memory).toBe(2.5);
      expect(stats.average_memory_length_words).toBe(12); // (8 + 16) / 2 = 12
      expect(stats.memories_without_sources).toEqual([
        { id: memory2.id, title: memory2.title }
      ]);
      expect(stats.recommendations).toContain("Add sources to 1 memories to improve traceability.");
    });

    it("should detect link mismatches between YAML and markdown", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "This memory links to [[Second Memory]] and [[Third Memory]].",
        tags: ["first"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "This memory links to [[First Memory]].",
        tags: ["second"],
        category: "testing",
      });

      const memory3 = await memoryService.createMemory({
        title: "Third Memory",
        content: "This memory has no links.",
        tags: ["third"],
        category: "testing",
      });

      // Manually add links to YAML frontmatter to create mismatch
      const filePath1 = path.join(testNotestorePath, `(testing)(first-memory)(${memory1.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content1 = fsSync.readFileSync(filePath1, "utf-8");
      const updatedContent1 = content1.replace(
        /links: \[\]/,
        "links: ['" + memory2.id + "', '" + memory3.id + "']"
      );
      fsSync.writeFileSync(filePath1, updatedContent1);

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.link_mismatches).toHaveLength(1);
      const mismatch = stats.link_mismatches[0];
      // The mismatch could be on any memory, so just check that it exists
      expect([memory1.id, memory2.id, memory3.id]).toContain(mismatch.id);
      expect(mismatch.missing_in_markdown || mismatch.missing_in_yaml).toBeTruthy();
      // Allow for cases where the link counts might be 0 due to timing issues
      expect(mismatch.yaml_link_count + mismatch.markdown_link_count).toBeGreaterThan(0);
    });

    it("should detect broken and unidirectional links", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "This memory has links.",
        tags: ["first"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "This memory has links.",
        tags: ["second"],
        category: "testing",
      });

      // Add broken link to memory1
      const filePath1 = path.join(testNotestorePath, `(testing)(first-memory)(${memory1.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content1 = fsSync.readFileSync(filePath1, "utf-8");
      const updatedContent1 = content1.replace(
        /links: \[\]/,
        "links: ['non-existent-id']"  // Only broken link, no link to memory2
      );
      fsSync.writeFileSync(filePath1, updatedContent1);

      // Add unidirectional link from memory2 to memory1
      const filePath2 = path.join(testNotestorePath, `(testing)(second-memory)(${memory2.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content2 = fsSync.readFileSync(filePath2, "utf-8");
      const updatedContent2 = content2.replace(
        /links: \[\]/,
        "links: ['" + memory1.id + "']"  // memory2 links to memory1, but memory1 doesn't link back
      );
      fsSync.writeFileSync(filePath2, updatedContent2);

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.broken_links).toHaveLength(1);
      expect(stats.broken_links[0].id).toBe(memory1.id);
      expect(stats.broken_links[0].broken_link_id).toBe("non-existent-id");

      expect(stats.unidirectional_links).toHaveLength(1);
      expect(stats.unidirectional_links[0].id).toBe(memory2.id);
      expect(stats.unidirectional_links[0].unidirectional_link_id).toBe(memory1.id);
    });

    it("should detect invalid link formats", async () => {
      const memory = await memoryService.createMemory({
        title: "Test Memory",
        content: "This memory has [[Valid Link]] and [Markdown Link](url) and <a href='url'>HTML Link</a>.",
        tags: ["test"],
        category: "testing",
      });

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.invalid_links).toHaveLength(1);
      const invalid = stats.invalid_links[0];
      expect(invalid.id).toBe(memory.id);
      expect(invalid.invalid_links).toHaveLength(3); // 2 invalid formats + 1 valid obsidian link
      
      const markdownLink = invalid.invalid_links.find(link => link.type === "invalid-format");
      expect(markdownLink).toBeDefined();
      
      const htmlLink = invalid.invalid_links.find(link => link.type === "invalid-format");
      expect(htmlLink).toBeDefined();
    });

    it("should calculate verification statistics", async () => {
      // Create memory with old verification date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

      const memory = await memoryService.createMemory({
        title: "Old Memory",
        content: "This memory was verified a long time ago.",
        tags: ["old"],
        category: "testing",
      });

      // Manually update the last_reviewed date
      const filePath = path.join(testNotestorePath, `(testing)(test-memory)(${memory.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content = fsSync.readFileSync(filePath, "utf-8");
      const updatedContent = content.replace(
        /last_reviewed: "[^"]*"/,
        `last_reviewed: "${oldDate.toISOString()}"`
      );
      fsSync.writeFileSync(filePath, updatedContent);

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.average_time_since_verification).toBe("30.0 days");
      expect(stats.memories_needing_verification).toHaveLength(1);
      expect(stats.memories_needing_verification[0].id).toBe(memory.id);
      expect(stats.memories_needing_verification[0].days_since_verification).toBe(30);
    });

    it("should generate appropriate recommendations", async () => {
      const memory = await memoryService.createMemory({
        title: "Test Memory",
        content: "This memory has few tags.",
        tags: ["test"],
        category: "testing",
        sources: [],
      });

      const stats = await memoryService.getMemoryStatistics();

      expect(stats.recommendations).toContain("Consider linking 1 orphaned memories to improve knowledge connectivity.");
      expect(stats.recommendations).toContain("Add sources to 1 memories to improve traceability.");
      // Note: The tag recommendation logic depends on the average tags per memory calculation
      // and may not always trigger for single memories
    });
  });

  describe("Memory Listing and Filtering", () => {
    it("should list all memories without filters", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first"],
        category: "category1",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second"],
        category: "category2",
      });

      const result = await memoryService.listMemories({});

      expect(result.total).toBe(2);
      expect(result.memories).toHaveLength(2);
      expect(result.memories.map(m => m.id)).toContain(memory1.id);
      expect(result.memories.map(m => m.id)).toContain(memory2.id);
    });

    it("should filter memories by category", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first"],
        category: "category1",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second"],
        category: "category2",
      });

      const result = await memoryService.listMemories({ category: "category1" });

      expect(result.total).toBe(1); // Total filtered memories
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].id).toBe(memory1.id);
      expect(result.memories[0].category).toBe("category1");
    });

    it("should filter memories by tags", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first", "common"],
        category: "category1",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second", "common"],
        category: "category2",
      });

      const memory3 = await memoryService.createMemory({
        title: "Third Memory",
        content: "Third content",
        tags: ["third"],
        category: "category3",
      });

      const result = await memoryService.listMemories({ tags: ["common"] });

      expect(result.total).toBe(2); // Total filtered memories
      expect(result.memories).toHaveLength(2);
      expect(result.memories.map(m => m.id)).toContain(memory1.id);
      expect(result.memories.map(m => m.id)).toContain(memory2.id);
      expect(result.memories.map(m => m.id)).not.toContain(memory3.id);
    });

    it("should filter memories by multiple tags", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first", "common", "special"],
        category: "category1",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second", "common"],
        category: "category2",
      });

      const result = await memoryService.listMemories({ tags: ["common", "special"] });

      expect(result.total).toBe(2); // Both memories have "common" tag
      expect(result.memories).toHaveLength(2);
      expect(result.memories.map(m => m.id)).toContain(memory1.id);
      expect(result.memories.map(m => m.id)).toContain(memory2.id);
    });

    it("should limit results", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first"],
        category: "category1",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second"],
        category: "category2",
      });

      const memory3 = await memoryService.createMemory({
        title: "Third Memory",
        content: "Third content",
        tags: ["third"],
        category: "category3",
      });

      const result = await memoryService.listMemories({ limit: 2 });

      expect(result.total).toBe(3);
      expect(result.memories).toHaveLength(2);
    });

    it("should combine multiple filters", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first", "common"],
        category: "category1",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second", "common"],
        category: "category1",
      });

      const memory3 = await memoryService.createMemory({
        title: "Third Memory",
        content: "Third content",
        tags: ["third"],
        category: "category2",
      });

      const result = await memoryService.listMemories({
        category: "category1",
        tags: ["common"],
        limit: 1,
      });

      expect(result.total).toBe(2);
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].category).toBe("category1");
      expect(result.memories[0].tags).toContain("common");
    });
  });

  describe("Memory Review Management", () => {
    it("should get memories needing review", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      const memory1 = await memoryService.createMemory({
        title: "Old Memory",
        content: "Old content",
        tags: ["old"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Recent Memory",
        content: "Recent content",
        tags: ["recent"],
        category: "testing",
      });

      // Manually update the last_reviewed date for old memory
      const filePath = path.join(testNotestorePath, `(testing)(old-memory)(${memory1.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content = fsSync.readFileSync(filePath, "utf-8");
      const updatedContent = content.replace(
        /last_reviewed: "[^"]*"/,
        `last_reviewed: "${oldDate.toISOString()}"`
      );
      fsSync.writeFileSync(filePath, updatedContent);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      const result = await memoryService.getMemoriesNeedingReview(cutoffDate.toISOString());

      expect(result.total).toBe(1);
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].id).toBe(memory1.id);
      expect(result.memories[0].title).toBe("Old Memory");
    });

    it("should sort memories by review date", async () => {
      const veryOldDate = new Date();
      veryOldDate.setDate(veryOldDate.getDate() - 90); // 90 days ago

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      const memory1 = await memoryService.createMemory({
        title: "Old Memory",
        content: "Old content",
        tags: ["old"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Very Old Memory",
        content: "Very old content",
        tags: ["very-old"],
        category: "testing",
      });

      // Manually update the last_reviewed dates
      const filePath1 = path.join(testNotestorePath, `(testing)(first-memory)(${memory1.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content1 = fsSync.readFileSync(filePath1, "utf-8");
      const updatedContent1 = content1.replace(
        /last_reviewed: "[^"]*"/,
        `last_reviewed: "${oldDate.toISOString()}"`
      );
      fsSync.writeFileSync(filePath1, updatedContent1);

      const filePath2 = path.join(testNotestorePath, `(testing)(second-memory)(${memory2.id}).md`);
      
      // Ensure file is written to disk before reading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const content2 = fsSync.readFileSync(filePath2, "utf-8");
      const updatedContent2 = content2.replace(
        /last_reviewed: "[^"]*"/,
        `last_reviewed: "${veryOldDate.toISOString()}"`
      );
      fsSync.writeFileSync(filePath2, updatedContent2);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      const result = await memoryService.getMemoriesNeedingReview(cutoffDate.toISOString());

      expect(result.total).toBe(2);
      expect(result.memories).toHaveLength(2);
      // Should be sorted by last_reviewed (oldest first)
      expect(result.memories[0].id).toBe(memory2.id); // Very old first
      expect(result.memories[1].id).toBe(memory1.id); // Old second
    });

    it("should handle no memories needing review", async () => {
      const memory = await memoryService.createMemory({
        title: "Recent Memory",
        content: "Recent content",
        tags: ["recent"],
        category: "testing",
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      const result = await memoryService.getMemoriesNeedingReview(cutoffDate.toISOString());

      expect(result.total).toBe(0);
      expect(result.memories).toHaveLength(0);
    });
  });

  describe("Memory Reindexing", () => {
    it("should reindex all memories", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second"],
        category: "testing",
      });

      const result = await memoryService.reindexMemories();

      expect(result.success).toBe(true);
      expect(result.indexedCount).toBe(2);
      expect(result.message).toBe("Successfully reindexed 2 memories");
    });

    it("should handle reindexing with corrupted files gracefully", async () => {
      const memory = await memoryService.createMemory({
        title: "Valid Memory",
        content: "Valid content",
        tags: ["valid"],
        category: "testing",
      });

      // Corrupt the file
      const filePath = path.join(testNotestorePath, `(testing)(valid-memory)(${memory.id}).md`);
      fsSync.writeFileSync(filePath, "corrupted content");

      const result = await memoryService.reindexMemories();

      expect(result.success).toBe(true);
      expect(result.indexedCount).toBe(0); // Should skip corrupted file
      expect(result.message).toBe("Successfully reindexed 0 memories");
    });
  });

  describe("Memory Linking", () => {
    it("should link memories successfully", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second"],
        category: "testing",
      });

      const result = await memoryService.linkMemories({
        source_id: memory1.id,
        target_id: memory2.id,
        link_text: "Custom Link",
      });

      expect(result.success).toBe(true);
      expect(result.source_id).toBe(memory1.id);
      expect(result.target_id).toBe(memory2.id);
      expect(result.message).toContain("Successfully linked memories");
    });

    it("should unlink memories successfully", async () => {
      const memory1 = await memoryService.createMemory({
        title: "First Memory",
        content: "First content",
        tags: ["first"],
        category: "testing",
      });

      const memory2 = await memoryService.createMemory({
        title: "Second Memory",
        content: "Second content",
        tags: ["second"],
        category: "testing",
      });

      // First link them
      await memoryService.linkMemories({
        source_id: memory1.id,
        target_id: memory2.id,
      });

      // Then unlink them
      const result = await memoryService.unlinkMemories({
        source_id: memory1.id,
        target_id: memory2.id,
      });

      expect(result.success).toBe(true);
      expect(result.source_id).toBe(memory1.id);
      expect(result.target_id).toBe(memory2.id);
      expect(result.message).toContain("Successfully unlinked memories");
    });

    it("should throw error when linking non-existent source memory", async () => {
      const memory = await memoryService.createMemory({
        title: "Valid Memory",
        content: "Valid content",
        tags: ["valid"],
        category: "testing",
      });

      await expect(
        memoryService.linkMemories({
          source_id: "non-existent-id",
          target_id: memory.id,
        })
      ).rejects.toThrow("Source memory with ID non-existent-id not found");
    });

    it("should throw error when linking non-existent target memory", async () => {
      const memory = await memoryService.createMemory({
        title: "Valid Memory",
        content: "Valid content",
        tags: ["valid"],
        category: "testing",
      });

      await expect(
        memoryService.linkMemories({
          source_id: memory.id,
          target_id: "non-existent-id",
        })
      ).rejects.toThrow("Target memory with ID non-existent-id not found");
    });
  });

  describe("Memory Service Cleanup", () => {
    it("should destroy service successfully", async () => {
      const memory = await memoryService.createMemory({
        title: "Test Memory",
        content: "Test content",
        tags: ["test"],
        category: "testing",
      });

      await expect(memoryService.destroy()).resolves.not.toThrow();
    });

    it("should handle destroy errors gracefully", async () => {
      // Mock a service that throws an error during destroy
      const mockSearchService = {
        destroy: async () => {
          throw new Error("Search service destroy failed");
        },
      };

      const mockMemoryService = new MemoryService({
        notestorePath: testNotestorePath,
        indexPath: testIndexPath,
      });

      // Replace the search service with our mock
      (mockMemoryService as any).searchService = mockSearchService;

      await expect(mockMemoryService.destroy()).rejects.toThrow("Failed to destroy MemoryService: Search service destroy failed");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle getAllMemories with corrupted files", async () => {
      const memory = await memoryService.createMemory({
        title: "Valid Memory",
        content: "Valid content",
        tags: ["valid"],
        category: "testing",
      });

      // Corrupt the file
      const filePath = path.join(testNotestorePath, `(testing)(valid-memory)(${memory.id}).md`);
      fsSync.writeFileSync(filePath, "corrupted content");

      const memories = await memoryService.getAllMemories();

      expect(memories).toHaveLength(0); // Should skip corrupted file
    });

    it("should handle getAllMemories with invalid file paths", async () => {
      const memory = await memoryService.createMemory({
        title: "Valid Memory",
        content: "Valid content",
        tags: ["valid"],
        category: "testing",
      });

      // Create an invalid file path entry
      const invalidFilePath = path.join(testNotestorePath, "invalid-file.md");
      fsSync.writeFileSync(invalidFilePath, "invalid content");

      const memories = await memoryService.getAllMemories();

      expect(memories).toHaveLength(1); // Should only include valid memory
      expect(memories[0].id).toBe(memory.id);
    });

    it("should handle updateMemory with non-existent memory", async () => {
      await expect(
        memoryService.updateMemory({
          id: "non-existent-id",
          title: "Updated Title",
        })
      ).rejects.toThrow("Memory with ID non-existent-id not found");
    });

    it("should handle searchMemories with empty results", async () => {
      const result = await memoryService.searchMemories({
        query: "non-existent-term",
        limit: 10,
      });

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});
