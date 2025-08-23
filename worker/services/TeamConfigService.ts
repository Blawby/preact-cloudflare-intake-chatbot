import { Logger } from '../utils/logger.js';

export interface TeamConfig {
  id: string;
  slug: string;
  name: string;
  config: {
    requiresPayment: boolean;
    consultationFee: number;
    paymentLink: string | null;
    availableServices: string[];
    jurisdiction: {
      type: string;
      description: string;
      supportedStates: string[];
      supportedCountries: string[];
    };
    blawbyApi: {
      enabled: boolean;
      teamUlid: string | null;
      apiUrl: string;
    };
    ownerEmail?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class TeamConfigService {
  /**
   * Gets the default Blawby AI team configuration
   */
  static getDefaultTeamConfig(teamId: string, env: any): TeamConfig {
    const config: TeamConfig = {
      id: teamId,
      slug: 'blawby-ai',
      name: 'Blawby AI',
      config: {
        requiresPayment: false,
        consultationFee: 0,
        paymentLink: null,
        availableServices: [
          'Family Law',
          'Employment Law',
          'Business Law',
          'Intellectual Property',
          'Personal Injury',
          'Criminal Law',
          'Civil Law',
          'Tenant Rights Law',
          'Probate and Estate Planning',
          'Special Education and IEP Advocacy',
          'Small Business and Nonprofits',
          'Contract Review',
          'General Consultation'
        ],
        jurisdiction: {
          type: 'national',
          description: 'Available nationwide',
          supportedStates: ['all'],
          supportedCountries: ['US']
        },
        blawbyApi: {
          enabled: true,
          teamUlid: null,
          apiUrl: 'https://staging.blawby.com'
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Override with environment variables if available
    if (env.BLAWBY_TEAM_ULID) {
      config.config.blawbyApi.teamUlid = env.BLAWBY_TEAM_ULID;
    }
    if (env.BLAWBY_API_URL) {
      config.config.blawbyApi.apiUrl = env.BLAWBY_API_URL;
    }

    return config;
  }

  /**
   * Retrieves team configuration from database or returns default
   */
  static async getTeamConfig(env: any, teamId: string): Promise<TeamConfig> {
    try {
      const { TeamService } = await import('./TeamService.js');
      const teamService = new TeamService(env);
      Logger.debug('Retrieving team for teamId:', teamId);
      
      const team = await teamService.getTeam(teamId);
      if (team) {
        Logger.logTeamConfig(team, true); // Include sanitized config in debug mode
        return team;
      } else {
        Logger.info('No team found, returning Blawby AI default config');
        return this.getDefaultTeamConfig(teamId, env);
      }
    } catch (error) {
      Logger.warn('Failed to get team config:', error);
      return this.getDefaultTeamConfig(teamId, env);
    }
  }
}
