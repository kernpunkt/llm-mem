import { describe, it, expect } from 'vitest';
import { updateWikiLinks, findWikiLinks, hasWikiLink } from '../src/utils/wiki-links.js';

describe('Wiki Links Utilities', () => {
  describe('updateWikiLinks', () => {
    it('should update simple wiki-style links', () => {
      const content = 'See [[Old Title]] for more information.';
      const result = updateWikiLinks(content, 'Old Title', 'New Title');
      expect(result).toBe('See [[New Title]] for more information.');
    });

    it('should update wiki-style links with display text', () => {
      const content = 'See [[Old Title|Click here]] for more information.';
      const result = updateWikiLinks(content, 'Old Title', 'New Title');
      expect(result).toBe('See [[New Title|Click here]] for more information.');
    });

    it('should update multiple wiki-style links', () => {
      const content = 'See [[Old Title]] and also [[Old Title|here]] for more information.';
      const result = updateWikiLinks(content, 'Old Title', 'New Title');
      expect(result).toBe('See [[New Title]] and also [[New Title|here]] for more information.');
    });

    it('should handle mixed content with other markdown - note: current implementation updates all wiki links including in code blocks', () => {
      const content = `# Header

This is a paragraph with [[Old Title]] link.

- List item with [[Old Title|display]] link
- Another item

\`\`\`code
// Code block with [[Old Title]] will be updated (limitation of current implementation)
\`\`\`

More content with [[Old Title]] link.`;

      const result = updateWikiLinks(content, 'Old Title', 'New Title');
      expect(result).toBe(`# Header

This is a paragraph with [[New Title]] link.

- List item with [[New Title|display]] link
- Another item

\`\`\`code
// Code block with [[New Title]] will be updated (limitation of current implementation)
\`\`\`

More content with [[New Title]] link.`);
    });

    it('should handle special characters in titles', () => {
      const content = 'See [[Title with (parentheses) & symbols!]] for info.';
      const result = updateWikiLinks(content, 'Title with (parentheses) & symbols!', 'New Title');
      expect(result).toBe('See [[New Title]] for info.');
    });

    it('should not update links when titles are the same', () => {
      const content = 'See [[Same Title]] for info.';
      const result = updateWikiLinks(content, 'Same Title', 'Same Title');
      expect(result).toBe(content);
    });

    it('should handle empty content', () => {
      const result = updateWikiLinks('', 'Old Title', 'New Title');
      expect(result).toBe('');
    });

    it('should handle content without wiki links', () => {
      const content = 'This is just regular markdown content.';
      const result = updateWikiLinks(content, 'Old Title', 'New Title');
      expect(result).toBe(content);
    });

    it('should handle partial matches correctly', () => {
      const content = 'See [[Old Title]] and [[Old Title Extended]] for info.';
      const result = updateWikiLinks(content, 'Old Title', 'New Title');
      expect(result).toBe('See [[New Title]] and [[Old Title Extended]] for info.');
    });
  });

  describe('findWikiLinks', () => {
    it('should find simple wiki-style links', () => {
      const content = 'See [[Title1]] and [[Title2]] for information.';
      const links = findWikiLinks(content);
      expect(links).toEqual(['Title1', 'Title2']);
    });

    it('should find wiki-style links with display text', () => {
      const content = 'See [[Title1|Click here]] and [[Title2|More info]] for information.';
      const links = findWikiLinks(content);
      expect(links).toEqual(['Title1', 'Title2']);
    });

    it('should handle mixed content', () => {
      const content = `# Header

This is a paragraph with [[Title1]] link.

- List item with [[Title2|display]] link
- Another item with [[Title3]] link

\`\`\`code
// Code block with [[Title4]] will be included (limitation of current implementation)
\`\`\`

More content with [[Title5]] link.`;

      const links = findWikiLinks(content);
      expect(links).toEqual(['Title1', 'Title2', 'Title3', 'Title4', 'Title5']);
    });

    it('should remove duplicate links', () => {
      const content = 'See [[Title1]], [[Title2]], and [[Title1]] again.';
      const links = findWikiLinks(content);
      expect(links).toEqual(['Title1', 'Title2']);
    });

    it('should handle empty content', () => {
      const links = findWikiLinks('');
      expect(links).toEqual([]);
    });

    it('should handle content without wiki links', () => {
      const content = 'This is just regular markdown content.';
      const links = findWikiLinks(content);
      expect(links).toEqual([]);
    });

    it('should handle special characters in titles', () => {
      const content = 'See [[Title with (parentheses) & symbols!]] for info.';
      const links = findWikiLinks(content);
      expect(links).toEqual(['Title with (parentheses) & symbols!']);
    });
  });

  describe('hasWikiLink', () => {
    it('should return true for simple wiki-style links', () => {
      const content = 'See [[Test Title]] for information.';
      expect(hasWikiLink(content, 'Test Title')).toBe(true);
    });

    it('should return true for wiki-style links with display text', () => {
      const content = 'See [[Test Title|Click here]] for information.';
      expect(hasWikiLink(content, 'Test Title')).toBe(true);
    });

    it('should return false for non-matching titles', () => {
      const content = 'See [[Test Title]] for information.';
      expect(hasWikiLink(content, 'Different Title')).toBe(false);
    });

    it('should return false for partial matches', () => {
      const content = 'See [[Test Title Extended]] for information.';
      expect(hasWikiLink(content, 'Test Title')).toBe(false);
    });

    it('should handle special characters in titles', () => {
      const content = 'See [[Title with (parentheses) & symbols!]] for info.';
      expect(hasWikiLink(content, 'Title with (parentheses) & symbols!')).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(hasWikiLink('', 'Test Title')).toBe(false);
    });

    it('should return false for content without wiki links', () => {
      const content = 'This is just regular markdown content.';
      expect(hasWikiLink(content, 'Test Title')).toBe(false);
    });
  });
});
