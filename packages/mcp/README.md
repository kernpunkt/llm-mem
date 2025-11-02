# @llm-mem/mcp

**Memory Management MCP Server** - A comprehensive Model Context Protocol server that provides powerful memory management, search, and documentation tools for LLMs and AI assistants.

## 🚀 What This Server Does

The `@llm-mem/mcp` server transforms how AI assistants work with long-term memory and knowledge. Instead of starting each conversation from scratch, it provides:

- **Persistent Memory Storage**: Store and retrieve information across sessions
- **Intelligent Search**: Find relevant memories using semantic search
- **Documentation Management**: Organize and link knowledge systematically
- **Context Awareness**: Provide relevant background information when needed

## ✨ Key Features

- **🔧 MCP 2025-06-18 Compliant**: Full Model Context Protocol specification support
- **🚀 Dual Transport Modes**: Stdio (production) and HTTP (development)
- **💾 Persistent Storage**: SQLite-based memory store with FlexSearch indexing
- **🔍 Advanced Search**: Semantic search with filtering and relevance scoring
- **📚 Memory Categories**: Organize memories by type (DOC, ADR, CTX)
- **🔗 Bidirectional Linking**: Create connections between related memories
- **📊 Memory Analytics**: Comprehensive statistics and health monitoring
- **🔄 Reindexing**: Automatic and manual memory reindexing

## 🛠️ Available Tools

### Core Memory Operations
- **`write_mem`** - Create new memories with metadata, content, and optional abstract
- **`read_mem`** - Retrieve memories by ID or title
- **`edit_mem`** - Update existing memory content, metadata, and abstract
- **`search_mem`** - Full-text search with filters and relevance scoring (searches title, content, and abstract)
- **`list_mems`** - Browse memories with filtering and pagination

### Advanced Features
- **`link_mem`** - Create bidirectional links between memories
- **`unlink_mem` - Remove memory connections
- **`reindex_mems`** - Rebuild search indexes
- **`get_mem_stats`** - Memory store analytics and health metrics
- **`needs_review`** - Find memories requiring review

### Utility Tools
- **`get_current_date`** - Date/time utilities for timestamps
- **`get_usage_info`** - Comprehensive usage documentation
- **`get_flexsearch_config`** - Current search configuration
- **`get_allowed_values`** - View current category and tag restrictions

## 🚀 Quick Start

### 1. Installation
see README.md in [...]/LLM-MEM

### 2. Installation in cursor
see mcp.json.example in /src/_examples

### 3. Basic Usage

```bash
# Create your first memory
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_mem","arguments":{"title":"Getting Started","content":"This is my first memory using the MCP server.","category":"DOC","tags":["tutorial","first"]}}}' | node node_modules/llm-mem/packages/mcp/dist/index.js --transport=stdio

# Search for memories
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_mem","arguments":{"query":"getting started"}}}' | node node_modules/llm-mem/packages/mcp/dist/index.js --transport=stdio
```

## 🔧 Configuration

### Command Line Options

```bash
node dist/index.js [options]

Options:
  --transport=stdio|http     Transport type (default: stdio)
  --port=NUMBER             HTTP port (default: 3000, HTTP only)
  --memoryStorePath=PATH    Memory store location (default: ./memories)
  --indexPath=PATH          Search index location (default: ./memories/index)
```

### Environment Variables
also see /src/_examples/env.example

Create a `.env` file in your project root to configure the server:

```bash
# Memory Storage Configuration
MEMORY_STORE_PATH=./memories
MEMORY_INDEX_PATH=./memories/index

# Category and Tag Restrictions (Optional)
# If not set, any categories and tags are allowed
# If set, only the specified values are allowed (comma-separated)

# Example: Restrict categories to specific values
ALLOWED_CATEGORIES=DOC,CTX,ADR

# Example: Restrict tags to specific values  
ALLOWED_TAGS=important,urgent,review,archive
```

