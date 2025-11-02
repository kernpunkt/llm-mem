# @llm-mem/mem-tools

CLI tools for memory management operations. Provides command-line access to the same memory management functionality available through the MCP server.

## Installation

Install the package in your project:

```bash
pnpm add @llm-mem/mem-tools
# or
npm install @llm-mem/mem-tools
```

Or use from the monorepo workspace:

```bash
# From monorepo root
pnpm build
# Then use the binary directly
./packages/mem-tools/dist/cli.js
```

## Quick Start

```bash
# Show help
mem-tools --help

# Read a memory by ID or title
mem-tools read-mem --identifier="memory-title"

# Search memories
mem-tools search-mem --query="search terms" --limit=10

# Get memory statistics
mem-tools get-mem-stats
```

## Usage

### Commands Overview

All commands support the following global options:
- `--config=PATH` - Path to config file
- `--memoryStorePath=PATH` - Path to memory store directory
- `--indexPath=PATH` - Path to search index directory
- `--json` - Output results as JSON
- `--help, -h` - Show help message

### read-mem

Retrieves a memory by ID or title with optional formatting.

```bash
# Read by title (default markdown format)
mem-tools read-mem --identifier="My Memory Title"

# Read by UUID
mem-tools read-mem --identifier="550e8400-e29b-41d4-a716-446655440000"

# Read in plain text format (content only)
mem-tools read-mem --identifier="title" --format=plain

# Read in JSON format
mem-tools read-mem --identifier="title" --format=json

# JSON output flag (alternative)
mem-tools read-mem --identifier="title" --json
```

**Options:**
- `--identifier` (required) - Memory ID (UUID) or title
- `--format` - Output format: `markdown` (default), `plain`, or `json`

### search-mem

Searches memories using full-text search with optional filters.

```bash
# Basic search
mem-tools search-mem --query="python tutorial"

# Limit results
mem-tools search-mem --query="api" --limit=5

# Filter by category
mem-tools search-mem --query="documentation" --category="DOC"

# Filter by tags
mem-tools search-mem --query="code" --tags="tutorial,beginner"

# JSON output
mem-tools search-mem --query="test" --json
```

**Options:**
- `--query` (required) - Search terms
- `--limit` - Maximum number of results (default: 10)
- `--category` - Filter by category
- `--tags` - Comma-separated list of tags to filter by

### list-mems

Lists all memories with optional filtering by category, tags, and limit.

```bash
# List all memories (default limit: 100)
mem-tools list-mems

# Filter by category
mem-tools list-mems --category="general"

# Filter by tags
mem-tools list-mems --tags="important,reference"

# Limit results
mem-tools list-mems --limit=50

# JSON output
mem-tools list-mems --json
```

**Options:**
- `--category` - Filter by category
- `--tags` - Comma-separated list of tags
- `--limit` - Maximum number of results (default: 100)

### link-mem

Creates bidirectional links between two memories.

```bash
# Link two memories
mem-tools link-mem --source-id="uuid1" --target-id="uuid2"

# Link with custom link text
mem-tools link-mem --source-id="uuid1" --target-id="uuid2" --link-text="Related Article"
```

**Options:**
- `--source-id` (required) - ID of the source memory
- `--target-id` (required) - ID of the target memory to link to
- `--link-text` - Custom link text (defaults to target title)

### unlink-mem

Removes bidirectional links between two memories.

```bash
mem-tools unlink-mem --source-id="uuid1" --target-id="uuid2"
```

**Options:**
- `--source-id` (required) - ID of the source memory
- `--target-id` (required) - ID of the target memory to unlink

### reindex-mems

Reindexes all memories in the store. Useful after bulk operations or when search isn't working correctly.

```bash
mem-tools reindex-mems
```

No options required.

### needs-review

Finds memories that need review before a specified date.

```bash
# Find memories needing review before a date
mem-tools needs-review --date="2024-01-15T00:00:00Z"

# Use current date (30 days ago)
mem-tools needs-review --date="2024-12-01T00:00:00Z"
```

**Options:**
- `--date` (required) - Cutoff date in ISO format (e.g., '2024-01-15T00:00:00Z')

### get-mem-stats

Returns comprehensive statistics about the memory store.

```bash
# Get full statistics report
mem-tools get-mem-stats

# JSON output
mem-tools get-mem-stats --json
```

No options required. Provides insights about:
- Total memories and averages
- Link analysis (orphaned, broken, mismatched links)
- Category and tag distribution
- Content analysis
- Recommendations

### fix-links

Fixes and recreates proper link structure for a memory by cleaning up broken links.

```bash
mem-tools fix-links --memory-id="uuid"
```

**Options:**
- `--memory-id` (required) - ID of the memory to fix links for

## Configuration

The CLI automatically detects configuration files in the current directory and parent directories. You can also specify configuration via command-line arguments.

### Configuration File Format

Create a `.memory.config.json` file in your project root:

```json
{
  "memoryStorePath": "./memories",
  "indexPath": "./memories/index"
}
```

