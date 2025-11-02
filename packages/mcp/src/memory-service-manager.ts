import { MemoryService, MemoryServiceConfig } from "@llm-mem/shared";
import { promises as fs } from "fs";
import { join } from "path";
import { listMemoryFiles } from "@llm-mem/shared";

/**
 * Manages singleton instances of MemoryService with automatic index synchronization.
 * 
 * This manager ensures:
 * - Only one MemoryService instance per configuration (notestorePath + indexPath)
 * - Automatic detection of index out-of-sync scenarios (e.g., after git pull)
 * - Automatic reindexing when memory files are newer than the database
 * - Proper cleanup and connection management
 */
class MemoryServiceManager {
  private instances: Map<string, MemoryService> = new Map();
  private dbFileMtimes: Map<string, number> = new Map();
  private indexCheckTimes: Map<string, number> = new Map();

  /**
   * Gets or creates a MemoryService instance for the given configuration.
   * Automatically checks and rebuilds the index if it's out of sync with memory files.
   * 
   * @param config - MemoryService configuration
   * @returns MemoryService instance
   */
  async getService(config: MemoryServiceConfig): Promise<MemoryService> {
    const key = this.getConfigKey(config);
    
    // Check if we need to rebuild the index
    const needsRebuild = await this.checkIndexSync(config);
    
    if (needsRebuild) {
      // Automatically rebuild the index when out of sync
      // This will create and cache the service instance
      console.error(`[MemoryServiceManager] Index out of sync detected. Starting automatic reindex...`);
      await this.ensureIndexSync(config);
      // ensureIndexSync already cached the instance and updated mtime, so we can return it
      return this.instances.get(key)!;
    }
    
    // Get or create instance
    if (!this.instances.has(key)) {
      const service = new MemoryService(config);
      await service.initialize();
      this.instances.set(key, service);
      
      // Track DB file modification time AFTER initialize (which may have created/updated the DB)
      // This prevents false positives on the next check
      await this.updateDbMtime(config);
    }
    
    return this.instances.get(key)!;
  }

  /**
   * Checks if the index is out of sync with memory files.
   * 
   * An index is considered out of sync if:
   * 1. The database file doesn't exist but memory files do
   * 2. The database file is older than the newest memory file
   * 3. The database file's modification time changed since last check (git pull scenario)
   * 
   * @param config - MemoryService configuration
   * @returns True if index needs to be rebuilt
   */
  private async checkIndexSync(config: MemoryServiceConfig): Promise<boolean> {
    const key = this.getConfigKey(config);
    // FlexSearch creates the database as "flexsearch-{name}.sqlite" when given name "memory-store"
    // So "memory-store" becomes "flexsearch-memorystore.sqlite"
    const dbPath = join(config.indexPath, "flexsearch-memorystore.sqlite");
    
    try {
      // Check if DB file exists and get its mtime
      let dbMtime: number | null = null;
      try {
        const stats = await fs.stat(dbPath);
        dbMtime = stats.mtimeMs;
      } catch (error) {
        // DB file doesn't exist
        dbMtime = null;
        // Log for debugging - but only if we're not on first initialization
        const hasInstance = this.instances.has(key);
        if (hasInstance) {
          console.error(`[MemoryServiceManager] 🔍 DB file not found at: ${dbPath} (resolved from indexPath: ${config.indexPath}, cwd: ${process.cwd()})`);
        }
      }
      
      // Get newest memory file mtime
      const memoryFiles = await listMemoryFiles(config.notestorePath);
      let newestMemoryMtime: number = 0;
      
      for (const filePath of memoryFiles) {
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtimeMs > newestMemoryMtime) {
            newestMemoryMtime = stats.mtimeMs;
          }
        } catch {
          // Skip files we can't stat
        }
      }
      
      // Get instance status once for use in multiple checks
      const hasInstance = this.instances.has(key);
      const lastKnownMtime = this.dbFileMtimes.get(key);
      
      // Case 1: DB doesn't exist but memory files do
      // Only trigger if we have an existing instance (meaning DB should exist but doesn't - external deletion)
      // On first initialization, it's normal for DB to not exist yet - let initialize() create it
      if (dbMtime === null && memoryFiles.length > 0 && hasInstance) {
        console.error(`[MemoryServiceManager] 🔍 Index sync check: DB file missing but ${memoryFiles.length} memory file(s) found (external deletion detected). Reindexing needed.`);
        return true;
      }
      
      // On first run, if DB doesn't exist but memory files do, that's expected
      // Initialize will create the DB, then we can check if files are newer
      // Don't trigger rebuild on first initialization
      
      // Case 2: DB exists but is older than newest memory file
      if (dbMtime !== null && newestMemoryMtime > dbMtime) {
        const dbAge = new Date(dbMtime);
        const fileAge = new Date(newestMemoryMtime);
        const ageDiff = Math.round((newestMemoryMtime - dbMtime) / 1000); // seconds
        console.error(`[MemoryServiceManager] 🔍 Index sync check: DB file (${dbAge.toISOString()}) is ${ageDiff}s older than newest memory file (${fileAge.toISOString()}). Reindexing needed.`);
        return true;
      }
      
