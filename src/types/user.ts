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
  sessionTimeout?: string;
  lastPasswordChange?: string | null;
  
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
  onboardingData?: {
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
  };
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
  sessionTimeout: '1 hour' | '1 day' | '7 days' | '30 days';
  lastPasswordChange: string | null;
  connectedAccounts: Array<{
    provider: string;
    email: string;
    connectedAt: string;
  }>;
}

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
  sessionTimeout?: string;
  lastPasswordChange?: string | null;
  selectedDomain?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  onboardingCompleted?: boolean;
  onboardingData?: string | null;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

