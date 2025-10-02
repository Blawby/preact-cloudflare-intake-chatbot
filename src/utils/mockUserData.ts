// Mock User Data Service
// This provides consistent mock data for development until the real API is ready

export type SubscriptionTier = 'free' | 'plus' | 'business';
export type Language = 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'pt' | 'it' | 'ru' | 'nl' | 'pl' | 'ar' | 'ko' | 'sv' | 'no' | 'fi' | 'tr' | 'pt-BR';

// Comprehensive country-to-language mapping
export const COUNTRY_TO_LANGUAGE_MAP: Record<string, Language> = {
  // English-speaking countries
  'us': 'en',
  'gb': 'en',
  'au': 'en',
  'ca': 'en',
  'nz': 'en',
  'ie': 'en',
  'za': 'en',
  'sg': 'en',
  'hk': 'en',
  'in': 'en',
  'ph': 'en',
  'my': 'en',
  'ng': 'en',
  'ke': 'en',
  'gh': 'en',
  'tz': 'en',
  'ug': 'en',
  'zw': 'en',
  'zm': 'en',
  'bw': 'en',
  'ls': 'en',
  'sz': 'en',
  'mw': 'en',
  'mt': 'en',
  'cy': 'en',
  'jm': 'en',
  'bb': 'en',
  'tt': 'en',
  'bs': 'en',
  'bz': 'en',
  'gy': 'en',
  'ag': 'en',
  'kn': 'en',
  'lc': 'en',
  'vc': 'en',
  'gd': 'en',
  'dm': 'en',
  'sl': 'en',
  'lr': 'en',
  'gm': 'en',
  'sc': 'en',
  'mu': 'en',
  'na': 'en',
  
  // Vietnamese
  'vn': 'vi',
  
  // Spanish-speaking countries
  'es': 'es',
  'mx': 'es',
  'ar': 'es',
  'co': 'es',
  'pe': 'es',
  've': 'es',
  'cl': 'es',
  'ec': 'es',
  'gt': 'es',
  'cu': 'es',
  'bo': 'es',
  'do': 'es',
  'hn': 'es',
  'py': 'es',
  'sv': 'es',
  'ni': 'es',
  'cr': 'es',
  'pa': 'es',
  'uy': 'es',
  'pr': 'es',
  'gq': 'es',
  'ad': 'es',
  
  // French-speaking countries
  'fr': 'fr',
  'be': 'fr', // Wallonia
  'lu': 'fr',
  'mc': 'fr',
  'sn': 'fr',
  'ci': 'fr',
  'ml': 'fr',
  'bf': 'fr',
  'ne': 'fr',
  'td': 'fr',
  'mg': 'fr',
  'cm': 'fr',
  'cd': 'fr',
  'cg': 'fr',
  'cf': 'fr',
  'ga': 'fr',
  'dj': 'fr',
  'km': 'fr',
  'vu': 'fr',
  'nc': 'fr',
  'pf': 'fr',
  'wf': 'fr',
  'yt': 'fr',
  're': 'fr',
  'gp': 'fr',
  'mq': 'fr',
  'gf': 'fr',
  'pm': 'fr',
  'bl': 'fr',
  'mf': 'fr',
  'ht': 'fr',
  
  // German-speaking countries
  'de': 'de',
  'at': 'de',
  'ch': 'de', // German-speaking regions
  'li': 'de',
  
  // Chinese-speaking countries/regions
  'cn': 'zh',
  'tw': 'zh',
  'mo': 'zh',
  
  // Japanese
  'jp': 'ja',
  
  // Portuguese-speaking countries
  'pt': 'pt',
  'br': 'pt-BR',
  'ao': 'pt',
  'mz': 'pt',
  'gw': 'pt',
  'cv': 'pt',
  'st': 'pt',
  'tl': 'pt',
  
  // Italian
  'it': 'it',
  'sm': 'it',
  'va': 'it',
  
  // Russian
  'ru': 'ru',
  'by': 'ru',
  'kz': 'ru',
  'kg': 'ru',
  'tj': 'ru',
  'uz': 'ru',
  'tm': 'ru',
  'md': 'ru',
  'ua': 'ru',
  'am': 'ru',
  'az': 'ru',
  'ge': 'ru',
  'mn': 'ru',
  
  // Dutch
  'nl': 'nl',
  'sr': 'nl',
  'aw': 'nl',
  'cw': 'nl',
  'sx': 'nl',
  'bq': 'nl',
  
  // Polish
  'pl': 'pl',
  
  // Arabic-speaking countries
  'sa': 'ar',
  'ae': 'ar',
  'eg': 'ar',
  'iq': 'ar',
  'jo': 'ar',
  'lb': 'ar',
  'sy': 'ar',
  'ye': 'ar',
  'om': 'ar',
  'kw': 'ar',
  'qa': 'ar',
  'bh': 'ar',
  'ly': 'ar',
  'tn': 'ar',
  'dz': 'ar',
  'ma': 'ar',
  'sd': 'ar',
  'so': 'ar',
  'mr': 'ar',
  'ps': 'ar',
  
  // Korean
  'kr': 'ko',
  'kp': 'ko',
  
  // Swedish
  'se': 'sv',
  
  // Norwegian
  'no': 'no',
  
  // Finnish
  'fi': 'fi',
  
  // Turkish
  'tr': 'tr',
};

