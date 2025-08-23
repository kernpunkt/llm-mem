---
id: e3b45e64-89e0-484d-a1a8-9a287c9d8837
title: MCP Server Implementation and Tool Definitions
tags:
  - mcp
  - server
  - tools
  - transport
  - validation
  - error-handling
category: DOC
created_at: '2025-08-22T13:52:50.145Z'
updated_at: '2025-08-23T05:31:27.861Z'
last_reviewed: '2025-08-22T13:52:50.145Z'
links:
  - b1434c95-1c44-440d-8aa1-f41a6c3393e9
sources:
  - packages/mcp/src/index.ts:1-100
  - packages/mcp/src/index.ts:101-200
  - packages/mcp/src/index.ts:201-300
  - packages/mcp/src/index.ts:301-400
---

# MCP Server Implementation and Tool Definitions

**Purpose:** Model Context Protocol (MCP) server providing memory management tools for LLM integration with comprehensive tool definitions and dual transport support.

**Server Architecture:**

**Core MCP Server:**
- **Server Configuration**: Follows MCP 2025-06-18 specification
- **Capabilities Declaration**: Tools, resources, prompts, and logging capabilities
- **Transport Abstraction**: Support for stdio and HTTP transport modes
- **Tool Registry**: Centralized tool definition and management

**Tool Categories:**

**Memory Management Tools:**
- **create_memory**: Create new memories with validation
- **read_memory**: Retrieve memories by ID or title
- **update_memory**: Update existing memory content
- **delete_memory**: Remove memories with cleanup
- **list_memories**: List memories with filtering options
- **search_memories**: Full-text search across memories
- **link_memories**: Create bidirectional links between memories
- **unlink_memories**: Remove links between memories

**System and Utility Tools:**
- **get_current_date**: Date/time utilities with format options
- **get_usage_info**: Comprehensive usage documentation
- **get_memory_stats**: Memory store statistics and health
- **get_flexsearch_config**: FlexSearch configuration information
- **get_allowed_values**: Category and tag restrictions

**Development and Analysis Tools:**
- **needs_review**: Identify memories needing review
- **migrate_memory_files**: Migrate between memory formats
- **reindex_mems**: Rebuild search indexes
- **get_memory_stats**: Comprehensive memory analysis

**Tool Implementation Patterns:**

**Parameter Validation:**
- **Zod Schemas**: Runtime type validation for all parameters
- **Required Fields**: Clear indication of required vs. optional parameters
- **Type Safety**: Full TypeScript type checking
- **Error Messages**: Descriptive validation error messages

**Response Structure:**
- **MCP Compliance**: Follows MCP 2025-06-18 response format
- **Content Array**: Structured content with type and text
- **Error Handling**: Proper error responses with isError flag
- **Status Codes**: Appropriate HTTP status codes for HTTP transport

**Error Handling Strategy:**
- **Validation Errors**: Return 400 for invalid parameters
- **Business Logic Errors**: Return 500 for internal errors
- **User-Friendly Messages**: Clear error descriptions
- **Error Recovery**: Graceful degradation when possible

**Transport Layer Support:**

**Stdio Transport (Production):**
- **Direct Communication**: Process-to-process communication
- **JSON-RPC 2.0**: Standard MCP protocol over stdin/stdout
- **Error Logging**: Errors logged to stderr only
- **Graceful Shutdown**: Handle SIGINT and cleanup

**HTTP Transport (Development):**
- **H3 Framework**: Lightweight HTTP framework
- **Health Endpoint**: GET /health for monitoring
- **MCP Endpoint**: POST /mcp for MCP operations
- **Protocol Headers**: Proper MCP protocol headers

**HTTP Protocol Compliance:**
- **MCP Headers**: Set required MCP protocol version
- **Content Types**: Proper content type handling
- **Status Codes**: Appropriate HTTP status codes
- **Error Responses**: Structured error responses

**Tool Development Patterns:**

**Memory Tool Pattern:**
```typescript
server.tool(
  "tool_name",
  "Tool description",
  {
    param: z.string().describe("Parameter description")
  },
  async ({ param }) => {
    try {
      const result = await memoryService.operation(param);
      return {
        content: [{ type: "text", text: result }],
        isError: false
      };
    } catch (error) {
      throw new Error(`Tool failed: ${error.message}`);
    }
  }
);
```

**Validation and Security:**
- **Input Sanitization**: Clean and validate all inputs
- **Category Validation**: Enforce allowed categories
- **Tag Validation**: Enforce allowed tags
- **Permission Checking**: Future role-based access control

**Performance Considerations:**
- **Async Operations**: Non-blocking tool execution
- **Timeout Handling**: Prevent long-running operations
- **Resource Management**: Efficient memory and CPU usage
- **Caching**: Cache frequently accessed data

**Related Documentation:** - Validation patterns - Testing approach for MCP server


- CLI Tool Architecture and Coverage Analysis


## Related

- [[(DOC)(cli-tool-architecture-and-coverage-analysis)(b1434c95-1c44-440d-8aa1-f41a6c3393e9)|CLI Tool Architecture and Coverage Analysis]]