      // Case 3: DB file mtime changed since last check (git pull scenario)
      // Only check this if we have a cached instance (not on first initialization)
      
      // Only trigger rebuild if:
      // 1. We have a tracked mtime (not first run)
      // 2. We have an existing instance (DB was already initialized)
      // 3. DB mtime changed (external modification, likely git pull)
      if (lastKnownMtime !== undefined && hasInstance && dbMtime !== null && dbMtime !== lastKnownMtime) {
        const oldTime = new Date(lastKnownMtime);
        const newTime = new Date(dbMtime);
        const timeDiff = Math.round((dbMtime - lastKnownMtime) / 1000); // seconds
        console.error(`[MemoryServiceManager] 🔍 Index sync check: DB file modification time changed (likely from git pull). Old: ${oldTime.toISOString()}, New: ${newTime.toISOString()} (${timeDiff > 0 ? '+' : ''}${timeDiff}s difference). Reindexing needed.`);
        return true;
      }
      
      // Track current DB mtime for future checks
      if (dbMtime !== null) {
        this.dbFileMtimes.set(key, dbMtime);
      }
      this.indexCheckTimes.set(key, Date.now());
      
      return false;
    } catch (error) {
      console.error(`[MemoryServiceManager] Error checking index sync: ${error}`);
      // On error, assume sync is needed to be safe
      return true;
    }
  }

  /**
   * Updates the tracked database file modification time.
   * 
   * @param config - MemoryService configuration
   */
  private async updateDbMtime(config: MemoryServiceConfig): Promise<void> {
    const key = this.getConfigKey(config);
    // FlexSearch creates the database as "flexsearch-{name}.sqlite" when given name "memory-store"
    const dbPath = join(config.indexPath, "flexsearch-memorystore.sqlite");
    
    try {
      const stats = await fs.stat(dbPath);
      this.dbFileMtimes.set(key, stats.mtimeMs);
    } catch {
      // DB file doesn't exist yet, that's okay
      this.dbFileMtimes.delete(key);
    }
  }

  /**
   * Refreshes the tracked database file modification time after an index-modifying operation.
   * This prevents false-positive rebuilds after operations like write_mem, edit_mem, etc.
   * 
   * Should be called after any operation that modifies the index (create, update, delete).
   * 
   * @param config - MemoryService configuration
   */
  async refreshDbMtime(config: MemoryServiceConfig): Promise<void> {
    await this.updateDbMtime(config);
  }

  /**
   * Gets a unique key for the configuration.
   * 
   * @param config - MemoryService configuration
   * @returns Unique key string
   */
  private getConfigKey(config: MemoryServiceConfig): string {
    return `${config.notestorePath}::${config.indexPath}`;
  }

  /**
   * Ensures the index is rebuilt from memory files.
   * This is called automatically when sync is detected, but can be called manually.
   * 
   * @param config - MemoryService configuration
   */
  async ensureIndexSync(config: MemoryServiceConfig): Promise<void> {
    const key = this.getConfigKey(config);
    
    // Count memory files before reindexing
    const memoryFiles = await listMemoryFiles(config.notestorePath);
    const memoryCount = memoryFiles.length;
    
    console.error(`[MemoryServiceManager] Reindexing ${memoryCount} memory file(s) from ${config.notestorePath}...`);
    
    // Destroy existing instance
    const existing = this.instances.get(key);
    if (existing) {
      try {
        await existing.destroy();
      } catch (error) {
        console.error(`[MemoryServiceManager] Warning: Failed to destroy existing MemoryService during reindex: ${error}`);
      }
    }
    
    // Remove from cache
    this.instances.delete(key);
    this.dbFileMtimes.delete(key);
    this.indexCheckTimes.delete(key);
    
    // Create new instance which will initialize fresh index
    const service = new MemoryService(config);
    await service.initialize();
    
    // Reindex all memories
    try {
      const { reindexMems } = await import("@llm-mem/shared");
      const startTime = Date.now();
      await reindexMems(service);
      const duration = Date.now() - startTime;
      console.error(`[MemoryServiceManager] ✅ Successfully reindexed ${memoryCount} memory file(s) in ${duration}ms`);
    } catch (error) {
      console.error(`[MemoryServiceManager] ❌ Failed to reindex memories: ${error}`);
      throw error;
    }
    
    // Cache the new instance
    this.instances.set(key, service);
    
    // Track DB file modification time AFTER reindexing (which updated the DB)
    // This prevents false positives on the next check
    await this.updateDbMtime(config);
  }

  /**
   * Destroys all cached MemoryService instances and cleans up resources.
   * Should be called on server shutdown.
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.instances.values()).map(service =>
      service.destroy().catch(error => {
        console.error(`Failed to destroy MemoryService: ${error}`);
      })
    );
    
    await Promise.all(destroyPromises);
    this.instances.clear();
    this.dbFileMtimes.clear();
    this.indexCheckTimes.clear();
  }

  /**
   * Gets the number of active instances.
   * 
   * @returns Number of cached instances
   */
  getInstanceCount(): number {
    return this.instances.size;
  }
}

// Export singleton instance
export const memoryServiceManager = new MemoryServiceManager();