/**
 * Get the appropriate language for a given country code
 * @param country - ISO 3166-1 alpha-2 country code
 * @returns Language code, defaults to 'en' if country not found
 */
export function getLanguageForCountry(country: string): Language {
  return COUNTRY_TO_LANGUAGE_MAP[country.toLowerCase()] || 'en';
}

export interface MockUserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  preferredContactMethod: 'email' | 'phone' | 'sms';
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

export interface MockUserPreferences {
  theme: 'light' | 'dark' | 'system';
  accentColor: 'default' | 'blue' | 'green' | 'purple' | 'red';
  fontSize: 'small' | 'medium' | 'large';
  language: 'auto-detect' | Language;
  spokenLanguage: 'auto-detect' | Language;
  country: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12-hour' | '24-hour';
  autoSaveConversations: boolean;
  typingIndicators: boolean;
}

export interface MockSecuritySettings {
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  loginAlerts: boolean;
  sessionTimeout: '1 hour' | '1 day' | '7 days' | '30 days';
  lastPasswordChange: string | null;
  connectedAccounts: Array<{
    provider: string;
    email: string;
    connectedAt: string;
  }>;
}

export interface MockUserLinks {
  selectedDomain: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
  customDomains: Array<{
    domain: string;
    verified: boolean;
    verifiedAt: string | null;
  }>;
}

