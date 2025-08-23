---
id: c47b13f0-b934-40f2-807b-d301c6d9ed0c
title: 'ADR-002: Memory-Based Documentation System with FlexSearch'
tags:
  - architecture
  - documentation
  - memory-system
  - flexsearch
  - llm-integration
category: ADR
created_at: '2025-08-22T13:50:37.006Z'
updated_at: '2025-08-23T11:59:09.036Z'
last_reviewed: '2025-08-22T13:50:37.006Z'
links:
  - a91a6906-8f61-4071-a548-15b96967605e
  - f92958ad-882a-4739-9563-3347880830b8
  - ae420693-4b12-479b-9c77-0faca0382a24
sources:
  - packages/shared/src/memory/memory-service.ts:1-100
  - packages/shared/src/memory/types.ts:1-59
  - packages/shared/src/utils/flexsearch.ts
  - packages/shared/src/utils/flexsearch-config.ts
---

# ADR-002: Memory-Based Documentation System with FlexSearch

**Date:** 2025-01-15

**Context:** Need to create a documentation system that is both human-readable and LLM-friendly, with powerful search capabilities and structured data for coverage analysis.

**Decision:** Implement a memory-based documentation system using FlexSearch for full-text search, with structured JSON format and bidirectional linking capabilities.

**Rationale:**

**Memory-Based Architecture:**
- **LLM Compatibility**: Memories can be directly ingested by LLMs without parsing
- **Structured Data**: JSON format allows for precise source mapping and coverage analysis
- **Bidirectional Linking**: Enables discovery of related documentation and knowledge graphs
- **Version Control**: Git-friendly format enables tracking documentation changes
- **Flexible Categories**: Support for ADR, DOC, and CTX memory types

**FlexSearch Integration:**
- **Performance**: Fast search with configurable tokenization strategies
- **Flexibility**: Multiple search modes (strict, forward, reverse, full, tolerant)
- **Memory Efficiency**: Optimized index size and search performance
- **TypeScript Support**: Excellent TypeScript integration and type safety

**Memory Categories:**
- **ADR (Architecture Decision Records)**: High-level architectural decisions and design patterns
- **DOC (Documentation)**: Specific code elements, functions, classes, business logic, and edge cases
- **CTX (Context)**: Development patterns, conventions, and session context for LLMs

**Search Capabilities:**
- **Semantic Search**: Natural language queries across documentation
- **Fuzzy Matching**: Typo tolerance and approximate matching
- **Category Filtering**: Search within specific memory types
- **Tag-Based Discovery**: Find related content through tag associations

**Trade-offs:**
- **Learning Curve**: Team needs to learn new documentation format
- **Tooling**: Requires custom tools for coverage analysis and management
- **Migration**: Existing documentation needs conversion to memory format
- **Search Dependency**: Relies on FlexSearch for effective discovery

**Implementation Strategy:**
- Start with critical architectural decisions and complex business logic
- Gradually migrate existing documentation to memory format
- Build tooling for coverage analysis and quality assessment
- Establish patterns for linking related memories
- Implement validation and quality checks for memory content

**Related Documentation:** - FlexSearch configuration details - Memory linking implementation

## Related
- [[(CTX)(llm-memory-management-tools-project-overview)(a91a6906-8f61-4071-a548-15b96967605e)|LLM Memory Management Tools - Project Overview]]
- [[(DOC)(flexsearch-configuration-and-performance-optimization)(f92958ad-882a-4739-9563-3347880830b8)|FlexSearch Configuration and Performance Optimization]]
- [[(DOC)(linkservice-bidirectional-memory-linking-and-referential-integrity-management)(ae420693-4b12-479b-9c77-0faca0382a24)|LinkService: Bidirectional Memory Linking and Referential Integrity Management]]
