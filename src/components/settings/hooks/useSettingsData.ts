import { useState, useEffect, useCallback } from 'preact/hooks';

export interface UserPreferences {
  theme: string;
  accentColor: string;
  fontSize: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationFrequency: string;
  autoSaveConversations: boolean;
  typingIndicators: boolean;
}

export interface UseSettingsDataReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useSettingsData = (): UseSettingsDataReturn => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/preferences', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch preferences');
      }

      setPreferences(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
      console.error('Error fetching user preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (data: Partial<UserPreferences>) => {
    try {
      setError(null);

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update preferences');
      }

      setPreferences(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      console.error('Error updating user preferences:', err);
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch
  };
};
