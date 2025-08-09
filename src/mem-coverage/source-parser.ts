import { ParsedSource, LineSpan } from "./types.js";
import { validateSourceFilePathOrThrow } from "./validation.js";

const FILE_AND_RANGES_REGEX = /^(?<file>[^:]+?)(?::(?<ranges>.+))?$/;

/**
 * Parses a memory source string into file path and line ranges.
 * Supported formats:
 * - "src/index.ts"
 * - "src/index.ts:10-50"
 * - "src/index.ts:10-20,30-40,50-60"
 */
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

  // Exported for Step 12 validation; keep parsing behavior unchanged.
  // Consumers can call validateSourceFilePathOrThrow(filePath) if desired.

  const rangesRaw = match.groups.ranges?.trim();
  if (!rangesRaw) {
    return { filePath, ranges: [] };
  }

  const ranges: LineSpan[] = rangesRaw.split(",").map((segment) => {
    const [startStr, endStr] = segment.split("-").map((s) => s.trim());
    const start = Number(startStr);
    const end = Number(endStr);
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

  return { filePath, ranges };
}


