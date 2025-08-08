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

    const { filePath, markdown } = await this.fileService.writeMemoryFile({
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
    const updatedMarkdown = await this.fileService.updateMemoryFile(
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

