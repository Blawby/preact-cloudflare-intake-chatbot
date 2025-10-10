#!/usr/bin/env node

/**
 * Teams to Organizations Migration Script
 * 
 * Safely migrates all team references to organization references based on audit results.
 * Features dry-run mode, validation, and comprehensive change tracking.
 * 
 * Usage: 
 *   node scripts/migrate-to-organizations.js [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run    Show changes without writing (default)
 *   --force      Execute actual changes (requires confirmation)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Files already updated (skip in migration)
  alreadyUpdated: [
    'worker/types.ts',
    'worker/services/OrganizationService.ts',
    'worker/middleware/auth.ts',
    'worker/auth/index.ts',
    'worker/auth/hooks.ts',
    'migrations/migrate_teams_to_organizations.sql'
  ],
  
  // Replacement patterns (ordered by complexity)
  replacements: [
    // Simple variable/parameter names
    { pattern: /\bteamId\b/g, replacement: 'organizationId', category: 'simple' },
    { pattern: /\bteam_id\b/g, replacement: 'organization_id', category: 'simple' },
    { pattern: /\bteamIds\b/g, replacement: 'organizationIds', category: 'simple' },
    { pattern: /\bteam_ids\b/g, replacement: 'organization_ids', category: 'simple' },
    
    // Complex variable names
    { pattern: /\beffectiveTeamId\b/g, replacement: 'effectiveOrganizationId', category: 'complex' },
    { pattern: /\bresolvedTeamId\b/g, replacement: 'resolvedOrganizationId', category: 'complex' },
    { pattern: /\bpriorSession\.teamId\b/g, replacement: 'priorSession.organizationId', category: 'complex' },
    { pattern: /\bsession\.teamId\b/g, replacement: 'session.organizationId', category: 'complex' },
    { pattern: /\buser\.teamId\b/g, replacement: 'user.organizationId', category: 'complex' },
    { pattern: /\brequest\.teamId\b/g, replacement: 'request.organizationId', category: 'complex' },
    { pattern: /\bparams\.teamId\b/g, replacement: 'params.organizationId', category: 'complex' },
    
    // Type/Interface names
    { pattern: /\bTeamService\b/g, replacement: 'OrganizationService', category: 'types' },
    { pattern: /\bTeamConfig\b/g, replacement: 'OrganizationConfig', category: 'types' },
    { pattern: /\bTeamVoiceConfig\b/g, replacement: 'OrganizationVoiceConfig', category: 'types' },
    { pattern: /\bTeam\b/g, replacement: 'Organization', category: 'types' },
    
    // Function calls
    { pattern: /\bgetTeam\s*\(/g, replacement: 'getOrganization(', category: 'functions' },
    { pattern: /\blistTeams\s*\(/g, replacement: 'listOrganizations(', category: 'functions' },
    { pattern: /\bcreateTeam\s*\(/g, replacement: 'createOrganization(', category: 'functions' },
    { pattern: /\bupdateTeam\s*\(/g, replacement: 'updateOrganization(', category: 'functions' },
    { pattern: /\bdeleteTeam\s*\(/g, replacement: 'deleteOrganization(', category: 'functions' },
    { pattern: /\bgetTeamConfig\s*\(/g, replacement: 'getOrganizationConfig(', category: 'functions' },
    { pattern: /\bvalidateTeamAccess\s*\(/g, replacement: 'validateOrganizationAccess(', category: 'functions' },
    { pattern: /\bcheckTeamAccess\s*\(/g, replacement: 'checkOrganizationAccess(', category: 'functions' },
    
    // Import statements
    { pattern: /from ['"]\.\.\/services\/TeamService['"]/g, replacement: "from '../services/OrganizationService'", category: 'imports' },
    { pattern: /import.*TeamService/g, replacement: (match) => match.replace('TeamService', 'OrganizationService'), category: 'imports' },
    { pattern: /require\(['"]\.\.\/services\/TeamService['"]\)/g, replacement: "require('../services/OrganizationService')", category: 'imports' },
    
    // Database/SQL references
    { pattern: /team_id/g, replacement: 'organization_id', category: 'database' },
    { pattern: /teams\./g, replacement: 'organizations.', category: 'database' },
    { pattern: /FROM teams/g, replacement: 'FROM organizations', category: 'database' },
    { pattern: /JOIN teams/g, replacement: 'JOIN organizations', category: 'database' },
    { pattern: /INSERT INTO teams/g, replacement: 'INSERT INTO organizations', category: 'database' },
    { pattern: /UPDATE teams/g, replacement: 'UPDATE organizations', category: 'database' },
    { pattern: /DELETE FROM teams/g, replacement: 'DELETE FROM organizations', category: 'database' }
  ],
  
  // File extensions to process
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.sql', '.json'],
  
  // Directories to skip
  skipDirs: ['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'backups']
};

// Results storage
const migrationResults = {
  summary: {
    filesProcessed: 0,
    filesModified: 0,
    totalReplacements: 0,
    skippedFiles: 0,
    errors: 0
  },
  byFile: {},
  byCategory: {
    simple: 0,
    complex: 0,
    types: 0,
    functions: 0,
    database: 0,
    imports: 0
  },
  errors: [],
  warnings: []
};

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--force');
const isForce = args.includes('--force');

/**
 * Check if file should be skipped
 */
function shouldSkipFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Skip already updated files
  if (CONFIG.alreadyUpdated.some(updated => relativePath.includes(updated))) {
    return { skip: true, reason: 'already-updated' };
  }
  
  // Skip directories
  if (CONFIG.skipDirs.some(skipDir => filePath.includes(skipDir))) {
    return { skip: true, reason: 'skipped-directory' };
  }
  
  // Skip non-included extensions
  const ext = path.extname(filePath);
  if (!CONFIG.includeExtensions.includes(ext)) {
    return { skip: true, reason: 'excluded-extension' };
  }
  
  return { skip: false };
}

/**
 * Apply replacements to file content
 */
function applyReplacements(content, filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileResults = {
    path: relativePath,
    originalContent: content,
    modifiedContent: content,
    replacements: [],
    totalReplacements: 0
  };
  
  let modifiedContent = content;
  
  CONFIG.replacements.forEach(({ pattern, replacement, category }) => {
    const matches = modifiedContent.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lines = modifiedContent.split('\n');
        const matchIndex = modifiedContent.indexOf(match);
        const lineNumber = modifiedContent.substring(0, matchIndex).split('\n').length;
        
        const actualReplacement = typeof replacement === 'function' ? replacement(match) : replacement;
        
        fileResults.replacements.push({
          category,
          original: match,
          replacement: actualReplacement,
          line: lineNumber,
          context: lines[lineNumber - 1]?.trim() || ''
        });
        
        fileResults.totalReplacements++;
        migrationResults.byCategory[category]++;
      });
      
      // Apply replacement
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        return typeof replacement === 'function' ? replacement(match) : replacement;
      });
    }
  });
  
  fileResults.modifiedContent = modifiedContent;
  fileResults.hasChanges = fileResults.totalReplacements > 0;
  
  return fileResults;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const skipCheck = shouldSkipFile(filePath);
  
  if (skipCheck.skip) {
    migrationResults.summary.skippedFiles++;
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileResults = applyReplacements(content, filePath);
    
    migrationResults.byFile[fileResults.path] = fileResults;
    migrationResults.summary.filesProcessed++;
    
    if (fileResults.hasChanges) {
      migrationResults.summary.filesModified++;
      migrationResults.summary.totalReplacements += fileResults.totalReplacements;
      
      // Write changes if not dry run
      if (!isDryRun) {
        fs.writeFileSync(filePath, fileResults.modifiedContent, 'utf8');
      }
    }
    
    return fileResults;
  } catch (error) {
    migrationResults.errors.push({
      file: path.relative(process.cwd(), filePath),
      error: error.message
    });
    migrationResults.summary.errors++;
    return null;
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!CONFIG.skipDirs.includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        processFile(fullPath);
      }
    });
  } catch (error) {
    migrationResults.errors.push({
      directory: dirPath,
      error: error.message
    });
    migrationResults.summary.errors++;
  }
}

/**
 * Validate prerequisites
 */
function validatePrerequisites() {
  const issues = [];
  
  // Check if audit report exists
  if (!fs.existsSync('audit-report.json')) {
    issues.push('Audit report not found. Run: node scripts/audit-teams-migration.js');
  }
  
  // Check if backup exists
  const backupDirs = fs.readdirSync('backups').filter(dir => dir.startsWith('migration-'));
  if (backupDirs.length === 0) {
    issues.push('No backup found. Run: node scripts/backup-before-migration.js');
  }
  
  // Check git status
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim() && !status.includes('teams-to-organizations-migration-backup')) {
      issues.push('Uncommitted changes detected. Commit or stash changes first.');
    }
  } catch (error) {
    issues.push('Git repository not found or git command failed.');
  }
  
  return issues;
}

/**
 * Ask for confirmation
 */
async function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Generate migration report
 */
function generateReport() {
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(migrationResults, null, 2));
  console.log(`\n📊 Migration report saved: ${reportPath}`);
  return reportPath;
}

