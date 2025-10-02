#!/usr/bin/env node
/* eslint-env node */
import i18next from 'i18next';

import enCommon from '../src/locales/en/common.json' assert { type: 'json' };
import enSettings from '../src/locales/en/settings.json' assert { type: 'json' };
import esCommon from '../src/locales/es/common.json' assert { type: 'json' };
import esSettings from '../src/locales/es/settings.json' assert { type: 'json' };

const resources = {
  en: {
    common: enCommon,
    settings: enSettings
  },
  es: {
    common: esCommon,
    settings: esSettings
  }
};

const REQUIRED_KEYS = [
  'settings:help.title',
  'settings:general.language.label',
  'settings:navigation.items.account',
  'settings:account.delete.sectionTitle',
  'settings:security.title',
  'common:notifications.settingsSavedTitle'
];

const fail = (message) => {
  process.stderr.write(`❌ ${message}\n`);
  process.exitCode = 1;
};

const pass = (message) => {
  process.stdout.write(`✅ ${message}\n`);
};

const run = async () => {
  await i18next.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'settings'],
    defaultNS: 'common',
    interpolation: { escapeValue: false }
  });

  for (const key of REQUIRED_KEYS) {
    const english = i18next.t(key);
    if (!english || english === key) {
      fail(`Missing English translation for ${key}`);
      continue;
    }

    await i18next.changeLanguage('es');
    const spanish = i18next.t(key);
    await i18next.changeLanguage('en');

    if (!spanish || spanish === key) {
      fail(`Missing Spanish translation for ${key}`);
    } else if (spanish === english) {
      fail(`Spanish translation for ${key} matches English; double-check localization.`);
    }
  }

  if (process.exitCode !== 1) {
    pass('i18n smoke test passed');
  }
};

run().catch((error) => {
  fail(`i18n smoke test failed: ${error?.message ?? error}`);
});
