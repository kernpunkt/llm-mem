import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadMemoryConfig,
  getCategoryTemplate,
  mergeTemplateFrontmatter,
  validateTemplateFields,
  PROTECTED_FRONTMATTER_FIELDS,
  type MemoryConfig,
} from "../src/utils/frontmatter-config.js";

describe("Frontmatter Config Utilities", () => {
  let tempDir: string;
  const createdFiles: string[] = [];

  beforeEach(() => {
    tempDir = join(tmpdir(), `frontmatter-config-test-${Date.now()}`);
  });

  afterEach(async () => {
    // Clean up temporary files
    for (const file of createdFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors if file was already deleted
      }
    }
    createdFiles.length = 0;
  });

  describe("loadMemoryConfig", () => {
    it("should load valid YAML configuration file", async () => {
      const configPath = join(tempDir, "memory-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const yamlContent = `templates:
  DOC:
    author: "default"
    status: "draft"
    version: "1.0"
  ADR:
    decision_status: "proposed"
    stakeholders: []`;

      await fs.writeFile(configPath, yamlContent, "utf-8");
      createdFiles.push(configPath);

      const config = await loadMemoryConfig(configPath);

      expect(config).toBeDefined();
      expect(config.templates).toBeDefined();
      expect(config.templates?.DOC).toEqual({
        author: "default",
        status: "draft",
        version: "1.0",
      });
      expect(config.templates?.ADR).toEqual({
        decision_status: "proposed",
        stakeholders: [],
      });
    });

    it("should load valid JSON configuration file", async () => {
      const configPath = join(tempDir, "memory-config.json");
      await fs.mkdir(tempDir, { recursive: true });
      
      const jsonContent = JSON.stringify({
        templates: {
          DOC: {
            author: "default",
            status: "draft",
          },
        },
      });

      await fs.writeFile(configPath, jsonContent, "utf-8");
      createdFiles.push(configPath);

      const config = await loadMemoryConfig(configPath);

      expect(config).toBeDefined();
      expect(config.templates?.DOC).toEqual({
        author: "default",
        status: "draft",
      });
    });

    it("should handle configuration without templates", async () => {
      const configPath = join(tempDir, "memory-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      // Use an empty object instead of just a comment, as YAML comments parse to null
      const yamlContent = `{}`;

      await fs.writeFile(configPath, yamlContent, "utf-8");
      createdFiles.push(configPath);

      const config = await loadMemoryConfig(configPath);

      expect(config).toBeDefined();
      expect(config.templates).toBeUndefined();
    });

    it("should handle configuration with empty templates", async () => {
      const configPath = join(tempDir, "memory-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const yamlContent = `templates: {}`;

      await fs.writeFile(configPath, yamlContent, "utf-8");
      createdFiles.push(configPath);

      const config = await loadMemoryConfig(configPath);

      expect(config).toBeDefined();
      expect(config.templates).toEqual({});
    });

    it("should throw error for invalid YAML", async () => {
      const configPath = join(tempDir, "invalid-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const invalidYaml = `templates:
  DOC:
    - invalid: yaml: structure: [`;

      await fs.writeFile(configPath, invalidYaml, "utf-8");
      createdFiles.push(configPath);

      await expect(loadMemoryConfig(configPath)).rejects.toThrow();
    });

    it("should throw error for invalid JSON", async () => {
      const configPath = join(tempDir, "invalid-config.json");
      await fs.mkdir(tempDir, { recursive: true });
      
      const invalidJson = `{ "templates": { "DOC": { invalid json } } }`;

      await fs.writeFile(configPath, invalidJson, "utf-8");
      createdFiles.push(configPath);

      await expect(loadMemoryConfig(configPath)).rejects.toThrow();
    });

    it("should throw error for non-existent file", async () => {
      const nonExistentPath = join(tempDir, "non-existent.yaml");

      await expect(loadMemoryConfig(nonExistentPath)).rejects.toThrow(
        "Failed to load memory configuration"
      );
    });

    it("should handle complex template structures", async () => {
      const configPath = join(tempDir, "complex-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const yamlContent = `templates:
  DOC:
    author: "default"
    status: "draft"
    metadata:
      version: "1.0"
      department: "engineering"
    tags: ["documentation"]
    review_date: null
  MEETING:
    meeting_date: null
    attendees: []
    action_items: []
    meeting_type: "standup"`;

      await fs.writeFile(configPath, yamlContent, "utf-8");
      createdFiles.push(configPath);

      const config = await loadMemoryConfig(configPath);

      expect(config.templates?.DOC).toBeDefined();
      expect(config.templates?.DOC.metadata).toEqual({
        version: "1.0",
        department: "engineering",
      });
      expect(config.templates?.MEETING).toBeDefined();
      expect(config.templates?.MEETING.attendees).toEqual([]);
    });
  });

  describe("getCategoryTemplate", () => {
    it("should return template for existing category", () => {
      const config: MemoryConfig = {
        templates: {
          DOC: {
            author: "default",
            status: "draft",
          },
          ADR: {
            decision_status: "proposed",
          },
        },
      };

      const template = getCategoryTemplate(config, "DOC");

      expect(template).toEqual({
        author: "default",
        status: "draft",
      });
    });

    it("should return empty object for non-existent category", () => {
      const config: MemoryConfig = {
        templates: {
          DOC: {
            author: "default",
          },
        },
      };

      const template = getCategoryTemplate(config, "NONEXISTENT");

      expect(template).toEqual({});
    });

    it("should return empty object when config is null", () => {
      const template = getCategoryTemplate(null, "DOC");

      expect(template).toEqual({});
    });

    it("should return empty object when config is undefined", () => {
      const template = getCategoryTemplate(undefined, "DOC");

      expect(template).toEqual({});
    });

    it("should return empty object when templates are undefined", () => {
      const config: MemoryConfig = {};

      const template = getCategoryTemplate(config, "DOC");

      expect(template).toEqual({});
    });

    it("should handle case-sensitive category names", () => {
      const config: MemoryConfig = {
        templates: {
          DOC: {
            author: "default",
          },
          doc: {
            author: "lowercase",
          },
        },
      };

      const upperTemplate = getCategoryTemplate(config, "DOC");
      const lowerTemplate = getCategoryTemplate(config, "doc");

      expect(upperTemplate).toEqual({ author: "default" });
      expect(lowerTemplate).toEqual({ author: "lowercase" });
    });
  });

  describe("mergeTemplateFrontmatter", () => {
    it("should merge template with base frontmatter", () => {
      const base = {
        id: "123",
        title: "Test",
        category: "DOC",
      };

      const template = {
        author: "John",
        status: "draft",
      };

      const merged = mergeTemplateFrontmatter(base, template);

      expect(merged).toEqual({
        id: "123",
        title: "Test",
        category: "DOC",
        author: "John",
        status: "draft",
      });
    });

    it("should override base values with template values", () => {
      const base = {
        id: "123",
        title: "Test",
        category: "DOC",
        status: "published",
      };

      const template = {
        status: "draft",
        author: "John",
      };

      const merged = mergeTemplateFrontmatter(base, template);

      expect(merged.status).toBe("draft"); // Template overrides base
      expect(merged.author).toBe("John");
      expect(merged.id).toBe("123"); // Base values preserved
    });

    it("should handle empty template", () => {
      const base = {
        id: "123",
        title: "Test",
        category: "DOC",
      };

      const template = {};

      const merged = mergeTemplateFrontmatter(base, template);

      expect(merged).toEqual(base);
    });

    it("should handle nested objects in template", () => {
      const base = {
        id: "123",
        title: "Test",
      };

      const template = {
        metadata: {
          version: "1.0",
          author: "John",
        },
      };

      const merged = mergeTemplateFrontmatter(base, template);

      expect(merged.metadata).toEqual({
        version: "1.0",
        author: "John",
      });
    });

    it("should handle arrays in template", () => {
      const base = {
        id: "123",
        title: "Test",
      };

      const template = {
        tags: ["tag1", "tag2"],
        stakeholders: ["person1", "person2"],
      };

      const merged = mergeTemplateFrontmatter(base, template);

      expect(merged.tags).toEqual(["tag1", "tag2"]);
      expect(merged.stakeholders).toEqual(["person1", "person2"]);
    });

    it("should handle null values in template", () => {
      const base = {
        id: "123",
        title: "Test",
      };

      const template = {
        review_date: null,
        superseded_by: null,
      };

      const merged = mergeTemplateFrontmatter(base, template);

      expect(merged.review_date).toBeNull();
      expect(merged.superseded_by).toBeNull();
    });
  });

  describe("validateTemplateFields", () => {
    it("should allow valid template fields", () => {
      const template = {
        author: "John Doe",
        status: "draft",
        version: "1.0",
      };

      expect(() => validateTemplateFields(template)).not.toThrow();
    });

    it("should throw error for template with protected 'id' field", () => {
      const template = {
        id: "should-not-be-allowed",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: id"
      );
    });

    it("should throw error for template with protected 'title' field", () => {
      const template = {
        title: "should-not-be-allowed",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: title"
      );
    });

    it("should throw error for template with protected 'category' field", () => {
      const template = {
        category: "should-not-be-allowed",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: category"
      );
    });

    it("should throw error for template with protected 'created_at' field", () => {
      const template = {
        created_at: "2024-01-01T00:00:00Z",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: created_at"
      );
    });

    it("should throw error for template with protected 'updated_at' field", () => {
      const template = {
        updated_at: "2024-01-01T00:00:00Z",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: updated_at"
      );
    });

    it("should throw error for template with protected 'last_reviewed' field", () => {
      const template = {
        last_reviewed: "2024-01-01T00:00:00Z",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: last_reviewed"
      );
    });

    it("should throw error for template with protected 'links' field", () => {
      const template = {
        links: ["should-not-be-allowed"],
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: links"
      );
    });

    it("should throw error for template with multiple protected fields", () => {
      const template = {
        id: "should-not-be-allowed",
        title: "should-not-be-allowed",
        category: "should-not-be-allowed",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).toThrow(
        "Template cannot override protected frontmatter fields: id, title, category"
      );
    });

    it("should include context in error message when provided", () => {
      const template = {
        id: "should-not-be-allowed",
      };

      expect(() => validateTemplateFields(template, "DOC")).toThrow(
        'Template for category "DOC" cannot override protected frontmatter fields: id'
      );
    });

    it("should list all protected fields in error message", () => {
      const template = {
        id: "should-not-be-allowed",
      };

      try {
        validateTemplateFields(template);
        expect.fail("Should have thrown an error");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain("Protected fields are:");
        for (const field of PROTECTED_FRONTMATTER_FIELDS) {
          expect(errorMessage).toContain(field);
        }
      }
    });

    it("should allow optional fields like tags, sources, abstract", () => {
      const template = {
        tags: ["tag1", "tag2"],
        sources: ["source1"],
        abstract: "Some abstract",
        author: "John Doe",
      };

      expect(() => validateTemplateFields(template)).not.toThrow();
    });

    it("should allow empty template", () => {
      const template = {};

      expect(() => validateTemplateFields(template)).not.toThrow();
    });
  });

  describe("loadMemoryConfig validation", () => {
    it("should reject config file with template containing protected fields", async () => {
      const configPath = join(tempDir, "invalid-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const invalidYaml = `templates:
  DOC:
    id: "should-not-be-allowed"
    author: "default"`;

      await fs.writeFile(configPath, invalidYaml, "utf-8");
      createdFiles.push(configPath);

      await expect(loadMemoryConfig(configPath)).rejects.toThrow(
        "Template for category \"DOC\" cannot override protected frontmatter fields: id"
      );
    });

    it("should reject config file with multiple protected fields in template", async () => {
      const configPath = join(tempDir, "invalid-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const invalidYaml = `templates:
  DOC:
    id: "should-not-be-allowed"
    title: "should-not-be-allowed"
    category: "should-not-be-allowed"
    author: "default"`;

      await fs.writeFile(configPath, invalidYaml, "utf-8");
      createdFiles.push(configPath);

      await expect(loadMemoryConfig(configPath)).rejects.toThrow(
        "Template for category \"DOC\" cannot override protected frontmatter fields: id, title, category"
      );
    });

    it("should accept config file with valid templates", async () => {
      const configPath = join(tempDir, "valid-config.yaml");
      await fs.mkdir(tempDir, { recursive: true });
      
      const validYaml = `templates:
  DOC:
    author: "default"
    status: "draft"
    version: "1.0"`;

      await fs.writeFile(configPath, validYaml, "utf-8");
      createdFiles.push(configPath);

      const config = await loadMemoryConfig(configPath);

      expect(config).toBeDefined();
      expect(config.templates?.DOC).toEqual({
        author: "default",
        status: "draft",
        version: "1.0",
      });
    });
  });

  describe("getCategoryTemplate validation", () => {
    it("should validate template when retrieving from config", () => {
      const config: MemoryConfig = {
        templates: {
          DOC: {
            id: "should-not-be-allowed",
            author: "default",
          },
        },
      };

      // Note: This will throw during getCategoryTemplate call
      expect(() => getCategoryTemplate(config, "DOC")).toThrow(
        'Template for category "DOC" cannot override protected frontmatter fields: id'
      );
    });
  });
});

