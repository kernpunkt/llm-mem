import { Memory } from "../memory/types.js";

/**
 * Shared types for memory tool operations
 * 
 * These types define the parameter and result structures for all memory tools,
 * allowing them to be shared between MCP server and CLI implementations.
 */

export type FormatType = "markdown" | "plain" | "json";

// Read Memory Tool
export interface ReadMemParams {
  identifier: string;
  format?: FormatType;
}

export interface ReadMemResult {
  memory: Memory | null;
  formatted: string;
  isError: boolean;
}

// Search Memory Tool
export interface SearchMemParams {
  query: string;
  limit?: number;
  category?: string;
  tags?: string[];
}

export interface SearchMemResult {
  total: number;
  results: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    score: number;
    snippet: string;
  }>;
  isError: boolean;
}

// Link Memory Tool
export interface LinkMemParams {
  source_id: string;
  target_id: string;
  link_text?: string;
}

export interface LinkMemResult {
  message: string;
  isError: boolean;
}

// Unlink Memory Tool
export interface UnlinkMemParams {
  source_id: string;
  target_id: string;
}

export interface UnlinkMemResult {
  message: string;
  isError: boolean;
}

// Reindex Memories Tool
export interface ReindexMemsResult {
  message: string;
  isError: boolean;
}

// Needs Review Tool
export interface NeedsReviewParams {
  date: string; // ISO format date string
}

export interface NeedsReviewResult {
  total: number;
  memories: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    last_reviewed: string;
    created_at: string;
  }>;
  isError: boolean;
}

// List Memories Tool
export interface ListMemsParams {
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface ListMemsResult {
  total: number;
  memories: Memory[];
  isError: boolean;
}

// Get Memory Stats Tool
export interface GetMemStatsResult {
  total_memories: number;
  average_time_since_verification: string;
  memories_needing_verification: Array<{
    id: string;
    title: string;
    days_since_verification: number;
  }>;
  average_links_per_memory: number;
  memories_with_few_links: Array<{
    id: string;
    title: string;
    link_count: number;
  }>;
  orphaned_memories: Array<{ id: string; title: string }>;
  broken_links: Array<{ id: string; title: string; broken_link_id: string }>;
  unidirectional_links: Array<{ id: string; title: string; unidirectional_link_id: string }>;
  link_mismatches: Array<{
    id: string;
    title: string;
    missing_in_markdown: string[];
    missing_in_yaml: string[];
    yaml_link_count: number;
    markdown_link_count: number;
  }>;
  invalid_links: Array<{
    id: string;
    title: string;
    invalid_links: Array<{
      link: string;
      type: 'broken-obsidian' | 'invalid-format' | 'orphaned-link';
      details: string;
    }>;
  }>;
  memories_without_sources: Array<{ id: string; title: string }>;
  categories: Record<string, number>;
  tags: Record<string, number>;
  average_tags_per_memory: number;
  memories_with_few_tags: Array<{
    id: string;
    title: string;
    tag_count: number;
  }>;
  average_memory_length_words: number;
  shortest_memories: Array<{
    id: string;
    title: string;
    word_count: number;
    length_percentile: number;
  }>;
  longest_memories: Array<{
    id: string;
    title: string;
    word_count: number;
    length_percentile: number;
  }>;
  recommendations: string[];
  formatted: string;
  isError: boolean;
}

// Fix Links Tool
export interface FixLinksParams {
  memory_id: string;
}

export interface FixLinksResult {
  message: string;
  isError: boolean;
}

