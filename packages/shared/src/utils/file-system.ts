import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Utility functions for file system operations in the memory management system.
 */

/**
 * Converts a string to a URL-friendly slug.
 * 
 * @param text - The text to convert to a slug
 * @returns A slugified version of the text
 * 
 * @example
 * ```typescript
 * slugify("Meeting with John about Q4 goals") // "meeting-with-john-about-q4-goals"
 * slugify("Project Ideas & Brainstorm") // "project-ideas-brainstorm"
 * ```
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensures a directory exists, creating it if necessary.
 * 
 * @param dirPath - The directory path to ensure exists
 * @throws Error if directory creation fails
 * 
 * @example
 * ```typescript
 * await ensureDirectoryExists('/path/to/memories')
 * ```
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generates a file path for a memory based on category, title, and ID.
 * 
 * @param notestorePath - Base path for memory files
 * @param category - Memory category
 * @param title - Memory title (will be slugified)
 * @param id - Memory UUID
 * @returns Full file path for the memory
 * 
 * @example
 * ```typescript
 * generateMemoryFilePath('./memories', 'work', 'Meeting with John', '550e8400-e29b-41d4-a716-446655440000')
 * // Returns: './memories/work|meeting-with-john|550e8400-e29b-41d4-a716-446655440000.md'
 * ```
 */
export function generateMemoryFilePath(
  notestorePath: string,
  category: string,
  title: string,
  id: string
): string {
  const slugifiedTitle = slugify(title);
  const filename = `${category}|${slugifiedTitle}|${id}.md`;
  const result = join(notestorePath, filename);
  // Ensure we return the expected format with ./ prefix for relative paths
  return notestorePath.startsWith('./') && !result.startsWith('./') ? `./${result}` : result;
}

/**
 * Parses a memory file path to extract its components.
 * 
 * @param filePath - The full file path to parse
 * @returns Object containing category, title, and ID, or null if invalid
 * 
 * @example
 * ```typescript
 * parseMemoryFilePath('./memories/work|meeting-with-john|550e8400-e29b-41d4-a716-446655440000.md')
 * // Returns: { category: 'work', title: 'meeting-with-john', id: '550e8400-e29b-41d4-a716-446655440000' }
 * ```
 */
export function parseMemoryFilePath(filePath: string): { category: string; title: string; id: string } | null {
  // Handle both forward and backward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').pop();
  
  if (!filename || !filename.endsWith('.md')) {
    return null;
  }

  const nameWithoutExt = filename.slice(0, -3); // Remove .md extension
  
  // Split by | separator
  const parts = nameWithoutExt.split('|');
  
  if (parts.length !== 3) {
    return null;
  }

  const [category, title, id] = parts;
  
  // Validate UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    return null;
  }

  return { category, title, id };
}

/**
 * Lists all memory files in a directory.
 * 
 * @param notestorePath - Base path for memory files
 * @returns Array of memory file paths
 * 
 * @example
 * ```typescript
 * const files = await listMemoryFiles('./memories')
 * ```
 */
export async function listMemoryFiles(notestorePath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(notestorePath);
    const result = files
      .filter(file => file.endsWith('.md'))
      .map(file => join(notestorePath, file));
    // Ensure we return the expected format with ./ prefix for relative paths
    return notestorePath.startsWith('./') 
      ? result.map(path => path.startsWith('./') ? path : `./${path}`)
      : result;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Directory doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

/**
 * Checks if a file exists.
 * 
 * @param filePath - The file path to check
 * @returns True if file exists, false otherwise
 * 
 * @example
 * ```typescript
 * const exists = await fileExists('./memories/work-meeting.md')
 * ```
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely deletes a file if it exists.
 * 
 * @param filePath - The file path to delete
 * @returns True if file was deleted, false if it didn't exist
 * 
 * @example
 * ```typescript
 * const deleted = await safeDeleteFile('./memories/work-meeting.md')
 * ```
 */
export async function safeDeleteFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist
      return false;
    }
    throw error;
  }
} 