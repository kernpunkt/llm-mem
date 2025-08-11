# @llm-mem/shared

Shared utilities and types for LLM Memory tools.

## Installation

```bash
# Install the entire monorepo
pnpm install --save-dev github:kernpunkt/llm-mem#main
```

## Features

- **Memory Services**: Core memory management functionality
- **File Services**: File system operations and utilities
- **Search Services**: FlexSearch integration for fast text search
- **Utility Functions**: Common helper functions and configurations

## Usage

```typescript
import { MemoryService, FileService, SearchService } from '@llm-mem/shared';

const memoryService = new MemoryService({
  notestorePath: './memories',
  indexPath: './memories/index'
});
```

**Note**: The `@llm-mem/shared` import works because it's resolved to the actual file path during TypeScript compilation, not as a package name lookup.

## Development

```bash
# Build the package
pnpm build

# Watch for changes
pnpm dev

# Run tests
pnpm test
```
