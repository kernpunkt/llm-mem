---
id: 6d8aa523-1cbe-4d42-80eb-488881f32294
title: Frontmatter Template Support Implementation
tags:
  - frontmatter
  - templates
  - feature
  - documentation
  - implementation
category: DOC
created_at: '2025-11-11T08:12:14.827Z'
updated_at: '2025-11-11T08:12:14.827Z'
last_reviewed: '2025-11-11T08:12:14.827Z'
links: []
sources: []
abstract: >-
  Implementation of category-based frontmatter templates allowing custom
  metadata fields to be automatically added to memories via configuration files
  or direct parameters, with full preservation when reading.
feature_status: completed
implementation_date: '2024-12-19'
related_components:
  - frontmatter-config
  - yaml-utils
  - memory-service
  - mcp-tools
---

# Frontmatter Template Support Implementation

This document describes the implementation of category-based frontmatter templates that allow custom metadata fields to be automatically added to memories.

## Overview

We implemented a comprehensive template system that enables:
- Category-based frontmatter templates via configuration files
- Direct template parameter support in `write_mem` and `edit_mem` functions
- Preservation of custom fields when reading memories
- Template merging with user-provided values taking precedence

## Key Changes

### 1. Template Configuration System

**Location**: `packages/shared/src/utils/frontmatter-config.ts`

- Moved from `packages/mcp/src/frontmatter-config.ts` to shared package for reusability
- Provides `loadMemoryConfig()` to load YAML/JSON configuration files
- Provides `getCategoryTemplate()` to retrieve templates by category
- Supports category-based templates that automatically apply to memories

### 2. MCP Tool Enhancements

**Files Modified**: `packages/mcp/src/index.ts`

#### `write_mem` Function
- Added `template` parameter: `z.record(z.unknown()).optional()`
- Changed default parameters from `.optional()` to `.default()` for better AI assistant clarity
- Template merging: category template + user-provided template (user values override)
- Updated both stdio and HTTP transport handlers

#### `edit_mem` Function
- Added `template` parameter for updating custom frontmatter fields
- Template merging works the same way as `write_mem`
- Preserves existing custom fields when updating

### 3. Frontmatter Parsing & Serialization

**Files Modified**: `packages/shared/src/utils/yaml.ts`

#### `parseFrontmatter()`
- Now preserves ALL frontmatter fields, including custom ones
- Returns `MemoryFrontmatter & Record<string, unknown>` to allow additional fields
- Normalizes known fields while preserving custom fields

#### `serializeFrontmatter()`
- Accepts frontmatter with custom fields
- Serializes all fields (known + custom) to YAML

#### `updateFrontmatter()`
- Accepts updates with custom fields
- Preserves existing custom fields when updating

### 4. Memory Service Updates

**Files Modified**: 
- `packages/shared/src/memory/file-service.ts`
- `packages/shared/src/memory/memory-service.ts`

#### File Service
- `readMemoryFileById()` and `readMemoryFileByTitle()` now preserve all custom fields
- Return types include `Record<string, unknown>` to allow additional fields

#### Memory Service
- `readMemory()` preserves all custom fields from files
- Returns `Memory & Record<string, unknown>` to include custom fields

### 5. Formatter Updates

**Files Modified**: `packages/shared/src/tools/formatters.ts`

#### `formatMemory()`
- Includes all custom fields when serializing to markdown
- Custom fields appear in frontmatter when formatting
- JSON format includes all custom fields

## How Templates Work

### Template Merging Order

1. **Base Frontmatter**: Standard fields (id, title, category, timestamps, etc.)
2. **Category Template**: Fields from config file based on category
3. **User Template**: Fields provided via `template` parameter (overrides category template)

### Template Restrictions

- Template fields **cannot override** required fields:
  - `id`, `title`, `category`
  - `created_at`, `updated_at`, `last_reviewed`
  - `links` (initialized as empty array)
  
- Template fields **can override** optional fields:
  - `tags`, `sources`, `abstract`

- Template fields **can add** any custom fields

## Usage Examples

### Using Category Templates

1. Create a config file (`memory-config.yaml`):
```yaml
templates:
  DOC:
    author: "default"
    status: "draft"
    version: "1.0"
```

2. Set environment variable:
```bash
MEMORY_CONFIG_PATH=./config/memory-config.yaml
```

3. Create memory - template fields automatically applied:
```json
{
  "method": "tools/call",
  "params": {
    "name": "write_mem",
    "arguments": {
      "title": "My Document",
      "content": "Content here",
      "category": "DOC"
    }
  }
}
```

### Overriding Template Values

```json
{
  "method": "tools/call",
  "params": {
    "name": "write_mem",
    "arguments": {
      "title": "My Document",
      "content": "Content here",
      "category": "DOC",
      "template": {
        "author": "John Doe",
        "status": "published"
      }
    }
  }
}
```

### Adding Custom Fields Without Templates

```json
{
  "method": "tools/call",
  "params": {
    "name": "write_mem",
    "arguments": {
      "title": "My Memory",
      "content": "Content here",
      "template": {
        "custom_field": "value",
        "another_field": 123
      }
    }
  }
}
```

## File Structure Changes

### Moved Files
- `packages/mcp/src/frontmatter-config.ts` → `packages/shared/src/utils/frontmatter-config.ts`
- Updated exports in `packages/shared/src/index.ts`
- Updated imports in `packages/mcp/src/index.ts`

### New Example Files
- Enhanced `packages/mcp/src/_examples/memory-config.example.yaml` with comprehensive examples
- Updated documentation in `packages/mcp/README.md`

## Benefits

1. **Flexibility**: Add category-specific metadata without code changes
2. **Consistency**: Ensure all memories in a category have required fields
3. **Extensibility**: Easy to add new custom fields for different use cases
4. **Preservation**: Custom fields are preserved throughout the read/write cycle
5. **Override Capability**: Users can override template values when needed

## Testing Considerations

- Custom fields are preserved when reading memories
- Template merging works correctly (category + user template)
- Custom fields appear in formatted output (markdown and JSON)
- Template values can override optional fields
- Template values cannot override required fields
- Empty templates don't break functionality

## Related Files

- Configuration: `packages/shared/src/utils/frontmatter-config.ts`
- YAML utilities: `packages/shared/src/utils/yaml.ts`
- Memory services: `packages/shared/src/memory/memory-service.ts`
- File services: `packages/shared/src/memory/file-service.ts`
- MCP tools: `packages/mcp/src/index.ts`
- Example config: `packages/mcp/src/_examples/memory-config.example.yaml`
- Documentation: `packages/mcp/README.md`