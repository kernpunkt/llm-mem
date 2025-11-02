import { MemoryService } from "@llm-mem/shared";
import { searchMem, formatSearchResults } from "@llm-mem/shared";
import { CliArgs, CommandResult } from "../types.js";

/**
 * Execute search-mem command
 */
export async function executeSearchMem(
  memoryService: MemoryService,
  args: CliArgs
): Promise<CommandResult> {
  const query = args.query as string | undefined;
  
  if (!query) {
    console.error("Error: --query is required");
    return { exitCode: 1 };
  }
  
  const limit = args.limit ? Number(args.limit) : 10;
  const category = args.category as string | undefined;
  const tags = args.tags 
    ? (typeof args.tags === "string" ? args.tags.split(",") : args.tags as string[])
    : undefined;
  
  try {
    const result = await searchMem(memoryService, { query, limit, category, tags });
    
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.total === 0) {
        console.log("No memories found matching your search criteria.");
      } else {
        console.log(formatSearchResults(result));
      }
    }
    
    return { exitCode: result.isError ? 1 : 0 };
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1 };
  }
}

