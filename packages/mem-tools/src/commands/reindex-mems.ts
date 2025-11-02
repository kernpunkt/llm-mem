import { MemoryService } from "@llm-mem/shared";
import { reindexMems } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute reindex-mems command
 */
export async function executeReindexMems(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  try {
    const result = await reindexMems(memoryService);
    
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.message);
    }
    
    return { exitCode: result.isError ? 1 : 0 };
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1 };
  }
}

