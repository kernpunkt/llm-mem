import { MemoryService } from "../memory/memory-service.js";
import { LinkMemParams, LinkMemResult } from "./types.js";

/**
 * Creates bidirectional links between two memories
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - Link parameters
 * @returns Link result message
 */
export async function linkMem(
  memoryService: MemoryService,
  params: LinkMemParams
): Promise<LinkMemResult> {
  const { source_id, target_id, link_text } = params;
  
  try {
    const result = await memoryService.linkMemories({ source_id, target_id, link_text });
    
    return {
      message: result.message,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`link_mem failed: ${msg}`);
  }
}

