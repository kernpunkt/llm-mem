/**
 * Shared constants for memory frontmatter field management.
 * 
 * These constants define which fields are considered "known" system fields
 * versus custom template fields that can be added dynamically.
 */

/**
 * Set of all known frontmatter fields that are part of the core Memory interface.
 * Custom template fields are any fields not in this set.
 * 
 * Used to:
 * - Distinguish between system fields and custom template fields
 * - Preserve custom fields when reading/parsing memories
 * - Filter custom fields for search indexing
 */
export const KNOWN_FRONTMATTER_FIELDS = new Set([
  'id',
  'title',
  'content',
  'tags',
  'category',
  'created_at',
  'updated_at',
  'last_reviewed',
  'links',
  'sources',
  'abstract',
  'file_path',
] as const);

/**
 * Set of known frontmatter fields excluding 'content' and 'file_path'.
 * 
 * Used when parsing frontmatter from YAML where content and file_path
 * are handled separately.
 */
export const KNOWN_FRONTMATTER_FIELDS_WITHOUT_CONTENT = new Set([
  'id',
  'title',
  'tags',
  'category',
  'created_at',
  'updated_at',
  'last_reviewed',
  'links',
  'sources',
  'abstract',
] as const);

