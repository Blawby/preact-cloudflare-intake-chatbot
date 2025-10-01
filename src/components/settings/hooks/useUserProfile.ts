import { useState, useEffect, useCallback } from 'preact/hooks';
import { authClient } from '../../../lib/authClient';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  teamId?: string | null;
  role?: string | null;
  phone?: string | null;
  // Profile Information
  bio?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  addressCountry?: string | null;
  secondaryPhone?: string | null;
  preferredContactMethod?: string | null;
  // App Preferences
  theme?: string;
  accentColor?: string;
  fontSize?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  // Notification Preferences
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: string;
  // Chat Preferences
  autoSaveConversations?: boolean;
  typingIndicators?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInput {
  // Profile Information
  name?: string;
  bio?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  secondaryPhone?: string;
  preferredContactMethod?: string;
  // App Preferences
  theme?: string;
  accentColor?: string;
  fontSize?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  // Notification Preferences
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: string;
  // Chat Preferences
  autoSaveConversations?: boolean;
  typingIndicators?: boolean;
}

export interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: UserProfileInput) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Better Auth's built-in session endpoint
      const session = await authClient.getSession();
      if (!session.data?.user) {
        throw new Error('Not authenticated');
      }

      // Use the user data directly from Better Auth session
      setProfile(session.data.user as UserProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: UserProfileInput) => {
    try {
      setError(null);

      // For now, just update the local state
      // TODO: Implement proper profile updates using Better Auth's built-in endpoints
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      // TODO: Add actual API call to update profile in database
      console.log('Profile update requested:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      console.error('Error updating user profile:', err);
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      setError(null);

      // For now, just create a local URL for the avatar
      // TODO: Implement proper avatar upload using Better Auth's built-in endpoints
      const avatarUrl = URL.createObjectURL(file);
      setProfile(prev => prev ? { ...prev, image: avatarUrl } : null);
      
      console.log('Avatar upload requested:', file.name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(errorMessage);
      console.error('Error uploading avatar:', err);
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const deleteAvatar = useCallback(async () => {
    try {
      setError(null);

      // For now, just remove the avatar from local state
      // TODO: Implement proper avatar deletion using Better Auth's built-in endpoints
      setProfile(prev => prev ? { ...prev, image: null } : null);
      
      console.log('Avatar deletion requested');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete avatar';
      setError(errorMessage);
      console.error('Error deleting avatar:', err);
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refetch
  };
};
