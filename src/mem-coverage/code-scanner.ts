import { promises as fs } from "node:fs";
import { LineRange, FileCoverage } from "./types.js";

/**
 * Basic code scanner with minimal heuristics for Phase 1.
 * - Counts total lines
 * - Distinguishes comment-only lines (e.g., // or block comments)
 * - Detects functions and classes via regex (approximation)
 */
export async function scanTypescriptOrJavascriptFile(filePath: string): Promise<{
  totalLines: number;
  elements: LineRange[];
}> {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const elements: LineRange[] = [];

  const functionRegex = /(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)/;
  const constArrowFnRegex = /(export\s+)?(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/;
  const classRegex = /(export\s+)?class\s+([A-Za-z0-9_]+)/;

  // Very rough: mark lines containing definitions as single-line ranges for now
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (functionRegex.test(line)) {
      const name = (line.match(functionRegex)?.[3]) || "anonymous";
      elements.push({ start: i + 1, end: i + 1, type: "function", name });
    } else if (constArrowFnRegex.test(line)) {
      const name = (line.match(constArrowFnRegex)?.[3]) || "anonymous";
      elements.push({ start: i + 1, end: i + 1, type: "function", name });
    } else if (classRegex.test(line)) {
      const name = (line.match(classRegex)?.[2]) || "AnonymousClass";
      elements.push({ start: i + 1, end: i + 1, type: "class", name });
    } else if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*\/.*/.test(line)) {
      elements.push({ start: i + 1, end: i + 1, type: "comment" });
    }
  }

  return { totalLines: lines.length, elements };
}

export function toInitialFileCoverage(path: string, totalLines: number): FileCoverage {
  return {
    path,
    totalLines,
    coveredLines: 0,
    uncoveredSections: [],
    coveredSections: [],
    functions: [],
    classes: [],
  };
}


