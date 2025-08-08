import { promises as fs } from "fs";
import { ensureDirectoryExists, generateMemoryFilePath, listMemoryFiles, parseMemoryFilePath, slugify } from "../utils/file-system.js";
import { createFrontmatter, parseFrontmatter, serializeFrontmatter, updateFrontmatter } from "../utils/yaml.js";

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
}

