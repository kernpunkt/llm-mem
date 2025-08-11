import { v4 as uuidv4 } from "uuid";
import { FileService } from "./file-service.js";
import { SearchService } from "./search-service.js";
import { LinkService } from "./link-service.js";
import { Memory, MemoryUpdateRequest, MemorySearchRequest, LinkRequest } from "./types.js";
import { parseMemoryFilePath } from "../utils/file-system.js";

export interface MemoryServiceConfig {
  notestorePath: string;
  indexPath: string;
}

export class MemoryService {
  private readonly fileService: FileService;
  private readonly searchService: SearchService;
  private readonly linkService: LinkService;

  constructor(config: MemoryServiceConfig) {
    this.fileService = new FileService({ notestorePath: config.notestorePath });
    this.searchService = new SearchService({ indexPath: config.indexPath });
    this.linkService = new LinkService(this.fileService);
  }

  async initialize(): Promise<void> {
    await this.fileService.initialize();
    await this.searchService.initialize();
  }

  async createMemory(params: {
    title: string;
    content: string;
    tags?: string[];
    category?: string;
    sources?: string[];
  }): Promise<Memory> {
    await this.initialize();
    const id = uuidv4();
    const category = params.category || "general";
    const tags = params.tags || [];
    const sources = params.sources || [];

    const { filePath } = await this.fileService.writeMemoryFile({
      id,
      title: params.title,
      content: params.content,
      tags,
      category,
      sources,
    });

    // Parse frontmatter back to construct Memory object
    const parsed = await this.fileService.readMemoryFileById(id);
    if (!parsed) {
      throw new Error("Failed to read memory after creation");
    }

    const memory: Memory = {
      id: parsed.id,
      title: parsed.title,
      content: parsed.content,
      tags: parsed.tags,
      category: parsed.category,
      created_at: parsed.created_at,
      updated_at: parsed.updated_at,
      last_reviewed: parsed.last_reviewed,
      links: parsed.links,
      sources: parsed.sources,
      file_path: filePath,
    };

    await this.searchService.indexMemory({
      id: memory.id,
      title: memory.title,
      content: memory.content,
      tags: memory.tags,
      category: memory.category,
      created_at: memory.created_at,
      updated_at: memory.updated_at,
      last_reviewed: memory.last_reviewed,
      links: memory.links,
      sources: memory.sources,
    });

    return memory;
  }

  async readMemory(identifier: { id?: string; title?: string }): Promise<Memory | null> {
    await this.initialize();
    const { id, title } = identifier;
    let parsed: any = null;
    if (id) parsed = await this.fileService.readMemoryFileById(id);
    if (!parsed && title) parsed = await this.fileService.readMemoryFileByTitle(title);
    if (!parsed) return null;

    return {
      id: parsed.id,
      title: parsed.title,
      content: parsed.content,
      tags: parsed.tags,
      category: parsed.category,
      created_at: parsed.created_at,
      updated_at: parsed.updated_at,
      last_reviewed: parsed.last_reviewed,
      links: parsed.links,
      sources: parsed.sources,
      file_path: parsed.file_path,
    };
  }

  async getAllMemories(): Promise<Memory[]> {
    await this.initialize();
    const files = await this.fileService.listAllMemoryFiles();
    const memories: Memory[] = [];
    for (const filePath of files) {
      try {
        const parsed = parseMemoryFilePath(filePath);
        if (!parsed) continue;
        const mem = await this.readMemory({ id: parsed.id });
        if (mem) memories.push(mem);
      } catch (error) {
        console.error(`Failed to read memory from ${filePath}:`, error);
      }
    }
    return memories;
  }

