import { useTranslation as useI18nTranslation } from 'react-i18next';

export interface TranslationOptions {
  namespace?: string;
  defaultValue?: string;
  count?: number;
  interpolation?: Record<string, any>;
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
    const translation = translate(key, options);
    if (translation === key) {
      return translate(fallbackKey, options);
    }
    return translation;
  };

  return {
    t: translate,
    tFallback: translateWithFallback,
    i18n,
    isReady: i18n.isInitialized,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}
