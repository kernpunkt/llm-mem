# mem-coverage CLI

Documentation coverage analysis for code, powered by the Memory System. Generates console reports highlighting undocumented files and sections with scoped thresholds.

## ⚠️ Important: MCP Server Integration Required

This CLI tool requires the **@llm-mem/mcp** server to be running for proper functionality. The CLI analyzes code coverage against memories stored and indexed by the MCP server.

### Setup Requirements

1. **Install the MCP Server**: Install the entire monorepo using `pnpm install --save-dev github:kernpunkt/llm-mem#main`
2. **Memory Store**: A memory store must be populated with documentation using the MCP server
3. **Search Index**: The MCP server must have indexed the memories for search functionality

### Documentation with MCP Server

To create the documentation that this CLI tool analyzes, you must use the **@llm-mem/mcp** server to:

- **Store Memories**: Create and store documentation as memories in the memory store
- **Index Content**: Build searchable indexes of your documentation
- **Manage Categories**: Organize memories by type (DOC, ADR, CTX)

The CLI tool then analyzes your code against these stored memories to determine coverage.

### Usage Documentation

See `usage.md` in this package for detailed examples of how to:
- Set up the memory store
- Create documentation memories
- Configure the MCP server
- Run coverage analysis

> **Note**: The `usage.md` file is included in this package distribution, so you'll have access to it after installation.

## Installation

Install the entire monorepo:

```bash
pnpm install --save-dev github:kernpunkt/llm-mem#main
```

## Usage

```bash
# Run the CLI tool from the installed package
node node_modules/llm-mem/packages/cli/dist/mem-coverage.js [options]
```

### Options
- `--config=PATH`: Load configuration from `.coverage.json`, `vitest.config.js`, or `jest.config.js`
- `--categories=A,B`: Filter memories by categories (`DOC`, `ADR`, `CTX`)
- `--threshold=NUMBER`: Minimum overall coverage percentage (0–100)
- `--exclude=PAT1,PAT2`: Glob patterns to exclude
- `--include=PAT1,PAT2`: Glob patterns to include
- `--memoryStorePath=PATH`: Path to memory store (default `./memories`)
- `--indexPath=PATH`: Path to search index (default `./memories/index`)
- `--verbose`: Verbose output and progress

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

Supports multiple formats:

### .coverage.json
```json
{
  "thresholds": { "overall": 80, "src": 90, "tests": 50 },
  "exclude": ["node_modules/**", "dist/**"],
  "include": ["src/**/*.ts", "src/**/*.js"],
  "categories": ["DOC", "ADR", "CTX"],
  "memoryStorePath": "./memories",
  "indexPath": "./memories/index"
}
```

### Vitest (extracts from `test.coverage`)
```js
export default {
  test: {
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["node_modules/**"],
      thresholds: { global: { lines: 88 } }
    }
  }
};
```

### Jest (extracts from `collectCoverageFrom` and `coverageThreshold.global`)
```js
module.exports = {
  collectCoverageFrom: ["src/**/*.{js,ts}", "!src/**/*.test.ts"],
  coverageThreshold: { global: { lines: 85 } }
};
```

## Validation and Error Handling

- CLI options and configuration are validated using Zod
- Thresholds must be between 0 and 100
- Categories must be one of `DOC`, `ADR`, `CTX`
- Source file paths must be project-relative; absolute paths and parent traversal are rejected
- Glob pattern sanity (include/exclude):
  - Allowed: relative patterns with `*`, `**`, `?`, `{}`, `[]`
  - Rejected: absolute paths, parent traversal (`../`), null bytes
- Invalid memory source entries are skipped with a clear message
- Failures to read memories produce an empty but valid report (graceful degradation)

## Examples

- Basic run:
```bash
mem-coverage --include=src/**/*.ts --exclude=dist/** --threshold=80
```

- With config:
```bash
mem-coverage --config=.coverage.json
```

- CI threshold enforcement (non-zero exit on failure):
```bash
mem-coverage --threshold=85
```

## Output

Console report with summary, scopes, file breakdowns, and recommendations. Non-zero exit code when thresholds are not met.

## Notes

- For TypeScript configs (Vitest/Jest), prefer JS configs at runtime unless a loader is configured.
- Memory system paths can be overridden via CLI or environment-specific configuration.
