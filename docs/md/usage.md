# Memory Tools MCP Server - Usage Guide

## Overview

This MCP (Model Context Protocol) server provides comprehensive memory management capabilities for AI assistants. It allows you to store, retrieve, edit, search, and link memories in a structured way using markdown files with YAML frontmatter.

## Available Tools

### 1. `get_current_date`
Returns the current date and time in various formats.

**Parameters:**
- `format` (optional): Output format - `"iso"`, `"locale"`, `"timestamp"`, or `"date_only"`

**Example:**
```json
{
  "format": "iso"
}
```

**Response:**
```
2024-01-15T10:30:00.000Z (UTC)
```

### 2. `write_mem`
Creates a new memory as a markdown file and indexes it for search.

**Parameters:**
- `title` (required): Title of the memory
- `content` (required): Content in markdown format
- `tags` (optional): Array of tags for categorization
- `category` (optional): Category for organization (default: "general")
- `sources` (optional): Array of references/sources

**Example:**
```json
{
  "title": "Meeting with John about Q4 goals",
  "content": "# Q4 Goals Discussion\n\n**Date:** 2024-01-15\n\n**Key Points:**\n- Revenue target: $2M\n- New product launch in March\n- Team expansion planned",
  "tags": ["meeting", "goals", "q4"],
  "category": "work",
  "sources": ["https://example.com/meeting-notes"]
}
```

**Response:**
```
id: 550e8400-e29b-41d4-a716-446655440000
file: ./memories/work|meeting-with-john-about-q4-goals|550e8400-e29b-41d4-a716-446655440000.md
created_at: 2024-01-15T10:30:00.000Z
```

### 3. `read_mem`
Retrieves a memory by ID or title with optional formatting.

**Parameters:**
- `identifier` (required): Memory ID or title
- `format` (optional): Output format - `"markdown"`, `"plain"`, or `"json"`

**Example:**
```json
{
  "identifier": "meeting-with-john-q4-goals",
  "format": "markdown"
}
```

**Response:** Returns the memory content in the requested format.

### 4. `edit_mem`
Updates an existing memory's content, title, tags, or category.

**Parameters:**
- `id` (required): Memory ID to edit
- `title` (optional): New title
- `content` (optional): New content
- `tags` (optional): New tags array
- `category` (optional): New category
- `sources` (optional): Updated sources array

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "# Updated Q4 Goals\n\n**Date:** 2024-01-15\n\n**Key Points:**\n- Revenue target: $2.5M (updated)\n- New product launch in March\n- Team expansion planned\n\n**Updated:** Added budget allocation details",
  "tags": ["meeting", "goals", "q4", "budget"]
}
```

### 5. `search_mem`
Searches through memories using full-text search with filters.

**Parameters:**
- `query` (required): Search terms
- `limit` (optional): Maximum results (default: 10)
- `category` (optional): Filter by category
- `tags` (optional): Filter by tags array

**Example:**
```json
{
  "query": "Q4 goals revenue",
  "limit": 5,
  "category": "work",
  "tags": ["goals"]
}
```

### 6. `link_mem`
Creates bidirectional links between two memories.

**Parameters:**
- `source_id` (required): ID of the source memory
- `target_id` (required): ID of the target memory
- `link_text` (optional): Custom link text

**Example:**
```json
{
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "link_text": "Related project ideas"
}
```

### 7. `unlink_mem`
Removes links between two memories.

**Parameters:**
- `source_id` (required): ID of the source memory
- `target_id` (required): ID of the target memory

**Example:**
```json
{
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

### 8. `get_usage_info`
Returns this usage guide.

**Parameters:** None

**Example:**
```json
{}
```

**Response:** Returns this markdown content.

## Memory File Structure

Memories are stored as markdown files with YAML frontmatter:

```markdown
---
id: 550e8400-e29b-41d4-a716-446655440000
title: Meeting with John about Q4 goals
tags: ["meeting", "goals", "q4"]
category: work
created_at: 2024-01-15T10:30:00Z
updated_at: 2024-01-15T10:30:00Z
last_reviewed: 2024-01-15T10:30:00Z
links: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
sources: ["https://example.com/meeting-notes"]
---

# Q4 Goals Discussion

**Date:** 2024-01-15

**Key Points:**
- Revenue target: $2M
- New product launch in March
- Team expansion planned

**Action Items:**
- [ ] Draft budget proposal
- [ ] Schedule follow-up meeting
- [ ] Update project timeline

**Related Memories:**
- [[work-project-ideas-brainstorm-6ba7b810-9dad-11d1-80b4-00c04fd430c8]]
```

## File Organization

Memory files are organized by category and stored with the naming pattern:
```
{category}|{slugified-title}|{uuid}.md
```

Example: `work|meeting-with-john-about-q4-goals|550e8400-e29b-41d4-a716-446655440000.md`

## Configuration

The server supports the following command-line arguments:

- `--notestore_path=PATH` - Path for memory files (default: `./memories`)
- `--index_path=PATH` - Path for FlexSearch index (default: `./memories/index`)
- `--transport=stdio|http` - Transport type (default: `stdio`)
- `--port=NUMBER` - HTTP port (default: `3000`)

## Usage Examples

### Creating a Memory
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "write_mem",
      "arguments": {
        "title": "Project Ideas",
        "content": "# My Project Ideas\n\n1. AI-powered note-taking\n2. Memory management system\n3. Knowledge graph builder",
        "tags": ["ideas", "projects"],
        "category": "personal"
      }
    }
  }'
```

### Searching Memories
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_mem",
      "arguments": {
        "query": "project ideas",
        "limit": 5,
        "category": "personal"
      }
    }
  }'
```

### Getting Usage Info
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_usage_info",
      "arguments": {}
    }
  }'
```

## Best Practices

1. **Use descriptive titles** that make memories easy to find
2. **Add relevant tags** for better categorization and search
3. **Use categories** to organize memories by context (work, personal, etc.)
4. **Include sources** when memories are based on external information
5. **Link related memories** to create a knowledge graph
6. **Use markdown formatting** to structure content clearly
7. **Regularly search and review** memories to maintain relevance

## Error Handling

The server provides clear error messages for common issues:
- Missing required parameters
- Invalid memory IDs
- File system errors
- Search query issues
- Link validation errors

All errors are returned in a structured format with helpful descriptions. 