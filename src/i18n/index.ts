import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import commonEn from '../locales/en/common.json';
import settingsEn from '../locales/en/settings.json';
import authEn from '../locales/en/auth.json';
import profileEn from '../locales/en/profile.json';
import organizationEn from '../locales/en/organization.json';

export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'vi'] as const;
export type AppLocale = typeof SUPPORTED_LOCALES[number];

const NAMESPACES = ['common', 'settings', 'auth', 'profile', 'organization'] as const;

const STORAGE_KEY = 'blawby_locale';
let initialized = false;

const staticResources = {
  en: {
    common: commonEn,
    settings: settingsEn,
    auth: authEn,
    profile: profileEn,
    organization: organizationEn
  }
};

const isSupportedLocale = (locale: string): locale is AppLocale => {
  return SUPPORTED_LOCALES.includes(locale as AppLocale);
};

const normalizeLocale = (locale?: string | null): AppLocale => {
  if (!locale) return DEFAULT_LOCALE;
  const lower = locale.toLowerCase();
  const explicitMatch = isSupportedLocale(lower) ? lower : null;
  if (explicitMatch) return explicitMatch;

  const match = SUPPORTED_LOCALES.find((supported) => lower.startsWith(`${supported}-`));
  return match ?? DEFAULT_LOCALE;
};

const loadLocaleResources = async (locale: AppLocale) => {
  if (locale === DEFAULT_LOCALE) {
    return;
  }

  const namespaceData = await Promise.all(
    NAMESPACES.map(async (namespace) => {
      const module = await import(/* @vite-ignore */ `../locales/${locale}/${namespace}.json`);
      return [namespace, module.default] as const;
    })
  );

  namespaceData.forEach(([namespace, data]) => {
    const alreadyLoaded = i18next.getResourceBundle(locale, namespace);
    if (!alreadyLoaded) {
      i18next.addResourceBundle(locale, namespace, data, true, true);
    }
  });
};

export const initI18n = async () => {
  if (initialized) {
    return i18next;
  }

  const initialLocale = normalizeLocale(
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : undefined
  );

  await i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: staticResources,
      fallbackLng: DEFAULT_LOCALE,
      lng: initialLocale,
      load: 'languageOnly',
      supportedLngs: [...SUPPORTED_LOCALES],
      ns: [...NAMESPACES],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false
      },
      detection: {
        order: ['querystring', 'localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: STORAGE_KEY
      },
      react: {
        useSuspense: true
      }
    });

  await loadLocaleResources(normalizeLocale(i18next.language));

  initialized = true;
  return i18next;
};

export const setLocale = async (nextLocale: string) => {
  const target = normalizeLocale(nextLocale);
  await loadLocaleResources(target);
  await i18next.changeLanguage(target);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, target);
  }
};

export const detectBestLocale = (): AppLocale => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const [primary] = navigator.language.split('-');
  return normalizeLocale(primary);
};

export { i18next as i18n };
