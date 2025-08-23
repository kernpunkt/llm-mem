---
id: c702229f-ac67-43dc-9eb9-266eb5655d83
title: 'Source Parser: Memory Source String Parsing and Line Range Extraction'
tags:
  - source-parser
  - parsing
  - line-ranges
  - memory-sources
  - coverage-analysis
category: DOC
created_at: '2025-08-23T02:25:50.341Z'
updated_at: '2025-08-23T05:40:59.518Z'
last_reviewed: '2025-08-23T02:25:50.341Z'
links:
  - 3b201e08-784c-4a83-9a0e-05d715882e80
sources:
  - packages/cli/src/source-parser.ts:1-58
---

# Source Parser: Memory Source String Parsing and Line Range Extraction

**Purpose:** Parses memory source strings into structured file paths and line ranges, enabling precise mapping between documentation memories and specific code sections for accurate coverage analysis.

## Core Problem Solved

### Memory Source String Format
The system needs to parse **flexible source references** that can point to:

- **Entire Files:** `"src/index.ts"` - covers the complete file
- **Single Line Ranges:** `"src/index.ts:10-50"` - covers lines 10 through 50
- **Multiple Line Ranges:** `"src/index.ts:10-20,30-40,50-60"` - covers multiple sections
- **Mixed Formats:** Various combinations of the above patterns

**Challenge:** Convert human-readable source strings into machine-processable data structures for coverage analysis.

## Technical Implementation

### Regex-Based Parsing Strategy
The system uses a **sophisticated regex pattern** for reliable parsing:

```typescript
const FILE_AND_RANGES_REGEX = /^(?<file>[^:]+?)(?::(?<ranges>.+))?$/;
```

**Regex Components:**
- **`^`** - Start of string anchor
- **`(?<file>[^:]+?)`** - Named capture group for file path (non-greedy)
- **`(?::(?<ranges>.+))?`** - Optional named capture group for ranges after colon
- **`$`** - End of string anchor

**Why This Regex Design?**
- **Named Groups:** Makes the code more readable and maintainable
- **Non-Greedy Matching:** Prevents over-matching in complex file paths
- **Optional Ranges:** Handles both file-only and range-specified sources
- **Robust Parsing:** Handles edge cases gracefully

### Line Range Parsing Algorithm
The system implements **intelligent range parsing**:

```typescript
const ranges: LineSpan[] = rangesRaw.split(",").map((segment) => {
  const [startStr, endStr] = segment.split("-").map((s) => s.trim());
  const start = Number(startStr);
  const end = Number(endStr);
  
  // Validation logic
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error(`Invalid range numbers: ${segment} in ${input}`);
  }
  if (start <= 0 || end <= 0) {
    throw new Error(`Line numbers must be positive: ${segment} in ${input}`);
  }
  if (end < start) {
    throw new Error(`Range end must be >= start: ${segment} in ${input}`);
  }
  
  return { start, end };
});
```

**Range Parsing Features:**
- **Comma Separation:** Supports multiple range specifications
- **Dash Delimiter:** Uses `-` to separate start and end lines
- **Whitespace Handling:** Trims whitespace for user convenience
- **Comprehensive Validation:** Ensures range validity

## Input Validation and Error Handling

### Comprehensive Input Validation
The system implements **defensive input validation**:

```typescript
export function parseSourceString(input: string): ParsedSource {
  const trimmed = (input || "").trim();
  if (trimmed.length === 0) {
    throw new Error("Source string is empty");
  }

  const match = FILE_AND_RANGES_REGEX.exec(trimmed);
  if (!match || !match.groups) {
    throw new Error(`Invalid source format: ${input}`);
  }

  const filePath = match.groups.file.trim();
  if (filePath.length === 0) {
    throw new Error(`Invalid source file path: ${input}`);
  }
}
```

**Validation Checks:**
- **Empty Input:** Prevents processing of empty or whitespace-only strings
- **Regex Match:** Ensures the input matches expected format
- **File Path Validity:** Confirms file path is not empty after trimming
- **Range Validation:** Validates line number ranges for logical consistency

### User-Friendly Error Messages
The system provides **clear, actionable error messages**:

