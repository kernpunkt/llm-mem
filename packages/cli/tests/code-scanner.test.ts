import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanTypescriptOrJavascriptFile } from "../src/code-scanner.js";

describe("code-scanner", () => {
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

  it("detects functions, classes, and comments with basic heuristics", async () => {
    const tmp = join(tmpdir(), `scanner_${Date.now()}.ts`);
    const content = `// header comment\n\nimport { readFile } from 'fs'\n\nexport function foo() {\n  // inner comment\n  return 1;\n}\n\nexport const bar = () => 2;\n\nexport class Baz {\n  method() { return 3; }\n}\n\nexport interface IFoo { a: number }\n\nexport { foo as FooAlias };\n`;
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
    expect(types).toContain("interface");
    expect(types).toContain("method");
  });
});


