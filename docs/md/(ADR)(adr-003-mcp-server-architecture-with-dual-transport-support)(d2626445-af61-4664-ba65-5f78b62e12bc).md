---
id: d2626445-af61-4664-ba65-5f78b62e12bc
title: 'ADR-003: MCP Server Architecture with Dual Transport Support'
tags:
  - architecture
  - mcp
  - transport
  - stdio
  - http
  - llm-integration
category: ADR
created_at: '2025-08-22T13:50:50.264Z'
updated_at: '2025-08-23T02:41:59.369Z'
last_reviewed: '2025-08-22T13:50:50.264Z'
links:
  - a91a6906-8f61-4071-a548-15b96967605e
  - 3b201e08-784c-4a83-9a0e-05d715882e80
sources:
  - packages/mcp/src/index.ts:1-100
  - packages/mcp/package.json:1-45
  - packages/mcp/src/index.ts:389-573
  - packages/mcp/src/index.ts:578-1727
---

# ADR-003: MCP Server Architecture with Dual Transport Support

**Date:** 2025-01-15

**Context:** Need to provide LLM integration capabilities through the Model Context Protocol (MCP) while supporting both production (stdio) and development (HTTP) transport modes.

**Decision:** Implement a dual-transport MCP server architecture with stdio transport for production use and HTTP transport for development and debugging.

**Rationale:**

**Transport Modes:**
- **Stdio Transport (Production Default)**: Direct process communication via stdin/stdout, used by MCP clients like Cursor IDE and Claude Desktop
- **HTTP Transport (Development)**: Provides health endpoint and direct API access for debugging and testing

**MCP 2025-06-18 Specification Compliance:**
- **Server Configuration**: Follows MCP specification with proper capabilities declaration
- **Tool Response Structure**: All tools return responses with content array and isError flag
- **HTTP Protocol Headers**: Sets required MCP headers for HTTP transport
- **JSON-RPC 2.0 Compliance**: Follows proper request/response patterns

**Server Capabilities:**
- **Tools**: Core tool execution capability for memory management operations
- **Resources**: Resource access capability for future use
- **Prompts**: Prompt template capability for future use
- **Logging**: Structured logging capability for future use

**Tool Categories:**
- **Memory Management**: Create, read, update, delete, and search memories
- **System Operations**: Date/time utilities, health checks, and configuration
- **Development Tools**: Coverage analysis, validation, and testing utilities

**Benefits:**
- **Production Ready**: Stdio transport for seamless LLM integration
- **Development Friendly**: HTTP transport for debugging and testing
- **Specification Compliant**: Follows MCP 2025-06-18 standards
- **Extensible**: Easy to add new tools and capabilities
- **Type Safe**: Full TypeScript support with Zod validation

**Trade-offs:**
- **Complexity**: Dual transport implementation increases code complexity
- **Maintenance**: Need to maintain two transport modes
- **Testing**: More complex testing requirements for both transports
- **Dependencies**: Additional dependencies for HTTP transport (H3 framework)

**Implementation Strategy:**
- Core server logic independent of transport layer
- Transport abstraction for easy switching between modes
- Comprehensive testing for both transport modes
- Environment-based configuration for transport selection
- Health endpoints and monitoring for HTTP transport

**Related Documentation:**
- [[CLI Coverage Tool: Command-Line Interface Architecture and Configuration Management]] - CLI implementation details
- [[Testing Strategy and Quality Assurance]] - Testing approach for MCP server