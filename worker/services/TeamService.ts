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
  paymentLink?: string | null;
  brandColor?: string;
  accentColor?: string;
  introMessage?: string;
  profileImage?: string;
  blawbyApi?: {
    enabled: boolean;
    apiKey?: string | null;  // Optional/nullable for migration to hash-at-rest
    apiKeyHash?: string;     // Lowercase hex SHA-256 hash (32 bytes -> 64 hex chars)
    teamUlid?: string;       // Team identifier for API calls
    apiUrl?: string;
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

  /**
   * Normalizes fields that should be arrays but might be objects
   * @param config The team configuration to normalize
   * @returns Normalized team configuration with array fields
   */
  private normalizeConfigArrays(config: any): TeamConfig {
    const normalized = { ...config };

    // Normalize availableServices
    if (normalized.availableServices && !Array.isArray(normalized.availableServices)) {
      normalized.availableServices = Object.values(normalized.availableServices);
    }

    // Normalize jurisdiction fields if they exist
    if (normalized.jurisdiction) {
      if (normalized.jurisdiction.supportedStates && !Array.isArray(normalized.jurisdiction.supportedStates)) {
        normalized.jurisdiction.supportedStates = Object.values(normalized.jurisdiction.supportedStates);
      }
      if (normalized.jurisdiction.supportedCountries && !Array.isArray(normalized.jurisdiction.supportedCountries)) {
        normalized.jurisdiction.supportedCountries = Object.values(normalized.jurisdiction.supportedCountries);
      }
    }

    return normalized;
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
        const normalizedConfig = this.normalizeConfigArrays(resolvedConfig);
        
        const team: Team = {
          id: teamRow.id as string,
          slug: teamRow.slug as string,
          name: teamRow.name as string,
          config: normalizedConfig,
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

  /**
   * Validates and normalizes team configuration to ensure all required properties are present
   */
  private validateAndNormalizeConfig(config: TeamConfig | null | undefined): TeamConfig {
    // Handle null/undefined config by coercing to empty object
    if (!config) {
      config = {};
    }

    const defaultConfig: TeamConfig = {
      aiModel: 'llama',
      consultationFee: 0,
      requiresPayment: false,
      ownerEmail: 'default@example.com',
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

    // Merge provided config with defaults, ensuring all required properties are present
    // Use optional chaining to safely access config.jurisdiction
    return {
      ...defaultConfig,
      ...config,
      jurisdiction: {
        ...defaultConfig.jurisdiction,
        ...(config.jurisdiction || {})
      }
    };
  }

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const id = this.generateULID();
    const now = new Date().toISOString();
    
    // Validate and normalize the team configuration
    const normalizedConfig = this.validateAndNormalizeConfig(teamData.config);
    
    const team: Team = {
      ...teamData,
      config: normalizedConfig,
      id,
      createdAt: now,
      updatedAt: now
    };

    console.log('TeamService.createTeam: Attempting to insert team:', { id: team.id, slug: team.slug, name: team.name });
    
    try {
      const result = await this.env.DB.prepare(`
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
      
      console.log('TeamService.createTeam: Insert result:', { success: result.success });
      
      // Verify the team was actually created by querying the database
      const verifyTeam = await this.env.DB.prepare('SELECT id FROM teams WHERE id = ?').bind(team.id).first();
      if (!verifyTeam) {
        throw new Error('Team creation failed - team not found in database after insert');
      }
    } catch (error) {
      console.error('TeamService.createTeam: Database insert failed:', error);
      throw error;
    }

    this.clearCache(team.id);
    console.log('TeamService.createTeam: Team created successfully:', { id: team.id, slug: team.slug });
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    const existingTeam = await this.getTeam(teamId);
    if (!existingTeam) {
      return null;
    }

    // Extract only mutable fields from updates, excluding immutable fields
    const { id, createdAt, ...mutableUpdates } = updates;

    // Validate and normalize the team configuration if it's being updated
    let normalizedConfig = existingTeam.config;
    if (mutableUpdates.config) {
      normalizedConfig = this.validateAndNormalizeConfig(mutableUpdates.config);
    }
    
    const updatedTeam: Team = {
      ...existingTeam,
      ...mutableUpdates,
      config: normalizedConfig,
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
    console.log('TeamService.deleteTeam called with teamId:', teamId);
    
    // First check if the team exists
    const existingTeam = await this.getTeam(teamId);
    if (!existingTeam) {
      console.log('❌ Team not found for deletion:', teamId);
      return false;
    }
    
    console.log('✅ Team found for deletion:', { id: existingTeam.id, slug: existingTeam.slug, name: existingTeam.name });
    
    try {
      const result = await this.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(teamId).run();
      console.log('Delete result:', { success: result.success });
      
      this.clearCache(teamId);
      
      // Check if the operation was successful
      // In D1 local development, changes might be undefined but success is true
      if (result.success) {
        // Double-check by trying to get the team again
        const verifyDeleted = await this.env.DB.prepare('SELECT id FROM teams WHERE id = ?').bind(teamId).first();
        if (!verifyDeleted) {
          console.log('✅ Team deleted successfully (verified by query)');
          return true;
        } else {
          console.log('❌ Delete operation reported success but team still exists');
          return false;
        }
      } else {
        console.log('❌ Delete operation failed:', { success: result.success });
        return false;
      }
    } catch (error) {
      console.error('❌ Database error during team deletion:', error);
      return false;
    }
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
      // First, retrieve the team to verify it exists
      const team = await this.getTeam(teamId);
      if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return false;
      }

      // Hash the provided API token for comparison
      const hashedToken = await this.hashToken(apiToken);

      // Check the secure team_api_tokens table
      const tokenResult = await this.env.DB.prepare(`
        SELECT id, token_hash FROM team_api_tokens 
        WHERE team_id = ? AND token_hash = ? AND active = 1
      `).bind(teamId, hashedToken).first();

      if (tokenResult) {
        // Update last_used_at timestamp
        await this.env.DB.prepare(`
          UPDATE team_api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(tokenResult.id).run();
        
        console.log(`✅ API token validated from secure database for team: ${teamId}`);
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
      INSERT INTO team_api_tokens (id, team_id, token_name, token_hash, permissions, created_by, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tokenId,
      teamId,
      tokenName,
      tokenHash,
      JSON.stringify(permissions),
      createdBy || 'system',
      1
    ).run();

    return { token, tokenId };
  }

  /**
   * Revoke an API token
   */
  async revokeApiToken(tokenId: string): Promise<{ success: boolean; alreadyRevoked?: boolean }> {
    // Try to revoke the token directly
    const result = await this.env.DB.prepare(`
      UPDATE team_api_tokens SET active = 0 WHERE id = ? AND active = 1
    `).bind(tokenId).run();
    
    // Check if rows were actually updated using meta.changes
    if (result.meta?.changes && result.meta.changes > 0) {
      // Token was successfully revoked
      return { success: true };
    }
    
    // No rows updated - check if token exists
    const token = await this.env.DB.prepare(`
      SELECT id FROM team_api_tokens WHERE id = ?
    `).bind(tokenId).first();
    
    if (!token) {
      // Token doesn't exist
      return { success: false };
    }
    
    // Token exists but is already inactive
    return { success: true, alreadyRevoked: true };
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
    active: boolean;
  }>> {
    const tokens = await this.env.DB.prepare(`
      SELECT id, token_name, permissions, created_at, last_used_at, expires_at, active
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
      expiresAt: row.expires_at as string || undefined,
      active: Boolean(row.active)
    }));
  }

  /**
   * Hash a token for secure storage and comparison
   * Uses SHA-256 for consistent hashing across the application
   * Returns lowercase hex string (32 bytes -> 64 hex chars)
   */
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate that an API key hash is a proper lowercase hex SHA-256 hash
   * @param hash The hash to validate
   * @returns true if valid, false otherwise
   */
  private isValidApiKeyHash(hash: string): boolean {
    // Must be exactly 64 characters (32 bytes * 2 hex chars per byte)
    // Must be lowercase hex characters only
    return /^[a-f0-9]{64}$/.test(hash);
  }

  /**
   * Validate an API key against the team's stored hash or plaintext key
   * Prefers apiKeyHash for authentication when available
   * @param teamId The team ID
   * @param providedKey The API key to validate
   * @returns true if valid, false otherwise
   */
  async validateApiKey(teamId: string, providedKey: string): Promise<boolean> {
    try {
      const team = await this.getTeam(teamId);
      if (!team?.config.blawbyApi?.enabled) {
        return false;
      }

      const { apiKey, apiKeyHash } = team.config.blawbyApi;

      // Prefer hash-based validation when available
      if (apiKeyHash && this.isValidApiKeyHash(apiKeyHash)) {
        const providedKeyHash = await this.hashToken(providedKey);
        return this.constantTimeCompare(providedKeyHash, apiKeyHash);
      }

      // Fallback to plaintext comparison if no hash available
      if (apiKey) {
        return this.constantTimeCompare(providedKey, apiKey);
      }

      return false;
    } catch (error) {
      console.error(`❌ Error validating API key for team ${teamId}:`, error);
      return false;
    }
  }

  /**
   * Generate and store a hash for an existing API key
   * This method can be used to migrate teams from plaintext to hashed API keys
   */
  async generateApiKeyHash(teamId: string): Promise<boolean> {
    try {
      const team = await this.getTeam(teamId);
      if (!team || !team.config.blawbyApi?.apiKey) {
        console.log(`❌ Team not found or no API key configured: ${teamId}`);
        return false;
      }

      // Generate hash for the existing API key (apiKey is guaranteed to be string here due to check above)
      const apiKeyHash = await this.hashToken(team.config.blawbyApi.apiKey!);
      
      // Validate the generated hash
      if (!this.isValidApiKeyHash(apiKeyHash)) {
        console.error(`❌ Generated invalid API key hash for team: ${teamId}`);
        return false;
      }
      
      // Update the team config to include the hash and optionally nullify the plaintext key
      const updatedConfig = {
        ...team.config,
        blawbyApi: {
          ...team.config.blawbyApi,
          apiKeyHash,
          // Optionally set apiKey to null after migration (uncomment when ready)
          // apiKey: null
        }
      };

      // Update the team in the database
      const result = await this.env.DB.prepare(`
        UPDATE teams SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(JSON.stringify(updatedConfig), teamId).run();

      // Check if rows were actually updated using meta.changes
      if (result.meta?.changes && result.meta.changes > 0) {
        // Clear the cache for this team
        this.clearCache(teamId);
        console.log(`✅ API key hash generated and stored for team: ${teamId}`);
        return true;
      }

      // Log detailed error information for debugging
      console.error(`❌ Failed to update team config for team ${teamId}:`, {
        teamId,
        result,
        updatePayload: {
          config: updatedConfig,
          timestamp: new Date().toISOString()
        }
      });
      return false;
    } catch (error) {
      console.error(`❌ Error generating API key hash for ${teamId}:`, error);
      return false;
    }
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