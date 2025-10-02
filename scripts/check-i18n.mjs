#!/usr/bin/env node
/* eslint-env node */
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = new URL('..', import.meta.url);
const LOCALES_DIR = path.join(ROOT.pathname, 'src', 'locales');
const BASE_LOCALE = process.env.I18N_BASE_LOCALE || 'en';

const log = (message) => {
  process.stdout.write(`${message}\n`);
};

const warn = (message) => {
  process.stderr.write(`${message}\n`);
};

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenKeys(value, nextKey));
    } else {
      acc[nextKey] = value;
    }
    return acc;
  }, {});
}

async function collectLocaleData(locale) {
  const localePath = path.join(LOCALES_DIR, locale);
  const entries = await fs.readdir(localePath, { withFileTypes: true });
  const resources = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const namespace = entry.name.replace(/\.json$/, '');
    const content = await readJson(path.join(localePath, entry.name));
    resources.set(namespace, flattenKeys(content));
  }

  return resources;
}

async function main() {
  try {
    const locales = (await fs.readdir(LOCALES_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    if (!locales.includes(BASE_LOCALE)) {
      warn(`Base locale "${BASE_LOCALE}" not found under src/locales`);
      process.exit(1);
    }

    const baseResources = await collectLocaleData(BASE_LOCALE);

    let hasErrors = false;

    for (const locale of locales) {
      const resources = await collectLocaleData(locale);

      for (const [namespace, baseKeys] of baseResources.entries()) {
        const localeKeys = resources.get(namespace);
        if (!localeKeys) {
          warn(`⚠️  Missing namespace "${namespace}" for locale "${locale}"`);
          hasErrors = true;
          continue;
        }

        const missing = Object.keys(baseKeys).filter((key) => !(key in localeKeys));
        if (missing.length > 0) {
          warn(`⚠️  Locale "${locale}" is missing keys in "${namespace}":\n    ${missing.join('\n    ')}`);
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      process.exitCode = 1;
    } else {
      log('✅ i18n check passed');
    }
  } catch (error) {
    warn(`Failed to validate translations: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

await main();
