import { useState, useEffect } from 'preact/hooks';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }
];

interface LanguageSelectorProps {
  onLanguageChange: (language: string) => void;
  currentLanguage?: string;
}

export function LanguageSelector({ onLanguageChange, currentLanguage = 'en' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage) || SUPPORTED_LANGUAGES[0]
  );

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      const language = SUPPORTED_LANGUAGES.find(lang => lang.code === savedLanguage);
      if (language) {
        setSelectedLanguage(language);
        onLanguageChange(savedLanguage);
      }
    }
  }, [onLanguageChange]);

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setIsOpen(false);
    localStorage.setItem('preferredLanguage', language.code);
    onLanguageChange(language.code);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="text-lg">
          {selectedLanguage.flag}
        </span>
        <span>{selectedLanguage.nativeName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  selectedLanguage.code === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">
                    {language.flag}
                  </span>
                  <span>{language.nativeName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 