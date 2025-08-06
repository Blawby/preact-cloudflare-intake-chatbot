import { Env } from '../types.js';

export interface TeamConfig {
  aiModel?: string;
  consultationFee?: number;
  requiresPayment?: boolean;
  ownerEmail?: string;
  availableServices?: string[];
  serviceQuestions?: Record<string, string[]>;
  jurisdiction?: {
    type: 'state' | 'national';
    description: string;
    supportedStates: string[];
    supportedCountries: string[];
    primaryState?: string;
  };
  domain?: string;
  description?: string;
  paymentLink?: string;
  brandColor?: string;
  accentColor?: string;
  introMessage?: string;
  profileImage?: string;
  webhooks?: {
    enabled: boolean;
    url: string;
    secret: string;
    events: {
      matterCreation: boolean;
      matterDetails: boolean;
      contactForm: boolean;
      appointment: boolean;
    };
    retryConfig: {
      maxRetries: number;
      retryDelay: number;
    };
  };
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  config: TeamConfig;
  createdAt: string;
  updatedAt: string;
}

export class TeamService {
  private teamCache = new Map<string, { team: Team; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private env: Env) {}

  /**
   * Resolves environment variable placeholders in team configuration
   * This allows storing sensitive data like API keys as environment variable references
   * Supports generic ${VAR_NAME} pattern matching
   */
  private resolveEnvironmentVariables(config: any): any {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    const resolved = { ...config };
    
    // Recursively resolve nested objects and handle string substitutions
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveEnvironmentVariables(value);
      } else if (typeof value === 'string') {
        resolved[key] = this.resolveStringVariables(value);
      }
    }

    return resolved;
  }

  /**
   * Resolves environment variable placeholders in string values
   * Uses regex to find and replace ${VAR_NAME} patterns with actual env values
   * Also handles direct environment variable names
   */
  private resolveStringVariables(value: string): string {
    // Handle ${VAR_NAME} pattern
    const envVarRegex = /\$\{([^}]+)\}/g;
    let result = value.replace(envVarRegex, (match, varName) => {
      const envValue = (this.env as any)[varName];
      console.log(`🔍 Resolving ${varName}: ${envValue !== undefined ? 'FOUND' : 'NOT FOUND'}`);
      return envValue !== undefined ? envValue : match;
    });
    
    // Handle direct environment variable names (without ${} wrapper)
    // Only replace if the value looks like an environment variable name
    if (result.match(/^[A-Z_]+$/)) {
      const envValue = (this.env as any)[result];
      console.log(`🔍 Resolving direct ${result}: ${envValue !== undefined ? 'FOUND' : 'NOT FOUND'}`);
      if (envValue !== undefined) {
        return envValue;
      }
    }
    
    return result;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * Compares two strings in a way that doesn't reveal information about the strings
   * Always processes both strings fully to avoid timing leaks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    // Use the longer string length to ensure we always process the same amount
    const maxLength = Math.max(a.length, b.length);
    let result = 0;
    
    // Process both strings to the maximum length
    for (let i = 0; i < maxLength; i++) {
      const aChar = i < a.length ? a.charCodeAt(i) : 0;
      const bChar = i < b.length ? b.charCodeAt(i) : 0;
      result |= aChar ^ bChar;
    }
    
    // Also compare lengths in constant time
    result |= a.length ^ b.length;
    
    return result === 0;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    console.log('TeamService.getTeam called with teamId:', teamId);
    
    // Check cache first
    const cached = this.teamCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Returning cached team');
      return cached.team;
    }

    try {
      // Try to find team by ID (ULID) first, then by slug
      console.log('Querying database for team...');
      let teamRow = await this.env.DB.prepare(
        'SELECT id, slug, name, config, created_at, updated_at FROM teams WHERE id = ?'
      ).bind(teamId).first();
      
      if (!teamRow) {
        teamRow = await this.env.DB.prepare(
          'SELECT id, slug, name, config, created_at, updated_at FROM teams WHERE slug = ?'
        ).bind(teamId).first();
      }
      
      if (teamRow) {
        const rawConfig = JSON.parse(teamRow.config as string);
        const resolvedConfig = this.resolveEnvironmentVariables(rawConfig);
        
        const team: Team = {
          id: teamRow.id as string,
          slug: teamRow.slug as string,
          name: teamRow.name as string,
          config: resolvedConfig,
          createdAt: teamRow.created_at as string,
          updatedAt: teamRow.updated_at as string
        };
        
        console.log('Found team:', { id: team.id, slug: team.slug, name: team.name });
        this.teamCache.set(teamId, { team, timestamp: Date.now() });
        return team;
      } else {
        console.log('No team found in database');
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch team:', error);
      return null;
    }
  }

  async getTeamConfig(teamId: string): Promise<TeamConfig | null> {
    const team = await this.getTeam(teamId);
    return team?.config || null;
  }

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const id = this.generateULID();
    const now = new Date().toISOString();
    
    const team: Team = {
      ...teamData,
      id,
      createdAt: now,
      updatedAt: now
    };

    await this.env.DB.prepare(`
      INSERT INTO teams (id, slug, name, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      team.id,
      team.slug,
      team.name,
      JSON.stringify(team.config),
      team.createdAt,
      team.updatedAt
    ).run();

    this.clearCache(team.id);
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    const existingTeam = await this.getTeam(teamId);
    if (!existingTeam) {
      return null;
    }

    // Extract only mutable fields from updates, excluding immutable fields
    const { id, createdAt, ...mutableUpdates } = updates;

    const updatedTeam: Team = {
      ...existingTeam,
      ...mutableUpdates,
      updatedAt: new Date().toISOString()
    };

    await this.env.DB.prepare(`
      UPDATE teams 
      SET slug = ?, name = ?, config = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      updatedTeam.slug,
      updatedTeam.name,
      JSON.stringify(updatedTeam.config),
      updatedTeam.updatedAt,
      teamId
    ).run();

    this.clearCache(teamId);
    return updatedTeam;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const result = await this.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(teamId).run();
    this.clearCache(teamId);
    return result.changes > 0;
  }

  async listTeams(): Promise<Team[]> {
    const teams = await this.env.DB.prepare(
      'SELECT id, slug, name, config, created_at, updated_at FROM teams ORDER BY created_at DESC'
    ).all();

    return teams.results.map(row => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      config: JSON.parse(row.config as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  }

  async validateTeamAccess(teamId: string, apiToken: string): Promise<boolean> {
    try {
      // First, retrieve the team
      const team = await this.getTeam(teamId);
      if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return false;
      }

      // Hash the provided API token for comparison
      const hashedToken = await this.hashToken(apiToken);

      // Check if the team's config contains API tokens
      if (team.config.blawbyApi?.apiKey) {
        // Compare with the team's configured API key using constant-time comparison
        if (this.constantTimeCompare(team.config.blawbyApi.apiKey, apiToken)) {
          console.log(`✅ API token validated for team: ${teamId}`);
          return true;
        }
      }

      // If not found in config, check the team_api_tokens table
      const tokenResult = await this.env.DB.prepare(`
        SELECT id, token_hash FROM team_api_tokens 
        WHERE team_id = ? AND token_hash = ? AND active = 1
      `).bind(teamId, hashedToken).first();

      if (tokenResult) {
        // Update last_used_at timestamp
        await this.env.DB.prepare(`
          UPDATE team_api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(tokenResult.id).run();
        
        console.log(`✅ API token validated from database for team: ${teamId}`);
        return true;
      }

      console.log(`❌ Invalid API token for team: ${teamId}`);
      return false;
    } catch (error) {
      console.error(`❌ Error validating team access for ${teamId}:`, error);
      return false;
    }
  }

  /**
   * Create a new API token for a team
   */
  async createApiToken(teamId: string, tokenName: string, permissions: string[] = [], createdBy?: string): Promise<{ token: string; tokenId: string }> {
    // Generate a secure random token
    const token = this.generateSecureToken();
    const tokenHash = await this.hashToken(token);
    const tokenId = this.generateULID();

    await this.env.DB.prepare(`
      INSERT INTO team_api_tokens (id, team_id, token_name, token_hash, permissions, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      tokenId,
      teamId,
      tokenName,
      tokenHash,
      JSON.stringify(permissions),
      createdBy || 'system'
    ).run();

    return { token, tokenId };
  }

  /**
   * Revoke an API token
   */
  async revokeApiToken(tokenId: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      UPDATE team_api_tokens SET active = 0 WHERE id = ?
    `).bind(tokenId).run();
    
    return result.changes > 0;
  }

  /**
   * List active API tokens for a team
   */
  async listApiTokens(teamId: string): Promise<Array<{
    id: string;
    tokenName: string;
    permissions: string[];
    createdAt: string;
    lastUsedAt?: string;
    expiresAt?: string;
  }>> {
    const tokens = await this.env.DB.prepare(`
      SELECT id, token_name, permissions, created_at, last_used_at, expires_at
      FROM team_api_tokens 
      WHERE team_id = ? AND active = 1
      ORDER BY created_at DESC
    `).bind(teamId).all();

    return tokens.results.map(row => ({
      id: row.id as string,
      tokenName: row.token_name as string,
      permissions: JSON.parse(row.permissions as string || '[]'),
      createdAt: row.created_at as string,
      lastUsedAt: row.last_used_at as string || undefined,
      expiresAt: row.expires_at as string || undefined
    }));
  }

  /**
   * Hash a token for secure storage and comparison
   * In production, use a proper cryptographic hash function
   */
  private async hashToken(token: string): Promise<string> {
    // For now, use a simple hash. In production, use crypto.subtle.digest
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private generateULID(): string {
    // Simple ULID generation - in production, use a proper ULID library
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp.toString(36)}${random}`;
  }

  clearCache(teamId?: string): void {
    if (teamId) {
      this.teamCache.delete(teamId);
    } else {
      this.teamCache.clear();
    }
  }
} 