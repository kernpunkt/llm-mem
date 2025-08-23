import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseFlexSearchConfig,
  getDefaultFlexSearchConfig,
  createEncoderConfig,
  createIndexConfig,
  type FlexSearchConfig,
} from "../src/utils/flexsearch-config.js";

describe("FlexSearch Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe("getDefaultFlexSearchConfig", () => {
    it("should return default configuration", () => {
      const config = getDefaultFlexSearchConfig();

      expect(config.tokenize).toBe("forward");
      expect(config.resolution).toBe(9);
      expect(config.depth).toBe(3);
      expect(config.threshold).toBe(1);
      expect(config.limit).toBe(100);
      expect(config.suggest).toBe(true);
      expect(config.charset).toBe("normalize");
      expect(config.language).toBeUndefined();
      expect(config.stopwords).toHaveLength(148);
      expect(config.minLength).toBe(2);
      expect(config.maxLength).toBe(20);
      expect(config.context).toBe(false);
      expect(config.contextResolution).toBe(5);
      expect(config.contextDepth).toBe(3);
      expect(config.contextBidirectional).toBe(true);
    });

    it("should include common English stopwords", () => {
      const config = getDefaultFlexSearchConfig();

      expect(config.stopwords).toContain("the");
      expect(config.stopwords).toContain("a");
      expect(config.stopwords).toContain("an");
      expect(config.stopwords).toContain("and");
      expect(config.stopwords).toContain("or");
      expect(config.stopwords).toContain("but");
      expect(config.stopwords).toContain("in");
      expect(config.stopwords).toContain("on");
      expect(config.stopwords).toContain("at");
      expect(config.stopwords).toContain("to");
    });
  });

  describe("parseFlexSearchConfig", () => {
    it("should return default config when no environment variables are set", () => {
      const config = parseFlexSearchConfig();

      expect(config.tokenize).toBe("forward");
      expect(config.resolution).toBe(9);
      expect(config.depth).toBe(3);
      expect(config.threshold).toBe(1);
      expect(config.limit).toBe(100);
      expect(config.suggest).toBe(true);
      expect(config.charset).toBe("normalize");
      expect(config.language).toBeUndefined();
      expect(config.minLength).toBe(2);
      expect(config.maxLength).toBe(20);
      expect(config.context).toBe(false);
    });

    it("should parse tokenization options from environment", () => {
      process.env.FLEXSEARCH_TOKENIZE = "strict";
      process.env.FLEXSEARCH_RESOLUTION = "15";
      process.env.FLEXSEARCH_DEPTH = "7";
      process.env.FLEXSEARCH_THRESHOLD = "5";
      process.env.FLEXSEARCH_LIMIT = "500";
      process.env.FLEXSEARCH_SUGGEST = "false";

      const config = parseFlexSearchConfig();

      expect(config.tokenize).toBe("strict");
      expect(config.resolution).toBe(15);
      expect(config.depth).toBe(7);
      expect(config.threshold).toBe(5);
      expect(config.limit).toBe(500);
      expect(config.suggest).toBe(false);
    });

    it("should parse encoder options from environment", () => {
      process.env.FLEXSEARCH_CHARSET = "exact";
      process.env.FLEXSEARCH_LANGUAGE = "de";

      const config = parseFlexSearchConfig();

      expect(config.charset).toBe("exact");
      expect(config.language).toBe("de");
    });

    it("should parse stopwords from environment", () => {
      const customStopwords = ["custom", "stopword", "list"];
      process.env.FLEXSEARCH_STOPWORDS = JSON.stringify(customStopwords);

      const config = parseFlexSearchConfig();

      expect(config.stopwords).toEqual(customStopwords);
    });

    it("should handle invalid stopwords JSON gracefully", () => {
      process.env.FLEXSEARCH_STOPWORDS = "invalid json";

      const config = parseFlexSearchConfig();

      // Should fall back to default stopwords
      expect(config.stopwords).toHaveLength(148);
      expect(config.stopwords).toContain("the");
    });

    it("should parse length limits from environment", () => {
      process.env.FLEXSEARCH_MIN_LENGTH = "3";
      process.env.FLEXSEARCH_MAX_LENGTH = "25";

      const config = parseFlexSearchConfig();

      expect(config.minLength).toBe(3);
      expect(config.maxLength).toBe(25);
    });

    it("should parse context search options from environment", () => {
      process.env.FLEXSEARCH_CONTEXT = "true";
      process.env.FLEXSEARCH_CONTEXT_RESOLUTION = "10";
      process.env.FLEXSEARCH_CONTEXT_DEPTH = "5";
      process.env.FLEXSEARCH_CONTEXT_BIDIRECTIONAL = "false";

      const config = parseFlexSearchConfig();

      expect(config.context).toBe(true);
      expect(config.contextResolution).toBe(10);
      expect(config.contextDepth).toBe(5);
      expect(config.contextBidirectional).toBe(false);
    });

    it("should handle boolean environment variables correctly", () => {
      process.env.FLEXSEARCH_SUGGEST = "true";
      process.env.FLEXSEARCH_CONTEXT = "false";

      const config = parseFlexSearchConfig();

      expect(config.suggest).toBe(true);
      expect(config.context).toBe(false);
    });

    it("should handle numeric environment variables correctly", () => {
      process.env.FLEXSEARCH_RESOLUTION = "12";
      process.env.FLEXSEARCH_DEPTH = "8";
      process.env.FLEXSEARCH_THRESHOLD = "3";
      process.env.FLEXSEARCH_LIMIT = "250";
      process.env.FLEXSEARCH_MIN_LENGTH = "4";
      process.env.FLEXSEARCH_MAX_LENGTH = "30";
      process.env.FLEXSEARCH_CONTEXT_RESOLUTION = "15";
      process.env.FLEXSEARCH_CONTEXT_DEPTH = "6";

      const config = parseFlexSearchConfig();

      expect(config.resolution).toBe(12);
      expect(config.depth).toBe(8);
      expect(config.threshold).toBe(3);
      expect(config.limit).toBe(250);
      expect(config.minLength).toBe(4);
      expect(config.maxLength).toBe(30);
      expect(config.contextResolution).toBe(15);
      expect(config.contextDepth).toBe(6);
    });

    it("should validate configuration constraints", () => {
      // Test resolution bounds
      process.env.FLEXSEARCH_RESOLUTION = "25"; // Above max
      expect(() => parseFlexSearchConfig()).toThrow();

      process.env.FLEXSEARCH_RESOLUTION = "0"; // Below min
      expect(() => parseFlexSearchConfig()).toThrow();

      // Test depth bounds
      process.env.FLEXSEARCH_DEPTH = "15"; // Above max
      expect(() => parseFlexSearchConfig()).toThrow();

      process.env.FLEXSEARCH_DEPTH = "0"; // Below min
      expect(() => parseFlexSearchConfig()).toThrow();

      // Test limit bounds
      process.env.FLEXSEARCH_LIMIT = "1500"; // Above max
      expect(() => parseFlexSearchConfig()).toThrow();

      process.env.FLEXSEARCH_LIMIT = "0"; // Below min
      expect(() => parseFlexSearchConfig()).toThrow();

      // Test minLength bounds
      process.env.FLEXSEARCH_MIN_LENGTH = "15"; // Above max
      expect(() => parseFlexSearchConfig()).toThrow();

      process.env.FLEXSEARCH_MIN_LENGTH = "0"; // Below min
      expect(() => parseFlexSearchConfig()).toThrow();

      // Test maxLength bounds
      process.env.FLEXSEARCH_MAX_LENGTH = "60"; // Above max
      expect(() => parseFlexSearchConfig()).toThrow();

      process.env.FLEXSEARCH_MAX_LENGTH = "3"; // Below min
      expect(() => parseFlexSearchConfig()).toThrow();
    });

    it("should handle mixed valid and invalid environment variables", () => {
      process.env.FLEXSEARCH_TOKENIZE = "reverse";
      process.env.FLEXSEARCH_RESOLUTION = "invalid";
      process.env.FLEXSEARCH_CHARSET = "latinbalance";

      // This should throw because invalid resolution is not a valid number
      expect(() => parseFlexSearchConfig()).toThrow();
    });
  });

  describe("createEncoderConfig", () => {
    it("should create basic encoder configuration", () => {
      const config: FlexSearchConfig = getDefaultFlexSearchConfig();
      const encoderConfig = createEncoderConfig(config);

      expect(encoderConfig.charset).toBe("normalize");
      expect(encoderConfig.minlength).toBe(2);
      expect(encoderConfig.maxlength).toBe(20);
      expect(encoderConfig.language).toBeUndefined();
      expect(encoderConfig.filter).toBeInstanceOf(Set);
    });

    it("should include language when specified", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        language: "de",
      };
      const encoderConfig = createEncoderConfig(config);

      expect(encoderConfig.language).toBe("de");
    });

    it("should include stopwords filter", () => {
      const config: FlexSearchConfig = getDefaultFlexSearchConfig();
      const encoderConfig = createEncoderConfig(config);

      expect(encoderConfig.filter).toBeInstanceOf(Set);
      expect(encoderConfig.filter.has("the")).toBe(true);
      expect(encoderConfig.filter.has("a")).toBe(true);
      expect(encoderConfig.filter.has("an")).toBe(true);
    });

    it("should handle empty stopwords array", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        stopwords: [],
      };
      const encoderConfig = createEncoderConfig(config);

      // When stopwords is empty, filter should not be set
      expect(encoderConfig.filter).toBeUndefined();
    });

    it("should handle custom stopwords", () => {
      const customStopwords = ["custom", "stopword"];
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        stopwords: customStopwords,
      };
      const encoderConfig = createEncoderConfig(config);

      expect(encoderConfig.filter).toBeInstanceOf(Set);
      expect(encoderConfig.filter.has("custom")).toBe(true);
      expect(encoderConfig.filter.has("stopword")).toBe(true);
      expect(encoderConfig.filter.has("the")).toBe(false);
    });

    it("should handle different charset options", () => {
      const charsets = ["exact", "latinbalance", "latinadvanced", "latinextra", "latinsoundex", "cjk"] as const;
      
      for (const charset of charsets) {
        const config: FlexSearchConfig = {
          ...getDefaultFlexSearchConfig(),
          charset,
        };
        const encoderConfig = createEncoderConfig(config);

        expect(encoderConfig.charset).toBe(charset);
      }
    });

    it("should handle different min/max length combinations", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        minLength: 5,
        maxLength: 15,
      };
      const encoderConfig = createEncoderConfig(config);

      expect(encoderConfig.minlength).toBe(5);
      expect(encoderConfig.maxlength).toBe(15);
    });
  });

  describe("createIndexConfig", () => {
    it("should create basic index configuration", () => {
      const config: FlexSearchConfig = getDefaultFlexSearchConfig();
      const indexConfig = createIndexConfig(config);

      expect(indexConfig.tokenize).toBe("forward");
      expect(indexConfig.resolution).toBe(9);
      expect(indexConfig.depth).toBe(3);
      expect(indexConfig.threshold).toBe(1);
      expect(indexConfig.limit).toBe(100);
      expect(indexConfig.suggest).toBe(true);
      expect(indexConfig.context).toBeUndefined();
    });

    it("should include context configuration when enabled", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        context: true,
        contextResolution: 12,
        contextDepth: 7,
        contextBidirectional: false,
      };
      const indexConfig = createIndexConfig(config);

      expect(indexConfig.context).toBeDefined();
      expect(indexConfig.context?.resolution).toBe(12);
      expect(indexConfig.context?.depth).toBe(7);
      expect(indexConfig.context?.bidirectional).toBe(false);
    });

    it("should not include context when disabled", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        context: false,
      };
      const indexConfig = createIndexConfig(config);

      expect(indexConfig.context).toBeUndefined();
    });

    it("should handle different tokenization options", () => {
      const tokenizeOptions = ["strict", "forward", "reverse", "full", "tolerant"] as const;
      
      for (const tokenize of tokenizeOptions) {
        const config: FlexSearchConfig = {
          ...getDefaultFlexSearchConfig(),
          tokenize,
        };
        const indexConfig = createIndexConfig(config);

        expect(indexConfig.tokenize).toBe(tokenize);
      }
    });

    it("should handle different resolution and depth values", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        resolution: 15,
        depth: 8,
        threshold: 5,
        limit: 500,
      };
      const indexConfig = createIndexConfig(config);

      expect(indexConfig.resolution).toBe(15);
      expect(indexConfig.depth).toBe(8);
      expect(indexConfig.threshold).toBe(5);
      expect(indexConfig.limit).toBe(500);
    });

    it("should handle suggest option", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        suggest: false,
      };
      const indexConfig = createIndexConfig(config);

      expect(indexConfig.suggest).toBe(false);
    });

    it("should handle context with default values", () => {
      const config: FlexSearchConfig = {
        ...getDefaultFlexSearchConfig(),
        context: true,
        // Use default context values
      };
      const indexConfig = createIndexConfig(config);

      expect(indexConfig.context).toBeDefined();
      expect(indexConfig.context?.resolution).toBe(5);
      expect(indexConfig.context?.depth).toBe(3);
      expect(indexConfig.context?.bidirectional).toBe(true);
    });
  });

  describe("Configuration Integration", () => {
    it("should create complete configuration from environment variables", () => {
      process.env.FLEXSEARCH_TOKENIZE = "full";
      process.env.FLEXSEARCH_RESOLUTION = "18";
      process.env.FLEXSEARCH_DEPTH = "9";
      process.env.FLEXSEARCH_THRESHOLD = "8";
      process.env.FLEXSEARCH_LIMIT = "750";
      process.env.FLEXSEARCH_SUGGEST = "false";
      process.env.FLEXSEARCH_CHARSET = "latinadvanced";
      process.env.FLEXSEARCH_LANGUAGE = "fr";
      process.env.FLEXSEARCH_MIN_LENGTH = "4";
      process.env.FLEXSEARCH_MAX_LENGTH = "35";
      process.env.FLEXSEARCH_CONTEXT = "true";
      process.env.FLEXSEARCH_CONTEXT_RESOLUTION = "18";
      process.env.FLEXSEARCH_CONTEXT_DEPTH = "9";
      process.env.FLEXSEARCH_CONTEXT_BIDIRECTIONAL = "false";

      const config = parseFlexSearchConfig();
      const encoderConfig = createEncoderConfig(config);
      const indexConfig = createIndexConfig(config);

      // Verify parsed config
      expect(config.tokenize).toBe("full");
      expect(config.resolution).toBe(18);
      expect(config.depth).toBe(9);
      expect(config.threshold).toBe(8);
      expect(config.limit).toBe(750);
      expect(config.suggest).toBe(false);
      expect(config.charset).toBe("latinadvanced");
      expect(config.language).toBe("fr");
      expect(config.minLength).toBe(4);
      expect(config.maxLength).toBe(35);
      expect(config.context).toBe(true);
      expect(config.contextResolution).toBe(18);
      expect(config.contextDepth).toBe(9);
      expect(config.contextBidirectional).toBe(false);

      // Verify encoder config
      expect(encoderConfig.charset).toBe("latinadvanced");
      expect(encoderConfig.language).toBe("fr");
      expect(encoderConfig.minlength).toBe(4);
      expect(encoderConfig.maxlength).toBe(35);

      // Verify index config
      expect(indexConfig.tokenize).toBe("full");
      expect(indexConfig.resolution).toBe(18);
      expect(indexConfig.depth).toBe(9);
      expect(indexConfig.threshold).toBe(8);
      expect(indexConfig.limit).toBe(750);
      expect(indexConfig.suggest).toBe(false);
      expect(indexConfig.context?.resolution).toBe(18);
      expect(indexConfig.context?.depth).toBe(9);
      expect(indexConfig.context?.bidirectional).toBe(false);
    });

    it("should handle edge case values correctly", () => {
      process.env.FLEXSEARCH_RESOLUTION = "1";
      process.env.FLEXSEARCH_DEPTH = "1";
      process.env.FLEXSEARCH_THRESHOLD = "0";
      process.env.FLEXSEARCH_LIMIT = "1";
      process.env.FLEXSEARCH_MIN_LENGTH = "1";
      process.env.FLEXSEARCH_MAX_LENGTH = "5";
      process.env.FLEXSEARCH_CONTEXT_RESOLUTION = "1";
      process.env.FLEXSEARCH_CONTEXT_DEPTH = "1";

      const config = parseFlexSearchConfig();
      const encoderConfig = createEncoderConfig(config);
      const indexConfig = createIndexConfig(config);

      expect(config.resolution).toBe(1);
      expect(config.depth).toBe(1);
      expect(config.threshold).toBe(0);
      expect(config.limit).toBe(1);
      expect(config.minLength).toBe(1);
      expect(config.maxLength).toBe(5);
      expect(config.contextResolution).toBe(1);
      expect(config.contextDepth).toBe(1);

      expect(encoderConfig.minlength).toBe(1);
      expect(encoderConfig.maxlength).toBe(5);
      expect(indexConfig.resolution).toBe(1);
      expect(indexConfig.depth).toBe(1);
    });

    it("should handle maximum boundary values correctly", () => {
      process.env.FLEXSEARCH_RESOLUTION = "20";
      process.env.FLEXSEARCH_DEPTH = "10";
      process.env.FLEXSEARCH_LIMIT = "1000";
      process.env.FLEXSEARCH_MIN_LENGTH = "10";
      process.env.FLEXSEARCH_MAX_LENGTH = "50";
      process.env.FLEXSEARCH_CONTEXT_RESOLUTION = "20";
      process.env.FLEXSEARCH_CONTEXT_DEPTH = "10";

      const config = parseFlexSearchConfig();
      const encoderConfig = createEncoderConfig(config);
      const indexConfig = createIndexConfig(config);

      expect(config.resolution).toBe(20);
      expect(config.depth).toBe(10);
      expect(config.limit).toBe(1000);
      expect(config.minLength).toBe(10);
      expect(config.maxLength).toBe(50);
      expect(config.contextResolution).toBe(20);
      expect(config.contextDepth).toBe(10);

      expect(encoderConfig.minlength).toBe(10);
      expect(encoderConfig.maxlength).toBe(50);
      expect(indexConfig.resolution).toBe(20);
      expect(indexConfig.depth).toBe(10);
    });
  });
});