  async listMemories(params: {
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<{
    memories: Memory[];
    total: number;
  }> {
    await this.initialize();
    const { category, tags, limit } = params;
    
    let allMemories = await this.getAllMemories();
    
    // Filter by category if specified
    if (category) {
      allMemories = allMemories.filter(memory => memory.category === category);
    }
    
    // Filter by tags if specified (any tag match)
    if (tags && tags.length > 0) {
      allMemories = allMemories.filter(memory => 
        tags.some(tag => memory.tags.includes(tag))
      );
    }
    
    // Apply limit if specified
    const limitedMemories = limit ? allMemories.slice(0, limit) : allMemories;
    
    return {
      memories: limitedMemories,
      total: allMemories.length
    };
  }

  async getMemoryStatistics(): Promise<{
    total_memories: number;
    average_time_since_verification: string;
    memories_needing_verification: Array<{
      id: string;
      title: string;
      days_since_verification: number;
    }>;
    average_links_per_memory: number;
    memories_with_few_links: Array<{
      id: string;
      title: string;
      link_count: number;
    }>;
    orphaned_memories: Array<{
      id: string;
      title: string;
    }>;
    broken_links: Array<{
      id: string;
      title: string;
      broken_link_id: string;
    }>;
    unidirectional_links: Array<{
      id: string;
      title: string;
      unidirectional_link_id: string;
    }>;
    memories_without_sources: Array<{
      id: string;
      title: string;
    }>;
    categories: Record<string, number>;
    tags: Record<string, number>;
    average_tags_per_memory: number;
    memories_with_few_tags: Array<{
      id: string;
      title: string;
      tag_count: number;
    }>;
    average_memory_length_words: number;
    shortest_memories: Array<{
      id: string;
      title: string;
      word_count: number;
      length_percentile: number;
    }>;
    longest_memories: Array<{
      id: string;
      title: string;
      word_count: number;
      length_percentile: number;
    }>;
    recommendations: string[];
  }> {
    await this.initialize();
    const allMemories = await this.getAllMemories();
    
    if (allMemories.length === 0) {
      return {
        total_memories: 0,
        average_time_since_verification: "0 days",
        memories_needing_verification: [],
        average_links_per_memory: 0,
        memories_with_few_links: [],
        orphaned_memories: [],
        broken_links: [],
        unidirectional_links: [],
        memories_without_sources: [],
        categories: {},
        tags: {},
        average_tags_per_memory: 0,
        memories_with_few_tags: [],
        average_memory_length_words: 0,
        shortest_memories: [],
        longest_memories: [],
        recommendations: ["No memories found in the store."]
      };
    }

    const now = new Date();
    
    // Calculate verification statistics
    const verificationTimes = allMemories.map(memory => {
      const lastReviewed = new Date(memory.last_reviewed);
      return Math.floor((now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24));
    });
    const averageVerificationDays = verificationTimes.reduce((sum, days) => sum + days, 0) / verificationTimes.length;
    const memoriesNeedingVerification = allMemories
      .map((memory, index) => ({ memory, days: verificationTimes[index] }))
      .filter(({ days }) => days > averageVerificationDays)
      .map(({ memory, days }) => ({
        id: memory.id,
        title: memory.title,
        days_since_verification: days
      }));

    // Calculate link statistics
    const linkCounts = allMemories.map(memory => memory.links.length);
    const averageLinksPerMemory = linkCounts.reduce((sum, count) => sum + count, 0) / linkCounts.length;
    const memoriesWithFewLinks = allMemories
      .map((memory, index) => ({ memory, count: linkCounts[index] }))
      .filter(({ count }) => count < averageLinksPerMemory)
      .map(({ memory, count }) => ({
        id: memory.id,
        title: memory.title,
        link_count: count
      }));

    // Find orphaned memories (no links)
    const orphanedMemories = allMemories
      .filter(memory => memory.links.length === 0)
      .map(memory => ({
        id: memory.id,
        title: memory.title
      }));

    // Find broken and unidirectional links
    const brokenLinks: Array<{ id: string; title: string; broken_link_id: string }> = [];
    const unidirectionalLinks: Array<{ id: string; title: string; unidirectional_link_id: string }> = [];
    
    for (const memory of allMemories) {
      for (const linkId of memory.links) {
        const linkedMemory = allMemories.find(m => m.id === linkId);
        if (!linkedMemory) {
          brokenLinks.push({
            id: memory.id,
            title: memory.title,
            broken_link_id: linkId
          });
        } else if (!linkedMemory.links.includes(memory.id)) {
          unidirectionalLinks.push({
            id: memory.id,
            title: memory.title,
            unidirectional_link_id: linkId
          });
        }
      }
    }

    // Find memories without sources
    const memoriesWithoutSources = allMemories
      .filter(memory => memory.sources.length === 0)
      .map(memory => ({
        id: memory.id,
        title: memory.title
      }));

    // Calculate category distribution
    const categories: Record<string, number> = {};
    for (const memory of allMemories) {
      categories[memory.category] = (categories[memory.category] || 0) + 1;
    }

    // Calculate tag usage
    const tags: Record<string, number> = {};
    for (const memory of allMemories) {
      for (const tag of memory.tags) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }
    const averageTagsPerMemory = allMemories.reduce((sum, memory) => sum + memory.tags.length, 0) / allMemories.length;
    const memoriesWithFewTags = allMemories
      .filter(memory => memory.tags.length < averageTagsPerMemory)
      .map(memory => ({
        id: memory.id,
        title: memory.title,
        tag_count: memory.tags.length
      }));

    // Calculate content length statistics
    const wordCounts = allMemories.map(memory => {
      const words = memory.content.split(/\s+/).filter(word => word.length > 0);
      return words.length;
    });
    const averageMemoryLengthWords = wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length;
    
    // Find shortest and longest memories (10% each)
    const sortedByLength = allMemories
      .map((memory, index) => ({ memory, wordCount: wordCounts[index] }))
      .sort((a, b) => a.wordCount - b.wordCount);
    
    const tenPercent = Math.max(1, Math.floor(allMemories.length * 0.1));
    const shortestMemories = sortedByLength.slice(0, tenPercent).map(({ memory, wordCount }) => ({
      id: memory.id,
      title: memory.title,
      word_count: wordCount,
      length_percentile: Math.floor((wordCount / averageMemoryLengthWords) * 100)
    }));
    
    const longestMemories = sortedByLength.slice(-tenPercent).map(({ memory, wordCount }) => ({
      id: memory.id,
      title: memory.title,
      word_count: wordCount,
      length_percentile: Math.floor((wordCount / averageMemoryLengthWords) * 100)
    }));

    // Generate recommendations
    const recommendations: string[] = [];
    if (orphanedMemories.length > 0) {
      recommendations.push(`Consider linking ${orphanedMemories.length} orphaned memories to improve knowledge connectivity.`);
    }
    if (brokenLinks.length > 0) {
      recommendations.push(`Fix ${brokenLinks.length} broken links to maintain data integrity.`);
    }
    if (unidirectionalLinks.length > 0) {
      recommendations.push(`Review ${unidirectionalLinks.length} unidirectional links for potential bidirectional relationships.`);
    }
    if (memoriesWithoutSources.length > 0) {
      recommendations.push(`Add sources to ${memoriesWithoutSources.length} memories to improve traceability.`);
    }
    if (memoriesNeedingVerification.length > 0) {
      recommendations.push(`Review ${memoriesNeedingVerification.length} memories that haven't been verified recently.`);
    }
    if (memoriesWithFewTags.length > 0) {
      recommendations.push(`Consider adding more tags to ${memoriesWithFewTags.length} memories for better categorization.`);
    }
    if (recommendations.length === 0) {
      recommendations.push("Memory store is in excellent health with no immediate actions needed.");
    }

    return {
      total_memories: allMemories.length,
      average_time_since_verification: `${averageVerificationDays.toFixed(1)} days`,
      memories_needing_verification: memoriesNeedingVerification,
      average_links_per_memory: Math.round(averageLinksPerMemory * 100) / 100,
      memories_with_few_links: memoriesWithFewLinks,
      orphaned_memories: orphanedMemories,
      broken_links: brokenLinks,
      unidirectional_links: unidirectionalLinks,
      memories_without_sources: memoriesWithoutSources,
      categories,
      tags,
      average_tags_per_memory: Math.round(averageTagsPerMemory * 100) / 100,
      memories_with_few_tags: memoriesWithFewTags,
      average_memory_length_words: Math.round(averageMemoryLengthWords),
      shortest_memories: shortestMemories,
      longest_memories: longestMemories,
      recommendations
    };
  }

  async updateMemory(params: MemoryUpdateRequest): Promise<Memory> {
    await this.initialize();
    const { id, ...updates } = params;
    
    const existing = await this.readMemory({ id });
    if (!existing) {
      throw new Error(`Memory with ID ${id} not found`);
    }

    // Prepare updates for frontmatter
    const frontmatterUpdates: any = {};
    if (updates.title !== undefined) frontmatterUpdates.title = updates.title;
    if (updates.tags !== undefined) frontmatterUpdates.tags = updates.tags;
    if (updates.category !== undefined) frontmatterUpdates.category = updates.category;
    if (updates.sources !== undefined) frontmatterUpdates.sources = updates.sources;
    frontmatterUpdates.updated_at = new Date().toISOString();

    // Update the file
    await this.fileService.updateMemoryFile(
      existing.file_path,
      frontmatterUpdates,
      updates.content
    );

    // Re-read the updated memory
    const updated = await this.readMemory({ id });
    if (!updated) {
      throw new Error("Failed to read updated memory");
    }

    // Update search index
    await this.searchService.indexMemory({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      tags: updated.tags,
      category: updated.category,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      last_reviewed: updated.last_reviewed,
      links: updated.links,
      sources: updated.sources,
    });

    return updated;
  }

  async searchMemories(params: MemorySearchRequest): Promise<{
    results: Array<{
      id: string;
      title: string;
      content: string;
      tags: string[];
      category: string;
      created_at: string;
      updated_at: string;
      last_reviewed: string;
      links: string[];
      sources: string[];
      score: number;
      snippet: string;
    }>;
    total: number;
  }> {
    await this.initialize();
    const { query, limit = 10, category, tags } = params;

    const searchResults = await this.searchService.search(query, {
      limit,
      category,
      tags,
    });

    return {
      results: searchResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        tags: result.tags,
        category: result.category,
        created_at: result.created_at,
        updated_at: result.updated_at,
        last_reviewed: result.last_reviewed,
        links: result.links,
        sources: result.sources,
        score: result.score,
        snippet: result.snippet,
      })),
      total: searchResults.length,
    };
  }

  async linkMemories(params: LinkRequest): Promise<{
    source_id: string;
    target_id: string;
    success: boolean;
    message: string;
  }> {
    await this.initialize();
    const { source_id, target_id } = params;

    // Verify both memories exist
    const source = await this.readMemory({ id: source_id });
    const target = await this.readMemory({ id: target_id });

    if (!source) {
      throw new Error(`Source memory with ID ${source_id} not found`);
    }
    if (!target) {
      throw new Error(`Target memory with ID ${target_id} not found`);
    }

    // Create bidirectional links
    await this.linkService.linkMemories({ id: source_id }, { id: target_id });

    return {
      source_id,
      target_id,
      success: true,
      message: `Successfully linked memories: "${source.title}" ↔ "${target.title}"`,
    };
  }

  async unlinkMemories(params: LinkRequest): Promise<{
    source_id: string;
    target_id: string;
    success: boolean;
    message: string;
  }> {
    await this.initialize();
    const { source_id, target_id } = params;

    // Verify both memories exist
    const source = await this.readMemory({ id: source_id });
    const target = await this.readMemory({ id: target_id });

    if (!source) {
      throw new Error(`Source memory with ID ${source_id} not found`);
    }
    if (!target) {
      throw new Error(`Target memory with ID ${target_id} not found`);
    }

    // Remove bidirectional links
    await this.linkService.unlinkMemories({ id: source_id }, { id: target_id });

    return {
      source_id,
      target_id,
      success: true,
      message: `Successfully unlinked memories: "${source.title}" ↔ "${target.title}"`,
    };
  }

  async reindexMemories(): Promise<{
    success: boolean;
    message: string;
    indexedCount: number;
  }> {
    await this.initialize();
    
    // Clear all indexes
    await this.searchService.clearIndexes();
    
    // Get all memory files
    const memoryFiles = await this.fileService.listAllMemoryFiles();
    let indexedCount = 0;
    
    // Reindex each memory
    for (const filePath of memoryFiles) {
      try {
        const parsed = parseMemoryFilePath(filePath);
        if (!parsed) continue;
        
        const memory = await this.readMemory({ id: parsed.id });
        if (!memory) continue;
        
        await this.searchService.indexMemory({
          id: memory.id,
          title: memory.title,
          content: memory.content,
          tags: memory.tags,
          category: memory.category,
          created_at: memory.created_at,
          updated_at: memory.updated_at,
          last_reviewed: memory.last_reviewed,
          links: memory.links,
          sources: memory.sources,
        });
        
        indexedCount++;
      } catch (error) {
        console.error(`Failed to reindex memory from ${filePath}:`, error);
      }
    }
    
    return {
      success: true,
      message: `Successfully reindexed ${indexedCount} memories`,
      indexedCount,
    };
  }

  async getMemoriesNeedingReview(cutoffDate: string): Promise<{
    memories: Array<{
      id: string;
      title: string;
      category: string;
      tags: string[];
      last_reviewed: string;
      created_at: string;
    }>;
    total: number;
  }> {
    await this.initialize();
    
    const memoryFiles = await this.fileService.listAllMemoryFiles();
    const memoriesNeedingReview: Array<{
      id: string;
      title: string;
      category: string;
      tags: string[];
      last_reviewed: string;
      created_at: string;
    }> = [];
    
    const cutoff = new Date(cutoffDate);
    
    for (const filePath of memoryFiles) {
      try {
        const parsed = parseMemoryFilePath(filePath);
        if (!parsed) continue;
        
        const memory = await this.readMemory({ id: parsed.id });
        if (!memory) continue;
        
        const lastReviewed = new Date(memory.last_reviewed);
        if (lastReviewed < cutoff) {
          memoriesNeedingReview.push({
            id: memory.id,
            title: memory.title,
            category: memory.category,
            tags: memory.tags,
            last_reviewed: memory.last_reviewed,
            created_at: memory.created_at,
          });
        }
      } catch (error) {
        console.error(`Failed to check memory from ${filePath}:`, error);
      }
    }
    
    // Sort by last_reviewed date (oldest first)
    memoriesNeedingReview.sort((a, b) => 
      new Date(a.last_reviewed).getTime() - new Date(b.last_reviewed).getTime()
    );
    
    return {
      memories: memoriesNeedingReview,
      total: memoriesNeedingReview.length,
    };
  }
}

