import { FlexSearchManager, SearchResult } from "../utils/flexsearch.js";

export interface SearchServiceConfig {
  indexPath: string;
}

export class SearchService {
  private readonly indexPath: string;
  private readonly manager: FlexSearchManager;
  private initialized = false;

  constructor(config: SearchServiceConfig) {
    this.indexPath = config.indexPath;
    this.manager = new FlexSearchManager(this.indexPath);
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.manager.initialize();
      this.initialized = true;
    }
  }

  async indexMemory(doc: Parameters<FlexSearchManager["indexMemory"]>[0]): Promise<void> {
    await this.initialize();
    await this.manager.indexMemory(doc);
  }

  async removeMemory(id: string): Promise<void> {
    await this.initialize();
    await this.manager.removeMemory(id);
  }

  async search(query: string, options: { limit?: number; category?: string; tags?: string[] } = {}): Promise<SearchResult[]> {
    await this.initialize();
    return this.manager.searchMemories(query, options);
  }

  async clearIndexes(): Promise<void> {
    await this.initialize();
    await this.manager.clearIndexes();
  }
}

