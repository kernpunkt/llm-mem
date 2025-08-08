# Code Documentation Coverage - MCP Usage Guide

## Overview

This guide explains how to use the Memory Tools MCP server to create documentation memories that will be compatible with the code documentation coverage tool. The coverage tool analyzes your memories to identify which parts of your codebase are documented and which need attention.

## The Importance of Good Documentation

⚠️ **Critical Warning: Coverage ≠ Quality**

While the coverage tool helps identify undocumented areas, **coverage metrics alone do not guarantee good documentation**. The goal is to create documentation that provides genuine value to humans and LLMs, not just to satisfy coverage requirements.

### What Makes Documentation Valuable

**Good documentation provides insights that cannot be easily derived from reading the code:**

✅ **Explains the "Why" Behind the "What"**
```json
{
  "title": "Why we use bidirectional linking in MemoryService",
  "content": "# Bidirectional Linking Rationale\n\n**Problem:** Traditional one-way links create orphaned references when memories are deleted.\n\n**Solution:** Bidirectional linking ensures referential integrity and enables discovery of related content.\n\n**Trade-offs:**\n- Slightly more complex implementation\n- Better data consistency\n- Improved search and discovery\n\n**Implementation Details:**\nThe LinkService maintains both forward and reverse link maps, automatically updating both when links are created or removed.",
  "category": "DOC",
  "tags": ["architecture", "linking", "data-integrity"],
  "sources": ["src/memory/link-service.ts:1-50"]
}
```

✅ **Documents Complex Business Logic and Edge Cases**
```json
{
  "title": "Memory validation edge cases and business rules",
  "content": "# Memory Validation Business Rules\n\n**Critical Edge Cases:**\n\n1. **Circular References:** Prevent infinite loops in memory linking\n2. **Duplicate Prevention:** Allow same title if different categories\n3. **Content Sanitization:** Strip HTML but preserve markdown formatting\n4. **Size Limits:** 10MB max content size to prevent memory issues\n\n**Business Logic:**\n- Memories without categories default to 'general'\n- Auto-generated IDs use UUID v4 for collision resistance\n- Search indexing happens asynchronously to avoid blocking\n\n**Error Handling:**\n- Invalid JSON content returns 400, not 500\n- Missing required fields provide specific error messages\n- Network timeouts are retried with exponential backoff",
  "category": "DOC",
  "tags": ["validation", "business-rules", "edge-cases"],
  "sources": ["src/memory/memory-service.ts:25-75", "src/memory/types.ts:15-30"]
}
```

✅ **Explains Performance Characteristics and Trade-offs**
```json
{
  "title": "FlexSearch performance characteristics and optimization",
  "content": "# FlexSearch Performance Analysis\n\n**Performance Characteristics:**\n- **Indexing:** O(n) where n = number of tokens\n- **Search:** O(log n) for exact matches, O(n) for fuzzy\n- **Memory:** ~2-3x the original text size\n\n**Optimization Strategies:**\n1. **Tokenization:** Use 'forward' for speed, 'strict' for precision\n2. **Resolution:** Higher values = more memory, better recall\n3. **Depth:** Controls search depth vs performance trade-off\n\n**Real-world Performance:**\n- 10,000 memories: ~50ms search time\n- 100,000 memories: ~200ms search time\n- Index size: ~15MB for 10k memories\n\n**When to Use Each Mode:**\n- **Development:** Use 'tolerant' for quick iteration\n- **Production:** Use 'forward' for balanced performance\n- **High Precision:** Use 'strict' for exact matching",
  "category": "DOC",
  "tags": ["performance", "optimization", "flexsearch"],
  "sources": ["src/utils/flexsearch-config.ts:1-40", "src/memory/search-service.ts:25-60"]
}
```

### What Makes Documentation Useless

❌ **Avoid Documentation That Merely Restates the Obvious**

**Bad Example - Just Describes What the Code Does:**
```json
{
  "title": "createMemory function documentation",
  "content": "# createMemory Function\n\nThis function creates a new memory. It takes a title, content, and category as parameters. It returns a Promise that resolves to the created memory.",
  "category": "DOC",
  "tags": ["function", "memory"],
  "sources": ["src/memory/memory-service.ts:25-35"]
}
```

