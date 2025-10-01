import { useState, useCallback } from 'preact/hooks';
import { useNavigation } from '../../../utils/navigation';

export interface UseSettingsNavigationReturn {
  currentPath: string;
  navigateToSettings: (path?: string) => void;
  navigateToAccount: () => void;
  navigateToPreferences: () => void;
  navigateToNotifications: () => void;
  navigateToSecurity: () => void;
  navigateToTeam: () => void;
  navigateToLegal: () => void;
  navigateToSupport: () => void;
  goBack: () => void;
}

export const useSettingsNavigation = (): UseSettingsNavigationReturn => {
  const [currentPath, setCurrentPath] = useState('/settings');
  const { navigate } = useNavigation();

  const navigateToSettings = useCallback((path: string = '/settings') => {
    setCurrentPath(path);
    navigate(path);
  }, [navigate]);

  const navigateToAccount = useCallback(() => {
    navigateToSettings('/settings/account');
  }, [navigateToSettings]);

  const navigateToPreferences = useCallback(() => {
    navigateToSettings('/settings/preferences');
  }, [navigateToSettings]);

  const navigateToNotifications = useCallback(() => {
    navigateToSettings('/settings/notifications');
  }, [navigateToSettings]);

  const navigateToSecurity = useCallback(() => {
    navigateToSettings('/settings/security');
  }, [navigateToSettings]);

  const navigateToTeam = useCallback(() => {
    navigateToSettings('/settings/team');
  }, [navigateToSettings]);

  const navigateToLegal = useCallback(() => {
    navigateToSettings('/settings/legal');
  }, [navigateToSettings]);

  const navigateToSupport = useCallback(() => {
    navigateToSettings('/settings/support');
  }, [navigateToSettings]);

  const goBack = useCallback(() => {
    // Simple back navigation - could be enhanced with history tracking
    if (currentPath === '/settings') {
      navigate('/');
    } else {
      navigate('/settings');
    }
  }, [currentPath, navigate]);

  return {
    currentPath,
    navigateToSettings,
    navigateToAccount,
    navigateToPreferences,
    navigateToNotifications,
    navigateToSecurity,
    navigateToTeam,
    navigateToLegal,
    navigateToSupport,
    goBack
  };
};
