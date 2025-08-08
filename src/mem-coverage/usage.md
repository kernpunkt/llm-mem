# Code Documentation Coverage - MCP Usage Guide

## Overview

This guide explains how to use the Memory Tools MCP server to create documentation memories that will be compatible with the code documentation coverage tool. The coverage tool analyzes your memories to identify which parts of your codebase are documented and which need attention.

## Memory Categories for Code Documentation

When creating memories for code documentation, use these specific categories:

### 1. **ADR** - Architecture Decision Records
Use for high-level architectural decisions and design patterns.

**Example:**
```json
{
  "title": "ADR-001: Using TypeScript for type safety",
  "content": "# ADR-001: TypeScript Adoption\n\n**Date:** 2024-01-15\n\n**Context:** Need to choose between JavaScript and TypeScript for the project.\n\n**Decision:** Use TypeScript for improved type safety and developer experience.\n\n**Consequences:**\n- Better IDE support and autocomplete\n- Catch errors at compile time\n- Slightly more complex build process\n- Need to maintain type definitions",
  "category": "ADR",
  "tags": ["architecture", "typescript", "decision"],
  "sources": ["src/tsconfig.json", "src/package.json:1-20"]
}
```

### 2. **DOC** - Documentation about features, classes and functions
Use for documenting specific code elements, functions, classes, and features.

**Example:**
```json
{
  "title": "MemoryService class documentation",
  "content": "# MemoryService Class\n\n**Purpose:** Core service for memory operations including CRUD, search, and linking.\n\n**Key Methods:**\n- `createMemory()` - Creates new memories with validation\n- `readMemory()` - Retrieves memories by ID or title\n- `searchMemories()` - Full-text search with filters\n- `linkMemories()` - Creates bidirectional links\n\n**Usage Example:**\n```typescript\nconst memoryService = new MemoryService(config);\nawait memoryService.createMemory({\n  title: 'My Memory',\n  content: '# Content',\n  category: 'work'\n});\n```",
  "category": "DOC",
  "tags": ["class", "service", "memory", "api"],
  "sources": ["src/memory/memory-service.ts:1-50", "src/memory/memory-service.ts:25-75"]
}
```

### 3. **CTX** - Context memories for LLM sessions
Use for any information that would be valuable for LLMs to remember during development sessions.

**Example:**
```json
{
  "title": "Project structure and conventions",
  "content": "# Project Structure\n\n**Root Structure:**\n- `src/` - Source code\n- `tests/` - Test files\n- `docs/` - Documentation\n- `memories/` - Memory files\n\n**Naming Conventions:**\n- Use kebab-case for file names\n- Use PascalCase for class names\n- Use camelCase for functions and variables\n- Use UPPER_CASE for constants\n\n**Code Style:**\n- 2 spaces for indentation\n- Semicolons required\n- Single quotes for strings\n- Trailing commas in objects",
  "category": "CTX",
  "tags": ["conventions", "structure", "style"],
  "sources": ["src/", "package.json", "tsconfig.json"]
}
```

## Source Reference Format

The `sources` array is crucial for coverage analysis. Use these formats:

### Basic File References
```json
"sources": ["src/index.ts"]
```
Covers the entire file.

### Line Range References
```json
"sources": ["src/memory/types.ts:15-30"]
```
Covers lines 15 through 30 (inclusive).

### Multiple Line Ranges
```json
"sources": ["src/memory/types.ts:15-30", "src/memory/types.ts:45-60"]
```
Covers multiple sections of the same file.

### Multiple File References
```json
"sources": [
  "src/memory/types.ts:1-50",
  "src/memory/memory-service.ts:25-75",
  "tests/memory/memory-service.test.ts:10-40"
]
```

## Best Practices for Coverage-Compatible Documentation

### 1. **Be Specific with Sources**
Instead of:
```json
"sources": ["src/memory/"]
```

Use:
```json
"sources": [
  "src/memory/types.ts:1-50",
  "src/memory/memory-service.ts:25-75",
  "src/memory/file-service.ts:10-30"
]
```

### 2. **Document at the Right Level**
- **ADR**: Document architectural decisions affecting multiple files
- **DOC**: Document specific functions, classes, or features
- **CTX**: Document conventions, patterns, or context

### 3. **Use Descriptive Titles**
Good:
```json
"title": "MemoryService.createMemory() method documentation"
```

Avoid:
```json
"title": "Memory service"
```

