import { FileService } from "./file-service.js";
import { updateWikiLinks, findWikiLinks, hasWikiLink } from "../utils/wiki-links.js";
import { LinkRequest } from "./types.js";
import { parseMemoryFilePath } from "../utils/file-system.js";
import { basename } from "path";

export class LinkService {
  constructor(private readonly fileService: FileService) {}

  async linkMemories(source: { id: string }, target: { id: string }, linkText?: string): Promise<void> {
    const src = await this.fileService.readMemoryFileById(source.id);
    const tgt = await this.fileService.readMemoryFileById(target.id);
    if (!src || !tgt) {
      throw new Error("One or both memories not found");
    }

    // Update ID-based links in YAML frontmatter
    const srcLinks = Array.from(new Set([...(src.links || []), tgt.id]));
    const tgtLinks = Array.from(new Set([...(tgt.links || []), src.id]));

    // Only remove the specific link being updated (if it exists) to preserve other links
    let srcContent = this.removeSpecificWikiLink(src.content, tgt.title);
    let tgtContent = this.removeSpecificWikiLink(tgt.content, src.title);

    // Add wiki-style link to source memory
    srcContent = this.addWikiLinkToContent(srcContent, tgt.title, linkText, tgt.file_path);

    // Add wiki-style link to target memory
    tgtContent = this.addWikiLinkToContent(tgtContent, src.title, undefined, src.file_path);

    // Update both memories with new links and content
    await this.fileService.updateMemoryFile(src.file_path, { links: srcLinks }, srcContent);
    await this.fileService.updateMemoryFile(tgt.file_path, { links: tgtLinks }, tgtContent);
  }

  async unlinkMemories(source: { id: string }, target: { id: string }): Promise<void> {
    const src = await this.fileService.readMemoryFileById(source.id);
    const tgt = await this.fileService.readMemoryFileById(target.id);
    if (!src || !tgt) {
      throw new Error("One or both memories not found");
    }

    // Remove ID-based links from YAML frontmatter
    const srcLinks = (src.links || []).filter((id) => id !== tgt.id);
    const tgtLinks = (tgt.links || []).filter((id) => id !== src.id);

    // Only remove the specific wiki-style links being unlinked to preserve other links
    let srcContent = this.removeSpecificWikiLink(src.content, tgt.title);
    let tgtContent = this.removeSpecificWikiLink(tgt.content, src.title);

    // Update both memories with new links and content
    await this.fileService.updateMemoryFile(src.file_path, { links: srcLinks }, srcContent);
    await this.fileService.updateMemoryFile(tgt.file_path, { links: tgtLinks }, tgtContent);
  }

  /**
   * Adds a wiki-style link to the end of markdown content
   * @param content - The markdown content to update
   * @param title - The title to link to
   * @param linkText - Optional custom text for the link (defaults to title)
   * @param targetFilePath - The file path of the target memory
   * @returns Updated content with wiki-style link added
   */
  private addWikiLinkToContent(content: string, title: string, linkText?: string, targetFilePath?: string): string {
    // Use custom link text if provided, otherwise use the title
    const displayText = linkText || title;
    
    // Create the wiki-style link
    let linkMarkdown: string;
    
    if (targetFilePath) {
      // Extract the filename without extension for Obsidian compatibility
      const filename = basename(targetFilePath, '.md');
      // Create a link that Obsidian can resolve: [[filename|display text]]
      linkMarkdown = `- [[${filename}|${displayText}]]`;
    } else {
      // Fallback to title-based link if no file path available
      linkMarkdown = `- [[${title}|${displayText}]]`;
    }
    
    // First, remove any existing links for this title to avoid duplicates
    let cleanedContent = this.removeSpecificWikiLink(content, title);
    
    // Check if "## Related" section already exists
    // Look for actual section headers, not just the string anywhere in content
    // Match: ## Related optionally followed by whitespace and optionally followed by newline
    const relatedSectionRegex = /\n## Related\s*(?:\n|$)/;
    const hasRelatedSection = relatedSectionRegex.test(cleanedContent);
    
    if (hasRelatedSection) {
      // Add the link to the existing section
      return cleanedContent + '\n' + linkMarkdown + '\n';
    } else {
      // Create new "## Related" section
      return cleanedContent + '\n\n## Related\n\n' + linkMarkdown + '\n';
    }
  }

  /**
   * Removes a wiki-style link from markdown content
   * @param content - The markdown content to update
   * @param title - The title to remove link for
   * @returns Updated content with wiki-style link removed
   */
  private removeWikiLinkFromContent(content: string, title: string): string {
    // Escape special regex characters in title
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Remove the specific wiki-style link (both simple and with display text)
    const linkRegex = new RegExp(`\\n\\s*- \\[\\[${escapedTitle}(\\|[^\\]]*)?\\]\\]\\n?`, 'g');
    let updatedContent = content.replace(linkRegex, '');
        
    return updatedContent;
  }

  /**
   * Cleans up all wiki-style links from content
   * @param content - The markdown content to clean
   * @returns Cleaned content without wiki-style links
   */
  private cleanWikiLinks(content: string): string {
    // Remove all wiki-style links
    const wikiLinkRegex = /\n\s*- \[\[[^\]]+\]\]\n?/g;
    let cleaned = content.replace(wikiLinkRegex, '');
    
    // Remove any trailing whitespace
    cleaned = cleaned.trimEnd();
    
    return cleaned;
  }

  /**
   * Removes a specific wiki-style link from content by title.
   * This is a more targeted removal compared to cleanWikiLinks.
   * @param content - The markdown content to update
   * @param title - The title of the link to remove
   * @returns Updated content with the specific wiki-style link removed
   */
  private removeSpecificWikiLink(content: string, title: string): string {
    // Escape special regex characters in title
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // The actual link format is: [[(CATEGORY)(filename)(id)|display_text]]
    // We need to match the display text part after the | character
    // Pattern: newline + whitespace + - + space + [[anything|display_text]]
    const linkRegex = new RegExp(`\\n\\s*- \\[\\[[^|]*\\|${escapedTitle}\\]\\]\\n?`, 'g');
    let updatedContent = content.replace(linkRegex, '\n');
    return updatedContent;
  }
}

