import { migrateMemoryFileNames } from '../shared/dist/utils/file-system.js';

async function testMigration() {
  try {
    console.log('Testing migration in dry-run mode...');
    
    // First, let's check what files would be migrated
    const { promises: fs } = await import('fs');
    const { join } = await import('path');
    
    const notestorePath = '../../memories';
    const files = await fs.readdir(notestorePath);
    const oldFormatFiles = files.filter(file => 
      file.endsWith('.md') && 
      file !== 'usage.md' && 
      file.includes('|')
    );
    
    console.log(`Found ${oldFormatFiles.length} files that need migration:`);
    oldFormatFiles.forEach(file => console.log(`  - ${file}`));
    
    if (oldFormatFiles.length === 0) {
      console.log('No files need migration. All memory files are already in the new format.');
      return;
    }
    
    console.log('\nPerforming actual migration...');
    await migrateMemoryFileNames(notestorePath);
    
    console.log('\nMigration completed! Checking results...');
    const newFiles = await fs.readdir(notestorePath);
    const newFormatFiles = newFiles.filter(file => 
      file.endsWith('.md') && 
      file !== 'usage.md' && 
      file.includes('(') && 
      file.includes(')')
    );
    
    console.log(`\nNew format files: ${newFormatFiles.length}`);
    newFormatFiles.forEach(file => console.log(`  - ${file}`));
    
  } catch (error) {
    console.error('Migration test failed:', error);
  }
}

testMigration();
