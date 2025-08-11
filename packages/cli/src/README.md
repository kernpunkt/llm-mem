# mem-coverage CLI

Documentation coverage analysis for code, powered by the Memory System. Generates console reports highlighting undocumented files and sections with scoped thresholds.

## Installation

Build the project:

```bash
pnpm build
```

Run in dev mode:

```bash
pnpm mem-coverage:dev -- --help
```

Run from dist:

```bash
pnpm mem-coverage -- --help
```

## Usage

```bash
mem-coverage [options]
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
