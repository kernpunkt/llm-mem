# Code Documentation Coverage Tools Plan

## Overview

This plan outlines the development of a CLI tool that generates coverage reports for code documentation, similar to `pnpm test:coverage`. The tool will analyze the codebase and identify undocumented code parts by cross-referencing memory sources with actual code files.

## Problem Statement

When using the memory system for code documentation with categories:
- **ADR**: Architecture decision records
- **DOC**: Documentation about features, classes and functions  
- **CTX**: Context memories for LLM sessions

The `sources` array contains filenames and line numbers that are covered by each memory. We need a tool to identify which parts of the codebase are not yet documented.

## Core Concepts

### Source Format
Sources in memories follow this format:
```
src/index.ts:1-50
src/memory/types.ts:15-30
tests/index.test.ts:100-150
```

### Coverage Analysis
- Parse all memory sources to build a coverage map
- Scan codebase files to identify uncovered lines
- Generate reports showing documentation gaps
- Support different coverage granularities (file, function, line)

## Tool Architecture

### 1. Coverage Service (`src/mem-coverage/coverage-service.ts`)

**Core Responsibilities:**
- Parse memory sources and build coverage maps
- Scan codebase files for uncovered code
- Calculate coverage statistics
- Generate coverage reports

**Key Methods:**
```typescript
interface CoverageService {
  // Build coverage map from all memories
  buildCoverageMap(): Promise<CoverageMap>
  
  // Analyze specific file for coverage
  analyzeFileCoverage(filePath: string, coverageMap: CoverageMap): FileCoverage
  
  // Generate coverage report
  generateReport(options: CoverageReportOptions): CoverageReport
  
  // Find undocumented code sections
  findUndocumentedSections(coverageMap: CoverageMap): UndocumentedSection[]
}
```

### 2. Source Parser (`src/mem-coverage/source-parser.ts`)

**Responsibilities:**
- Parse source strings from memory sources array
- Extract file paths and line ranges
- Handle different source formats
- Validate source references

**Source Format Support:**
```typescript
// Basic file coverage
"src/index.ts"

// Line range coverage  
"src/index.ts:10-50"

// Multiple line ranges
"src/index.ts:10-20,30-40,50-60"

// Function coverage (future)
"src/index.ts:function:createServer"

// Class coverage (future)
"src/index.ts:class:MemoryService"
```

### 3. Code Scanner (`src/mem-coverage/code-scanner.ts`)

**Responsibilities:**
- Scan codebase files for code sections
- Identify functions, classes, methods
- Parse TypeScript/JavaScript syntax (extensible for other languages)
- Extract meaningful code boundaries

**Modular Language Support:**
- **TypeScript/JavaScript**: Primary support with AST parsing
- **Extensible Architecture**: Plugin system for other languages
- **Language Detection**: Auto-detect file types and apply appropriate parser

**Supported Code Elements:**
- Functions and methods
- Classes and interfaces
- Exported variables/constants
- Import/export statements
- Comments and documentation blocks

### 4. Report Generator (`src/mem-coverage/report-generator.ts`)

**Responsibilities:**
- Generate console reports (primary focus)
- Calculate coverage percentages
- Highlight undocumented sections
- Provide actionable recommendations
- Modular architecture for future report formats

**Report Types:**
- **Console**: Simple text output for CLI (initial implementation)
- **Extensible Architecture**: Plugin system for future formats (HTML, JSON, Markdown)
- **Report Interface**: Common interface for all report types

## Data Structures

### Coverage Map
```typescript
interface CoverageMap {
  files: Map<string, FileCoverage>
  totalLines: number
  coveredLines: number
  coveragePercentage: number
}

interface FileCoverage {
  path: string
  totalLines: number
  coveredLines: number
  uncoveredSections: LineRange[]
  coveredSections: LineRange[]
  functions: FunctionCoverage[]
  classes: ClassCoverage[]
}

interface LineRange {
  start: number
  end: number
  type: 'function' | 'class' | 'method' | 'export' | 'comment'
}
```

