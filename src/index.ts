import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { createApp, createRouter, eventHandler, readBody, toNodeListener } from "h3";
import { createServer as createHttpServer } from "http";
import { z } from "zod";
import { MemoryService } from "./memory/memory-service.js";
import { serializeFrontmatter } from "./utils/yaml.js";
import { promises as fs } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file (quiet mode to avoid stdout interference)
config({ quiet: true });

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
    name: "memory-tools-mcp",
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
    "get_current_date",
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
    "write_mem",
    "Creates a new memory as a markdown file and indexes it",
    {
      title: z.string().min(1).describe("Title of the memory"),
      content: z.string().min(1).describe("Content in markdown format"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      category: z.string().optional().describe("Category for organization"),
      sources: z.array(z.string()).optional().describe("References/sources for the memory")
    },
    async ({ title, content, tags = [], category = "general", sources = [] }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        const mem = await memoryService.createMemory({ title, content, tags, category, sources });
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
    "read_mem",
    "Retrieves a memory by ID or title with optional formatting",
    {
      identifier: z.string().min(1).describe("Memory ID or title"),
      format: z.enum(["markdown", "plain", "json"]).optional().describe("Output format")
    },
    async ({ identifier, format = "markdown" }) => {
      try {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        const memory = await memoryService.readMemory(uuidPattern.test(identifier) ? { id: identifier } : { title: identifier });
        if (!memory) {
          return {
            content: [{ type: "text", text: `Memory not found: ${identifier}` }],
            isError: true
          };
        }

        if (format === "plain") {
          return { content: [{ type: "text", text: memory.content }], isError: false };
        }

        if (format === "json") {
          return { content: [{ type: "text", text: JSON.stringify(memory, null, 2) }], isError: false };
        }

        // markdown
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
        return { content: [{ type: "text", text: markdown }], isError: false };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`read_mem failed: ${msg}`);
      }
    }
  );



  server.tool(
    "get_usage_info",
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
    "edit_mem",
    "Updates an existing memory's content, title, tags, category, or sources",
    {
      id: z.string().uuid().describe("Memory ID to edit"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content in markdown format"),
      tags: z.array(z.string()).optional().describe("New tags for categorization"),
      category: z.string().optional().describe("New category for organization"),
      sources: z.array(z.string()).optional().describe("Updated references/sources for the memory")
    },
    async ({ id, title, content, tags, category, sources }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const updates: any = { id };
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (tags !== undefined) updates.tags = tags;
        if (category !== undefined) updates.category = category;
        if (sources !== undefined) updates.sources = sources;

        const updated = await memoryService.updateMemory(updates);
        
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
    "search_mem",
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
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const searchParams: any = { query, limit };
        if (category) searchParams.category = category;
        if (tags) searchParams.tags = tags;

        const results = await memoryService.searchMemories(searchParams);
        
        if (results.total === 0) {
          return {
            content: [{ type: "text", text: "No memories found matching your search criteria." }],
            isError: false
          };
        }

        const formattedResults = results.results.map((result, index) => {
          const tagsStr = result.tags.length > 0 ? ` [${result.tags.join(", ")}]` : "";
          const categoryStr = result.category !== "general" ? ` (${result.category})` : "";
          return `${index + 1}. **${result.title}**${categoryStr}${tagsStr}\n   Score: ${result.score.toFixed(2)}\n   ${result.snippet}\n   ID: ${result.id}\n`;
        }).join("\n");

        return {
          content: [{ 
            type: "text", 
            text: `Found ${results.total} memory(ies):\n\n${formattedResults}` 
          }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`search_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    "link_mem",
    "Creates bidirectional links between two memories",
    {
      source_id: z.string().uuid().describe("ID of the source memory"),
      target_id: z.string().uuid().describe("ID of the target memory to link to"),
      link_text: z.string().optional().describe("Custom link text (defaults to target title)")
    },
    async ({ source_id, target_id }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await memoryService.linkMemories({ source_id, target_id });
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`link_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    "unlink_mem",
    "Removes bidirectional links between two memories",
    {
      source_id: z.string().uuid().describe("ID of the source memory"),
      target_id: z.string().uuid().describe("ID of the target memory to unlink")
    },
    async ({ source_id, target_id }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await memoryService.unlinkMemories({ source_id, target_id });
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`unlink_mem failed: ${msg}`);
      }
    }
  );

  server.tool(
    "reindex_mems",
    "Clears the FlexSearch indexes and reindexes all documents in notestore_path",
    {},
    async () => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await memoryService.reindexMemories();
        
        return {
          content: [{ type: "text", text: result.message }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`reindex_mems failed: ${msg}`);
      }
    }
  );

  server.tool(
    "needs_review",
    "Returns all memories that have a last_reviewed date before the given date",
    {
      date: z.string().describe("Cutoff date in ISO format (e.g., '2024-01-15T00:00:00Z')")
    },
    async ({ date }) => {
      try {
        const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
        const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
        
        const result = await memoryService.getMemoriesNeedingReview(date);
        
        if (result.total === 0) {
          return {
            content: [{ type: "text", text: "No memories need review before the specified date." }],
            isError: false
          };
        }

        const formattedResults = result.memories.map((memory, index) => {
          const tagsStr = memory.tags.length > 0 ? ` [${memory.tags.join(", ")}]` : "";
          const categoryStr = memory.category !== "general" ? ` (${memory.category})` : "";
          return `${index + 1}. **${memory.title}**${categoryStr}${tagsStr}\n   Last reviewed: ${memory.last_reviewed}\n   Created: ${memory.created_at}\n   ID: ${memory.id}\n`;
        }).join("\n");

        return {
          content: [{ 
            type: "text", 
            text: `Found ${result.total} memory(ies) needing review:\n\n${formattedResults}` 
          }],
          isError: false
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`needs_review failed: ${msg}`);
      }
    }
  );

  server.tool(
    "get_flexsearch_config",
    "Returns the current FlexSearch configuration including stopwords and environment settings",
    {},
    async () => {
      try {
        const { parseFlexSearchConfig } = await import("./utils/flexsearch-config.js");
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
                name: 'memory-tools-mcp',
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
                  name: 'get_current_date',
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
                  name: 'write_mem',
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
                  name: 'read_mem',
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
                  name: 'get_usage_info',
                  description: 'Returns usage documentation and examples for all memory tools',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'edit_mem',
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
                  name: 'search_mem',
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
                  name: 'link_mem',
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
                  name: 'unlink_mem',
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
                  name: 'reindex_mems',
                  description: 'Clears the FlexSearch indexes and reindexes all documents in notestore_path',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'needs_review',
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
                  name: 'get_flexsearch_config',
                  description: 'Returns the current FlexSearch configuration including stopwords and environment settings',
                  inputSchema: {
                    type: 'object',
                    properties: {}
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
          
          let toolResult: { content: Array<{ type: string; text: string }>; isError: boolean };
          
          try {
            switch (toolName) {

                
              case 'get_current_date': {
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
                break;
              }
                
              case 'write_mem': {
                const title = toolArgs.title as string;
                const content = toolArgs.content as string;
                const tags = toolArgs.tags as string[] || [];
                const category = toolArgs.category as string || 'general';
                const sources = toolArgs.sources as string[] || [];
                
                if (!title || !content) {
                  throw new Error('Missing required parameters: title and content');
                }
                
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const mem = await memoryService.createMemory({ title, content, tags, category, sources });
                
                toolResult = {
                  content: [{ type: 'text', text: `id: ${mem.id}\nfile: ${mem.file_path}\ncreated_at: ${mem.created_at}` }],
                  isError: false
                };
                break;
              }
                
              case 'read_mem': {
                const identifier = toolArgs.identifier as string;
                const format = (toolArgs.format as string) || 'markdown';
                
                if (!identifier) {
                  throw new Error('Missing required parameter: identifier');
                }
                
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
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
                  const { serializeFrontmatter } = await import('./utils/yaml.js');
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
                break;
              }
                
              case 'get_usage_info': {
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
                break;
              }
                
              case 'edit_mem': {
                const id = toolArgs.id as string;
                const title = toolArgs.title as string;
                const content = toolArgs.content as string;
                const tags = toolArgs.tags as string[] || [];
                const category = toolArgs.category as string || 'general';
                const sources = toolArgs.sources as string[] || [];

                if (!id) {
                  throw new Error('Missing required parameter: id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const updated = await memoryService.updateMemory({ id, title, content, tags, category, sources });

                toolResult = {
                  content: [{ 
                    type: 'text', 
                    text: `Memory updated successfully:\nid: ${updated.id}\ntitle: ${updated.title}\nupdated_at: ${updated.updated_at}` 
                  }],
                  isError: false
                };
                break;
              }

              case 'search_mem': {
                const query = toolArgs.query as string;
                const limit = toolArgs.limit as number || 10;
                const category = toolArgs.category as string;
                const tags = toolArgs.tags as string[];

                if (!query) {
                  throw new Error('Missing required parameter: query');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
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
                    return `${index + 1}. **${result.title}**${categoryStr}${tagsStr}\n   Score: ${result.score.toFixed(2)}\n   ${result.snippet}\n   ID: ${result.id}\n`;
                  }).join("\n");
                  toolResult = {
                    content: [{ 
                      type: 'text', 
                      text: `Found ${results.total} memory(ies):\n\n${formattedResults}` 
                    }],
                    isError: false
                  };
                }
                break;
              }

              case 'link_mem': {
                const source_id = toolArgs.source_id as string;
                const target_id = toolArgs.target_id as string;
                const link_text = toolArgs.link_text as string;

                if (!source_id || !target_id) {
                  throw new Error('Missing required parameters: source_id and target_id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.linkMemories({ source_id, target_id, link_text });

                toolResult = {
                  content: [{ type: 'text', text: result.message }],
                  isError: false
                };
                break;
              }

              case 'unlink_mem': {
                const source_id = toolArgs.source_id as string;
                const target_id = toolArgs.target_id as string;

                if (!source_id || !target_id) {
                  throw new Error('Missing required parameters: source_id and target_id');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.unlinkMemories({ source_id, target_id });

                toolResult = {
                  content: [{ type: 'text', text: result.message }],
                  isError: false
                };
                break;
              }

              case 'reindex_mems': {
                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
                const result = await memoryService.reindexMemories();

                toolResult = {
                  content: [{ type: 'text', text: result.message }],
                  isError: false
                };
                break;
              }

              case 'needs_review': {
                const date = toolArgs.date as string;
                if (!date) {
                  throw new Error('Missing required parameter: date');
                }

                const cfg = (global as any).MEMORY_CONFIG || { notestorePath: "./memories", indexPath: "./memories/index" };
                const { MemoryService } = await import('./memory/memory-service.js');
                const memoryService = new MemoryService({ notestorePath: cfg.notestorePath, indexPath: cfg.indexPath });
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
                break;
              }

              case 'get_flexsearch_config': {
                const { parseFlexSearchConfig } = await import('./utils/flexsearch-config.js');
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
                break;
              }
                
              default: {
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
 * - `--notestore_path=PATH` - Path for memory files (default: ./memories)
 * - `--index_path=PATH` - Path for FlexSearch index (default: ./memories/index)
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
 * node dist/index.js --notestore_path=/path/to/memories --index_path=/path/to/index
 * ```
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
  const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
  
  // Memory tools configuration
  const notestorePath = args.find(arg => arg.startsWith('--notestore_path='))?.split('=')[1] || './memories';
  const indexPath = args.find(arg => arg.startsWith('--index_path='))?.split('=')[1] || './memories/index';

  // Store configuration globally for memory tools
  (global as any).MEMORY_CONFIG = {
    notestorePath,
    indexPath
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