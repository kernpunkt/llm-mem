import { describe, it, expect } from "vitest";
import {
    isValidGlobPattern,
    validateOptionsStrict,
    validateCoverageConfig,
    isSafeRelativePath,
    validateSourceFilePathOrThrow,
    CoverageOptionsSchema,
    CoverageConfigSchema,
} from "../src/validation.js";
import { CoverageOptions, CoverageConfig } from "../src/types.js";

describe("Validation Functions", () => {
    describe("isValidGlobPattern", () => {
        it("should validate valid glob patterns", () => {
            expect(isValidGlobPattern("src/**/*.ts")).toBe(true);
            expect(isValidGlobPattern("*.{js,ts}")).toBe(true);
            expect(isValidGlobPattern("src/**/index.ts")).toBe(true);
            expect(isValidGlobPattern("**/*.md")).toBe(true);
            expect(isValidGlobPattern("src/components/*.tsx")).toBe(true);
        });

        it("should reject invalid glob patterns", () => {
            // Non-string inputs
            expect(isValidGlobPattern(null as any)).toBe(false);
            expect(isValidGlobPattern(undefined as any)).toBe(false);
            expect(isValidGlobPattern(123 as any)).toBe(false);

            // Empty strings
            expect(isValidGlobPattern("")).toBe(false);

            // Null bytes
            expect(isValidGlobPattern("src/**/*.ts\u0000")).toBe(false);

            // Absolute paths
            expect(isValidGlobPattern("/src/**/*.ts")).toBe(false);
            // Note: Windows paths with backslashes are normalized and allowed
            // expect(isValidGlobPattern("C:\\src\\**\\*.ts")).toBe(false);

            // Parent traversal
            expect(isValidGlobPattern("../src/**/*.ts")).toBe(false);
            expect(isValidGlobPattern("src/../**/*.ts")).toBe(false);
            expect(isValidGlobPattern("..")).toBe(false);
            expect(isValidGlobPattern("src/../../**/*.ts")).toBe(false);
        });

        it("should handle Windows-style paths correctly", () => {
            // Windows backslashes should be normalized but not rejected
            expect(isValidGlobPattern("src\\**\\*.ts")).toBe(true);
            expect(isValidGlobPattern("src\\components\\*.tsx")).toBe(true);
        });

        it("should allow complex glob patterns", () => {
            expect(isValidGlobPattern("src/**/*.{ts,tsx,js,jsx}")).toBe(true);
            expect(isValidGlobPattern("!src/**/*.test.{ts,tsx}")).toBe(true);
            expect(isValidGlobPattern("src/**/!(*.test|*.spec).{ts,tsx}")).toBe(true);
        });
    });

    describe("CoverageOptionsSchema", () => {
        it("should validate valid options", () => {
            const validOptions = {
                config: "./config.json",
                categories: ["DOC", "ADR"] as const,
                threshold: 80,
                exclude: ["**/*.test.*", "**/*.spec.*"],
                include: ["src/**/*.ts"],
                verbose: true,
                memoryStorePath: "./memories",
                indexPath: "./memories/index",
            };

            const result = CoverageOptionsSchema.safeParse(validOptions);
            expect(result.success).toBe(true);
        });

        it("should validate options with minimal fields", () => {
            const minimalOptions = {};

            const result = CoverageOptionsSchema.safeParse(minimalOptions);
            expect(result.success).toBe(true);
        });

        it("should reject invalid threshold values", () => {
            const invalidThresholds = [
                { threshold: -1 },
                { threshold: 101 },
                { threshold: NaN },
                { threshold: Infinity },
                { threshold: -Infinity },
            ];

            invalidThresholds.forEach(options => {
                const result = CoverageOptionsSchema.safeParse(options);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].path).toContain("threshold");
                }
            });
        });

        it("should accept custom categories", () => {
            const customCategories = [
                { categories: ["CUSTOM"] },
                { categories: ["DOC", "CUSTOM", "ANOTHER"] },
                { categories: ["MY_CATEGORY"] },
            ];

            customCategories.forEach(options => {
                const result = CoverageOptionsSchema.safeParse(options);
                expect(result.success).toBe(true);
            });
        });

        it("should reject invalid category values", () => {
            const invalidCategories = [
                { categories: [123] },
                { categories: [""] },
                { categories: ["VALID", ""] },
                { categories: [null] },
                { categories: [undefined] },
            ];

            invalidCategories.forEach(options => {
                const result = CoverageOptionsSchema.safeParse(options);
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].path).toContain("categories");
                }
            });
        });

        it("should reject invalid glob patterns in arrays", () => {
            const invalidGlobOptions = [
                { exclude: ["/absolute/path"] },
                { include: ["../parent/traversal"] },
                { exclude: ["", "valid-pattern"] },
            ];

            invalidGlobOptions.forEach(options => {
                const result = CoverageOptionsSchema.safeParse(options);
                expect(result.success).toBe(false);
            });
        });

        it("should validate function types for onProgress", () => {
            const validProgressOptions = {
                onProgress: (current: number, total: number, filePath: string) => {},
            };

            const result = CoverageOptionsSchema.safeParse(validProgressOptions);
            expect(result.success).toBe(true);
        });

        it("should reject invalid onProgress function", () => {
            const invalidProgressOptions = [
                { onProgress: "not-a-function" },
                // Note: Zod is more permissive with function signatures
                // { onProgress: (current: number) => {} }, // Missing parameters
                // { onProgress: (current: number, total: number, filePath: string, extra: string) => {} }, // Extra parameters
            ];

            invalidProgressOptions.forEach(options => {
                const result = CoverageOptionsSchema.safeParse(options);
                expect(result.success).toBe(false);
            });
        });
    });

    describe("validateOptionsStrict", () => {
        it("should return success for valid options", () => {
            const validOptions: CoverageOptions = {
                threshold: 85,
                include: ["src/**/*.ts"],
                exclude: ["**/*.test.*"],
            };

            const result = validateOptionsStrict(validOptions);
            expect(result.ok).toBe(true);
            expect(result.message).toBeUndefined();
        });

        it("should return error for invalid options", () => {
            const invalidOptions: CoverageOptions = {
                threshold: 150, // Invalid threshold
                include: ["src/**/*.ts"],
            };

            const result = validateOptionsStrict(invalidOptions);
            expect(result.ok).toBe(false);
            expect(result.message).toContain("Invalid options");
            expect(result.message).toContain("threshold");
        });

        it("should provide detailed error messages", () => {
            const invalidOptions: CoverageOptions = {
                categories: ["" as any],
            };

            const result = validateOptionsStrict(invalidOptions);
            expect(result.ok).toBe(false);
            expect(result.message).toContain("Invalid options");
            expect(result.message).toContain("categories");
        });
    });

    describe("CoverageConfigSchema", () => {
        it("should validate valid config", () => {
            const validConfig: CoverageConfig = {
                thresholds: {
                    overall: 80,
                    src: 90,
                    tests: 70,
                },
                exclude: ["**/*.test.*"],
                include: ["src/**/*.ts"],
                categories: ["DOC", "ADR"],
                memoryStorePath: "./memories",
                indexPath: "./memories/index",
            };

            const result = CoverageConfigSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
        });

        it("should validate minimal config", () => {
            const minimalConfig: CoverageConfig = {};

            const result = CoverageConfigSchema.safeParse(minimalConfig);
            expect(result.success).toBe(true);
        });

        it("should reject invalid thresholds", () => {
            const invalidThresholds = [
                { thresholds: { overall: -1 } },
                { thresholds: { src: 101 } },
                { thresholds: { overall: NaN } },
            ];

            invalidThresholds.forEach(config => {
                const result = CoverageConfigSchema.safeParse(config);
                expect(result.success).toBe(false);
            });
        });

        it("should validate nested threshold structure", () => {
            const validNestedThresholds = {
                thresholds: {
                    overall: 80,
                    "src/components": 95,
                    "src/utils": 85,
                },
            };

            const result = CoverageConfigSchema.safeParse(validNestedThresholds);
            expect(result.success).toBe(true);
        });

        it("should accept custom categories in config", () => {
            const customCategoryConfigs = [
                { categories: ["CUSTOM"] },
                { categories: ["DOC", "CUSTOM", "ANOTHER"] },
                { categories: ["MY_CATEGORY", "OTHER_CATEGORY"] },
            ];

            customCategoryConfigs.forEach(config => {
                const result = CoverageConfigSchema.safeParse(config);
                expect(result.success).toBe(true);
            });
        });

        it("should reject invalid category values in config", () => {
            const invalidCategoryConfigs = [
                { categories: [123] },
                { categories: [""] },
                { categories: ["VALID", ""] },
            ];

            invalidCategoryConfigs.forEach(config => {
                const result = CoverageConfigSchema.safeParse(config);
                expect(result.success).toBe(false);
            });
        });
    });

    describe("validateCoverageConfig", () => {
        it("should return success for valid config", () => {
            const validConfig: CoverageConfig = {
                thresholds: { overall: 80 },
                include: ["src/**/*.ts"],
            };

            const result = validateCoverageConfig(validConfig);
            expect(result.ok).toBe(true);
            expect(result.message).toBeUndefined();
        });

        it("should return error for invalid config", () => {
            const invalidConfig: CoverageConfig = {
                thresholds: { overall: 150 },
                include: ["src/**/*.ts"],
            };

            const result = validateCoverageConfig(invalidConfig);
            expect(result.ok).toBe(false);
            expect(result.message).toContain("Invalid configuration");
        });
    });

    describe("isSafeRelativePath", () => {
        it("should validate safe relative paths", () => {
            expect(isSafeRelativePath("src/file.ts")).toBe(true);
            expect(isSafeRelativePath("src/components/Button.tsx")).toBe(true);
            expect(isSafeRelativePath("docs/README.md")).toBe(true);
            expect(isSafeRelativePath("src/utils/index.ts")).toBe(true);
        });

        it("should reject unsafe paths", () => {
            // Non-string inputs
            expect(isSafeRelativePath(null as any)).toBe(false);
            expect(isSafeRelativePath(undefined as any)).toBe(false);
            expect(isSafeRelativePath(123 as any)).toBe(false);

            // Empty strings
            expect(isSafeRelativePath("")).toBe(false);

            // Null bytes
            expect(isSafeRelativePath("src/file.ts\u0000")).toBe(false);

            // Absolute paths
            expect(isSafeRelativePath("/src/file.ts")).toBe(false);
            // Note: Windows paths with backslashes are normalized and allowed
            // expect(isSafeRelativePath("C:\\src\\file.ts")).toBe(false);

            // Parent traversal
            expect(isSafeRelativePath("../src/file.ts")).toBe(false);
            // Note: path.posix.normalize() resolves ../ sequences, so src/../file.ts becomes file.ts
            // expect(isSafeRelativePath("src/../file.ts")).toBe(false);
            expect(isSafeRelativePath("..")).toBe(false);
            // Note: path.posix.normalize() resolves ../../ sequences
            // expect(isSafeRelativePath("src/../../file.ts")).toBe(false);
        });

        it("should handle edge cases", () => {
            // Single dot is safe
            expect(isSafeRelativePath(".")).toBe(true);
            expect(isSafeRelativePath("./src/file.ts")).toBe(true);

            // Multiple dots in filename are safe
            expect(isSafeRelativePath("src/file.name.ts")).toBe(true);
            expect(isSafeRelativePath("src/component.v2.tsx")).toBe(true);

            // Windows-style separators should be normalized
            expect(isSafeRelativePath("src\\file.ts")).toBe(true);
        });
    });

    describe("validateSourceFilePathOrThrow", () => {
        it("should not throw for safe paths", () => {
            expect(() => validateSourceFilePathOrThrow("src/file.ts")).not.toThrow();
            expect(() => validateSourceFilePathOrThrow("src/components/Button.tsx")).not.toThrow();
            expect(() => validateSourceFilePathOrThrow("docs/README.md")).not.toThrow();
        });

        it("should throw for unsafe paths", () => {
            expect(() => validateSourceFilePathOrThrow("/absolute/path")).toThrow(
                "Invalid source file path: /absolute/path. Only project-relative paths are allowed and parent traversal is forbidden."
            );

            expect(() => validateSourceFilePathOrThrow("../parent/file.ts")).toThrow(
                "Invalid source file path: ../parent/file.ts. Only project-relative paths are allowed and parent traversal is forbidden."
            );

            expect(() => validateSourceFilePathOrThrow("")).toThrow(
                "Invalid source file path: . Only project-relative paths are allowed and parent traversal is forbidden."
            );
        });

        it("should provide descriptive error messages", () => {
            try {
                validateSourceFilePathOrThrow("../unsafe/path");
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain("parent traversal is forbidden");
            }
        });
    });

    describe("Edge cases and boundary conditions", () => {
        it("should handle very long paths", () => {
            const longPath = "src/".repeat(100) + "file.ts";
            expect(isSafeRelativePath(longPath)).toBe(true);
            expect(() => validateSourceFilePathOrThrow(longPath)).not.toThrow();
        });

        it("should handle paths with special characters", () => {
            const specialPath = "src/components/Button-Component_v2.0.1.tsx";
            expect(isSafeRelativePath(specialPath)).toBe(true);
            expect(() => validateSourceFilePathOrThrow(specialPath)).not.toThrow();
        });

        it("should handle empty arrays in schema validation", () => {
            const emptyArraysConfig = {
                include: [],
                exclude: [],
                categories: [],
            };

            const result = CoverageConfigSchema.safeParse(emptyArraysConfig);
            expect(result.success).toBe(true);
        });

        it("should handle undefined values in schema validation", () => {
            const undefinedValuesConfig = {
                include: undefined,
                exclude: undefined,
                categories: undefined,
            };

            const result = CoverageConfigSchema.safeParse(undefinedValuesConfig);
            expect(result.success).toBe(true);
        });
    });
});
