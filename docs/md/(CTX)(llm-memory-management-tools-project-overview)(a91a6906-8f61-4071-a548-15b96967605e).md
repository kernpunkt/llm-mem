---
id: a91a6906-8f61-4071-a548-15b96967605e
title: LLM Memory Management Tools - Project Overview
tags:
  - project-overview
  - architecture
  - features
  - getting-started
  - contributing
  - support
category: CTX
created_at: '2025-08-22T13:54:59.155Z'
updated_at: '2025-08-23T12:00:09.927Z'
last_reviewed: '2025-08-22T13:54:59.155Z'
links:
  - c47b13f0-b934-40f2-807b-d301c6d9ed0c
  - d2626445-af61-4664-ba65-5f78b62e12bc
  - 0348ba55-8529-4502-ac43-4061524ed7e1
  - d2331290-47d8-4f49-b0ce-4f350a2ad517
sources:
  - README.md:1-180
  - package.json:1-57
  - packages/shared/package.json:1-38
  - packages/cli/package.json:1-40
  - packages/mcp/package.json:1-45
---

# LLM Memory Management Tools - Project Overview

**Project Description:** A comprehensive suite of tools for managing and analyzing LLM memory systems, built with a modular architecture and modern TypeScript development practices.

**Core Architecture:**

**Monorepo Structure:**
- **@llm-mem/shared**: Core utilities, memory services, and types
- **@llm-mem/cli**: Command-line interface for memory coverage analysis
- **@llm-mem/mcp**: MCP server for LLM integration

**Key Technologies:**
- **TypeScript**: Strict type safety and modern ES features
- **pnpm Workspaces**: Efficient monorepo dependency management
- **FlexSearch**: Fast full-text search with configurable performance
- **SQLite**: Lightweight data persistence
- **MCP Protocol**: Model Context Protocol for LLM integration

**Core Features:**

**Memory Management:**
- **CRUD Operations**: Create, read, update, delete memories
- **Bidirectional Linking**: Create relationships between memories
- **Full-Text Search**: Fast search with FlexSearch integration
- **Category Organization**: Flexible categorization and tagging
- **Markdown Storage**: Human-readable memory storage format

**Documentation Coverage:**
- **Coverage Analysis**: Identify documented vs. undocumented code
- **Quality Assessment**: Evaluate documentation completeness
- **Gap Identification**: Find areas needing documentation
- **Report Generation**: Comprehensive coverage reports

**LLM Integration:**
- **MCP Server**: Full MCP 2025-06-18 specification compliance
- **Dual Transport**: Stdio (production) and HTTP (development)
- **Memory Tools**: Comprehensive memory management via MCP
- **Protocol Compliance**: JSON-RPC 2.0 and MCP standards

**Development Features:**
- **Comprehensive Testing**: 80%+ coverage with Vitest
- **Type Safety**: Full TypeScript support with Zod validation
- **Modern Tooling**: ESLint, Prettier, and modern build tools
- **Workspace Management**: Efficient monorepo development

**Use Cases:**

**For Developers:**
- **Documentation Management**: Organize and maintain project documentation
- **Knowledge Discovery**: Find relevant information quickly
- **Coverage Analysis**: Ensure code is properly documented
- **Integration**: Use MCP tools in development workflows

**For LLMs:**
- **Memory Access**: Retrieve and manage knowledge through MCP
- **Context Building**: Build context for development sessions
- **Knowledge Discovery**: Find related information and patterns
- **Documentation Analysis**: Analyze documentation coverage and quality

**For Teams:**
- **Knowledge Sharing**: Share knowledge across team members
- **Documentation Standards**: Establish consistent documentation practices
- **Quality Assurance**: Ensure documentation meets quality standards
- **Collaboration**: Enable collaborative knowledge management

**Getting Started:**

**Installation:**
```bash
# Clone the repository
git clone git@github.com:kernpunkt/llm-mem.git
cd llm-mem

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

**Quick Start:**
```bash
# Run coverage analysis
pnpm mem-coverage

# Start MCP server
pnpm start:mcp

# Run tests
pnpm test
```

**Configuration:**
- **Environment Variables**: Configure allowed categories and tags
- **Memory Store Path**: Customize memory storage location
- **Search Index Path**: Customize search index location
- **Transport Mode**: Choose between stdio and HTTP transport

**Architecture Decisions:**

**Key ADRs:**
- **ADR-001**: Monorepo architecture with pnpm workspaces
- **ADR-002**: Memory-based documentation system with FlexSearch
- **ADR-003**: MCP server with dual transport support
- **ADR-004**: TypeScript-first development with strict type safety

**Design Principles:**
- **Modularity**: Clear separation of concerns between packages
- **Type Safety**: Comprehensive type checking and validation
- **Performance**: Optimized search and memory operations
- **Extensibility**: Easy to add new features and capabilities

**Related Documentation:** - Integration patterns and architecture - Development workflow and configuration

**Contributing:**
- **Fork and Clone**: Standard GitHub workflow
- **Development**: Use pnpm workspaces and TypeScript
- **Testing**: Maintain 80%+ test coverage
- **Documentation**: Follow memory-based documentation patterns
- **Code Review**: Comprehensive review process for all changes

**Support and Community:**
- **Issues**: GitHub issues for bug reports and feature requests
- **Discussions**: GitHub discussions for questions and ideas
- **Documentation**: Comprehensive memory-based documentation
- **Contributing**: Clear contribution guidelines and processes

## Related
- [[(ADR)(adr-002-memory-based-documentation-system-with-flexsearch)(c47b13f0-b934-40f2-807b-d301c6d9ed0c)|ADR-002: Memory-Based Documentation System with FlexSearch]]
- [[(ADR)(adr-003-mcp-server-architecture-with-dual-transport-support)(d2626445-af61-4664-ba65-5f78b62e12bc)|ADR-003: MCP Server Architecture with Dual Transport Support]]
- [[(ADR)(adr-004-typescript-first-development-with-strict-type-safety)(0348ba55-8529-4502-ac43-4061524ed7e1)|ADR-004: TypeScript-First Development with Strict Type Safety]]
- [[(ADR)(adr-001-monorepo-architecture-with-pnpm-workspaces)(d2331290-47d8-4f49-b0ce-4f350a2ad517)|ADR-001: Monorepo Architecture with pnpm Workspaces]]
