#!/usr/bin/env node

/**
 * Browser API Access Test Script
 * 
 * Quick test to verify that all browser API calls are properly guarded
 * with typeof window !== 'undefined' checks.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Configuration
const SRC_DIR = join(__dirname, '..', 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Critical files we've fixed
const CRITICAL_FILES = [
  'src/components/UserProfile.tsx',
  'src/components/AuthPage.tsx', 
  'src/components/settings/SettingsPage.tsx',
  'src/index.tsx'
];

// More specific patterns to find potential unguarded calls
const UNGUARDED_PATTERNS = [
  {
    name: 'localStorage without guard',
    pattern: /localStorage\.(getItem|setItem|removeItem|clear)/g,
    critical: true
  },
  {
    name: 'window without guard',
    pattern: /window\.(open|close|focus|blur|scroll|scrollTo|scrollBy|setTimeout|setInterval|clearTimeout|clearInterval|dispatchEvent|addEventListener|removeEventListener|matchMedia|innerWidth|innerHeight|outerWidth|outerHeight|screen|navigator|history|location\.assign|location\.replace|location\.reload|location\.href|location\.pathname|location\.search|location\.hash|location\.origin)/g,
    critical: true
  },
  {
    name: 'document without guard',
    pattern: /document\.(title|body|head|documentElement|activeElement|createElement|createTextNode|getElementById|querySelector|querySelectorAll|addEventListener|removeEventListener|write|writeln)/g,
    critical: true
  }
];

let hasErrors = false;

/**
 * Detects guard patterns in text content
 * @param {string} text - The text to analyze
 * @returns {boolean} - True if any guard pattern is found
 */
