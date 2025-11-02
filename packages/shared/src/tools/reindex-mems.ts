import { MemoryService } from "../memory/memory-service.js";
import { ReindexMemsResult } from "./types.js";

/**
 * Reindexes all memories in the store
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @returns Reindex result message
 */
export async function reindexMems(
  memoryService: MemoryService
): Promise<ReindexMemsResult> {
  try {
    const result = await memoryService.reindexMemories();
    
    return {
      message: result.message,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`reindex_mems failed: ${msg}`);
  }
}

