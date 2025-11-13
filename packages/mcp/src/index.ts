import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { createApp, createRouter, eventHandler, readBody, toNodeListener } from "h3";
import { createServer as createHttpServer } from "http";
import { z } from "zod";
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
  formatNeedsReview,
  parseAllowedValues
} from "@llm-mem/shared";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { memoryServiceManager } from "./memory-service-manager.js";
import { loadMemoryConfig, type MemoryConfig, mergeTemplates } from "@llm-mem/shared";

// Load environment variables from .env file (quiet mode to avoid stdout interference)
config({ quiet: true });

/**
 * Gets the name prefix from environment variable if set
 * @returns The prefix with underscore separator, or empty string if not set
 */
function getNamePrefix(): string {
  const prefix = process.env.NAME_PREFIX;
  return prefix ? `${prefix}_` : '';
}

/**
 * Prefixes a name with NAME_PREFIX if set
 * @param name The base name to prefix
 * @returns The prefixed name or original name if no prefix is set
 */
function prefixName(name: string): string {
  return getNamePrefix() + name;
}

/**
 * Validation utilities for categories and tags
 * 
 * Note: Validation functions are now imported from @llm-mem/shared
 * Only parseAllowedValues is used here for the get_allowed_values tool
 */

/**
 * MCP Server Template
 * 
 * A production-ready template for building Model Context Protocol (MCP) servers
 * with TypeScript. Provides dual transport support (stdio/HTTP), example tools,
 * and follows MCP 2025-06-18 specification.
 * 
 * @fileoverview Main MCP server implementation with example tools
 * @version 1.0.0
 */

/**
 * Creates and configures a new MCP server instance with example tools.
 * 
 * This function sets up the core MCP server with enhanced capabilities and
 * demonstrates three different tool patterns:
 * - String processing (echo tool)
 * - Mathematical operations (calculate tool) 
 * - System operations (current_time tool)
 * 
 * @returns {McpServer} Configured MCP server instance ready for transport connection
 * 
 * @example
 * ```typescript
 * const server = createServer();
 * const transport = new StdioServerTransport();
 * await server.connect(transport);
 * ```
 */
