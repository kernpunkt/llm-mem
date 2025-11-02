import { MemoryService } from "../memory/memory-service.js";
import { GetMemStatsResult } from "./types.js";
import { formatMemoryStats } from "./formatters.js";

/**
 * Gets comprehensive statistics about the memory store
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @returns Memory statistics with formatted output
 */
export async function getMemStats(
  memoryService: MemoryService
): Promise<GetMemStatsResult> {
  try {
    const stats = await memoryService.getMemoryStatistics();
    
    // Create result with formatted output
    const result: GetMemStatsResult = {
      ...stats,
      formatted: formatMemoryStats(stats as GetMemStatsResult),
      isError: false
    };
    
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`get_mem_stats failed: ${msg}`);
  }
}

