---
id: ac69f5f1-456a-44e3-8e63-cd39c29dd351
title: Memory Data Types and Validation Schemas
tags:
  - data-types
  - validation
  - schemas
  - business-rules
  - zod
  - type-safety
category: DOC
created_at: '2025-08-22T13:51:43.995Z'
updated_at: '2025-08-23T02:52:32.317Z'
last_reviewed: '2025-08-22T13:51:43.995Z'
links:
  - e5fd798b-e1de-416d-af5a-b8096464f25a
sources:
  - packages/shared/src/memory/types.ts:1-59
  - packages/shared/src/memory/memory-service.ts:25-75
  - packages/shared/src/memory/validation.ts
---

# Memory Data Types and Validation Schemas

**Purpose:** Define the core data structures and validation rules for the memory system, ensuring data integrity and consistency across all operations.

**Core Data Types:**

**Memory Interface:**
```typescript
interface Memory {
  id: string;           // UUID v4 for unique identification
  title: string;        // Human-readable title (1-200 chars)
  content: string;      // Markdown content with HTML sanitization
  tags: string[];       // Categorization tags
  category: string;     // Organizational category
  created_at: string;   // ISO 8601 timestamp
  updated_at: string;   // ISO 8601 timestamp
  last_reviewed: string; // ISO 8601 timestamp
  file_path: string;    // Filesystem path to memory file
  links: string[];      // Array of related memory IDs
  sources: string[];    // References and source materials
}
```

**Validation Schemas:**

**MemoryCreateRequestSchema:**
- **title**: Required string, minimum 1 character
- **content**: Required string, minimum 1 character (markdown)
- **tags**: Optional array of strings, defaults to empty array
- **category**: Optional string, defaults to "general"
- **sources**: Optional array of strings, defaults to empty array

**MemoryUpdateRequestSchema:**
- **id**: Required UUID for memory identification
- **title**: Optional string update
- **content**: Optional string update
- **tags**: Optional string update
- **category**: Optional string update
- **sources**: Optional string update

**MemorySearchRequestSchema:**
- **query**: Required search string, minimum 1 character
- **limit**: Optional positive integer, defaults to 10
- **category**: Optional category filter
- **tags**: Optional tag array filter

**LinkRequestSchema:**
- **source_id**: Required UUID of source memory
- **target_id**: Required UUID of target memory
- **link_text**: Optional custom link text

**Business Rules and Constraints:**

**Title Validation:**
- **Length**: 1-200 characters
- **Content**: No HTML tags allowed
- **Uniqueness**: Must be unique within the same category
- **Format**: Human-readable and descriptive

**Content Validation:**
- **Length**: Minimum 1 character
- **Format**: Markdown with HTML sanitization
- **Size**: Maximum 10MB to prevent memory issues
- **Encoding**: UTF-8 support for international characters

**Category and Tag Validation:**
- **Category**: Must be one of allowed categories (configurable)
- **Tags**: Array of strings, no duplicates within memory
- **Validation**: Against allowed tags list (configurable)
- **Defaults**: Category defaults to "general" if not specified

**Timestamp Management:**
- **created_at**: Set automatically on creation
- **updated_at**: Updated on every modification
- **last_reviewed**: Updated when memory is accessed
- **Format**: ISO 8601 for consistency and sorting

**Link and Source Management:**
- **Links**: Bidirectional relationship management
- **Sources**: Reference materials and attribution
- **Validation**: Ensure links reference valid memories
- **Circular Prevention**: Detect and prevent circular references

**Error Handling and Validation:**

**Validation Errors:**
- **Field-Specific**: Clear error messages for each field
- **Business Rules**: Validation against business logic
- **Type Safety**: Runtime type checking with Zod
- **User Feedback**: Actionable error messages

**Data Integrity:**
- **Atomic Operations**: Ensure consistency across operations
- **Rollback Capability**: Revert changes on failure
- **Constraint Checking**: Enforce business rules
- **Audit Trail**: Track all changes and modifications

**Related Documentation:**
- [[CLI Validation System: Security-First Input Validation and Configuration Management]] - Validation service
- [[FileService: Memory File System Operations and Content Management]] - Data persistence patterns