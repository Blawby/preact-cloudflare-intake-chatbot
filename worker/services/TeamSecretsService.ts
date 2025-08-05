import type { KVNamespace } from '@cloudflare/workers-types';

export interface TeamSecret {
  apiKey: string;
  teamUlid: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSecretsEnv {
  TEAM_SECRETS: KVNamespace;
}

export class TeamSecretsService {
  private env: TeamSecretsEnv;

  constructor(env: TeamSecretsEnv) {
    this.env = env;
  }

  /**
   * Store a team's API key securely in KV
   */
  async storeTeamSecret(teamId: string, apiKey: string, teamUlid: string): Promise<void> {
    // Comprehensive input validation
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }
    
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }
    
    if (!teamUlid || typeof teamUlid !== 'string') {
      throw new Error('Team ULID must be a non-empty string');
    }

    // Trim and validate empty strings
    const trimmedTeamId = teamId.trim();
    const trimmedApiKey = apiKey.trim();
    const trimmedTeamUlid = teamUlid.trim();

    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    if (!trimmedApiKey) {
      throw new Error('API key cannot be empty or contain only whitespace');
    }

    if (!trimmedTeamUlid) {
      throw new Error('Team ULID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    // Validate team ULID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamUlid)) {
      throw new Error('Team ULID must be a valid ULID format (26 characters)');
    }

    // Validate API key format and length
    if (trimmedApiKey.length < 10) {
      throw new Error('API key must be at least 10 characters long');
    }

    if (trimmedApiKey.length > 1000) {
      throw new Error('API key is too long (maximum 1000 characters)');
    }

    // Validate API key contains only printable characters
    if (!/^[\x20-\x7E]+$/.test(trimmedApiKey)) {
      throw new Error('API key contains invalid characters (only printable ASCII allowed)');
    }

    // Ensure team ID and team ULID are different (they should be)
    if (trimmedTeamId === trimmedTeamUlid) {
      throw new Error('Team ID and Team ULID should be different values');
    }

    const secret: TeamSecret = {
      apiKey: trimmedApiKey,
      teamUlid: trimmedTeamUlid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const key = `team:${trimmedTeamId}:blawby_api`;
    await this.env.TEAM_SECRETS.put(key, JSON.stringify(secret), {
      metadata: {
        teamId: trimmedTeamId,
        type: 'blawby_api',
        createdAt: secret.createdAt
      }
    });

    console.log(`🔐 [TEAM_SECRETS] Stored API key for team: ${trimmedTeamId}`);

    // After storing the secret, clear the AIService cache for this team if available
    if (typeof globalThis !== 'undefined' && globalThis.AIService) {
      try {
        globalThis.AIService.clearCache(trimmedTeamId);
        console.log(`🧹 [TEAM_SECRETS] Cleared AIService cache for team: ${trimmedTeamId}`);
      } catch (err) {
        console.warn(`⚠️ [TEAM_SECRETS] Failed to clear AIService cache for team: ${trimmedTeamId}`, err);
      }
    }
  }

  /**
   * Retrieve a team's API key from KV
   */
  async getTeamSecret(teamId: string): Promise<TeamSecret | null> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }

    const trimmedTeamId = teamId.trim();
    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    const key = `team:${trimmedTeamId}:blawby_api`;
    const secretData = await this.env.TEAM_SECRETS.get(key);

    if (!secretData) {
      console.log(`🔐 [TEAM_SECRETS] No API key found for team: ${trimmedTeamId}`);
      return null;
    }

