import { Env } from '../types.js';
import { ValidationService } from './ValidationService.js';
import { ValidationError } from '../utils/validationErrors.js';

export type TeamVoiceProvider = 'cloudflare' | 'elevenlabs' | 'custom';

export interface TeamVoiceConfig {
  enabled: boolean;
  provider: TeamVoiceProvider;
  voiceId?: string;
  displayName?: string;
  previewUrl?: string;
}

export interface TeamConfig {
  aiProvider?: string;
  aiModel?: string;
  aiModelFallback?: string[];
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
  voice: TeamVoiceConfig;
  blawbyApi?: {
    enabled: boolean;
    apiKey?: string | null;  // Optional/nullable for migration to hash-at-rest
    apiKeyHash?: string;     // Lowercase hex SHA-256 hash (32 bytes -> 64 hex chars)
    teamUlid?: string;       // Team identifier for API calls
    apiUrl?: string;
  };
}

const LEGACY_AI_PROVIDER = 'workers-ai';
const DEFAULT_GPT_MODEL = '@cf/openai/gpt-oss-20b';

const MODEL_ALIASES: Record<string, string> = {
  llama: DEFAULT_GPT_MODEL,
  'llama-3': DEFAULT_GPT_MODEL,
  'llama-3.1': DEFAULT_GPT_MODEL,
  'llama-3-8b': DEFAULT_GPT_MODEL,
  'llama-3.1-8b': DEFAULT_GPT_MODEL,
  llama3: DEFAULT_GPT_MODEL,
  'llama3.1': DEFAULT_GPT_MODEL
};

// Feature flag to control model aliasing behavior
const ENABLE_MODEL_ALIASES = false; // Set to true to enable aliasing

const DEFAULT_AVAILABLE_SERVICES = [
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
] as const;

function normalizeProvider(input?: string | null): string {
  if (!input) {
    return LEGACY_AI_PROVIDER;
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : LEGACY_AI_PROVIDER;
}

function sanitizeModel(model?: string | null, teamId?: string): string | undefined {
  if (!model) {
    return undefined;
  }
  const trimmed = model.trim();
  if (!trimmed.length) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();
  
  // Only apply aliases if the feature flag is enabled
  if (ENABLE_MODEL_ALIASES && MODEL_ALIASES[normalized]) {
    const aliasedModel = MODEL_ALIASES[normalized];
    
    // Log warning when alias substitution occurs
    console.warn('Model alias substitution applied:', {
      originalModel: trimmed,
      aliasedModel,
      teamId: teamId || 'unknown',
      message: `Llama model '${trimmed}' was aliased to '${aliasedModel}'. Consider updating your team configuration to use the new model directly.`
    });
    
    return aliasedModel;
  }

  return trimmed;
}

function sanitizeFallbackList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value)
    ? value.filter(item => typeof item === 'string')
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return Array.from(new Set(values.map(v => v.trim()).filter(v => v.length > 0)));
}

function buildFallbackList(baseModel: string, preferred?: string[], useDefaults: boolean = true): string[] {
  const normalized = sanitizeFallbackList(preferred);
  
  // If preferred was explicitly provided but is empty, return empty array
  if (preferred !== undefined && normalized.length === 0) {
    return [];
  }
  
  // If normalized is empty and defaults are allowed, return DEFAULT_GPT_MODEL filtered against baseModel
  if (!normalized.length && useDefaults) {
    return [DEFAULT_GPT_MODEL].filter(model => model !== baseModel);
  }
  
  // If normalized is empty and defaults are disabled, return empty array
  if (!normalized.length && !useDefaults) {
    return [];
  }

  const unique = new Set<string>();
  normalized.forEach(model => {
    if (model !== baseModel) {
      unique.add(model);
    }
  });

  if (!unique.size && baseModel !== DEFAULT_GPT_MODEL && useDefaults) {
    unique.add(DEFAULT_GPT_MODEL);
  }

  return Array.from(unique);
}

