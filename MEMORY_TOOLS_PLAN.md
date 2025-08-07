# 🧠 Memory Management Tool Suite - Design Plan

## 📋 Overview

A comprehensive memory management system for LLMs using FlexSearch for full-text search and SQLite for persistent storage. The system allows AI assistants to store, retrieve, edit, and search through memories in a structured way.

## 🎯 Core Tools

### 1. **`write_mem`** - Create New Memory
Creates a new memory as both a markdown file and indexed document.

**Parameters:**
- `title` (string, required): Title of the memory
- `content` (string, required): Content in markdown format
- `tags` (string[], optional): Tags for categorization
- `category` (string, optional): Category for organization

**Returns:**
- Memory ID
- File path
- Creation timestamp

**Example:**
```json
{
  "title": "Meeting with John about Q4 goals",
  "content": "# Q4 Goals Discussion\n\n**Date:** 2024-01-15\n\n**Key Points:**\n- Revenue target: $2M\n- New product launch in March\n- Team expansion planned",
  "tags": ["meeting", "goals", "q4"],
  "category": "work"
}
```

### 2. **`read_mem`** - Retrieve Memory
Retrieves a memory by ID or title with optional formatting.

**Parameters:**
- `identifier` (string, required): Memory ID or title
- `format` (enum, optional): Output format ("markdown", "plain", "json")

**Returns:**
- Memory content in requested format
- Metadata (creation date, tags, category)

**Example:**
```json
{
  "identifier": "meeting-with-john-q4-goals",
  "format": "markdown"
}
```

### 3. **`edit_mem`** - Update Existing Memory
Modifies an existing memory's content, title, tags, or category.

**Parameters:**
- `id` (string, required): Memory ID to edit
- `title` (string, optional): New title
- `content` (string, optional): New content
- `tags` (string[], optional): New tags
- `category` (string, optional): New category

**Returns:**
- Updated memory ID
- Modification timestamp
- Success confirmation

**Example:**
```json
{
  "id": "meeting-with-john-q4-goals",
  "content": "# Q4 Goals Discussion\n\n**Date:** 2024-01-15\n\n**Key Points:**\n- Revenue target: $2M\n- New product launch in March\n- Team expansion planned\n\n**Updated:** Added budget allocation details",
  "tags": ["meeting", "goals", "q4", "budget"]
}
```

### 4. **`search_mem`** - Search Memories
Searches through memories using FlexSearch with various filters.

**Parameters:**
- `query` (string, required): Search terms
- `limit` (number, optional): Maximum results (default: 10)
- `category` (string, optional): Filter by category
- `tags` (array, optional): Filter by tags

**Returns:**
- List of matching memories with IDs and titles
- Relevance scores
- Snippet previews

**Example:**
```json
{
  "query": "Q4 goals revenue",
  "limit": 5,
  "category": "work",
  "tags": ["goals"]
}
```

### 5. **`link_mem`** - Link Two Memories
Creates bidirectional links between two memories using Obsidian-style markdown links.

**Parameters:**
- `source_id` (string, required): ID of the source memory
- `target_id` (string, required): ID of the target memory to link to
- `link_text` (string, optional): Custom link text (defaults to target title)

**Returns:**
- Success confirmation
- Updated link lists for both memories
- Markdown link syntax for reference

**Note:** Links are always bidirectional to prevent broken links when memories are deleted.

**Example:**
```json
{
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "link_text": "Related project ideas"
}
```

### 6. **`unlink_mem`** - Remove Memory Links
Removes links between two memories.

**Parameters:**
- `source_id` (string, required): ID of the source memory
- `target_id` (string, required): ID of the target memory to unlink

**Returns:**
- Success confirmation
- Updated link lists for both memories

