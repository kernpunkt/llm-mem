---
id: 5b3dbc9a-a922-4ff5-b907-7a13e7d483a8
title: Shared Tools Architecture - Memory CLI
tags:
  - architecture
  - shared-library
  - code-reuse
  - refactoring
category: DOC
created_at: '2025-11-02T10:13:12.018Z'
updated_at: '2025-11-02T10:13:29.625Z'
last_reviewed: '2025-11-02T10:13:12.018Z'
links:
  - 945c8dba-83d3-4803-a6cc-b42684f98ffb
sources:
  - packages/shared/src/tools/
---

# Shared Tools Architecture

## Overview

The memory tools functionality is now shared between MCP server and CLI through a unified library in `packages/shared/src/tools/`. This ensures feature parity and reduces code duplication.

## Architecture Pattern

### Shared Tool Functions

Each tool follows this pattern:

```typescript
export async function toolName(
  memoryService: MemoryService,
  params: ToolParams
): Promise<ToolResult> {
  // 1. Validate inputs (using shared validators)
  // 2. Call MemoryService methods
  // 3. Format response using shared formatters
  // 4. Return structured result
}
```

**Key Characteristics:**
- Accept `MemoryService` as first parameter (dependency injection)
- Pure functions (no global state, no side effects)
- Typed parameters and return values
- Error handling with descriptive messages

### Tool Response Structure

All tools return structured results:
```typescript
{
  // Tool-specific data
  // ...
  isError: boolean  // Always included
  formatted?: string  // For tools with formatted output
}
```

## Shared Components

### Types (`types.ts`)
- Defines parameter and result interfaces for all 9 tools
- Matches MCP tool schemas exactly
- Used by both MCP server and CLI

### Validators (`validators.ts`)
- `validateCategory()` - Validates against ALLOWED_CATEGORIES env var
- `validateTags()` - Validates against ALLOWED_TAGS env var
- `parseAllowedValues()` - Parses comma-separated env vars

### Formatters (`formatters.ts`)
- `formatMemory()` - Formats memory for display (markdown/plain/json)
- `formatSearchResults()` - Formats search results
- `formatMemoriesList()` - Formats list results
- `formatNeedsReview()` - Formats review results
- `formatMemoryStats()` - Formats statistics report

## MCP Server Usage

MCP server transforms shared tool results to MCP format:

```typescript
const result = await readMem(memoryService, params);
return {
  content: [{ type: "text", text: result.formatted }],
  isError: result.isError
};
```

## CLI Usage

CLI uses shared tools directly:

```typescript
const result = await readMem(memoryService, params);
if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result.formatted);
}
return { exitCode: result.isError ? 1 : 0 };
```

## Benefits

1. **Code Reuse**: Single implementation for both interfaces
2. **Consistency**: Same validation, formatting, and error handling
3. **Maintainability**: Changes to tool logic benefit both MCP and CLI
4. **Testability**: Tools can be tested independently of interface

## Tools Extracted

All 9 tools successfully extracted:
- `readMem()` - Read memory by ID or title
- `searchMem()` - Full-text search with filters
- `linkMem()` - Create bidirectional links
- `unlinkMem()` - Remove bidirectional links
- `reindexMems()` - Reindex all memories
- `needsReview()` - Find memories needing review
- `listMems()` - List with filtering
- `getMemStats()` - Comprehensive statistics
- `fixLinks()` - Fix link structure

## Related

- [[(DOC)(memory-cli-implementation-complete)(945c8dba-83d3-4803-a6cc-b42684f98ffb)|Memory CLI Implementation - Complete]]
