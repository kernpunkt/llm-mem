# 🧠 Memory Tools MCP Server

A comprehensive memory management system for LLMs using FlexSearch for full-text search and SQLite for persistent storage. The system allows AI assistants to store, retrieve, edit, search, and link memories in a structured way.

---

## ⚡ Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourusername/memory-tools-mcp
cd memory-tools-mcp

# 2. Install and build
pnpm i(nstall) && pnpm build

# 3. Test it works
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | pnpm start
```

**✅ If you see memory tool definitions, you're ready!**

---

## 🛠️ Development

### Daily Commands
```bash
pnpm dev              # Development with hot-reload
pnpm start            # Run server (stdio mode)
pnpm start:http       # Run HTTP server for debugging
pnpm test             # Run tests
pnpm build            # Build for production
```

### Memory Tools Available

**📝 Core Memory Operations:**
- `write_mem` - Create new memories with markdown content
- `read_mem` - Retrieve memories by ID or title
- `edit_mem` - Update existing memories
- `search_mem` - Full-text search with filters
- `link_mem` - Create bidirectional links between memories
- `unlink_mem` - Remove links between memories

**🕐 Utility Tools:**
- `get_current_date` - Get current date/time for LLM context
- `get_usage_info` - Get usage documentation

### Command Line Arguments

```bash
# Default configuration
node dist/index.js

# Custom memory storage paths
node dist/index.js --notestore_path=/path/to/memories --index_path=/path/to/index

# HTTP transport for debugging
node dist/index.js --transport=http --port=3000

# Available options:
# --transport=stdio|http    - Transport type (default: stdio)
# --port=NUMBER            - HTTP port (default: 3000, HTTP only)
# --notestore_path=PATH    - Path for memory files (default: ./memories)
# --index_path=PATH        - Path for FlexSearch index (default: ./memories/index)
```

### Example Usage

**Create a memory:**
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
        "title": "Meeting with John about Q4 goals",
        "content": "# Q4 Goals Discussion\n\n**Date:** 2024-01-15\n\n**Key Points:**\n- Revenue target: $2M\n- New product launch in March",
        "tags": ["meeting", "goals", "q4"],
        "category": "work"
      }
    }
  }'
```

**Search memories:**
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
        "query": "Q4 goals revenue",
        "limit": 5,
        "category": "work"
      }
    }
  }'
```

---

## 🔌 Client Integration

### Cursor IDE
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "memory-tools": {
      "command": "node",
      "args": ["/absolute/path/to/memory-tools-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**Alternative using pnpm (automatically loads .env file):**
```json
{
  "mcpServers": {
    "memory-tools": {
      "command": "pnpm",
      "args": ["start"],
      "cwd": "/absolute/path/to/memory-tools-mcp"
    }
  }
}
```

### Claude Desktop
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "memory-tools": {
      "command": "node",
      "args": ["/absolute/path/to/memory-tools-mcp/dist/index.js"]
    }
  }
}
```

---

## 🧪 Testing

```bash
# Run comprehensive test suite (200 tests)
pnpm test
pnpm test:coverage
pnpm test:watch

# Test tools locally
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | pnpm start

# HTTP mode for debugging
pnpm start:http  # Then visit http://localhost:3000/health
./test-mcp-tools.sh # Test tools locally
```

**📖 See [TESTING.md](TESTING.md) for comprehensive testing patterns.**

---

## 📁 Memory File Structure

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

**Related Memories:**
- [[work-project-ideas-brainstorm-6ba7b810-9dad-11d1-80b4-00c04fd430c8]]
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Tools not showing | Check absolute paths in config |
| Permission denied | Run `chmod +x dist/index.js` |
| Module not found | Run `pnpm build` first |
| Server won't start | Check Node.js version (needs 24+) |
| Memory not found | Check file paths and permissions |
| Search not working | Verify FlexSearch index exists |

---

## 🔒 Security Best Practices

For production deployments:

1. **Authentication**: Implement proper auth if serving over HTTP
2. **Input Validation**: Always use Zod schemas for tool parameters
3. **Error Handling**: Never expose internal errors to clients
4. **Rate Limiting**: Consider rate limiting for HTTP endpoints
5. **HTTPS**: Use HTTPS in production environments
6. **File Permissions**: Ensure proper file system permissions for memory storage

**Note**: This server follows MCP 2025-06-18 specification including protocol version headers and enhanced capabilities.

---

## 📚 Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [FlexSearch Documentation](https://github.com/nextapps-de/flexsearch)
- [Zod Validation](https://zod.dev/)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
