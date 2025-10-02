// Mock User Data Service
// This provides consistent mock data for development until the real API is ready

export type SubscriptionTier = 'free' | 'plus' | 'business';
export type Language = 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

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
  language: 'auto-detect' | 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
  spokenLanguage: 'auto-detect' | 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
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
  // User Profile Methods
  getUserProfile(): MockUserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        return JSON.parse(stored);
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
    let current: MockUserProfile;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        current = JSON.parse(stored);
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
    
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    return updated;
  }

  // Preferences Methods
  getPreferences(): MockUserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_error) {
      // Failed to parse stored preferences
    }
    
    // Return default and store it
    this.setPreferences(DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  }

  setPreferences(preferences: Partial<MockUserPreferences>): MockUserPreferences {
    let current: MockUserPreferences;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        current = JSON.parse(stored);
      } else {
        current = DEFAULT_PREFERENCES;
      }
    } catch (_error) {
      // Failed to parse stored preferences
      current = DEFAULT_PREFERENCES;
    }
    
    const updated = { ...current, ...preferences };
    
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  }

  // Security Settings Methods
  getSecuritySettings(): MockSecuritySettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SECURITY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_error) {
      // Failed to parse stored security settings
    }
    
    // Return default and store it
    this.setSecuritySettings(DEFAULT_SECURITY_SETTINGS);
    return DEFAULT_SECURITY_SETTINGS;
  }

  setSecuritySettings(settings: Partial<MockSecuritySettings>): MockSecuritySettings {
    let current: MockSecuritySettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SECURITY);
      if (stored) {
        current = JSON.parse(stored);
      } else {
        current = DEFAULT_SECURITY_SETTINGS;
      }
    } catch (_error) {
      // Failed to parse stored security settings
      current = DEFAULT_SECURITY_SETTINGS;
    }
    
    const updated = { ...current, ...settings };
    
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(updated));
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
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
    localStorage.removeItem(STORAGE_KEYS.SECURITY);
    localStorage.removeItem(STORAGE_KEYS.LINKS);
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  }

  // Links Methods
  getUserLinks(): MockUserLinks {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LINKS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_error) {
      // Failed to parse stored links
    }
    
    // Return default and store it
    this.setUserLinks(DEFAULT_MOCK_LINKS);
    return DEFAULT_MOCK_LINKS;
  }

  setUserLinks(links: Partial<MockUserLinks>): MockUserLinks {
    let current: MockUserLinks;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LINKS);
      if (stored) {
        current = JSON.parse(stored);
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
    
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(updated));
    return updated;
  }

  // Email Settings Methods
  getEmailSettings(): MockEmailSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EMAIL);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_error) {
      // Failed to parse stored email settings
    }
    
    // Return default and store it
    this.setEmailSettings(DEFAULT_MOCK_EMAIL);
    return DEFAULT_MOCK_EMAIL;
  }

  setEmailSettings(emailSettings: Partial<MockEmailSettings>): MockEmailSettings {
    let current: MockEmailSettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EMAIL);
      if (stored) {
        current = JSON.parse(stored);
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
    
    localStorage.setItem(STORAGE_KEYS.EMAIL, JSON.stringify(updated));
    return updated;
  }

  // Notification Settings Methods
  getNotificationSettings(): MockNotificationSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_error) {
      // Failed to parse stored notification settings
    }
    
    // Return default and store it
    this.setNotificationSettings(DEFAULT_MOCK_NOTIFICATIONS);
    return DEFAULT_MOCK_NOTIFICATIONS;
  }

  setNotificationSettings(notificationSettings: Partial<MockNotificationSettings>): MockNotificationSettings {
    let current: MockNotificationSettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        current = JSON.parse(stored);
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
    
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
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
