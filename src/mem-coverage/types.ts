/**
 * Coverage Tool - Core Types
 *
 * Shared type definitions for the documentation coverage tool.
 */

export interface LineSpan {
  start: number;
  end: number;
}

export interface CoverageMap {
  files: Map<string, FileCoverage>;
  totalLines: number;
  coveredLines: number;
  coveragePercentage: number;
}

export interface FileCoverage {
  path: string;
  totalLines: number;
  coveredLines: number;
  uncoveredSections: LineRange[];
  coveredSections: LineRange[];
  functions: FunctionCoverage[];
  classes: ClassCoverage[];
}

export type CodeElementType = "function" | "class" | "method" | "export" | "import" | "interface" | "comment";

export interface LineRange extends LineSpan {
  type: CodeElementType;
  name?: string;
}

export interface FunctionCoverage extends LineSpan {
  name: string;
  isCovered: boolean;
}

export interface ClassCoverage extends LineSpan {
  name: string;
  isCovered: boolean;
}

export interface CoverageReport {
  summary: CoverageSummary;
  files: FileCoverageReport[];
  recommendations: CoverageRecommendation[];
  generatedAt: string;
}

export interface CoverageSummary {
  totalFiles: number;
  totalLines: number;
  coveredLines: number;
  coveragePercentage: number;
  undocumentedFiles: string[];
  lowCoverageFiles: string[];
  // Optional aggregated symbol coverage (Phase 2 granular stats)
  functionsTotal?: number;
  functionsCovered?: number;
  classesTotal?: number;
  classesCovered?: number;
  functionsCoveragePercentage?: number;
  classesCoveragePercentage?: number;
}

export interface FileCoverageReport {
  path: string;
  totalLines: number;
  coveredLines: number;
  coveragePercentage: number;
  uncoveredSections: LineSpan[];
  functionsTotal?: number;
  functionsCovered?: number;
  classesTotal?: number;
  classesCovered?: number;
}

export interface CoverageRecommendation {
  file: string;
  message: string;
  priority: "high" | "medium" | "low";
}

export interface CoverageOptions {
  config?: string;
  categories?: string[];
  threshold?: number;
  exclude?: string[];
  include?: string[];
  verbose?: boolean;
  memoryStorePath?: string;
  indexPath?: string;
}

export interface CoverageConfig {
  thresholds?: {
    overall?: number;
    [scope: string]: number | undefined; // e.g., src, tests
  };
  exclude?: string[];
  include?: string[];
  categories?: string[];
  memoryStorePath?: string;
  indexPath?: string;
}

/**
 * Parsed representation of a memory source string such as:
 *   "src/index.ts"
 *   "src/index.ts:10-50"
 *   "src/index.ts:10-20,30-40"
 */
export interface ParsedSource {
  filePath: string;
  ranges: LineSpan[]; // empty => implies full file coverage
}


