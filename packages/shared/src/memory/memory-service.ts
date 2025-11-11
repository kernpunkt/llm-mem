import { v4 as uuidv4 } from "uuid";
import { FileService } from "./file-service.js";
import { SearchService } from "./search-service.js";
import { LinkService } from "./link-service.js";
import { Memory, MemoryUpdateRequest, MemorySearchRequest, LinkRequest } from "./types.js";
import { parseMemoryFilePath } from "../utils/file-system.js";
import type { MemoryIndexDocument } from "../utils/flexsearch.js";
import { KNOWN_FRONTMATTER_FIELDS } from "../utils/constants.js";

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

  /**
   * Converts custom frontmatter fields to searchable text.
   * This allows template fields to be searchable through the content index.
   * 
   * The format includes both field names and values as searchable terms:
   * - Field names are prefixed with "field:" to allow searching for specific fields
   * - Values are included as-is for content search
   * 
   * Example: For `{ author: "John Doe", status: "draft" }`, the searchable text would be:
   * "field:author John Doe field:status draft"
   * 
   * This allows searching for:
   * - "John Doe" (finds by value - primary use case)
   * - "field:author" (finds specifically by field name prefix)
   * - "author" (may find by field name if tokenized separately)
   * 
   * @param parsed - Parsed memory object with all frontmatter fields
   * @returns Searchable text representation of custom fields
   */
  private createSearchableCustomFieldsText(parsed: Record<string, unknown>): string {
    const customFields: string[] = [];
    
    for (const key in parsed) {
      if (!KNOWN_FRONTMATTER_FIELDS.has(key as any)) {
        const value = parsed[key];
        if (value !== null && value !== undefined) {
          // Convert value to string representation
          let valueStr: string;
          if (Array.isArray(value)) {
            valueStr = value.join(' ');
          } else if (typeof value === 'object') {
            valueStr = JSON.stringify(value);
          } else {
            valueStr = String(value);
          }
          // Include field name with prefix and value for better searchability
          // Format: "field:keyname value" allows searching by value and field name prefix
          customFields.push(`field:${key} ${valueStr}`);
        }
      }
    }
    
    return customFields.length > 0 ? ` ${customFields.join(' ')}` : '';
  }

  async createMemory(params: {
    title: string;
    content: string;
    tags?: string[];
    category?: string;
    sources?: string[];
    abstract?: string;
    template?: Record<string, unknown>;
  }): Promise<Memory> {
    await this.initialize();
    const id = uuidv4();
    const category = params.category || "general";
    const tags = params.tags || [];
    const sources = params.sources || [];
    const abstract = params.abstract;

    const { filePath } = await this.fileService.writeMemoryFile({
      id,
      title: params.title,
      content: params.content,
      tags,
      category,
      sources,
      abstract,
      template: params.template,
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
      abstract: parsed.abstract,
      file_path: filePath,
    };

    // Create searchable text from custom template fields
    const customFieldsText = this.createSearchableCustomFieldsText(parsed);
    
    // Extract only the fields needed for indexing
    // Include custom fields in the content for searchability
    const indexData: MemoryIndexDocument = {
      id: memory.id,
      title: memory.title,
      content: memory.content + customFieldsText, // Append custom fields as searchable text
      tags: memory.tags,
      category: memory.category,
      created_at: memory.created_at,
      updated_at: memory.updated_at,
      last_reviewed: memory.last_reviewed,
      links: memory.links,
      sources: memory.sources,
      abstract: memory.abstract,
    };
    
    // Add any custom fields that might be present (MemoryIndexDocument supports [key: string]: any)
    // Use type-safe approach: collect custom fields first, then assign
    const customFields: Record<string, unknown> = {};
    for (const key in parsed) {
      if (!KNOWN_FRONTMATTER_FIELDS.has(key as any)) {
        customFields[key] = parsed[key];
      }
    }
    // Assign custom fields to indexData (MemoryIndexDocument supports index signature)
    Object.assign(indexData, customFields);
    
    await this.searchService.indexMemory(indexData);

    return memory;
  }

  async readMemory(identifier: { id?: string; title?: string }): Promise<Memory & Record<string, unknown> | null> {
    await this.initialize();
    const { id, title } = identifier;
    let parsed: any = null;
    if (id) parsed = await this.fileService.readMemoryFileById(id);
    if (!parsed && title) parsed = await this.fileService.readMemoryFileByTitle(title);
    if (!parsed) return null;

    // Extract known Memory fields
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
      abstract: parsed.abstract,
      file_path: parsed.file_path,
    };

    // Preserve all custom fields that aren't in the Memory interface
    const result: Memory & Record<string, unknown> = { ...memory };
    for (const key in parsed) {
      if (!KNOWN_FRONTMATTER_FIELDS.has(key as any)) {
        result[key] = parsed[key];
      }
    }

    return result;
  }

  async getAllMemories(): Promise<Memory[]> {
    await this.initialize();
    const files = await this.fileService.listAllMemoryFiles();
    const memories: Memory[] = [];
    for (const filePath of files) {
      const parsed = parseMemoryFilePath(filePath);
      if (!parsed) continue;
      
      try {
        const mem = await this.readMemory({ id: parsed.id });
        if (mem) memories.push(mem);
      } catch (error) {
        console.error(`Failed to read memory from ${filePath} (ID: ${parsed.id}):`, error);
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
    link_mismatches: Array<{
      id: string;
      title: string;
      missing_in_markdown: string[];
      missing_in_yaml: string[];
      yaml_link_count: number;
      markdown_link_count: number;
    }>;
    invalid_links: Array<{
      id: string;
      title: string;
      invalid_links: Array<{
        link: string;
        type: 'broken-obsidian' | 'invalid-format' | 'orphaned-link';
        details: string;
      }>;
    }>;
    memories_without_sources: Array<{
      id: string;
      title: string;
    }>;
    memories_without_abstract: Array<{
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
        link_mismatches: [],
        invalid_links: [],
        memories_without_sources: [],
        memories_without_abstract: [],
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

    // Detect link mismatches between YAML frontmatter and markdown content
    const linkMismatches: Array<{
      id: string;
      title: string;
      missing_in_markdown: string[];
      missing_in_yaml: string[];
      yaml_link_count: number;
      markdown_link_count: number;
    }> = [];
    
    for (const memory of allMemories) {
      const mismatch = this.detectLinkMismatches(memory, allMemories);
      if (mismatch.hasMismatch) {
        linkMismatches.push({
          id: memory.id,
          title: memory.title,
          missing_in_markdown: mismatch.missingInMarkdown,
          missing_in_yaml: mismatch.missingInYaml,
          yaml_link_count: mismatch.yamlLinks.length,
          markdown_link_count: mismatch.markdownLinks.length
        });
      }
    }

    // Detect invalid links (not HTTP or valid Obsidian links)
    const invalidLinks: Array<{
      id: string;
      title: string;
      invalid_links: Array<{
        link: string;
        type: 'broken-obsidian' | 'invalid-format' | 'orphaned-link';
        details: string;
      }>;
    }> = [];
    
    for (const memory of allMemories) {
      const invalid = this.detectInvalidLinks(memory, allMemories);
      if (invalid.hasInvalidLinks) {
        invalidLinks.push({
          id: memory.id,
          title: memory.title,
          invalid_links: invalid.invalidLinks
        });
      }
    }

    // Find memories without sources
    const memoriesWithoutSources = allMemories
      .filter(memory => memory.sources.length === 0)
      .map(memory => ({
        id: memory.id,
        title: memory.title
      }));

    // Find memories without abstract
    const memoriesWithoutAbstract = allMemories
      .filter(memory => !memory.abstract || memory.abstract.trim().length === 0)
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
    if (linkMismatches.length > 0) {
      recommendations.push(`Fix ${linkMismatches.length} link mismatches between YAML frontmatter and markdown content.`);
    }
    if (invalidLinks.length > 0) {
      recommendations.push(`Fix ${invalidLinks.length} memories with invalid links (not HTTP or valid Obsidian links).`);
    }
    if (memoriesWithoutSources.length > 0) {
      recommendations.push(`Add sources to ${memoriesWithoutSources.length} memories to improve traceability.`);
    }
    if (memoriesWithoutAbstract.length > 0) {
      recommendations.push(`Add abstracts to ${memoriesWithoutAbstract.length} memories to improve searchability and summaries.`);
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
      link_mismatches: linkMismatches,
      invalid_links: invalidLinks,
      memories_without_sources: memoriesWithoutSources,
      memories_without_abstract: memoriesWithoutAbstract,
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

  async updateMemory(
    params: MemoryUpdateRequest,
    template?: Record<string, unknown>
  ): Promise<Memory> {
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
    if (updates.abstract !== undefined) frontmatterUpdates.abstract = updates.abstract;
    frontmatterUpdates.updated_at = new Date().toISOString();

    // Update the file with potential renaming and wiki-style link updates
    const { newFilePath: _newFilePath, updatedLinkedMemories } = await this.fileService.updateMemoryFileWithRename(
      existing.file_path,
      frontmatterUpdates,
      id,
      updates.content,
      template
    );

    // Log information about wiki-style link updates if any occurred
    if (updatedLinkedMemories.length > 0) {
      console.log(`Updated wiki-style links in ${updatedLinkedMemories.length} linked memories:`, updatedLinkedMemories);
    }

    // Re-read the updated memory
    const updated = await this.readMemory({ id });
    if (!updated) {
      throw new Error("Failed to read updated memory");
    }

    // Read the raw parsed file to get all frontmatter fields including custom template fields
    const parsed = await this.fileService.readMemoryFileById(id);
    if (!parsed) {
      throw new Error("Failed to read memory file after update");
    }

    // Create searchable text from custom template fields
    const customFieldsText = this.createSearchableCustomFieldsText(parsed);

    // Update search index - extract only the fields needed for indexing
    // Include custom fields in the content for searchability
    const indexData: MemoryIndexDocument = {
      id: updated.id,
      title: updated.title,
      content: updated.content + customFieldsText, // Append custom fields as searchable text
      tags: updated.tags,
      category: updated.category,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      last_reviewed: updated.last_reviewed,
      links: updated.links,
      sources: updated.sources,
      abstract: updated.abstract,
    };
    
    // Add any custom fields that might be present (MemoryIndexDocument supports [key: string]: any)
    // Use type-safe approach: collect custom fields first, then assign
    const customFields: Record<string, unknown> = {};
    for (const key in parsed) {
      if (!KNOWN_FRONTMATTER_FIELDS.has(key as any)) {
        customFields[key] = parsed[key];
      }
    }
    // Assign custom fields to indexData (MemoryIndexDocument supports index signature)
    Object.assign(indexData, customFields);
    
    await this.searchService.indexMemory(indexData);

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
      abstract?: string;
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
    const { source_id, target_id, link_text } = params;

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
    await this.linkService.linkMemories({ id: source_id }, { id: target_id }, link_text);

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
      const parsed = parseMemoryFilePath(filePath);
      if (!parsed) continue;
      
      try {
        const memory = await this.readMemory({ id: parsed.id });
        if (!memory) continue;
        
        // Read the raw parsed file to get all frontmatter fields including custom template fields
        const parsedFile = await this.fileService.readMemoryFileById(parsed.id);
        if (!parsedFile) continue;
        
        // Create searchable text from custom template fields
        const customFieldsText = this.createSearchableCustomFieldsText(parsedFile);
        
        // Extract only the fields needed for indexing
        // Include custom fields in the content for searchability
        const indexData: MemoryIndexDocument = {
          id: memory.id,
          title: memory.title,
          content: memory.content + customFieldsText, // Append custom fields as searchable text
          tags: memory.tags,
          category: memory.category,
          created_at: memory.created_at,
          updated_at: memory.updated_at,
          last_reviewed: memory.last_reviewed,
          links: memory.links,
          sources: memory.sources,
          abstract: memory.abstract,
        };
        
        // Add any custom fields that might be present (MemoryIndexDocument supports [key: string]: any)
        for (const key in parsedFile) {
          if (!KNOWN_FRONTMATTER_FIELDS.has(key as any)) {
            (indexData as any)[key] = parsedFile[key];
          }
        }
        
        await this.searchService.indexMemory(indexData);
        
        indexedCount++;
      } catch (error) {
        console.error(`Failed to reindex memory from ${filePath} (ID: ${parsed.id}):`, error);
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
      const parsed = parseMemoryFilePath(filePath);
      if (!parsed) continue;
      
      try {
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
        console.error(`Failed to check memory from ${filePath} (ID: ${parsed.id}):`, error);
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

  /**
   * Detects link mismatches between YAML frontmatter and markdown content
   */
  private detectLinkMismatches(memory: Memory, allMemories: Memory[]): {
    hasMismatch: boolean;
    yamlLinks: string[];
    markdownLinks: string[];
    missingInMarkdown: string[];
    missingInYaml: string[];
  } {
    const yamlLinks = memory.links;
    
    // Extract Obsidian links from markdown content using regex
    // Format: [[(CATEGORY)(title)(ID)|display text]] or [[(CATEGORY)(title)(ID)]]
    const obsidianLinkRegex = /\[\[\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)(?:\|([^\]]+))?\]\]/g;
    const markdownLinks: string[] = [];
    const matches = memory.content.match(obsidianLinkRegex);
    
    if (matches) {
      for (const match of matches) {
        // Extract the memory ID from the third group (ID)
        const idMatch = match.match(/\[\[\([^)]+\)\([^)]+\)\(([^)]+)\)/);
        if (idMatch && idMatch[1]) {
          const memoryId = idMatch[1];
          // Verify the memory ID exists
          const linkedMemory = allMemories.find(m => m.id === memoryId);
          if (linkedMemory) {
            markdownLinks.push(memoryId);
          }
        }
      }
    }
    
    // Find links that are in YAML but not in markdown
    const missingInMarkdown = yamlLinks.filter(linkId => !markdownLinks.includes(linkId));
    
    // Find links that are in markdown but not in YAML
    const missingInYaml = markdownLinks.filter(linkId => !yamlLinks.includes(linkId));
    
    const hasMismatch = missingInMarkdown.length > 0 || missingInYaml.length > 0;
    
    return {
      hasMismatch,
      yamlLinks,
      markdownLinks,
      missingInMarkdown,
      missingInYaml
    };
  }

  /**
   * Detects invalid links that aren't HTTP links or valid Obsidian links
   */
  private detectInvalidLinks(memory: Memory, allMemories: Memory[]): {
    hasInvalidLinks: boolean;
    invalidLinks: Array<{
      link: string;
      type: 'broken-obsidian' | 'invalid-format' | 'orphaned-link';
      details: string;
    }>;
  } {
    const invalidLinks: Array<{
      link: string;
      type: 'broken-obsidian' | 'invalid-format' | 'orphaned-link';
      details: string;
    }> = [];
    
    // Check YAML frontmatter links
    for (const linkId of memory.links) {
      const linkedMemory = allMemories.find(m => m.id === linkId);
      if (!linkedMemory) {
        invalidLinks.push({
          link: linkId,
          type: 'orphaned-link',
          details: 'Link ID does not correspond to any existing memory'
        });
      }
    }
    
    // Check markdown content for invalid Obsidian links
    // Format: [[(CATEGORY)(title)(ID)|display text]] or [[(CATEGORY)(title)(ID)]]
    const obsidianLinkRegex = /\[\[\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)(?:\|([^\]]+))?\]\]/g;
    let match;
    
    // Use exec() in a loop to get all matches with capture groups
    while ((match = obsidianLinkRegex.exec(memory.content)) !== null) {
      // Extract the memory ID from the third group (ID)
      if (match[3]) { // Index 3 is the third capture group (ID)
        const memoryId = match[3];
        // Check if it's a valid Obsidian link to an existing memory
        const linkedMemory = allMemories.find(m => m.id === memoryId);
        
        if (!linkedMemory) {
          invalidLinks.push({
            link: match[0], // Full match
            type: 'broken-obsidian',
            details: 'Obsidian link does not point to an existing memory and is not an HTTP link'
          });
        }
      }
    }
    
    // Also check for simple [[text]] format links that might be legacy or invalid
    // But only if they weren't already handled by the structured format above
    const simpleObsidianLinkRegex = /\[\[([^\]]+)\]\]/g;
    const simpleMatches = memory.content.match(simpleObsidianLinkRegex);
    
    if (simpleMatches) {
      for (const match of simpleMatches) {
        const linkText = match.slice(2, -2);
        
        // Check if this is a structured link that was already processed
        const isStructuredLink = /^\[\[\([^)]+\)\([^)]+\)\([^)]+\)(?:\|[^\]]+)?\]\]$/.test(match);
        
        if (!isStructuredLink) {
          // Check if it's a valid Obsidian link to an existing memory by title
          const linkedMemory = allMemories.find(m => m.title === linkText);
          
          if (!linkedMemory) {
            // Check if it's an HTTP link
            const httpRegex = /^https?:\/\/.+/;
            if (!httpRegex.test(linkText)) {
              invalidLinks.push({
                link: match,
                type: 'broken-obsidian',
                details: 'Simple Obsidian link does not point to an existing memory and is not an HTTP link'
              });
            }
          }
        }
      }
    }
    
    // Check for other invalid link formats
    const invalidLinkFormats = [
      /\[\[[^\]]*\]\[[^\]]*\]\]/, // [[text][url]] format (not supported)
      /\[[^\]]+\]\([^)]+\)/, // Markdown link format (not supported)
      /<a[^>]*href[^>]*>/, // HTML anchor tags (not supported)
    ];
    
    for (const format of invalidLinkFormats) {
      const matches = memory.content.match(format);
      if (matches) {
        for (const match of matches) {
          invalidLinks.push({
            link: match,
            type: 'invalid-format',
            details: 'Link format is not supported in this memory system'
          });
        }
      }
    }
    
    return {
      hasInvalidLinks: invalidLinks.length > 0,
      invalidLinks
    };
  }

  /**
   * Properly destroys and cleans up all resources.
   * This method should be called before disposing of the MemoryService instance.
   * 
   * @throws Error if cleanup fails
   */
  async destroy(): Promise<void> {
    try {
      // Destroy the search service to release FlexSearch resources
      if (this.searchService) {
        await this.searchService.destroy();
      }
      
      // Destroy the link service if it has cleanup methods
      if (this.linkService && typeof (this.linkService as any).destroy === 'function') {
        await (this.linkService as any).destroy();
      }
      
      // Destroy the file service if it has cleanup methods
      if (this.fileService && typeof (this.fileService as any).destroy === 'function') {
        await (this.fileService as any).destroy();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to destroy MemoryService: ${errorMessage}`);
    }
  }
}

