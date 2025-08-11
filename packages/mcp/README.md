# @llm-mem/mcp

Memory Management MCP Server - Comprehensive memory tools for LLMs with FlexSearch and SQLite.

## Features

- **MCP 2025-06-18 Compliance**: Full Model Context Protocol support
- **Dual Transport**: Stdio (production) and HTTP (development) modes
- **Memory Tools**: Comprehensive memory management and search capabilities
- **FlexSearch Integration**: Fast, flexible text search
- **SQLite Storage**: Persistent memory storage

## Installation

### From GitHub
```bash
npm install -g github:yourusername/llm-mem#main --workspace=packages/mcp
```

### From Local Development
```bash
git clone https://github.com/yourusername/llm-mem.git
cd llm-mem
pnpm install
pnpm build:mcp
npm install -g packages/mcp
```

## Usage

### Stdio Transport (Production)
```bash
# Start MCP server with stdio transport
pnpm start:mcp:stdio
```

### HTTP Transport (Development)
```bash
# Start MCP server with HTTP transport
pnpm start:mcp:http

# Custom port
pnpm start:mcp:http:port
```

## Configuration

Set environment variables in `.env`:

```bash
# API keys for external services
YOUR_API_KEY=your-key-here

# Server configuration
MCP_HTTP_PORT=3001
MCP_HTTP_HOST=localhost
```

## Development

```bash
# Build the MCP server
pnpm build

# Watch for changes
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## MCP Client Integration

### Cursor IDE
```json
{
  "mcpServers": {
    "llm-mem": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/index.js"],
      "env": {
        "YOUR_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Claude Desktop
```json
{
  "mcpServers": {
    "llm-mem": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/index.js"]
    }
  }
}
```
