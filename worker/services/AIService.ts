// Import TeamConfig from TeamService instead of defining it here
import { TeamConfig } from './TeamService.js';
import { Logger } from '../utils/logger.js';
import { Env } from '../types.js';
import type { Ai } from '@cloudflare/workers-types';

// Default team configuration - centralized for maintainability
const DEFAULT_TEAM_CONFIG: TeamConfig = {
  aiModel: 'llama',
  requiresPayment: false,
  consultationFee: 0,
  ownerEmail: 'default@example.com',
  paymentLink: null,
  availableServices: [
    'General Consultation', // Always first to ensure it's available
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
    'Contract Review'
  ],
  jurisdiction: {
    type: 'national',
    description: 'Available nationwide',
    supportedStates: ['all'],
    supportedCountries: ['US']
  }
};

// Optimized AI Service with caching and timeouts
export class AIService {
  private teamConfigCache = new Map<string, { config: TeamConfig; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private ai: Ai, private env: Env) {}
  
  async runLLM(messages: any[], model: string = '@cf/meta/llama-3.1-8b-instruct') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const result = await this.ai.run(model, {
        messages,
        max_tokens: 500,
        temperature: 0.1, // Reduced from 0.4 to 0.1 for more factual responses
      });
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
  
  async getTeamConfig(teamId: string): Promise<TeamConfig> {
    Logger.debug('AIService.getTeamConfig called with teamId:', teamId);
    const cached = this.teamConfigCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      Logger.debug('Returning cached team config');
      return cached.config;
    }

    try {
      // Use TeamService to get full team object
      const { TeamService } = await import('./TeamService.js');
      const teamService = new TeamService(this.env);
      const team = await teamService.getTeam(teamId);
      
      if (team) {
        Logger.logTeamConfig(team, true); // Include sanitized config in debug mode
        this.teamConfigCache.set(teamId, { config: team.config, timestamp: Date.now() });
        return team.config;
      } else {
        Logger.info('No team found in database');
        Logger.debug('Available teams:');
        const allTeams = await teamService.listTeams();
        Logger.debug('All teams:', allTeams.map(t => ({ id: t.id, slug: t.slug })));
      }
    } catch (error) {
      Logger.warn('Failed to fetch team config:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    Logger.info('Returning default team config');
    return DEFAULT_TEAM_CONFIG;
  }

  // Clear cache for a specific team or all teams
  clearCache(teamId?: string): void {
    if (teamId) {
      this.teamConfigCache.delete(teamId);
    } else {
      this.teamConfigCache.clear();
    }
  }

  // Agent handles all conversation logic - no manual validation needed
} 