function hasGuardInText(text) {
  // typeof checks (both !== 'undefined' and === 'undefined')
  if (text.includes('typeof window') && text.includes('undefined')) return true;
  if (text.includes('typeof document') && text.includes('undefined')) return true;
  if (text.includes('typeof globalThis.window') && text.includes('undefined')) return true;
  if (text.includes('typeof globalThis.document') && text.includes('undefined')) return true;
  
  // Optional chaining patterns (window?.foo, document?.bar, globalThis.window?.foo)
  if (/\b(window|document|globalThis\.window|globalThis\.document)\?\./.test(text)) return true;
  
  // Truthy checks (if (window), window && ..., if (globalThis.window))
  if (/\bif\s*\(\s*(window|document|globalThis\.window|globalThis\.document)\b/.test(text)) return true;
  if (/\b(window|document|globalThis\.window|globalThis\.document)\s*&&/.test(text)) return true;
  
  // Nullish coalescing (window ?? ..., globalThis.window ?? ...)
  if (/\b(window|document|globalThis\.window|globalThis\.document)\s*\?\?/.test(text)) return true;
  
  // Existence checks (window in globalThis, 'window' in globalThis)
  if (/\b(window|document)\s+in\s+globalThis/.test(text)) return true;
  if (/['"]window['"]\s+in\s+globalThis/.test(text)) return true;
  if (/['"]document['"]\s+in\s+globalThis/.test(text)) return true;
  
  // Try-catch patterns
  if (/\btry\s*\{/.test(text) && /\bcatch\s*\(/.test(text)) return true;
  
  return false;
}

function isGuarded(content, matchIndex) {
  // Get the text before the match
  const beforeMatch = content.substring(0, matchIndex);
  
  // Check if there's a guard in the recent context (up to 30 lines back)
  const lines = beforeMatch.split('\n');
  const currentLine = lines.length - 1;
  
  // Look back up to 30 lines for a guard
  for (let i = Math.max(0, currentLine - 30); i < currentLine; i++) {
    if (hasGuardInText(lines[i])) {
      return true;
    }
  }
  
  // Check current line for guards
  const lineContent = lines[currentLine] || '';
  if (hasGuardInText(lineContent)) {
    return true;
  }
  
  // Check for function-level guards
  const functionStart = beforeMatch.lastIndexOf('function');
  const classStart = beforeMatch.lastIndexOf('class');
  const constStart = beforeMatch.lastIndexOf('const');
  const letStart = beforeMatch.lastIndexOf('let');
  const varStart = beforeMatch.lastIndexOf('var');
  const useEffectStart = beforeMatch.lastIndexOf('useEffect');
  const useLayoutEffectStart = beforeMatch.lastIndexOf('useLayoutEffect');
  const useCallbackStart = beforeMatch.lastIndexOf('useCallback');
  const useMemoStart = beforeMatch.lastIndexOf('useMemo');
  
  const startIndex = Math.max(functionStart, classStart, constStart, letStart, varStart, useEffectStart, useLayoutEffectStart, useCallbackStart, useMemoStart);
  if (startIndex > 0) {
    const functionContent = beforeMatch.substring(startIndex);
    if (hasGuardInText(functionContent)) {
      return true;
    }
  }
  
  // Check for if statements with guards
  const ifStart = beforeMatch.lastIndexOf('if (');
  if (ifStart > 0) {
    const ifContent = beforeMatch.substring(ifStart);
    if (hasGuardInText(ifContent)) {
      return true;
    }
  }
  
  // Check for nested if statements
  const nestedIfStart = beforeMatch.lastIndexOf('if (typeof');
  if (nestedIfStart > 0) {
    const nestedIfContent = beforeMatch.substring(nestedIfStart);
    if (hasGuardInText(nestedIfContent)) {
      return true;
    }
  }
  
  // Check for useEffect with guards
  const useEffectGuardStart = beforeMatch.lastIndexOf('useEffect(');
  if (useEffectGuardStart > 0) {
    const useEffectContent = beforeMatch.substring(useEffectGuardStart);
    if (hasGuardInText(useEffectContent)) {
      return true;
    }
  }
  
  // Check for return statements with guards
  const returnStart = beforeMatch.lastIndexOf('return () => {');
  if (returnStart > 0) {
    const returnContent = beforeMatch.substring(returnStart);
    if (hasGuardInText(returnContent)) {
      return true;
    }
  }
  
  return false;
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const relativePath = filePath.replace(process.cwd(), '');
  const isCritical = CRITICAL_FILES.some(cf => relativePath.includes(cf));
  
  console.log(`\n📁 Checking: ${relativePath}${isCritical ? ' (CRITICAL)' : ''}`);
  
  let fileHasIssues = false;
  
  for (const pattern of UNGUARDED_PATTERNS) {
    const matches = [...content.matchAll(pattern.pattern)];
    const unguardedMatches = [];
    
    for (const match of matches) {
      if (!isGuarded(content, match.index)) {
        unguardedMatches.push(match);
      }
    }
    
    if (unguardedMatches.length > 0) {
      fileHasIssues = true;
      console.log(`  ❌ ${pattern.name}: ${unguardedMatches.length} instances`);
      
      for (const match of unguardedMatches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = content.split('\n')[lineNumber - 1]?.trim() || '';
        console.log(`     Line ${lineNumber}: ${lineContent.substring(0, 80)}...`);
      }
      
      if (pattern.critical) {
        hasErrors = true;
      }
    }
  }
  
  if (!fileHasIssues) {
    console.log(`  ✅ No unguarded browser API calls found`);
  }
}

function findSourceFiles(dir, files = []) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '__tests__', 'test-results'].includes(entry)) {
        findSourceFiles(fullPath, files);
      }
    } else if (EXTENSIONS.includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function main() {
  console.log('🔍 Testing Browser API Access Guards...\n');
  
  try {
    const sourceFiles = findSourceFiles(SRC_DIR);
    
    for (const file of sourceFiles) {
      checkFile(file);
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (hasErrors) {
      console.log('❌ Test FAILED: Found unguarded browser API calls');
      console.log('\n💡 Fix by wrapping calls with:');
      console.log('   if (typeof window !== "undefined") {');
      console.log('     // browser API calls here');
      console.log('   }');
      process.exit(1);
    } else {
      console.log('✅ Test PASSED: All browser API calls are properly guarded');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

main();
