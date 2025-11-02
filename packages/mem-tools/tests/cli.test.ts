import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseArgs } from "../src/cli.js";
import { clearConfigCache } from "../src/config.js";
import { discoverConfigFile, loadConfig } from "../src/config-parser.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI Argument Parsing", () => {
  it("should parse command correctly", () => {
    const args = parseArgs(["read-mem", "--identifier=test"]);
    expect(args.command).toBe("read-mem");
    expect(args.identifier).toBe("test");
  });

  it("should parse --memoryStorePath argument", () => {
    const args = parseArgs(["list-mems", "--memoryStorePath=./custom"]);
    expect(args.memoryStorePath).toBe("./custom");
  });

  it("should parse --memoryStorePath with space", () => {
    const args = parseArgs(["list-mems", "--memoryStorePath", "./custom"]);
    expect(args.memoryStorePath).toBe("./custom");
  });

  it("should parse --indexPath argument", () => {
    const args = parseArgs(["list-mems", "--indexPath=./custom-index"]);
    expect(args.indexPath).toBe("./custom-index");
  });

  it("should parse --json flag", () => {
    const args = parseArgs(["read-mem", "--identifier=test", "--json"]);
    expect(args.json).toBe(true);
  });

  it("should parse --config argument", () => {
    const args = parseArgs(["read-mem", "--config=./config.json"]);
    expect(args.config).toBe("./config.json");
  });
});

describe("Config Loading", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), "mem-tools-test-"));
    clearConfigCache();
  });

  afterEach(async () => {
    clearConfigCache();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should use defaults when no config or CLI args provided", async () => {
    const config = await loadConfig({ cwd: testDir });
    expect(config.memoryStorePath).toBe("./memories");
    expect(config.indexPath).toBe("./memories/index");
  });

  it("should use CLI args when provided without config file", async () => {
    const config = await loadConfig({
      memoryStorePath: "./custom-memories",
      indexPath: "./custom-index",
      cwd: testDir,
    });
    expect(config.memoryStorePath).toBe("./custom-memories");
    expect(config.indexPath).toBe("./custom-index");
  });

  it("should use CLI args over config file values", async () => {
    // Create config file
    const configPath = join(testDir, ".memory.config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        memoryStorePath: "./config-memories",
        indexPath: "./config-index",
      }),
      "utf-8"
    );

    const config = await loadConfig({
      memoryStorePath: "./cli-memories",
      cwd: testDir,
    });
    expect(config.memoryStorePath).toBe("./cli-memories");
    expect(config.indexPath).toBe("./config-index"); // From config file
  });

  it("should discover config file in current directory", async () => {
    const configPath = join(testDir, ".memory.config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        memoryStorePath: "./discovered-memories",
        indexPath: "./discovered-index",
      }),
      "utf-8"
    );

    const discovered = await discoverConfigFile(testDir);
    expect(discovered).toBe(configPath);

    const config = await loadConfig({ cwd: testDir });
    expect(config.memoryStorePath).toBe("./discovered-memories");
    expect(config.indexPath).toBe("./discovered-index");
  });

  it("should handle partial CLI args with config file", async () => {
    const configPath = join(testDir, ".memory.config.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        memoryStorePath: "./config-memories",
        indexPath: "./config-index",
      }),
      "utf-8"
    );

    // Only provide indexPath via CLI
    const config = await loadConfig({
      indexPath: "./cli-index",
      cwd: testDir,
    });
    expect(config.memoryStorePath).toBe("./config-memories"); // From config
    expect(config.indexPath).toBe("./cli-index"); // From CLI
  });
});

