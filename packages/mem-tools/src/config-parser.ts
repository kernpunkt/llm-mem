import { promises as fs } from "fs";
import { join, resolve } from "path";
import { MemoryConfig } from "./types.js";

/**
 * Configuration parser for memory tools CLI
 * 
 * Supports .memory.config.json files and automatic discovery
 */

export interface MemoryConfigFile {
  memoryStorePath?: string;
  indexPath?: string;
}

/**
 * Discovers and loads configuration file
 * Searches current directory and parent directories up to the root
 */
export async function discoverConfigFile(cwd: string = process.cwd()): Promise<string | null> {
  const configNames = [".memory.config.json"];
  
  let currentDir = resolve(cwd);
  const root = resolve(currentDir, "/");
  
  while (currentDir !== root) {
    for (const configName of configNames) {
      const configPath = join(currentDir, configName);
      try {
        await fs.access(configPath);
        return configPath;
      } catch {
        // File doesn't exist, continue searching
      }
    }
    // Move up one directory
    currentDir = resolve(currentDir, "..");
  }
  
  return null;
}

/**
 * Parses a memory configuration file
 */
export async function parseConfigFile(filePath: string): Promise<MemoryConfigFile> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const config = JSON.parse(content) as Partial<MemoryConfigFile>;
    
    return {
      memoryStorePath: config.memoryStorePath,
      indexPath: config.indexPath,
    };
  } catch (error) {
    throw new Error(`Failed to parse config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Loads configuration from file or uses defaults
 * 
 * Priority order:
 * 1. CLI arguments (--memoryStorePath, --indexPath) - highest priority
 * 2. Config file (explicit --config or auto-discovered)
 * 3. Defaults (./memories, ./memories/index)
 * 
 * CLI arguments work independently - you can provide just one or both.
 * If no config file is found, CLI arguments and defaults are used.
 */
export async function loadConfig(options: {
  config?: string;
  memoryStorePath?: string;
  indexPath?: string;
  cwd?: string;
}): Promise<MemoryConfig> {
  const { config: configPath, memoryStorePath: cliMemoryPath, indexPath: cliIndexPath, cwd = process.cwd() } = options;
  
  // Try to load from explicit config file or auto-discover
  let configFile: MemoryConfigFile | null = null;
  if (configPath) {
    // Explicit config file provided
    try {
      configFile = await parseConfigFile(configPath);
    } catch (error) {
      // If config file fails but CLI args are provided, continue with CLI args
      if (!cliMemoryPath && !cliIndexPath) {
        console.error(`Error: Failed to load config from ${configPath}: ${error}`);
        throw error;
      }
      // Otherwise, warn but continue - CLI args will be used
      console.error(`Warning: Failed to load config from ${configPath}: ${error}`);
    }
  } else {
    // Auto-discover config file
    // Note: We always try to discover config even if CLI args are provided,
    // because CLI args might only provide one value (e.g., just memoryStorePath)
    // and we want to use config file for the other value (e.g., indexPath)
    // This ensures maximum flexibility while CLI args always take precedence
    const discoveredPath = await discoverConfigFile(cwd);
    if (discoveredPath) {
      try {
        configFile = await parseConfigFile(discoveredPath);
      } catch (error) {
        // Config file parse failed, but we can still use CLI args and defaults
        console.error(`Warning: Failed to load discovered config from ${discoveredPath}: ${error}`);
      }
    }
  }
  
  // Merge with priority: CLI args > Config file > Defaults
  // Each parameter is resolved independently
  return {
    memoryStorePath: cliMemoryPath ?? configFile?.memoryStorePath ?? "./memories",
    indexPath: cliIndexPath ?? configFile?.indexPath ?? "./memories/index",
  };
}

