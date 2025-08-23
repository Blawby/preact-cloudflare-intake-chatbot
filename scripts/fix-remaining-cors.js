#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

console.log('🔧 Fixing remaining CORS parameter passing...');

// More comprehensive patterns to replace
const replacements = [
  // Remove CORS_HEADERS from createSuccessResponse calls (more flexible pattern)
  {
    pattern: /createSuccessResponse\(([^)]+),\s*CORS_HEADERS\)/g,
    replacement: 'createSuccessResponse($1)',
    description: 'createSuccessResponse calls with CORS_HEADERS'
  },
  // Remove CORS_HEADERS from Response headers (rate limiting responses)
  {
    pattern: /headers:\s*\{\s*\.\.\.CORS_HEADERS,\s*'Content-Type':\s*'application\/json'\s*\}/g,
    replacement: "headers: { 'Content-Type': 'application/json' }",
    description: 'Response headers with CORS_HEADERS'
  },
  // Remove CORS_HEADERS from new Headers() calls
  {
    pattern: /new Headers\(CORS_HEADERS\)/g,
    replacement: 'new Headers()',
    description: 'new Headers(CORS_HEADERS) calls'
  }
];

// Files to process
const workerFiles = [
  'worker/routes/analyze.ts',
  'worker/routes/agent.ts',
  'worker/routes/review.ts',
  'worker/routes/files.ts',
  'worker/routes/payment.ts',
  'worker/routes/paralegal.ts'
];

let totalReplacements = 0;

// Process each file
workerFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;

  replacements.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      const newContent = content.replace(pattern, replacement);
      const count = (content.match(pattern) || []).length;
      if (newContent !== content) {
        content = newContent;
        fileReplacements += count;
        console.log(`  ✅ ${filePath}: ${count} ${description}`);
      }
    }
  });

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalReplacements += fileReplacements;
  }
});

console.log(`\n🎉 Total replacements: ${totalReplacements}`);

// Run tests to verify everything still works
console.log('\n🧪 Running tests to verify changes...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ Tests passed!');
} catch (error) {
  console.log('❌ Tests failed!');
  process.exit(1);
}

// Clean up the script
console.log('\n🧹 Cleaning up script...');
fs.unlinkSync(__filename);
console.log('✅ Script deleted successfully!');

console.log('\n🎯 Remaining CORS parameter cleanup complete!');
console.log('   - All CORS headers are now handled centrally');
console.log('   - No more parameter passing required');
console.log('   - Cleaner, more maintainable code');
