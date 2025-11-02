import { MemoryService } from "@llm-mem/shared";
import { listMems, formatMemoriesList } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute list-mems command
 */
export async function executeListMems(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const category = args.category as string | undefined;
  const tags = args.tags 
    ? (typeof args.tags === "string" ? args.tags.split(",") : args.tags as string[])
    : undefined;
  const limit = args.limit ? Number(args.limit) : 100;
  
  try {
    const result = await listMems(memoryService, { category, tags, limit });
    
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.total === 0) {
        console.log("No memories found matching your filter criteria.");
      } else {
        console.log(formatMemoriesList(result));
      }
    }
    
    return { exitCode: result.isError ? 1 : 0 };
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1 };
  }
}

