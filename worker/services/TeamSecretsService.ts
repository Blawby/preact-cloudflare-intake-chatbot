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
    // Input validation
    if (!teamId?.trim() || !apiKey?.trim() || !teamUlid?.trim()) {
      throw new Error('Team ID, API key, and team ULID are required and cannot be empty');
    }
    
    // Validate ULID format (basic check)
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(teamUlid)) {
      throw new Error('Invalid team ULID format');
    }

    // Validate API key format (should be a non-empty string)
    if (apiKey.length < 10) {
      throw new Error('API key appears to be too short');
    }

    const secret: TeamSecret = {
      apiKey,
      teamUlid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const key = `team:${teamId}:blawby_api`;
    await this.env.TEAM_SECRETS.put(key, JSON.stringify(secret), {
      metadata: {
        teamId,
        type: 'blawby_api',
        createdAt: secret.createdAt
      }
    });

    console.log(`🔐 [TEAM_SECRETS] Stored API key for team: ${teamId}`);
  }

  /**
   * Retrieve a team's API key from KV
   */
  async getTeamSecret(teamId: string): Promise<TeamSecret | null> {
    const key = `team:${teamId}:blawby_api`;
    const secretData = await this.env.TEAM_SECRETS.get(key);

    if (!secretData) {
      console.log(`🔐 [TEAM_SECRETS] No API key found for team: ${teamId}`);
      return null;
    }

    try {
      const secret: TeamSecret = JSON.parse(secretData);
      console.log(`🔐 [TEAM_SECRETS] Retrieved API key for team: ${teamId}`);
      return secret;
    } catch (error) {
      console.error(`❌ [TEAM_SECRETS] Failed to parse secret for team: ${teamId}`, error);
      throw new Error(`Invalid secret data format for team: ${teamId}`);
    }
  }

  /**
   * Update a team's API key
   */
  async updateTeamSecret(teamId: string, apiKey: string, teamUlid: string): Promise<void> {
    const existingSecret = await this.getTeamSecret(teamId);
    
    const secret: TeamSecret = {
      apiKey,
      teamUlid,
      createdAt: existingSecret?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const key = `team:${teamId}:blawby_api`;
    await this.env.TEAM_SECRETS.put(key, JSON.stringify(secret), {
      metadata: {
        teamId,
        type: 'blawby_api',
        updatedAt: secret.updatedAt
      }
    });

    console.log(`🔐 [TEAM_SECRETS] Updated API key for team: ${teamId}`);
  }

  /**
   * Delete a team's API key
   */
  async deleteTeamSecret(teamId: string): Promise<void> {
    const key = `team:${teamId}:blawby_api`;
    await this.env.TEAM_SECRETS.delete(key);
    console.log(`🔐 [TEAM_SECRETS] Deleted API key for team: ${teamId}`);
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
    const secret = await this.getTeamSecret(teamId);
    return secret !== null;
  }

  /**
   * Get API key for Blawby integration
   */
  async getBlawbyApiKey(teamId: string): Promise<string | null> {
    const secret = await this.getTeamSecret(teamId);
    return secret?.apiKey || null;
  }

  /**
   * Get team ULID for Blawby integration
   */
  async getBlawbyTeamUlid(teamId: string): Promise<string | null> {
    const secret = await this.getTeamSecret(teamId);
    return secret?.teamUlid || null;
  }

  /**
   * Store webhook secret for a team
   */
  async storeWebhookSecret(teamId: string, webhookSecret: string): Promise<void> {
    if (!teamId?.trim() || !webhookSecret?.trim()) {
      throw new Error('Team ID and webhook secret are required and cannot be empty');
    }

    const key = `team:${teamId}:webhook_secret`;
    await this.env.TEAM_SECRETS.put(key, webhookSecret, {
      metadata: {
        teamId,
        type: 'webhook_secret',
        createdAt: new Date().toISOString()
      }
    });

    console.log(`🔐 [TEAM_SECRETS] Stored webhook secret for team: ${teamId}`);
  }

  /**
   * Get webhook secret for a team
   */
  async getWebhookSecret(teamId: string): Promise<string | null> {
    if (!teamId?.trim()) {
      throw new Error('Team ID is required');
    }

    const key = `team:${teamId}:webhook_secret`;
    const secretData = await this.env.TEAM_SECRETS.get(key);
    
    if (!secretData) {
      return null;
    }

    console.log(`🔐 [TEAM_SECRETS] Retrieved webhook secret for team: ${teamId}`);
    return secretData;
  }
} 