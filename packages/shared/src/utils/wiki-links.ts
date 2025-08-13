/**
 * Wiki-style link utilities for maintaining bidirectional links
 * 
 * This module handles parsing and updating wiki-style links in markdown content
 * to maintain consistency when memory titles change.
 */

/**
 * Updates wiki-style links in markdown content from old title to new title
 * 
 * @param content - The markdown content to update
 * @param oldTitle - The old title to replace
 * @param newTitle - The new title to use
 * @returns Updated markdown content with links updated
 * 
 * @example
 * ```typescript
 * const updated = updateWikiLinks(
 *   "See [[Old Title]] for more info",
 *   "Old Title", 
 *   "New Title"
 * );
 * // Returns: "See [[New Title]] for more info"
 * ```
 */
export function updateWikiLinks(content: string, oldTitle: string, newTitle: string): string {
  if (oldTitle === newTitle) {
    return content; // No change needed
  }
  
  // Escape special regex characters in titles
  const escapedOldTitle = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Match wiki-style links: [[Title]] or [[Title|Display Text]]
  // This regex looks for wiki-style links that are not inside code blocks
  const wikiLinkRegex = new RegExp(`\\[\\[(${escapedOldTitle})(\\|[^\\]]*)?\\]\\]`, 'g');
  
  return content.replace(wikiLinkRegex, (match, title, displayText) => {
    if (displayText) {
      // Keep the display text but update the title: [[New Title|Display Text]]
      return `[[${newTitle}${displayText}]]`;
    } else {
      // Simple link: [[New Title]]
      return `[[${newTitle}]]`;
    }
  });
}

/**
 * Finds all wiki-style links in markdown content
 * 
 * @param content - The markdown content to parse
 * @returns Array of link titles found in the content
 * 
 * @example
 * ```typescript
 * const links = findWikiLinks("See [[Title1]] and [[Title2|Display]] for info");
 * // Returns: ["Title1", "Title2"]
 * ```
 */
export function findWikiLinks(content: string): string[] {
  // This regex looks for wiki-style links that are not inside code blocks
  // It's a simplified version that works for most cases
  const wikiLinkRegex = /\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  return [...new Set(links)]; // Remove duplicates
}

/**
 * Checks if content contains a specific wiki-style link
 * 
 * @param content - The markdown content to check
 * @param title - The title to search for
 * @returns True if the content contains a link to the specified title
 * 
 * @example
 * ```typescript
 * const hasLink = hasWikiLink("See [[Meeting Notes]] for details", "Meeting Notes");
 * // Returns: true
 * ```
 */
export function hasWikiLink(content: string, title: string): boolean {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wikiLinkRegex = new RegExp(`\\[\\[${escapedTitle}(\\|[^\\]]*)?\\]\\]`, 'g');
  return wikiLinkRegex.test(content);
}