**Example:**
```json
{
  "source_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

### 7. **`get_current_date`** - Get Current Date
Returns the current date and time for LLMs that need temporal context.

**Parameters:**
- `format` (enum, optional): Output format ("iso", "locale", "timestamp", "date_only")

**Returns:**
- Current date and time in requested format
- Timezone information

**Example:**
```json
{
  "format": "iso"
}
```

## 🗄️ Data Structure

### Memory Interface
```typescript
interface Memory {
  id: string;           // UUID v4
  title: string;        // Memory title
  content: string;      // Markdown content
  tags: string[];       // Tags for categorization
  category: string;     // Category for organization
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
  last_reviewed: string; // ISO timestamp for review tracking
  file_path: string;    // Path to markdown file
  links: string[];      // Array of linked memory IDs
}
```

### FlexSearch Index Structure
FlexSearch will handle the database storage and indexing. The index will contain:
- Memory ID
- Title (searchable)
- Content (searchable)
- Tags (searchable)
- Category (searchable)
- Creation date
- Last reviewed date
- Links (for relationship tracking)

## 📁 File Organization

### Directory Structure
```
notestore_path/
├── work-meeting-with-john-q4-goals-550e8400-e29b-41d4-a716-446655440000.md
├── personal-project-ideas-brainstorm-6ba7b810-9dad-11d1-80b4-00c04fd430c8.md
├── work-team-retrospective-notes-6ba7b811-9dad-11d1-80b4-00c04fd430c8.md
└── personal-new-year-planning-6ba7b812-9dad-11d1-80b4-00c04fd430c8.md
```

*Note: Titles are slugified for file system compatibility (e.g., "Meeting with John about Q4 goals" becomes "meeting-with-john-q4-goals")*

### Markdown File Format
```markdown
---
id: 550e8400-e29b-41d4-a716-446655440000
title: Meeting with John about Q4 goals
tags: ["meeting", "goals", "q4"]
category: work
created_at: 2024-01-15T10:30:00Z
updated_at: 2024-01-15T10:30:00Z
last_reviewed: 2024-01-15T10:30:00Z
links: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8", "6ba7b811-9dad-11d1-80b4-00c04fd430c8"]
---

# Q4 Goals Discussion

**Date:** 2024-01-15

**Key Points:**
- Revenue target: $2M
- New product launch in March
- Team expansion planned

**Action Items:**
- [ ] Draft budget proposal
- [ ] Schedule follow-up meeting
- [ ] Update project timeline

**Related Memories:**
- [[work-project-ideas-brainstorm-6ba7b810-9dad-11d1-80b4-00c04fd430c8]]
- [[work-team-retrospective-notes-6ba7b811-9dad-11d1-80b4-00c04fd430c8]]
```

## 🔧 Technical Implementation

### Dependencies to Add
```json
{
  "uuid": "^10.0.0",
  "@types/uuid": "^10.0.0",
  "js-yaml": "^4.1.0",
  "@types/js-yaml": "^4.0.9"
}
```

### Command Line Arguments
```bash
# Default paths
--notestore_path=./memories
--index_path=./memories/index

# Custom paths
--notestore_path=/Users/username/Documents/memories
--index_path=/Users/username/Documents/memories/index
```

### Core Services

#### 1. **MemoryService**
- CRUD operations for memories
- File system management
- FlexSearch indexing
- Link management

#### 2. **SearchService**
- FlexSearch integration
- Full-text search
- Filtering and ranking
- Result formatting

#### 3. **FileService**
- Markdown file operations with YAML frontmatter
- Directory management
- File path generation
- Backup operations

#### 4. **LinkService**
- Bidirectional link management
- Obsidian-style markdown link generation
- Link validation and cleanup
- Relationship tracking

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure
1. Add UUID and YAML dependencies
2. Set up FlexSearch indexing
3. Implement basic file operations with YAML frontmatter
4. Add command-line argument parsing

### Phase 2: Basic CRUD Operations
1. Implement `write_mem` tool
2. Implement `read_mem` tool
3. Implement `get_current_date` tool
4. Add basic error handling
5. Create initial tests

### Phase 3: Advanced Features
1. Implement `edit_mem` tool
2. Implement `search_mem` tool
3. Implement `link_mem` and `unlink_mem` tools
4. Integrate FlexSearch for search
5. Add comprehensive error handling

### Phase 4: Polish & Testing
1. Add comprehensive tests
2. Optimize performance
3. Add documentation
4. Create usage examples

## 🧪 Testing Strategy

### Unit Tests
- Memory CRUD operations
- File system operations
- Search functionality
- Error handling

### Integration Tests
- End-to-end tool workflows
- Database operations
- File system integration
- Search performance

### Example Test Cases
```typescript
// Test write_mem
it('should create new memory with markdown file and FlexSearch index')

