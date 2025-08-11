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
- **`write_mem`** - Create new memories with metadata and content
- **`read_mem`** - Retrieve memories by ID or title
- **`edit_mem`** - Update existing memory content and metadata
- **`search_mem`** - Full-text search with filters and relevance scoring
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

## 🚀 Quick Start

### 1. Installation

```bash
# From GitHub (recommended)
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main

# Then use the MCP server
node node_modules/llm-mem/packages/mcp/dist/index.js --help
```

### 2. Start the Server

```bash
# Production mode (stdio transport)
node node_modules/llm-mem/packages/mcp/dist/index.js start:stdio

# Development mode (HTTP transport)
node node_modules/llm-mem/packages/mcp/dist/index.js start:http

# Custom port
node node_modules/llm-mem/packages/mcp/dist/index.js start:http --port=3001
```

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
created: "2024-01-15T10:00:00Z"
last_modified: "2024-01-15T10:00:00Z"
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

### Memory Categories

- **`DOC`** - Documentation and guides
- **`ADR`** - Architecture Decision Records
- **`CTX`** - Context and background information

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
- **Database**: SQLite for metadata and relationship management

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

### Debug Mode

Enable verbose logging by setting environment variables:

```bash
DEBUG=* node dist/index.js --transport=stdio
```

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
- **Documentation**: [Project Wiki](https://github.com/kernpunkt/llm-mem/wiki)
