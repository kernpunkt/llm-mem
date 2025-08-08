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

  constructor(indexPath: string) {
    this.indexPath = indexPath;
    this.config = parseFlexSearchConfig();
    
    // Create SQLite database instance
    this.db = new Database("memory-store");
    
    // Create FlexSearch configuration with stopwords and environment settings
    const flexSearchConfig = {
      id: "id",
      index: [
        "title",
        "content", 
        "tags",
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
      // Ensure index directory exists
      const indexDir = join(this.indexPath, "..");
      await fs.mkdir(indexDir, { recursive: true });
      
      // Mount the database to the index
      await this.documentIndex.mount(this.db);
      
      this.isInitialized = true;
      
      // Log configuration for debugging
      console.log("FlexSearch initialized with configuration:", {
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
      // Add to document index (automatically committed to SQLite)
      await this.documentIndex.add(memory);
      
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
        tags = []
      } = options;

      // Handle empty query
      if (!query.trim()) {
        return [];
      }

      // Search the document index
      const searchResults = await this.documentIndex.search(query, { limit });
      
      // Process results
      const results: SearchResult[] = [];
      
      for (const result of searchResults) {
        if (!result.result) continue;
        
        // Get the document data
        const doc = await this.documentIndex.get(result.result[0]);
        if (!doc) continue;
        
        // Apply category filter
        if (category && doc.category !== category) {
          continue;
        }
        
        // Apply tags filter
        if (tags.length > 0 && !tags.some(tag => doc.tags.includes(tag))) {
          continue;
        }
        
        const snippet = this.generateSnippet(doc.content, query);
        
        results.push({
          ...doc,
          score: 1, // Default score since FlexSearch doesn't provide scoring in this version
          snippet
        });
      }

      // Sort by relevance score (highest first)
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