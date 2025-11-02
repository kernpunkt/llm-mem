#!/usr/bin/env node
/**
 * Main CLI entry point for mem-tools
 */

import { getConfig } from "./config.js";
import { MemoryService } from "@llm-mem/shared";
import { 
  readMem,
  searchMem,
  linkMem,
  unlinkMem,
  reindexMems,
  needsReview,
  listMems,
  getMemStats,
  fixLinks,
  formatSearchResults,
  formatMemoriesList,
  formatNeedsReview
} from "@llm-mem/shared";

// Import command handlers
import { executeReadMem } from "./commands/read-mem.js";
import { executeSearchMem } from "./commands/search-mem.js";
import { executeLinkMem } from "./commands/link-mem.js";
import { executeUnlinkMem } from "./commands/unlink-mem.js";
import { executeReindexMems } from "./commands/reindex-mems.js";
import { executeNeedsReview } from "./commands/needs-review.js";
import { executeListMems } from "./commands/list-mems.js";
import { executeGetMemStats } from "./commands/get-mem-stats.js";
import { executeFixLinks } from "./commands/fix-links.js";

export interface CliArgs {
  command?: string;
  [key: string]: string | boolean | string[] | undefined;
}

/**
 * Parses command line arguments
 */
export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  let command: string | undefined;
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (!arg.startsWith("--") && !arg.startsWith("-")) {
      // This is likely the command
      if (!command && !args.command) {
        command = arg;
        args.command = arg;
        continue;
      }
    }
    
    // Handle specific global options
    if (arg.startsWith("--config=")) {
      args.config = arg.split("=")[1];
    } else if (arg === "--config" && i + 1 < argv.length) {
      // Support --config <path> format
      args.config = argv[++i];
    } else if (arg.startsWith("--memoryStorePath=")) {
      args.memoryStorePath = arg.split("=")[1];
    } else if (arg === "--memoryStorePath" && i + 1 < argv.length) {
      // Support --memoryStorePath <path> format
      args.memoryStorePath = argv[++i];
    } else if (arg.startsWith("--indexPath=")) {
      args.indexPath = arg.split("=")[1];
    } else if (arg === "--indexPath" && i + 1 < argv.length) {
      // Support --indexPath <path> format
      args.indexPath = argv[++i];
    } else if (arg === "--json" || arg === "-j") {
      args.json = true;
    } else if (arg.startsWith("--")) {
      // Generic flag handling: --flag=value or --flag value
      const flagName = arg.slice(2);
      if (flagName.includes("=")) {
        const [key, ...valueParts] = flagName.split("=");
        args[key] = valueParts.join("=");
      } else {
        // Check if next arg is a value (not a flag)
        if (i + 1 < argv.length && !argv[i + 1].startsWith("--") && !argv[i + 1].startsWith("-")) {
          args[flagName] = argv[++i];
        } else {
          args[flagName] = true;
        }
      }
    }
  }
  
  return args;
}

/**
 * Gets usage text for the CLI
 */
export function getUsageText(): string {
  return `Usage: mem-tools <command> [options]

Commands:
  read-mem           Retrieve a memory by ID or title
  search-mem         Search memories using full-text search
  list-mems          List all memories with optional filtering
  link-mem           Create bidirectional links between memories
  unlink-mem         Remove bidirectional links between memories
  reindex-mems       Reindex all memories in the store
  needs-review       Find memories needing review before a date
  get-mem-stats      Get comprehensive memory store statistics
  fix-links          Fix and recreate link structure for a memory

Global Options:
  --config=PATH            Path to config file
  --memoryStorePath=PATH   Path to memory store
  --indexPath=PATH         Path to search index
  --json                   Output results as JSON
  --help, -h               Show this help message

Examples:
  mem-tools read-mem --identifier="memory-title"
  mem-tools search-mem --query="search terms" --limit=10
  mem-tools list-mems --category="general" --limit=20
  mem-tools get-mem-stats --json
`;
}

/**
 * Routes command to appropriate handler
 */
async function routeCommand(
  command: string,
  args: CliArgs,
  memoryService: MemoryService
): Promise<{ exitCode: number }> {
  switch (command) {
    case "read-mem":
      return executeReadMem(memoryService, args);
    case "search-mem":
      return executeSearchMem(memoryService, args);
    case "link-mem":
      return executeLinkMem(memoryService, args);
    case "unlink-mem":
      return executeUnlinkMem(memoryService, args);
    case "reindex-mems":
      return executeReindexMems(memoryService, args);
    case "needs-review":
      return executeNeedsReview(memoryService, args);
    case "list-mems":
      return executeListMems(memoryService, args);
    case "get-mem-stats":
      return executeGetMemStats(memoryService, args);
    case "fix-links":
      return executeFixLinks(memoryService, args);
    default:
      console.error(`Unknown command: ${command}`);
      console.error(`Run 'mem-tools --help' for usage information.`);
      return { exitCode: 1 };
  }
}

/**
 * Main CLI function
 */
export async function runCLI(): Promise<void> {
  const argv = process.argv.slice(2);
  
  // Handle help flag
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    console.log(getUsageText());
    process.exit(0);
  }
  
  const args = parseArgs(argv);
  const command = args.command;
  
  if (!command) {
    console.error("Error: No command specified");
    console.error(`Run 'mem-tools --help' for usage information.`);
    process.exit(1);
  }
  
  try {
    // Load configuration
    const config = await getConfig({
      config: args.config as string | undefined,
      memoryStorePath: args.memoryStorePath as string | undefined,
      indexPath: args.indexPath as string | undefined,
    });
    
    // Create memory service
    const memoryService = new MemoryService({
      notestorePath: config.memoryStorePath,
      indexPath: config.indexPath,
    });
    
    // Route and execute command
    const result = await routeCommand(command, args, memoryService);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

// Run CLI if this file is executed directly (not imported as a module)
// Only execute if this file is the entry point (when run directly with node)
// We check by comparing the file URL with the script being executed
const currentFileUrl = new URL(import.meta.url);
const scriptPath = process.argv[1];

// Only run if this file was executed directly (not imported)
// Check if the script path matches our file path
if (scriptPath && 
    (currentFileUrl.pathname === scriptPath || 
     currentFileUrl.pathname.endsWith(scriptPath) ||
     scriptPath.includes('cli.js') && currentFileUrl.pathname.includes('cli.js'))) {
  runCLI().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

