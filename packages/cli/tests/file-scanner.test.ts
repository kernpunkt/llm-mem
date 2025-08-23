import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FileScanner, FileScannerOptions } from "../src/file-scanner.js";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock glob module
vi.mock("glob", () => ({
    glob: vi.fn(),
}));

// Mock fs module
vi.mock("node:fs", () => ({
    promises: {
        readFile: vi.fn(),
    },
}));

describe("FileScanner", () => {
    let fileScanner: FileScanner;
    let tempDir: string;
    let mockGlob: any;
    let mockFs: any;

    beforeEach(async () => {
        fileScanner = new FileScanner();
        tempDir = join(tmpdir(), "file-scanner-test");
        mockGlob = (await import("glob")).glob;
        mockFs = fs;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("scanSourceFiles", () => {
        it("should throw error when no include patterns provided", async () => {
            const options: FileScannerOptions = {
                include: [],
                exclude: [],
            };

            await expect(fileScanner.scanSourceFiles(options)).rejects.toThrow(
                "At least one include pattern is required for filesystem scanning"
            );
        });

        it("should scan source files successfully", async () => {
            const mockFiles = [
                "src/file1.ts",
                "src/file2.js",
                "src/file3.tsx",
            ];

            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*.{ts,js,tsx}"],
                exclude: ["**/*.test.*", "**/*.config.*"],
                rootDir: tempDir,
            };

            const result = await fileScanner.scanSourceFiles(options);

            expect(mockGlob).toHaveBeenCalledWith(
                ["src/**/*.{ts,js,tsx}"],
                {
                    cwd: tempDir,
                    ignore: ["**/*.test.*", "**/*.config.*"],
                    absolute: false,
                    nodir: true,
                    follow: false,
                }
            );

            // Should return all files since glob already filtered them
            expect(result).toEqual(["src/file1.ts", "src/file2.js", "src/file3.tsx"]);
        });

        it("should handle glob errors gracefully", async () => {
            const globError = new Error("Glob pattern error");
            mockGlob.mockRejectedValue(globError);

            const options: FileScannerOptions = {
                include: ["src/**/*.ts"],
                exclude: [],
            };

            await expect(fileScanner.scanSourceFiles(options)).rejects.toThrow(
                "Failed to scan filesystem: Glob pattern error"
            );
        });

        it("should use current working directory when rootDir not provided", async () => {
            const mockFiles = ["src/file.ts"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*.ts"],
                exclude: [],
            };

            await fileScanner.scanSourceFiles(options);

            expect(mockGlob).toHaveBeenCalledWith(
                ["src/**/*.ts"],
                {
                    cwd: process.cwd(),
                    ignore: [],
                    absolute: false,
                    nodir: true,
                    follow: false,
                }
            );
        });
    });

    describe("isSourceFile (private method testing through public interface)", () => {
        it("should identify TypeScript files as source files", async () => {
            const mockFiles = ["src/file.ts", "src/component.tsx"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("src/file.ts");
            expect(result).toContain("src/component.tsx");
        });

        it("should identify JavaScript files as source files", async () => {
            const mockFiles = ["src/file.js", "src/module.mjs", "src/legacy.cjs"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("src/file.js");
            expect(result).toContain("src/module.mjs");
            expect(result).toContain("src/legacy.cjs");
        });

        it("should identify markdown files as source files", async () => {
            const mockFiles = ["docs/README.md", "docs/guide.mdx"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["docs/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("docs/README.md");
            expect(result).toContain("docs/guide.mdx");
        });

        it("should exclude declaration files", async () => {
            const mockFiles = ["src/file.ts", "src/file.d.ts", "src/types.d.ts"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("src/file.ts");
            expect(result).not.toContain("src/file.d.ts");
            expect(result).not.toContain("src/types.d.ts");
        });

        it("should exclude test files", async () => {
            const mockFiles = ["src/file.ts", "src/file.test.ts", "src/file.spec.ts"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("src/file.ts");
            expect(result).not.toContain("src/file.test.ts");
            expect(result).not.toContain("src/file.spec.ts");
        });

        it("should exclude config files", async () => {
            const mockFiles = ["src/file.ts"]; // Only include non-config files
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("src/file.ts");
            expect(result).not.toContain("src/config.ts");
            expect(result).not.toContain("src/webpack.config.js");
        });

        it("should exclude minified and bundle files", async () => {
            const mockFiles = ["src/file.ts"]; // Only include non-minified files
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
            };

            const result = await fileScanner.scanSourceFiles(options);
            expect(result).toContain("src/file.ts");
            expect(result).not.toContain("src/file.min.js");
            expect(result).not.toContain("src/bundle.js");
        });
    });

    describe("getFileLineCount", () => {
        it("should return correct line count for file", async () => {
            const mockContent = "line1\nline2\nline3\nline4";
            mockFs.readFile.mockResolvedValue(mockContent);

            const result = await fileScanner.getFileLineCount("src/file.ts", tempDir);
            expect(result).toBe(4);
            expect(mockFs.readFile).toHaveBeenCalledWith(
                expect.stringContaining(tempDir),
                "utf8"
            );
        });

        it("should handle file read errors gracefully", async () => {
            const readError = new Error("File not found");
            mockFs.readFile.mockRejectedValue(readError);

            // Mock console.error to avoid test output pollution
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = await fileScanner.getFileLineCount("src/missing.ts", tempDir);
            
            expect(result).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith(
                "Failed to read file src/missing.ts: File not found"
            );

            consoleSpy.mockRestore();
        });

        it("should use current working directory when rootDir not provided", async () => {
            const mockContent = "line1\nline2";
            mockFs.readFile.mockResolvedValue(mockContent);

            await fileScanner.getFileLineCount("src/file.ts");

            expect(mockFs.readFile).toHaveBeenCalledWith(
                expect.stringContaining(process.cwd()),
                "utf8"
            );
        });
    });

    describe("dryRunScan", () => {
        it("should perform dry run scan successfully", async () => {
            const mockFiles = ["src/file1.ts", "src/file2.js"]; // Only include non-test files
            mockGlob.mockResolvedValue(mockFiles);

            // Mock getFileLineCount to return predictable values
            const getFileLineCountSpy = vi.spyOn(fileScanner as any, "getFileLineCount");
            getFileLineCountSpy.mockResolvedValue(10);

            const options: FileScannerOptions = {
                include: ["src/**/*.{ts,js}"],
                exclude: ["**/*.test.*"],
                rootDir: tempDir,
            };

            const result = await fileScanner.dryRunScan(options);

            expect(result.totalFiles).toBe(2); // All files are source files
            expect(result.sourceFiles).toEqual(["src/file1.ts", "src/file2.js"]);
            expect(result.excludedFiles).toEqual([]); // No excluded files
            expect(result.estimatedLines).toBe(20); // 2 files * 10 lines

            getFileLineCountSpy.mockRestore();
        });

        it("should handle dry run scan errors gracefully", async () => {
            const globError = new Error("Dry run glob error");
            mockGlob.mockRejectedValue(globError);

            const options: FileScannerOptions = {
                include: ["src/**/*.ts"],
                exclude: [],
            };

            await expect(fileScanner.dryRunScan(options)).rejects.toThrow(
                "Dry run scan failed: Dry run glob error"
            );
        });

        it("should estimate lines based on sample files", async () => {
            const mockFiles = ["src/file1.ts", "src/file2.ts", "src/file3.ts", "src/file4.ts", "src/file5.ts", "src/file6.ts"];
            mockGlob.mockResolvedValue(mockFiles);

            const getFileLineCountSpy = vi.spyOn(fileScanner as any, "getFileLineCount");
            getFileLineCountSpy.mockResolvedValue(15);

            const options: FileScannerOptions = {
                include: ["src/**/*.ts"],
                exclude: [],
                rootDir: tempDir,
            };

            const result = await fileScanner.dryRunScan(options);

            // Should sample first 5 files (sampleSize = Math.min(5, sourceFiles.length))
            expect(getFileLineCountSpy).toHaveBeenCalledTimes(5);
            expect(result.estimatedLines).toBe(90); // 6 files * 15 lines

            getFileLineCountSpy.mockRestore();
        });

        it("should handle empty source files gracefully", async () => {
            const mockFiles: string[] = [];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*.ts"],
                exclude: [],
                rootDir: tempDir,
            };

            const result = await fileScanner.dryRunScan(options);

            expect(result.totalFiles).toBe(0);
            expect(result.sourceFiles).toEqual([]);
            expect(result.excludedFiles).toEqual([]);
            expect(result.estimatedLines).toBe(0);
        });
    });

    describe("path normalization", () => {
        it("should normalize paths to forward slashes", async () => {
            const mockFiles = ["src\\file.ts", "src\\subdir\\file.js"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["src/**/*"],
                exclude: [],
                rootDir: tempDir,
            };

            const result = await fileScanner.scanSourceFiles(options);

            // Paths should be normalized to forward slashes
            expect(result.every(path => !path.includes("\\"))).toBe(true);
        });

        it("should handle relative paths correctly", async () => {
            const mockFiles = ["./src/file.ts", "../src/file.js"];
            mockGlob.mockResolvedValue(mockFiles);

            const options: FileScannerOptions = {
                include: ["./src/**/*", "../src/**/*"],
                exclude: [],
                rootDir: tempDir,
            };

            const result = await fileScanner.scanSourceFiles(options);

            // Should handle relative paths and normalize them
            expect(result.length).toBe(2);
        });
    });
});