**Good Example - Explains Why and How:**
```json
{
  "title": "createMemory validation and business logic",
  "content": "# createMemory: Validation and Business Logic\n\n**Purpose:** Creates validated memories with proper error handling and business rule enforcement.\n\n**Key Business Rules:**\n1. **Title Validation:** Must be 1-200 characters, no HTML\n2. **Content Sanitization:** Strips HTML but preserves markdown\n3. **Category Handling:** Defaults to 'general' if not specified\n4. **Duplicate Prevention:** Same title allowed in different categories\n\n**Error Scenarios:**\n- Invalid JSON: Returns 400 with specific field errors\n- Network failures: Retries with exponential backoff\n- Validation errors: Returns structured error messages\n\n**Performance Considerations:**\n- Async validation to avoid blocking\n- Batch processing for multiple memories\n- Indexing happens in background thread",
  "category": "DOC",
  "tags": ["validation", "business-logic", "error-handling"],
  "sources": ["src/memory/memory-service.ts:25-75"]
}
```

### Documentation Quality Checklist

Before creating documentation, ask yourself:

1. **Does this explain something not obvious from the code?**
   - ✅ Explains business rules, edge cases, or design decisions
   - ❌ Just restates what the function parameters are

2. **Would this help someone understand the system better?**
   - ✅ Provides context about why certain choices were made
   - ❌ Just lists method names and parameters

3. **Does this document complex logic or trade-offs?**
   - ✅ Explains performance characteristics, error handling, or architectural decisions
   - ❌ Just describes what the code does

4. **Would this be valuable for future maintenance?**
   - ✅ Documents edge cases, gotchas, or non-obvious behaviors
   - ❌ Just restates the obvious

### When to Document vs. When to Skip

**Document These:**
- Architectural decisions and their rationale
- Complex business logic and edge cases
- Performance characteristics and trade-offs
- Error handling strategies
- Integration patterns and dependencies
- Security considerations
- Testing strategies and coverage gaps

**Skip These:**
- Simple getter/setter methods with obvious purposes
- Standard CRUD operations without special logic
- Configuration files that are self-explanatory
- Boilerplate code with no business logic
- Comments that just restate what the code does

### Quality Over Quantity

Remember: **One high-quality documentation memory is worth ten trivial ones.** Focus on creating documentation that provides genuine insights and helps both humans and LLMs understand the deeper aspects of your codebase.

## Memory Categories for Code Documentation

When creating memories for code documentation, use these specific categories:

### 1. **ADR** - Architecture Decision Records
Use for high-level architectural decisions and design patterns that explain the "why" behind architectural choices.

**Example:**
```json
{
  "title": "ADR-001: Memory-based documentation over traditional docs",
  "content": "# ADR-001: Memory-Based Documentation Architecture\n\n**Date:** 2024-01-15\n\n**Context:** Need to choose between traditional documentation (README, wiki, etc.) and a memory-based system for LLM-friendly documentation.\n\n**Decision:** Use memory-based documentation with structured JSON format and semantic search capabilities.\n\n**Rationale:**\n- **LLM Compatibility:** Memories can be directly ingested by LLMs without parsing\n- **Semantic Search:** FlexSearch enables natural language queries across documentation\n- **Structured Data:** JSON format allows for precise source mapping and coverage analysis\n- **Version Control:** Git-friendly format enables tracking documentation changes\n- **Bidirectional Linking:** Enables discovery of related documentation\n\n**Trade-offs:**\n- **Learning Curve:** Team needs to learn new documentation format\n- **Tooling:** Requires custom tools for coverage analysis and management\n- **Migration:** Existing documentation needs conversion\n- **Search Dependency:** Relies on FlexSearch for effective discovery\n\n**Implementation Strategy:**\n- Start with critical architectural decisions and complex business logic\n- Gradually migrate existing documentation\n- Build tooling for coverage analysis and quality assessment\n- Establish patterns for linking related memories",
  "category": "ADR",
  "tags": ["architecture", "documentation", "memory-system", "llm-integration"],
  "sources": ["src/memory/", "src/utils/flexsearch.ts", "src/memory/memory-service.ts"]
}
```

