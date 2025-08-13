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
git clone git@github.com:kernpunkt/llm-mem.git
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

## 📥 Installation in Other Projects

### Installing as a Development Dependency

You can install the entire monorepo into any Node.js project to use the CLI and MCP tools:

```bash
# Install the entire monorepo (recommended)
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main

# Or using SSH if you have access to the repository
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main

```

**Note**: After installation, you'll need to build the package manually. The package will be downloaded but not built automatically to ensure reliable installation.

**After installation, build the package**:
```bash
cd node_modules/llm-mem
pnpm install
pnpm build
```

### Troubleshooting Installation

If you encounter issues:

1. **Ensure Node.js 24+** is installed
2. **Check pnpm availability** - the package requires pnpm for building
3. **Verify GitHub access** - ensure you can clone the repository
4. **Build after installation** - the package needs to be built manually after installation

**Installation process**:
1. Install the package: `pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main`
2. Build the package: `cd node_modules/llm-mem && pnpm install && pnpm build`
3. Rebuild sqlite3 with npm(!): `cd node_modules/llm-mem/packages/shared && npm rebuild sqlite3`
4. Use the tools: `node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --help`

**Why manual build?**: The package can't automatically build itself during installation due to npm/pnpm lifecycle script limitations when installing from Git repositories.
**Why rebuild sqlite3 with npm?**:Because the native binaries might not work in your environment and pnpm seems not to be able to rebuild the package correctly

### Alternative Installation Methods

If direct GitHub installation fails or hangs:

```bash
# Clone and install locally
git clone git@github.com:kernpunkt/llm-mem.git /tmp/llm-mem
cd /tmp/llm-mem
pnpm install
pnpm build

# Install from local path
pnpm install --save-dev file:/tmp/llm-mem
```

### Using the CLI in Your Project

After installation, you can use the CLI tools directly:

```bash
# Run memory coverage analysis (using the built executable)
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --help

# Or add a script to your package.json
```

```json
{
  "scripts": {
    "mem-coverage": "node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --config=./coverage.config.yaml"
  }
}
```

Then run:
```bash
pnpm run mem-coverage
```

### Using the MCP Server in Your Project

The MCP server can be integrated into your development workflow:

```bash
# Start the MCP server (stdio transport)
node node_modules/llm-mem/packages/mcp/dist/index.js start:stdio

# Start the MCP server (HTTP transport for development)
node node_modules/llm-mem/packages/mcp/dist/index.js start:http --port=3001
```

### Importing Shared Utilities

You can also import and use the shared utilities in your code:

```typescript
import { MemoryService, FileService } from '@llm-mem/shared';

// Use the memory management services
const memoryService = new MemoryService();
const fileService = new FileService();
```

### Configuration
see individual package readme.md

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

### GitHub Installation (Recommended)

Users can install the entire monorepo directly from GitHub:

```bash
# Install as a development dependency
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main

# Or using SSH if you have access
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main
```

**Features**:
- ✅ Includes all packages (CLI, MCP, Shared)
- ✅ Simple installation process
- ✅ Works with pnpm, npm, and yarn

### Local Development Installation

For local development and testing:

```bash
# Clone the repository
git clone git@github.com:kernpunkt/llm-mem.git
cd llm-mem

# Install dependencies and build
pnpm install
pnpm build

# Install globally for testing
pnpm install -g packages/cli
pnpm install -g packages/mcp
```

### Package-Specific Usage

After installation and building, you can use individual packages:

```bash
# CLI tools
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --help

# MCP server
node node_modules/llm-mem/packages/mcp/dist/index.js start:stdio

# Shared utilities
import { MemoryService } from '@llm-mem/shared';
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

- [Issues](https://github.com/kernpunkt/llm-mem/issues)
- [Discussions](https://github.com/kernpunkt/llm-mem/issues)
- [Documentation](docs/)
