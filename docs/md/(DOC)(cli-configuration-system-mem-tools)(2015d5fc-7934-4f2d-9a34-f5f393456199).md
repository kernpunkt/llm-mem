---
id: 2015d5fc-7934-4f2d-9a34-f5f393456199
title: CLI Configuration System - mem-tools
tags:
  - cli
  - configuration
  - mem-tools
  - config-files
category: DOC
created_at: '2025-11-02T10:12:49.697Z'
updated_at: '2025-11-02T10:13:31.443Z'
last_reviewed: '2025-11-02T10:12:49.697Z'
links:
  - 945c8dba-83d3-4803-a6cc-b42684f98ffb
  - 93e0a3e8-7301-4fc9-9878-542bc7148243
sources:
  - packages/mem-tools/src/config-parser.ts
  - packages/mem-tools/src/cli.ts
---

# CLI Configuration System

## Overview

The `mem-tools` CLI supports multiple configuration methods with clear priority order. Users can work with or without config files, using CLI arguments as needed.

## Configuration Priority

1. **CLI Arguments** (`--memoryStorePath`, `--indexPath`) - Highest priority
2. **Config File** (`.memory.config.json`) - Auto-discovered or explicit
3. **Defaults** (`./memories`, `./memories/index`) - Fallback

## Configuration Methods

### Method 1: Config File

Create `.memory.config.json` in project root:

```json
{
  "memoryStorePath": "./memories",
  "indexPath": "./memories/index"
}
```

**Auto-Discovery:**
- Searches current directory
- Walks up to root directory
- First `.memory.config.json` found is used

### Method 2: CLI Arguments

```bash
# Both paths specified
mem-tools list-mems \
  --memoryStorePath=./custom-memories \
  --indexPath=./custom-index

# Only one path (other from config/default)
mem-tools list-mems --memoryStorePath=./custom-memories
# Uses: custom-memories + config file's indexPath (or default)
```

### Method 3: Explicit Config File

```bash
mem-tools list-mems --config=./configs/prod.json
```

## Implementation Details

### Config Parser (`config-parser.ts`)

**Functions:**
- `discoverConfigFile()` - Searches directory tree for config
- `parseConfigFile()` - Parses JSON config file
- `loadConfig()` - Merges CLI args, config file, and defaults

**Key Features:**
- Uses nullish coalescing (`??`) for proper undefined handling
- Each parameter resolved independently
- Graceful error handling (warnings, not failures)
- Works without config files

### Argument Parsing (`cli.ts`)

Supports multiple formats:
- `--memoryStorePath=./path` (equals format)
- `--memoryStorePath ./path` (space format)

All global options:
- `--config=PATH`
- `--memoryStorePath=PATH`
- `--indexPath=PATH`
- `--json`

## Use Cases

### Development: Config File
```bash
# Create .memory.config.json once
# Use commands without path arguments
mem-tools read-mem --identifier="test"
```

### Production: CLI Args
```bash
# Different paths per environment
mem-tools list-mems \
  --memoryStorePath=/prod/memories \
  --indexPath=/prod/index
```

### Scripts: Mix
```bash
# Use config file for store
# Override only index path
mem-tools search-mem \
  --query="api" \
  --indexPath=/fast-ssd/index
```

## Error Handling

- **Missing Config**: Falls back to defaults (no error)
- **Invalid Config**: Warning logged, uses CLI args/defaults
- **Config Parse Error**: Only fails if no CLI args provided
- **CLI Args Always Work**: Never requires config file

## Related

- [[(DOC)(memory-cli-implementation-complete)(945c8dba-83d3-4803-a6cc-b42684f98ffb)|Memory CLI Implementation - Complete]]
- [[(DOC)(cli-command-reference-mem-tools)(93e0a3e8-7301-4fc9-9878-542bc7148243)|Commands Documentation]]
