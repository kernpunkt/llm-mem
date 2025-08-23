---
id: ef581532-2751-47ae-b2d8-e6ef4a869daf
title: 'Test Infrastructure: Global Test Setup and Cleanup Strategy'
tags:
  - testing
  - test-infrastructure
  - cleanup-strategy
  - test-isolation
  - file-system
category: DOC
created_at: '2025-08-23T02:23:00.860Z'
updated_at: '2025-08-23T05:41:02.801Z'
last_reviewed: '2025-08-23T02:23:00.860Z'
links:
  - 6b6b39f3-45ef-4205-98b7-460bf0b1c010
sources:
  - packages/shared/tests/setup.ts:1-94
---

# Test Infrastructure: Global Test Setup and Cleanup Strategy

**Purpose:** Ensures test isolation and prevents test pollution by implementing comprehensive cleanup strategies for file system resources, database files, and temporary test artifacts across the entire test suite.

## Test Isolation Philosophy

### Why Global Cleanup is Critical
The memory system creates **persistent artifacts** that can interfere with test execution:

- **SQLite Database Files:** Memory store databases persist between tests
- **Search Indexes:** FlexSearch index files accumulate test data
- **Test Directories:** Temporary directories created during testing
- **File Handles:** Open file handles can prevent cleanup

**Without proper cleanup:**
- Tests can see data from previous test runs
- File system conflicts cause test failures
- Database corruption from concurrent access
- Resource leaks that affect test performance

### Cleanup Strategy Design
The system implements a **multi-layered cleanup approach**:

1. **Per-Test Cleanup:** Clean up after each individual test
2. **Global Cleanup:** Comprehensive cleanup after all tests complete
3. **Timeout Protection:** Prevents cleanup from hanging indefinitely
4. **Error Resilience:** Continues cleanup even if individual operations fail

## Implementation Details

### Per-Test Cleanup (afterEach)
```typescript
afterEach(async () => {
  // Wait for file handles to be released
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clean up SQLite database files
  try {
    const entries = await fs.readdir(process.cwd());
    for (const entry of entries) {
      if (entry.startsWith("memory-store") && (entry.endsWith(".sqlite") || entry.endsWith(".db"))) {
        await fs.rm(entry, { force: true }).catch(() => {
          // Ignore cleanup errors for SQLite files
        });
      }
    }
  } catch (error) {
    // Ignore errors when trying to clean up SQLite files
  }
});
```

**Key Design Decisions:**
- **100ms Delay:** Allows file handles to be properly released
- **Pattern Matching:** Identifies test-specific database files
- **Force Removal:** Ensures cleanup even if files are locked
- **Error Swallowing:** Cleanup failures don't break test execution

### Global Cleanup (afterAll)
```typescript
afterAll(async () => {
  console.log("Running global test cleanup...");
  
  // Wait for all file handles to be released
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Clean up test directories and remaining files
  // ... comprehensive cleanup logic
  
}, 30000); // 30 second timeout for cleanup
```

**Global Cleanup Features:**
- **1 Second Delay:** Extended wait for complex cleanup operations
- **30 Second Timeout:** Prevents cleanup from hanging indefinitely
- **Comprehensive Coverage:** Removes all test artifacts
- **Progress Logging:** Visibility into cleanup operations

## File System Cleanup Patterns

### SQLite Database Cleanup
The system handles **all SQLite-related files**:

```typescript
// Main database files
if (entry.startsWith("memory-store") && (entry.endsWith(".sqlite") || entry.endsWith(".db"))) {
  await fs.rm(entry, { force: true });
}

// Journal and WAL files
if (entry.startsWith("memory-store") && (entry.includes(".sqlite-journal") || entry.includes(".sqlite-wal") || entry.includes(".sqlite-shm"))) {
  await fs.rm(entry, { force: true });
}
```

**Why All SQLite Files?**
- **Main Database:** Contains test data that must be removed
- **Journal Files:** Write-ahead log files that can be large
- **WAL Files:** Write-ahead logging files for concurrent access
- **Shared Memory:** Memory-mapped files for performance

### Test Directory Cleanup
The system identifies and removes **test-specific directories**:

```typescript
const testDirPatterns = [
  "flexsearch-test-index-",
  "memories-test-",
  "memories-test-index-"
];
```

**Pattern Matching Strategy:**
- **Prefix Matching:** Identifies test directories reliably
- **Flexible Patterns:** Handles various naming conventions
- **Recursive Removal:** Removes entire directory trees
- **Force Cleanup:** Overrides permission issues

