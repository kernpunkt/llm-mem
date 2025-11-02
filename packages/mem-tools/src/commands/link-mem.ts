import { MemoryService } from "@llm-mem/shared";
import { linkMem } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute link-mem command
 */
export async function executeLinkMem(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const sourceId = args["source-id"] as string | undefined || args.source_id as string | undefined;
  const targetId = args["target-id"] as string | undefined || args.target_id as string | undefined;
  const linkText = args["link-text"] as string | undefined || args.link_text as string | undefined;
  
  if (!sourceId || !targetId) {
    console.error("Error: --source-id and --target-id are required");
    return { exitCode: 1 };
  }
  
  try {
    const result = await linkMem(memoryService, { 
      source_id: sourceId, 
      target_id: targetId, 
      link_text: linkText 
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

