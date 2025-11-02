import { MemoryService } from "@llm-mem/shared";
import { needsReview, formatNeedsReview } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute needs-review command
 */
export async function executeNeedsReview(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const date = args.date as string | undefined;
  
  if (!date) {
    console.error("Error: --date is required (ISO format, e.g., '2024-01-15T00:00:00Z')");
    return { exitCode: 1 };
  }
  
  try {
    const result = await needsReview(memoryService, { date });
    
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.total === 0) {
        console.log("No memories need review before the specified date.");
      } else {
        console.log(formatNeedsReview(result));
      }
    }
    
    return { exitCode: result.isError ? 1 : 0 };
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1 };
  }
}

