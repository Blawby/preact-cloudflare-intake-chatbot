#!/usr/bin/env node

/**
 * Teams to Organizations Migration Audit Script
 * 
 * Analyzes the codebase to identify all team-related references that need
 * to be migrated to organization-based references.
 * 
 * Usage: node scripts/audit-teams-migration.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Directories to scan
  scanDirs: ['worker', 'src', 'tests', 'migrations'],
  
  // File extensions to include
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.sql', '.json'],
  
  // Directories to skip
  skipDirs: ['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results'],
  
  // Files already updated (skip in migration)
  alreadyUpdated: [
    'worker/types.ts',
    'worker/services/OrganizationService.ts',
    'worker/middleware/auth.ts',
    'worker/auth/index.ts',
    'worker/auth/hooks.ts',
    'migrations/migrate_teams_to_organizations.sql'
  ],
  
  // Patterns to search for
  patterns: {
    // Simple variable/parameter names
    simple: [
      /\bteamId\b/g,
      /\bteam_id\b/g,
      /\bteamIds\b/g,
      /\bteam_ids\b/g
    ],
    
    // Complex variable names
    complex: [
      /\beffectiveTeamId\b/g,
      /\bresolvedTeamId\b/g,
      /\bpriorSession\.teamId\b/g,
      /\bsession\.teamId\b/g,
      /\buser\.teamId\b/g,
      /\brequest\.teamId\b/g,
      /\bparams\.teamId\b/g
    ],
    
    // Type/Interface names
    types: [
      /\bTeamService\b/g,
      /\bTeamConfig\b/g,
      /\bTeamVoiceConfig\b/g,
      /\bTeam\b/g
    ],
    
    // Function calls
    functions: [
      /\bgetTeam\s*\(/g,
      /\blistTeams\s*\(/g,
      /\bcreateTeam\s*\(/g,
      /\bupdateTeam\s*\(/g,
      /\bdeleteTeam\s*\(/g,
      /\bgetTeamConfig\s*\(/g,
      /\bvalidateTeamAccess\s*\(/g,
      /\bcheckTeamAccess\s*\(/g
    ],
    
    // Database/SQL references
    database: [
      /team_id/g,
      /teams\./g,
      /FROM teams/g,
      /JOIN teams/g,
      /INSERT INTO teams/g,
      /UPDATE teams/g,
      /DELETE FROM teams/g
    ],
    
    // Import statements
    imports: [
      /from ['"]\.\.\/services\/TeamService['"]/g,
      /import.*TeamService/g,
      /require\(['"]\.\.\/services\/TeamService['"]\)/g
    ],
    
    // Comments and strings
    comments: [
      /\/\/.*team/i,
      /\/\*.*team.*\*\//i,
      /\/\*\*.*team.*\*\//i,
      /`.*team.*`/i,
      /".*team.*"/i,
      /'.*team.*'/i
    ]
  }
};

// Results storage
const auditResults = {
  summary: {
    totalFiles: 0,
    totalReferences: 0,
    filesWithReferences: 0,
    alreadyUpdatedFiles: 0,
    skippedFiles: 0
  },
  byFile: {},
  byCategory: {
    simple: 0,
    complex: 0,
    types: 0,
    functions: 0,
    database: 0,
    imports: 0,
    comments: 0
  },
  warnings: [],
  conflicts: []
};

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
 * Analyze a single file for team references
 */
function analyzeFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const skipCheck = shouldSkipFile(filePath);
  
  if (skipCheck.skip) {
    auditResults.summary.skippedFiles++;
    if (skipCheck.reason === 'already-updated') {
      auditResults.summary.alreadyUpdatedFiles++;
    }
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileResults = {
      path: relativePath,
      totalReferences: 0,
      references: [],
      hasOrganizationRefs: false,
      lineCount: content.split('\n').length
    };
    
    // Check for organization references (potential conflicts)
    if (/\borganizationId\b|\borganization_id\b|\bOrganizationService\b|\bOrganization\b/.test(content)) {
      fileResults.hasOrganizationRefs = true;
      auditResults.conflicts.push({
        file: relativePath,
        issue: 'mixed-naming',
        description: 'Contains both team and organization references'
      });
    }
    
    // Search for each pattern category
    Object.entries(CONFIG.patterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lines = content.split('\n');
            const matchIndex = content.indexOf(match);
            const lineNumber = content.substring(0, matchIndex).split('\n').length;
            
            fileResults.references.push({
              category,
              pattern: pattern.toString(),
              match,
              line: lineNumber,
              context: lines[lineNumber - 1]?.trim() || ''
            });
            
            fileResults.totalReferences++;
            auditResults.byCategory[category]++;
          });
        }
      });
    });
    
    if (fileResults.totalReferences > 0) {
      auditResults.byFile[relativePath] = fileResults;
      auditResults.summary.filesWithReferences++;
    }
    
    auditResults.summary.totalFiles++;
    auditResults.summary.totalReferences += fileResults.totalReferences;
    
  } catch (error) {
    auditResults.warnings.push({
      file: relativePath,
      error: error.message,
      type: 'read-error'
    });
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
        analyzeFile(fullPath);
      }
    });
  } catch (error) {
    auditResults.warnings.push({
      directory: dirPath,
      error: error.message,
      type: 'scan-error'
    });
  }
}

/**
 * Generate JSON report
 */
