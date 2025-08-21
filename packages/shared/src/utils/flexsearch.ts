import { Document } from "flexsearch";
import Database from "flexsearch/db/sqlite";
import { promises as fs } from "fs";
import { join } from "path";
import { parseFlexSearchConfig, createEncoderConfig, createIndexConfig } from "./flexsearch-config.js";

/**
 * FlexSearch index configuration and management utilities.
 * Handles full-text search indexing for memory management system using SQLite.
 */

export interface MemoryIndexDocument {
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
  [key: string]: any; // Add index signature for FlexSearch compatibility
}

export interface SearchResult {
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
}

/**
 * FlexSearch index manager for memory search operations using SQLite.
 */
export class FlexSearchManager {
  private documentIndex: Document<MemoryIndexDocument>;
  private db: Database;
  private indexPath: string;
  private isInitialized: boolean = false;
  private config: ReturnType<typeof parseFlexSearchConfig>;
  private originalCwd: string;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
    this.config = parseFlexSearchConfig();
    
    // Store the current working directory
    this.originalCwd = process.cwd();
    
    // Create SQLite database instance with just the name
    // FlexSearch will create it in the current working directory
    this.db = new Database("memory-store");
    
    // Create FlexSearch configuration with stopwords and environment settings
    const flexSearchConfig = {
      id: "id",
      index: [
        "title",
        "content", 
        "tags",
        "tags_index",
        "category"
      ],
      store: [
        "id",
        "title",
        "content",
        "tags", 
        "category",
        "created_at",
        "updated_at",
        "last_reviewed",
        "links",
        "sources"
      ],
      // Apply configuration from environment variables
      ...createIndexConfig(this.config),
      // Apply encoder configuration
      encoder: createEncoderConfig(this.config),
    };
    
