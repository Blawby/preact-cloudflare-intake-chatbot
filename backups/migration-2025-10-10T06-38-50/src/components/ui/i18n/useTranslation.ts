import { useTranslation as useI18nTranslation } from 'react-i18next';

export interface TranslationOptions {
  defaultValue?: string;
  count?: number;
  interpolation?: Record<string, unknown>;
}

export function useTranslation(namespace: string = 'common') {
  const { t, i18n } = useI18nTranslation(namespace);

  const translate = (key: string, options?: TranslationOptions) => {
    const {
      defaultValue,
      count,
      interpolation = {},
    } = options || {};

    return t(key, {
      defaultValue,
      count,
      ...interpolation,
    });
  };

  const translateWithFallback = (key: string, fallbackKey: string, options?: TranslationOptions) => {
    // Check if the translation key exists using i18n existence API
    // If key doesn't contain ':', check against the active namespace
    const keyExists = key.includes(':') 
      ? i18n.exists(key)
      : i18n.exists(key, { ns: namespace });
    
    if (!keyExists) {
      return translate(fallbackKey, options);
    }
    return translate(key, options);
  };

  return {
    t: translate,
    tFallback: translateWithFallback,
    i18n,
    isReady: i18n.isInitialized,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage.bind(i18n),
  };
}
