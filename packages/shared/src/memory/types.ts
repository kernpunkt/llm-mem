import { z } from "zod";

/**
 * Memory domain types and validation schemas
 */

export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  created_at: string;
  updated_at: string;
  last_reviewed: string;
  file_path: string;
  links: string[];
  sources: string[];
}

export const MemoryCreateRequestSchema = z.object({
  title: z.string().min(1).describe("Memory title"),
  content: z.string().min(1).describe("Markdown content"),
  tags: z.array(z.string()).optional().default([]).describe("Tags for categorization"),
  category: z.string().optional().default("general").describe("Category for organization"),
  sources: z.array(z.string()).optional().default([]).describe("References/sources for the memory"),
});

export type MemoryCreateRequest = z.infer<typeof MemoryCreateRequestSchema>;

export const MemoryUpdateRequestSchema = z.object({
  id: z.string().uuid().describe("Memory ID to edit"),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  sources: z.array(z.string()).optional(),
});

export type MemoryUpdateRequest = z.infer<typeof MemoryUpdateRequestSchema>;

export const MemorySearchRequestSchema = z.object({
  query: z.string().min(1).describe("Search terms"),
  limit: z.number().int().positive().optional().default(10),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type MemorySearchRequest = z.infer<typeof MemorySearchRequestSchema>;

export const LinkRequestSchema = z.object({
  source_id: z.string().uuid().describe("ID of the source memory"),
  target_id: z.string().uuid().describe("ID of the target memory"),
  link_text: z.string().optional().describe("Custom link text"),
});

export type LinkRequest = z.infer<typeof LinkRequestSchema>;

