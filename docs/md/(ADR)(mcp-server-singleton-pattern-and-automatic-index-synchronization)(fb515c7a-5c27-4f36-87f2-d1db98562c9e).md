---
id: fb515c7a-5c27-4f36-87f2-d1db98562c9e
title: MCP Server Singleton Pattern and Automatic Index Synchronization
tags:
  - mcp-server
  - singleton-pattern
  - database-synchronization
  - multi-developer
  - git-workflow
category: ADR
created_at: '2025-11-02T14:11:48.678Z'
updated_at: '2025-11-02T14:11:48.678Z'
last_reviewed: '2025-11-02T14:11:48.678Z'
links: []
sources: []
abstract: >-
  Implemented singleton MemoryService manager with automatic index
  synchronization to handle git pull scenarios in multi-developer environments.
  Prevents false rebuilds after normal operations and automatically reindexes
  when database file is updated externally.
---

# MCP Server Singleton Pattern and Automatic Index Synchronization

## Problem Statement

In a multi-developer setup where the `docs` folder (including memories and the database file) is part of the repository, when a developer does a `git pull` while the MCP server is running, several issues occur:

1. **Multiple Database Connections**: Each tool call created a new `MemoryService` instance, leading to multiple SQLite database connections and file locking issues
2. **Git Pull Conflicts**: When `git pull` replaces the database file, the running server has stale file handles, causing:
   - Database file locking preventing git operations
   - Stale data being served from old connections
   - Potential database corruption if file is partially replaced
3. **Index Out of Sync**: After pulling changes, the local index might be missing new memories from other developers or contain outdated data
4. **False-Positive Rebuilds**: Normal operations like `write_mem` would trigger unnecessary rebuilds because tracked DB mtime wasn't updated

## Solution

### 1. Singleton MemoryService Manager

Created `MemoryServiceManager` class (`packages/mcp/src/memory-service-manager.ts`) that:
- Maintains a single `MemoryService` instance per configuration (keyed by `notestorePath + indexPath`)
- Ensures only one database connection per configuration at any time
- Properly closes connections on server shutdown

### 2. Automatic Index Synchronization Detection

The manager automatically detects when the index is out of sync by checking:

1. **Missing DB File**: Database doesn't exist but memory files do
2. **Stale Index**: Database file modification time is older than newest memory file
3. **External Changes**: Database file modification time changed since last check (git pull scenario)

### 3. Automatic Reindexing

When out-of-sync is detected, the system automatically:
- Closes existing database connections
- Rebuilds the index from all memory files
- Updates tracked timestamps to prevent false positives

### 4. Mtime Tracking Refresh

After index-modifying operations (`write_mem`, `edit_mem`, `link_mem`, `unlink_mem`, `fix_links`, `reindex_mems`), the tracked database modification time is refreshed to prevent false-positive rebuilds on subsequent operations.

## Implementation Details

### Files Changed

1. **`packages/mcp/src/memory-service-manager.ts`** (new file)
   - Singleton manager class
   - Index sync detection logic
   - Automatic reindexing

2. **`packages/mcp/src/index.ts`**
   - All 22 instances of `new MemoryService()` replaced with `memoryServiceManager.getService()`
   - Added `refreshDbMtime()` calls after index-modifying operations
   - Added cleanup on server shutdown (SIGINT handlers)

### Key Methods

- `getService(config)`: Gets or creates singleton instance, checks sync before returning
- `checkIndexSync(config)`: Determines if index needs rebuilding
- `ensureIndexSync(config)`: Rebuilds index from all memory files
- `refreshDbMtime(config)`: Updates tracked DB mtime after operations
- `destroyAll()`: Cleanup on server shutdown

## How It Works

### Normal Operation Flow

1. Tool call requests MemoryService via `getService()`
2. Sync check runs:
   - Compares DB mtime with memory file mtimes
   - Checks if DB mtime changed since last check
3. If in sync: Returns cached service instance
4. Operation executes (e.g., `write_mem` creates file and indexes it)
5. `refreshDbMtime()` updates tracked timestamp

### Git Pull Scenario Flow

1. Developer runs `git pull` while server is running
2. Git replaces database file with new version
3. Next tool call triggers `getService()`
4. Sync check detects DB mtime changed (Case 3)
5. System automatically:
   - Logs: `🔍 Index sync check: DB file modification time changed (likely from git pull)`
   - Logs: `Reindexing X memory file(s) from ...`
   - Rebuilds index from all memory files
   - Logs: `✅ Successfully reindexed X memory file(s) in Xms`
6. Server continues with fresh, synchronized index

## Benefits

- ✅ **Handles Git Pull Automatically**: No manual intervention needed after pulling changes
- ✅ **Prevents False Rebuilds**: Normal operations don't trigger unnecessary reindexing
- ✅ **Single Database Connection**: Eliminates file locking issues
- ✅ **Memory Files as Source of Truth**: Index always reflects actual file state
- ✅ **Better Performance**: Cached instances reduce overhead
- ✅ **Comprehensive Logging**: Clear visibility into when and why reindexing occurs

## Logging

The implementation includes informative logging:

- **Sync Detection**: `🔍 Index sync check: ... Reindexing needed.`
- **Reindex Start**: `Reindexing X memory file(s) from /path...`
- **Reindex Complete**: `✅ Successfully reindexed X memory file(s) in Xms`
- **Errors**: `❌ Failed to reindex memories: error`

All logging uses `console.error` (stderr) to avoid interfering with MCP protocol (stdout).

## Testing Considerations

- Test in multi-developer scenarios with git pull
- Verify no false rebuilds after normal operations
- Ensure proper cleanup on server shutdown
- Monitor log output for expected reindex triggers

## Related Files

- `packages/mcp/src/memory-service-manager.ts`
- `packages/mcp/src/index.ts`
- `packages/shared/src/memory/memory-service.ts`
- `packages/shared/src/utils/flexsearch.ts`