**Category and Tag Validation:**
- When `ALLOWED_CATEGORIES` is set, only the specified categories can be used
- When `ALLOWED_TAGS` is set, only the specified tags can be used
- Values are comma-separated and whitespace is automatically trimmed
- If not set, any categories and tags are allowed (default behavior)
- Use the `get_allowed_values` tool to see current restrictions

### FlexSearch Configuration

The server uses FlexSearch for fast, semantic search capabilities. 
See https://github.com/nextapps-de/flexsearch/blob/master/README.md fo a deeper understanding.
You can customize the search behavior using these environment variables:

#### Tokenization Options
- **`FLEXSEARCH_TOKENIZE`** - Tokenization strategy (`strict`, `forward`, `reverse`, `full`, `tolerant`)
- **`FLEXSEARCH_RESOLUTION`** - Search precision (1-20, higher = more precise but slower)
- **`FLEXSEARCH_DEPTH`** - Search thoroughness (1-10, higher = more thorough but slower)
- **`FLEXSEARCH_THRESHOLD`** - Match leniency (0-10, lower = more lenient)
- **`FLEXSEARCH_LIMIT`** - Maximum search results (1-1000)
- **`FLEXSEARCH_SUGGEST`** - Enable search suggestions

#### Encoder Options
- **`FLEXSEARCH_CHARSET`** - Character encoding strategy (`exact`, `normalize`, `latinbalance`, etc.)
- **`FLEXSEARCH_LANGUAGE`** - Language optimizations (`en`, `de`, `fr`)
- **`FLEXSEARCH_STOPWORDS`** - JSON array of stopwords to filter out
- **`FLEXSEARCH_MIN_LENGTH`** - Minimum term length to index (1-10)
- **`FLEXSEARCH_MAX_LENGTH`** - Maximum term length to index (5-50)

#### Context Search Options
- **`FLEXSEARCH_CONTEXT`** - Enable context-aware search (finds terms near each other)
- **`FLEXSEARCH_CONTEXT_RESOLUTION`** - Context search precision (1-20)
- **`FLEXSEARCH_CONTEXT_DEPTH`** - Context search depth (1-10)
- **`FLEXSEARCH_CONTEXT_BIDIRECTIONAL`** - Enable bidirectional context search

**Example FlexSearch Configuration:**
```bash
# Optimize for German language with context search
FLEXSEARCH_LANGUAGE=de
FLEXSEARCH_CONTEXT=true
FLEXSEARCH_RESOLUTION=12
FLEXSEARCH_DEPTH=4

# Custom stopwords for technical documentation
FLEXSEARCH_STOPWORDS=["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]
```

**View Current Configuration:**
Use the `get_flexsearch_config` tool to see your current FlexSearch settings.

## 🔌 MCP Client Integration

### Cursor IDE Configuration

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "llm-mem": {
      "command": "node",
      "args": [
        "./node_modules/llm-mem/packages/mcp/dist/index.js",
        "--memoryStorePath=./memories",
        "--indexPath=./memories/index"
      ],
    }
  }
}
```

### Claude Desktop Configuration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "llm-mem": {
      "command": "node",
      "args": ["/absolute/path/to/node_modules/llm-mem/packages/mcp/dist/index.js"]
    }
  }
}
```

## 📚 Memory Structure

### Memory Format

Each memory is stored as a markdown file with YAML frontmatter:

```markdown
---
id: "uuid-here"
title: "Memory Title"
category: "DOC"
tags: ["tag1", "tag2"]
sources: ["source1", "source2"]
abstract: "Short summary of the memory content (optional)"
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:00:00Z"
last_reviewed: "2024-01-15T10:00:00Z"
---

Memory content in markdown format.

Can include:
- **Bold text**
- *Italic text*
- [Links](https://example.com)
- Code blocks
- Lists
- And more...
```

### Abstract Field

The `abstract` field is an optional short summary of the memory content, typically 1-2 sentences (150-200 characters recommended). When provided:

