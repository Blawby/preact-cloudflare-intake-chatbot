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
        const team: Team = {
          id: teamRow.id as string,
          slug: teamRow.slug as string,
          name: teamRow.name as string,
          config: JSON.parse(teamRow.config as string),
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

    const updatedTeam: Team = {
      ...existingTeam,
      ...updates,
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
    // In a real implementation, you would validate the API token against the team
    // For now, we'll just check if the team exists
    const team = await this.getTeam(teamId);
    return team !== null;
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