### Coverage Report
```typescript
interface CoverageReport {
  summary: CoverageSummary
  files: FileCoverageReport[]
  recommendations: CoverageRecommendation[]
  generatedAt: string
}

interface CoverageSummary {
  totalFiles: number
  totalLines: number
  coveredLines: number
  coveragePercentage: number
  undocumentedFiles: string[]
  lowCoverageFiles: string[]
}
```

## CLI Interface

### Command Structure
```bash
# Basic coverage report
pnpm coverage

# Coverage with custom config file
pnpm coverage --config=./custom-coverage.json

# Coverage for specific categories
pnpm coverage --categories=DOC,ADR

# Coverage with minimum threshold
pnpm coverage --threshold=80

# Coverage excluding certain files
pnpm coverage --exclude="tests/*,*.test.ts"

# Coverage using vitest config
pnpm coverage --config=vitest.config.ts

# Coverage using jest config
pnpm coverage --config=jest.config.js
```

### Command Options
```typescript
interface CoverageOptions {
  config?: string                    // Path to config file
  categories?: string[]              // Filter by memory categories
  threshold?: number                 // Minimum coverage percentage
  exclude?: string[]                 // File patterns to exclude
  include?: string[]                 // File patterns to include
  verbose?: boolean                  // Detailed output
  memoryStorePath?: string          // Path to memory store
  indexPath?: string                // Path to search index
}
```

## Implementation Phases

### Phase 1: Core Coverage Analysis
1. **Source Parser** - Parse memory sources into coverage maps
2. **Basic File Scanner** - Identify covered/uncovered lines (TypeScript/JavaScript)
3. **Console Report** - Simple text-based coverage output
4. **Basic CLI** - Command-line interface
5. **Configuration Parser** - Support for custom config files

### Phase 2: Advanced Analysis
1. **Code Structure Analysis** - Parse functions, classes, methods
2. **Granular Coverage** - Function/class-level coverage
3. **Multi-Config Support** - Vitest and Jest config integration
4. **Coverage Thresholds** - Fail builds on low coverage
5. **Modular Architecture** - Extensible code scanner and report generator

### Phase 3: Enhanced Features
1. **Language Extensions** - Support for additional programming languages
2. **Coverage History** - Track coverage over time
3. **Coverage Trends** - Identify improving/declining areas
4. **CI/CD Integration** - Automated coverage checks
5. **Additional Report Formats** - HTML, JSON, Markdown reports

## Integration with Memory System

### CLI Tool Architecture
The coverage CLI tool will be a separate application that uses the memory system infrastructure:

```typescript
// CLI tool structure
src/mem-coverage/
├── cli.ts                    // Main CLI entry point
├── coverage-service.ts       // Core coverage logic
├── source-parser.ts          // Parse memory sources
├── code-scanner.ts           // Analyze code files
├── report-generator.ts       // Generate console reports
├── config-parser.ts          // Parse various config formats
└── types.ts                  // Coverage-specific types
```

### Memory System Integration
```typescript
// CLI tool uses memory system as dependency
import { MemoryService } from '../memory/memory-service.js';

class CoverageCLI {
  private memoryService: MemoryService;
  
  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
  }
  
  async generateReport(options: CoverageOptions): Promise<void> {
    const memories = await this.memoryService.getAllMemories();
    const coverageMap = this.buildCoverageMap(memories);
    const report = this.generateConsoleReport(coverageMap, options);
    console.log(report);
  }
}
```

### Separation from MCP Tools
- **CLI Tool**: Standalone application for coverage analysis
- **MCP Tools**: Focus on memory operations, not coverage
- **Shared Infrastructure**: Both use same memory services
- **Independent Development**: Coverage tool can evolve separately

## Configuration

### Flexible Configuration Support

