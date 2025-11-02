import { MemoryService } from "../memory/memory-service.js";
import { ListMemsParams, ListMemsResult } from "./types.js";
import { validateCategory, validateTags } from "./validators.js";

/**
 * Lists all memories with optional filtering
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - List parameters
 * @returns List of memories
 */
export async function listMems(
  memoryService: MemoryService,
  params: ListMemsParams = {}
): Promise<ListMemsResult> {
  const { category, tags, limit = 100 } = params;
  
  try {
    // Validate category and tags against allowed values
    validateCategory(category);
    validateTags(tags);
    
    const searchParams: any = { limit };
    if (category) searchParams.category = category;
    if (tags) searchParams.tags = tags;

    const results = await memoryService.listMemories(searchParams);
    
    return {
      total: results.total,
      memories: results.memories,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`list_mems failed: ${msg}`);
  }
}

