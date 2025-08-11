# LLM-MEM Monorepo Structure

This document describes the new monorepo organization for the LLM Memory Management Tools project.

## 🏗️ Project Architecture

The project is now organized as a monorepo with three main packages:

```
llm-mem/
├── packages/
│   ├── shared/           # Core utilities and services
│   ├── cli/             # Command-line interface
│   └── mcp/             # MCP server
├── package.json          # Root workspace configuration
├── pnpm-workspace.yaml  # pnpm workspace definition
└── README.md            # Main project documentation
```

## 📦 Package Details

### @llm-mem/shared
**Purpose**: Core utilities and services used by both CLI and MCP packages

**Contents**:
- Memory services (MemoryService, FileService, SearchService, LinkService)
- Utility functions (FlexSearch, YAML, file system operations)
- Type definitions and interfaces

**Dependencies**:
- flexsearch, glob, js-yaml, sqlite3, uuid, zod

**Build Command**: `pnpm build:shared`

### @llm-mem/cli
**Purpose**: Memory coverage analysis command-line tool

**Contents**:
- CLI interface for memory coverage analysis
- Coverage service and reporting
- File scanning and validation
- Configuration parsing

**Dependencies**:
- @llm-mem/shared (workspace dependency)
- glob, zod

**Build Command**: `pnpm build:cli`
**Run Command**: `pnpm start:cli`

### @llm-mem/mcp
**Purpose**: MCP server for LLM integration

**Contents**:
- MCP 2025-06-18 compliant server
- Memory management tools
- Dual transport support (stdio/HTTP)
- Tool definitions and implementations

**Dependencies**:
- @llm-mem/shared (workspace dependency)
- @modelcontextprotocol/sdk, dotenv, h3, zod

**Build Command**: `pnpm build:mcp`
**Run Commands**: 
- `pnpm start:mcp:stdio` (production)
- `pnpm start:mcp:http` (development)

## 🚀 Development Workflow

### Initial Setup
```bash
# Clone and install
git clone https://github.com/yourusername/llm-mem.git
cd llm-mem
pnpm install

# Build all packages
pnpm build
```

### Development Commands
```bash
# Build specific packages
pnpm build:shared    # Build shared utilities
pnpm build:cli       # Build CLI tool
pnpm build:mcp       # Build MCP server

# Build all packages
pnpm build

# Development mode (watch for changes)
pnpm dev             # All packages
pnpm dev:shared      # Shared package only
pnpm dev:cli         # CLI package only
pnpm dev:mcp         # MCP package only

# Testing
pnpm test            # All packages
pnpm test:shared     # Shared package only
pnpm test:cli        # CLI package only
pnpm test:mcp        # MCP package only

# Linting and type checking
pnpm lint            # All packages
pnpm typecheck       # All packages
```

### Running Tools
```bash
# CLI Tool
pnpm start:cli --help
pnpm start:cli --config=./coverage.config.yaml

# MCP Server
pnpm start:mcp:stdio    # Production mode
pnpm start:mcp:http     # Development mode
```

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

## 📁 File Organization

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
- **TypeScript Compilation**: All packages compile to `dist/` directories
- **Asset Copying**: MCP package copies assets to dist
- **Executable Permissions**: CLI package sets executable permissions

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

## 🧪 Testing Strategy

### Test Organization
- **Shared Package**: Core functionality tests
- **CLI Package**: CLI-specific tests
- **MCP Package**: MCP server tests
- **Integration Tests**: Cross-package functionality

### Test Commands
```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm test:shared
pnpm test:cli
pnpm test:mcp

# Watch mode
pnpm test:watch

# Coverage reports
pnpm test:coverage
```

## 🔍 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clean all build artifacts
pnpm clean

# Reinstall dependencies
pnpm install

# Rebuild packages
pnpm build
```

#### Import Errors
- Ensure shared package is built first
- Check workspace dependencies in package.json
- Verify TypeScript configuration

#### Dependency Issues
```bash
# Install dependencies for specific package
cd packages/[package-name]
pnpm install

# Install all workspace dependencies
pnpm install
```

### Debug Commands
```bash
# Check workspace status
pnpm list

# Verify package builds
pnpm build:shared && pnpm build:cli && pnpm build:mcp

# Test individual packages
pnpm --filter @llm-mem/shared test
pnpm --filter @llm-mem/cli test
pnpm --filter @llm-mem/mcp test
```

## 🚀 Benefits of New Structure

### ✅ Advantages
- **Modular Design**: Clear separation of concerns
- **Shared Code**: No duplication of utilities
- **Independent Development**: Packages can evolve separately
- **Focused Dependencies**: Each package only includes what it needs
- **Easy Testing**: Test packages in isolation
- **Flexible Distribution**: Users can install only what they need

### 🔧 Development Benefits
- **Clear Dependencies**: Explicit workspace relationships
- **Fast Builds**: Parallel compilation of independent packages
- **Easy Debugging**: Isolated package issues
- **Type Safety**: Shared types across all packages
- **Consistent Tooling**: Unified build and test processes

## 📚 Next Steps

### Immediate Actions
1. **Verify Builds**: Ensure all packages build successfully
2. **Run Tests**: Verify test suites pass
3. **Test CLI**: Validate CLI functionality
4. **Test MCP**: Verify MCP server operation

### Future Enhancements
1. **CI/CD Pipeline**: Automated builds and testing
2. **Version Management**: Independent package versioning
3. **Documentation**: Comprehensive API documentation
4. **Examples**: Usage examples for each package
5. **Performance**: Optimize build and runtime performance

## 🤝 Contributing

### Development Guidelines
1. **Package Isolation**: Keep packages focused and independent
2. **Shared Code**: Extract common functionality to shared package
3. **Type Safety**: Maintain strict TypeScript compliance
4. **Testing**: Add tests for new functionality
5. **Documentation**: Update relevant README files

### Pull Request Process
1. **Feature Branch**: Create branch for your changes
2. **Package Focus**: Make changes in appropriate package(s)
3. **Tests**: Ensure all tests pass
4. **Build**: Verify successful compilation
5. **Documentation**: Update relevant documentation
6. **Submit PR**: Include clear description of changes

---

This monorepo structure provides a solid foundation for scalable development while maintaining clear separation of concerns and enabling independent package evolution.
