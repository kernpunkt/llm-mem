import { Memory } from "../memory/types.js";
import { serializeFrontmatter } from "../utils/yaml.js";
import type { GetMemStatsResult } from "./types.js";

/**
 * Formatting utilities for memory tool operations
 * 
 * Provides functions to format memory data for different output contexts.
 */

/**
 * Formats a memory for display based on the specified format type
 */
export function formatMemory(memory: Memory, format: "markdown" | "plain" | "json"): string {
  if (format === "plain") {
    return memory.content;
  }

  if (format === "json") {
    return JSON.stringify(memory, null, 2);
  }

  // markdown format (default)
  const frontmatter = {
    id: memory.id,
    title: memory.title,
    tags: memory.tags,
    category: memory.category,
    created_at: memory.created_at,
    updated_at: memory.updated_at,
    last_reviewed: memory.last_reviewed,
    links: memory.links,
    sources: memory.sources,
  };
  return serializeFrontmatter(frontmatter as any, memory.content);
}

/**
 * Formats search results for display
 */
export function formatSearchResults(result: {
  total: number;
  results: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    score: number;
    snippet: string;
  }>;
}): string {
  if (result.total === 0) {
    return "No memories found matching your search criteria.";
  }

  const formattedResults = result.results.map((item, index) => {
    const tagsStr = item.tags.length > 0 ? ` [${item.tags.join(", ")}]` : "";
    const categoryStr = item.category !== "general" ? ` (${item.category})` : "";
    return `${index + 1}. **${item.title}**${categoryStr}${tagsStr}\n   Score: ${item.score.toFixed(2)}\n   ${item.snippet}\n   ID: ${item.id}\n`;
  }).join("\n");

  return `Found ${result.total} memory(ies):\n\n${formattedResults}`;
}

/**
 * Formats memories list for display
 */
export function formatMemoriesList(result: {
  total: number;
  memories: Memory[];
}): string {
  if (result.total === 0) {
    return "No memories found matching your filter criteria.";
  }

  const formattedResults = result.memories.map((memory, index) => {
    const tagsStr = memory.tags.length > 0 ? ` [${memory.tags.join(", ")}]` : "";
    const categoryStr = memory.category !== "general" ? ` (${memory.category})` : "";
    const sourcesStr = memory.sources.length > 0 ? `\n   Sources: ${memory.sources.join(", ")}` : "";
    const linksStr = memory.links.length > 0 ? `\n   Links: ${memory.links.length} linked memories` : "";
    return `${index + 1}. **${memory.title}**${categoryStr}${tagsStr}${sourcesStr}${linksStr}\n   Created: ${memory.created_at}\n   Updated: ${memory.updated_at}\n   Last reviewed: ${memory.last_reviewed}\n   ID: ${memory.id}\n`;
  }).join("\n");

  return `Found ${result.total} memory(ies):\n\n${formattedResults}`;
}

/**
 * Formats needs review results for display
 */
export function formatNeedsReview(result: {
  total: number;
  memories: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    last_reviewed: string;
    created_at: string;
  }>;
}): string {
  if (result.total === 0) {
    return "No memories need review before the specified date.";
  }

  const formattedResults = result.memories.map((memory, index) => {
    const tagsStr = memory.tags.length > 0 ? ` [${memory.tags.join(", ")}]` : "";
    const categoryStr = memory.category !== "general" ? ` (${memory.category})` : "";
    return `${index + 1}. **${memory.title}**${categoryStr}${tagsStr}\n   Last reviewed: ${memory.last_reviewed}\n   Created: ${memory.created_at}\n   ID: ${memory.id}\n`;
  }).join("\n");

  return `Found ${result.total} memory(ies) needing review:\n\n${formattedResults}`;
}

/**
 * Formats memory statistics for display
 */
