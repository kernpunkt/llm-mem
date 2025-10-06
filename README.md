# LLM Memory Management Tools

A comprehensive suite of tools for managing and analyzing LLM memory systems, built with a modular architecture.

## 🏗️ Project Structure

This project is organized as a monorepo with three main packages:

- **`@llm-mem/shared`** - Core utilities, memory services, and types
- **`@llm-mem/cli`** - Command-line interface for memory coverage analysis
- **`@llm-mem/mcp`** - MCP server for LLM integration

## 🔧 Package Configuration

### Root package.json
- **Workspace Management**: Uses pnpm workspaces
- **Scripts**: Orchestrates builds across all packages
- **Dev Dependencies**: Shared development tools

### Package Dependencies
- **Shared Dependencies**: Common across multiple packages
- **Workspace Dependencies**: Internal package references using `workspace:*`
- **External Dependencies**: Only included where needed

### TypeScript Configuration
- **Root tsconfig.json**: Base configuration for all packages
- **Package tsconfig.json**: Extends root with package-specific settings
- **Shared Types**: All packages can import from @llm-mem/shared

## 🚀 Quick Start

### Prerequisites

- Node.js 24+ 
- pnpm 10.12.4+

### Installation

## stand alone - recommended mainly for taking part in developing the project
```bash
# Clone the repository
git clone git@github.com:kernpunkt/llm-mem.git
cd llm-mem

# Install dependencies
pnpm install

# allow build scripts this will automatically build all packages and rebuild sqlite3 for your plattform
pnpm approve-builds
```

## 📥 Installation in Other Projects (Optional - for local development)

### Installing as a Development Dependency

You can install the entire monorepo as an optional (since it is only used locally) dependency  into any Node.js project to use the CLI and MCP tools:

```bash
# Install the entire monorepo (recommended)
pnpm add --save-optional git+ssh://git@github.com:kernpunkt/llm-mem.git#main
# allow build scripts, this will automatically install all dependencies and build all packages and rebuild sqlite3 for your plattform
pnpm approve-builds
```

### Usage and Configuration

see individual README.md files in the package directories


### 📁 File Organization

### Shared Package
```
packages/shared/
├── src/
│   ├── memory/          # Memory management services
│   ├── utils/           # Utility functions
│   └── index.ts         # Main export file
├── dist/                # Built JavaScript files
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # Package documentation
```

### CLI Package
```
packages/cli/
├── src/
│   ├── cli.ts           # Main CLI entry point
│   ├── coverage-service.ts
│   ├── file-scanner.ts
│   ├── source-parser.ts
│   ├── report-generator.ts
│   ├── config-parser.ts
│   ├── validation.ts
│   └── types.ts
├── dist/                # Built CLI executable
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # Package documentation
```

### MCP Package
```
packages/mcp/
├── src/
│   ├── index.ts         # MCP server entry point
│   └── assets/          # Static assets
├── dist/                # Built MCP server
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # Package documentation
```

## 🔄 Build Process

### Build Order
1. **Shared Package**: Core utilities and services
2. **CLI Package**: Depends on shared package
3. **MCP Package**: Depends on shared package

### Build Artifacts
- **TypeScript Compilation**: All packages compile to individual `dist/` directories
- **Asset Copying**: MCP package copies assets to dist
- **Executable Permissions**: CLI package sets executable permissions

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
