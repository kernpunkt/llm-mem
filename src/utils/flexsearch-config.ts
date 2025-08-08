import { z } from "zod";

/**
 * FlexSearch configuration schema for environment variables
 */
const FlexSearchConfigSchema = z.object({
  // Tokenization options
  tokenize: z.enum(["strict", "forward", "reverse", "full", "tolerant"]).default("forward"),
  resolution: z.number().int().min(1).max(20).default(9),
  depth: z.number().int().min(1).max(10).default(3),
  threshold: z.number().int().min(0).max(10).default(1),
  limit: z.number().int().min(1).max(1000).default(100),
  suggest: z.boolean().default(true),
  
  // Encoder options
  charset: z.enum(["exact", "normalize", "latinbalance", "latinadvanced", "latinextra", "latinsoundex", "cjk"]).default("normalize"),
  language: z.enum(["en", "de", "fr"]).optional(),
  
  // Stopwords configuration
  stopwords: z.array(z.string()).default([
    // English common stopwords
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "her", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
    "what", "when", "where", "why", "how", "which", "who", "whom", "whose",
    "if", "then", "else", "than", "as", "so", "because", "since", "while", "although", "though",
    "very", "much", "many", "few", "some", "any", "all", "each", "every", "no", "not", "yes",
    "here", "there", "where", "now", "then", "today", "yesterday", "tomorrow",
    "up", "down", "out", "off", "over", "under", "again", "further", "thence", "once",
    "now", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
  ]),
  
  // Minimum and maximum term length
  minLength: z.number().int().min(1).max(10).default(2),
  maxLength: z.number().int().min(5).max(50).default(20),
  
  // Context search options
  context: z.boolean().default(false),
  contextResolution: z.number().int().min(1).max(20).default(5),
  contextDepth: z.number().int().min(1).max(10).default(3),
  contextBidirectional: z.boolean().default(true),
});

export type FlexSearchConfig = z.infer<typeof FlexSearchConfigSchema>;

/**
 * Parse FlexSearch configuration from environment variables
 */
export function parseFlexSearchConfig(): FlexSearchConfig {
  const config: Partial<FlexSearchConfig> = {};
  
  // Parse tokenization options
  if (process.env.FLEXSEARCH_TOKENIZE) {
    config.tokenize = process.env.FLEXSEARCH_TOKENIZE as any;
  }
  
  if (process.env.FLEXSEARCH_RESOLUTION) {
    config.resolution = parseInt(process.env.FLEXSEARCH_RESOLUTION);
  }
  
  if (process.env.FLEXSEARCH_DEPTH) {
    config.depth = parseInt(process.env.FLEXSEARCH_DEPTH);
  }
  
  if (process.env.FLEXSEARCH_THRESHOLD) {
    config.threshold = parseInt(process.env.FLEXSEARCH_THRESHOLD);
  }
  
  if (process.env.FLEXSEARCH_LIMIT) {
    config.limit = parseInt(process.env.FLEXSEARCH_LIMIT);
  }
  
  if (process.env.FLEXSEARCH_SUGGEST !== undefined) {
    config.suggest = process.env.FLEXSEARCH_SUGGEST === 'true';
  }
  
  // Parse encoder options
  if (process.env.FLEXSEARCH_CHARSET) {
    config.charset = process.env.FLEXSEARCH_CHARSET as any;
  }
  
  if (process.env.FLEXSEARCH_LANGUAGE) {
    config.language = process.env.FLEXSEARCH_LANGUAGE as any;
  }
  
  // Parse stopwords
  if (process.env.FLEXSEARCH_STOPWORDS) {
    try {
      config.stopwords = JSON.parse(process.env.FLEXSEARCH_STOPWORDS);
    } catch (error) {
      console.warn("Invalid FLEXSEARCH_STOPWORDS JSON, using default stopwords");
    }
  }
  
  // Parse length limits
  if (process.env.FLEXSEARCH_MIN_LENGTH) {
    config.minLength = parseInt(process.env.FLEXSEARCH_MIN_LENGTH);
  }
  
  if (process.env.FLEXSEARCH_MAX_LENGTH) {
    config.maxLength = parseInt(process.env.FLEXSEARCH_MAX_LENGTH);
  }
  
  // Parse context search options
  if (process.env.FLEXSEARCH_CONTEXT !== undefined) {
    config.context = process.env.FLEXSEARCH_CONTEXT === 'true';
  }
  
  if (process.env.FLEXSEARCH_CONTEXT_RESOLUTION) {
    config.contextResolution = parseInt(process.env.FLEXSEARCH_CONTEXT_RESOLUTION);
  }
  
  if (process.env.FLEXSEARCH_CONTEXT_DEPTH) {
    config.contextDepth = parseInt(process.env.FLEXSEARCH_CONTEXT_DEPTH);
  }
  
  if (process.env.FLEXSEARCH_CONTEXT_BIDIRECTIONAL !== undefined) {
    config.contextBidirectional = process.env.FLEXSEARCH_CONTEXT_BIDIRECTIONAL === 'true';
  }
  
  // Validate and return configuration
  return FlexSearchConfigSchema.parse(config);
}

/**
 * Get default FlexSearch configuration
 */
export function getDefaultFlexSearchConfig(): FlexSearchConfig {
  return FlexSearchConfigSchema.parse({});
}

/**
 * Create FlexSearch encoder configuration from parsed config
 */
export function createEncoderConfig(config: FlexSearchConfig) {
  const encoderConfig: any = {
    charset: config.charset,
    minlength: config.minLength,
    maxlength: config.maxLength,
  };
  
  // Add language support if specified
  if (config.language) {
    encoderConfig.language = config.language;
  }
  
  // Add stopwords filter
  if (config.stopwords && config.stopwords.length > 0) {
    encoderConfig.filter = new Set(config.stopwords);
  }
  
  return encoderConfig;
}

/**
 * Create FlexSearch index configuration from parsed config
 */
export function createIndexConfig(config: FlexSearchConfig) {
  const indexConfig: any = {
    tokenize: config.tokenize,
    resolution: config.resolution,
    depth: config.depth,
    threshold: config.threshold,
    limit: config.limit,
    suggest: config.suggest,
  };
  
  // Add context search if enabled
  if (config.context) {
    indexConfig.context = {
      resolution: config.contextResolution,
      depth: config.contextDepth,
      bidirectional: config.contextBidirectional,
    };
  }
  
  return indexConfig;
}