/**
 * Generate undo script
 */
function generateUndoScript() {
  const undoScript = `#!/usr/bin/env node

/**
 * Undo Teams to Organizations Migration
 * 
 * This script reverts the migration changes by restoring from backup.
 * 
 * Usage: node undo-migration.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const backupDirs = fs.readdirSync('backups')
  .filter(dir => dir.startsWith('migration-'))
  .sort()
  .reverse();

if (backupDirs.length === 0) {
  console.error('❌ No backup found!');
  process.exit(1);
}

const latestBackup = path.join('backups', backupDirs[0]);
console.log(\`🔄 Restoring from backup: \${latestBackup}\`);

// Restore files
const manifestPath = path.join(latestBackup, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  Object.keys(manifest.files).forEach(filePath => {
    const backupPath = path.join(latestBackup, filePath);
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath);
      console.log(\`✅ Restored: \${filePath}\`);
    }
  });
}

// Restore git stash if available
if (manifest.gitStash && manifest.gitStash.stashMessage) {
  try {
    execSync(\`git stash pop\`, { stdio: 'pipe' });
    console.log(\`✅ Restored git stash: \${manifest.gitStash.stashMessage}\`);
  } catch (error) {
    console.log(\`⚠️  Could not restore git stash: \${error.message}\`);
  }
}

console.log('✅ Migration undone successfully!');
`;

  const undoPath = path.join(process.cwd(), 'undo-migration.js');
  fs.writeFileSync(undoPath, undoScript);
  console.log(`\n🔄 Undo script created: ${undoPath}`);
  return undoPath;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Teams to Organizations Migration...\n');
  
  if (isDryRun) {
    console.log('🔍 Running in DRY-RUN mode (no files will be modified)');
  } else {
    console.log('⚠️  Running in FORCE mode (files will be modified)');
  }
  
  // Validate prerequisites
  console.log('\n🔍 Validating prerequisites...');
  const issues = validatePrerequisites();
  
  if (issues.length > 0) {
    console.log('\n❌ Prerequisites not met:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    process.exit(1);
  }
  
  console.log('✅ Prerequisites validated');
  
  // Ask for confirmation if not dry run
  if (!isDryRun) {
    console.log('\n⚠️  WARNING: This will modify files in your codebase!');
    const confirmed = await askConfirmation('Are you sure you want to proceed? (y/N): ');
    if (!confirmed) {
      console.log('❌ Migration cancelled');
      process.exit(0);
    }
  }
  
  // Process files
  console.log('\n📁 Processing files...');
  const scanDirs = ['worker', 'src', 'tests', 'migrations'];
  
  scanDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      console.log(`   📁 ${dir}/`);
      scanDirectory(fullPath);
    } else {
      console.log(`   ⚠️  Directory not found: ${dir}`);
    }
  });
  
  // Generate reports
  generateReport();
  
  if (!isDryRun) {
    generateUndoScript();
  }
  
  // Print summary
  console.log('\n📈 MIGRATION SUMMARY:');
  console.log(`   Mode: ${isDryRun ? 'DRY-RUN' : 'EXECUTED'}`);
  console.log(`   Files processed: ${migrationResults.summary.filesProcessed}`);
  console.log(`   Files modified: ${migrationResults.summary.filesModified}`);
  console.log(`   Total replacements: ${migrationResults.summary.totalReplacements}`);
  console.log(`   Files skipped: ${migrationResults.summary.skippedFiles}`);
  console.log(`   Errors: ${migrationResults.summary.errors}`);
  
  // Show top modified files
  const topFiles = Object.entries(migrationResults.byFile)
    .filter(([, data]) => data.hasChanges)
    .sort(([,a], [,b]) => b.totalReplacements - a.totalReplacements)
    .slice(0, 10);
  
  if (topFiles.length > 0) {
    console.log('\n📊 Top 10 Modified Files:');
    topFiles.forEach(([file, data]) => {
      console.log(`   ${file}: ${data.totalReplacements} replacements`);
    });
  }
  
  // Show category breakdown
  console.log('\n📊 Replacements by Category:');
  Object.entries(migrationResults.byCategory).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`   ${category}: ${count}`);
    }
  });
  
  if (migrationResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    migrationResults.errors.forEach(error => {
      console.log(`   ${error.file || error.directory}: ${error.error}`);
    });
  }
  
  if (isDryRun) {
    console.log('\n✅ Dry-run complete! Review the changes above.');
    console.log('   To execute the migration, run: node scripts/migrate-to-organizations.js --force');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('   Run verification: node scripts/verify-migration.js');
    console.log('   To undo: node undo-migration.js');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, CONFIG, migrationResults };