function generateJsonReport() {
  const reportPath = path.join(process.cwd(), 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`✅ JSON report generated: ${reportPath}`);
  return reportPath;
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport() {
  const reportPath = path.join(process.cwd(), 'audit-report.md');
  
  let markdown = `# Teams to Organizations Migration Audit Report\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total files scanned**: ${auditResults.summary.totalFiles}\n`;
  markdown += `- **Files with team references**: ${auditResults.summary.filesWithReferences}\n`;
  markdown += `- **Total references found**: ${auditResults.summary.totalReferences}\n`;
  markdown += `- **Already updated files**: ${auditResults.summary.alreadyUpdatedFiles}\n`;
  markdown += `- **Skipped files**: ${auditResults.summary.skippedFiles}\n\n`;
  
  // References by category
  markdown += `## References by Category\n\n`;
  Object.entries(auditResults.byCategory).forEach(([category, count]) => {
    if (count > 0) {
      markdown += `- **${category}**: ${count} references\n`;
    }
  });
  markdown += `\n`;
  
  // Files with most references
  const topFiles = Object.entries(auditResults.byFile)
    .sort(([,a], [,b]) => b.totalReferences - a.totalReferences)
    .slice(0, 10);
  
  if (topFiles.length > 0) {
    markdown += `## Top 10 Files by Reference Count\n\n`;
    topFiles.forEach(([file, data]) => {
      markdown += `- **${file}**: ${data.totalReferences} references\n`;
    });
    markdown += `\n`;
  }
  
  // Warnings
  if (auditResults.warnings.length > 0) {
    markdown += `## Warnings\n\n`;
    auditResults.warnings.forEach(warning => {
      markdown += `- **${warning.file || warning.directory}**: ${warning.error}\n`;
    });
    markdown += `\n`;
  }
  
  // Conflicts
  if (auditResults.conflicts.length > 0) {
    markdown += `## Potential Conflicts\n\n`;
    markdown += `Files with both team and organization references:\n\n`;
    auditResults.conflicts.forEach(conflict => {
      markdown += `- **${conflict.file}**: ${conflict.description}\n`;
    });
    markdown += `\n`;
  }
  
  // Detailed file breakdown
  markdown += `## Detailed File Analysis\n\n`;
  Object.entries(auditResults.byFile)
    .sort(([,a], [,b]) => b.totalReferences - a.totalReferences)
    .forEach(([file, data]) => {
      markdown += `### ${file}\n\n`;
      markdown += `- **Total references**: ${data.totalReferences}\n`;
      markdown += `- **Line count**: ${data.lineCount}\n`;
      markdown += `- **Has organization refs**: ${data.hasOrganizationRefs ? '⚠️ Yes' : 'No'}\n\n`;
      
      // Group references by category
      const byCategory = {};
      data.references.forEach(ref => {
        if (!byCategory[ref.category]) {
          byCategory[ref.category] = [];
        }
        byCategory[ref.category].push(ref);
      });
      
      Object.entries(byCategory).forEach(([category, refs]) => {
        markdown += `#### ${category} (${refs.length})\n\n`;
        refs.slice(0, 5).forEach(ref => {
          markdown += `- Line ${ref.line}: \`${ref.match}\`\n`;
          if (ref.context) {
            markdown += `  \`${ref.context}\`\n`;
          }
        });
        if (refs.length > 5) {
          markdown += `- ... and ${refs.length - 5} more\n`;
        }
        markdown += `\n`;
      });
    });
  
  fs.writeFileSync(reportPath, markdown);
  console.log(`✅ Markdown report generated: ${reportPath}`);
  return reportPath;
}

/**
 * Generate warnings file
 */
function generateWarningsFile() {
  const warningsPath = path.join(process.cwd(), 'audit-warnings.txt');
  
  let warnings = `Teams to Organizations Migration - Warnings\n`;
  warnings += `Generated: ${new Date().toISOString()}\n\n`;
  
  if (auditResults.warnings.length > 0) {
    warnings += `FILES WITH READ ERRORS:\n`;
    auditResults.warnings.forEach(warning => {
      warnings += `- ${warning.file || warning.directory}: ${warning.error}\n`;
    });
    warnings += `\n`;
  }
  
  if (auditResults.conflicts.length > 0) {
    warnings += `FILES WITH MIXED NAMING (REQUIRE MANUAL REVIEW):\n`;
    auditResults.conflicts.forEach(conflict => {
      warnings += `- ${conflict.file}: ${conflict.description}\n`;
    });
    warnings += `\n`;
  }
  
  // Files with high reference counts (might need special handling)
  const highRefFiles = Object.entries(auditResults.byFile)
    .filter(([, data]) => data.totalReferences > 20)
    .sort(([,a], [,b]) => b.totalReferences - a.totalReferences);
  
  if (highRefFiles.length > 0) {
    warnings += `FILES WITH HIGH REFERENCE COUNTS (REQUIRE CAREFUL REVIEW):\n`;
    highRefFiles.forEach(([file, data]) => {
      warnings += `- ${file}: ${data.totalReferences} references\n`;
    });
  }
  
  fs.writeFileSync(warningsPath, warnings);
  console.log(`✅ Warnings file generated: ${warningsPath}`);
  return warningsPath;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting Teams to Organizations Migration Audit...\n');
  
  // Scan all configured directories
  CONFIG.scanDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      console.log(`📁 Scanning directory: ${dir}`);
      scanDirectory(fullPath);
    } else {
      console.log(`⚠️  Directory not found: ${dir}`);
    }
  });
  
  console.log('\n📊 Audit complete! Generating reports...\n');
  
  // Generate reports
  generateJsonReport();
  generateMarkdownReport();
  generateWarningsFile();
  
  // Print summary
  console.log('\n📈 AUDIT SUMMARY:');
  console.log(`   Total files scanned: ${auditResults.summary.totalFiles}`);
  console.log(`   Files with references: ${auditResults.summary.filesWithReferences}`);
  console.log(`   Total references: ${auditResults.summary.totalReferences}`);
  console.log(`   Already updated: ${auditResults.summary.alreadyUpdatedFiles}`);
  console.log(`   Warnings: ${auditResults.warnings.length}`);
  console.log(`   Conflicts: ${auditResults.conflicts.length}`);
  
  if (auditResults.conflicts.length > 0) {
    console.log('\n⚠️  WARNING: Files with mixed team/organization references found!');
    console.log('   These require manual review before migration.');
  }
  
  console.log('\n✅ Audit complete! Review the generated reports before proceeding.');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, CONFIG, auditResults };
