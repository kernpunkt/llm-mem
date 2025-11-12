import { load, dump } from "js-yaml";
import { validateTemplateFields } from "./frontmatter-config.js";
import { KNOWN_FRONTMATTER_FIELDS_WITHOUT_CONTENT } from "./constants.js";

/**
 * YAML frontmatter utilities for memory file operations.
 * Handles parsing and serializing YAML metadata in markdown files.
 */

export interface MemoryFrontmatter {
  id: string;
  title: string;
  tags: string[];
  category: string;
  created_at: string;
  updated_at: string;
  last_reviewed: string;
  links: string[];
  sources: string[];
  abstract?: string;
}

/**
 * Parses YAML frontmatter from a markdown file.
 * 
 * @param content - Full markdown file content
 * @returns Object containing frontmatter and content
 * @throws Error if YAML parsing fails
 * 
 * @example
 * ```typescript
 * const { frontmatter, content } = parseFrontmatter(markdownContent);
 * ```
 */
export function parseFrontmatter(content: string): {
  frontmatter: MemoryFrontmatter & Record<string, unknown>;
  content: string;
} {
  try {
    // Check if content has frontmatter (starts with ---)
    if (!content.startsWith("---\n")) {
      throw new Error("No YAML frontmatter found in content");
    }

    // Find the end of frontmatter (second ---)
    const frontmatterEnd = content.indexOf("\n---\n", 4);
    if (frontmatterEnd === -1) {
      throw new Error("Invalid YAML frontmatter format");
    }

    // Extract frontmatter and content
    const frontmatterText = content.substring(4, frontmatterEnd);
    const markdownContent = content.substring(frontmatterEnd + 5);

    // Parse YAML frontmatter - preserve ALL fields including custom ones
    const rawFrontmatter = load(frontmatterText) as any;

    // Validate required fields
    if (!rawFrontmatter.id || !rawFrontmatter.title || !rawFrontmatter.category) {
      throw new Error("Missing required frontmatter fields: id, title, category");
    }

    // Normalize known fields and preserve all other fields
    const normalizedFrontmatter: MemoryFrontmatter & Record<string, unknown> = {
      id: String(rawFrontmatter.id),
      title: String(rawFrontmatter.title),
      tags: Array.isArray(rawFrontmatter.tags) ? rawFrontmatter.tags : [],
      category: String(rawFrontmatter.category),
      created_at: rawFrontmatter.created_at ? new Date(rawFrontmatter.created_at).toISOString() : new Date().toISOString(),
      updated_at: rawFrontmatter.updated_at ? new Date(rawFrontmatter.updated_at).toISOString() : new Date().toISOString(),
      last_reviewed: rawFrontmatter.last_reviewed ? new Date(rawFrontmatter.last_reviewed).toISOString() : new Date().toISOString(),
      links: Array.isArray(rawFrontmatter.links) ? rawFrontmatter.links : [],
      sources: Array.isArray(rawFrontmatter.sources) ? rawFrontmatter.sources : [],
      abstract: rawFrontmatter.abstract ? String(rawFrontmatter.abstract) : undefined,
    };

    // Preserve all custom fields that aren't in the known fields
    for (const key in rawFrontmatter) {
      if (!KNOWN_FRONTMATTER_FIELDS_WITHOUT_CONTENT.has(key as any)) {
        normalizedFrontmatter[key] = rawFrontmatter[key];
      }
    }

    return {
      frontmatter: normalizedFrontmatter,
      content: markdownContent.trim()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse YAML frontmatter: ${errorMessage}`);
  }
}

/**
 * Serializes content with YAML frontmatter.
 * 
 * @param frontmatter - Memory metadata
 * @param content - Markdown content
 * @returns Complete markdown file content with frontmatter
 * @throws Error if YAML serialization fails
 * 
 * @example
 * ```typescript
 * const markdownContent = serializeFrontmatter(frontmatter, "# My Memory\n\nContent here");
 * ```
 */
export function serializeFrontmatter(
  frontmatter: MemoryFrontmatter | (MemoryFrontmatter & Record<string, unknown>),
  content: string
): string {
  try {
    // Validate required fields
    if (!frontmatter.id || !frontmatter.title || !frontmatter.category) {
      throw new Error("Missing required frontmatter fields: id, title, category");
    }

    // Serialize YAML frontmatter - includes all fields (known + custom)
    const yamlContent = dump(frontmatter, {
      indent: 2,
      lineWidth: 80,
      noRefs: true
    });

    // Combine frontmatter and content
    return `---\n${yamlContent}---\n\n${content}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to serialize YAML frontmatter: ${errorMessage}`);
  }
}

/**
 * Updates specific fields in existing frontmatter.
 * 
 * @param content - Full markdown file content
 * @param updates - Partial frontmatter updates
 * @returns Updated markdown content
 * @throws Error if update fails
 * 
 * @example
 * ```typescript
 * const updatedContent = updateFrontmatter(content, { 
 *   updated_at: new Date().toISOString(),
 *   tags: ["new", "tags"]
 * });
 * ```
 */
export function updateFrontmatter(
  content: string,
  updates: Partial<MemoryFrontmatter> | (Partial<MemoryFrontmatter> & Record<string, unknown>)
): string {
  try {
    const { frontmatter, content: markdownContent } = parseFrontmatter(content);
    
    // Merge updates with existing frontmatter (preserves custom fields and adds new ones)
    const updatedFrontmatter = {
      ...frontmatter,
      ...updates,
      updated_at: new Date().toISOString() // Always update the updated_at timestamp
    };

    return serializeFrontmatter(updatedFrontmatter, markdownContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update frontmatter: ${errorMessage}`);
  }
}

