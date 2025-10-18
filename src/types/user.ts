// TypeScript types for user data that match Better Auth schema
// These types are derived from the additionalFields defined in worker/auth/index.ts

// Subscription tier type matching database enum
export type SubscriptionTier = 'free' | 'plus' | 'business' | 'enterprise';

// Onboarding data type (extracted from UserPreferences for standalone use)
export interface OnboardingData {
  personalInfo: {
    fullName: string;
    birthday?: string;
    agreedToTerms: boolean;
  };
  useCase: {
    primaryUseCase: 'personal' | 'business' | 'research' | 'documents' | 'other';
    additionalInfo?: string;
  };
  completedAt?: string;
  skippedSteps: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  organizationId?: string | null;
  role?: string | null;
  phone?: string | null;
  
  // Profile Information
  bio?: string | null;
  secondaryPhone?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  addressCountry?: string | null;
  preferredContactMethod?: string | null;
  
  // App Preferences
  theme?: string;
  accentColor?: string;
  fontSize?: string;
  language?: string;
  spokenLanguage?: string;
  country?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  
  // Chat Preferences
  autoSaveConversations?: boolean;
  typingIndicators?: boolean;
  
  // Notification Settings
  notificationResponsesPush?: boolean;
  notificationTasksPush?: boolean;
  notificationTasksEmail?: boolean;
  notificationMessagingPush?: boolean;
  
  // Email Settings
  receiveFeedbackEmails?: boolean;
  marketingEmails?: boolean;
  securityAlerts?: boolean;
  
  // Security Settings
  twoFactorEnabled?: boolean;
  emailNotifications?: boolean;
  loginAlerts?: boolean;
  sessionTimeout?: number;
  lastPasswordChange?: Date | null;
  
  // Links
  selectedDomain?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  
  // Onboarding
  onboardingCompleted?: boolean;
  onboardingData?: string | null; // JSON string
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  // App Preferences
  theme: 'light' | 'dark' | 'system';
  accentColor: 'default' | 'blue' | 'green' | 'purple' | 'red';
  fontSize: 'small' | 'medium' | 'large';
  language: 'auto-detect' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'vi' | 'zh';
  spokenLanguage: 'auto-detect' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'vi' | 'zh';
  country: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12-hour' | '24-hour';
  
  // Chat Preferences
  autoSaveConversations: boolean;
  typingIndicators: boolean;
  
  // Onboarding
  onboardingCompleted?: boolean;
  onboardingData?: OnboardingData;
}

export interface NotificationSettings {
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

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  loginAlerts: boolean;
  sessionTimeout: number; // Timeout in seconds
  lastPasswordChange: Date | null;
  connectedAccounts: Array<{
    provider: string;
    email: string;
    connectedAt: string;
  }>;
}

// Helper functions for session timeout conversion
export const SESSION_TIMEOUT_OPTIONS = {
  '1 hour': 3600,      // 1 hour in seconds
  '1 day': 86400,      // 1 day in seconds  
  '7 days': 604800,    // 7 days in seconds
  '30 days': 2592000   // 30 days in seconds
} as const;

export type SessionTimeoutOption = keyof typeof SESSION_TIMEOUT_OPTIONS;

export const convertSessionTimeoutToSeconds = (timeout: string | number): number => {
  if (typeof timeout === 'number') {
    return timeout;
  }
  
  // Handle legacy string values
  const seconds = SESSION_TIMEOUT_OPTIONS[timeout as SessionTimeoutOption];
  if (seconds !== undefined) {
    return seconds;
  }
  
  // Default to 7 days if invalid value
  return SESSION_TIMEOUT_OPTIONS['7 days'];
};

export const convertSessionTimeoutToString = (timeout: number): SessionTimeoutOption => {
  // Find the matching string value
  for (const [key, value] of Object.entries(SESSION_TIMEOUT_OPTIONS)) {
    if (value === timeout) {
      return key as SessionTimeoutOption;
    }
  }
  
  // Default to 7 days if no match found
  return '7 days';
};

export interface UserLinks {
  selectedDomain: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
  customDomains: Array<{
    domain: string;
    verified: boolean;
    verifiedAt: string | null;
  }>;
}

export interface EmailSettings {
  email: string;
  receiveFeedbackEmails: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

// Type for updating user data via Better Auth
export type UserUpdateData = Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>>;

// Helper type for Better Auth session user (what we get from useSession)
export interface BetterAuthSessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  lastLoginMethod?: string; // "google", "email", etc.
  organizationId?: string | null;
  role?: string | null;
  phone?: string | null;
  
  // All the additional fields we added
  bio?: string | null;
  secondaryPhone?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  addressCountry?: string | null;
  preferredContactMethod?: string | null;
  theme?: string;
  accentColor?: string;
  fontSize?: string;
  language?: string;
  spokenLanguage?: string;
  country?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  autoSaveConversations?: boolean;
  typingIndicators?: boolean;
  notificationResponsesPush?: boolean;
  notificationTasksPush?: boolean;
  notificationTasksEmail?: boolean;
  notificationMessagingPush?: boolean;
  receiveFeedbackEmails?: boolean;
  marketingEmails?: boolean;
  securityAlerts?: boolean;
  twoFactorEnabled?: boolean;
  emailNotifications?: boolean;
  loginAlerts?: boolean;
  sessionTimeout?: number;
  lastPasswordChange?: Date | null;
  selectedDomain?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  customDomains?: string | null; // JSON string of custom domains array
  
  // PII Compliance & Consent
  piiConsentGiven?: boolean;
  piiConsentDate?: number;
  dataRetentionConsent?: boolean;
  marketingConsent?: boolean;
  dataProcessingConsent?: boolean;
  
  // Data Retention & Deletion
  dataRetentionExpiry?: number;
  lastDataAccess?: number;
  dataDeletionRequested?: boolean;
  dataDeletionDate?: number;
  
  onboardingCompleted?: boolean;
  onboardingData?: string | null;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

