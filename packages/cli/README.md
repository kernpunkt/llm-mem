# @llm-mem/cli

Memory coverage analysis CLI tool for LLM memory management.

## Installation

### From GitHub (Recommended)
```bash
# Install the entire monorepo
pnpm install --save-dev git+ssh://git@github.com:kernpunkt/llm-mem.git#main

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

Create a `coverage.config.yaml` file:

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

## Development

```bash
# Build the CLI
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```