/**
 * Validates that a frontmatter object has all required fields.
 * 
 * @param frontmatter - Frontmatter object to validate
 * @returns True if valid, throws Error if invalid
 * @throws Error if validation fails
 */
export function validateFrontmatter(frontmatter: any): frontmatter is MemoryFrontmatter {
  if (!frontmatter || typeof frontmatter !== "object") {
    throw new Error("Frontmatter must be an object");
  }

  if (!frontmatter.id || typeof frontmatter.id !== "string") {
    throw new Error("Frontmatter must have a valid 'id' field");
  }

  if (!frontmatter.title || typeof frontmatter.title !== "string") {
    throw new Error("Frontmatter must have a valid 'title' field");
  }

  if (!frontmatter.category || typeof frontmatter.category !== "string") {
    throw new Error("Frontmatter must have a valid 'category' field");
  }

  if (!Array.isArray(frontmatter.tags)) {
    throw new Error("Frontmatter 'tags' field must be an array");
  }

  if (!Array.isArray(frontmatter.links)) {
    throw new Error("Frontmatter 'links' field must be an array");
  }

  if (!Array.isArray(frontmatter.sources)) {
    throw new Error("Frontmatter 'sources' field must be an array");
  }

  // Validate date fields
  const dateFields = ["created_at", "updated_at", "last_reviewed"];
  for (const field of dateFields) {
    if (frontmatter[field] && typeof frontmatter[field] !== "string") {
      throw new Error(`Frontmatter '${field}' field must be a string`);
    }
  }

  return true;
}

/**
 * Helper function to validate and merge template field with base value.
 * Returns the template value if it's defined and passes type validation,
 * otherwise returns the base value.
 * 
 * @param templateValue - Value from template
 * @param baseValue - Base/default value
 * @param validator - Type validation function that returns true if value is valid
 * @returns Template value if valid, otherwise base value
 */
function validateAndMergeField<T>(
  templateValue: unknown,
  baseValue: T,
  validator: (value: unknown) => value is T
): T {
  return templateValue !== undefined && validator(templateValue)
    ? templateValue
    : baseValue;
}

/**
 * Creates a new frontmatter object with default values.
 * 
 * @param id - Memory ID
 * @param title - Memory title
 * @param category - Memory category
 * @param tags - Memory tags (optional)
 * @param abstract - Short abstract/summary (optional)
 * @param template - Optional template object with additional frontmatter fields to merge
 * @returns New frontmatter object with template fields merged
 */
export function createFrontmatter(
  id: string,
  title: string,
  category: string,
  tags: string[] = [],
  abstract?: string,
  template?: Record<string, unknown>
): MemoryFrontmatter {
  const now = new Date().toISOString();
  
  const base: MemoryFrontmatter = {
    id,
    title,
    tags,
    category,
    created_at: now,
    updated_at: now,
    last_reviewed: now,
    links: [],
    sources: [],
    abstract
  };
  
  // Merge template if provided
  if (template) {
    // Validate that template doesn't contain protected fields
    validateTemplateFields(template);
    
    // Merge template, but preserve base fields (template can't override required fields)
    // Note: Template values override base values, but undefined template values don't override base values
    return {
      ...base,
      ...template,
      // Ensure required fields are not overridden
      id: base.id,
      title: base.title,
      category: base.category,
      created_at: base.created_at,
      updated_at: base.updated_at,
      last_reviewed: base.last_reviewed,
      links: base.links,
      // Allow template to override tags, sources, abstract, but only if explicitly provided
      // Validate types before using to prevent unsafe type assertions
      tags: validateAndMergeField(template.tags, base.tags, Array.isArray),
      sources: validateAndMergeField(template.sources, base.sources, Array.isArray),
      abstract: validateAndMergeField(
        template.abstract, 
        base.abstract, 
        (value): value is string | undefined => typeof value === 'string' || value === undefined
      ),
    };
  }
  
  return base;
} 