## Error Handling and Resilience

### Graceful Failure Handling
The cleanup system is designed to **continue operating** even when individual operations fail:

```typescript
await fs.rm(entry, { force: true }).catch(() => {
  // Ignore cleanup errors for SQLite files
});
```

**Why Swallow Errors?**
- **Test Continuity:** Individual cleanup failures shouldn't break tests
- **Resource Availability:** Some files may be locked or already removed
- **Platform Differences:** File system behavior varies across operating systems
- **Concurrent Access:** Multiple tests may be cleaning up simultaneously

### Timeout Protection
The global cleanup has a **30-second timeout** to prevent hanging:

```typescript
afterAll(async () => {
  // ... cleanup logic
}, 30000); // 30 second timeout for cleanup
```

**Timeout Benefits:**
- **Prevents Hanging:** Cleanup won't block CI/CD pipelines
- **Resource Protection:** Prevents resource exhaustion
- **Debugging Support:** Timeout errors indicate cleanup issues
- **CI/CD Compatibility:** Works reliably in automated environments

## Performance Considerations

### Cleanup Timing Strategy
The system uses **strategic delays** to balance cleanup effectiveness with test performance:

- **Per-Test Delay:** 100ms - Minimal delay for file handle release
- **Global Delay:** 1000ms - Extended delay for complex cleanup
- **Timeout:** 30000ms - Maximum cleanup time allowance

**Timing Trade-offs:**
- **Shorter Delays:** Faster test execution but potential cleanup failures
- **Longer Delays:** More reliable cleanup but slower test execution
- **Balanced Approach:** Optimized for typical file system behavior

### Resource Usage Optimization
The cleanup system minimizes **resource overhead**:

- **Async Operations:** Non-blocking cleanup operations
- **Batch Processing:** Processes multiple files efficiently
- **Early Returns:** Skips unnecessary operations when possible
- **Memory Management:** Minimal memory allocation during cleanup

## Integration with Test Framework

### Vitest Integration
The system is designed for **Vitest test framework**:

```typescript
import { afterAll, afterEach } from "vitest";
```

**Vitest-Specific Features:**
- **Hook Integration:** Uses Vitest's lifecycle hooks
- **Async Support:** Full async/await support in cleanup
- **Error Reporting:** Integrates with Vitest's error reporting
- **Timeout Support:** Leverages Vitest's timeout mechanisms

### Cross-Platform Compatibility
The cleanup system works across **different operating systems**:

- **Windows:** Handles file locking and permission issues
- **macOS:** Manages file system quirks and temporary files
- **Linux:** Optimized for Unix file system behavior
- **CI/CD:** Works reliably in containerized environments

## Future Enhancement Opportunities

### Advanced Cleanup Features
- **Parallel Cleanup:** Multi-threaded cleanup for large test suites
- **Selective Cleanup:** Clean up only specific test artifacts
- **Cleanup Metrics:** Track cleanup performance and success rates
- **Custom Cleanup Hooks:** Allow tests to register custom cleanup logic

### Performance Improvements
- **Incremental Cleanup:** Clean up artifacts as they're created
- **Background Cleanup:** Non-blocking cleanup operations
- **Cleanup Caching:** Remember cleanup patterns for efficiency
- **Smart Delays:** Adaptive delays based on file system performance

## Testing the Cleanup System

### Self-Testing Strategy
The cleanup system should be **tested itself**:

- **Cleanup Verification:** Ensure artifacts are actually removed
- **Performance Testing:** Measure cleanup time and resource usage
- **Error Handling:** Test various failure scenarios
- **Cross-Platform Testing:** Verify behavior across operating systems

### Monitoring and Debugging
- **Cleanup Logging:** Track cleanup operations and timing
- **Error Reporting:** Log cleanup failures for debugging
- **Performance Metrics:** Monitor cleanup performance over time
- **Resource Tracking:** Ensure no resource leaks during cleanup


- CLI Test Infrastructure: Test Environment Setup and Cleanup Management


## Related
- CLI Test Infrastructure: Test Environment Setup and Cleanup Management
- [[(DOC)(cli-test-infrastructure-test-environment-setup-and-cleanup-management)(6b6b39f3-45ef-4205-98b7-460bf0b1c010)|CLI Test Infrastructure: Test Environment Setup and Cleanup Management]]