### 4. **Include Code Examples**
```json
{
  "title": "FlexSearch configuration options",
  "content": "# FlexSearch Configuration\n\n**Tokenization Methods:**\n- `strict` - Exact matching\n- `forward` - Forward matching (default)\n- `reverse` - Reverse matching\n- `full` - Full matching\n- `tolerant` - Fuzzy matching\n\n**Example Configuration:**\n```typescript\nconst config = {\n  tokenize: 'forward',\n  resolution: 9,\n  depth: 3,\n  threshold: 1\n};\n```",
  "category": "DOC",
  "tags": ["flexsearch", "configuration", "search"],
  "sources": ["src/utils/flexsearch-config.ts:1-40"]
}
```

### 5. **Link Related Documentation**
```json
{
  "title": "Memory linking functionality",
  "content": "# Memory Linking\n\n**Purpose:** Create bidirectional links between related memories.\n\n**Related Documentation:**\n- [[MemoryService class documentation]]\n- [[ADR-001: TypeScript Adoption]]\n\n**Implementation:** Uses LinkService for bidirectional link management.",
  "category": "DOC",
  "tags": ["linking", "relationships", "memory"],
  "sources": ["src/memory/link-service.ts:1-50"]
}
```

## Example: Complete Documentation Workflow

### Step 1: Document Architecture Decision
```json
{
  "title": "ADR-002: Using FlexSearch for full-text search",
  "content": "# ADR-002: FlexSearch for Search\n\n**Context:** Need fast, flexible full-text search for memories.\n\n**Decision:** Use FlexSearch for its speed and configurability.\n\n**Consequences:**\n- Fast search performance\n- Configurable search behavior\n- Lightweight implementation\n- Good TypeScript support",
  "category": "ADR",
  "tags": ["architecture", "search", "flexsearch"],
  "sources": ["src/utils/flexsearch.ts", "src/utils/flexsearch-config.ts"]
}
```

### Step 2: Document Implementation
```json
{
  "title": "SearchService implementation with FlexSearch",
  "content": "# SearchService Class\n\n**Purpose:** Provides full-text search capabilities using FlexSearch.\n\n**Key Methods:**\n- `initialize()` - Sets up FlexSearch index\n- `indexMemory()` - Adds memory to search index\n- `search()` - Performs full-text search\n\n**Configuration:**\nUses FlexSearch with forward tokenization and resolution 9.",
  "category": "DOC",
  "tags": ["search", "service", "flexsearch"],
  "sources": ["src/memory/search-service.ts:1-80"]
}
```

### Step 3: Document Context
```json
{
  "title": "Search configuration patterns",
  "content": "# Search Configuration Patterns\n\n**Common Configurations:**\n\n**High Precision:**\n```typescript\n{ tokenize: 'strict', resolution: 15, depth: 5 }\n```\n\n**Fast Search:**\n```typescript\n{ tokenize: 'tolerant', resolution: 5, depth: 2 }\n```\n\n**German Language:**\n```typescript\n{ language: 'de', charset: 'latinadvanced' }\n```",
  "category": "CTX",
  "tags": ["search", "configuration", "patterns"],
  "sources": ["src/utils/flexsearch-config.ts:20-60"]
}
```

## Coverage Tool Integration

When you create memories following these patterns, the coverage tool will be able to:

1. **Identify documented code** by parsing the `sources` arrays
2. **Calculate coverage percentages** for files, functions, and classes
3. **Find undocumented sections** that need attention
4. **Generate reports** showing documentation gaps
5. **Provide recommendations** for improving coverage

## Command Line Usage

Once you've created memories, run the coverage tool:

```bash
# Basic coverage report
pnpm mem-coverage

# Coverage for specific categories
pnpm mem-coverage --categories=DOC,ADR

# Coverage with custom config
pnpm mem-coverage --config=./coverage.json

# Coverage with threshold
pnpm mem-coverage --threshold=80
```

## Tips for LLMs

1. **Always include specific source references** in the `sources` array
2. **Use the appropriate category** (ADR, DOC, CTX) for the type of documentation
3. **Be precise with line ranges** when documenting specific functions or classes
4. **Link related memories** to create a knowledge graph
5. **Include code examples** in your documentation content
6. **Use descriptive titles** that clearly indicate what's being documented
7. **Add relevant tags** for better categorization and search

This approach ensures your documentation will be fully compatible with the coverage analysis tool and provides maximum value for understanding your codebase's documentation completeness.
