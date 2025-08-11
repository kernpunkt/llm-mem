import path from "node:path";
import { z } from "zod";
import { CoverageConfig, CoverageOptions } from "./types.js";

export const allowedCategories = ["DOC", "ADR", "CTX"] as const;

const NonEmptyString = z.string().min(1, "must be a non-empty string");

export function isValidGlobPattern(pattern: string): boolean {
    if (typeof pattern !== "string") return false;
    if (pattern.length === 0) return false;
    if (pattern.includes("\u0000")) return false;
    // Disallow absolute paths
    if (path.isAbsolute(pattern)) return false;
    // Normalize POSIX separators for consistency
    const normalized = pattern.replace(/\\/g, "/");
    // Disallow parent traversal anywhere in pattern
    if (normalized.includes("../") || normalized.startsWith("../") || normalized === "..") return false;
    // Basic sanity: allow common glob tokens and path characters
    // We don't aggressively validate the full glob grammar; we just prevent obviously unsafe inputs
    return true;
}

const GlobArray = z
    .array(NonEmptyString)
    .refine((arr: string[]) => arr.every((p: string) => isValidGlobPattern(p)), {
        message: "contains invalid glob pattern (absolute paths and parent traversal are not allowed)",
    })
    .optional();

export const CoverageOptionsSchema = z.object({
    config: NonEmptyString.optional(),
    categories: z.array(z.enum(allowedCategories)).optional(),
    threshold: z.number().min(0).max(100).optional(),
    exclude: GlobArray,
    include: GlobArray,
    verbose: z.boolean().optional(),
    memoryStorePath: NonEmptyString.optional(),
    indexPath: NonEmptyString.optional(),
    onProgress: z
        .function()
        .args(z.number(), z.number(), z.string())
        .returns(z.void())
        .optional(),
});

export function validateOptionsStrict(options: CoverageOptions): { ok: boolean; message?: string } {
    const result = CoverageOptionsSchema.safeParse(options);
    if (!result.success) {
        const issue = result.error.issues[0];
        const pathLabel = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return { ok: false, message: `Invalid options - ${pathLabel}${issue.message}` };
    }
    return { ok: true };
}

const ThresholdsSchema = z
    .record(z.number().min(0).max(100))
    .and(z.object({ overall: z.number().min(0).max(100).optional() }).partial())
    .optional();

export const CoverageConfigSchema = z.object({
    thresholds: ThresholdsSchema,
    exclude: GlobArray,
    include: GlobArray,
    categories: z.array(z.enum(allowedCategories)).optional(),
    memoryStorePath: NonEmptyString.optional(),
    indexPath: NonEmptyString.optional(),
});

export function validateCoverageConfig(config: CoverageConfig): { ok: boolean; message?: string } {
    const result = CoverageConfigSchema.safeParse(config);
    if (!result.success) {
        const issue = result.error.issues[0];
        const pathLabel = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return { ok: false, message: `Invalid configuration - ${pathLabel}${issue.message}` };
    }
    return { ok: true };
}

export function isSafeRelativePath(filePath: string): boolean {
    if (typeof filePath !== "string") return false;
    if (filePath.length === 0) return false;
    if (filePath.includes("\u0000")) return false; // Null byte
    if (path.isAbsolute(filePath)) return false; // Disallow absolute paths
    const normalized = path.posix.normalize(filePath).replace(/\\/g, "/");
    if (normalized.startsWith("../") || normalized === "..") return false; // Disallow parent traversal
    return true;
}

export function validateSourceFilePathOrThrow(filePath: string): void {
    if (!isSafeRelativePath(filePath)) {
        throw new Error(`Invalid source file path: ${filePath}. Only project-relative paths are allowed and parent traversal is forbidden.`);
    }
}
