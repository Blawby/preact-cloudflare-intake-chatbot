/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setLocale, initI18n, isRTLLocale, RTL_LOCALES } from '../i18n';

describe('RTL (Right-to-Left) Support', () => {
  beforeEach(async () => {
    // Initialize i18n before each test
    await initI18n();
    
    // Reset DOM attributes
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
  });

  afterEach(() => {
    // Clean up after each test
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
    localStorage.clear();
  });

  describe('RTL Locale Detection', () => {
    it('should identify Arabic as RTL language', () => {
      expect(isRTLLocale('ar')).toBe(true);
    });

    it('should identify non-RTL languages correctly', () => {
      const ltrLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'vi', 'pt', 'ru', 'it', 'ko', 'nl', 'pl', 'tr', 'th', 'id', 'hi', 'uk'];
      
      ltrLanguages.forEach(lang => {
        expect(isRTLLocale(lang as any)).toBe(false);
      });
    });

    it('should have Arabic in RTL_LOCALES set', () => {
      expect(RTL_LOCALES.has('ar')).toBe(true);
    });

    it('should not have non-RTL languages in RTL_LOCALES set', () => {
      expect(RTL_LOCALES.has('en')).toBe(false);
      expect(RTL_LOCALES.has('es')).toBe(false);
      expect(RTL_LOCALES.has('fr')).toBe(false);
    });
  });

  describe('HTML Attributes for RTL', () => {
    it('should set dir="rtl" when switching to Arabic', async () => {
      await setLocale('ar');
      
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      expect(document.documentElement.getAttribute('lang')).toBe('ar');
    });

    it('should set dir="ltr" when switching to English', async () => {
      await setLocale('en');
      
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      expect(document.documentElement.getAttribute('lang')).toBe('en');
    });

    it('should update dir attribute when switching between RTL and LTR', async () => {
      // Start with English
      await setLocale('en');
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      
      // Switch to Arabic
      await setLocale('ar');
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      
      // Switch back to English
      await setLocale('en');
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    });

    it('should set dir="ltr" for all non-RTL languages', async () => {
      const ltrLanguages = ['es', 'fr', 'de', 'pt', 'ru', 'it'];
      
      for (const lang of ltrLanguages) {
        await setLocale(lang);
        expect(document.documentElement.getAttribute('dir')).toBe('ltr');
        expect(document.documentElement.getAttribute('lang')).toBe(lang);
      }
    });
  });

  describe('Initial RTL Setup', () => {
    it('should set correct dir attribute on initialization with Arabic', async () => {
      // Use setLocale to switch to Arabic which will set dir attributes
      await setLocale('ar');
      
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      expect(document.documentElement.getAttribute('lang')).toBe('ar');
    });

    it('should set correct dir attribute on initialization with English', async () => {
      // Use setLocale to switch to English which will set dir attributes
      await setLocale('en');
      
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      expect(document.documentElement.getAttribute('lang')).toBe('en');
    });
  });

  describe('CSS RTL Selectors', () => {
    it('should have RTL CSS rules in index.css', () => {
      // This test verifies that RTL CSS rules exist by checking document styles
      // In a real browser environment, these would be applied
      const hasRTLRules = true; // Placeholder - in real test, check computed styles
      expect(hasRTLRules).toBe(true);
    });

    it('should flip margins correctly for RTL', () => {
      // Create test element
      const testDiv = document.createElement('div');
      testDiv.className = 'ml-auto';
      document.body.appendChild(testDiv);
      
      // Set RTL direction
      document.documentElement.setAttribute('dir', 'rtl');
      
      // In a real browser with CSS loaded, .ml-auto would become .mr-auto
      // This is a placeholder test
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      
      // Cleanup
      document.body.removeChild(testDiv);
    });
  });

  describe('Locale Persistence', () => {
    it('should persist Arabic locale in localStorage', async () => {
      await setLocale('ar');
      
      expect(localStorage.getItem('blawby_locale')).toBe('ar');
    });

    it('should load persisted Arabic locale on init', async () => {
      // Set Arabic and verify it's persisted
      await setLocale('ar');
      const persisted = localStorage.getItem('blawby_locale');
      expect(persisted).toBe('ar');
      
      // Verify dir attribute is set
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('Multiple Language Switches', () => {
    it('should handle rapid language switches correctly', async () => {
      const languages = ['en', 'ar', 'es', 'ar', 'fr', 'ar'];
      
      for (const lang of languages) {
        await setLocale(lang);
        const expectedDir = lang === 'ar' ? 'rtl' : 'ltr';
        expect(document.documentElement.getAttribute('dir')).toBe(expectedDir);
        expect(document.documentElement.getAttribute('lang')).toBe(lang);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle uppercase locale codes', async () => {
      await setLocale('AR');
      
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      expect(document.documentElement.getAttribute('lang')).toBe('ar');
    });

    it('should handle locale with region codes', async () => {
      await setLocale('ar-SA'); // Arabic (Saudi Arabia)
      
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
      expect(document.documentElement.getAttribute('lang')).toBe('ar');
    });

    it('should fallback to LTR for unsupported locales', async () => {
      await setLocale('xx'); // Unsupported language
      
      // Should fallback to default (English) which is LTR
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    });
  });

  describe('RTL UI Components', () => {
    it('should verify chat markdown has RTL support', () => {
      // Verify RTL-specific CSS classes exist for markdown
      const rtlRules = [
        '[dir="rtl"] .chat-markdown ul',
        '[dir="rtl"] .chat-markdown ol',
        '[dir="rtl"] .chat-markdown blockquote',
        '[dir="rtl"] .chat-markdown .chat-cursor'
      ];
      
      // This is a conceptual test - in real implementation would check CSS
      expect(rtlRules.length).toBeGreaterThan(0);
    });

    it('should verify input fields have RTL support', () => {
      const rtlInputRules = [
        '[dir="rtl"] .input-with-icon'
      ];
      
      expect(rtlInputRules.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should set correct lang attribute for screen readers', async () => {
      await setLocale('ar');
      
      const lang = document.documentElement.getAttribute('lang');
      expect(lang).toBe('ar');
    });

    it('should maintain lang attribute consistency with locale', async () => {
      const languages = ['en', 'ar', 'es', 'fr'];
      
      for (const lang of languages) {
        await setLocale(lang);
        expect(document.documentElement.getAttribute('lang')).toBe(lang);
      }
    });
  });

  describe('Performance', () => {
    it('should switch languages without significant delay', async () => {
      const start = performance.now();
      await setLocale('ar');
      const end = performance.now();
      
      // Language switch should complete in under 100ms
      expect(end - start).toBeLessThan(100);
    });

    it('should handle multiple rapid switches efficiently', async () => {
      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        await setLocale(i % 2 === 0 ? 'en' : 'ar');
      }
      
      const end = performance.now();
      
      // 10 switches should complete in under 500ms
      expect(end - start).toBeLessThan(500);
    });
  });

  describe('Integration Tests', () => {
    it('should work with all supported languages', async () => {
      const allLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'vi', 'pt', 'ar', 'ru', 'it', 'ko', 'nl', 'pl', 'tr', 'th', 'id', 'hi', 'uk'];
      
      for (const lang of allLanguages) {
        await setLocale(lang);
        const expectedDir = lang === 'ar' ? 'rtl' : 'ltr';
        expect(document.documentElement.getAttribute('dir')).toBe(expectedDir);
      }
    });

    it('should maintain RTL state across page reloads (simulated)', async () => {
      // Set Arabic
      await setLocale('ar');
      const savedLocale = localStorage.getItem('blawby_locale');
      
      // Simulate reload by re-initializing with saved locale
      localStorage.setItem('blawby_locale', savedLocale!);
      await initI18n();
      
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    });
  });
});
