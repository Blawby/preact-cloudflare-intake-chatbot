import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import commonEn from '../locales/en/common.json';
import settingsEn from '../locales/en/settings.json';
import authEn from '../locales/en/auth.json';
import profileEn from '../locales/en/profile.json';
import pricingEn from '../locales/en/pricing.json';

export const DEFAULT_LOCALE = 'en' as const;

// Only includes languages that are ≥90% translated
// Translation files exist for all languages but incomplete ones are hidden from the UI selector
export const SUPPORTED_LOCALES = [
  'en',  // English - 100%
  'pt',  // Português - 100%
  'ar',  // العربية - 100%
  'es',  // Español - 97.7%
  'ja',  // 日本語 - 91.1%
  'zh',  // 中文 - 91.1%
  'vi',  // Tiếng Việt - 91.1%
  'de',  // Deutsch - 91.1%
  'fr',  // Français - 91.1%
] as const;

// Languages with incomplete translations (<90%) - files exist but not shown in selector:
// 'hi'  - हिन्दी - 75.5%
// 'uk'  - Українська - 75.5%
// 'id'  - Bahasa Indonesia - 75.5%
// 'th'  - ไทย - 62.4%
// 'ko'  - 한국어 - 53.7%
// 'pl'  - Polski - 53.7%
// 'nl'  - Nederlands - 53.7%
// 'it'  - Italiano - 53.7%
// 'ru'  - Русский - 53.7%
// 'tr'  - Türkçe - 39.9%

export type AppLocale = typeof SUPPORTED_LOCALES[number];

// RTL (Right-to-Left) languages
export const RTL_LOCALES: ReadonlySet<AppLocale> = new Set(['ar'] as const);

/**
 * Check if a locale uses RTL (Right-to-Left) text direction
 */
export const isRTLLocale = (locale: AppLocale): boolean => {
  return RTL_LOCALES.has(locale);
};

const NAMESPACES = ['common', 'settings', 'auth', 'profile', 'pricing'] as const;

const STORAGE_KEY = 'blawby_locale';
let initialized = false;

const staticResources = {
  en: {
    common: commonEn,
    settings: settingsEn,
    auth: authEn,
    profile: profileEn,
    pricing: pricingEn
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

  // Set initial HTML dir and lang attributes
  if (typeof window !== 'undefined') {
    const currentLocale = normalizeLocale(i18next.language);
    const isRTL = isRTLLocale(currentLocale);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLocale);
  }

  initialized = true;
  return i18next;
};

export const setLocale = async (nextLocale: string) => {
  const target = normalizeLocale(nextLocale);
  await loadLocaleResources(target);
  await i18next.changeLanguage(target);
  
  // Update text direction based on locale
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, target);
    
    // Set HTML dir attribute for RTL support
    const isRTL = isRTLLocale(target);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', target);
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
