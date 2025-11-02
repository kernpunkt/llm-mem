import { MemoryService } from "../memory/memory-service.js";
import { SearchMemParams, SearchMemResult } from "./types.js";
import { validateCategory, validateTags } from "./validators.js";
import { formatSearchResults } from "./formatters.js";

/**
 * Searches memories using full-text search with optional filters
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - Search parameters
 * @returns Search results
 */
export async function searchMem(
  memoryService: MemoryService,
  params: SearchMemParams
): Promise<SearchMemResult> {
  const { query, limit = 10, category, tags } = params;
  
  try {
    // Validate category and tags against allowed values
    validateCategory(category);
    validateTags(tags);
    
    const searchParams: any = { query, limit };
    if (category) searchParams.category = category;
    if (tags) searchParams.tags = tags;

    const results = await memoryService.searchMemories(searchParams);
    
    return {
      total: results.total,
      results: results.results,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`search_mem failed: ${msg}`);
  }
}

