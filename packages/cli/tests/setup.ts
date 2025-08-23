import { promises as fs } from "node:fs";
import { join } from "node:path";

// Global test setup and teardown
const testsTmpDir = join(process.cwd(), "tests/tmp");
const memoriesDir = join(process.cwd(), "memories");

// Clean up after all tests complete
afterAll(async () => {
  try {
    // Clean up test temporary files
    await fs.rm(testsTmpDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory was already deleted
  }
  
  try {
    // Clean up FlexSearch database and memory files created during tests
    await fs.rm(memoriesDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory was already deleted
  }
});
