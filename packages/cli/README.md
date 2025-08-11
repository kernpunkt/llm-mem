# @llm-mem/cli

Memory coverage analysis CLI tool for LLM memory management.

## Installation

### From GitHub (Recommended)
```bash
npm install -g github:yourusername/llm-mem#main --workspace=packages/cli
```

### From Local Development
```bash
git clone https://github.com/yourusername/llm-mem.git
cd llm-mem
pnpm install
pnpm build:cli
npm install -g packages/cli
```

## Usage

```bash
# Show help
mem-coverage --help

# Basic coverage analysis
mem-coverage --config=./coverage.config.yaml

# With custom thresholds
mem-coverage --threshold=80 --categories=docs,code

# Dry run to see what would be scanned
mem-coverage --dry-run --root-dir=./src
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
