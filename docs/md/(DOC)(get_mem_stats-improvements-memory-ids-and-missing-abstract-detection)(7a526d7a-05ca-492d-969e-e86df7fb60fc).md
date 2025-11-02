---
id: 7a526d7a-05ca-492d-969e-e86df7fb60fc
title: 'get_mem_stats Improvements: Memory IDs and Missing Abstract Detection'
tags:
  - get_mem_stats
  - implementation
  - memory-ids
  - abstract-detection
  - statistics
  - completed
category: DOC
created_at: '2025-11-02T13:20:06.628Z'
updated_at: '2025-11-02T13:20:06.628Z'
last_reviewed: '2025-11-02T13:20:06.628Z'
links: []
sources:
  - IMPROVE_GET_MEM_STATS_PLAN.md
abstract: >-
  Enhanced get_mem_stats function to display memory IDs in all sections and
  detect memories missing abstracts. All implementation complete, tests passing.
---

# get_mem_stats Function Improvements

## Overview
Enhanced the `get_mem_stats` function with two key improvements:
1. **Added memory IDs to all listing sections** - Makes it easier for LLMs to find specific memories
2. **Added missing abstract detection** - Identifies memories without abstracts or with empty/whitespace-only abstracts

## Implementation Details

### Phase 1: Memory IDs in All Sections
Updated formatter to display memory IDs alongside titles in:
- Memories with Few Links
- Broken Links  
- Unidirectional Links
- Link Mismatches (YAML vs Markdown)
- Invalid Links
- Memories with Few Tags
- Memories Needing Verification

**Files Modified:**
- `packages/shared/src/tools/formatters.ts` - Added `(ID: ${m.id})` to all memory listing sections
- `packages/mcp/src/index.ts` - Updated HTTP transport handler with same ID additions

### Phase 2: Missing Abstract Detection
Added new `memories_without_abstract` field to detect memories missing abstracts.

**Detection Logic:**
```typescript
const memoriesWithoutAbstract = allMemories
  .filter(memory => !memory.abstract || memory.abstract.trim().length === 0)
  .map(memory => ({
    id: memory.id,
    title: memory.title
  }));
```

**Edge Cases Handled:**
- `abstract: undefined` → Detected as missing
- `abstract: ""` → Detected as missing  
- `abstract: "   "` (whitespace only) → Detected as missing
- `abstract: "Valid text"` → NOT detected (valid)

**Files Modified:**
1. `packages/shared/src/tools/types.ts` - Added `memories_without_abstract: Array<{ id: string; title: string }>` to `GetMemStatsResult` interface (line 141)
2. `packages/shared/src/memory/memory-service.ts`:
   - Added calculation logic (lines 386-392)
   - Added recommendation: "Add abstracts to X memories to improve searchability and summaries" (lines 463-465)
   - Updated return type and empty state handling
3. `packages/shared/src/tools/formatters.ts` - Added count and formatted list section (lines 174, 180-181)
4. `packages/mcp/src/index.ts` - Updated HTTP transport handler with abstract section (lines 1370, 1376-1377)

### Phase 3: Testing
**Test Coverage:**
- New test: "should detect memories without abstract" covering all edge cases
- Updated existing tests to verify `memories_without_abstract` field
- All 30 tests passing in `memory-service-extended.test.ts`

**Test File:** `packages/shared/tests/memory-service-extended.test.ts`
- Lines 90, 125, 169-172: Updated assertions
- Lines 172-212: New comprehensive test for abstract detection

## Output Format

The stats output now includes:

```
⚠️ **Memories Needing Attention**
- Without Sources: X
- Without Abstract: X
- Needing Verification: X

📋 **Memories Without Abstract:**
  - Memory Title (ID: uuid-here)
```

All memory listings now show IDs for easier reference: `- Memory Title (ID: uuid-here, additional info)`

## Success Criteria Met

✅ All memory listings include IDs
✅ New section lists memories without abstracts  
✅ Recommendation generated when abstracts missing
✅ All edge cases handled correctly
✅ 30/30 tests passing
✅ No breaking changes (backward compatible)
✅ Consistent formatting throughout

## Technical Notes

- **Type Safety**: All changes maintain TypeScript strict mode compliance
- **Backward Compatibility**: New `memories_without_abstract` field is optional in API
- **Null Handling**: `!memory.abstract` check handles undefined, null, and falsy values
- **Performance**: Detection logic runs alongside existing statistics calculations with minimal overhead

## Related Files

- `packages/shared/src/tools/types.ts`
- `packages/shared/src/memory/memory-service.ts`
- `packages/shared/src/tools/formatters.ts`
- `packages/mcp/src/index.ts`
- `packages/shared/tests/memory-service-extended.test.ts`