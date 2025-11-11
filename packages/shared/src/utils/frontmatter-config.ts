import { promises as fs } from "fs";
import { z } from "zod";
import { load } from "js-yaml";
import { KNOWN_FRONTMATTER_FIELDS } from "./constants.js";

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
 * Set of frontmatter fields that can be overridden by templates.
 * These are optional or user-configurable fields that templates may modify.
 */
const OVERRIDABLE_FRONTMATTER_FIELDS = new Set([
  "tags",
  "sources",
  "abstract",
  // Note: 'content' and 'file_path' are not frontmatter fields, so they're excluded
]);

/**
 * List of essential frontmatter fields that cannot be overridden by templates.
 * These fields are managed by the system and must not be modified via templates.
 * 
 * Derived from KNOWN_FRONTMATTER_FIELDS by excluding overridable fields and non-frontmatter fields.
 */
export const PROTECTED_FRONTMATTER_FIELDS = Array.from(KNOWN_FRONTMATTER_FIELDS).filter(
  (field) => !OVERRIDABLE_FRONTMATTER_FIELDS.has(field) && field !== "content" && field !== "file_path"
) as readonly string[];

/**
 * Validates that a template does not contain any protected frontmatter fields.
 * 
 * @param template - Template object to validate
 * @param context - Optional context string for error messages (e.g., category name)
 * @throws Error if template contains protected fields
 * 
 * @example
 * ```typescript
 * validateTemplateFields({ author: "John" }); // OK
 * validateTemplateFields({ id: "123" }); // Throws error
 * ```
 */
export function validateTemplateFields(
  template: Record<string, unknown>,
  context?: string
): void {
  const protectedFieldsSet = new Set(PROTECTED_FRONTMATTER_FIELDS);
  const protectedFields = template ? Object.keys(template).filter(key =>
    protectedFieldsSet.has(key)
  ) : [];

  if (protectedFields.length > 0) {
    const contextMsg = context ? ` for category "${context}"` : "";
    throw new Error(
      `Template${contextMsg} cannot override protected frontmatter fields: ${protectedFields.join(", ")}. ` +
      `Protected fields are: ${PROTECTED_FRONTMATTER_FIELDS.join(", ")}`
    );
  }
}

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
    
    // Validate that templates don't contain protected fields
    if (validated.templates) {
      for (const [category, template] of Object.entries(validated.templates)) {
        validateTemplateFields(template, category);
      }
    }
    
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
 * This function retrieves the category-specific template from the memory configuration.
 * Templates are validated to ensure they don't contain protected fields.
 * 
 * **Template Merging Order:**
 * When templates are merged with base frontmatter, the order of precedence is:
 * 1. Base frontmatter (required fields: id, title, category, etc.)
 * 2. Category template (from config file) - adds default fields for the category
 * 3. User-provided template (from tool parameters) - overrides category template
 * 4. Direct updates (from edit_mem parameters) - highest precedence
 * 
 * Later sources override earlier ones, but protected fields cannot be overridden.
 * 
 * @param config - Memory configuration (may be null/undefined if no config loaded)
 * @param category - Category name to get template for
 * @returns Template object with additional frontmatter fields, or empty object if no template exists
 * @throws Error if template contains protected fields (defensive validation)
 * 
 * @example
 * ```typescript
 * const template = getCategoryTemplate(config, "DOC");
 * // Returns: { author: "default", status: "draft" } or {}
 * 
 * // When creating a memory, templates are merged:
 * // Base + Category Template + User Template = Final Frontmatter
 * const final = { ...base, ...categoryTemplate, ...userTemplate };
 * ```
 */
export function getCategoryTemplate(
  config: MemoryConfig | null | undefined,
  category: string
): Record<string, unknown> {
  if (!config?.templates) {
    return {};
  }
  
  const template = config.templates[category] || {};
  
  // Validate template doesn't contain protected fields (defensive check)
  // Note: Templates are also validated on config load, but this provides an additional
  // safety net in case config objects are constructed manually or modified at runtime
  validateTemplateFields(template, category);
  
  return template;
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

/**
 * Merges category template and user-provided template in order of precedence.
 * 
 * This is a convenience function that combines category template lookup with user template merging.
 * The merging order (later sources override earlier ones):
 * 1. Category template (from config file) - base defaults for the category
 * 2. User-provided template (from tool parameter) - overrides category template
 * 
 * @param config - Memory configuration (may be null/undefined if no config loaded)
 * @param category - Category name to get template for
 * @param userTemplate - Optional user-provided template to merge on top of category template
 * @returns Merged template object with all fields combined
 * 
 * @example
 * ```typescript
 * const finalTemplate = mergeTemplates(memoryConfig, "DOC", { author: "John" });
 * // Returns: { ...categoryTemplate, author: "John" }
 * ```
 */
export function mergeTemplates(
  config: MemoryConfig | null | undefined,
  category: string,
  userTemplate?: Record<string, unknown>
): Record<string, unknown> {
  const categoryTemplate = getCategoryTemplate(config, category);
  return userTemplate ? { ...categoryTemplate, ...userTemplate } : categoryTemplate;
}