    try {
      const secret: TeamSecret = JSON.parse(secretData);
      
      // Validate the parsed secret has required fields
      if (!secret.apiKey || !secret.teamUlid) {
        throw new Error(`Secret data is missing required fields for team: ${trimmedTeamId}`);
      }
      
      console.log(`🔐 [TEAM_SECRETS] Retrieved API key for team: ${trimmedTeamId}`);
      return secret;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(`❌ [TEAM_SECRETS] Invalid JSON format for team: ${trimmedTeamId}`, error);
        throw new Error(`Corrupted secret data format for team: ${trimmedTeamId} - invalid JSON`);
      } else if (error instanceof Error) {
        console.error(`❌ [TEAM_SECRETS] Secret validation failed for team: ${trimmedTeamId}`, error);
        throw error; // Re-throw validation errors
      } else {
        console.error(`❌ [TEAM_SECRETS] Unexpected error parsing secret for team: ${trimmedTeamId}`, error);
        throw new Error(`Failed to parse secret data for team: ${trimmedTeamId}`);
      }
    }
  }

  /**
   * Update a team's API key
   */
  async updateTeamSecret(teamId: string, apiKey: string, teamUlid: string): Promise<void> {
    // Use the same validation as storeTeamSecret
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }
    
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }
    
    if (!teamUlid || typeof teamUlid !== 'string') {
      throw new Error('Team ULID must be a non-empty string');
    }

    // Trim and validate empty strings
    const trimmedTeamId = teamId.trim();
    const trimmedApiKey = apiKey.trim();
    const trimmedTeamUlid = teamUlid.trim();

    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    if (!trimmedApiKey) {
      throw new Error('API key cannot be empty or contain only whitespace');
    }

    if (!trimmedTeamUlid) {
      throw new Error('Team ULID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    // Validate team ULID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamUlid)) {
      throw new Error('Team ULID must be a valid ULID format (26 characters)');
    }

    // Validate API key format and length
    if (trimmedApiKey.length < 10) {
      throw new Error('API key must be at least 10 characters long');
    }

    if (trimmedApiKey.length > 1000) {
      throw new Error('API key is too long (maximum 1000 characters)');
    }

    // Validate API key contains only printable characters
    if (!/^[\x20-\x7E]+$/.test(trimmedApiKey)) {
      throw new Error('API key contains invalid characters (only printable ASCII allowed)');
    }

    // Ensure team ID and team ULID are different (they should be)
    if (trimmedTeamId === trimmedTeamUlid) {
      throw new Error('Team ID and Team ULID should be different values');
    }

    const existingSecret = await this.getTeamSecret(trimmedTeamId);
    
    const secret: TeamSecret = {
      apiKey: trimmedApiKey,
      teamUlid: trimmedTeamUlid,
      createdAt: existingSecret?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const key = `team:${trimmedTeamId}:blawby_api`;
    await this.env.TEAM_SECRETS.put(key, JSON.stringify(secret), {
      metadata: {
        teamId: trimmedTeamId,
        type: 'blawby_api',
        updatedAt: secret.updatedAt
      }
    });

    console.log(`🔐 [TEAM_SECRETS] Updated API key for team: ${trimmedTeamId}`);
  }

  /**
   * Delete a team's API key
   */
  async deleteTeamSecret(teamId: string): Promise<void> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }

    const trimmedTeamId = teamId.trim();
    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    const key = `team:${trimmedTeamId}:blawby_api`;
    await this.env.TEAM_SECRETS.delete(key);
    console.log(`🔐 [TEAM_SECRETS] Deleted API key for team: ${trimmedTeamId}`);
  }

  /**
   * List all teams with stored secrets
   */
  async listTeamSecrets(): Promise<Array<{ teamId: string; hasSecret: boolean }>> {
    const list = await this.env.TEAM_SECRETS.list({ prefix: 'team:' });
    
    const teams = new Set<string>();
    for (const key of list.keys) {
      const parts = key.name.split(':');
      if (parts.length >= 2) {
        teams.add(parts[1]);
      }
    }

    const result = Array.from(teams).map(teamId => ({
      teamId,
      hasSecret: true
    }));

    console.log(`🔐 [TEAM_SECRETS] Found ${result.length} teams with secrets`);
    return result;
  }

  /**
   * Check if a team has a stored API key
   */
  async hasTeamSecret(teamId: string): Promise<boolean> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }

    const trimmedTeamId = teamId.trim();
    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    try {
      const secret = await this.getTeamSecret(trimmedTeamId);
      return secret !== null;
    } catch (error) {
      // If there's a parsing error, the secret exists but is corrupted
      // We should log this and return false to indicate no valid secret
      console.warn(`⚠️ [TEAM_SECRETS] Corrupted secret data for team: ${trimmedTeamId}`, error);
      return false;
    }
  }

  /**
   * Get API key for Blawby integration
   */
  async getBlawbyApiKey(teamId: string): Promise<string | null> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }

    const trimmedTeamId = teamId.trim();
    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    try {
      const secret = await this.getTeamSecret(trimmedTeamId);
      return secret?.apiKey || null;
    } catch (error) {
      console.warn(`⚠️ [TEAM_SECRETS] Failed to get API key for team: ${trimmedTeamId}`, error);
      return null;
    }
  }

  /**
   * Get team ULID for Blawby integration
   */
  async getBlawbyTeamUlid(teamId: string): Promise<string | null> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }

    const trimmedTeamId = teamId.trim();
    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    try {
      const secret = await this.getTeamSecret(trimmedTeamId);
      return secret?.teamUlid || null;
    } catch (error) {
      console.warn(`⚠️ [TEAM_SECRETS] Failed to get team ULID for team: ${trimmedTeamId}`, error);
      return null;
    }
  }

  /**
   * Store webhook secret for a team
   */
  async storeWebhookSecret(teamId: string, webhookSecret: string): Promise<void> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }
    
    if (!webhookSecret || typeof webhookSecret !== 'string') {
      throw new Error('Webhook secret must be a non-empty string');
    }

    // Trim and validate empty strings
    const trimmedTeamId = teamId.trim();
    const trimmedWebhookSecret = webhookSecret.trim();

    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    if (!trimmedWebhookSecret) {
      throw new Error('Webhook secret cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    // Validate webhook secret format and length
    if (trimmedWebhookSecret.length < 10) {
      throw new Error('Webhook secret must be at least 10 characters long');
    }

    if (trimmedWebhookSecret.length > 1000) {
      throw new Error('Webhook secret is too long (maximum 1000 characters)');
    }

    // Validate webhook secret contains only printable characters
    if (!/^[\x20-\x7E]+$/.test(trimmedWebhookSecret)) {
      throw new Error('Webhook secret contains invalid characters (only printable ASCII allowed)');
    }

    const key = `team:${trimmedTeamId}:webhook_secret`;
    await this.env.TEAM_SECRETS.put(key, trimmedWebhookSecret, {
      metadata: {
        teamId: trimmedTeamId,
        type: 'webhook_secret',
        createdAt: new Date().toISOString()
      }
    });

    console.log(`🔐 [TEAM_SECRETS] Stored webhook secret for team: ${trimmedTeamId}`);
  }

  /**
   * Get webhook secret for a team
   */
  async getWebhookSecret(teamId: string): Promise<string | null> {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error('Team ID must be a non-empty string');
    }

    const trimmedTeamId = teamId.trim();
    if (!trimmedTeamId) {
      throw new Error('Team ID cannot be empty or contain only whitespace');
    }

    // Validate team ID format (should be a valid ULID)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmedTeamId)) {
      throw new Error('Team ID must be a valid ULID format (26 characters)');
    }

    const key = `team:${trimmedTeamId}:webhook_secret`;
    const secretData = await this.env.TEAM_SECRETS.get(key);
    
    if (!secretData) {
      return null;
    }

    console.log(`🔐 [TEAM_SECRETS] Retrieved webhook secret for team: ${trimmedTeamId}`);
    return secretData;
  }
} 