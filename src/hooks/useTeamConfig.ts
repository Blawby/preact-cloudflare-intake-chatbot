import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { z } from 'zod';

// API endpoints - moved inline since api.ts was removed
const getTeamsEndpoint = () => '/api/teams';

// Zod schema for API response validation
const TeamSchema = z.object({
  slug: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional()
});

const TeamsResponseSchema = z.object({
  data: z.array(TeamSchema)
});

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
  voice: {
    enabled: boolean;
    provider: 'cloudflare' | 'elevenlabs' | 'custom';
    voiceId?: string | null;
    displayName?: string | null;
    previewUrl?: string | null;
  };
}

// Schema to validate and narrow the unknown config shape
const TeamConfigSchema = z.object({
  profileImage: z.string().nullable().optional(),
  introMessage: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  availableServices: z.array(z.string()).optional(),
  serviceQuestions: z.record(z.string(), z.array(z.string())).optional(),
  jurisdiction: z.object({
    type: z.enum(['national', 'state']).optional(),
    description: z.string().optional(),
    supportedStates: z.array(z.string()).optional(),
    supportedCountries: z.array(z.string()).optional(),
    primaryState: z.string().optional()
  }).optional(),
  voice: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(['cloudflare', 'elevenlabs', 'custom']).optional(),
    voiceId: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    previewUrl: z.string().nullable().optional()
  }).optional()
});

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
    },
    voice: {
      enabled: false,
      provider: 'cloudflare',
      voiceId: null,
      displayName: null,
      previewUrl: null
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
        try {
          const rawResponse = await response.json();
          const teamsResponse = TeamsResponseSchema.parse(rawResponse);
          const team = teamsResponse.data.find((t) => t.slug === currentTeamId || t.id === currentTeamId);

          // Only add to fetched set after successful fetch
          fetchedTeamIds.current.add(currentTeamId);

          if (team?.config) {
            const parsedConfig = TeamConfigSchema.safeParse(team.config);
            const cfg = parsedConfig.success ? parsedConfig.data : {};
            const normalizedJurisdiction: TeamConfig['jurisdiction'] = {
              type: cfg.jurisdiction?.type ?? 'national',
              description: cfg.jurisdiction?.description ?? 'Available nationwide',
              supportedStates: cfg.jurisdiction?.supportedStates ?? ['all'],
              supportedCountries: cfg.jurisdiction?.supportedCountries ?? ['US'],
              primaryState: cfg.jurisdiction?.primaryState
            };

            const config: TeamConfig = {
              name: team.name || 'Blawby AI',
              profileImage: cfg.profileImage ?? '/blawby-favicon-iframe.png',
              introMessage: cfg.introMessage ?? null,
              description: cfg.description ?? null,
              availableServices: cfg.availableServices ?? [],
              serviceQuestions: cfg.serviceQuestions ?? {},
              jurisdiction: normalizedJurisdiction,
              voice: {
                enabled: Boolean(cfg.voice?.enabled),
                provider: cfg.voice?.provider ?? 'cloudflare',
                voiceId: cfg.voice?.voiceId ?? null,
                displayName: cfg.voice?.displayName ?? null,
                previewUrl: cfg.voice?.previewUrl ?? null
              }
            };
            setTeamConfig(config);
            setTeamNotFound(false);
          } else {
            setTeamNotFound(true);
          }
        } catch (parseError) {
          console.error('Failed to parse teams response:', parseError);
          setTeamNotFound(true);
          onError?.('Invalid team configuration data received');
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
  }, [teamId, fetchTeamConfig]);

  return {
    teamId,
    teamConfig,
    teamNotFound,
    isLoading,
    handleRetryTeamConfig,
    setTeamId
  };
}; 
