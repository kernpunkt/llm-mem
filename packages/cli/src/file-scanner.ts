import { glob } from "glob";
import { promises as fs } from "node:fs";
import { join, relative, resolve } from "node:path";

export interface FileScannerOptions {
    include: string[];
    exclude: string[];
    rootDir?: string;
}

export class FileScanner {
    /**
     * Scans the filesystem for source files based on include/exclude patterns.
     * 
     * @param options - Configuration options for file scanning
     * @returns Promise resolving to array of file paths relative to root directory
     */
    async scanSourceFiles(options: FileScannerOptions): Promise<string[]> {
        const { include, exclude, rootDir = process.cwd() } = options;
        
        if (!include || include.length === 0) {
            throw new Error("At least one include pattern is required for filesystem scanning");
        }

        try {
            // Use glob to find files matching include patterns
            const allFiles = await glob(include, {
                cwd: rootDir,
                ignore: exclude,
                absolute: false,
                nodir: true,
                follow: false,
            });

            // Filter to only source files and normalize paths
            const sourceFiles = allFiles
                .filter((filePath: string) => this.isSourceFile(filePath))
                .map((filePath: string) => this.normalizePath(filePath, rootDir));

            return sourceFiles;
        } catch (error) {
            throw new Error(`Failed to scan filesystem: ${(error as Error).message}`);
        }
    }

    /**
     * Determines if a file is a source file that should be analyzed.
     * 
     * @param filePath - Path to the file
     * @returns True if the file is a source file
     */
    private isSourceFile(filePath: string): boolean {
        const lowerPath = filePath.toLowerCase();
        
        // Common source file extensions
        const sourceExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
            '.vue', '.svelte', '.astro', '.mdx', '.md'
        ];
        
        // Check if file has a source extension
        const hasSourceExtension = sourceExtensions.some(ext => lowerPath.endsWith(ext));
        
        // Exclude common non-source files
        const isNonSource = lowerPath.includes('.d.ts') || 
                           lowerPath.includes('.map') ||
                           lowerPath.includes('.min.') ||
                           lowerPath.includes('.bundle.') ||
                           lowerPath.includes('.test.') ||
                           lowerPath.includes('.spec.') ||
                           lowerPath.includes('.stories.') ||
                           lowerPath.includes('.config.');
        
        return hasSourceExtension && !isNonSource;
    }

    /**
     * Normalizes file paths to be relative to the root directory.
     * 
     * @param filePath - Path to normalize
     * @param rootDir - Root directory for normalization
     * @returns Normalized relative path
     */
    private normalizePath(filePath: string, rootDir: string): string {
        const absolutePath = resolve(rootDir, filePath);
        return relative(rootDir, absolutePath).replace(/\\/g, '/'); // Normalize to forward slashes
    }

    /**
     * Gets the total line count for a file.
     * 
     * @param filePath - Path to the file
     * @param rootDir - Root directory for resolving relative paths
     * @returns Promise resolving to line count
     */
    async getFileLineCount(filePath: string, rootDir: string = process.cwd()): Promise<number> {
        try {
            const absolutePath = resolve(rootDir, filePath);
            const content = await fs.readFile(absolutePath, 'utf8');
            return content.split('\n').length;
        } catch (error) {
            console.error(`Failed to read file ${filePath}: ${(error as Error).message}`);
            return 0;
        }
    }

    /**
     * Performs a dry-run scan to show what files would be processed.
     * 
     * @param options - Configuration options for file scanning
     * @returns Promise resolving to scan preview information
     */
    async dryRunScan(options: FileScannerOptions): Promise<{
        totalFiles: number;
        sourceFiles: string[];
        excludedFiles: string[];
        estimatedLines: number;
    }> {
        const { include, exclude, rootDir = process.cwd() } = options;
        
        try {
            // Get all files (including excluded ones for comparison)
            const allFiles = await glob(include, {
                cwd: rootDir,
                absolute: false,
                nodir: true,
                follow: false,
            });

            // Get files after applying exclude patterns
            const sourceFiles = await this.scanSourceFiles(options);
            
            // Find excluded files
            const excludedFiles = allFiles.filter((file: string) => 
                !sourceFiles.includes(file) && this.isSourceFile(file)
            );

            // Estimate total lines (sample a few files for estimation)
            let estimatedLines = 0;
            const sampleSize = Math.min(5, sourceFiles.length);
            if (sampleSize > 0) {
                const sampleFiles = sourceFiles.slice(0, sampleSize);
                const sampleLines = await Promise.all(
                    sampleFiles.map(file => this.getFileLineCount(file, rootDir))
                );
                const avgLines = sampleLines.reduce((sum, lines) => sum + lines, 0) / sampleSize;
                estimatedLines = Math.round(avgLines * sourceFiles.length);
            }

            return {
                totalFiles: sourceFiles.length,
                sourceFiles,
                excludedFiles,
                estimatedLines,
            };
        } catch (error) {
            throw new Error(`Dry run scan failed: ${(error as Error).message}`);
        }
    }
}
