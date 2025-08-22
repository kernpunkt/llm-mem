# Memory Tools MCP Server - LLM Usage Guide

## Overview

This MCP server provides powerful memory management tools designed to help you create, organize, and maintain high-quality documentation that serves both human readers and other AI assistants. Use these tools to build a comprehensive knowledge base that grows more valuable over time.

## Core Philosophy: Documentation That Serves Both Humans and LLMs

When using these tools, always think about creating content that:
- **Humans can easily scan and understand** - Clear structure, good formatting, logical flow
- **LLMs can efficiently process and retrieve** - Well-tagged, properly categorized, linked content
- **Gets better with use** - Each memory should reference and build upon existing knowledge

## Essential Tools for Effective Documentation

### 1. `write_mem` - Creating New Knowledge

**When to use:** Documenting new information, insights, or processes

**Best practices for LLMs:**
- **Write descriptive titles** that clearly indicate the content (e.g., "React Server Components Best Practices" not just "React Tips")
- **Use structured markdown** with headers, lists, and code blocks for easy scanning
- **Add comprehensive tags** that capture all relevant concepts (e.g., ["react", "server-components", "performance", "nextjs"])
- **Choose appropriate categories** to group related knowledge (e.g., "development", "architecture", "troubleshooting")
- **Include sources** when documenting external information or research

**Example workflow:**
```json
{
  "title": "Next.js 15 Server Actions Implementation Guide",
  "content": "# Next.js 15 Server Actions Implementation Guide\n\n## Overview\nServer Actions in Next.js 15 provide a powerful way to handle form submissions and data mutations directly from React components.\n\n## Key Benefits\n- **Type Safety**: Full TypeScript support with automatic validation\n- **Performance**: No additional API routes needed\n- **UX**: Optimistic updates and error handling built-in\n\n## Implementation Steps\n1. Create the server action\n2. Add form validation\n3. Handle errors gracefully\n4. Implement optimistic updates\n\n## Common Pitfalls\n- Forgetting to add 'use server' directive\n- Not handling loading states\n- Missing error boundaries\n\n## Related Concepts\n- React Server Components\n- Form validation patterns\n- Error handling strategies",
  "tags": ["nextjs", "server-actions", "react", "typescript", "forms", "validation"],
  "category": "development",
  "sources": ["https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions"]
}
```

### 2. `search_mem` - Finding Existing Knowledge

**When to use:** Before creating new content, when you need to reference existing information, or to avoid duplicating knowledge

**Best practices for LLMs:**
- **Search before writing** to see if similar content already exists
- **Use multiple search terms** to find related memories
- **Filter by category and tags** to narrow down results
- **Review existing content** to understand what's already documented

**Critical for coding tasks:** Always search and read existing documentation before starting new development work. This improves your context and leads to better, more consistent code.

**Example searches:**
```json
// Before writing about React performance
{
  "query": "React performance optimization techniques",
  "category": "development",
  "tags": ["react", "performance"]
}

// Finding troubleshooting guides
{
  "query": "Next.js build errors deployment issues",
  "category": "troubleshooting",
  "limit": 5
}
```

### 3. `edit_mem` - Improving and Updating Knowledge

**When to use:** Updating outdated information, adding new insights, correcting errors, or expanding existing content

**Best practices for LLMs:**
- **Preserve valuable existing content** while adding new information
- **Update timestamps and review dates** to maintain freshness
- **Add new tags** when content scope expands
- **Link to related memories** to create knowledge connections
- **Maintain version history** in the content itself

**Example update:**
```json
{
  "id": "existing-memory-id",
  "content": "# Updated Next.js 15 Server Actions Guide\n\n## Overview\nServer Actions in Next.js 15 provide a powerful way to handle form submissions and data mutations directly from React components.\n\n## Key Benefits\n- **Type Safety**: Full TypeScript support with automatic validation\n- **Performance**: No additional API routes needed\n- **UX**: Optimistic updates and error handling built-in\n- **Streaming**: Support for streaming responses (NEW in 15.3)\n\n## Implementation Steps\n1. Create the server action\n2. Add form validation\n3. Handle errors gracefully\n4. Implement optimistic updates\n5. Configure streaming responses (NEW)\n\n## Common Pitfalls\n- Forgetting to add 'use server' directive\n- Not handling loading states\n- Missing error boundaries\n- Ignoring streaming capabilities\n\n## Related Concepts\n- React Server Components\n- Form validation patterns\n- Error handling strategies\n- Streaming responses\n\n## Update History\n- 2024-01-15: Added streaming response information\n- 2024-01-10: Initial version created",
  "tags": ["nextjs", "server-actions", "react", "typescript", "forms", "validation", "streaming"]
}
```

### 4. `link_mem` - Creating Knowledge Networks

