import { MemoryService } from "@llm-mem/shared";
import { readMem } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute read-mem command
 */
export async function executeReadMem(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const identifier = args.identifier as string | undefined;
  
  if (!identifier) {
    console.error("Error: --identifier is required");
    return { exitCode: 1 };
  }
  
  const format = (args.format as string) || "markdown";
  
  try {
    const result = await readMem(memoryService, { identifier, format: format as any });
    
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.formatted);
    }
    
    return { exitCode: result.isError ? 1 : 0 };
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1 };
  }
}

