#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localesDir = join(__dirname, '..', 'src', 'locales');

const SUPPORTED_LOCALES = [
  'en', 'es', 'fr', 'de', 'zh', 'ja', 'vi',
  'pt', 'ar', 'ru', 'it', 'ko', 'nl', 'pl',
  'tr', 'th', 'id', 'hi', 'uk'
];

const NAMESPACES = ['common', 'settings', 'auth', 'profile', 'pricing'];

let errors = 0;
let warnings = 0;

console.log('🔍 Validating translation files...\n');

// Helper to get all keys from nested object
function getAllKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return getAllKeys(value, fullKey);
    }
    return [fullKey];
  });
}

// Load reference (English) translations
const enTranslations = {};
for (const namespace of NAMESPACES) {
  try {
    const content = readFileSync(join(localesDir, 'en', `${namespace}.json`), 'utf-8');
    enTranslations[namespace] = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to load en/${namespace}.json:`, error.message);
    errors++;
  }
}

// Validate each locale
for (const locale of SUPPORTED_LOCALES) {
  const localeDir = join(localesDir, locale);
  
  console.log(`\n📁 Validating ${locale}...`);
  
  for (const namespace of NAMESPACES) {
    const filePath = join(localeDir, `${namespace}.json`);
    
    try {
      // 1. Check file exists
      const content = readFileSync(filePath, 'utf-8');
      
      // 2. Validate JSON syntax
      let translation;
      try {
        translation = JSON.parse(content);
      } catch (parseError) {
        console.error(`  ❌ ${namespace}.json: Invalid JSON - ${parseError.message}`);
        errors++;
        continue;
      }
      
      // 3. Check if it's an object
      if (typeof translation !== 'object' || translation === null || Array.isArray(translation)) {
        console.error(`  ❌ ${namespace}.json: Root must be an object`);
        errors++;
        continue;
      }
      
      // 4. Compare keys with English
      if (locale !== 'en' && enTranslations[namespace]) {
        const enKeys = getAllKeys(enTranslations[namespace]).sort();
        const localeKeys = getAllKeys(translation).sort();
        
        const missingKeys = enKeys.filter(k => !localeKeys.includes(k));
        const extraKeys = localeKeys.filter(k => !enKeys.includes(k));
        
        if (missingKeys.length > 0) {
          console.error(`  ❌ ${namespace}.json: Missing ${missingKeys.length} keys:`);
          missingKeys.slice(0, 5).forEach(k => console.error(`     - ${k}`));
          if (missingKeys.length > 5) {
            console.error(`     ... and ${missingKeys.length - 5} more`);
          }
          errors++;
        }
        
        if (extraKeys.length > 0) {
          console.warn(`  ⚠️  ${namespace}.json: Extra ${extraKeys.length} keys (not in English):`);
          extraKeys.slice(0, 5).forEach(k => console.warn(`     - ${k}`));
          if (extraKeys.length > 5) {
            console.warn(`     ... and ${extraKeys.length - 5} more`);
          }
          warnings++;
        }
        
        // 5. Check for empty values
        const checkEmpty = (obj, path = []) => {
          Object.entries(obj).forEach(([key, value]) => {
            const currentPath = [...path, key];
            if (typeof value === 'string' && value.trim() === '') {
              console.warn(`  ⚠️  ${namespace}.json: Empty value at ${currentPath.join('.')}`);
              warnings++;
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
              checkEmpty(value, currentPath);
            }
          });
        };
        checkEmpty(translation);
      }
      
      console.log(`  ✅ ${namespace}.json`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`  ❌ ${namespace}.json: File not found`);
      } else {
        console.error(`  ❌ ${namespace}.json: ${error.message}`);
      }
      errors++;
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Total locales checked: ${SUPPORTED_LOCALES.length}`);
console.log(`   Total files checked: ${SUPPORTED_LOCALES.length * NAMESPACES.length}`);
console.log(`   ❌ Errors: ${errors}`);
console.log(`   ⚠️  Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\n❌ Validation failed with errors!');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Validation passed with warnings.');
  process.exit(0);
} else {
  console.log('\n✅ All translations valid!');
  process.exit(0);
}
