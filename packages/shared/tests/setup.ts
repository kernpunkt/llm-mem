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
  } catch (error) {
    // Ignore errors when trying to clean up SQLite files
  }
});

// Final cleanup after all tests complete
afterAll(async () => {
  console.log("Running global test cleanup...");
  
  try {
    // Wait a bit to ensure all file handles are released
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clean up any test directories that might have been created during testing
    const testDirPatterns = [
      "flexsearch-test-index-",
      "memories-test-",
      "memories-test-index-"
    ];
    
    for (const pattern of testDirPatterns) {
      try {
        const entries = await fs.readdir(process.cwd());
        for (const entry of entries) {
          if (entry.startsWith(pattern.slice(0, -1))) {
            const fullPath = join(process.cwd(), entry);
            try {
              const stat = await fs.stat(fullPath);
              if (stat.isDirectory()) {
                await fs.rm(fullPath, { recursive: true, force: true }).catch(() => {
                  console.error(`Failed to remove test directory: ${fullPath}`);
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
    
    // Final cleanup of any remaining SQLite database files
    try {
      const entries = await fs.readdir(process.cwd());
      for (const entry of entries) {
        if (entry.startsWith("memory-store") && (entry.endsWith(".sqlite") || entry.endsWith(".db"))) {
          await fs.rm(entry, { force: true }).catch(() => {
            console.error(`Failed to remove SQLite file: ${entry}`);
          });
        }
        // Also clean up SQLite journal and WAL files
        if (entry.startsWith("memory-store") && (entry.includes(".sqlite-journal") || entry.includes(".sqlite-wal") || entry.includes(".sqlite-shm"))) {
          await fs.rm(entry, { force: true }).catch(() => {
            // Ignore cleanup errors for journal files
          });
        }
      }
    } catch (error) {
      // Ignore errors when trying to clean up SQLite files
    }
    
    console.log("Global test cleanup completed");
  } catch (error) {
    console.error("Error during global test cleanup:", error);
  }
}, 30000); // 30 second timeout for cleanup
