import type { Env } from '../types.js';

export interface SessionRecord {
  id: string;
  teamId: string;
  state: 'active' | 'closed' | 'archived';
  statusReason?: string | null;
  retentionHorizonDays: number;
  isHold: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
  closedAt?: string | null;
  tokenHash?: string | null;
}

export interface SessionResolution {
  session: SessionRecord;
  sessionToken: string;
  cookie?: string;
  isNew: boolean;
  isEphemeral?: boolean;
}

export interface PersistedMessageInput {
  sessionId: string;
  teamId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: unknown;
  tokenCount?: number;
  messageId?: string;
  createdAt?: number;
}

const SESSION_COOKIE_NAME = 'blawby_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const DEFAULT_RETENTION_DAYS = 180;

function toIsoString(timestamp?: number): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date();
  return date.toISOString();
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [cookieName, ...rest] = part.trim().split('=');
    if (cookieName === name) {
      return rest.join('=');
    }
  }
  return null;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function mapSessionRow(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    state: (row.state as SessionRecord['state']) ?? 'active',
    statusReason: (row.status_reason as string) ?? null,
    retentionHorizonDays: typeof row.retention_horizon_days === 'number'
      ? row.retention_horizon_days
      : Number(row.retention_horizon_days ?? DEFAULT_RETENTION_DAYS),
    isHold: Boolean(row.is_hold),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    lastActive: String(row.last_active ?? new Date().toISOString()),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    tokenHash: row.token_hash ? String(row.token_hash) : null
  };
}

async function tokensMatch(rawToken: string | null | undefined, tokenHashValue: string | null | undefined): Promise<boolean> {
  if (!rawToken || !tokenHashValue) {
    return false;
  }
  const computed = await hashToken(rawToken);
  return computed === tokenHashValue;
}

export class SessionService {
  static getCookieName(): string {
    return SESSION_COOKIE_NAME;
  }

  static getCookieMaxAgeSeconds(): number {
    return SESSION_COOKIE_MAX_AGE_SECONDS;
  }

  static buildSessionCookie(token: string, maxAgeSeconds = SESSION_COOKIE_MAX_AGE_SECONDS): string {
    const parts = [
      `${SESSION_COOKIE_NAME}=${token}`,
      'Path=/',
      `Max-Age=${maxAgeSeconds}`,
      'HttpOnly',
      'SameSite=Lax',
      'Secure'
    ];
    return parts.join('; ');
  }

  static getSessionTokenFromCookie(request: Request): string | null {
    return parseCookie(request.headers.get('Cookie'), SESSION_COOKIE_NAME);
  }

  static async getSessionById(env: Env, sessionId: string): Promise<SessionRecord | null> {
    const stmt = env.DB.prepare(`
      SELECT id, team_id, state, status_reason, retention_horizon_days, is_hold,
             created_at, updated_at, last_active, closed_at, token_hash
        FROM chat_sessions
       WHERE id = ?
       LIMIT 1
    `);
    const row = await stmt.bind(sessionId).first<Record<string, unknown>>();
    if (!row) return null;
    return mapSessionRow(row);
  }

  static async getSessionByToken(env: Env, rawToken: string, teamId: string): Promise<SessionRecord | null> {
    const tokenHashValue = await hashToken(rawToken);
    const stmt = env.DB.prepare(`
      SELECT id, team_id, state, status_reason, retention_horizon_days, is_hold,
             created_at, updated_at, last_active, closed_at, token_hash
        FROM chat_sessions
       WHERE token_hash = ? AND team_id = ?
       LIMIT 1
    `);
    const row = await stmt.bind(tokenHashValue, teamId).first<Record<string, unknown>>();
    if (!row) return null;
    return mapSessionRow(row);
  }

  static async setSessionToken(env: Env, sessionId: string, rawToken: string): Promise<void> {
    const now = toIsoString();
    const tokenHashValue = await hashToken(rawToken);
    const stmt = env.DB.prepare(`
      UPDATE chat_sessions
         SET token_hash = ?, updated_at = ?, last_active = COALESCE(last_active, ?)
       WHERE id = ?
    `);
    await stmt.bind(tokenHashValue, now, now, sessionId).run();
  }

  static async touchSession(env: Env, sessionId: string): Promise<void> {
    const now = toIsoString();
    const stmt = env.DB.prepare(`
      UPDATE chat_sessions
         SET last_active = ?, updated_at = ?
       WHERE id = ?
    `);
    await stmt.bind(now, now, sessionId).run();
  }

