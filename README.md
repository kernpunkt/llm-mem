# 🔧 MCP Server Template

Production-ready template with example tools including API integration, dual transport support, and modern stack (H3, Vitest, TypeScript).

---

## ⚡ Quick Start

```bash
# 1. Use this template on GitHub, then clone
git clone https://github.com/yourusername/your-mcp-server
cd your-mcp-server

# 2. Install and build
pnpm i(nstall) && pnpm build

# 3. Test it works
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | pnpm start
```

**✅ If you see tool definitions, you're ready!**

### Essential Customization

```bash
# Replace template placeholders
sed -i '' 's/mcp-template-server/your-server-name/g' package.json src/index.ts
sed -i '' 's/TODO: Your Name/Your Actual Name/g' package.json LICENSE

# Rebuild
pnpm build
```

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

### Example Tools Included

**📝 Basic Tools:**
- `echo` - String processing with optional formatting
- `calculate` - Mathematical operations (add, subtract, multiply, divide)
- `current_time` - System time in various formats

**🌐 API Integration Example:**
- `get_weather` - External API calls with comprehensive error handling

### Environment Configuration

Create a `.env` file in your project root:
```bash
# Copy the example and add your keys
cp .env.example .env

# Or create manually:
echo "OPENWEATHER_API_KEY=your-actual-api-key-here" > .env
```

**Getting your OpenWeatherMap API key:**
1. Visit https://openweathermap.org/api
2. Sign up for a free account
3. Verify your email
4. Copy your API key from the dashboard
5. Wait a few minutes for activation

**Testing the weather tool:**
```bash
# Test: "What's the weather in Tokyo?"
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_weather","arguments":{"location":"Tokyo"}}}'
```

---

## 🔌 Client Integration

### Cursor IDE
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "node",
      "args": ["/absolute/path/to/your-server/dist/index.js"],
      "env": {
        "OPENWEATHER_API_KEY": "your-actual-api-key-here"
      }
    }
  }
}
```

**Alternative using pnpm (automatically loads .env file):**
```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "pnpm",
      "args": ["start"],
      "cwd": "/absolute/path/to/your-server"
    }
  }
}
```

---

## 🧪 Testing

```bash
# Run comprehensive test suite (104 tests)
pnpm test
pnpm test:coverage
pnpm test:watch

# Test tools locally
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | pnpm start

# HTTP mode for debugging
pnpm start:http  # Then visit http://localhost:3000/health
./test-mcp-tools.sh # Test tools locally
```

**📖 See [TESTING.md](TESTING.md) for comprehensive testing patterns covering all parts of the template.**

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Tools not showing | Check absolute paths in config |
| Permission denied | Run `chmod +x dist/index.js` |
| Module not found | Run `pnpm build` first |
| Server won't start | Check Node.js version (needs 24+) |

---

## 🔒 Security Best Practices

For production deployments:

1. **Authentication**: Implement proper auth if serving over HTTP
2. **Input Validation**: Always use Zod schemas for tool parameters
3. **Error Handling**: Never expose internal errors to clients
4. **Rate Limiting**: Consider rate limiting for HTTP endpoints
5. **HTTPS**: Use HTTPS in production environments

**Note**: This template follows MCP 2025-06-18 specification including protocol version headers and enhanced capabilities.

---

## 📚 Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Zod Validation](https://zod.dev/)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