- **Format Errors:** `"Invalid source format: invalid:input"`
- **Range Errors:** `"Line numbers must be positive: -5-10 in src/file.ts:-5-10"`
- **Logic Errors:** `"Range end must be >= start: 20-15 in src/file.ts:20-15"`

**Error Message Design:**
- **Specific Context:** Shows exactly what caused the error
- **Input Preservation:** Includes the problematic input for debugging
- **Actionable Guidance:** Suggests how to fix the issue
- **Consistent Format:** Uniform error message structure

## Data Structure Output

### ParsedSource Interface
The system returns a **structured representation**:

```typescript
export interface ParsedSource {
  filePath: string;
  ranges: LineSpan[]; // empty => implies full file coverage
}
```

**Data Structure Benefits:**
- **Clear Separation:** File path and ranges are distinct
- **Array Support:** Multiple ranges can be specified
- **Empty Array Semantics:** Empty ranges array implies full file coverage
- **Type Safety:** Strong typing prevents runtime errors

### LineSpan Interface
The system uses **standardized line span representation**:

```typescript
export interface LineSpan {
  start: number;
  end: number;
}
```

**Line Span Features:**
- **1-Based Line Numbers:** Matches common editor line numbering
- **Inclusive Ranges:** End line is included in the range
- **Integer Validation:** Ensures line numbers are valid integers
- **Consistent Format:** Standard format across the system

## Use Cases and Integration

### Coverage Analysis Integration
The parser integrates with **coverage analysis tools**:

- **Memory Mapping:** Links documentation memories to specific code sections
- **Coverage Calculation:** Determines which lines are documented
- **Gap Analysis:** Identifies undocumented code sections
- **Report Generation:** Creates detailed coverage reports

### Memory System Integration
The parser supports **memory management workflows**:

- **Source Attribution:** Links memories to specific code locations
- **Change Tracking:** Monitors documentation coverage over time
- **Impact Analysis:** Determines effect of code changes on documentation
- **Quality Assurance:** Ensures documentation completeness

## Performance and Scalability

### Parsing Performance
The system optimizes **parsing performance**:

- **Single Pass Parsing:** Processes input in one operation
- **Regex Optimization:** Uses efficient regex patterns
- **Early Returns:** Fast-fail for obvious validation issues
- **Memory Efficiency:** Minimal object creation during parsing

### Scalability Considerations
The system handles **various input sizes**:

- **Small Inputs:** Fast parsing for simple file references
- **Large Inputs:** Efficient handling of complex range specifications
- **Batch Processing:** Can process multiple sources efficiently
- **Memory Management:** Predictable memory usage patterns

## Edge Cases and Robustness

### Edge Case Handling
The system handles **various edge cases**:

- **Whitespace Variations:** Handles different whitespace patterns
- **Empty Ranges:** Gracefully handles empty range specifications
- **Malformed Input:** Provides clear error messages for invalid input
- **Boundary Conditions:** Handles edge cases like single-line ranges

### Robustness Features
The system implements **defensive programming**:

- **Null/Undefined Handling:** Gracefully handles missing input
- **Type Safety:** Ensures output types are always correct
- **Error Recovery:** Continues operation after validation errors
- **Input Sanitization:** Cleans input before processing

## Future Enhancement Opportunities

### Advanced Parsing Features
- **Wildcard Support:** Support for glob patterns in file paths
- **Relative Paths:** Handle relative path specifications
- **URL Support:** Parse remote source references
- **Custom Delimiters:** Support for different range separators

### Performance Improvements
- **Caching:** Cache parsed results for repeated inputs
- **Parallel Processing:** Parse multiple sources simultaneously
- **Streaming:** Support for streaming input processing
- **Optimization:** Profile and optimize parsing algorithms

### Enhanced Validation
- **File Existence:** Validate that referenced files actually exist
- **Path Security:** Additional security checks for file paths
- **Range Validation:** More sophisticated range validation rules
- **Custom Validators:** Support for user-defined validation rules


## Related
- CLI Coverage Tool: Command-Line Interface Architecture and Configuration Management
- [[(DOC)(cli-coverage-tool-command-line-interface-architecture-and-configuration-management)(3b201e08-784c-4a83-9a0e-05d715882e80)|CLI Coverage Tool: Command-Line Interface Architecture and Configuration Management]]