### 2. **DOC** - Documentation about features, business logic, edge-cases, classes and functions
Use for documenting specific code elements, functions, classes or features, business logic, edge cases.

**Example:**
```json
{
  "title": "MemoryService validation and error handling patterns",
  "content": "# MemoryService: Validation and Error Handling Architecture\n\n**Purpose:** Core service for memory operations with comprehensive validation and robust error handling.\n\n**Critical Business Rules:**\n\n**Memory Creation Validation:**\n- **Title Requirements:** 1-200 characters, no HTML tags, must be unique within category\n- **Content Sanitization:** Strips HTML but preserves markdown formatting\n- **Category Handling:** Defaults to 'general' if not specified, validates against allowed categories\n- **Size Limits:** 10MB max content size to prevent memory issues\n\n**Error Handling Strategy:**\n- **Validation Errors:** Return 400 with specific field errors and suggestions\n- **Network Failures:** Implement exponential backoff with max 3 retries\n- **Concurrent Access:** Use optimistic locking to prevent race conditions\n- **Partial Failures:** Rollback changes if any part of the operation fails\n\n**Performance Optimizations:**\n- **Async Validation:** Non-blocking validation to maintain responsiveness\n- **Batch Operations:** Process multiple memories in single transaction\n- **Background Indexing:** Search index updates happen asynchronously\n- **Caching Strategy:** LRU cache for frequently accessed memories\n\n**Edge Cases Handled:**\n- **Circular References:** Detect and prevent infinite loops in memory linking\n- **Duplicate Prevention:** Allow same title across different categories\n- **Content Encoding:** Handle UTF-8, HTML entities, and special characters\n- **Memory Limits:** Graceful degradation when approaching system limits\n\n**Integration Points:**\n- **SearchService:** Automatic indexing of new memories\n- **LinkService:** Bidirectional link management\n- **FileService:** Persistent storage with atomic writes\n- **ValidationService:** Centralized validation logic",
  "category": "DOC",
  "tags": ["validation", "error-handling", "business-logic", "performance", "architecture"],
  "sources": ["src/memory/memory-service.ts:25-75", "src/memory/types.ts:15-30", "src/memory/validation-service.ts"]
}
```

### 3. **CTX** - Context memories for LLM sessions
Use for any information that would be valuable for LLMs to remember during development sessions.

**Example:**
```json
{
  "title": "Memory system development patterns and conventions",
  "content": "# Memory System Development Patterns\n\n**Core Development Principles:**\n\n**Memory Creation Patterns:**\n- Always validate input before processing\n- Use structured error responses with specific field errors\n- Implement idempotent operations where possible\n- Handle concurrent access with optimistic locking\n\n**Search and Discovery Patterns:**\n- Use semantic search for natural language queries\n- Implement fuzzy matching for typo tolerance\n- Cache frequently accessed search results\n- Provide relevance scoring for search results\n\n**Data Integrity Patterns:**\n- Use bidirectional linking to maintain referential integrity\n- Implement atomic operations for multi-step processes\n- Validate data consistency on read operations\n- Use transactions for complex operations\n\n**Performance Optimization Patterns:**\n- Async operations for non-blocking user experience\n- Background processing for heavy operations\n- LRU caching for frequently accessed data\n- Batch operations for bulk processing\n\n**Error Handling Patterns:**\n- Return structured error responses with actionable messages\n- Implement graceful degradation for non-critical features\n- Use exponential backoff for retry operations\n- Log errors with sufficient context for debugging\n\n**Testing Patterns:**\n- Unit tests for business logic validation\n- Integration tests for service interactions\n- Performance tests for search operations\n- Error scenario testing for edge cases\n\n**Code Organization Patterns:**\n- Separate concerns: validation, business logic, data access\n- Use dependency injection for testability\n- Implement interfaces for service contracts\n- Keep services focused on single responsibilities",
  "category": "CTX",
  "tags": ["patterns", "conventions", "development", "architecture", "best-practices"],
  "sources": ["src/memory/", "src/utils/", "tests/"]
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
