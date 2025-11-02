import { MemoryService } from "../memory/memory-service.js";
import { ReadMemParams, ReadMemResult } from "./types.js";
import { formatMemory } from "./formatters.js";

/**
 * Reads a memory by ID or title
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - Read parameters
 * @returns Read result with formatted memory
 */
export async function readMem(
  memoryService: MemoryService,
  params: ReadMemParams
): Promise<ReadMemResult> {
  const { identifier, format = "markdown" } = params;
  
  try {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Determine if identifier is UUID or title
    const memory = await memoryService.readMemory(
      uuidPattern.test(identifier) ? { id: identifier } : { title: identifier }
    );
    
    if (!memory) {
      return {
        memory: null,
        formatted: `Memory not found: ${identifier}`,
        isError: true
      };
    }

    return {
      memory,
      formatted: formatMemory(memory, format),
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`read_mem failed: ${msg}`);
  }
}

