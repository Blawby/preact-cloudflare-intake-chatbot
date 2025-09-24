import { Env } from '../types';
import { HttpErrors } from '../errorHandler';

export interface SessionData {
  id: string;
  teamId: string;
  userFingerprint?: string;
  deviceInfo?: {
    userAgent: string;
    browser?: string;
    os?: string;
    device?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
  };
  locationInfo?: {
    country?: string;
    region?: string;
    city?: string;
    ip?: string;
  };
  status: 'active' | 'expired' | 'terminated';
  lastAccessed: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionOptions {
  teamId: string;
  sessionId?: string; // For migration - use provided ID instead of generating new one
  userFingerprint?: string;
  deviceInfo?: SessionData['deviceInfo'];
  locationInfo?: SessionData['locationInfo'];
  request?: Request; // For extracting metadata
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  reason?: string;
}

export class SessionService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create a new session with enhanced metadata tracking
   */
  async createSession(options: CreateSessionOptions): Promise<SessionData> {
    const {
      teamId,
      sessionId: providedSessionId,
      userFingerprint,
      deviceInfo,
      locationInfo,
      request
    } = options;

    // Use provided session ID or generate new one
    const sessionId = providedSessionId || crypto.randomUUID();
    
    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Extract device info from request if provided
    let enhancedDeviceInfo = deviceInfo;
    if (request && !enhancedDeviceInfo) {
      enhancedDeviceInfo = this.extractDeviceInfo(request);
    }

    // Extract location info from request if provided
    let enhancedLocationInfo = locationInfo;
    if (request && !enhancedLocationInfo) {
      enhancedLocationInfo = this.extractLocationInfo(request);
    }

    console.log('🔄 Creating new session:', {
      sessionId,
      teamId,
      userFingerprint,
      expiresAt: expiresAt.toISOString()
    });

    try {
      const stmt = this.env.DB.prepare(`
        INSERT INTO sessions (
          id, team_id, user_fingerprint, device_info, location_info,
          status, last_accessed, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
      `);

      await stmt.bind(
        sessionId,
        teamId,
        userFingerprint || null,
        enhancedDeviceInfo ? JSON.stringify(enhancedDeviceInfo) : null,
        enhancedLocationInfo ? JSON.stringify(enhancedLocationInfo) : null,
        'active',
        expiresAt.toISOString()
      ).run();

      console.log('✅ Session created successfully:', sessionId);

      // Return the created session
      return {
        id: sessionId,
        teamId,
        userFingerprint,
        deviceInfo: enhancedDeviceInfo,
        locationInfo: enhancedLocationInfo,
        status: 'active',
        lastAccessed: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw HttpErrors.internalServerError('Failed to create session');
    }
  }

  /**
   * Validate and refresh a session
   */
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    if (!sessionId) {
      return { isValid: false, reason: 'No session ID provided' };
    }

    try {
      const stmt = this.env.DB.prepare(`
        SELECT * FROM sessions WHERE id = ? AND status = 'active'
      `);
      const session = await stmt.bind(sessionId).first() as any;

      if (!session) {
        return { isValid: false, reason: 'Session not found' };
      }

      // Check if session has expired
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now > expiresAt) {
        // Mark session as expired
        await this.expireSession(sessionId);
        return { isValid: false, reason: 'Session expired' };
      }

      // Session is valid, update last accessed time and extend expiration
      await this.refreshSession(sessionId);

      const sessionData: SessionData = {
        id: session.id,
        teamId: session.team_id,
        userFingerprint: session.user_fingerprint,
        deviceInfo: session.device_info ? JSON.parse(session.device_info) : undefined,
        locationInfo: session.location_info ? JSON.parse(session.location_info) : undefined,
        status: session.status,
        lastAccessed: session.last_accessed,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };

      return { isValid: true, session: sessionData };

    } catch (error) {
      console.error('❌ Error validating session:', error);
      return { isValid: false, reason: 'Database error' };
    }
  }

  /**
   * Refresh session - update last accessed and extend expiration
   */
  async refreshSession(sessionId: string): Promise<void> {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    const stmt = this.env.DB.prepare(`
      UPDATE sessions 
      SET last_accessed = datetime('now'), 
          expires_at = ?,
          updated_at = datetime('now')
      WHERE id = ? AND status = 'active'
    `);

    await stmt.bind(newExpiresAt.toISOString(), sessionId).run();
    console.log('🔄 Session refreshed:', sessionId);
  }

  /**
   * Expire a session
   */
  async expireSession(sessionId: string): Promise<void> {
    const stmt = this.env.DB.prepare(`
      UPDATE sessions 
      SET status = 'expired', updated_at = datetime('now')
      WHERE id = ?
    `);

    await stmt.bind(sessionId).run();
    console.log('⏰ Session expired:', sessionId);
  }

  /**
   * Terminate a session (user logout)
   */
  async terminateSession(sessionId: string): Promise<void> {
    const stmt = this.env.DB.prepare(`
      UPDATE sessions 
      SET status = 'terminated', updated_at = datetime('now')
      WHERE id = ?
    `);

    await stmt.bind(sessionId).run();
    console.log('🛑 Session terminated:', sessionId);
  }

  /**
   * Find sessions by user fingerprint (for cross-device sync)
   */
  async findSessionsByFingerprint(
    userFingerprint: string, 
    teamId: string,
    limit: number = 10
  ): Promise<SessionData[]> {
    const stmt = this.env.DB.prepare(`
      SELECT * FROM sessions 
      WHERE user_fingerprint = ? AND team_id = ? AND status = 'active'
      ORDER BY last_accessed DESC
      LIMIT ?
    `);

    const sessions = await stmt.bind(userFingerprint, teamId, limit).all();

    return (sessions.results || []).map((session: any) => ({
      id: session.id,
      teamId: session.team_id,
      userFingerprint: session.user_fingerprint,
      deviceInfo: session.device_info ? JSON.parse(session.device_info) : undefined,
      locationInfo: session.location_info ? JSON.parse(session.location_info) : undefined,
      status: session.status,
      lastAccessed: session.last_accessed,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    }));
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const stmt = this.env.DB.prepare(`
      UPDATE sessions 
      SET status = 'expired', updated_at = datetime('now')
      WHERE status = 'active' AND expires_at < datetime('now')
    `);

    const result = await stmt.run();
    const expiredCount = result.changes || 0;
    
    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired sessions`);
    }

    return expiredCount;
  }

  /**
   * Get session statistics for a team
   */
  async getSessionStats(teamId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    averageSessionDuration: number;
  }> {
    const statsStmt = this.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_sessions,
        AVG(
          CASE 
            WHEN status = 'active' THEN 
              (julianday(datetime('now')) - julianday(created_at)) * 24 * 60 * 60
            ELSE 
              (julianday(updated_at) - julianday(created_at)) * 24 * 60 * 60
          END
        ) as avg_duration_seconds
      FROM sessions 
      WHERE team_id = ?
    `);

    const stats = await statsStmt.bind(teamId).first() as any;

    return {
      totalSessions: stats?.total_sessions || 0,
      activeSessions: stats?.active_sessions || 0,
      expiredSessions: stats?.expired_sessions || 0,
      averageSessionDuration: stats?.avg_duration_seconds || 0
    };
  }

  /**
   * Extract device information from request headers
   */
  private extractDeviceInfo(request: Request): SessionData['deviceInfo'] {
    const userAgent = request.headers.get('User-Agent') || '';
    
    // Simple user agent parsing (in production, consider using a library like ua-parser-js)
    const deviceInfo: SessionData['deviceInfo'] = {
      userAgent,
      timezone: request.headers.get('CF-Timezone') || undefined,
      language: request.headers.get('Accept-Language')?.split(',')[0] || undefined,
    };

    // Basic browser detection
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';

    // Basic OS detection
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';

    // Basic device type detection
    if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
    else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
    else deviceInfo.device = 'Desktop';

    return deviceInfo;
  }

  /**
   * Extract location information from Cloudflare headers
   */
  private extractLocationInfo(request: Request): SessionData['locationInfo'] {
    return {
      country: request.headers.get('CF-IPCountry') || undefined,
      region: request.headers.get('CF-Region') || undefined,
      city: request.headers.get('CF-IPCity') || undefined,
      ip: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || undefined,
    };
  }

  /**
   * Generate a device fingerprint from request
   */
  generateDeviceFingerprint(request: Request): string {
    const userAgent = request.headers.get('User-Agent') || '';
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const acceptEncoding = request.headers.get('Accept-Encoding') || '';
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';

    // Create a simple fingerprint (in production, consider more sophisticated fingerprinting)
    const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip.split('.').slice(0, 3).join('.')}`;
    
    // Simple hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < fingerprintData.length; i++) {
      const char = fingerprintData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}
