// Import TeamConfig from TeamService instead of defining it here
import { TeamConfig } from './TeamService.js';

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
}

// Default team configuration - centralized for maintainability
const DEFAULT_TEAM_CONFIG: TeamConfig = {
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
  ]
};

// Optimized AI Service with caching and timeouts
export class AIService {
  private teamConfigCache = new Map<string, { config: TeamConfig; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private ai: any, private env: Env) {}
  
  async runLLM(messages: any[], model: string = '@cf/meta/llama-3.1-8b-instruct') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // Reduced from 30s to 15s for faster responses
    
    try {
      const result = await this.ai.run(model, {
        messages,
        max_tokens: 200, // Reduced from 500 for faster responses
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
    console.log('AIService.getTeamConfig called with teamId:', teamId);
    const cached = this.teamConfigCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Returning cached team config');
      return cached.config;
    }

    try {
      // Use TeamService to get full team object
      const { TeamService } = await import('./TeamService.js');
      const teamService = new TeamService(this.env);
      const team = await teamService.getTeam(teamId);
      
      if (team) {
        console.log('Found team:', { id: team.id, slug: team.slug, name: team.name });
        console.log('Team config:', JSON.stringify(team.config, null, 2));
        this.teamConfigCache.set(teamId, { config: team.config, timestamp: Date.now() });
        return team.config;
      } else {
        console.log('No team found in database');
        console.log('Available teams:');
        const allTeams = await teamService.listTeams();
        console.log('All teams:', allTeams.map(t => ({ id: t.id, slug: t.slug })));
      }
    } catch (error) {
      console.warn('Failed to fetch team config:', error);
    }
    
    console.log('Returning default team config');
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