export function createServer(): McpServer {
  // Enhanced capabilities per MCP 2025-06-18 specification
  const server = new McpServer({
    name: prefixName("memory-tools-mcp"),
    version: "1.0.0",
    capabilities: {
      tools: {},      // Core tool execution capability
      resources: {},  // Resource access capability (future use)
      prompts: {},    // Prompt template capability (future use)
      logging: {},    // Structured logging capability (future use)
    },
  });

  // Memory Tools - Phase 2
  server.tool(
    prefixName("get_current_date"),
    "Returns the current date/time in the requested format",
    {
      format: z.enum(["iso", "locale", "timestamp", "date_only"]).optional().describe("Date format (default: iso)")
    },
    async ({ format = "iso" }) => {
      try {
        const now = new Date();
        let output: string;
        switch (format) {
          case "iso":
            output = now.toISOString();
            break;
          case "locale":
            output = now.toLocaleString();
            break;
          case "timestamp":
            output = now.getTime().toString();
            break;
          case "date_only":
            output = now.toISOString().slice(0, 10);
            break;
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        return {
          content: [{ type: "text", text: `${output} (${tz})` }],
          isError: false
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`get_current_date failed: ${errorMessage}`);
      }
    }
  );

  server.tool(
    prefixName("write_mem"),
    "Creates a new memory as a markdown file and indexes it",
    {
      title: z.string().min(1).describe("Title of the memory"),
      content: z.string().min(1).describe("Content in markdown format"),
      tags: z.array(z.string()).default([]).describe("Tags for categorization (default: empty array)"),
      category: z.string().default("general").describe("Category for organization (default: 'general')"),
      sources: z.array(z.string()).default([]).describe("References/sources for the memory (default: empty array)"),
      abstract: z.string().optional().describe("Short abstract/summary of the memory content (recommended: 1-2 sentences)"),
      template: z.record(z.unknown()).optional().describe("Additional frontmatter fields as key-value pairs to merge into the memory's frontmatter")
    },
    async ({ title, content, tags, category, sources, abstract, template }) => {
      try {
        // Note: Validation is now handled within the shared tool functions
        // For write_mem, we validate manually since it's not yet extracted
        const { validateCategory, validateTags } = await import("@llm-mem/shared");
        validateCategory(category);
        validateTags(tags);
        
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        // Get final template by merging category template and user-provided template
        const finalTemplate = mergeTemplates(cfg.memoryConfig, category, template);
        
        const mem = await memoryService.createMemory({ title, content, tags, category, sources, abstract, template: finalTemplate });
        // Refresh tracked DB mtime after index-modifying operation
        await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        return {
          content: [{ type: "text", text: `id: ${mem.id}\nfile: ${mem.file_path}\ncreated_at: ${mem.created_at}` }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`write_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("read_mem"),
    "Retrieves a memory by ID or title with optional formatting",
    {
      identifier: z.string().min(1).describe("Memory ID or title"),
      format: z.enum(["markdown", "plain", "json"]).optional().describe("Output format")
    },
    async ({ identifier, format = "markdown" }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        const result = await readMem(memoryService, { identifier, format });
        
        return {
          content: [{ type: "text", text: result.formatted }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`read_mem failed: ${msg}`);
      }
    }
  );



  server.tool(
    prefixName("get_usage_info"),
    "Returns usage documentation and examples for all memory tools",
    {},
    async () => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories" };
        const usageFilePath = join(cfg.notestorePath, "usage.md");
        
        // Read the usage file
        const usageContent = await fs.readFile(usageFilePath, "utf-8");
        
        return {
          content: [{ type: "text", text: usageContent }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`get_usage_info failed: ${msg}`);
      }
    }
  );

  // Phase 3 Memory Tools
  server.tool(
    prefixName("edit_mem"),
    "Updates an existing memory's content, title, tags, category, sources, or abstract",
    {
      id: z.string().uuid().describe("Memory ID to edit"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content in markdown format"),
      tags: z.array(z.string()).optional().describe("New tags for categorization"),
      category: z.string().optional().describe("New category for organization"),
      sources: z.array(z.string()).optional().describe("Updated references/sources for the memory"),
      abstract: z.string().optional().describe("Updated short abstract/summary of the memory content (recommended: 1-2 sentences)"),
      template: z.record(z.unknown()).optional().describe("Additional frontmatter fields as key-value pairs to merge into the memory's frontmatter")
    },
    async ({ id, title, content, tags, category, sources, abstract, template }) => {
      try {
        // Note: Validation is now handled within the shared tool functions
        // For edit_mem, we validate manually since it's not yet extracted
        const { validateCategory, validateTags } = await import("@llm-mem/shared");
        validateCategory(category);
        validateTags(tags);
        
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        // Get the current memory to determine category for template lookup
        const existing = await memoryService.readMemory({ id });
        if (!existing) {
          throw new Error(`Memory with ID ${id} not found`);
        }
        
        // Use the new category if provided, otherwise use existing category
        const targetCategory = category !== undefined ? category : existing.category;
        
        // Get final template by merging category template and user-provided template
        const finalTemplate = mergeTemplates(cfg.memoryConfig, targetCategory, template);
        
        const updates: any = { id };
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (tags !== undefined) updates.tags = tags;
        if (category !== undefined) updates.category = category;
        if (sources !== undefined) updates.sources = sources;
        if (abstract !== undefined) updates.abstract = abstract;

        const updated = await memoryService.updateMemory(updates, finalTemplate);
        // Refresh tracked DB mtime after index-modifying operation
        await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        return {
          content: [{ 
            type: "text", 
            text: `Memory updated successfully:\nid: ${updated.id}\ntitle: ${updated.title}\nupdated_at: ${updated.updated_at}` 
          }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`edit_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("search_mem"),
    "Searches through memories using full-text search with optional filters",
    {
      query: z.string().min(1).describe("Search terms"),
      limit: z.number().int().positive().optional().default(10).describe("Maximum number of results"),
      category: z.string().optional().describe("Filter by category"),
      tags: z.array(z.string()).optional().describe("Filter by tags")
    },
    async ({ query, limit = 10, category, tags }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await searchMem(memoryService, { query, limit, category, tags });
        
        if (result.total === 0) {
          return {
            content: [{ type: "text", text: "No memories found matching your search criteria." }],
            isError: false
          };
        }

        return {
          content: [{ 
            type: "text", 
            text: formatSearchResults(result)
          }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`search_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("link_mem"),
    "Creates bidirectional links between two memories",
    {
      source_id: z.string().uuid().describe("ID of the source memory"),
      target_id: z.string().uuid().describe("ID of the target memory to link to"),
      link_text: z.string().optional().describe("Custom link text (defaults to target title)")
    },
    async ({ source_id, target_id, link_text }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await linkMem(memoryService, { source_id, target_id, link_text });
        // Refresh tracked DB mtime after index-modifying operation
        await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`link_mem failed: ${msg}`);
      }
    }
  );



  server.tool(
    prefixName("unlink_mem"),
    "Removes bidirectional links between two memories",
    {
      source_id: z.string().uuid().describe("ID of the source memory"),
      target_id: z.string().uuid().describe("ID of the target memory to unlink")
    },
    async ({ source_id, target_id }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await unlinkMem(memoryService, { source_id, target_id });
        // Refresh tracked DB mtime after index-modifying operation
        await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`unlink_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("reindex_mems"),
    "Clears the FlexSearch indexes and reindexes all documents in notestore_path",
    {},
    async () => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await reindexMems(memoryService);
        // Refresh tracked DB mtime after reindexing
        await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`reindex_mems failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("needs_review"),
    "Returns all memories that have a last_reviewed date before the given date",
    {
      date: z.string().describe("Cutoff date in ISO format (e.g., '2024-01-15T00:00:00Z')")
    },
    async ({ date }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await needsReview(memoryService, { date });
        
        if (result.total === 0) {
          return {
            content: [{ type: "text", text: "No memories need review before the specified date." }],
            isError: false
          };
        }

        return {
          content: [{ 
            type: "text", 
            text: formatNeedsReview(result)
          }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`needs_review failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("list_mems"),
    "Returns a JSON array of all memories with optional filtering by category, tags, and limit",
    {
      category: z.string().optional().describe("Filter memories by category"),
      tags: z.array(z.string()).optional().describe("Filter memories by tags (any tag match)"),
      limit: z.number().int().positive().optional().default(100).describe("Maximum number of memories to return")
    },
    async ({ category, tags, limit = 100 }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await listMems(memoryService, { category, tags, limit });
        
        if (result.total === 0) {
          return {
            content: [{ type: "text", text: "No memories found matching your filter criteria." }],
            isError: false
          };
        }

        return {
          content: [{ 
            type: "text", 
            text: formatMemoriesList(result)
          }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`list_mems failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("get_mem_stats"),
    "Returns comprehensive statistics about the memory store including counts, averages, and analysis of memory health",
    {},
    async () => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await getMemStats(memoryService);
        
        return {
          content: [{ 
            type: "text", 
            text: result.formatted
          }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`get_mem_stats failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("get_flexsearch_config"),
    "Returns the current FlexSearch configuration including stopwords and environment settings",
    {},
    async () => {
      try {
        const { parseFlexSearchConfig } = await import("@llm-mem/shared");
        const config = parseFlexSearchConfig();
        
        const configInfo = {
          tokenize: config.tokenize,
          resolution: config.resolution,
          depth: config.depth,
          threshold: config.threshold,
          limit: config.limit,
          suggest: config.suggest,
          charset: config.charset,
          language: config.language,
          stopwords: config.stopwords,
          stopwordsCount: config.stopwords.length,
          minLength: config.minLength,
          maxLength: config.maxLength,
          context: config.context,
          contextResolution: config.contextResolution,
          contextDepth: config.contextDepth,
          contextBidirectional: config.contextBidirectional,
        };
        
        return {
          content: [{ 
            type: "text", 
            text: `FlexSearch Configuration:\n\n${JSON.stringify(configInfo, null, 2)}` 
          }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`get_flexsearch_config failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("get_allowed_values"),
    "Returns the currently allowed categories and tags based on environment configuration",
    {},
    async () => {
      try {
        const allowedCategories = parseAllowedValues(process.env.ALLOWED_CATEGORIES);
        const allowedTags = parseAllowedValues(process.env.ALLOWED_TAGS);
        
        let message = "Category and Tag Restrictions:\n\n";
        
        if (allowedCategories) {
          message += `**Allowed Categories:** ${allowedCategories.join(", ")}\n`;
        } else {
          message += "**Categories:** No restrictions (any category allowed)\n";
        }
        
        if (allowedTags) {
          message += `**Allowed Tags:** ${allowedTags.join(", ")}\n`;
        } else {
          message += "**Tags:** No restrictions (any tags allowed)\n";
        }
        
        message += "\nTo set restrictions, configure ALLOWED_CATEGORIES and/or ALLOWED_TAGS environment variables with comma-separated values.";
        
        return {
          content: [{ type: "text", text: message }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`get_allowed_values failed: ${msg}`);
      }
    }
  );

  server.tool(
    prefixName("fix_links"),
    "Fixes and recreates proper link structure for a memory by cleaning up broken links and recreating valid ones",
    {
      memory_id: z.string().uuid().describe("ID of the memory to fix links for")
    },
    async ({ memory_id }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await fixLinks(memoryService, { memory_id });
        // Refresh tracked DB mtime after index-modifying operation
        await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: result.isError
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`fix_links failed: ${msg}`);
      }
    }
  );

  /**
   * TODO: Add your custom tools here
   * 
   * Follow the established pattern:
   * ```typescript
   * server.tool(
   *   "tool_name",                    // Unique identifier
   *   "Tool description",             // Human-readable description
   *   {                              // Zod parameter schema
   *     param: z.string().describe("Parameter description")
   *   },
   *   async ({ param }) => {          // Implementation function
   *     try {
   *       const result = await yourLogic(param);
   *       return {
   *         content: [{ type: "text", text: result }],
   *         isError: false
   *       };
   *     } catch (error) {
   *       throw new Error(`Tool failed: ${error.message}`);
   *     }
   *   }
   * );
   * ```
   */

  return server;
}

/**
 * Ensures the usage.md file exists in the notestore_path.
 * If it doesn't exist, copies it from the source assets directory.
 */
async function ensureUsageFileExists(notestorePath: string): Promise<void> {
  try {
    const usageFilePath = join(notestorePath, "usage.md");
    
    // Check if usage.md already exists
    try {
      await fs.access(usageFilePath);
      return; // File exists, no need to copy
    } catch {
      // File doesn't exist, need to copy it
    }

    // Ensure notestore directory exists
    await fs.mkdir(notestorePath, { recursive: true });

    // Get the source assets directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = join(__filename, "..");
    const sourceUsagePath = join(__dirname, "assets", "usage.md");

    // Copy the usage file
    await fs.copyFile(sourceUsagePath, usageFilePath);
  } catch (error) {
    console.error("Failed to ensure usage.md exists:", error);
    // Don't throw - this is not critical for server operation
  }
}

/**
 * Runs the MCP server using stdio transport for direct client integration.
 * 
 * This transport is used by MCP clients like Claude Desktop and Cursor IDE
 * for direct process communication. The server reads JSON-RPC messages from
 * stdin and writes responses to stdout.
 * 
 * Features:
 * - Direct process communication via stdin/stdout
 * - Graceful shutdown handling on SIGINT
 * - Error logging to stderr (doesn't interfere with MCP protocol)
 * 
 * @returns {Promise<void>} Promise that resolves when server starts
 * 
 * @example
 * ```bash
 * echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
 * ```
 */
export async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio"); // Use stderr to avoid interfering with protocol

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.error('Shutting down STDIO server...');
    try {
      await memoryServiceManager.destroyAll();
    } catch (error) {
      console.error(`Error during cleanup: ${error}`);
    }
    console.error('Server shutdown complete');
    process.exit(0);
  });
}

/**
 * Runs the MCP server using HTTP transport with H3 framework for debugging and standalone operation.
 * 
 * This transport provides HTTP endpoints for MCP protocol communication, useful for:
 * - Development and debugging
 * - Standalone server operation
 * - Integration testing
 * - Health monitoring
 * 
 * The implementation uses H3 (modern web framework) with key features:
 * - Smaller bundle size (~10x lighter than Express)
 * - Better performance and memory efficiency  
 * - Native edge/serverless compatibility
 * - Modern async/await patterns with eventHandler wrappers
 * 
 * Architecture:
 * - Uses H3 eventHandler for route processing
 * - Hybrid approach: streaming transport + direct JSON responses
 * - Falls back to direct tool schema responses when streaming fails
 * - Maintains full MCP protocol compatibility with modern HTTP stack
 * 
 * @param {number} [port=3000] - Port number for HTTP server
 * @returns {Promise<void>} Promise that resolves when server starts
 * 
 * @example
 * ```bash
 * # Start HTTP server
 * node dist/index.js --transport=http --port=3000
 * 
 * # Test with curl
 * curl -X POST http://localhost:3000/mcp \
 *   -H "Content-Type: application/json" \
 *   -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
 * ```
 */
export async function runHttp(port: number = 3000): Promise<void> {
  try {
    const app = createApp();
    const router = createRouter();

    /**
     * MCP Protocol POST Endpoint
     * 
     * Handles JSON-RPC 2.0 requests according to MCP specification.
     * Uses H3 eventHandler with hybrid streaming/direct response approach:
     * 
     * 1. Attempts to use StreamableHTTPServerTransport for full MCP compatibility
     * 2. Falls back to direct JSON responses for simple requests (tools/list)
     * 3. Provides inline tool schemas to avoid transport dependencies
     * 
     * Features:
     * - Server-sent events headers for streaming support
     * - MCP protocol version header (2025-06-18)
     * - Comprehensive error handling with JSON-RPC error responses
     * - Stateless operation (fresh server instance per request)
     */
    router.post('/mcp', eventHandler(async (event) => {
      const body = await readBody(event);
      console.log('Received MCP request:', body);
      
      try {
        // Set MCP protocol headers
        event.node.res.setHeader('Content-Type', 'text/event-stream');
        event.node.res.setHeader('Cache-Control', 'no-cache');
        event.node.res.setHeader('Connection', 'keep-alive');
        event.node.res.setHeader('MCP-Protocol-Version', '2025-06-18');
        
        // Handle different MCP methods directly
        if (body.method === 'initialize') {
          const response = {
            jsonrpc: '2.0',
            result: {
              protocolVersion: '2025-06-18',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
                logging: {}
              },
              serverInfo: {
                name: prefixName('memory-tools-mcp'),
                version: '1.0.0'
              }
            },
            id: body.id
          };
          
          event.node.res.write(`data: ${JSON.stringify(response)}\n\n`);
          event.node.res.end();
          return;
        }
        
        if (body.method === 'tools/list') {
          const response = {
            jsonrpc: '2.0',
            result: {
              tools: [

                {
                  name: prefixName('get_current_date'),
                  description: 'Returns the current date/time in the requested format',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      format: {
                        type: 'string',
                        enum: ['iso', 'locale', 'timestamp', 'date_only'],
                        description: 'Date format (default: iso)'
                      }
                    }
                  }
                },
                {
                  name: prefixName('write_mem'),
                  description: 'Creates a new memory as a markdown file and indexes it',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      title: {
                        type: 'string',
                        description: 'Title of the memory'
                      },
                      content: {
                        type: 'string',
                        description: 'Content in markdown format'
                      },
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags for categorization'
                      },
                      category: {
                        type: 'string',
                        description: 'Category for organization'
                      },
                      sources: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'References/sources for the memory'
                      }
                    },
                    required: ['title', 'content']
                  }
                },
                {
                  name: prefixName('read_mem'),
                  description: 'Retrieves a memory by ID or title with optional formatting',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      identifier: {
                        type: 'string',
                        description: 'Memory ID or title'
                      },
                      format: {
                        type: 'string',
                        enum: ['markdown', 'plain', 'json'],
                        description: 'Output format'
                      }
                    },
                    required: ['identifier']
                  }
                },
                {
                  name: prefixName('get_usage_info'),
                  description: 'Returns usage documentation and examples for all memory tools',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: prefixName('edit_mem'),
                  description: 'Updates an existing memory\'s content, title, tags, category, or sources',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Memory ID to edit'
                      },
                      title: {
                        type: 'string',
                        description: 'New title'
                      },
                      content: {
                        type: 'string',
                        description: 'New content in markdown format'
                      },
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'New tags for categorization'
                      },
                      category: {
                        type: 'string',
                        description: 'New category for organization'
                      },
                      sources: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Updated references/sources for the memory'
                      }
                    },
                    required: ['id']
                  }
                },
                {
                  name: prefixName('search_mem'),
                  description: 'Searches through memories using full-text search with optional filters',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Search terms'
                      },
                      limit: {
                        type: 'number',
                        description: 'Maximum number of results'
                      },
                      category: {
                        type: 'string',
                        description: 'Filter by category'
                      },
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Filter by tags'
                      }
                    },
                    required: ['query']
                  }
                },
                {
                  name: prefixName('link_mem'),
                  description: 'Creates bidirectional links between two memories',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      source_id: {
                        type: 'string',
                        description: 'ID of the source memory'
                      },
                      target_id: {
                        type: 'string',
                        description: 'ID of the target memory to link to'
                      },
                      link_text: {
                        type: 'string',
                        description: 'Custom link text (defaults to target title)'
                      }
                    },
                    required: ['source_id', 'target_id']
                  }
                },
                {
                  name: prefixName('unlink_mem'),
                  description: 'Removes bidirectional links between two memories',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      source_id: {
                        type: 'string',
                        description: 'ID of the source memory'
                      },
                      target_id: {
                        type: 'string',
                        description: 'ID of the target memory to unlink'
                      }
                    },
                    required: ['source_id', 'target_id']
                  }
                },
                {
                  name: prefixName('reindex_mems'),
                  description: 'Clears the FlexSearch indexes and reindexes all documents in notestore_path',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: prefixName('needs_review'),
                  description: 'Returns all memories that have a last_reviewed date before the given date',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      date: {
                        type: 'string',
                        description: 'Cutoff date in ISO format (e.g., \'2024-01-15T00:00:00Z\')'
                      }
                    },
                    required: ['date']
                  }
                },
                {
                  name: prefixName('list_mems'),
                  description: 'Returns a JSON array of all memories with optional filtering by category, tags, and limit',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      category: {
                        type: 'string',
                        description: 'Filter memories by category'
                      },
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Filter memories by tags (any tag match)'
                      },
                      limit: {
                        type: 'number',
                        description: 'Maximum number of memories to return'
                      }
                    }
                  }
                },
                {
                  name: prefixName('get_mem_stats'),
                  description: 'Returns comprehensive statistics about the memory store including counts, averages, and analysis of memory health',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: prefixName('get_flexsearch_config'),
                  description: 'Returns the current FlexSearch configuration including stopwords and environment settings',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: prefixName('get_allowed_values'),
                  description: 'Returns the currently allowed categories and tags based on environment configuration',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: prefixName('fix_links'),
                  description: 'Fixes and recreates proper link structure for a memory by cleaning up broken links and recreating valid ones',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      memory_id: {
                        type: 'string',
                        description: 'ID of the memory to fix links for'
                      }
                    },
                    required: ['memory_id']
                  }
                }
              ]
            },
            id: body.id
          };
          
          event.node.res.write(`data: ${JSON.stringify(response)}\n\n`);
          event.node.res.end();
          return;
        }
        
                if (body.method === 'tools/call') {
          // Handle tool execution with predefined tools
          const toolName = body.params.name;
          const toolArgs = body.params.arguments || {};
          
          // Compute prefixed tool names once for comparison
          const prefixedToolNames = {
            get_current_date: prefixName('get_current_date'),
            write_mem: prefixName('write_mem'),
            read_mem: prefixName('read_mem'),
            get_usage_info: prefixName('get_usage_info'),
            edit_mem: prefixName('edit_mem'),
            search_mem: prefixName('search_mem'),
            link_mem: prefixName('link_mem'),
            unlink_mem: prefixName('unlink_mem'),
            reindex_mems: prefixName('reindex_mems'),
            needs_review: prefixName('needs_review'),
            list_mems: prefixName('list_mems'),
            get_mem_stats: prefixName('get_mem_stats'),
            get_flexsearch_config: prefixName('get_flexsearch_config'),
            get_allowed_values: prefixName('get_allowed_values'),
            fix_links: prefixName('fix_links')
          };
          
          let toolResult: { content: Array<{ type: string; text: string }>; isError: boolean };
          
          try {
            if (toolName === prefixedToolNames.get_current_date) {
                const format = (toolArgs.format as string) || 'iso';
                const now = new Date();
                let timeString: string;
                
                switch (format) {
                  case 'iso': timeString = now.toISOString(); break;
                  case 'locale': timeString = now.toLocaleString(); break;
                  case 'timestamp': timeString = now.getTime().toString(); break;
                  case 'date_only': timeString = now.toISOString().slice(0, 10); break;
                  default: throw new Error(`Unknown format: ${format}`);
                }
                
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
                toolResult = {
                  content: [{ type: 'text', text: `${timeString} (${tz})` }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.write_mem) {
                const title = toolArgs.title as string;
                const content = toolArgs.content as string;
                const tags = (toolArgs.tags as string[]) ?? [];
                const category = (toolArgs.category as string) ?? 'general';
                const sources = (toolArgs.sources as string[]) ?? [];
                const abstract = toolArgs.abstract as string | undefined;
                const template = toolArgs.template as Record<string, unknown> | undefined;
                
                if (!title || !content) {
                  throw new Error('Missing required parameters: title and content');
                }
                
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                
                // Get final template by merging category template and user-provided template
                const finalTemplate = mergeTemplates(cfg.memoryConfig, category, template);
                
                const mem = await memoryService.createMemory({ title, content, tags, category, sources, abstract, template: finalTemplate });
                // Refresh tracked DB mtime after index-modifying operation
                await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                
                toolResult = {
                  content: [{ type: 'text', text: `id: ${mem.id}\nfile: ${mem.file_path}\ncreated_at: ${mem.created_at}` }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.read_mem) {
                const identifier = toolArgs.identifier as string;
                const format = (toolArgs.format as string) || 'markdown';
                
                if (!identifier) {
                  throw new Error('Missing required parameter: identifier');
                }
                
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const memory = await memoryService.readMemory(uuidPattern.test(identifier) ? { id: identifier } : { title: identifier });
                
                if (!memory) {
                  toolResult = {
                    content: [{ type: 'text', text: `Memory not found: ${identifier}` }],
                    isError: true
                  };
                } else if (format === 'plain') {
                  toolResult = { content: [{ type: 'text', text: memory.content }], isError: false };
                } else if (format === 'json') {
                  toolResult = { content: [{ type: 'text', text: JSON.stringify(memory, null, 2) }], isError: false };
                } else {
                  // markdown format
                  const { serializeFrontmatter } = await import('@llm-mem/shared');
                  const frontmatter = {
                    id: memory.id,
                    title: memory.title,
                    tags: memory.tags,
                    category: memory.category,
                    created_at: memory.created_at,
                    updated_at: memory.updated_at,
                    last_reviewed: memory.last_reviewed,
                    links: memory.links,
                    sources: memory.sources,
                  };
                  const markdown = serializeFrontmatter(frontmatter as any, memory.content);
                  toolResult = { content: [{ type: 'text', text: markdown }], isError: false };
                }
            } else if (toolName === prefixedToolNames.get_usage_info) {
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories" };
                const usageFilePath = join(cfg.notestorePath, "usage.md");
                
                try {
                  const usageContent = await fs.readFile(usageFilePath, "utf-8");
                  toolResult = {
                    content: [{ type: 'text', text: usageContent }],
                    isError: false
                  };
                } catch {
                  toolResult = {
                    content: [{ type: 'text', text: `Usage file not found at ${usageFilePath}. Please ensure the server has been started to create the usage file.` }],
                    isError: true
                  };
                }
            } else if (toolName === prefixedToolNames.edit_mem) {
                const id = toolArgs.id as string;
                const title = toolArgs.title as string | undefined;
                const content = toolArgs.content as string | undefined;
                const tags = toolArgs.tags as string[] | undefined;
                const category = toolArgs.category as string | undefined;
                const sources = toolArgs.sources as string[] | undefined;
                const abstract = toolArgs.abstract as string | undefined;
                const template = toolArgs.template as Record<string, unknown> | undefined;

                if (!id) {
                  throw new Error('Missing required parameter: id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                
                // Get the current memory to determine category for template lookup
                const existing = await memoryService.readMemory({ id });
                if (!existing) {
                  throw new Error(`Memory with ID ${id} not found`);
                }
                
                // Use the new category if provided, otherwise use existing category
                const targetCategory = category !== undefined ? category : existing.category;
                
                // Get final template by merging category template and user-provided template
                const finalTemplate = mergeTemplates(cfg.memoryConfig, targetCategory, template);
                
                const updates: any = { id };
                if (title !== undefined) updates.title = title;
                if (content !== undefined) updates.content = content;
                if (tags !== undefined) updates.tags = tags;
                if (category !== undefined) updates.category = category;
                if (sources !== undefined) updates.sources = sources;
                if (abstract !== undefined) updates.abstract = abstract;
                
                const updated = await memoryService.updateMemory(updates, finalTemplate);
                // Refresh tracked DB mtime after index-modifying operation
                await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });

                toolResult = {
                  content: [{ 
                    type: 'text', 
                    text: `Memory updated successfully:\nid: ${updated.id}\ntitle: ${updated.title}\nupdated_at: ${updated.updated_at}` 
                  }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.search_mem) {
                const query = toolArgs.query as string;
                const limit = toolArgs.limit as number || 10;
                const category = toolArgs.category as string;
                const tags = toolArgs.tags as string[];

                if (!query) {
                  throw new Error('Missing required parameter: query');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const results = await memoryService.searchMemories({ query, limit, category, tags });

                if (results.total === 0) {
                  toolResult = {
                    content: [{ type: 'text', text: "No memories found matching your search criteria." }],
                    isError: false
                  };
                } else {
                  const formattedResults = results.results.map((result, index) => {
                    const tagsStr = result.tags.length > 0 ? ` [${result.tags.join(", ")}]` : "";
                    const categoryStr = result.category !== "general" ? ` (${result.category})` : "";
                    const abstractStr = result.abstract ? `\n   Abstract: ${result.abstract}` : "";
                    return `${index + 1}. **${result.title}**${categoryStr}${tagsStr}${abstractStr}\n   Score: ${result.score.toFixed(2)}\n   ${result.snippet}\n   ID: ${result.id}\n`;
                  }).join("\n");
                  toolResult = {
                    content: [{ 
                      type: 'text', 
                      text: `Found ${results.total} memory(ies):\n\n${formattedResults}` 
                    }],
                    isError: false
                  };
                }
            } else if (toolName === prefixedToolNames.link_mem) {
                const source_id = toolArgs.source_id as string;
                const target_id = toolArgs.target_id as string;
                const link_text = toolArgs.link_text as string;

                if (!source_id || !target_id) {
                  throw new Error('Missing required parameters: source_id and target_id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.linkMemories({ source_id, target_id, link_text });
                // Refresh tracked DB mtime after index-modifying operation
                await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });

                toolResult = {
                  content: [{ type: 'text', text: result.message }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.unlink_mem) {
                const source_id = toolArgs.source_id as string;
                const target_id = toolArgs.target_id as string;

                if (!source_id || !target_id) {
                  throw new Error('Missing required parameters: source_id and target_id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.unlinkMemories({ source_id, target_id });
                // Refresh tracked DB mtime after index-modifying operation
                await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });

                toolResult = {
                  content: [{ type: 'text', text: result.message }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.reindex_mems) {
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.reindexMemories();
                // Refresh tracked DB mtime after reindexing
                await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });

                toolResult = {
                  content: [{ type: 'text', text: result.message }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.needs_review) {
                const date = toolArgs.date as string;
                if (!date) {
                  throw new Error('Missing required parameter: date');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.getMemoriesNeedingReview(date);

                if (result.total === 0) {
                  toolResult = {
                    content: [{ type: 'text', text: "No memories need review before the specified date." }],
                    isError: false
                  };
                } else {
                  const formattedResults = result.memories.map((memory: any, index: number) => {
                    const tagsStr = memory.tags.length > 0 ? ` [${memory.tags.join(", ")}]` : "";
                    const categoryStr = memory.category !== "general" ? ` (${memory.category})` : "";
                    return `${index + 1}. **${memory.title}**${categoryStr}${tagsStr}\n   Last reviewed: ${memory.last_reviewed}\n   Created: ${memory.created_at}\n   ID: ${memory.id}\n`;
                  }).join("\n");

                  toolResult = {
                    content: [{ 
                      type: 'text', 
                      text: `Found ${result.total} memory(ies) needing review:\n\n${formattedResults}` 
                    }],
                    isError: false
                  };
                }
            } else if (toolName === prefixedToolNames.list_mems) {
                const category = toolArgs.category as string;
                const tags = toolArgs.tags as string[];
                const limit = toolArgs.limit as number || 100;

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const results = await memoryService.listMemories({ limit, category, tags });

                if (results.total === 0) {
                  toolResult = {
                    content: [{ type: 'text', text: "No memories found matching your filter criteria." }],
                    isError: false
                  };
                } else {
                  const formattedResults = results.memories.map((memory: any, index: number) => {
                    const tagsStr = memory.tags.length > 0 ? ` [${memory.tags.join(", ")}]` : "";
                    const categoryStr = memory.category !== "general" ? ` (${memory.category})` : "";
                    const sourcesStr = memory.sources.length > 0 ? `\n   Sources: ${memory.sources.join(", ")}` : "";
                    const linksStr = memory.links.length > 0 ? `\n   Links: ${memory.links.length} linked memories` : "";
                    return `${index + 1}. **${memory.title}**${categoryStr}${tagsStr}${sourcesStr}${linksStr}\n   Created: ${memory.created_at}\n   Updated: ${memory.updated_at}\n   Last reviewed: ${memory.last_reviewed}\n   ID: ${memory.id}\n`;
                  }).join("\n");
                  toolResult = {
                    content: [{ 
                      type: 'text', 
                      text: `Found ${results.total} memory(ies):\n\n${formattedResults}` 
                    }],
                    isError: false
                  };
                }
            } else if (toolName === prefixedToolNames.get_mem_stats) {
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const stats = await memoryService.getMemoryStatistics();

                const formattedStats = `Memory Store Statistics:

📊 **Overview**
- Total Memories: ${stats.total_memories}
- Average Time Since Last Verification: ${stats.average_time_since_verification}
- Average Links per Memory: ${stats.average_links_per_memory}
- Average Tags per Memory: ${stats.average_tags_per_memory}
- Average Memory Length: ${stats.average_memory_length_words} words

🔗 **Link Analysis**
- Orphaned Memories (no links): ${stats.orphaned_memories.length}
- Memories with Few Links: ${stats.memories_with_few_links.length}
- Broken Links: ${stats.broken_links.length}
- Unidirectional Links: ${stats.unidirectional_links.length}
- Link Mismatches (YAML vs Markdown): ${stats.link_mismatches.length}
- Invalid Links: ${stats.invalid_links.length}

${stats.orphaned_memories.length > 0 ? `\n📋 **Orphaned Memories (No Links):**
${stats.orphaned_memories.map(m => `  - ${m.title} (ID: ${m.id})`).join('\n')}` : ''}

${stats.memories_with_few_links.length > 0 ? `\n📋 **Memories with Few Links (< ${stats.average_links_per_memory}):**
${stats.memories_with_few_links.map(m => `  - ${m.title} (ID: ${m.id}, ${m.link_count} links)`).join('\n')}` : ''}

${stats.broken_links.length > 0 ? `\n📋 **Broken Links:**
${stats.broken_links.map(m => `  - ${m.title} (ID: ${m.id}) → broken link ID: ${m.broken_link_id}`).join('\n')}` : ''}

${stats.unidirectional_links.length > 0 ? `\n📋 **Unidirectional Links:**
${stats.unidirectional_links.map(m => `  - ${m.title} (ID: ${m.id}) → unidirectional link to: ${m.unidirectional_link_id}`).join('\n')}` : ''}

${stats.link_mismatches.length > 0 ? `\n📋 **Link Mismatches (YAML vs Markdown):**
${stats.link_mismatches.map(m => `  - ${m.title} (ID: ${m.id}):
    YAML links: ${m.yaml_link_count}, Markdown links: ${m.markdown_link_count}
    Missing in markdown: ${m.missing_in_markdown.length > 0 ? m.missing_in_markdown.join(', ') : 'none'}
    Missing in YAML: ${m.missing_in_yaml.length > 0 ? m.missing_in_yaml.join(', ') : 'none'}`).join('\n')}` : ''}

${stats.invalid_links.length > 0 ? `\n📋 **Invalid Links:**
${stats.invalid_links.map(m => `  - ${m.title} (ID: ${m.id}):
${m.invalid_links.map(il => `    • ${il.link} (${il.type}): ${il.details}`).join('\n')}`).join('\n')}` : ''}

📁 **Category Distribution**
${Object.entries(stats.categories).map(([cat, count]) => `  - ${cat}: ${count}`).join('\n')}

🏷️ **Tag Usage**
${Object.entries(stats.tags).map(([tag, count]) => `  - ${tag}: ${count} uses`).join('\n')}

📝 **Content Analysis**
- Shortest Memories (10%): ${stats.shortest_memories.length}
- Longest Memories (10%): ${stats.longest_memories.length}

⚠️ **Memories Needing Attention**
- Without Sources: ${stats.memories_without_sources.length}
- Without Abstract: ${stats.memories_without_abstract.length}
- Needing Verification: ${stats.memories_needing_verification.length}

${stats.memories_without_sources.length > 0 ? `\n📋 **Memories Without Sources:**
${stats.memories_without_sources.map(m => `  - ${m.title} (ID: ${m.id})`).join('\n')}` : ''}

${stats.memories_without_abstract.length > 0 ? `\n📋 **Memories Without Abstract:**
${stats.memories_without_abstract.map(m => `  - ${m.title} (ID: ${m.id})`).join('\n')}` : ''}

${stats.memories_needing_verification.length > 0 ? `\n📋 **Memories Needing Verification:**
${stats.memories_needing_verification.map(m => `  - ${m.title} (ID: ${m.id}, ${m.days_since_verification} days since last review)`).join('\n')}` : ''}

💡 **Recommendations**
${stats.recommendations.join('\n')}`;

                toolResult = {
                  content: [{ 
                    type: 'text', 
                    text: formattedStats 
                  }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.get_flexsearch_config) {
                const { parseFlexSearchConfig } = await import('@llm-mem/shared');
                const config = parseFlexSearchConfig();
                
                const configInfo = {
                  tokenize: config.tokenize,
                  resolution: config.resolution,
                  depth: config.depth,
                  threshold: config.threshold,
                  limit: config.limit,
                  suggest: config.suggest,
                  charset: config.charset,
                  language: config.language,
                  stopwords: config.stopwords,
                  stopwordsCount: config.stopwords.length,
                  minLength: config.minLength,
                  maxLength: config.maxLength,
                  context: config.context,
                  contextResolution: config.contextResolution,
                  contextDepth: config.contextDepth,
                  contextBidirectional: config.contextBidirectional,
                };
                
                toolResult = {
                  content: [{ 
                    type: "text", 
                    text: `FlexSearch Configuration:\n\n${JSON.stringify(configInfo, null, 2)}` 
                  }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.get_allowed_values) {
                const allowedCategories = parseAllowedValues(process.env.ALLOWED_CATEGORIES);
                const allowedTags = parseAllowedValues(process.env.ALLOWED_TAGS);
                
                let message = "Category and Tag Restrictions:\n\n";
                
                if (allowedCategories) {
                  message += `**Allowed Categories:** ${allowedCategories.join(", ")}\n`;
                } else {
                  message += "**Categories:** No restrictions (any category allowed)\n";
                }
                
                if (allowedTags) {
                  message += `**Allowed Tags:** ${allowedTags.join(", ")}\n`;
                } else {
                  message += "**Tags:** No restrictions (any tags allowed)\n";
                }
                
                message += "\nTo set restrictions, configure ALLOWED_CATEGORIES and/or ALLOWED_TAGS environment variables with comma-separated values.";
                
                toolResult = {
                  content: [{ type: 'text', text: message }],
                  isError: false
                };
            } else if (toolName === prefixedToolNames.fix_links) {
                const memory_id = toolArgs.memory_id as string;
                
                if (!memory_id) {
                  throw new Error('Missing required parameter: memory_id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const memoryService = await memoryServiceManager.getService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                
                // Read the memory to get current content and links
                const memory = await memoryService.readMemory({ id: memory_id });
                if (!memory) {
                  toolResult = {
                    content: [{ type: 'text', text: `Memory not found: ${memory_id}` }],
                    isError: true
                  };
                } else {
                  // Store the current link IDs for later processing
                  const currentLinkIds = [...memory.links];
                  
                  // Step 1: Unlink all current links
                  for (const linkId of currentLinkIds) {
                    try {
                      await memoryService.unlinkMemories({ source_id: memory_id, target_id: linkId });
                    } catch (error) {
                      // Log but continue with other links
                      console.error(`Failed to unlink ${linkId}: ${error}`);
                    }
                  }

                  // Step 2: Remove ALL markdown links from content (keep only HTTP links)
                  let cleanedContent = memory.content;
                  
                  // Remove everything after "## Related" section (including the section itself)
                  const relatedSectionIndex = cleanedContent.indexOf('## Related');
                  if (relatedSectionIndex !== -1) {
                    cleanedContent = cleanedContent.substring(0, relatedSectionIndex).trim();
                  }
                  
                  // Remove all Obsidian-style links: [[(CATEGORY)(title)(id)|display_text]]
                  cleanedContent = cleanedContent.replace(/\[\[\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)(?:\|([^\]]+))?\]\]/g, '');
                  
                  // Remove all simple markdown links: [[title|display_text]] or [[title]] (except HTTP links).
                  // Note: The display text (if present) is not captured by the regex and thus not passed to the replacement function; only the link target is checked for HTTP(S).
                  cleanedContent = cleanedContent.replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, (match, linkText) => {
                    // Check if this is an external HTTP link
                    if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
                      return match; // Keep external links
                    }
                    // Remove internal links completely
                    return '';
                  });
                  
                  // Clean up excessive empty lines and whitespace
                  cleanedContent = cleanedContent
                    .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Remove triple+ newlines
                    .replace(/[ \t]+$/gm, '')           // Remove trailing whitespace
                    .replace(/^\s+$/gm, '')             // Remove lines with only whitespace
                    .replace(/\n{3,}/g, '\n\n')         // Limit to max 2 consecutive newlines
                    .trim();                            // Remove leading/trailing whitespace

                  // Step 3: Update the memory with cleaned content
                  if (cleanedContent !== memory.content) {
                    await memoryService.updateMemory({
                      id: memory_id,
                      content: cleanedContent
                    });
                  }

                  // Step 4: Recreate links using IDs from YAML frontmatter (as if link_mem was called for each)
                  let successfulLinks = 0;
                  let failedLinks = 0;
                  
                  // Recreate links for all IDs in the YAML frontmatter
                  for (const linkId of currentLinkIds) {
                    try {
                      // Verify the target memory still exists
                      const targetMemory = await memoryService.readMemory({ id: linkId });
                      if (targetMemory) {
                        // Use link_mem to create proper bidirectional links and Obsidian-style content
                        await memoryService.linkMemories({ 
                          source_id: memory_id, 
                          target_id: linkId,
                          link_text: targetMemory.title
                        });
                        successfulLinks++;
                      } else {
                        failedLinks++;
                      }
                    } catch (error) {
                      failedLinks++;
                      console.error(`Failed to recreate link to ${linkId}: ${error}`);
                    }
                  }

                  // Generate summary message
                  const summary = `Link structure fixed for memory "${memory.title}" (ID: ${memory_id}):

✅ **Cleanup completed:**
- Removed ${currentLinkIds.length} existing links
- Cleaned markdown content of all Obsidian-style links
- Preserved external HTTP/HTTPS links

🔗 **Link recreation:**
- Successfully recreated: ${successfulLinks} links
- Failed to recreate: ${failedLinks} links
- Total links processed: ${currentLinkIds.length}

${failedLinks > 0 ? `\n⚠️ **Note:** ${failedLinks} links could not be recreated (target memories may have been deleted or are inaccessible).` : ''}

The memory now has a clean link structure with ${successfulLinks} valid bidirectional links.`;

                  // Refresh tracked DB mtime after all index-modifying operations
                  await memoryServiceManager.refreshDbMtime({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });

                  toolResult = {
                    content: [{ type: 'text', text: summary }],
                    isError: false
                  };
                }
            } else {
              const errorResponse = {
                jsonrpc: '2.0',
                error: {
                  code: -32601,
                  message: `Tool '${toolName}' not found`
                },
                id: body.id
              };
              event.node.res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
              event.node.res.end();
              return;
            }
            
            const result = {
              jsonrpc: '2.0',
              result: toolResult,
              id: body.id
            };
            
            event.node.res.write(`data: ${JSON.stringify(result)}\n\n`);
            event.node.res.end();
            return;
            
          } catch (error) {
            const errorResponse = {
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
              },
              id: body.id
            };
            event.node.res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
            event.node.res.end();
            return;
          }
        }
        
        // Default error response for unsupported methods
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method '${body.method}' not implemented`
          },
          id: body.id
        };
        
        event.node.res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        event.node.res.end();
        
      } catch (error) {
        console.error('Error handling MCP request:', error);
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
          },
          id: body.id || null
        };
        
        event.node.res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        event.node.res.end();
      }
    }));

    /**
     * MCP GET Endpoint - Method Not Allowed
     * 
     * MCP protocol only supports POST requests. This endpoint returns
     * a proper JSON-RPC error for unsupported HTTP methods.
     */
    router.get('/mcp', eventHandler(async () => {
      console.log('Received GET MCP request');
      return {
        statusCode: 405,
        body: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed."
          },
          id: null
        }
      };
    }));

    /**
     * MCP DELETE Endpoint - Method Not Allowed
     * 
     * MCP protocol only supports POST requests. This endpoint returns
     * a proper JSON-RPC error for unsupported HTTP methods.
     */
    router.delete('/mcp', eventHandler(async () => {
      console.log('Received DELETE MCP request');
      return {
        statusCode: 405,
        body: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed."
          },
          id: null
        }
      };
    }));

    /**
     * Health Check Endpoint
     * 
     * Provides server health status for monitoring and debugging.
     * Returns current timestamp and "ok" status when server is operational.
     */
    router.get('/health', eventHandler(async () => {
      return {
        statusCode: 200,
        body: { 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        }
      };
    }));

    app.use(router);
    
    const httpServer = createHttpServer(toNodeListener(app));
    
    httpServer.listen(port, () => {
      console.log(`MCP HTTP Server (H3) listening on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`MCP endpoint: http://localhost:${port}/mcp`);
    });

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('Shutting down HTTP server...');
      try {
        await memoryServiceManager.destroyAll();
      } catch (error) {
        console.error(`Error during cleanup: ${error}`);
      }
      httpServer.close();
      console.log('Server shutdown complete');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start H3 server:', error);
    process.exit(1);
  }
}

/**
 * Main entry point for the MCP server.
 * 
 * Parses command line arguments to determine transport type and configuration.
 * Supports both stdio and HTTP transports with configurable options.
 * 
 * Command line options:
 * - `--transport=stdio|http` - Choose transport type (default: stdio)
 * - `--port=NUMBER` - HTTP port number (default: 3000, HTTP only)
 * - `--memoryStorePath=PATH` - Path for memory files (default: ./memories)
 * - `--indexPath=PATH` - Path for FlexSearch index (default: ./memories/index)
 * 
 * @returns {Promise<void>} Promise that resolves when server starts
 * 
 * @example
 * ```bash
 * # Stdio transport (default)
 * node dist/index.js
 * 
 * # HTTP transport on default port
 * node dist/index.js --transport=http
 * 
 * # HTTP transport on custom port
 * node dist/index.js --transport=http --port=8080
 * 
 * # With custom memory paths
 * node dist/index.js --memoryStorePath=/path/to/memories --indexPath=/path/to/index
 * ```
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
  const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
  
  // Memory tools configuration
  const notestorePath = args.find(arg => arg.startsWith('--memoryStorePath='))?.split('=')[1] || './memories';
  const indexPath = args.find(arg => arg.startsWith('--indexPath='))?.split('=')[1] || './memories/index';

  // Load memory configuration if provided
  let memoryConfig: MemoryConfig | null = null;
  const memoryConfigPath = process.env.MEMORY_CONFIG_PATH;
  if (memoryConfigPath) {
    try {
      // Resolve path to handle both absolute and relative paths
      const resolvedPath = resolve(memoryConfigPath);
      memoryConfig = await loadMemoryConfig(resolvedPath);
      console.error(`[MCP] Loaded memory configuration from ${resolvedPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Warning: Failed to load memory configuration: ${errorMessage}`);
      // Continue without memory config - it's optional
    }
  }

  // Store configuration globally for memory tools
  (global as any).MEMORY_CONFIG = {
    notestorePath,
    indexPath,
    memoryConfig
  };

  // Ensure usage.md exists in notestore_path
  await ensureUsageFileExists(notestorePath);

  switch (transportType) {
    case 'http':
      await runHttp(port);
      break;
    case 'stdio':
    default:
      await runStdio();
      break;
  }
}

/**
 * Entry point execution guard
 * 
 * Only executes main() when this file is run directly (not imported as module).
 * Provides top-level error handling for any unhandled exceptions.
 */
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}