import { loadConfig } from "./config-parser.js";
import { MemoryConfig } from "./types.js";

/**
 * Configuration management for CLI
 */

let cachedConfig: MemoryConfig | null = null;

/**
 * Gets or loads configuration
 */
export async function getConfig(options: {
  config?: string;
  memoryStorePath?: string;
  indexPath?: string;
}): Promise<MemoryConfig> {
  if (cachedConfig && !options.config && !options.memoryStorePath && !options.indexPath) {
    return cachedConfig;
  }
  
  const config = await loadConfig(options);
  
  // Cache only if no explicit overrides
  if (!options.config && !options.memoryStorePath && !options.indexPath) {
    cachedConfig = config;
  }
  
  return config;
}

/**
 * Clears cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

