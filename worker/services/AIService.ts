import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { TeamSecretsService } from './TeamSecretsService';
import { validateTeamConfig } from '../utils/teamValidation';

export interface TeamConfig {
  requiresPayment?: boolean;
  consultationFee?: number;
  ownerEmail?: string;
  serviceQuestions?: Record<string, string[]>;
  availableServices?: string[];
  blawbyApi?: {
    enabled?: boolean;
    apiKey?: string;
    teamUlid?: string;
  };
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
  TEAM_SECRETS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: any;
  TEAMS_FALLBACK_URL?: string;
  ENVIRONMENT?: string;
}

// Optimized AI Service with caching and timeouts
export class AIService {
  private teamConfigCache = new Map<string, { config: TeamConfig; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private teamSecretsService: TeamSecretsService;

  constructor(private ai: any, private env: Env) {
    this.teamSecretsService = new TeamSecretsService({ TEAM_SECRETS: env.TEAM_SECRETS });
  }

  /**
   * Get team configuration with dynamic API key resolution
   */
  async getTeamConfig(teamId: string): Promise<TeamConfig> {
    console.log('🔍 [AIService] getTeamConfig called with teamId:', teamId);
    const cached = this.teamConfigCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('🔍 [AIService] Returning cached team config');
      return cached.config;
    }

    try {
      // Try to find team by ID (ULID) first, then by slug
      console.log('🔍 [AIService] Querying database for team config...');
      let teamRow = await this.env.DB.prepare('SELECT id, slug, name, config FROM teams WHERE id = ?').bind(teamId).first();
      console.log('🔍 [AIService] Team row found by ID:', teamRow ? 'yes' : 'no');
      if (!teamRow) {
        teamRow = await this.env.DB.prepare('SELECT id, slug, name, config FROM teams WHERE slug = ?').bind(teamId).first();
        console.log('🔍 [AIService] Team row found by slug:', teamRow ? 'yes' : 'no');
      }
      
      if (teamRow) {
        console.log('🔍 [AIService] Raw config from DB:', teamRow.config);
        const config = JSON.parse(teamRow.config || '{}');
        
        // Validate team configuration
        const validation = validateTeamConfig({ id: teamId, config });
        if (!validation.valid) {
          console.warn(`⚠️ [AIService] Team config validation failed for ${teamId}:`, validation.errors);
        }
        
        console.log('🔍 [AIService] Parsed team config:', JSON.stringify(config, null, 2));
        
        // Resolve dynamic API keys from KV storage
        const processedConfig = await this.resolveTeamSecrets(teamId, config);
        
        // Log config without sensitive data
        const safeConfig = { ...processedConfig };
        if (safeConfig.blawbyApi?.apiKey) {
          safeConfig.blawbyApi.apiKey = '***REDACTED***';
        }
        if (safeConfig.webhooks?.secret) {
          safeConfig.webhooks.secret = '***REDACTED***';
        }
        console.log('🔍 [AIService] Processed team config with secrets:', JSON.stringify(safeConfig, null, 2));
        console.log('🔍 [AIService] Config requiresPayment:', processedConfig.requiresPayment);
        console.log('🔍 [AIService] Config consultationFee:', processedConfig.consultationFee);
        console.log('🔍 [AIService] Config blawbyApi enabled:', processedConfig.blawbyApi?.enabled);
        
        this.teamConfigCache.set(teamId, { config: processedConfig, timestamp: Date.now() });
        return processedConfig;
      } else {
        console.log('🔍 [AIService] No team found in database');
        console.log('🔍 [AIService] Available teams:');
        const allTeams = await this.env.DB.prepare('SELECT id, slug FROM teams').all();
        console.log('🔍 [AIService] All teams:', allTeams);
        
        // Fallback to teams.json file (only in development or if explicitly configured)
        const shouldUseFallback = this.env.ENVIRONMENT !== 'production' || this.env.TEAMS_FALLBACK_URL;
        if (shouldUseFallback) {
          console.log('🔍 [AIService] Trying fallback to teams.json...');
          try {
            const fallbackUrl = this.env.TEAMS_FALLBACK_URL || 'https://blawby-ai-chatbot.paulchrisluke.workers.dev/teams.json';
            const teamsResponse = await fetch(fallbackUrl);
            if (teamsResponse.ok) {
              const teams = await teamsResponse.json();
              const team = teams.find((t: any) => t.id === teamId || t.slug === teamId);
              if (team) {
                console.log('🔍 [AIService] Found team in teams.json:', team.id);
                console.log('🔍 [AIService] Team config from teams.json:', JSON.stringify(team.config, null, 2));
                
                // Resolve dynamic API keys from KV storage
                const processedConfig = await this.resolveTeamSecrets(teamId, team.config);
                console.log('🔍 [AIService] Processed team config with secrets:', JSON.stringify(processedConfig, null, 2));
                
                this.teamConfigCache.set(teamId, { config: processedConfig, timestamp: Date.now() });
                return processedConfig;
              }
            }
          } catch (fallbackError) {
            console.warn('🔍 [AIService] Failed to load teams.json:', fallbackError);
          }
        } else {
          console.log('🔍 [AIService] Skipping fallback in production environment');
        }
      }
    } catch (error) {
      console.warn('🔍 [AIService] Failed to fetch team config:', error);
    }
    
    console.log('🔍 [AIService] Returning empty team config');
    return {};
  }

  /**
   * Resolve team secrets from KV storage
   */
  private async resolveTeamSecrets(teamId: string, config: any): Promise<any> {
    // If Blawby API is enabled, try to get the API key from KV storage
    if (config.blawbyApi?.enabled) {
      const apiKey = await this.teamSecretsService.getBlawbyApiKey(teamId);
      const teamUlid = await this.teamSecretsService.getBlawbyTeamUlid(teamId);
      
      if (apiKey && teamUlid) {
        config.blawbyApi.apiKey = apiKey;
        config.blawbyApi.teamUlid = teamUlid;
        console.log(`🔐 [AIService] Resolved API key for team: ${teamId}`);
      } else {
        console.warn(`⚠️ [AIService] No API key found in KV for team: ${teamId}, disabling Blawby API`);
        config.blawbyApi.enabled = false;
      }
    }

    // If webhooks are enabled, try to get the webhook secret from KV storage
    if (config.webhooks?.enabled) {
      const webhookSecret = await this.teamSecretsService.getWebhookSecret(teamId);
      
      if (webhookSecret) {
        config.webhooks.secret = webhookSecret;
        console.log(`🔐 [AIService] Resolved webhook secret for team: ${teamId}`);
      } else {
        console.warn(`⚠️ [AIService] No webhook secret found in KV for team: ${teamId}, disabling webhooks`);
        config.webhooks.enabled = false;
      }
    }
    
    return config;
  }
  
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