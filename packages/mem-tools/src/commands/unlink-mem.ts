import { MemoryService } from "@llm-mem/shared";
import { unlinkMem } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute unlink-mem command
 */
export async function executeUnlinkMem(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const sourceId = args["source-id"] as string | undefined || args.source_id as string | undefined;
  const targetId = args["target-id"] as string | undefined || args.target_id as string | undefined;
  
  if (!sourceId || !targetId) {
    console.error("Error: --source-id and --target-id are required");
    return { exitCode: 1 };
  }
  
  try {
    const result = await unlinkMem(memoryService, { 
      source_id: sourceId, 
      target_id: targetId 
    });
    
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

