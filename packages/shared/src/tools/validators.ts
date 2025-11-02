/**
 * Validation utilities for memory tool operations
 * 
 * Extracted from MCP server for reuse across implementations.
 */

/**
 * Parses comma-separated allowed values from environment variable
 */
export function parseAllowedValues(envVar: string | undefined): string[] | null {
  if (!envVar || envVar.trim() === "") {
    return null; // No restrictions
  }
  return envVar.split(",").map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Validates a category against allowed categories from environment
 */
export function validateCategory(
  category: string | undefined,
  allowedCategories: string[] | null = null
): void {
  if (category === undefined) return; // Optional field
  
  // If no allowed categories provided, get from environment
  if (allowedCategories === null) {
    allowedCategories = parseAllowedValues(process.env.ALLOWED_CATEGORIES);
  }
  
  if (allowedCategories && !allowedCategories.includes(category)) {
    const allowedList = allowedCategories.join(", ");
    throw new Error(`Category "${category}" is not allowed. Allowed categories: ${allowedList}`);
  }
}

/**
 * Validates tags against allowed tags from environment
 */
export function validateTags(
  tags: string[] | undefined,
  allowedTags: string[] | null = null
): void {
  if (tags === undefined) return; // Optional field
  
  // If no allowed tags provided, get from environment
  if (allowedTags === null) {
    allowedTags = parseAllowedValues(process.env.ALLOWED_TAGS);
  }
  
  if (allowedTags) {
    const invalidTags = tags.filter(tag => !allowedTags.includes(tag));
    if (invalidTags.length > 0) {
      const allowedList = allowedTags.join(", ");
      const invalidList = invalidTags.join(", ");
      throw new Error(`Tags [${invalidList}] are not allowed. Allowed tags: ${allowedList}`);
    }
  }
}