### Configuration Priority

Configuration is resolved in this order (highest to lowest priority):

1. **CLI Arguments** - `--memoryStorePath` and `--indexPath` always take precedence
2. **Config File** - `.memory.config.json` (auto-discovered or via `--config`)
3. **Defaults** - `./memories` and `./memories/index`

### Examples

```bash
# Use config file from current directory
mem-tools list-mems

# Override config file with CLI args
mem-tools list-mems --memoryStorePath=./custom-memories

# Use explicit config file
mem-tools list-mems --config=./configs/prod.json

# Mix: CLI arg for one, config file for the other
mem-tools list-mems --indexPath=./custom-index
# Uses: config file's memoryStorePath (or default) + custom-index
```

## Working Without Config Files

You can use the CLI without any config files by providing paths directly:

```bash
# No config file needed - use CLI args only
mem-tools read-mem \
  --identifier="test" \
  --memoryStorePath=./my-memories \
  --indexPath=./my-memories/index

# Or just override one path
mem-tools read-mem \
  --identifier="test" \
  --memoryStorePath=./custom-memories
# Uses: custom-memories + default indexPath or config file indexPath
```

## Output Formats

Most commands support `--json` flag for machine-readable output:

```bash
# Human-readable (default)
mem-tools search-mem --query="test"

# JSON output
mem-tools search-mem --query="test" --json
```

The `read-mem` command supports multiple formats:
- `markdown` (default) - Full markdown with YAML frontmatter
- `plain` - Content only, no metadata
- `json` - Complete memory object as JSON

## Integration with MCP Server

The CLI uses the same shared tool functions as the MCP server, ensuring:
- **Feature parity** - All operations work identically
- **Consistent behavior** - Same validation, formatting, and error handling
- **Shared codebase** - Updates to shared tools benefit both CLI and MCP

## Development

```bash
# Build the CLI
pnpm build

# Development mode with hot-reload
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Error Handling

The CLI provides clear error messages:

```bash
# Missing required argument
$ mem-tools read-mem
Error: --identifier is required

# Memory not found
$ mem-tools read-mem --identifier="nonexistent"
Memory not found: nonexistent

# Invalid date format
$ mem-tools needs-review --date="invalid"
Error: needs_review failed: ...
```

Exit codes:
- `0` - Success
- `1` - Error (missing args, memory not found, etc.)

## Examples

### Daily Workflow

```bash
# Morning: Check what needs review
mem-tools needs-review --date="$(date -u -v-30d +%Y-%m-%dT00:00:00Z)" 2>/dev/null

# Search for related memories
mem-tools search-mem --query="api documentation" --limit=5

# Read a specific memory
mem-tools read-mem --identifier="API Design Patterns"

# Check memory store health
mem-tools get-mem-stats
```

### Memory Management

```bash
# List all memories by category
mem-tools list-mems --category="DOC" --limit=20

# Find memories with specific tags
mem-tools list-mems --tags="important,reference"

# Link related memories
mem-tools link-mem \
  --source-id="550e8400-e29b-41d4-a716-446655440000" \
  --target-id="660e8400-e29b-41d4-a716-446655440001"

# Fix broken links in a memory
mem-tools fix-links --memory-id="550e8400-e29b-41d4-a716-446655440000"

# Reindex after bulk changes
mem-tools reindex-mems
```

### Automation

```bash
# Get memory count as JSON for scripts
mem-tools get-mem-stats --json | jq '.total_memories'

# Export all memories as JSON
mem-tools list-mems --json > memories-backup.json

# Find memories needing attention
mem-tools needs-review --date="2024-01-01T00:00:00Z" --json | jq '.memories[] | .id'
```

## Comparison with MCP Server

| Feature | CLI (`mem-tools`) | MCP Server |
|---------|------------------|------------|
| **Interface** | Command-line | JSON-RPC (via MCP protocol) |
| **Output** | Stdout (text/JSON) | JSON-RPC responses |
| **Usage** | Direct execution | Via MCP clients (Cursor, Claude Desktop) |
| **Configuration** | Config files + CLI args | Environment variables + CLI args |
| **Best For** | Scripts, automation, CI/CD | IDE integration, LLM assistants |

Both interfaces use the same underlying shared tools, ensuring consistent behavior.

## Troubleshooting

### Memory not found

```bash
# Check if memory exists
mem-tools list-mems | grep "your-title"

# Verify memory store path
mem-tools list-mems --memoryStorePath=./memories
```

### Search not working

```bash
# Reindex memories
mem-tools reindex-mems

# Check index path
mem-tools list-mems --indexPath=./memories/index
```

### Configuration issues

```bash
# Check what config is being used
mem-tools list-mems --verbose  # If verbose flag is added

# Override config explicitly
mem-tools list-mems --config=./.memory.config.json
```

## See Also

- `@llm-mem/mcp` - MCP server implementation
- `@llm-mem/shared` - Shared memory management library
- `@llm-mem/cli` - Coverage analysis CLI
