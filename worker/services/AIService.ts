export interface TeamConfig {
  requiresPayment?: boolean;
  consultationFee?: number;
  ownerEmail?: string;
  serviceQuestions?: Record<string, string[]>;
  availableServices?: string[];
  webhooks?: {
    enabled?: boolean;
    url?: string;
    secret?: string;
    events?: {
      matterCreation?: boolean;
      matterDetails?: boolean;
      contactForm?: boolean;
      appointment?: boolean;
    };
    retryConfig?: {
      maxRetries?: number;
      retryDelay?: number; // in seconds
    };
  };
}

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
}

// Optimized AI Service with caching and timeouts
export class AIService {
  private teamConfigCache = new Map<string, { config: TeamConfig; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private ai: any, private env: Env) {}
  
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
    console.log('AIService.getTeamConfig called with teamId:', teamId);
    const cached = this.teamConfigCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Returning cached team config');
      return cached.config;
    }

    try {
      // Try to find team by ID (ULID) first, then by slug
      console.log('Querying database for team config...');
      let teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE id = ?').bind(teamId).first();
      console.log('Team row found by ID:', teamRow ? 'yes' : 'no');
      if (!teamRow) {
        teamRow = await this.env.DB.prepare('SELECT config FROM teams WHERE slug = ?').bind(teamId).first();
        console.log('Team row found by slug:', teamRow ? 'yes' : 'no');
      }
      
      if (teamRow) {
        const config = JSON.parse(teamRow.config as string);
        console.log('Parsed team config:', JSON.stringify(config, null, 2));
        this.teamConfigCache.set(teamId, { config, timestamp: Date.now() });
        return { config }; // Return with config property to match expected structure
      } else {
        console.log('No team found in database');
        console.log('Available teams:');
        const allTeams = await this.env.DB.prepare('SELECT id, slug FROM teams').all();
        console.log('All teams:', allTeams);
      }
    } catch (error) {
      console.warn('Failed to fetch team config:', error);
    }
    
    console.log('Returning empty team config');
    return {};
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