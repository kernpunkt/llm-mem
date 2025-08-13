# @llm-mem/cli

Memory coverage analysis CLI tool for LLM memory management.

## Installation

### From GitHub (Recommended)
```bash
# Install the entire monorepo
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main
#After installation, build the package**:
cd node_modules/llm-mem
pnpm install
pnpm build
# Then use the CLI tool
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --help
```

### From Local Development
```bash
git clone git@github.com:kernpunkt/llm-mem.git
cd llm-mem
pnpm install
pnpm build:cli
pnpm install -g packages/cli
```

## Usage

```bash
# Show help (using the installed package)
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --help

# Basic coverage analysis
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --config=./coverage.config.yaml

# With custom thresholds
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --threshold=80 --categories=docs,code

# Dry run to see what would be scanned
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js --dry-run --root-dir=./src
```

## Package.json Scripts

Add this to your package.json for easier usage:

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

## Configuration

The CLI supports multiple configuration file formats and automatically detects the type based on the filename and content. You can use any of these configuration approaches:

### 1. Dedicated Coverage Configuration (`.coverage.json`)

Create a `.coverage.json` file for explicit memory coverage configuration:

```json
{
  "thresholds": {
    "overall": 80,
    "src": 85,
    "docs": 90
  },
  "exclude": [
    "node_modules/**",
    "dist/**",
    "coverage/**",
    "*.test.ts"
  ],
  "include": [
    "src/**/*.ts",
    "src/**/*.js",
    "docs/**/*.md"
  ],
  "categories": ["DOC", "ADR", "CTX"],
  "memoryStorePath": "./memories",
  "indexPath": "./memories/index",
  "rootDir": "./",
  "scanSourceFiles": true
}
```

### 2. Vitest Configuration Integration

The CLI automatically detects and extracts coverage settings from your `vitest.config.ts` or `vitest.config.js`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**'
      ],
      include: [
        'src/**/*.ts',
        'src/**/*.js'
      ],
      thresholds: {
        global: {
          lines: 80,
          functions: 75,
          branches: 70,
          statements: 80
        }
      }
    }
  }
})
```

### 3. Jest Configuration Integration

The CLI also supports Jest configuration files (`jest.config.js`, `jest.config.ts`, `jest.config.cjs`):

```javascript
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.js',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 75,
      branches: 70,
      statements: 80
    }
  }
}
```

### Configuration Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `thresholds.overall` | `number` | Global coverage threshold (0-100) | `undefined` |
| `thresholds[scope]` | `number` | Scope-specific threshold (e.g., `src: 85`) | `undefined` |
| `exclude` | `string[]` | Glob patterns for files to exclude | `["node_modules/**", "dist/**"]` |
| `include` | `string[]` | Glob patterns for files to include | `["src/**/*.ts", "src/**/*.js"]` |
| `categories` | `string[]` | Memory categories to analyze | `["DOC", "ADR", "CTX"]` |
| `memoryStorePath` | `string` | Path to memory store directory | `"./memories"` |
| `indexPath` | `string` | Path to search index | `"./memories/index"` |
| `rootDir` | `string` | Root directory for filesystem scanning | `"./"` |
| `scanSourceFiles` | `boolean` | Enable/disable source file scanning | `true` |

### Command Line Overrides

All configuration parameters can be overridden via command line arguments:

```bash
# Override threshold from config file
node mem-coverage.js --config=./vitest.config.ts --threshold=90

# Override include patterns
node mem-coverage.js --config=./coverage.config.json --include=src/**/*.ts,lib/**/*.ts

# Override exclude patterns
node mem-coverage.js --config=./jest.config.js --exclude=*.test.ts,*.spec.ts

# Set custom memory store path
node mem-coverage.js --config=./vitest.config.ts --memoryStorePath=./custom-memories

# Disable source file scanning (memory-only mode)
node mem-coverage.js --config=./coverage.config.json --no-scan

# Dry run to preview what would be scanned
node mem-coverage.js --config=./vitest.config.ts --dry-run
```

### Configuration File Detection Priority

The CLI automatically detects configuration file types in this order:

1. **Explicit `.coverage.json`** - Dedicated coverage configuration
2. **Vitest config** - Files matching `vitest.config.*` patterns
3. **Jest config** - Files matching `jest.config.*` patterns
4. **Fallback** - Default configuration if no file is specified

### Environment-Specific Configuration

For different environments, you can use multiple configuration files:

```bash
# Development with strict thresholds
node mem-coverage.js --config=./coverage.dev.json

# Production with relaxed thresholds  
node mem-coverage.js --config=./coverage.prod.json

# CI/CD with specific exclusions
node mem-coverage.js --config=./coverage.ci.json
```

## Development

```bash
# Build the CLI
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```
