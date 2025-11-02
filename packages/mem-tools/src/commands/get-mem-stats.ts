import { MemoryService } from "@llm-mem/shared";
import { getMemStats } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute get-mem-stats command
 */
export async function executeGetMemStats(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  try {
    const result = await getMemStats(memoryService);
    
    if (args.json) {
      // Return raw stats without formatted field for JSON
      const { formatted, isError, ...stats } = result;
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log(result.formatted);
    }
    
    return { exitCode: result.isError ? 1 : 0 };
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1 };
  }
}

