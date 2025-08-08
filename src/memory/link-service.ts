import { FileService } from "./file-service.js";

export class LinkService {
  constructor(private readonly fileService: FileService) {}

  async linkMemories(source: { id: string }, target: { id: string }): Promise<void> {
    const src = await this.fileService.readMemoryFileById(source.id);
    const tgt = await this.fileService.readMemoryFileById(target.id);
    if (!src || !tgt) {
      throw new Error("One or both memories not found");
    }

    const srcLinks = Array.from(new Set([...(src.links || []), tgt.id]));
    const tgtLinks = Array.from(new Set([...(tgt.links || []), src.id]));

    await this.fileService.updateMemoryFile(src.file_path, { links: srcLinks });
    await this.fileService.updateMemoryFile(tgt.file_path, { links: tgtLinks });
  }

  async unlinkMemories(source: { id: string }, target: { id: string }): Promise<void> {
    const src = await this.fileService.readMemoryFileById(source.id);
    const tgt = await this.fileService.readMemoryFileById(target.id);
    if (!src || !tgt) {
      throw new Error("One or both memories not found");
    }

    const srcLinks = (src.links || []).filter((id) => id !== tgt.id);
    const tgtLinks = (tgt.links || []).filter((id) => id !== src.id);

    await this.fileService.updateMemoryFile(src.file_path, { links: srcLinks });
    await this.fileService.updateMemoryFile(tgt.file_path, { links: tgtLinks });
  }
}