**When to use:** When you discover relationships between different pieces of knowledge, when content references other concepts, or to create navigable knowledge graphs

**Best practices for LLMs:**
- **Link related concepts** to help readers discover connected information
- **Create bidirectional relationships** so knowledge flows both ways
- **Use descriptive link text** that explains the relationship
- **Don't over-link** - only link when there's a meaningful connection

**Example linking:**
```json
{
  "source_id": "nextjs-server-actions-memory-id",
  "target_id": "react-server-components-memory-id",
  "link_text": "Builds upon React Server Components concepts"
}
```

### 5. `read_mem` - Retrieving and Reviewing Knowledge

**When to use:** When you need to reference existing content, review what you've written, or understand the current state of knowledge

**Best practices for LLMs:**
- **Use different formats** based on your needs:
  - `markdown` for editing or reviewing
  - `plain` for extracting just the content
  - `json` for programmatic processing
- **Read memories before editing** to understand current content
- **Use for fact-checking** when writing new content

## Advanced Documentation Strategies

### Building Comprehensive Knowledge Bases

1. **Start with overview documents** that provide high-level understanding
2. **Create detailed implementation guides** for specific topics
3. **Develop troubleshooting sections** for common problems
4. **Maintain reference materials** for quick lookups
5. **Link everything together** to create a navigable knowledge graph

### The Documentation-First Development Workflow

**Before starting any coding task:**
1. **Search existing documentation** for related patterns, solutions, or guidelines
2. **Read relevant memories** to understand established conventions and approaches
3. **Check for similar implementations** to avoid reinventing solutions
4. **Review architectural decisions** to maintain consistency with existing code

**Why this matters:**
- **Better context** leads to more informed technical decisions
- **Consistent patterns** across your codebase improve maintainability
- **Avoiding duplication** saves time and reduces technical debt
- **Learning from past solutions** prevents repeating mistakes
- **Building on existing knowledge** creates more robust implementations

**Example workflow for a new feature:**
```json
// 1. Search for existing patterns
{
  "query": "authentication middleware implementation patterns",
  "category": "development",
  "tags": ["authentication", "middleware", "security"]
}

// 2. Read related memories to understand context
{
  "identifier": "auth-middleware-patterns-memory-id",
  "format": "markdown"
}

// 3. Check for similar implementations
{
  "query": "user authentication flow login logout",
  "category": "development"
}

// 4. Then start coding with full context
```

### Content Organization Patterns

**Hierarchical Structure:**
- **Category** → **Topic** → **Specific Implementation**
- Example: `development` → `frontend` → `react-hooks-custom`

**Tag-Based Organization:**
- Use consistent tag naming conventions
- Group related tags together
- Avoid overly specific or overly broad tags

**Temporal Organization:**
- Keep content current with regular updates
- Use the `needs_review` tool to identify outdated content
- Maintain update histories in your content

### Quality Assurance for LLMs

**Before saving any memory:**
1. **Search for existing content** to avoid duplication
2. **Check if you can enhance existing content** instead of creating new
3. **Ensure proper categorization and tagging**
4. **Link to related memories** when appropriate
5. **Include sources** for external information

**Regular maintenance:**
1. **Use `needs_review`** to identify outdated content
2. **Search for similar content** and consider consolidation
3. **Update tags and categories** as your knowledge base evolves
4. **Remove broken links** and update references

## Tool Reference

### Core Tools
- `write_mem` - Create new memories
- `read_mem` - Retrieve existing memories
- `edit_mem` - Update and improve memories
- `search_mem` - Find relevant knowledge
- `link_mem` - Connect related memories
- `unlink_mem` - Remove connections

### Maintenance Tools
- `needs_review` - Find outdated content
- `reindex_mems` - Rebuild search indexes
- `migrate_memory_files` - Update file formats
- `get_current_date` - Get timestamps for updates

## Success Metrics

Your documentation is working well when:
- **Humans can quickly find** what they need
- **LLMs can efficiently retrieve** relevant information
- **Content builds upon itself** rather than repeating
- **Knowledge is discoverable** through search and links
- **Content stays current** and relevant
- **Developers read docs first** before starting new coding tasks
- **Code quality improves** due to better context and established patterns
- **Technical decisions are consistent** across the codebase

## Remember: You're Building for the Future

Every memory you create becomes part of a growing knowledge base that will help:
- **Future you** remember important details
- **Other AI assistants** understand context and history
- **Human users** find solutions quickly
- **Your team** maintain institutional knowledge

**The virtuous cycle of documentation:**
1. **Write good docs** when developing features
2. **Read existing docs** before starting new work
3. **Improve docs** based on what you learn while coding
4. **Repeat** - each cycle makes your knowledge base more valuable

Focus on creating content that gets more valuable over time, not just documenting what you know today. Remember: the best documentation is both written and read consistently. 