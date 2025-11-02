import { MemoryService } from "../memory/memory-service.js";
import { NeedsReviewParams, NeedsReviewResult } from "./types.js";

/**
 * Returns all memories that need review before a specified date
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - Review parameters
 * @returns Memories needing review
 */
export async function needsReview(
  memoryService: MemoryService,
  params: NeedsReviewParams
): Promise<NeedsReviewResult> {
  const { date } = params;
  
  try {
    const result = await memoryService.getMemoriesNeedingReview(date);
    
    return {
      total: result.total,
      memories: result.memories,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`needs_review failed: ${msg}`);
  }
}

