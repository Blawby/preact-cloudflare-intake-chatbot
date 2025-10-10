#!/usr/bin/env node

/**
 * Post-Migration Verification Script
 * 
 * Verifies that the teams to organizations migration was successful.
 * Checks TypeScript compilation, ESLint, and cross-references.
 * 
 * Usage: node scripts/verify-migration.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Results storage
const verificationResults = {
  summary: {
    checksPassed: 0,
    checksFailed: 0,
    totalChecks: 0
  },
  checks: {},
  errors: [],
  warnings: []
};

/**
 * Run a verification check
 */
function runCheck(name, checkFunction) {
  console.log(`🔍 ${name}...`);
  verificationResults.summary.totalChecks++;
  
  try {
    const result = checkFunction();
    verificationResults.checks[name] = result;
    
    if (result.success) {
      console.log(`✅ ${name}: PASSED`);
      verificationResults.summary.checksPassed++;
    } else {
      console.log(`❌ ${name}: FAILED`);
      console.log(`   ${result.error}`);
      verificationResults.summary.checksFailed++;
      verificationResults.errors.push({
        check: name,
        error: result.error
      });
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   ${error.message}`);
    verificationResults.summary.checksFailed++;
    verificationResults.errors.push({
      check: name,
      error: error.message
    });
  }
}

/**
 * Check TypeScript compilation
 */
function checkTypeScriptCompilation() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'TypeScript compilation failed. Check for type errors.' 
    };
  }
}

/**
 * Check ESLint
 */
function checkESLint() {
  try {
    execSync('npx eslint . --ext .ts,.tsx,.js,.jsx', { stdio: 'pipe' });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'ESLint found issues. Check for linting errors.' 
    };
  }
}

/**
 * Check for remaining team references
 */
function checkRemainingTeamReferences() {
  const teamPatterns = [
    /\bteamId\b/g,
    /\bteam_id\b/g,
    /\bTeamService\b/g,
    /\bTeamConfig\b/g,
    /\bgetTeam\s*\(/g,
    /\blistTeams\s*\(/g
  ];
  
  const remainingRefs = [];
  
  function scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'backups'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(process.cwd(), fullPath);
            
            teamPatterns.forEach(pattern => {
              const matches = content.match(pattern);
              if (matches) {
                matches.forEach(match => {
                  const lines = content.split('\n');
                  const matchIndex = content.indexOf(match);
                  const lineNumber = content.substring(0, matchIndex).split('\n').length;
                  
                  remainingRefs.push({
                    file: relativePath,
                    match,
                    line: lineNumber,
                    context: lines[lineNumber - 1]?.trim() || ''
                  });
                });
              }
            });
          }
        }
      });
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  // Scan source directories
  ['worker', 'src', 'tests'].forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    }
  });
  
  if (remainingRefs.length > 0) {
    return {
      success: false,
      error: `Found ${remainingRefs.length} remaining team references`,
      details: remainingRefs.slice(0, 10) // Show first 10
    };
  }
  
  return { success: true };
}

/**
 * Check import statements
 */
function checkImportStatements() {
  const importIssues = [];
  
  function scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'backups'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(process.cwd(), fullPath);
            
            // Check for TeamService imports
            if (content.includes('TeamService')) {
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.includes('TeamService')) {
                  importIssues.push({
                    file: relativePath,
                    line: index + 1,
                    content: line.trim()
                  });
                }
              });
            }
          }
        }
      });
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  // Scan source directories
  ['worker', 'src', 'tests'].forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    }
  });
  
  if (importIssues.length > 0) {
    return {
      success: false,
      error: `Found ${importIssues.length} files with TeamService imports`,
      details: importIssues.slice(0, 10) // Show first 10
    };
  }
  
  return { success: true };
}

/**
 * Check database schema consistency
 */
function checkDatabaseSchema() {
  const schemaPath = path.join(process.cwd(), 'worker', 'schema.sql');
  const migrationPath = path.join(process.cwd(), 'migrations', 'migrate_teams_to_organizations.sql');
  
  if (!fs.existsSync(schemaPath)) {
    return { success: false, error: 'Schema file not found' };
  }
  
  if (!fs.existsSync(migrationPath)) {
    return { success: false, error: 'Migration file not found' };
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  // Check if schema still has team references
  const teamRefs = schema.match(/team_id|teams\./g);
  if (teamRefs && teamRefs.length > 0) {
    return {
      success: false,
      error: `Schema still contains ${teamRefs.length} team references`
    };
  }
  
  // Check if migration file exists and is properly formatted
  if (!migration.includes('organization_id') || !migration.includes('organizations')) {
    return {
      success: false,
      error: 'Migration file appears incomplete'
    };
  }
  
  return { success: true };
}

/**
 * Check test files
 */
function checkTestFiles() {
  const testIssues = [];
  
  function scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'backups'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && (item.includes('.test.') || item.includes('.spec.'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(process.cwd(), fullPath);
            
            // Check for team references in test files
            const teamPatterns = [/\bteamId\b/g, /\bteam_id\b/g, /\bTeamService\b/g];
            teamPatterns.forEach(pattern => {
              const matches = content.match(pattern);
              if (matches) {
                matches.forEach(match => {
                  const lines = content.split('\n');
                  const matchIndex = content.indexOf(match);
                  const lineNumber = content.substring(0, matchIndex).split('\n').length;
                  
                  testIssues.push({
                    file: relativePath,
                    match,
                    line: lineNumber,
                    context: lines[lineNumber - 1]?.trim() || ''
                  });
                });
              }
            });
          }
        }
      });
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  // Scan test directories
  ['tests', 'src/__tests__'].forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    }
  });
  
  if (testIssues.length > 0) {
    return {
      success: false,
      error: `Found ${testIssues.length} team references in test files`,
      details: testIssues.slice(0, 10) // Show first 10
    };
  }
  
  return { success: true };
}

/**
 * Check build process
 */
function checkBuildProcess() {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: 'Build process failed. Check for build errors.' 
    };
  }
}

/**
 * Generate verification report
 */
function generateReport() {
  const reportPath = path.join(process.cwd(), 'verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(verificationResults, null, 2));
  console.log(`\n📊 Verification report saved: ${reportPath}`);
  return reportPath;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting Post-Migration Verification...\n');
  
  // Run all verification checks
  runCheck('TypeScript Compilation', checkTypeScriptCompilation);
  runCheck('ESLint Validation', checkESLint);
  runCheck('Remaining Team References', checkRemainingTeamReferences);
  runCheck('Import Statements', checkImportStatements);
  runCheck('Database Schema Consistency', checkDatabaseSchema);
  runCheck('Test Files', checkTestFiles);
  runCheck('Build Process', checkBuildProcess);
  
  // Generate report
  generateReport();
  
  // Print summary
  console.log('\n📈 VERIFICATION SUMMARY:');
  console.log(`   Checks passed: ${verificationResults.summary.checksPassed}`);
  console.log(`   Checks failed: ${verificationResults.summary.checksFailed}`);
  console.log(`   Total checks: ${verificationResults.summary.totalChecks}`);
  
  if (verificationResults.summary.checksFailed === 0) {
    console.log('\n🎉 All verification checks passed!');
    console.log('   The migration appears to be successful.');
    console.log('   You can now run tests and deploy.');
  } else {
    console.log('\n⚠️  Some verification checks failed!');
    console.log('   Review the errors above and fix them before proceeding.');
    console.log('   You may need to run the migration script again or make manual fixes.');
  }
  
  // Show detailed errors if any
  if (verificationResults.errors.length > 0) {
    console.log('\n❌ DETAILED ERRORS:');
    verificationResults.errors.forEach(error => {
      console.log(`\n   ${error.check}:`);
      console.log(`   ${error.error}`);
      if (error.details) {
        console.log('   Details:');
        error.details.slice(0, 5).forEach(detail => {
          console.log(`     ${detail.file}:${detail.line} - ${detail.match || detail.content}`);
        });
        if (error.details.length > 5) {
          console.log(`     ... and ${error.details.length - 5} more`);
        }
      }
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, verificationResults };