export interface MockEmailSettings {
  email: string;
  receiveFeedbackEmails: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

export interface MockNotificationSettings {
  responses: {
    push: boolean;
  };
  tasks: {
    push: boolean;
    email: boolean;
  };
  messaging: {
    push: boolean;
  };
}

// Default mock user data function - generates fresh timestamp each time
export function getDefaultMockUser(): MockUserProfile {
  return {
    id: 'mock-user-123',
    name: 'Steve Chris',
    email: 'steve@example.com',
    image: null, // Will show initials instead
    bio: 'This is a demo user for testing the settings interface.',
    phone: '+1 (555) 123-4567',
    secondaryPhone: null,
    addressStreet: '123 Main Street',
    addressCity: 'Raleigh',
    addressState: 'NC',
    addressZip: '27601',
    addressCountry: 'US',
    preferredContactMethod: 'email',
    subscriptionTier: 'free',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  };
}

// Backward compatibility - keep the constant for any external usage
const _DEFAULT_MOCK_USER: MockUserProfile = getDefaultMockUser();

const DEFAULT_PREFERENCES: MockUserPreferences = {
  theme: 'system',
  accentColor: 'default',
  fontSize: 'medium',
  language: 'vi',
  spokenLanguage: 'vi',
  country: 'vn',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12-hour',
  autoSaveConversations: true,
  typingIndicators: true
};

const DEFAULT_SECURITY_SETTINGS: MockSecuritySettings = {
  twoFactorEnabled: false,
  emailNotifications: true,
  loginAlerts: true,
  sessionTimeout: '7 days',
  lastPasswordChange: '2024-01-01T00:00:00Z',
  connectedAccounts: [
    {
      provider: 'google',
      email: 'demo@example.com',
      connectedAt: '2024-01-01T00:00:00Z'
    }
  ]
};

// Default mock links data
const DEFAULT_MOCK_LINKS: MockUserLinks = {
  selectedDomain: 'Select a domain',
  linkedinUrl: null,
  githubUrl: null,
  customDomains: []
};

// Default mock email settings
const DEFAULT_MOCK_EMAIL: MockEmailSettings = {
  email: 'chris@whynot.earth',
  receiveFeedbackEmails: false,
  marketingEmails: true,
  securityAlerts: true
};

// Default mock notification settings
const DEFAULT_MOCK_NOTIFICATIONS: MockNotificationSettings = {
  responses: {
    push: true
  },
  tasks: {
    push: true,
    email: true
  },
  messaging: {
    push: true
  }
};

// Storage keys
const STORAGE_KEYS = {
  USER_PROFILE: 'mockUserProfile',
  PREFERENCES: 'mockUserPreferences',
  SECURITY: 'mockSecuritySettings',
  LINKS: 'mockUserLinks',
  EMAIL: 'mockEmailSettings',
  NOTIFICATIONS: 'mockNotificationSettings'
} as const;

class MockUserDataService {
  // Safe storage access helper
  private getStorage(): Storage | null {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  }

  // User Profile Methods
  getUserProfile(): MockUserProfile {
    const storage = this.getStorage();
    if (!storage) {
      return getDefaultMockUser();
    }

    try {
      const stored = storage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default user
        const defaultUser = getDefaultMockUser();
        const hydrated = { ...defaultUser, ...parsed };
        return hydrated;
      }
    } catch (_error) {
      // Failed to parse stored user profile
    }
    
    // Return default and store it
    const defaultUser = getDefaultMockUser();
    this.setUserProfile(defaultUser);
    return defaultUser;
  }

  setUserProfile(profile: Partial<MockUserProfile>): MockUserProfile {
    const storage = this.getStorage();
    if (!storage) {
      return getDefaultMockUser();
    }

    let current: MockUserProfile;
    try {
      const stored = storage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default user
        const defaultUser = getDefaultMockUser();
        current = { ...defaultUser, ...parsed };
      } else {
        current = getDefaultMockUser();
      }
    } catch (_error) {
      // Failed to parse stored user profile
      current = getDefaultMockUser();
    }
    
    const updated = {
      ...current,
      ...profile,
      updatedAt: new Date().toISOString()
    };
    
    storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    return updated;
  }

  // Preferences Methods
  getPreferences(): MockUserPreferences {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_PREFERENCES;
    }

    try {
      const stored = storage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default preferences
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (_error) {
      // Failed to parse stored preferences
    }
    
    // Return default and store it
    this.setPreferences(DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  }

  setPreferences(preferences: Partial<MockUserPreferences>): MockUserPreferences {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_PREFERENCES;
    }

    let current: MockUserPreferences;
    try {
      const stored = storage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default preferences
        current = { ...DEFAULT_PREFERENCES, ...parsed };
      } else {
        current = DEFAULT_PREFERENCES;
      }
    } catch (_error) {
      // Failed to parse stored preferences
      current = DEFAULT_PREFERENCES;
    }
    
    const updated = { ...current, ...preferences };
    
    storage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  }

  // Security Settings Methods
  getSecuritySettings(): MockSecuritySettings {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_SECURITY_SETTINGS;
    }

    try {
      const stored = storage.getItem(STORAGE_KEYS.SECURITY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default security settings
        return { ...DEFAULT_SECURITY_SETTINGS, ...parsed };
      }
    } catch (_error) {
      // Failed to parse stored security settings
    }
    
    // Return default and store it
    this.setSecuritySettings(DEFAULT_SECURITY_SETTINGS);
    return DEFAULT_SECURITY_SETTINGS;
  }

  setSecuritySettings(settings: Partial<MockSecuritySettings>): MockSecuritySettings {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_SECURITY_SETTINGS;
    }

    let current: MockSecuritySettings;
    try {
      const stored = storage.getItem(STORAGE_KEYS.SECURITY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default security settings
        current = { ...DEFAULT_SECURITY_SETTINGS, ...parsed };
      } else {
        current = DEFAULT_SECURITY_SETTINGS;
      }
    } catch (_error) {
      // Failed to parse stored security settings
      current = DEFAULT_SECURITY_SETTINGS;
    }
    
    const updated = { ...current, ...settings };
    
    storage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(updated));
    return updated;
  }

  // Avatar Methods
  uploadAvatar(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Convert file to persistent data URL using FileReader
      const reader = new FileReader();
      
      reader.onload = () => {
        // Simulate file upload delay
        setTimeout(() => {
          const dataUrl = reader.result as string;
          
          // Update user profile with new avatar (data URL persists across reloads)
          this.setUserProfile({ image: dataUrl });
          
          resolve(dataUrl);
        }, 1000);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file as data URL'));
      };
      
      // Read file as data URL (base64 encoded)
      reader.readAsDataURL(file);
    });
  }

  deleteAvatar(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Note: No need to revoke data URLs (they're just strings), 
        // unlike blob URLs which need URL.revokeObjectURL()
        this.setUserProfile({ image: null });
        resolve();
      }, 500);
    });
  }

  // Password Methods
  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate password validation
        if (currentPassword.length < 1) {
          reject(new Error('Current password is required'));
          return;
        }
        
        if (newPassword.length < 8) {
          reject(new Error('New password must be at least 8 characters'));
          return;
        }
        
        // Update last password change
        this.setSecuritySettings({
          lastPasswordChange: new Date().toISOString()
        });
        
        resolve();
      }, 1000);
    });
  }

  // Subscription Methods
  setSubscriptionTier(tier: SubscriptionTier): MockUserProfile {
    return this.setUserProfile({ subscriptionTier: tier });
  }

  // Utility Methods
  resetToDefaults(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(STORAGE_KEYS.USER_PROFILE);
    storage.removeItem(STORAGE_KEYS.PREFERENCES);
    storage.removeItem(STORAGE_KEYS.SECURITY);
    storage.removeItem(STORAGE_KEYS.LINKS);
    storage.removeItem(STORAGE_KEYS.EMAIL);
    storage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  }

  deleteAccount(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const storage = this.getStorage();
        if (!storage) {
          resolve();
          return;
        }

        // Clear all user data
        this.resetToDefaults();
        
        // Also clear any other user-related data
        storage.removeItem('mockUser');
        storage.removeItem('conversations');
        storage.removeItem('chatHistory');
        storage.removeItem('uploadedFiles');
        
        // Clear any other app-specific data that might exist
        const keysToRemove = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key.startsWith('user_') || key.startsWith('chat_') || key.startsWith('conversation_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
        
        resolve();
      }, 500); // Simulate API delay
    });
  }

  // Links Methods
  getUserLinks(): MockUserLinks {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MOCK_LINKS;
    }

    try {
      const stored = storage.getItem(STORAGE_KEYS.LINKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default links
        return { ...DEFAULT_MOCK_LINKS, ...parsed };
      }
    } catch (_error) {
      // Failed to parse stored links
    }
    
    // Return default and store it
    this.setUserLinks(DEFAULT_MOCK_LINKS);
    return DEFAULT_MOCK_LINKS;
  }

  setUserLinks(links: Partial<MockUserLinks>): MockUserLinks {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MOCK_LINKS;
    }

    let current: MockUserLinks;
    try {
      const stored = storage.getItem(STORAGE_KEYS.LINKS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default links
        current = { ...DEFAULT_MOCK_LINKS, ...parsed };
      } else {
        current = DEFAULT_MOCK_LINKS;
      }
    } catch (_error) {
      current = DEFAULT_MOCK_LINKS;
    }
    
    const updated = {
      ...current,
      ...links
    };
    
    storage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(updated));
    return updated;
  }

  // Email Settings Methods
  getEmailSettings(): MockEmailSettings {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MOCK_EMAIL;
    }

    try {
      const stored = storage.getItem(STORAGE_KEYS.EMAIL);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default email settings
        return { ...DEFAULT_MOCK_EMAIL, ...parsed };
      }
    } catch (_error) {
      // Failed to parse stored email settings
    }
    
    // Return default and store it
    this.setEmailSettings(DEFAULT_MOCK_EMAIL);
    return DEFAULT_MOCK_EMAIL;
  }

  setEmailSettings(emailSettings: Partial<MockEmailSettings>): MockEmailSettings {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MOCK_EMAIL;
    }

    let current: MockEmailSettings;
    try {
      const stored = storage.getItem(STORAGE_KEYS.EMAIL);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default email settings
        current = { ...DEFAULT_MOCK_EMAIL, ...parsed };
      } else {
        current = DEFAULT_MOCK_EMAIL;
      }
    } catch (_error) {
      current = DEFAULT_MOCK_EMAIL;
    }
    
    const updated = {
      ...current,
      ...emailSettings
    };
    
    storage.setItem(STORAGE_KEYS.EMAIL, JSON.stringify(updated));
    return updated;
  }

  // Notification Settings Methods
  getNotificationSettings(): MockNotificationSettings {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MOCK_NOTIFICATIONS;
    }

    try {
      const stored = storage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default notification settings
        return { ...DEFAULT_MOCK_NOTIFICATIONS, ...parsed };
      }
    } catch (_error) {
      // Failed to parse stored notification settings
    }
    
    // Return default and store it
    this.setNotificationSettings(DEFAULT_MOCK_NOTIFICATIONS);
    return DEFAULT_MOCK_NOTIFICATIONS;
  }

  setNotificationSettings(notificationSettings: Partial<MockNotificationSettings>): MockNotificationSettings {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MOCK_NOTIFICATIONS;
    }

    let current: MockNotificationSettings;
    try {
      const stored = storage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrate missing fields from default notification settings
        current = { ...DEFAULT_MOCK_NOTIFICATIONS, ...parsed };
      } else {
        current = DEFAULT_MOCK_NOTIFICATIONS;
      }
    } catch (_error) {
      current = DEFAULT_MOCK_NOTIFICATIONS;
    }
    
    const updated = {
      ...current,
      ...notificationSettings
    };
    
    storage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    return updated;
  }

  exportData(): {
    profile: MockUserProfile;
    preferences: MockUserPreferences;
    security: MockSecuritySettings;
    links: MockUserLinks;
    email: MockEmailSettings;
    notifications: MockNotificationSettings;
  } {
    return {
      profile: this.getUserProfile(),
      preferences: this.getPreferences(),
      security: this.getSecuritySettings(),
      links: this.getUserLinks(),
      email: this.getEmailSettings(),
      notifications: this.getNotificationSettings()
    };
  }
}

// Export singleton instance
export const mockUserDataService = new MockUserDataService();

// Development helper - expose to window for easy testing
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).mockUserDataService = mockUserDataService;
  
  // Helper function to easily test different subscription tiers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).setSubscriptionTier = (tier: SubscriptionTier) => {
    try {
      const updatedProfile = mockUserDataService.setSubscriptionTier(tier);
      window.dispatchEvent(new CustomEvent('authStateChanged', { detail: updatedProfile }));
      // eslint-disable-next-line no-console
      console.log(`Subscription tier changed to: ${tier}`);
    } catch (_error) {
      // eslint-disable-next-line no-console
      console.log('No user logged in. Please sign in first.');
    }
  };
}
