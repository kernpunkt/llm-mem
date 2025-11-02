import { MemoryService } from "../memory/memory-service.js";
import { UnlinkMemParams, UnlinkMemResult } from "./types.js";

/**
 * Removes bidirectional links between two memories
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - Unlink parameters
 * @returns Unlink result message
 */
export async function unlinkMem(
  memoryService: MemoryService,
  params: UnlinkMemParams
): Promise<UnlinkMemResult> {
  const { source_id, target_id } = params;
  
  try {
    const result = await memoryService.unlinkMemories({ source_id, target_id });
    
    return {
      message: result.message,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`unlink_mem failed: ${msg}`);
  }
}

