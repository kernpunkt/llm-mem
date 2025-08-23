import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { 
  slugify, 
  ensureDirectoryExists, 
  generateMemoryFilePath, 
  parseMemoryFilePath,
  listMemoryFiles,
  fileExists,
  safeDeleteFile
} from '../src/utils/file-system.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn()
  }
}));

describe('File System Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('slugify', () => {
    it('should convert text to URL-friendly slug', () => {
      expect(slugify("Meeting with John about Q4 goals")).toBe("meeting-with-john-about-q4-goals");
      expect(slugify("Project Ideas & Brainstorm")).toBe("project-ideas-brainstorm");
      expect(slugify("Team Retrospective Notes")).toBe("team-retrospective-notes");
      expect(slugify("New Year Planning 2025!")).toBe("new-year-planning-2025");
    });

    it('should handle special characters', () => {
      expect(slugify("Test@#$%^&*()")).toBe("test");
      expect(slugify("Multiple   Spaces")).toBe("multiple-spaces");
      expect(slugify("---Leading---Trailing---")).toBe("leading-trailing");
    });

    it('should handle empty and whitespace strings', () => {
      expect(slugify("")).toBe("");
      expect(slugify("   ")).toBe("");
      expect(slugify("  test  ")).toBe("test");
    });
  });

  describe('generateMemoryFilePath', () => {
    it('should generate correct file path with slugified title', () => {
      const result = generateMemoryFilePath(
        './memories',
        'work',
        'Meeting with John',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(result).toBe('./memories/(work)(meeting-with-john)(550e8400-e29b-41d4-a716-446655440000).md');
    });

    it('should handle custom paths', () => {
      const result = generateMemoryFilePath(
        '/custom/path',
        'personal',
        'Project Ideas',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      );
      expect(result).toBe('/custom/path/(personal)(project-ideas)(6ba7b810-9dad-11d1-80b4-00c04fd430c8).md');
    });

    it('should handle special characters in title', () => {
      const result = generateMemoryFilePath(
        './memories',
        'work',
        'Test & Special @ Characters!',
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(result).toBe('./memories/(work)(test-special-characters)(550e8400-e29b-41d4-a716-446655440000).md');
    });
  });

  describe('parseMemoryFilePath', () => {
    it('should parse valid memory file path', () => {
      const result = parseMemoryFilePath('./memories/(work)(meeting-with-john)(550e8400-e29b-41d4-a716-446655440000).md');
      expect(result).toEqual({
        category: 'work',
        title: 'meeting-with-john',
        id: '550e8400-e29b-41d4-a716-446655440000'
      });
    });

    it('should handle custom paths', () => {
      const result = parseMemoryFilePath('/custom/path/(personal)(project-ideas)(6ba7b810-9dad-11d1-80b4-00c04fd430c8).md');
      expect(result).toEqual({
        category: 'personal',
        title: 'project-ideas',
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      });
    });

    it('should handle complex titles with hyphens', () => {
      const result = parseMemoryFilePath('./memories/(work)(team-retrospective-notes)(550e8400-e29b-41d4-a716-446655440000).md');
      expect(result).toEqual({
        category: 'work',
        title: 'team-retrospective-notes',
        id: '550e8400-e29b-41d4-a716-446655440000'
      });
    });

    it('should return null for invalid file paths', () => {
      expect(parseMemoryFilePath('./memories/invalid-file.txt')).toBeNull();
      expect(parseMemoryFilePath('./memories/(work)(meeting).md')).toBeNull(); // No UUID
      expect(parseMemoryFilePath('./memories/(work)(550e8400-e29b-41d4-a716-446655440000).md')).toBeNull(); // No title
      expect(parseMemoryFilePath('./memories/(550e8400-e29b-41d4-a716-446655440000).md')).toBeNull(); // No category
    });

    it('should handle backward slashes', () => {
      const result = parseMemoryFilePath('.\\memories\\(work)(meeting-with-john)(550e8400-e29b-41d4-a716-446655440000).md');
      expect(result).toEqual({
        category: 'work',
        title: 'meeting-with-john',
        id: '550e8400-e29b-41d4-a716-446655440000'
      });
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockMkdir.mockResolvedValueOnce(undefined);

      await ensureDirectoryExists('/test/path');

      expect(mockAccess).toHaveBeenCalledWith('/test/path');
      expect(mockMkdir).toHaveBeenCalledWith('/test/path', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      mockAccess.mockResolvedValueOnce(undefined);

      await ensureDirectoryExists('/test/path');

      expect(mockAccess).toHaveBeenCalledWith('/test/path');
      expect(mockMkdir).not.toHaveBeenCalled();
    });

    it('should throw error if directory creation fails', async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(ensureDirectoryExists('/test/path')).rejects.toThrow('Permission denied');
    });
  });



  describe('listMemoryFiles', () => {
    it('should return array of memory file paths', async () => {
      const mockReaddir = vi.mocked(fs.readdir);
      const mockFiles = [
        { name: '(work)(meeting)(550e8400-e29b-41d4-a716-446655440000).md' } as any,
        { name: '(personal)(notes)(6ba7b810-9dad-11d1-80b4-00c04fd430c8).md' } as any,
        { name: 'ignore.txt' } as any,
        { name: 'another-file.pdf' } as any
      ];
      mockReaddir.mockResolvedValueOnce(mockFiles);

      const result = await listMemoryFiles('./memories');

      expect(result).toEqual([
        './memories/(work)(meeting)(550e8400-e29b-41d4-a716-446655440000).md',
        './memories/(personal)(notes)(6ba7b810-9dad-11d1-80b4-00c04fd430c8).md'
      ]);
    });

    it('should return empty array if directory does not exist', async () => {
      const mockReaddir = vi.mocked(fs.readdir);
      mockReaddir.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await listMemoryFiles('./memories');

      expect(result).toEqual([]);
    });

    it('should throw error for other readdir failures', async () => {
      const mockReaddir = vi.mocked(fs.readdir);
      mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(listMemoryFiles('./memories')).rejects.toThrow('Permission denied');
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValueOnce(undefined);

      const result = await fileExists('./memories/test.md');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('./memories/test.md');
    });

    it('should return false if file does not exist', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await fileExists('./memories/test.md');

      expect(result).toBe(false);
    });
  });

  describe('safeDeleteFile', () => {
    it('should delete file and return true if file exists', async () => {
      const mockUnlink = vi.mocked(fs.unlink);
      mockUnlink.mockResolvedValueOnce(undefined);

      const result = await safeDeleteFile('./memories/test.md');

      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalledWith('./memories/test.md');
    });

    it('should return false if file does not exist', async () => {
      const mockUnlink = vi.mocked(fs.unlink);
      mockUnlink.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await safeDeleteFile('./memories/test.md');

      expect(result).toBe(false);
    });

    it('should throw error for other unlink failures', async () => {
      const mockUnlink = vi.mocked(fs.unlink);
      mockUnlink.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(safeDeleteFile('./memories/test.md')).rejects.toThrow('Permission denied');
    });
  });
}); 