// Test read_mem
it('should retrieve memory by ID and title')

// Test edit_mem
it('should update existing memory content and metadata')

// Test search_mem
it('should find memories by search terms and filters')

// Test link_mem
it('should create bidirectional links between memories')

// Test unlink_mem
it('should remove links between memories')

// Test get_current_date
it('should return current date in requested format')
```

## 🔒 Security Considerations

### Input Validation
- Sanitize markdown content
- Validate file paths
- Check for path traversal attacks
- Limit file sizes
- Provide useful error messages to stderr and tool responses
- Ensure graceful failure handling

### Data Integrity
- Atomic database operations
- File system consistency
- Backup strategies
- Error recovery

### Access Control
- File permissions
- Database access
- Input sanitization
- Output encoding

## 📊 Performance Considerations

### Search Optimization
- FlexSearch indexing
- Database query optimization
- Result caching
- Pagination support

### File System
- Efficient directory structure
- File size management
- Backup strategies
- Cleanup operations

### Memory Management
- Connection pooling
- Resource cleanup
- Memory leaks prevention
- Garbage collection

## 🎯 Future Enhancements

### Potential Additions
1. **Memory Categories**: Hierarchical organization
2. **Memory Relationships**: Link related memories
3. **Memory Templates**: Predefined formats
4. **Memory Export**: Multiple formats (JSON, CSV, PDF)
5. **Memory Analytics**: Usage statistics
6. **Memory Sharing**: Collaborative features
7. **Memory Versioning**: Track changes over time
8. **Memory Encryption**: Secure sensitive data

### Advanced Features
1. **Natural Language Processing**: Better search understanding
2. **Memory Summarization**: Auto-generate summaries
3. **Memory Suggestions**: Related memory recommendations
4. **Memory Scheduling**: Time-based reminders
5. **Memory Integration**: Connect with external systems

## 📝 Usage Examples

### Basic Memory Creation
```bash
# Create a new memory
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "write_mem",
      "arguments": {
        "title": "Project Ideas",
        "content": "# My Project Ideas\n\n1. AI-powered note-taking\n2. Memory management system\n3. Knowledge graph builder",
        "tags": ["ideas", "projects"],
        "category": "personal"
      }
    }
  }'
```

### Link Memories
```bash
# Link two memories together
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "link_mem",
      "arguments": {
        "source_id": "550e8400-e29b-41d4-a716-446655440000",
        "target_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "link_text": "Related project ideas"
      }
    }
  }'
```

### Search Memories
```bash
# Search for project-related memories
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_mem",
      "arguments": {
        "query": "project ideas",
        "limit": 5,
        "category": "personal"
      }
    }
  }'
```

### Get Current Date
```bash
# Get current date for LLM context
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_current_date",
      "arguments": {
        "format": "iso"
      }
    }
  }'
```

## 🤔 Discussion Points

1. **File Naming**: ✅ Use slugified titles in filenames for better file system compatibility
2. **Link Management**: ✅ Bidirectional linking ensures no broken links when memories are deleted - we only need to update the linked memories' link arrays
3. **Review Tracking**: ❌ No automatic review scheduling needed
4. **Content Validation**: What markdown features should we support? (Need more context to answer)
5. **Performance**: ⏳ Performance tuning can be addressed later if necessary
6. **Backup Strategy**: 🔄 Will be handled outside of this project
7. **Error Handling**: ✅ Provide useful error messages to stderr and in tool responses, ensure graceful failure handling
8. **FlexSearch Persistence**: ✅ FlexSearch handles persistence using SQLite as documented

---

*This plan provides a solid foundation for building a comprehensive memory management system for LLMs. The modular design allows for easy extension and modification as requirements evolve.* 