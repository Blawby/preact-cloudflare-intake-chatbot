#!/usr/bin/env node

/**
 * Backup Script for Teams to Organizations Migration
 * 
 * Creates a comprehensive backup before running the migration script.
 * Includes source files, git state, and checksum verification.
 * 
 * Usage: node scripts/backup-before-migration.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Directories to backup
  backupDirs: ['worker', 'src', 'tests', 'migrations', 'scripts'],
  
  // Files to backup
  backupFiles: [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.js',
    'wrangler.toml',
    'eslint.config.js',
    'vitest.config.ts',
    'playwright.config.ts'
  ],
  
  // Directories to skip
  skipDirs: ['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'backups'],
  
  // File extensions to include
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.sql', '.json', '.toml', '.md', '.sh']
};

/**
 * Generate timestamp for backup directory
 */
function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Calculate file checksum
 */
function calculateChecksum(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * Copy file with checksum calculation
 */
function copyFileWithChecksum(srcPath, destPath) {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(srcPath, destPath);
    
    // Calculate checksums
    const originalChecksum = calculateChecksum(srcPath);
    const backupChecksum = calculateChecksum(destPath);
    
    return {
      success: true,
      originalChecksum,
      backupChecksum,
      verified: originalChecksum === backupChecksum
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Recursively copy directory
 */
function copyDirectory(srcDir, destDir, manifest) {
  try {
    const items = fs.readdirSync(srcDir);
    
    items.forEach(item => {
      const srcPath = path.join(srcDir, item);
      const destPath = path.join(destDir, item);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        if (!CONFIG.skipDirs.includes(item)) {
          copyDirectory(srcPath, destPath, manifest);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (CONFIG.includeExtensions.includes(ext)) {
          const relativePath = path.relative(process.cwd(), srcPath);
          const result = copyFileWithChecksum(srcPath, destPath);
          
          manifest.files[relativePath] = {
            size: stat.size,
            modified: stat.mtime.toISOString(),
            checksum: result.originalChecksum,
            backupChecksum: result.backupChecksum,
            verified: result.verified,
            success: result.success,
            error: result.error || null
          };
          
          if (result.success) {
            manifest.summary.filesBackedUp++;
            if (result.verified) {
              manifest.summary.filesVerified++;
            } else {
              manifest.summary.verificationErrors++;
            }
          } else {
            manifest.summary.backupErrors++;
            manifest.errors.push({
              file: relativePath,
              error: result.error
            });
          }
        }
      }
    });
  } catch (error) {
    manifest.errors.push({
      directory: srcDir,
      error: error.message
    });
    manifest.summary.backupErrors++;
  }
}

/**
 * Create git stash
 */
function createGitStash() {
  try {
    // Check if git repository
    execSync('git status', { stdio: 'pipe' });
    
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      const timestamp = generateTimestamp();
      const stashMessage = `teams-to-organizations-migration-backup-${timestamp}`;
      
      execSync(`git stash push -m "${stashMessage}"`, { stdio: 'pipe' });
      
      return {
        success: true,
        stashMessage,
        hadChanges: true
      };
    } else {
      return {
        success: true,
        stashMessage: null,
        hadChanges: false
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate restore instructions
 */
function generateRestoreInstructions(backupPath, gitStash) {
  const instructions = `# Teams to Organizations Migration - Restore Instructions

Generated: ${new Date().toISOString()}
Backup Path: ${backupPath}

## To Restore from Backup:

### Option 1: Full Restore (Recommended)
\`\`\`bash
# Stop any running processes
# Remove current files
rm -rf worker src tests migrations scripts
rm -f package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.js wrangler.toml eslint.config.js vitest.config.ts playwright.config.ts

# Restore from backup
cp -r ${backupPath}/* .

# Verify checksums
node scripts/verify-backup.js ${backupPath}
\`\`\`

### Option 2: Git Restore (if git stash was created)
\`\`\`bash
# Restore git state
git stash pop

# Or list stashes to find the right one
git stash list
git stash apply stash@{N}
\`\`\`

### Option 3: Selective Restore
\`\`\`bash
# Restore specific files
cp ${backupPath}/worker/routes/teams.ts worker/routes/teams.ts
cp ${backupPath}/worker/services/TeamService.ts worker/services/TeamService.ts
# ... add more files as needed
\`\`\`

## Verification Commands:
\`\`\`bash
# Check git status
git status

# Run tests
npm test

# Check TypeScript compilation
npm run build
\`\`\`

## Backup Details:
- Backup created: ${new Date().toISOString()}
- Git stash: ${gitStash.success ? (gitStash.stashMessage || 'No changes to stash') : 'Failed'}
- Files backed up: See manifest.json for details
`;

  return instructions;
}

/**
 * Main backup function
 */
function main() {
  console.log('💾 Starting Teams to Organizations Migration Backup...\n');
  
  const timestamp = generateTimestamp();
  const backupDir = path.join(process.cwd(), 'backups', `migration-${timestamp}`);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Initialize manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    backupPath: backupDir,
    summary: {
      filesBackedUp: 0,
      filesVerified: 0,
      backupErrors: 0,
      verificationErrors: 0
    },
    files: {},
    errors: [],
    gitStash: null
  };
  
  console.log(`📁 Creating backup in: ${backupDir}\n`);
  
  // Create git stash
  console.log('🔀 Creating git stash...');
  const gitStash = createGitStash();
  manifest.gitStash = gitStash;
  
  if (gitStash.success) {
    if (gitStash.hadChanges) {
      console.log(`✅ Git stash created: ${gitStash.stashMessage}`);
    } else {
      console.log('ℹ️  No uncommitted changes to stash');
    }
  } else {
    console.log(`⚠️  Git stash failed: ${gitStash.error}`);
  }
  
  // Backup directories
  console.log('\n📂 Backing up directories...');
  CONFIG.backupDirs.forEach(dir => {
    const srcPath = path.join(process.cwd(), dir);
    const destPath = path.join(backupDir, dir);
    
    if (fs.existsSync(srcPath)) {
      console.log(`   📁 ${dir}/`);
      copyDirectory(srcPath, destPath, manifest);
    } else {
      console.log(`   ⚠️  Directory not found: ${dir}`);
    }
  });
  
  // Backup individual files
  console.log('\n📄 Backing up configuration files...');
  CONFIG.backupFiles.forEach(file => {
    const srcPath = path.join(process.cwd(), file);
    const destPath = path.join(backupDir, file);
    
    if (fs.existsSync(srcPath)) {
      console.log(`   📄 ${file}`);
      const relativePath = file;
      const result = copyFileWithChecksum(srcPath, destPath);
      
      manifest.files[relativePath] = {
        size: fs.statSync(srcPath).size,
        modified: fs.statSync(srcPath).mtime.toISOString(),
        checksum: result.originalChecksum,
        backupChecksum: result.backupChecksum,
        verified: result.verified,
        success: result.success,
        error: result.error || null
      };
      
      if (result.success) {
        manifest.summary.filesBackedUp++;
        if (result.verified) {
          manifest.summary.filesVerified++;
        } else {
          manifest.summary.verificationErrors++;
        }
      } else {
        manifest.summary.backupErrors++;
        manifest.errors.push({
          file: relativePath,
          error: result.error
        });
      }
    } else {
      console.log(`   ⚠️  File not found: ${file}`);
    }
  });
  
  // Save manifest
  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  // Generate restore instructions
  const restoreInstructions = generateRestoreInstructions(backupDir, gitStash);
  const instructionsPath = path.join(backupDir, 'RESTORE_INSTRUCTIONS.md');
  fs.writeFileSync(instructionsPath, restoreInstructions);
  
  // Print summary
  console.log('\n📊 BACKUP SUMMARY:');
  console.log(`   Backup location: ${backupDir}`);
  console.log(`   Files backed up: ${manifest.summary.filesBackedUp}`);
  console.log(`   Files verified: ${manifest.summary.filesVerified}`);
  console.log(`   Backup errors: ${manifest.summary.backupErrors}`);
  console.log(`   Verification errors: ${manifest.summary.verificationErrors}`);
  
  if (manifest.summary.backupErrors > 0) {
    console.log('\n⚠️  WARNING: Some files failed to backup!');
    console.log('   Check the manifest.json for details.');
  }
  
  if (manifest.summary.verificationErrors > 0) {
    console.log('\n⚠️  WARNING: Some files failed checksum verification!');
    console.log('   The backup may be corrupted.');
  }
  
  console.log('\n✅ Backup complete!');
  console.log(`   Manifest: ${manifestPath}`);
  console.log(`   Instructions: ${instructionsPath}`);
  
  if (manifest.summary.backupErrors === 0 && manifest.summary.verificationErrors === 0) {
    console.log('\n🎉 Backup verified successfully! Safe to proceed with migration.');
  } else {
    console.log('\n⚠️  Backup has issues. Review before proceeding with migration.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, CONFIG };