  static async createSession(env: Env, options: {
    teamId: string;
    sessionId?: string;
    sessionToken?: string;
    retentionHorizonDays?: number;
  }): Promise<SessionResolution> {
    const sessionId = options.sessionId ?? crypto.randomUUID();
    const sessionToken = options.sessionToken ?? crypto.randomUUID();
    const nowIso = toIsoString();
    const retention = options.retentionHorizonDays ?? DEFAULT_RETENTION_DAYS;
    const tokenHashValue = await hashToken(sessionToken);

    // Security check: if sessionId is provided, ensure it doesn't belong to another team
    if (options.sessionId) {
      const existingSession = await this.getSessionById(env, sessionId);
      if (existingSession && existingSession.teamId !== options.teamId) {
        throw new Error(`Session ${sessionId} already exists and belongs to a different team`);
      }
    }

    // Use a more secure approach: separate INSERT and UPDATE operations
    const existingSession = await this.getSessionById(env, sessionId);
    
    if (existingSession) {
      // Session exists - only allow updates if it belongs to the same team
      if (existingSession.teamId !== options.teamId) {
        throw new Error(`Session ${sessionId} belongs to team ${existingSession.teamId}, cannot be accessed by team ${options.teamId}`);
      }
      
      // Update existing session (same team)
      const updateStmt = env.DB.prepare(`
        UPDATE chat_sessions 
        SET state = 'active',
            retention_horizon_days = ?,
            updated_at = ?,
            last_active = ?
        WHERE id = ? AND team_id = ?
      `);
      
      await updateStmt.bind(
        retention,
        nowIso,
        nowIso,
        sessionId,
        options.teamId
      ).run();
      
    } else {
      // Create new session
      const insertStmt = env.DB.prepare(`
        INSERT INTO chat_sessions (
          id, team_id, token_hash, state, status_reason, retention_horizon_days,
          is_hold, created_at, updated_at, last_active
        ) VALUES (?, ?, ?, 'active', NULL, ?, 0, ?, ?, ?)
      `);
      
      await insertStmt.bind(
        sessionId,
        options.teamId,
        tokenHashValue,
        retention,
        nowIso,
        nowIso,
        nowIso
      ).run();
    }

    const session = await this.getSessionById(env, sessionId);
    if (!session) {
      throw new Error('Failed to persist session');
    }

    // Final security check: ensure the session belongs to the expected team
    if (session.teamId !== options.teamId) {
      throw new Error(`Session creation failed: team mismatch (expected ${options.teamId}, got ${session.teamId})`);
    }

    const cookie = this.buildSessionCookie(sessionToken);

    return {
      session,
      sessionToken,
      cookie,
      isNew: true
    };
  }

  static async resolveSession(env: Env, options: {
    request?: Request;
    sessionId?: string;
    sessionToken?: string | null;
    teamId: string;
    retentionHorizonDays?: number;
    createIfMissing?: boolean;
  }): Promise<SessionResolution> {
    try {
      const normalizedTeam = options.teamId.trim();
      let providedToken = options.sessionToken ?? null;
      if (!providedToken && options.request) {
        providedToken = this.getSessionTokenFromCookie(options.request);
      }

      let session: SessionRecord | null = null;

      if (options.sessionId) {
        session = await this.getSessionById(env, options.sessionId);
        if (session && session.teamId !== normalizedTeam) {
          session = null;
        }
      }

      if (!session && providedToken) {
        session = await this.getSessionByToken(env, providedToken, normalizedTeam);
      }

      if (!session) {
        if (options.createIfMissing === false) {
          throw new Error('Session not found and creation disabled');
        }
        const created = await this.createSession(env, {
          teamId: normalizedTeam,
          sessionId: options.sessionId,
          sessionToken: providedToken ?? undefined,
          retentionHorizonDays: options.retentionHorizonDays
        });
        return created;
      }

      let cookie: string | undefined;
      let sessionToken = providedToken ?? crypto.randomUUID();

      if (!(await tokensMatch(providedToken, session.tokenHash))) {
        sessionToken = crypto.randomUUID();
        await this.setSessionToken(env, session.id, sessionToken);
        cookie = this.buildSessionCookie(sessionToken);
        session.tokenHash = await hashToken(sessionToken);
      }

      await this.touchSession(env, session.id);

      const refreshed = await this.getSessionById(env, session.id);

      return {
        session: refreshed ?? session,
        sessionToken,
        cookie,
        isNew: false
      };
    } catch (error) {
      console.warn('[SessionService] Falling back to ephemeral session', {
        teamId: options.teamId,
        sessionId: options.sessionId,
        message: error instanceof Error ? error.message : String(error)
      });
      return this.createEphemeralSession(options.teamId, {
        sessionId: options.sessionId,
        sessionToken: options.sessionToken ?? undefined
      });
    }
  }

  static async persistMessage(env: Env, input: PersistedMessageInput): Promise<void> {
    const messageId = input.messageId ?? crypto.randomUUID();
    const createdAt = toIsoString(input.createdAt);
    const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

    const stmt = env.DB.prepare(`
      INSERT INTO chat_messages (
        id, session_id, team_id, role, content, metadata, token_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        metadata = excluded.metadata,
        token_count = excluded.token_count
    `);

    await stmt.bind(
      messageId,
      input.sessionId,
      input.teamId,
      input.role,
      input.content,
      metadata,
      input.tokenCount ?? null,
      createdAt
    ).run();
  }

  private static createEphemeralSession(
    teamId: string,
    options: { sessionId?: string | null; sessionToken?: string }
  ): SessionResolution {
    const sessionId = options.sessionId && options.sessionId.trim().length > 0
      ? options.sessionId.trim()
      : crypto.randomUUID();
    const sessionToken = options.sessionToken && options.sessionToken.trim().length > 0
      ? options.sessionToken.trim()
      : crypto.randomUUID();
    const nowIso = toIsoString();

    const session: SessionRecord = {
      id: sessionId,
      teamId: teamId.trim(),
      state: 'active',
      statusReason: 'ephemeral_fallback',
      retentionHorizonDays: DEFAULT_RETENTION_DAYS,
      isHold: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastActive: nowIso,
      closedAt: null,
      tokenHash: null
    };

    const cookie = this.buildSessionCookie(sessionToken);

    return {
      session,
      sessionToken,
      cookie,
      isNew: true,
      isEphemeral: true
    };
  }
}
