---
id: f92958ad-882a-4739-9563-3347880830b8
title: FlexSearch Configuration and Performance Optimization
tags:
  - flexsearch
  - configuration
  - performance
  - optimization
  - search
  - indexing
category: DOC
created_at: '2025-08-22T13:52:04.472Z'
updated_at: '2025-08-23T06:17:40.003Z'
last_reviewed: '2025-08-22T13:52:04.472Z'
links:
  - c47b13f0-b934-40f2-807b-d301c6d9ed0c
  - e5fd798b-e1de-416d-af5a-b8096464f25a
sources:
  - packages/shared/src/utils/flexsearch-config.ts:1-40
  - packages/shared/src/memory/search-service.ts:25-60
  - packages/shared/src/utils/flexsearch.ts
---

# FlexSearch Configuration and Performance Optimization

**Purpose:** Configure and optimize FlexSearch for fast, accurate full-text search across memory content with configurable performance characteristics.

**FlexSearch Configuration Options:**

**Tokenization Methods:**
- **strict**: Exact matching for precise searches
- **forward**: Forward matching (default) for balanced performance
- **reverse**: Reverse matching for suffix-based searches
- **full**: Full matching for comprehensive coverage
- **tolerant**: Fuzzy matching for typo tolerance

**Performance Parameters:**
- **resolution**: Controls index precision (1-15, default 9)
  - Higher values = better recall, more memory usage
  - Lower values = faster searches, less memory
- **depth**: Controls search depth vs. performance trade-off
  - Higher values = more thorough searches, slower performance
  - Lower values = faster searches, less thorough
- **threshold**: Minimum relevance score for results (1-100)

**Language and Character Support:**
- **language**: Language-specific optimizations (en, de, etc.)
- **charset**: Character set configuration for international text
- **stemming**: Word stemming for better search results
- **stopwords**: Common words to exclude from indexing

**Performance Characteristics:**

**Indexing Performance:**
- **Time Complexity**: O(n) where n = number of tokens
- **Memory Usage**: ~2-3x the original text size
- **Index Size**: Approximately 15MB for 10,000 memories
- **Build Time**: Linear scaling with content size

**Search Performance:**
- **Exact Matches**: O(log n) for fast retrieval
- **Fuzzy Matches**: O(n) for approximate matching
- **Response Time**: ~50ms for 10k memories, ~200ms for 100k
- **Concurrent Searches**: Thread-safe for multiple queries

**Optimization Strategies:**

**Development vs. Production:**
- **Development**: Use 'tolerant' tokenization for quick iteration
- **Production**: Use 'forward' tokenization for balanced performance
- **High Precision**: Use 'strict' tokenization for exact matching
- **Fast Search**: Use lower resolution and depth values

**Memory vs. Performance Trade-offs:**
- **High Recall**: resolution 15, depth 5
- **Balanced**: resolution 9, depth 3 (default)
- **Fast Search**: resolution 5, depth 2
- **Memory Efficient**: resolution 3, depth 1

**Search Configuration Patterns:**

**High Precision Search:**
```typescript
const highPrecisionConfig = {
  tokenize: 'strict',
  resolution: 15,
  depth: 5,
  threshold: 1
};
```

**Fast Search Configuration:**
```typescript
const fastSearchConfig = {
  tokenize: 'tolerant',
  resolution: 5,
  depth: 2,
  threshold: 5
};
```

**German Language Support:**
```typescript
const germanConfig = {
  language: 'de',
  charset: 'latinadvanced',
  tokenize: 'forward',
  resolution: 9
};
```

**Integration with SearchService:**

**Index Management:**
- **Automatic Indexing**: New memories automatically indexed
- **Incremental Updates**: Only update changed content
- **Background Processing**: Non-blocking index updates
- **Error Recovery**: Graceful handling of indexing failures

**Search Operations:**
- **Query Processing**: Natural language query parsing
- **Result Ranking**: Relevance scoring and ordering
- **Filtering**: Category and tag-based filtering
- **Pagination**: Efficient result pagination

**Performance Monitoring:**
- **Index Size Tracking**: Monitor memory usage
- **Search Time Metrics**: Track query performance
- **Memory Usage**: Monitor FlexSearch memory consumption
- **Optimization Opportunities**: Identify performance bottlenecks

**Related Documentation:** - Search service implementation - Performance optimization patterns


- ADR-002: Memory-Based Documentation System with FlexSearch


## Related
- ADR-002: Memory-Based Documentation System with FlexSearch
- Memory Service Architecture and Implementation
- ADR-002: Memory-Based Documentation System with FlexSearch
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(ADR)(adr-002-memory-based-documentation-system-with-flexsearch)(c47b13f0-b934-40f2-807b-d301c6d9ed0c)|ADR-002: Memory-Based Documentation System with FlexSearch]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
- [[(DOC)(memory-service-architecture-and-implementation)(e5fd798b-e1de-416d-af5a-b8096464f25a)|Memory Service Architecture and Implementation]]
