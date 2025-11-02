/**
 * CLI-specific types for mem-tools package
 */

export interface CliConfig {
  memoryStorePath?: string;
  indexPath?: string;
}

export interface MemoryConfig {
  memoryStorePath: string;
  indexPath: string;
}

export interface CommandOptions {
  config?: string;
  memoryStorePath?: string;
  indexPath?: string;
  json?: boolean;
}

export interface CliArgs {
  command?: string;
  [key: string]: string | boolean | string[] | undefined;
}

export interface CommandResult {
  exitCode: number;
  output?: string;
}

