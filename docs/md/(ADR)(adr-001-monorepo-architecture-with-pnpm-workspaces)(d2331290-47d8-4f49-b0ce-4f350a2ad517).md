---
id: d2331290-47d8-4f49-b0ce-4f350a2ad517
title: 'ADR-001: Monorepo Architecture with pnpm Workspaces'
tags:
  - architecture
  - monorepo
  - pnpm
  - workspaces
  - package-organization
category: ADR
created_at: '2025-08-22T13:50:22.926Z'
updated_at: '2025-08-23T02:55:05.512Z'
last_reviewed: '2025-08-22T13:50:22.926Z'
links:
  - a91a6906-8f61-4071-a548-15b96967605e
  - 5ec17d14-bce3-411b-bbda-0945af019338
  - 1cab02b8-2a60-4fad-b3d2-0f51fb7f96ec
sources:
  - package.json:1-57
  - pnpm-workspace.yaml
  - packages/shared/package.json:1-38
  - packages/cli/package.json:1-40
  - packages/mcp/package.json:1-45
---

# ADR-001: Monorepo Architecture with pnpm Workspaces

**Date:** 2025-01-15

**Context:** Need to organize a complex LLM memory management system with multiple interconnected packages (shared utilities, CLI tools, MCP server) while maintaining clear separation of concerns and efficient dependency management.

**Decision:** Use a monorepo architecture with pnpm workspaces to manage the three core packages: `@llm-mem/shared`, `@llm-mem/cli`, and `@llm-mem/mcp`.

**Rationale:**

**Package Organization:**
- **@llm-mem/shared**: Core utilities, memory services, and types used by both CLI and MCP packages
- **@llm-mem/cli**: Command-line interface for memory coverage analysis, depends on shared
- **@llm-mem/mcp**: MCP server for LLM integration, depends on shared

**Benefits of pnpm Workspaces:**
- **Efficient Dependency Management**: Single `node_modules` structure with symlinks
- **Workspace Dependencies**: Use `workspace:*` for internal package references
- **Atomic Operations**: Install, build, and test all packages together
- **Version Consistency**: Shared dependencies across packages
- **Fast Builds**: Parallel execution with proper dependency ordering

**Build Process:**
1. **Shared Package**: Core utilities and services (built first)
2. **CLI Package**: Depends on shared package
3. **MCP Package**: Depends on shared package

**Trade-offs:**
- **Complexity**: More complex setup than single package
- **Learning Curve**: Team needs to understand workspace concepts
- **Tooling**: Requires pnpm-specific tooling and scripts
- **Deployment**: Need to consider package-level vs. monorepo deployment

**Implementation Strategy:**
- Root `package.json` orchestrates builds across all packages
- Package-specific `tsconfig.json` extends root configuration
- Shared development tools and dependencies at root level
- Workspace-aware scripts for development and testing

**Related Documentation:** - Development workflow patterns - Package organization details


## Related

- [[(CTX)(development-workflow-and-best-practices)(1cab02b8-2a60-4fad-b3d2-0f51fb7f96ec)|Development Workflow and Best Practices]]