export function formatMemoryStats(stats: Omit<GetMemStatsResult, 'formatted' | 'isError'>): string {
  return `Memory Store Statistics:

📊 **Overview**
- Total Memories: ${stats.total_memories}
- Average Time Since Last Verification: ${stats.average_time_since_verification}
- Average Links per Memory: ${stats.average_links_per_memory}
- Average Tags per Memory: ${stats.average_tags_per_memory}
- Average Memory Length: ${stats.average_memory_length_words} words

🔗 **Link Analysis**
- Orphaned Memories (no links): ${stats.orphaned_memories.length}
- Memories with Few Links: ${stats.memories_with_few_links.length}
- Broken Links: ${stats.broken_links.length}
- Unidirectional Links: ${stats.unidirectional_links.length}
- Link Mismatches (YAML vs Markdown): ${stats.link_mismatches.length}
- Invalid Links: ${stats.invalid_links.length}

${stats.orphaned_memories.length > 0 ? `\n📋 **Orphaned Memories (No Links):**
${stats.orphaned_memories.map(m => `  - ${m.title} (ID: ${m.id})`).join('\n')}` : ''}

${stats.memories_with_few_links.length > 0 ? `\n📋 **Memories with Few Links (< ${stats.average_links_per_memory}):**
${stats.memories_with_few_links.map(m => `  - ${m.title} (${m.link_count} links)`).join('\n')}` : ''}

${stats.broken_links.length > 0 ? `\n📋 **Broken Links:**
${stats.broken_links.map(m => `  - ${m.title} → broken link ID: ${m.broken_link_id}`).join('\n')}` : ''}

${stats.unidirectional_links.length > 0 ? `\n📋 **Unidirectional Links:**
${stats.unidirectional_links.map(m => `  - ${m.title} → unidirectional link to: ${m.unidirectional_link_id}`).join('\n')}` : ''}

${stats.link_mismatches.length > 0 ? `\n📋 **Link Mismatches (YAML vs Markdown):**
${stats.link_mismatches.map(m => `  - ${m.title}:
    YAML links: ${m.yaml_link_count}, Markdown links: ${m.markdown_link_count}
    Missing in markdown: ${m.missing_in_markdown.length > 0 ? m.missing_in_markdown.join(', ') : 'none'}
    Missing in YAML: ${m.missing_in_yaml.length > 0 ? m.missing_in_yaml.join(', ') : 'none'}`).join('\n')}` : ''}

${stats.invalid_links.length > 0 ? `\n📋 **Invalid Links:**
${stats.invalid_links.map(m => `  - ${m.title}:
${m.invalid_links.map(il => `    • ${il.link} (${il.type}): ${il.details}`).join('\n')}`).join('\n')}` : ''}

📁 **Category Distribution**
${Object.entries(stats.categories).map(([cat, count]) => `  - ${cat}: ${count}`).join('\n')}

🏷️ **Tag Usage**
${Object.entries(stats.tags).map(([tag, count]) => `  - ${tag}: ${count} uses`).join('\n')}

📝 **Content Analysis**
- Shortest Memories (10%): ${stats.shortest_memories.length}
- Longest Memories (10%): ${stats.longest_memories.length}
${stats.memories_with_few_tags.length > 0 ? `\n📋 **Memories with Few Tags (< ${stats.average_tags_per_memory}):**
${stats.memories_with_few_tags.map(m => `  - ${m.title} (${m.tag_count} tags)`).join('\n')}` : ''}

⚠️ **Memories Needing Attention**
- Without Sources: ${stats.memories_without_sources.length}
- Needing Verification: ${stats.memories_needing_verification.length}

${stats.memories_without_sources.length > 0 ? `\n📋 **Memories Without Sources:**
${stats.memories_without_sources.map(m => `  - ${m.title} (ID: ${m.id})`).join('\n')}` : ''}

${stats.memories_needing_verification.length > 0 ? `\n📋 **Memories Needing Verification:**
${stats.memories_needing_verification.map(m => `  - ${m.title} (${m.days_since_verification} days since last review)`).join('\n')}` : ''}

💡 **Recommendations**
${stats.recommendations.join('\n')}`;
}

