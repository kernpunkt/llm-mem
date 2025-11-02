import { afterAll, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";

// Global test cleanup to ensure no test files are left behind
afterEach(async () => {
  // Wait a bit to ensure all file handles are released
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clean up any SQLite database files that might be left behind
  try {
    const entries = await fs.readdir(process.cwd());
    for (const entry of entries) {
      if (entry.startsWith("memory-store") && (entry.endsWith(".sqlite") || entry.endsWith(".db"))) {
        await fs.rm(entry, { force: true }).catch(() => {
          // Ignore cleanup errors for SQLite files
        });
      }
      // Also clean up SQLite journal and WAL files
      if (entry.startsWith("memory-store") && (entry.includes(".sqlite-journal") || entry.includes(".sqlite-wal") || entry.includes(".sqlite-shm"))) {
        await fs.rm(entry, { force: true }).catch(() => {
          // Ignore cleanup errors for journal files
        });
      }
    }
  } catch {
    // Ignore errors when trying to clean up SQLite files
  }
});

// Final cleanup after all tests complete
afterAll(async () => {
  try {
    // Wait a bit to ensure all file handles are released
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clean up any test directories that might have been created during testing
    const testDirPatterns = [
      "mem-tools-test-",
      "memories-test-",
    ];
    
    for (const pattern of testDirPatterns) {
      try {
        const entries = await fs.readdir(process.cwd());
        for (const entry of entries) {
          if (entry.includes(pattern)) {
            const fullPath = join(process.cwd(), entry);
            try {
              const stat = await fs.stat(fullPath);
              if (stat.isDirectory()) {
                await fs.rm(fullPath, { recursive: true, force: true }).catch(() => {
                  // Ignore cleanup errors
                });
              }
            } catch {
              // Entry might have been removed already
            }
          }
        }
      } catch {
        // Ignore readdir errors
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}, 10000); // 10 second timeout for cleanup
