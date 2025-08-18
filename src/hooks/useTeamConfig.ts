import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { getTeamsEndpoint } from '../config/api';

interface TeamConfig {
  name: string;
  profileImage: string | null;
  introMessage: string | null;
  description: string | null;
  availableServices: string[];
  serviceQuestions?: Record<string, string[]>;
  jurisdiction?: {
    type: 'national' | 'state';
    description: string;
    supportedStates: string[];
    supportedCountries: string[];
    primaryState?: string;
  };
}

interface UseTeamConfigOptions {
  onError?: (error: string) => void;
}

export const useTeamConfig = ({ onError }: UseTeamConfigOptions = {}) => {
  const [teamId, setTeamId] = useState<string>('');
  const [teamNotFound, setTeamNotFound] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [teamConfig, setTeamConfig] = useState<TeamConfig>({
    name: 'Blawby AI',
    profileImage: '/blawby-favicon-iframe.png',
    introMessage: null,
    description: null,
    availableServices: [],
    serviceQuestions: {},
    jurisdiction: {
      type: 'national',
      description: 'Available nationwide',
      supportedStates: ['all'],
      supportedCountries: ['US']
    }
  });

  // Use ref to track if we've already fetched for this teamId
  const fetchedTeamIds = useRef<Set<string>>(new Set());

  // Parse URL parameters for configuration
  const parseUrlParams = useCallback(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const teamIdParam = urlParams.get('teamId');
      const hostname = window.location.hostname;

      // Domain-based team routing
      if (hostname === 'northcarolinalegalservices.blawby.com') {
        setTeamId('north-carolina-legal-services');
        return;
      }

      // Check if we're on the root domain with no parameters - redirect to Blawby AI
      if (hostname === 'ai.blawby.com' &&
        window.location.pathname === '/' &&
        !teamIdParam) {
        // Redirect to Blawby AI
        window.location.href = 'https://ai.blawby.com/?teamId=blawby-ai';
        return;
      }

      // Set teamId if available, otherwise default to blawby-ai
      if (teamIdParam) {
        setTeamId(teamIdParam);
      } else {
        setTeamId('blawby-ai');
      }
    }
  }, []);

  // Fetch team configuration
  const fetchTeamConfig = useCallback(async (currentTeamId: string) => {
    if (!currentTeamId || fetchedTeamIds.current.has(currentTeamId)) {
      return; // Don't fetch if no teamId or if we've already fetched for this teamId
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const response = await fetch(getTeamsEndpoint(), { signal: controller.signal });

      if (response.ok) {
        const teamsResponse = await response.json() as any;
        const team = teamsResponse.data.find((t: any) => t.slug === currentTeamId || t.id === currentTeamId);

        // Only add to fetched set after successful fetch
        fetchedTeamIds.current.add(currentTeamId);

        if (team?.config) {
          const config: TeamConfig = {
            name: team.name || 'Blawby AI',
            profileImage: team.config.profileImage || '/blawby-favicon-iframe.png',
            introMessage: team.config.introMessage || null,
            description: team.config.description || null,
            availableServices: team.config.availableServices || [],
            serviceQuestions: team.config.serviceQuestions || {},
            jurisdiction: team.config.jurisdiction || {
              type: 'national',
              description: 'Available nationwide',
              supportedStates: ['all'],
              supportedCountries: ['US']
            }
          };
          setTeamConfig(config);
          setTeamNotFound(false);
        } else {
          setTeamNotFound(true);
        }
      } else {
        setTeamNotFound(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't update state
        return;
      }
      console.warn('Failed to fetch team config:', error);
      setTeamNotFound(true);
      onError?.('Failed to load team configuration');
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Retry function for team config
  const handleRetryTeamConfig = useCallback(() => {
    setTeamNotFound(false);
    // Remove from fetched set so we can retry
    fetchedTeamIds.current.delete(teamId);
    fetchTeamConfig(teamId);
  }, [teamId, fetchTeamConfig]);

  // Initialize URL parameters on mount
  useEffect(() => {
    parseUrlParams();
  }, [parseUrlParams]);

  // Fetch team config when teamId changes
  useEffect(() => {
    if (teamId) {
      fetchTeamConfig(teamId);
    }
  }, [teamId]);

  return {
    teamId,
    teamConfig,
    teamNotFound,
    isLoading,
    handleRetryTeamConfig,
    setTeamId
  };
}; 