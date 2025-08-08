import { v4 as uuidv4 } from "uuid";
import { FileService } from "./file-service.js";
import { SearchService } from "./search-service.js";
import { Memory } from "./types.js";

export interface MemoryServiceConfig {
  notestorePath: string;
  indexPath: string;
}

export class MemoryService {
  private readonly fileService: FileService;
  private readonly searchService: SearchService;

  constructor(config: MemoryServiceConfig) {
    this.fileService = new FileService({ notestorePath: config.notestorePath });
    this.searchService = new SearchService({ indexPath: config.indexPath });
  }

  async initialize(): Promise<void> {
    await this.fileService.initialize();
    await this.searchService.initialize();
  }

  async createMemory(params: {
    title: string;
    content: string;
    tags?: string[];
    category?: string;
    sources?: string[];
  }): Promise<Memory> {
    await this.initialize();
    const id = uuidv4();
    const category = params.category || "general";
    const tags = params.tags || [];
    const sources = params.sources || [];

    const { filePath, markdown } = await this.fileService.writeMemoryFile({
      id,
      title: params.title,
      content: params.content,
      tags,
      category,
      sources,
    });

    // Parse frontmatter back to construct Memory object
    const parsed = await this.fileService.readMemoryFileById(id);
    if (!parsed) {
      throw new Error("Failed to read memory after creation");
    }

    const memory: Memory = {
      id: parsed.id,
      title: parsed.title,
      content: parsed.content,
      tags: parsed.tags,
      category: parsed.category,
      created_at: parsed.created_at,
      updated_at: parsed.updated_at,
      last_reviewed: parsed.last_reviewed,
      links: parsed.links,
      sources: parsed.sources,
      file_path: filePath,
    };

    await this.searchService.indexMemory({
      id: memory.id,
      title: memory.title,
      content: memory.content,
      tags: memory.tags,
      category: memory.category,
      created_at: memory.created_at,
      updated_at: memory.updated_at,
      last_reviewed: memory.last_reviewed,
      links: memory.links,
      sources: memory.sources,
    });

    return memory;
  }

  async readMemory(identifier: { id?: string; title?: string }): Promise<Memory | null> {
    await this.initialize();
    const { id, title } = identifier;
    let parsed: any = null;
    if (id) parsed = await this.fileService.readMemoryFileById(id);
    if (!parsed && title) parsed = await this.fileService.readMemoryFileByTitle(title);
    if (!parsed) return null;

    return {
      id: parsed.id,
      title: parsed.title,
      content: parsed.content,
      tags: parsed.tags,
      category: parsed.category,
      created_at: parsed.created_at,
      updated_at: parsed.updated_at,
      last_reviewed: parsed.last_reviewed,
      links: parsed.links,
      sources: parsed.sources,
      file_path: parsed.file_path,
    };
  }
}

