import { MemoryService } from "@llm-mem/shared";
import { fixLinks } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute fix-links command
 */
export async function executeFixLinks(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const memoryId = args["memory-id"] as string | undefined || args.memory_id as string | undefined;
  
  if (!memoryId) {
    console.error("Error: --memory-id is required");
    return { exitCode: 1 };
  }
  
  try {
    const result = await fixLinks(memoryService, { memory_id: memoryId });
    
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