    // Initialize FlexSearch document index with configuration
    this.documentIndex = new Document(flexSearchConfig);
  }

  /**
   * Initializes the FlexSearch indexes and loads existing data.
   * 
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    try {
      // Log the database path for debugging (use stderr to avoid interfering with MCP protocol)
      console.error(`FlexSearch database will be created as: memory-store in current directory`);
      console.error(`Index path configured as: ${this.indexPath}`);
      
      // Ensure index directory exists
      await fs.mkdir(this.indexPath, { recursive: true });
      
      // Change to the index directory before mounting the database
      // This ensures the SQLite file is created in the right location
      process.chdir(this.indexPath);
      
      // Mount the database to the index
      await this.documentIndex.mount(this.db);
      
      // Restore the original working directory
      process.chdir(this.originalCwd);
      
      this.isInitialized = true;
      
      // Log configuration for debugging (use stderr to avoid interfering with MCP protocol)
      console.error("FlexSearch initialized with configuration:", {
        indexPath: this.indexPath,
        databasePath: join(this.indexPath, "memory-store.sqlite"),
        tokenize: this.config.tokenize,
        resolution: this.config.resolution,
        depth: this.config.depth,
        suggest: this.config.suggest,
        charset: this.config.charset,
        stopwordsCount: this.config.stopwords.length,
        context: this.config.context,
        minLength: this.config.minLength,
        maxLength: this.config.maxLength,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize FlexSearch indexes: ${errorMessage}`);
    }
  }

  /**
   * Adds or updates a memory document in the search index.
   * 
   * @param memory - Memory document to index
   * @throws Error if indexing fails
   */
  async indexMemory(memory: MemoryIndexDocument): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("FlexSearch indexes not initialized. Call initialize() first.");
    }

    try {
      // Prepare an indexable document: keep original tags for store, add tags_index for searching
      const tagsIndex = Array.isArray(memory.tags) ? memory.tags.join(" ") : String((memory as any).tags ?? "");
      const indexable: MemoryIndexDocument & { tags_index: string } = {
        ...(memory as any),
        tags_index: tagsIndex
      };
      // Add to document index (automatically committed to SQLite)
      await this.documentIndex.add(indexable as any);
      
      // Optionally wait for commit to complete
      await this.documentIndex.commit();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to index memory ${memory.id}: ${errorMessage}`);
    }
  }

  /**
   * Removes a memory document from the search index.
   * 
   * @param memoryId - ID of the memory to remove
   * @throws Error if removal fails
   */
  async removeMemory(memoryId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("FlexSearch indexes not initialized. Call initialize() first.");
    }

    try {
      // Remove from document index (automatically committed to SQLite)
      await this.documentIndex.remove(memoryId);
      
      // Optionally wait for commit to complete
      await this.documentIndex.commit();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to remove memory ${memoryId}: ${errorMessage}`);
    }
  }

  /**
   * Searches for memories using full-text search with optional filters.
   * 
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results with relevance scores
   * @throws Error if search fails
   */
  async searchMemories(
    query: string,
    options: {
      limit?: number;
      category?: string;
      tags?: string[];
      searchFields?: ("title" | "content" | "tags")[];
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error("FlexSearch indexes not initialized. Call initialize() first.");
    }

    try {
      const {
        limit = 10,
        category,
        tags = [],
        searchFields
      } = options;

      // Handle empty query
      if (!query.trim()) {
        return [];
      }

      // Build search options; when fields specified, restrict index
      let indexOpt: string[] | undefined = undefined;
      if (searchFields && searchFields.length > 0) {
        const set = new Set<string>();
        for (const f of searchFields) {
          set.add(f);
          if (f === "tags") set.add("tags_index");
        }
        indexOpt = Array.from(set);
      }
      const searchOpts: any = { limit, enrich: true };
      if (indexOpt) {
        searchOpts.index = indexOpt;
      }

      // Perform search with enrichment to access docs and scores
      const searchOutput: any[] = await (this.documentIndex as any).search(query, searchOpts);

      // searchOutput is an array of { field, result: [{ id, doc, score }] }
      const byId: Map<string, { doc: MemoryIndexDocument; score: number }> = new Map();
      for (const bucket of Array.isArray(searchOutput) ? searchOutput : []) {
        if (!bucket || !Array.isArray(bucket.result)) continue;
        for (const item of bucket.result) {
          const doc: MemoryIndexDocument | undefined = (item as any)?.doc;
          const id: string | undefined = (item as any)?.id ?? (doc as any)?.id;
          const score: number = typeof (item as any)?.score === "number" ? (item as any).score : 1;
          if (!doc || !id) continue;

          // Apply category filter
          if (category && doc.category !== category) continue;
          // Apply tags filter
          if (tags.length > 0 && !tags.some(tag => Array.isArray(doc.tags) && doc.tags.includes(tag))) continue;

          const prev = byId.get(id);
          if (!prev || score > prev.score) {
            byId.set(id, { doc, score });
          }
        }
      }

      const results: SearchResult[] = Array.from(byId.values()).map(({ doc, score }) => ({
        ...doc,
        score,
        snippet: this.generateSnippet(doc.content, query)
      }));

      // Sort by score desc
      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  /**
   * Generates a text snippet highlighting the search query.
   * 
   * @param content - Full content text
   * @param query - Search query
   * @returns Highlighted snippet
   */
  private generateSnippet(content: string, query: string): string {
    const words = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find the first occurrence of any query word
    let startIndex = -1;
    let matchedWord = "";
    for (const word of words) {
      const index = contentLower.indexOf(word);
      if (index !== -1) {
        startIndex = index;
        matchedWord = word;
        break;
      }
    }
    
    if (startIndex === -1) {
      // No match found, return first 150 characters
      return content.length > 150 ? content.substring(0, 150) + "..." : content;
    }
    
    // Extract snippet around the match
    const snippetStart = Math.max(0, startIndex - 75);
    const snippetEnd = Math.min(content.length, startIndex + matchedWord.length + 75);
    let snippet = content.substring(snippetStart, snippetEnd);
    
    // Add ellipsis if needed
    if (snippetStart > 0) snippet = "..." + snippet;
    if (snippetEnd < content.length) snippet = snippet + "...";
    
    return snippet;
  }

  /**
   * Clears all indexes and removes the database.
   * 
   * @throws Error if cleanup fails
   */
  async clearIndexes(): Promise<void> {
    try {
      // Clear all contents from the database
      await this.documentIndex.clear();
      
      // Optionally destroy the entire database
      // await this.documentIndex.destroy();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to clear FlexSearch indexes: ${errorMessage}`);
    }
  }

  /**
   * Properly destroys and cleans up all resources.
   * This method should be called before disposing of the FlexSearchManager instance.
   * 
   * @throws Error if cleanup fails
   */
  async destroy(): Promise<void> {
    try {
      // Clear all indexes first
      await this.clearIndexes();
      
      // Destroy the document index to release resources
      if (this.documentIndex) {
        await this.documentIndex.destroy();
      }
      
      // Close the SQLite database connection
      if (this.db) {
        await this.db.close();
      }
      
      // Reset initialization state
      this.isInitialized = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to destroy FlexSearch manager: ${errorMessage}`);
    }
  }

  /**
   * Gets the total number of indexed documents.
   * 
   * @returns Number of indexed documents
   */
  async getIndexSize(): Promise<number> {
    try {
      // Search for all documents to count them
      // Note: This is not efficient for large datasets, but works for our use case
      const results = await this.documentIndex.search("", { limit: 1000000 });
      return results.length;
    } catch {
      return 0;
    }
  }
} 