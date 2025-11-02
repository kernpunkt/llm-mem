---
id: 93e0a3e8-7301-4fc9-9878-542bc7148243
title: CLI Command Reference - mem-tools
tags:
  - cli
  - commands
  - mem-tools
  - reference
category: DOC
created_at: '2025-11-02T10:13:24.417Z'
updated_at: '2025-11-02T10:13:31.444Z'
last_reviewed: '2025-11-02T10:13:24.417Z'
links:
  - 945c8dba-83d3-4803-a6cc-b42684f98ffb
  - 2015d5fc-7934-4f2d-9a34-f5f393456199
sources:
  - packages/mem-tools/README.md
  - packages/mem-tools/src/commands/
---

# CLI Command Reference

Complete reference for all `mem-tools` commands.

## Command Syntax

```bash
mem-tools <command> [options]
```

## Global Options

All commands support these options:
- `--config=PATH` - Path to config file
- `--memoryStorePath=PATH` - Override memory store path
- `--indexPath=PATH` - Override index path
- `--json` - Output as JSON
- `--help, -h` - Show help

## Commands

### read-mem

Retrieves a memory by ID or title.

**Usage:**
```bash
mem-tools read-mem --identifier="memory-title" [--format=markdown|plain|json] [--json]
```

**Options:**
- `--identifier` (required) - Memory UUID or title
- `--format` - Output format: `markdown` (default), `plain`, `json`

**Examples:**
```bash
mem-tools read-mem --identifier="API Design"
mem-tools read-mem --identifier="550e8400-..." --format=plain
mem-tools read-mem --identifier="title" --json
```

### search-mem

Searches memories using full-text search.

**Usage:**
```bash
mem-tools search-mem --query="terms" [--limit=10] [--category="cat"] [--tags="tag1,tag2"] [--json]
```

**Options:**
- `--query` (required) - Search terms
- `--limit` - Maximum results (default: 10)
- `--category` - Filter by category
- `--tags` - Comma-separated tags

**Examples:**
```bash
mem-tools search-mem --query="python tutorial"
mem-tools search-mem --query="api" --limit=5 --category="DOC"
mem-tools search-mem --query="code" --tags="tutorial,beginner" --json
```

### list-mems

Lists all memories with optional filtering.

**Usage:**
```bash
mem-tools list-mems [--category="cat"] [--tags="tag1,tag2"] [--limit=100] [--json]
```

**Options:**
- `--category` - Filter by category
- `--tags` - Comma-separated tags
- `--limit` - Maximum results (default: 100)

**Examples:**
```bash
mem-tools list-mems
mem-tools list-mems --category="general" --limit=50
mem-tools list-mems --tags="important,reference" --json
```

### link-mem

Creates bidirectional links between memories.

**Usage:**
```bash
mem-tools link-mem --source-id="uuid" --target-id="uuid" [--link-text="text"]
```

**Options:**
- `--source-id` (required) - Source memory UUID
- `--target-id` (required) - Target memory UUID
- `--link-text` - Custom link text (defaults to target title)

**Examples:**
```bash
mem-tools link-mem --source-id="uuid1" --target-id="uuid2"
mem-tools link-mem --source-id="uuid1" --target-id="uuid2" --link-text="Related"
```

### unlink-mem

Removes bidirectional links.

**Usage:**
```bash
mem-tools unlink-mem --source-id="uuid" --target-id="uuid"
```

**Options:**
- `--source-id` (required) - Source memory UUID
- `--target-id` (required) - Target memory UUID

### reindex-mems

Reindexes all memories in the store.

**Usage:**
```bash
mem-tools reindex-mems
```

No options required. Useful after bulk operations or when search isn't working.

### needs-review

Finds memories needing review before a date.

**Usage:**
```bash
mem-tools needs-review --date="2024-01-15T00:00:00Z" [--json]
```

**Options:**
- `--date` (required) - ISO format date string

**Examples:**
```bash
mem-tools needs-review --date="2024-01-15T00:00:00Z"
mem-tools needs-review --date="$(date -u -v-30d +%Y-%m-%dT00:00:00Z)"
```

### get-mem-stats

Returns comprehensive memory store statistics.

**Usage:**
```bash
mem-tools get-mem-stats [--json]
```

Provides:
- Total memories and averages
- Link analysis (orphaned, broken, mismatched)
- Category and tag distribution
- Content analysis
- Recommendations

**Examples:**
```bash
mem-tools get-mem-stats
mem-tools get-mem-stats --json | jq '.total_memories'
```

### fix-links

Fixes link structure for a memory.

**Usage:**
```bash
mem-tools fix-links --memory-id="uuid"
```

**Options:**
- `--memory-id` (required) - Memory UUID to fix

**What it does:**
1. Unlinks all current links
2. Removes markdown links from content
3. Recreates valid bidirectional links
4. Preserves external HTTP/HTTPS links

## Output Formats

### Human-Readable (Default)
Formatted text output optimized for terminal viewing.

### JSON (`--json`)
Machine-readable JSON for scripting and automation:

```bash
mem-tools search-mem --query="test" --json | jq '.results[].title'
mem-tools get-mem-stats --json > stats.json
```

### Format Options (read-mem)
- `markdown` - Full markdown with YAML frontmatter
- `plain` - Content only, no metadata
- `json` - Complete memory object

## Exit Codes

- `0` - Success
- `1` - Error (missing args, memory not found, etc.)

## Error Messages

The CLI provides clear error messages:
- Missing required arguments
- Memory not found
- Invalid date formats
- Configuration errors

## Related

- [[(DOC)(memory-cli-implementation-complete)(945c8dba-83d3-4803-a6cc-b42684f98ffb)|Memory CLI Implementation - Complete]]
- [[(DOC)(cli-configuration-system-mem-tools)(2015d5fc-7934-4f2d-9a34-f5f393456199)|CLI Configuration System - mem-tools]]
