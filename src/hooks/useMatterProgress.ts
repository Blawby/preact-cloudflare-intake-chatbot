import { useState, useCallback } from 'preact/hooks';
import { features } from '../config/features';

interface MatterProgressHook {
  isVisible: boolean;
  showProgress: (teamId: string, matterId: string) => void;
  hideProgress: () => void;
  currentMatter: { teamId: string; matterId: string } | null;
}

export function useMatterProgress(): MatterProgressHook {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMatter, setCurrentMatter] = useState<{ teamId: string; matterId: string } | null>(null);

  const showProgress = useCallback((teamId: string, matterId: string) => {
    if (!features.enableParalegalAgent) {
      console.warn('Paralegal agent is disabled - matter progress not available');
      return;
    }

    setCurrentMatter({ teamId, matterId });
    setIsVisible(true);
  }, []);

  const hideProgress = useCallback(() => {
    setIsVisible(false);
    // Keep currentMatter for a moment to allow smooth transitions
    setTimeout(() => setCurrentMatter(null), 300);
  }, []);

  return {
    isVisible,
    showProgress,
    hideProgress,
    currentMatter
  };
}

/**
 * Helper function to extract matter information from chat metadata
 */
export function extractMatterInfo(metadata: any): { teamId?: string; matterId?: string } {
  return {
    teamId: metadata?.teamId || metadata?.team_id,
    matterId: metadata?.matterId || metadata?.matter_id || metadata?.sessionId
  };
}

/**
 * Helper function to determine if a message indicates paralegal agent usage
 */
export function isParalegalMessage(metadata: any): boolean {
  return metadata?.paralegalAgent === true || metadata?.workflow === 'PARALEGAL_AGENT';
}
