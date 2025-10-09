#!/usr/bin/env node

/**
 * Translation Submission Validator
 * 
 * Validates translated JSON files before accepting them into the codebase.
 * Ensures quality control for professional translator submissions.
 * 
 * Usage:
 *   node scripts/validate-translation-submission.mjs <locale> <namespace>
 *   node scripts/validate-translation-submission.mjs hi settings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const LOCALES_DIR = path.join(ROOT_DIR, 'src', 'locales');
const NAMESPACES = ['auth', 'common', 'pricing', 'profile', 'settings'];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  WARNING: ${message}`, 'yellow');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Extract all placeholders from a string (e.g., {{variable}})
 */
function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const matches = str.matchAll(/\{\{(\w+)\}\}/g);
  return Array.from(matches, m => m[1]).sort();
}

/**
 * Recursively validate translation object against English reference
 */
function validateTranslationObject(enObj, transObj, path = [], errors = [], warnings = []) {
  for (const [key, enValue] of Object.entries(enObj)) {
    const currentPath = [...path, key].join('.');
    
    // Check if key exists in translation
    if (!(key in transObj)) {
      errors.push(`Missing key: ${currentPath}`);
      continue;
    }
    
    const transValue = transObj[key];
    
    // Type mismatch check
    if (typeof enValue !== typeof transValue) {
      errors.push(`Type mismatch at ${currentPath}: expected ${typeof enValue}, got ${typeof transValue}`);
      continue;
    }
    
    // Handle nested objects
    if (typeof enValue === 'object' && !Array.isArray(enValue) && enValue !== null) {
      validateTranslationObject(enValue, transValue, [...path, key], errors, warnings);
      continue;
    }
    
    // Handle arrays
    if (Array.isArray(enValue)) {
      if (!Array.isArray(transValue)) {
        errors.push(`Expected array at ${currentPath}, got ${typeof transValue}`);
        continue;
      }
      
      if (enValue.length !== transValue.length) {
        errors.push(`Array length mismatch at ${currentPath}: expected ${enValue.length}, got ${transValue.length}`);
      }
      
      // Check for [NEEDS TRANSLATION] in array items
      transValue.forEach((item, index) => {
        if (typeof item === 'string' && item.includes('[NEEDS TRANSLATION]')) {
          errors.push(`Placeholder found in array at ${currentPath}[${index}]`);
        }
      });
      continue;
    }
    
    // Handle string values
    if (typeof enValue === 'string') {
      // Check for [NEEDS TRANSLATION] placeholder
      if (transValue.includes('[NEEDS TRANSLATION]')) {
        errors.push(`Placeholder found at ${currentPath}: "${transValue}"`);
      }
      
      // Check for empty strings
      if (transValue.trim() === '') {
        errors.push(`Empty string at ${currentPath}`);
      }
      
      // Validate placeholder consistency
      const enPlaceholders = extractPlaceholders(enValue);
      const transPlaceholders = extractPlaceholders(transValue);
      
      if (JSON.stringify(enPlaceholders) !== JSON.stringify(transPlaceholders)) {
        errors.push(
          `Placeholder mismatch at ${currentPath}:\n` +
          `  Expected: {{${enPlaceholders.join('}}, {{')}}}}\n` +
          `  Got:      {{${transPlaceholders.join('}}, {{')}}}}`
        );
      }
      
      // Check if translation is identical to English (might need review)
      if (transValue === enValue && enValue.length > 10 && !enValue.includes('http') && !enValue.includes('@')) {
        warnings.push(`Possible untranslated text at ${currentPath}: "${transValue}"`);
      }
    }
  }
  
  // Check for extra keys in translation not in English
  for (const key of Object.keys(transObj)) {
    if (!(key in enObj)) {
      warnings.push(`Extra key found (not in English): ${[...path, key].join('.')}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Validate a translation file
 */
function validateTranslationFile(locale, namespace) {
  info(`Validating ${locale}/${namespace}.json...`);
  
  const enPath = path.join(LOCALES_DIR, 'en', `${namespace}.json`);
  const transPath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
  
  // Check if files exist
  if (!fs.existsSync(enPath)) {
    error(`English reference file not found: ${enPath}`);
    return { valid: false, errors: 1, warnings: 0 };
  }
  
  if (!fs.existsSync(transPath)) {
    error(`Translation file not found: ${transPath}`);
    return { valid: false, errors: 1, warnings: 0 };
  }
  
  // Parse JSON files
  let enData, transData;
  
  try {
    const enContent = fs.readFileSync(enPath, 'utf8');
    enData = JSON.parse(enContent);
  } catch (err) {
    error(`Failed to parse English reference file: ${err.message}`);
    return { valid: false, errors: 1, warnings: 0 };
  }
  
  try {
    const transContent = fs.readFileSync(transPath, 'utf8');
    transData = JSON.parse(transContent);
  } catch (err) {
    error(`Failed to parse translation file: ${err.message}`);
    return { valid: false, errors: 1, warnings: 0 };
  }
  
  // Validate translation
  const { errors, warnings } = validateTranslationObject(enData, transData);
  
  // Report results
  if (errors.length > 0) {
    log('\n❌ ERRORS:', 'red');
    errors.forEach(err => console.log(`   ${err}`));
  }
  
  if (warnings.length > 0) {
    log('\n⚠️  WARNINGS:', 'yellow');
    warnings.forEach(warn => console.log(`   ${warn}`));
  }
  
  const valid = errors.length === 0;
  
  log('');
  if (valid) {
    success(`${locale}/${namespace}.json is valid! (${warnings.length} warnings)`);
  } else {
    error(`${locale}/${namespace}.json has ${errors.length} errors and ${warnings.length} warnings`);
  }
  
  return { valid, errors: errors.length, warnings: warnings.length };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Translation Submission Validator', 'cyan');
    log('================================\n', 'cyan');
    log('Usage:');
    log('  node scripts/validate-translation-submission.mjs <locale> [namespace]');
    log('  node scripts/validate-translation-submission.mjs hi settings');
    log('  node scripts/validate-translation-submission.mjs uk');
    log('');
    log('Available namespaces: ' + NAMESPACES.join(', '));
    process.exit(1);
  }
  
  const locale = args[0];
  const namespace = args[1];
  
  // Check if locale directory exists
  const localePath = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(localePath)) {
    error(`Locale directory not found: ${localePath}`);
    process.exit(1);
  }
  
  log('🔍 Translation Submission Validator', 'blue');
  log('=====================================\n', 'blue');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesChecked = 0;
  
  // Validate specific namespace or all namespaces
  const namespacesToCheck = namespace ? [namespace] : NAMESPACES;
  
  for (const ns of namespacesToCheck) {
    if (!NAMESPACES.includes(ns)) {
      warning(`Unknown namespace: ${ns} (skipping)`);
      continue;
    }
    
    const result = validateTranslationFile(locale, ns);
    totalErrors += result.errors;
    totalWarnings += result.warnings;
    filesChecked++;
    
    log('');
  }
  
  // Summary
  log('─'.repeat(50), 'cyan');
  log(`Checked ${filesChecked} file(s) for locale: ${locale}`, 'cyan');
  log(`Total errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
  log(`Total warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');
  
  if (totalErrors === 0) {
    log('\n✨ All validations passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Validation failed. Please fix the errors above.', 'red');
    process.exit(1);
  }
}

main();