- **Searchable**: The abstract is indexed and searchable alongside title and content
- **Visible in Results**: Abstract appears in search results for quick context
- **LLM-Generated**: The calling LLM should generate the abstract when creating or editing memories

Example:
```markdown
---
abstract: "Discussed Q4 revenue targets, product launch timeline, and team expansion plans."
---
```

## 🔍 Search Capabilities

### Basic Search
```json
{
  "method": "tools/call",
  "params": {
    "name": "search_mem",
    "arguments": {
      "query": "machine learning",
      "limit": 10
    }
  }
}
```

### Advanced Search with Filters
```json
{
  "method": "tools/call",
  "params": {
    "name": "search_mem",
    "arguments": {
      "query": "API design",
      "category": "DOC",
      "tags": ["backend", "design"],
      "limit": 5
    }
  }
}
```

## 📊 Memory Analytics

Get comprehensive insights about your memory store:

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_mem_stats",
    "arguments": {}
  }
}
```

Returns:
- Total memory count
- Category distribution
- Tag frequency analysis
- Memory health metrics
- Storage statistics

## 🔄 Reindexing

When you add many memories or want to refresh search indexes:

```json
{
  "method": "tools/call",
  "params": {
    "name": "reindex_mems",
    "arguments": {}
  }
}
```

## 🏗️ Architecture

### Transport Layers
- **Stdio Transport**: Production-ready, direct process communication
- **HTTP Transport**: Development-friendly with REST endpoints

### Storage Layer
- **Memory Store**: File-based storage with markdown + YAML frontmatter
- **Search Index**: FlexSearch for fast, semantic search capabilities
- **Database**: SQLite for index storage

### Tool Layer
- **Memory Tools**: Core CRUD operations
- **Search Tools**: Query and retrieval capabilities
- **Utility Tools**: Helper functions and system information

## 🧪 Development

### Building
```bash
# Build the server
pnpm build:mcp

# Watch mode
pnpm dev:mcp

# Clean build artifacts
pnpm clean:mcp
```

### Testing
```bash
# Run all tests
pnpm test:mcp

# Watch mode
pnpm test:mcp:watch

# Coverage report
pnpm test:mcp:coverage
```

### Code Quality
```bash
# Type checking
pnpm typecheck:mcp

# Linting
pnpm lint:mcp

# Fix linting issues
pnpm lint:mcp:fix
```

## 🚨 Troubleshooting

### Common Issues

**Server won't start**
- Check Node.js version (requires 24+)
- Verify all dependencies are installed
- Check file permissions for memory store directory

**Search not working**
- Ensure memories have been indexed (`reindex_mems`)
- Check FlexSearch configuration
- Verify memory store paths are correct

**Memory not found**
- Check memory ID/title spelling
- Verify memory exists in store
- Check category and tag filters

## 📖 Examples

### Creating a Knowledge Base

```bash
# 1. Create project documentation
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_mem","arguments":{"title":"Project Overview","content":"This project implements a memory management system for AI assistants.","category":"DOC","tags":["project","overview"]}}}' | node node_modules/llm-mem/packages/mcp/dist/index.js --transport=stdio

# 2. Add technical decisions
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"write_mem","arguments":{"title":"Use SQLite for Storage","content":"We chose SQLite for its reliability and zero-configuration setup.","category":"ADR","tags":["architecture","storage","sqlite"]}}}' | node node_modules/llm-mem/packages/mcp/dist/index.js --transport=stdio

# 3. Search for information
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_mem","arguments":{"query":"storage architecture"}}}' | node node_modules/llm-mem/packages/mcp/dist/index.js --transport=stdio
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🔗 Related Packages

- **`@llm-mem/cli`** - Command-line interface for memory coverage analysis
- **`@llm-mem/shared`** - Shared utilities and core services

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kernpunkt/llm-mem/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kernpunkt/llm-mem/issues)
