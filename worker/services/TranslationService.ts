import { en } from '../locales/en.js';
import { es } from '../locales/es.js';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  fallback?: string;
}

export interface LocalizedContent {
  [key: string]: {
    [languageCode: string]: string;
  };
}

export class TranslationService {
  private static supportedLanguages: { [key: string]: LanguageConfig } = {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr'
    },
    es: {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      direction: 'ltr',
      fallback: 'en'
    }
  };

  private static translations = {
    en,
    es
  };

  /**
   * Detect language from user input
   */
  static detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Simple language detection based on common words
    const spanishWords = ['hola', 'gracias', 'por favor', 'ayuda', 'necesito', 'problema', 'abogado', 'legal'];
    const spanishCount = spanishWords.filter(word => lowerText.includes(word)).length;
    
    if (spanishCount > 0) {
      return 'es';
    }
    
    return 'en'; // Default to English
  }

  /**
   * Get translation for a specific key and language
   */
  static getTranslation(key: string, language: string, params?: { [key: string]: string }): string {
    const lang = this.supportedLanguages[language] ? language : 'en';
    const translation = this.translations[lang]?.messages?.[key];
    
    if (!translation) {
      // Fallback to English
      const fallbackTranslation = this.translations.en?.messages?.[key];
      if (!fallbackTranslation) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      return this.interpolate(fallbackTranslation, params);
    }
    
    return this.interpolate(translation, params);
  }

  /**
   * Get system prompt for a specific language
   */
  static getSystemPrompt(language: string): string {
    const lang = this.supportedLanguages[language] ? language : 'en';
    return this.translations[lang]?.systemPrompt || this.translations.en.systemPrompt;
  }

  /**
   * Interpolate parameters into translation string
   */
  private static interpolate(text: string, params?: { [key: string]: string }): string {
    if (!params) return text;
    
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] || match;
    });
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): LanguageConfig[] {
    return Object.values(this.supportedLanguages);
  }

  /**
   * Check if language is supported
   */
  static isLanguageSupported(language: string): boolean {
    return !!this.supportedLanguages[language];
  }

  /**
   * Get fallback language for a given language
   */
  static getFallbackLanguage(language: string): string {
    return this.supportedLanguages[language]?.fallback || 'en';
  }

  /**
   * Translate matter types to the specified language
   */
  static translateMatterType(matterType: string, language: string): string {
    const lang = this.supportedLanguages[language] ? language : 'en';
    const matterTypes = this.translations[lang]?.messages?.matterTypes;
    
    if (!matterTypes) {
      return matterType; // Return original if no translation
    }
    
    // Map English matter types to translated versions
    const matterTypeMap: { [key: string]: string } = {
      'Family Law': matterTypes.familyLaw,
      'Employment Law': matterTypes.employmentLaw,
      'Personal Injury': matterTypes.personalInjury,
      'Civil Law': matterTypes.civilLaw,
      'Criminal Law': matterTypes.criminalLaw,
      'General Consultation': matterTypes.generalConsultation
    };
    
    return matterTypeMap[matterType] || matterType;
  }

  /**
   * Translate urgency levels to the specified language
   */
  static translateUrgency(urgency: string, language: string): string {
    const lang = this.supportedLanguages[language] ? language : 'en';
    const urgencyLevels = this.translations[lang]?.messages?.urgency;
    
    if (!urgencyLevels) {
      return urgency; // Return original if no translation
    }
    
    const urgencyMap: { [key: string]: string } = {
      'low': urgencyLevels.low,
      'medium': urgencyLevels.medium,
      'high': urgencyLevels.high,
      'urgent': urgencyLevels.urgent
    };
    
    return urgencyMap[urgency] || urgency;
  }
} 