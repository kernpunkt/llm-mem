import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanTypescriptOrJavascriptFile } from "../src/code-scanner.js";

describe("code-scanner (JS)", () => {
  const createdFiles: string[] = [];

  afterEach(async () => {
    // Clean up temporary files
    for (const file of createdFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors if file was already deleted
      }
    }
    createdFiles.length = 0;
  });

  it("detects functions, classes, exports, comments in .js files", async () => {
    const tmp = join(tmpdir(), `scanner_${Date.now()}.js`);
    const content = `// js header\n\nimport fs from 'fs'\n\nexport function foo() { return 1 }\n\nexport const bar = () => 2\n\nexport class Baz { method() { return 3 } }\n\n/* block comment */\n`;
    await fs.writeFile(tmp, content, "utf8");
    createdFiles.push(tmp);

    const result = await scanTypescriptOrJavascriptFile(tmp);
    expect(result.totalLines).toBeGreaterThan(0);
    const types = result.elements.map(e => e.type);
    expect(types).toContain("function");
    expect(types).toContain("class");
    expect(types).toContain("comment");
    expect(types).toContain("export");
    expect(types).toContain("import");
  });
});


