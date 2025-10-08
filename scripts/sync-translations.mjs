#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '../src/locales');
const BASE_LOCALE = 'en';
const NAMESPACES = ['common', 'settings', 'auth', 'profile', 'pricing'];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Read and parse JSON file, removing BOM if present
 */
async function readJsonFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      console.log(`  ${colors.yellow}⚠️  Removing BOM from ${path.basename(filePath)}${colors.reset}`);
      content = content.slice(1);
    }
    
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON file with proper formatting (no BOM)
 */
async function writeJsonFile(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Get all keys from an object recursively
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set value in nested object using dot notation
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Sync a locale file to match English structure
 */
async function syncLocaleFile(locale, namespace, englishData) {
  const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
  
  try {
    // Read existing translations
    const existingData = await readJsonFile(filePath);
    
    // Get all keys from English (source of truth)
    const englishKeys = getAllKeys(englishData);
    const existingKeys = getAllKeys(existingData);
    
    // Create new structure matching English
    const syncedData = {};
    let addedCount = 0;
    let preservedCount = 0;
    let removedCount = existingKeys.length - englishKeys.filter(key => 
      existingKeys.includes(key)
    ).length;
    
    // Copy all English keys, preserving existing translations where available
    for (const key of englishKeys) {
      const existingValue = getNestedValue(existingData, key);
      
      if (existingValue !== undefined) {
        // Preserve existing translation
        setNestedValue(syncedData, key, existingValue);
        preservedCount++;
      } else {
        // Use English value with [NEEDS TRANSLATION] marker
        const englishValue = getNestedValue(englishData, key);
        setNestedValue(syncedData, key, `[NEEDS TRANSLATION] ${englishValue}`);
        addedCount++;
      }
    }
    
    // Write synced file
    await writeJsonFile(filePath, syncedData);
    
    // Report changes
    if (addedCount > 0 || removedCount > 0) {
      console.log(`  ${colors.cyan}🔄 ${namespace}.json${colors.reset}`);
      if (preservedCount > 0) {
        console.log(`     ✅ Preserved ${preservedCount} existing translations`);
      }
      if (addedCount > 0) {
        console.log(`     ${colors.yellow}➕ Added ${addedCount} missing keys (marked for translation)${colors.reset}`);
      }
      if (removedCount > 0) {
        console.log(`     ${colors.red}➖ Removed ${removedCount} extra keys${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.green}✅ ${namespace}.json (already in sync)${colors.reset}`);
    }
    
    return { addedCount, preservedCount, removedCount };
    
  } catch (error) {
    console.log(`  ${colors.red}❌ ${namespace}.json: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

/**
 * Main sync function
 */
async function syncTranslations() {
  console.log(`${colors.blue}🔄 Syncing all translations to English structure...${colors.reset}\n`);
  
  // Load English translations (source of truth)
  const englishData = {};
  for (const namespace of NAMESPACES) {
    const filePath = path.join(LOCALES_DIR, BASE_LOCALE, `${namespace}.json`);
    englishData[namespace] = await readJsonFile(filePath);
  }
  
  // Get all locales (excluding English)
  const localesDirs = await fs.readdir(LOCALES_DIR);
  const locales = localesDirs.filter(dir => dir !== BASE_LOCALE);
  
  const summary = {
    totalLocales: 0,
    totalFiles: 0,
    totalAdded: 0,
    totalPreserved: 0,
    totalRemoved: 0,
    errors: 0,
  };
  
  // Sync each locale
  for (const locale of locales) {
    console.log(`${colors.cyan}📁 Syncing ${locale}...${colors.reset}`);
    summary.totalLocales++;
    
    for (const namespace of NAMESPACES) {
      const result = await syncLocaleFile(locale, namespace, englishData[namespace]);
      summary.totalFiles++;
      
      if (result.error) {
        summary.errors++;
      } else {
        summary.totalAdded += result.addedCount;
        summary.totalPreserved += result.preservedCount;
        summary.totalRemoved += result.removedCount;
      }
    }
    
    console.log('');
  }
  
  // Print summary
  console.log(`${colors.blue}============================================================${colors.reset}\n`);
  console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
  console.log(`   Locales synced: ${summary.totalLocales}`);
  console.log(`   Files processed: ${summary.totalFiles}`);
  console.log(`   ${colors.green}✅ Translations preserved: ${summary.totalPreserved}${colors.reset}`);
  
  if (summary.totalAdded > 0) {
    console.log(`   ${colors.yellow}➕ Missing keys added: ${summary.totalAdded}${colors.reset}`);
    console.log(`      ${colors.yellow}(These keys are marked with [NEEDS TRANSLATION] and need professional translation)${colors.reset}`);
  }
  
  if (summary.totalRemoved > 0) {
    console.log(`   ${colors.red}➖ Extra keys removed: ${summary.totalRemoved}${colors.reset}`);
  }
  
  if (summary.errors > 0) {
    console.log(`   ${colors.red}❌ Errors: ${summary.errors}${colors.reset}`);
  }
  
  console.log('');
  
  if (summary.errors === 0) {
    console.log(`${colors.green}✅ All translations synced successfully!${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Remember to translate keys marked with [NEEDS TRANSLATION]${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some files had errors during sync${colors.reset}\n`);
    process.exit(1);
  }
}

// Run the sync
syncTranslations().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
