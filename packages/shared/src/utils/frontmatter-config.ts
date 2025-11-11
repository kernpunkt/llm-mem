import { promises as fs } from "fs";
import { z } from "zod";
import { load } from "js-yaml";

/**
 * Template configuration schema for category-based frontmatter templates
 * 
 * Templates allow adding custom frontmatter fields based on category.
 * The template is merged with the base frontmatter when creating or updating memories.
 */
const CategoryTemplateSchema = z.record(
  z.string(), // category name
  z.record(z.unknown()) // additional frontmatter fields
);

export type CategoryTemplateConfig = z.infer<typeof CategoryTemplateSchema>;

/**
 * Memory configuration file schema
 * 
 * This configuration file can contain various settings for memory management,
 * including category-based frontmatter templates and other future configuration options.
 */
const MemoryConfigSchema = z.object({
  templates: CategoryTemplateSchema.optional(),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

/**
 * Loads and validates memory configuration from a file path.
 * 
 * Supports both JSON and YAML formats.
 * 
 * @param configPath - Path to the configuration file (JSON or YAML)
 * @returns Validated configuration object
 * @throws Error if file cannot be read or validation fails
 * 
 * @example
 * ```typescript
 * const config = await loadMemoryConfig("./config/memory.yaml");
 * // Use config.templates["category"] to get template for a category
 * ```
 */
export async function loadMemoryConfig(configPath: string): Promise<MemoryConfig> {
  try {
    const fileContent = await fs.readFile(configPath, "utf-8");
    
    // Determine file format by extension
    const isYaml = configPath.endsWith(".yaml") || configPath.endsWith(".yml");
    
    let parsed: any;
    if (isYaml) {
      parsed = load(fileContent);
    } else {
      parsed = JSON.parse(fileContent);
    }
    
    // Validate with Zod schema
    const validated = MemoryConfigSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid memory configuration: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load memory configuration from ${configPath}: ${errorMessage}`);
  }
}

/**
 * Gets the frontmatter template for a specific category.
 * 
 * @param config - Memory configuration
 * @param category - Category name
 * @returns Template object with additional frontmatter fields, or empty object if no template exists
 * 
 * @example
 * ```typescript
 * const template = getCategoryTemplate(config, "DOC");
 * // Returns: { author: "default", status: "draft" } or {}
 * ```
 */
export function getCategoryTemplate(
  config: MemoryConfig | null | undefined,
  category: string
): Record<string, unknown> {
  if (!config?.templates) {
    return {};
  }
  
  return config.templates[category] || {};
}

/**
 * Merges template frontmatter with base frontmatter.
 * Template values override base values, but base values are preserved if not in template.
 * 
 * @param base - Base frontmatter object
 * @param template - Template frontmatter to merge
 * @returns Merged frontmatter object
 * 
 * @example
 * ```typescript
 * const base = { id: "123", title: "Test", category: "DOC" };
 * const template = { author: "John", status: "draft" };
 * const merged = mergeTemplateFrontmatter(base, template);
 * // Returns: { id: "123", title: "Test", category: "DOC", author: "John", status: "draft" }
 * ```
 */
export function mergeTemplateFrontmatter<T extends Record<string, unknown>>(
  base: T,
  template: Record<string, unknown>
): T & Record<string, unknown> {
  return {
    ...base,
    ...template,
  };
}

