#!/usr/bin/env node
/* eslint-env node */
import i18next from 'i18next';

import enCommon from '../src/locales/en/common.json' with { type: 'json' };
import enSettings from '../src/locales/en/settings.json' with { type: 'json' };
import enAuth from '../src/locales/en/auth.json' with { type: 'json' };
import enProfile from '../src/locales/en/profile.json' with { type: 'json' };
import esCommon from '../src/locales/es/common.json' with { type: 'json' };
import esSettings from '../src/locales/es/settings.json' with { type: 'json' };
import esAuth from '../src/locales/es/auth.json' with { type: 'json' };
import esProfile from '../src/locales/es/profile.json' with { type: 'json' };

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    auth: enAuth,
    profile: enProfile
  },
  es: {
    common: esCommon,
    settings: esSettings,
    auth: esAuth,
    profile: esProfile
  }
};

const REQUIRED_KEYS = [
  'settings:help.title',
  'settings:general.language.label',
  'settings:navigation.items.account',
  'settings:account.delete.sectionTitle',
  'settings:security.title',
  'common:notifications.settingsSavedTitle',
  'profile:menu.signIn',
  'profile:menu.signOut',
  'profile:menu.settings',
  'profile:aria.userProfile'
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
    ns: ['common', 'settings', 'auth', 'profile'],
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
