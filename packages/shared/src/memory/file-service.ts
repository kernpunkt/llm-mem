import { promises as fs } from "fs";
import { ensureDirectoryExists, generateMemoryFilePath, listMemoryFiles, parseMemoryFilePath, slugify } from "../utils/file-system.js";
import { createFrontmatter, parseFrontmatter, serializeFrontmatter, updateFrontmatter } from "../utils/yaml.js";
import { updateWikiLinks } from "../utils/wiki-links.js";

export interface FileServiceConfig {
  notestorePath: string;
}

export class FileService {
  private readonly notestorePath: string;

  constructor(config: FileServiceConfig) {
    this.notestorePath = config.notestorePath;
  }

  async initialize(): Promise<void> {
    await ensureDirectoryExists(this.notestorePath);
  }

  async writeMemoryFile(params: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    category: string;
    sources?: string[];
  }): Promise<{ filePath: string; markdown: string }> {
    const { id, title, content, tags, category, sources = [] } = params;
    await this.initialize();

    const frontmatter = createFrontmatter(id, title, category, tags);
    // include sources if provided
    const fmWithSources = { ...frontmatter, sources };
    const markdown = serializeFrontmatter(fmWithSources, content);
    const filePath = generateMemoryFilePath(this.notestorePath, category, title, id);
    await fs.writeFile(filePath, markdown, "utf-8");
    return { filePath, markdown };
  }

  async readMemoryFileById(id: string): Promise<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    category: string;
    created_at: string;
    updated_at: string;
    last_reviewed: string;
    links: string[];
    sources: string[];
    file_path: string;
  } | null> {
    const files = await listMemoryFiles(this.notestorePath);
    const match = files.find((path) => parseMemoryFilePath(path)?.id === id);
    if (!match) return null;
    const fileContent = await fs.readFile(match, "utf-8");
    const { frontmatter, content } = parseFrontmatter(fileContent);
    return { ...frontmatter, content, file_path: match } as any;
  }

  async readMemoryFileByTitle(title: string): Promise<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    category: string;
    created_at: string;
    updated_at: string;
    last_reviewed: string;
    links: string[];
    sources: string[];
    file_path: string;
  } | null> {
    const targetSlug = slugify(title);
    const files = await listMemoryFiles(this.notestorePath);
    const match = files.find((path) => {
      const parsed = parseMemoryFilePath(path);
      return parsed && parsed.title === targetSlug;
    });
    if (!match) return null;
    const fileContent = await fs.readFile(match, "utf-8");
    const { frontmatter, content } = parseFrontmatter(fileContent);
    return { ...frontmatter, content, file_path: match } as any;
  }

  /**
   * Updates a memory file with potential renaming if category or title changes.
   * This method handles the case where the filename needs to change to reflect
   * updated metadata, and also updates wiki-style links in linked memories.
   */
  async updateMemoryFileWithRename(
    currentFilePath: string,
    updates: Partial<{
      title: string;
      tags: string[];
      category: string;
      sources: string[];
      last_reviewed: string;
      links: string[];
    }>,
    memoryId: string,
    newContent?: string
  ): Promise<{ newFilePath: string; markdown: string; updatedLinkedMemories: string[] }> {
    // Read current file to get existing metadata
    const existing = await fs.readFile(currentFilePath, "utf-8");
    const { frontmatter: currentFrontmatter } = parseFrontmatter(existing);
    
    // Determine if we need to rename the file
    const needsRename = (updates.title !== undefined && updates.title !== currentFrontmatter.title) ||
                       (updates.category !== undefined && updates.category !== currentFrontmatter.category);
    
    // Track which linked memories were updated
    const updatedLinkedMemories: string[] = [];
    
    if (!needsRename) {
      // No rename needed, just update content
      const updatedMarkdown = updateFrontmatter(existing, updates as any);
      const finalMarkdown = typeof newContent === "string"
        ? (() => {
            const { frontmatter } = parseFrontmatter(updatedMarkdown);
            return serializeFrontmatter(frontmatter, newContent);
          })()
        : updatedMarkdown;
      
      await fs.writeFile(currentFilePath, finalMarkdown, "utf-8");
      return { newFilePath: currentFilePath, markdown: finalMarkdown, updatedLinkedMemories };
    }
    
    // Rename needed - determine new path
    const newTitle = updates.title ?? currentFrontmatter.title;
    const newCategory = updates.category ?? currentFrontmatter.category;
    const newFilePath = generateMemoryFilePath(this.notestorePath, newCategory, newTitle, memoryId);
    
    // Check if target file already exists (shouldn't happen with UUID, but safety check)
    try {
      await fs.access(newFilePath);
      throw new Error(`Target file already exists: ${newFilePath}`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, which is what we want
      } else {
        throw error;
      }
    }
    
    // Update wiki-style links in linked memories if title changed
    if (updates.title !== undefined && updates.title !== currentFrontmatter.title) {
      const oldTitle = currentFrontmatter.title;
      const newTitleValue = updates.title;
      
      // Get the current links array
      const currentLinks = currentFrontmatter.links || [];
      
      // Update wiki-style links in each linked memory
      for (const linkedMemoryId of currentLinks) {
        try {
          const linkedMemory = await this.readMemoryFileById(linkedMemoryId);
          if (linkedMemory) {
            // Check if the linked memory contains wiki-style links to the old title
            if (linkedMemory.content.includes(`[[${oldTitle}]]`) || 
                linkedMemory.content.includes(`[[${oldTitle}|`)) {
              
              // Update the wiki-style links in the content
              const updatedContent = updateWikiLinks(linkedMemory.content, oldTitle, newTitleValue);
              
              // Update the linked memory file
              await this.updateMemoryFile(linkedMemory.file_path, {}, updatedContent);
              updatedLinkedMemories.push(linkedMemoryId);
            }
          }
        } catch (error) {
          // Log error but continue with other linked memories
          console.error(`Failed to update wiki-style links in linked memory ${linkedMemoryId}:`, error);
        }
      }
    }
    
    // Create updated content
    const updatedMarkdown = updateFrontmatter(existing, updates as any);
    const finalMarkdown = typeof newContent === "string"
      ? (() => {
          const { frontmatter } = parseFrontmatter(updatedMarkdown);
          return serializeFrontmatter(frontmatter, newContent);
        })()
      : updatedMarkdown;
    
    // Write to new location
    await fs.writeFile(newFilePath, finalMarkdown, "utf-8");
    
    // Remove old file
    await fs.unlink(currentFilePath);
    
    return { newFilePath, markdown: finalMarkdown, updatedLinkedMemories };
  }

  async updateMemoryFile(filePath: string, updates: Partial<{
    title: string;
    tags: string[];
    category: string;
    sources: string[];
    last_reviewed: string;
    links: string[];
  }>, newContent?: string): Promise<string> {
    const existing = await fs.readFile(filePath, "utf-8");
    const updatedMarkdown = updateFrontmatter(existing, updates as any);
    const finalMarkdown = typeof newContent === "string"
      ? (() => {
          const { frontmatter } = parseFrontmatter(updatedMarkdown);
          return serializeFrontmatter(frontmatter, newContent);
        })()
      : updatedMarkdown;
    await fs.writeFile(filePath, finalMarkdown, "utf-8");
    return finalMarkdown;
  }

  async listAllMemoryFiles(): Promise<string[]> {
    await this.initialize();
    const { listMemoryFiles } = await import("../utils/file-system.js");
    return listMemoryFiles(this.notestorePath);
  }
}

