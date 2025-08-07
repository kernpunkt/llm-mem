import { load, dump } from "js-yaml";

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
  frontmatter: MemoryFrontmatter;
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

    // Parse YAML frontmatter
    const frontmatter = load(frontmatterText) as any;

    // Validate required fields
    if (!frontmatter.id || !frontmatter.title || !frontmatter.category) {
      throw new Error("Missing required frontmatter fields: id, title, category");
    }

    // Ensure optional fields have default values and convert dates to strings
    return {
      frontmatter: {
        id: String(frontmatter.id),
        title: String(frontmatter.title),
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        category: String(frontmatter.category),
        created_at: frontmatter.created_at ? new Date(frontmatter.created_at).toISOString() : new Date().toISOString(),
        updated_at: frontmatter.updated_at ? new Date(frontmatter.updated_at).toISOString() : new Date().toISOString(),
        last_reviewed: frontmatter.last_reviewed ? new Date(frontmatter.last_reviewed).toISOString() : new Date().toISOString(),
        links: Array.isArray(frontmatter.links) ? frontmatter.links : []
      },
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
  frontmatter: MemoryFrontmatter,
  content: string
): string {
  try {
    // Validate required fields
    if (!frontmatter.id || !frontmatter.title || !frontmatter.category) {
      throw new Error("Missing required frontmatter fields: id, title, category");
    }

    // Serialize YAML frontmatter
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
  updates: Partial<MemoryFrontmatter>
): string {
  try {
    const { frontmatter, content: markdownContent } = parseFrontmatter(content);
    
    // Merge updates with existing frontmatter
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
 * Creates a new frontmatter object with default values.
 * 
 * @param id - Memory ID
 * @param title - Memory title
 * @param category - Memory category
 * @param tags - Memory tags (optional)
 * @returns New frontmatter object
 */
export function createFrontmatter(
  id: string,
  title: string,
  category: string,
  tags: string[] = []
): MemoryFrontmatter {
  const now = new Date().toISOString();
  
  return {
    id,
    title,
    tags,
    category,
    created_at: now,
    updated_at: now,
    last_reviewed: now,
    links: []
  };
} 