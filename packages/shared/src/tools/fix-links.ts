import { MemoryService } from "../memory/memory-service.js";
import { FixLinksParams, FixLinksResult } from "./types.js";

/**
 * Fixes and recreates proper link structure for a memory
 * 
 * Extracted from MCP server for reuse across implementations.
 * 
 * @param memoryService - MemoryService instance
 * @param params - Fix links parameters
 * @returns Fix links result message
 */
export async function fixLinks(
  memoryService: MemoryService,
  params: FixLinksParams
): Promise<FixLinksResult> {
  const { memory_id } = params;
  
  try {
    // Read the memory to get current links
    const memory = await memoryService.readMemory({ id: memory_id });
    if (!memory) {
      return {
        message: `Memory not found: ${memory_id}`,
        isError: true
      };
    }

    // Store the current link IDs for later processing
    const currentLinkIds = [...memory.links];
    
    // Step 1: Unlink all current links
    for (const linkId of currentLinkIds) {
      try {
        await memoryService.unlinkMemories({ source_id: memory_id, target_id: linkId });
      } catch (error) {
        // Log but continue with other links
        console.error(`Failed to unlink ${linkId}: ${error}`);
      }
    }

    // Step 2: Remove ALL markdown links from content (keep only HTTP links)
    let cleanedContent = memory.content;
    
    // Remove everything after "## Related" section (including the section itself)
    const relatedSectionIndex = cleanedContent.indexOf('## Related');
    if (relatedSectionIndex !== -1) {
      cleanedContent = cleanedContent.substring(0, relatedSectionIndex).trim();
    }
    
    // Remove all Obsidian-style links: [[(CATEGORY)(title)(id)|display_text]]
    cleanedContent = cleanedContent.replace(/\[\[\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)(?:\|([^\]]+))?\]\]/g, '');
    
    // Remove all simple markdown links: [[title|display_text]] or [[title]] (except HTTP links)
    cleanedContent = cleanedContent.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkText, displayText) => {
      // Check if this is an external HTTP link
      if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
        return match; // Keep external links
      }
      // Remove internal links completely
      return '';
    });
    
    // Clean up excessive empty lines and whitespace
    cleanedContent = cleanedContent
      .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Remove triple+ newlines
      .replace(/[ \t]+$/gm, '')           // Remove trailing whitespace
      .replace(/^\s+$/gm, '')             // Remove lines with only whitespace
      .replace(/\n{3,}/g, '\n\n')         // Limit to max 2 consecutive newlines
      .trim();                            // Remove leading/trailing whitespace

    // Step 3: Update the memory with cleaned content
    if (cleanedContent !== memory.content) {
      await memoryService.updateMemory({
        id: memory_id,
        content: cleanedContent
      });
    }

    // Step 4: Recreate links using IDs from YAML frontmatter (as if link_mem was called for each)
    let successfulLinks = 0;
    let failedLinks = 0;
    
    // Recreate links for all IDs in the YAML frontmatter
    for (const linkId of currentLinkIds) {
      try {
        // Verify the target memory still exists
        const targetMemory = await memoryService.readMemory({ id: linkId });
        if (targetMemory) {
          // Use link_mem to create proper bidirectional links and Obsidian-style content
          await memoryService.linkMemories({ 
            source_id: memory_id, 
            target_id: linkId,
            link_text: targetMemory.title
          });
          successfulLinks++;
        } else {
          failedLinks++;
        }
      } catch (error) {
        failedLinks++;
        console.error(`Failed to recreate link to ${linkId}: ${error}`);
      }
    }

    // Generate summary message
    const summary = `Link structure fixed for memory "${memory.title}" (ID: ${memory_id}):

✅ **Cleanup completed:**
- Removed ${currentLinkIds.length} existing links
- Cleaned markdown content of all Obsidian-style links
- Preserved external HTTP/HTTPS links

🔗 **Link recreation:**
- Successfully recreated: ${successfulLinks} links
- Failed to recreate: ${failedLinks} links
- Total links processed: ${currentLinkIds.length}

${failedLinks > 0 ? `\n⚠️ **Note:** ${failedLinks} links could not be recreated (target memories may have been deleted or are inaccessible).` : ''}

The memory now has a clean link structure with ${successfulLinks} valid bidirectional links.`;

    return {
      message: summary,
      isError: false
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`fix_links failed: ${msg}`);
  }
}