The CLI tool will support multiple configuration formats:

#### 1. Custom Coverage Config (`.coverage.json`)
```json
{
  "thresholds": {
    "overall": 80,
    "src": 90,
    "tests": 50
  },
  "exclude": [
    "node_modules/**",
    "dist/**",
    "*.test.ts",
    "*.spec.ts"
  ],
  "include": [
    "src/**/*.ts",
    "src/**/*.js"
  ],
  "categories": ["DOC", "ADR", "CTX"],
  "memoryStorePath": "./memories",
  "indexPath": "./memories/index"
}
```

#### 2. Vitest Config Integration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      // Standard vitest coverage config
      exclude: ['node_modules/**', 'dist/**'],
      include: ['src/**/*.ts'],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 80
        }
      }
    }
  }
})
```

#### 3. Jest Config Integration
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Configuration Parser (`src/mem-coverage/config-parser.ts`)
```typescript
interface ConfigParser {
  // Parse various config formats
  parseConfig(filePath: string): Promise<CoverageConfig>
  
  // Detect config type
  detectConfigType(filePath: string): 'coverage' | 'vitest' | 'jest'
  
  // Convert to unified format
  normalizeConfig(config: any, type: string): CoverageConfig
}
```

## Testing Strategy

### Unit Tests
- Source parser edge cases
- Code scanner accuracy
- Report generator formatting
- Coverage calculation logic

### Integration Tests
- End-to-end coverage analysis
- Memory system integration
- CLI command execution
- Report generation workflows

### Test Coverage
- Test the coverage tool itself
- Ensure comprehensive coverage of coverage logic
- Mock external dependencies appropriately

## Performance Considerations

### Optimization Strategies
1. **Incremental Analysis** - Only re-analyze changed files
2. **Caching** - Cache parsed coverage maps
3. **Parallel Processing** - Analyze multiple files concurrently
4. **Lazy Loading** - Load file contents only when needed

### Memory Usage
- Stream large files instead of loading entirely
- Use efficient data structures for coverage maps
- Implement garbage collection for temporary data

## Future Enhancements

### Advanced Features
1. **Coverage Visualization** - Interactive charts and graphs
2. **Coverage Alerts** - Notify when coverage drops
3. **Coverage Goals** - Set and track coverage targets
4. **Coverage Comments** - Inline coverage status in code

### Language Extensions
1. **Python Support** - AST parsing for Python files
2. **Go Support** - Go AST analysis
3. **Rust Support** - Rust syntax parsing
4. **Plugin System** - Third-party language parsers

### Integration Features
1. **IDE Integration** - VSCode/Cursor extensions
2. **Git Integration** - Coverage in pull requests
3. **CI/CD Integration** - Automated coverage checks
4. **Coverage Badges** - Status badges for repositories
5. **Additional Config Formats** - ESLint, Prettier config integration

## Success Metrics

### Technical Metrics
- Coverage analysis accuracy > 95%
- Report generation time < 30 seconds for large codebases
- Memory usage < 100MB for typical projects
- CLI response time < 5 seconds

### User Experience Metrics
- Clear, actionable coverage reports
- Easy integration with existing workflows
- Helpful recommendations for improving coverage
- Intuitive CLI interface

## Implementation Timeline

### Week 1-2: Foundation
- Source parser implementation
- Basic file scanner
- Core coverage service

### Week 3-4: CLI and Reports
- Command-line interface
- Console report generator
- Basic HTML reports

### Week 5-6: Advanced Features
- Code structure analysis
- Granular coverage reporting
- Integration with memory system

### Week 7-8: Polish and Testing
- Comprehensive testing
- Performance optimization
- Documentation and examples

## Conclusion

This coverage tool will provide valuable insights into code documentation completeness, helping teams identify gaps and maintain high-quality documentation standards. The tool will integrate seamlessly with the existing memory system while providing actionable feedback for improving code documentation coverage.
