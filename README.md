# LLM Memory Management Tools

A comprehensive suite of tools for managing and analyzing LLM memory systems, built with a modular architecture.

## 🏗️ Project Structure

This project is organized as a monorepo with three main packages:

- **`@llm-mem/shared`** - Core utilities, memory services, and types
- **`@llm-mem/cli`** - Command-line interface for memory coverage analysis
- **`@llm-mem/mcp`** - MCP server for LLM integration

## 🚀 Quick Start

### Prerequisites

- Node.js 24+ 
- pnpm 10.12.4+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/llm-mem.git
cd llm-mem

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Using the CLI

```bash
# Run memory coverage analysis
pnpm start:cli --help

# Or install globally
npm install -g packages/cli
mem-coverage --help
```

### Using the MCP Server

```bash
# Start MCP server (stdio transport)
pnpm start:mcp:stdio

# Start MCP server (HTTP transport for development)
pnpm start:mcp:http
```

## 📦 Package Details

### @llm-mem/shared
Core utilities and services used by both CLI and MCP packages.

```bash
pnpm build:shared
pnpm test:shared
```

### @llm-mem/cli  
Memory coverage analysis command-line tool.

```bash
pnpm build:cli
pnpm test:cli
pnpm start:cli
```

### @llm-mem/mcp
MCP server for LLM integration with memory tools.

```bash
pnpm build:mcp
pnpm test:mcp
pnpm start:mcp:stdio
```

## 🛠️ Development

### Available Scripts

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:shared
pnpm build:cli
pnpm build:mcp

# Development mode (watch for changes)
pnpm dev

# Run tests
pnpm test

# Linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### Development Workflow

1. **Shared Package**: Update core utilities and services
2. **CLI Package**: Modify CLI behavior and add new commands
3. **MCP Package**: Enhance MCP server capabilities
4. **Testing**: Run tests across all packages
5. **Build**: Compile all packages for distribution

## 📚 Documentation

- [CLI Documentation](packages/cli/README.md)
- [MCP Server Documentation](packages/mcp/README.md)
- [Shared Package Documentation](packages/shared/README.md)
- [Testing Guide](TESTING.md)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# API keys for external services
YOUR_API_KEY=your-key-here

# MCP server configuration
MCP_HTTP_PORT=3001
MCP_HTTP_HOST=localhost
```

### Coverage Configuration

Create a `coverage.config.yaml` file for CLI usage:

```yaml
thresholds:
  overall: 80
  docs: 90
  code: 75

exclude:
  - "node_modules/**"
  - "dist/**"

include:
  - "src/**/*.ts"
  - "docs/**/*.md"
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test:shared
pnpm test:cli
pnpm test:mcp

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## 📦 Distribution

### GitHub Installation

Users can install packages directly from GitHub:

```bash
# Install CLI only
npm install -g github:yourusername/llm-mem#main --workspace=packages/cli

# Install MCP server only
npm install -g github:yourusername/llm-mem#main --workspace=packages/mcp
```

### Local Development Installation

```bash
# Install CLI locally
npm install -g packages/cli

# Install MCP server locally
npm install -g packages/mcp
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- [Issues](https://github.com/yourusername/llm-mem/issues)
- [Discussions](https://github.com/yourusername/llm-mem/discussions)
- [Documentation](docs/)