export function buildDefaultTeamConfig(env: Env): TeamConfig {
  const defaultProvider = normalizeProvider(env.AI_PROVIDER_DEFAULT);
  const defaultModel = sanitizeModel(env.AI_MODEL_DEFAULT) ?? DEFAULT_GPT_MODEL;
  const fallbackFromEnv = sanitizeFallbackList(env.AI_MODEL_FALLBACK);
  const fallbackList = buildFallbackList(defaultModel, fallbackFromEnv);

  return {
    aiProvider: defaultProvider,
    aiModel: defaultModel,
    aiModelFallback: fallbackList,
    consultationFee: 0,
    requiresPayment: false,
    ownerEmail: undefined,
    availableServices: [...DEFAULT_AVAILABLE_SERVICES],
    jurisdiction: {
      type: 'national',
      description: 'Available nationwide',
      supportedStates: ['all'],
      supportedCountries: ['US']
    },
    voice: {
      enabled: false,
      provider: 'cloudflare'
    }
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

  private getDefaultConfig(): TeamConfig {
    return buildDefaultTeamConfig(this.env);
  }

  /**
   * Resolves environment variable placeholders in team configuration
   * This allows storing sensitive data like API keys as environment variable references
   * Supports generic ${VAR_NAME} pattern matching
   */
  private resolveEnvironmentVariables<T>(config: T): T {
    if (config === null || typeof config !== 'object') {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map(item => this.resolveEnvironmentVariables(item)) as unknown as T;
    }

    const resolvedEntries = Object.entries(config as Record<string, unknown>).map(([key, value]) => {
      if (value && typeof value === 'object') {
        return [key, this.resolveEnvironmentVariables(value)];
      }
      if (typeof value === 'string') {
        return [key, this.resolveStringVariables(value)];
      }
      return [key, value];
    });

    return Object.fromEntries(resolvedEntries) as T;
  }

  /**
   * Safely decodes team config from database as plain JSON
   * Team configs are stored as plain JSON text in the database
   */
  private decodeTeamConfig(configString: string): unknown {
    try {
      return JSON.parse(configString);
    } catch (jsonError) {
      console.error('Failed to parse team config as JSON:', { 
        configString: configString.substring(0, 100) + '...', 
        error: jsonError 
      });
      // Return a safe default config if JSON parsing fails
      return buildDefaultTeamConfig(this.env);
    }
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
      const envValue = this.getEnvValue(varName);
      console.log(`🔍 Resolving ${varName}: ${envValue !== undefined ? 'FOUND' : 'NOT FOUND'}`);
      return envValue !== undefined ? envValue : match;
    });
    
    // Handle direct environment variable names (without ${} wrapper)
    // Only replace if the value looks like an environment variable name
    if (result.match(/^[A-Z_]+$/)) {
      const envValue = this.getEnvValue(result);
      console.log(`🔍 Resolving direct ${result}: ${envValue !== undefined ? 'FOUND' : 'NOT FOUND'}`);
      if (envValue !== undefined) {
        return envValue;
      }
    }
    
    return result;
  }

  private getEnvValue(key: string): string | undefined {
    return (this.env as unknown as Record<string, unknown>)[key] as string | undefined;
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
  private normalizeConfigArrays(config: unknown): TeamConfig {
    const base = (config ?? {}) as Record<string, unknown>;
    const normalized: Partial<TeamConfig> & { voice?: unknown } = { ...base };

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

    if (normalized.aiModelFallback !== undefined) {
      normalized.aiModelFallback = sanitizeFallbackList(normalized.aiModelFallback);
    }

    normalized.voice = this.normalizeVoiceConfig(normalized.voice);

    return normalized as TeamConfig;
  }

  private isValidVoiceProvider(value: unknown): value is TeamVoiceProvider {
    return value === 'cloudflare' || value === 'elevenlabs' || value === 'custom';
  }

  private normalizeVoiceConfig(rawVoice: unknown): TeamVoiceConfig {
    const baseConfig: TeamVoiceConfig = {
      enabled: false,
      provider: 'cloudflare'
    };

    if (!rawVoice || typeof rawVoice !== 'object') {
      return baseConfig;
    }

    const voiceRecord = rawVoice as Record<string, unknown>;

    const provider = this.isValidVoiceProvider(voiceRecord.provider) ? voiceRecord.provider : 'cloudflare';

    const normalizedVoice: TeamVoiceConfig = {
      enabled: Boolean(voiceRecord.enabled),
      provider
    };

    if (typeof voiceRecord.voiceId === 'string' && voiceRecord.voiceId.trim().length > 0) {
      normalizedVoice.voiceId = voiceRecord.voiceId.trim();
    }

    if (typeof voiceRecord.displayName === 'string' && voiceRecord.displayName.trim().length > 0) {
      normalizedVoice.displayName = voiceRecord.displayName.trim();
    }

    if (typeof voiceRecord.previewUrl === 'string' && voiceRecord.previewUrl.trim().length > 0) {
      normalizedVoice.previewUrl = voiceRecord.previewUrl.trim();
    }

    return normalizedVoice;
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
        const rawConfig = this.decodeTeamConfig(teamRow.config as string);
        const resolvedConfig = this.resolveEnvironmentVariables(rawConfig);
        const normalizedConfig = this.validateAndNormalizeConfig(resolvedConfig as TeamConfig, false, teamId);
        
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
   * @param strictValidation - if true, applies strict validation including placeholder email checks
   * @param teamId - team ID for logging context
   */
  private validateAndNormalizeConfig(config: TeamConfig | null | undefined, strictValidation: boolean = false, teamId?: string): TeamConfig {
    const defaultConfig = this.getDefaultConfig();
    const sourceConfig = (config ?? {}) as TeamConfig;

    const aiProvider = normalizeProvider(sourceConfig.aiProvider ?? defaultConfig.aiProvider);
    const aiModel = sanitizeModel(sourceConfig.aiModel, teamId) ?? defaultConfig.aiModel ?? DEFAULT_GPT_MODEL;
    const providedFallback = sourceConfig.aiModelFallback !== undefined
      ? sanitizeFallbackList(sourceConfig.aiModelFallback)
      : undefined;
    const fallbackList = buildFallbackList(aiModel, providedFallback ?? defaultConfig.aiModelFallback ?? []);

    // Validate ownerEmail if provided
    let ownerEmail = sourceConfig.ownerEmail ?? defaultConfig.ownerEmail;
    if (ownerEmail && strictValidation) {
      // Check for placeholder emails and reject them
      const placeholderEmails = ['default@example.com', 'test@example.com', 'admin@example.com', 'owner@example.com'];
      if (placeholderEmails.includes(ownerEmail.toLowerCase())) {
        throw new ValidationError(`Invalid ownerEmail: placeholder email '${ownerEmail}' is not allowed. Please provide a real email address.`);
      }
      
      // Validate email format
      if (!ValidationService.validateEmail(ownerEmail)) {
        throw new ValidationError(`Invalid ownerEmail format: '${ownerEmail}' is not a valid email address.`);
      }
    }

    const merged: TeamConfig = {
      ...defaultConfig,
      ...sourceConfig,
      aiProvider,
      aiModel,
      aiModelFallback: fallbackList,
      ownerEmail,
      jurisdiction: {
        ...defaultConfig.jurisdiction,
        ...(sourceConfig.jurisdiction || {})
      }
    };

    return this.normalizeConfigArrays(merged);
  }

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const id = this.generateULID();
    const now = new Date().toISOString();
    
    // Validate and normalize the team configuration
    const normalizedConfig = this.validateAndNormalizeConfig(teamData.config, true, id);
    
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
    const { id: _ignoreId, createdAt: _ignoreCreatedAt, ...mutableUpdates } = updates;

    // Validate and normalize the team configuration if it's being updated
    let normalizedConfig = existingTeam.config;
    if (mutableUpdates.config) {
      normalizedConfig = this.validateAndNormalizeConfig(mutableUpdates.config, true, teamId);
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

    return teams.results.map(row => {
      const rawConfig = this.decodeTeamConfig(row.config as string);
      const resolvedConfig = this.resolveEnvironmentVariables(rawConfig);
      const normalizedConfig = this.validateAndNormalizeConfig(resolvedConfig as TeamConfig, false, row.id as string);
      
      return {
        id: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        config: normalizedConfig,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
      };
    });
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
