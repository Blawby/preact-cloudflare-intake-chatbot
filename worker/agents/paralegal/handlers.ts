import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../../types';
import type { ParalegalState, MatterFormationEvent } from './types.js';
import { advanceStateMachine, buildResponse } from './stateMachine.js';
import { TeamService } from '../../services/TeamService.js';

// Authentication result interface
interface AuthResult {
  isAuthenticated: boolean;
  userId?: string;
  teamId?: string;
  permissions?: string[];
  error?: string;
}

export class ParalegalHandlers {
  constructor(private state: DurableObjectState, private env: Env) {}

  /**
   * Authenticates the request using Bearer JWT, session token, or API key
   * @param request - The incoming request
   * @returns Promise<AuthResult> - Authentication result with user info
   */
  private async authenticateRequest(request: Request): Promise<AuthResult> {
    try {
      const authHeader = request.headers.get('Authorization');
      const apiKeyHeader = request.headers.get('X-API-Key');
      
      // Try Bearer token authentication first
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return await this.authenticateBearerToken(token);
      }
      
      // Try API key authentication
      if (apiKeyHeader) {
        return await this.authenticateApiKey(apiKeyHeader);
      }
      
      // Try session token from cookies
      const sessionToken = this.extractSessionToken(request);
      if (sessionToken) {
        return await this.authenticateSessionToken(sessionToken);
      }
      
      return {
        isAuthenticated: false,
        error: 'No authentication credentials provided'
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        isAuthenticated: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Authenticates using Bearer JWT token
   */
  private async authenticateBearerToken(token: string): Promise<AuthResult> {
    try {
      // TODO: Implement JWT validation when JWT system is available
      // For now, treat as session token
      return await this.authenticateSessionToken(token);
    } catch (error) {
      return {
        isAuthenticated: false,
        error: 'Invalid Bearer token'
      };
    }
  }

  /**
   * Authenticates using API key
   */
  private async authenticateApiKey(apiKey: string): Promise<AuthResult> {
    try {
      const teamService = new TeamService(this.env);
      
      // Try to find team by API key
      const teams = await teamService.listTeams();
      for (const team of teams) {
        if (team.config.blawbyApi?.enabled) {
          const isValid = await teamService.validateApiKey(team.id, apiKey);
          if (isValid) {
            return {
              isAuthenticated: true,
              teamId: team.id,
              permissions: ['api_access']
            };
          }
        }
      }
      
      return {
        isAuthenticated: false,
        error: 'Invalid API key'
      };
    } catch (error) {
      console.error('API key authentication service error:', error);
      
      // Provide specific error messages for different failure types
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return {
            isAuthenticated: false,
            error: 'Authentication service temporarily unavailable. Please try again later.'
          };
        }
        if (error.message.includes('timeout')) {
          return {
            isAuthenticated: false,
            error: 'Authentication service timeout. Please try again.'
          };
        }
        if (error.message.includes('database') || error.message.includes('DB')) {
          return {
            isAuthenticated: false,
            error: 'Authentication database temporarily unavailable. Please try again later.'
          };
        }
      }
      
      return {
        isAuthenticated: false,
        error: 'Authentication service error. Please contact support if this persists.'
      };
    }
  }

  /**
   * Authenticates using session token
   */
  private async authenticateSessionToken(token: string): Promise<AuthResult> {
    try {
      // TODO: Implement session token validation when session system is available
      // For now, return mock authentication for development
      if (this.env.DEBUG) {
        return {
          isAuthenticated: true,
          userId: 'dev-user',
          permissions: ['read', 'write']
        };
      }
      
      return {
        isAuthenticated: false,
        error: 'Session authentication not implemented'
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        error: 'Session authentication failed'
      };
    }
  }

  /**
   * Extracts session token from request cookies
   */
  private extractSessionToken(request: Request): string | null {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session='));
    
    if (sessionCookie) {
      return sessionCookie.split('=')[1];
    }
    
    return null;
  }

  /**
   * Verifies user has required permissions for the team and matter
   */
  private async verifyUserPermissions(
    authResult: AuthResult, 
    teamId: string, 
    matterId: string
  ): Promise<boolean> {
    try {
      // If authenticated via API key, check team access
      if (authResult.permissions?.includes('api_access')) {
        return await this.verifyTeamAccess(teamId, matterId);
      }
      
      // TODO: Implement user team membership and permission checks
      // For now, allow authenticated users
      return authResult.isAuthenticated;
    } catch (error) {
      console.error('Permission verification error:', error);
      return false;
    }
  }

  /**
   * Verifies team and matter access authorization
   * @param teamId - The team ID to verify access to
   * @param matterId - The matter ID to verify access to
   * @returns Promise<boolean> - true if authorized, false otherwise
   */
  private async verifyTeamAccess(teamId: string, matterId: string): Promise<boolean> {
    try {
      // 1. Verify team exists
      const teamCheck = await this.env.DB.prepare('SELECT id FROM teams WHERE id = ?')
        .bind(teamId)
        .first();
      
      if (!teamCheck) {
        console.warn(`Authorization failed: Team '${teamId}' not found`);
        return false;
      }

      // 2. Verify matter exists and belongs to team
      const matterCheck = await this.env.DB.prepare('SELECT id FROM matters WHERE id = ? AND team_id = ?')
        .bind(matterId, teamId)
        .first();
      
      if (!matterCheck) {
        console.warn(`Authorization failed: Matter '${matterId}' not found or doesn't belong to team '${teamId}'`);
        return false;
      }

      // 3. Authentication and authorization are now handled by the calling methods
      // This method focuses on team/matter existence verification
      
      return true;
    } catch (error) {
      console.error(`Authorization database error for team '${teamId}', matter '${matterId}':`, error);
      
      // Log specific database errors for monitoring
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          console.error('Database timeout during authorization check');
        } else if (error.message.includes('connection')) {
          console.error('Database connection error during authorization check');
        } else if (error.message.includes('permission')) {
          console.error('Database permission error during authorization check');
        }
      }
      
      return false;
    }
  }

  async handleAdvance(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as MatterFormationEvent;
    const { idempotencyKey, teamId, matterId } = body;

    // Basic metrics tracking
    try {
      console.log('Paralegal advance operation:', { teamId, matterId, type: body.type, timestamp: Date.now() });
    } catch (e) {
      // Don't fail on metrics errors
    }

    // Handle idempotency
    if (idempotencyKey) {
      const existingResult = await this.state.storage.get(`idem:${idempotencyKey}`);
      if (existingResult) {
        console.log('Paralegal idempotent response:', { teamId, matterId, idempotencyKey });
        return this.jsonResponse({
          ...(existingResult as any),
          idempotent: true
        });
      }
    }

    // Authentication check
    const authResult = await this.authenticateRequest(request);
    if (!authResult.isAuthenticated) {
      console.warn(`Authentication failed for paralegal advance: ${authResult.error}`);
      return new Response('Unauthorized', { status: 401 });
    }

    // API key team binding check: ensure API keys can only operate within their own team
    if (authResult.permissions?.includes('api_access') && authResult.teamId !== teamId) {
      console.warn(`API key team binding violation for paralegal advance: apiKeyTeamId=${authResult.teamId}, requestedTeamId=${teamId}`);
      return new Response('Forbidden', { status: 403 });
    }

    // Authorization check: verify team and matter access
    const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
    if (!isAuthorized) {
      console.warn(`Authorization failed for paralegal advance: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Unauthorized', { status: 401 });
    }

    // Permission check: verify user has required permissions
    const hasPermissions = await this.verifyUserPermissions(authResult, teamId, matterId);
    if (!hasPermissions) {
      console.warn(`Insufficient permissions for paralegal advance: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Forbidden', { status: 403 });
    }

    const currentState = await this.getCurrentState();
    const nextState = await advanceStateMachine(currentState, body);
    
    // Log stage transitions for metrics
    if (currentState.stage !== nextState.stage) {
      console.log('Paralegal stage transition:', {
        teamId,
        matterId,
        from: currentState.stage,
        to: nextState.stage,
        timestamp: Date.now()
      });
    }
    
    await this.saveState(nextState);

    // Store idempotency result
    if (idempotencyKey) {
      const result = buildResponse(nextState);
      await this.state.storage.put(`idem:${idempotencyKey}`, result);
    }

    // Write to audit log in D1
    try {
      await this.writeAuditLog(teamId, matterId, 'stage_advance', {
        from: currentState.stage,
        to: nextState.stage,
        eventType: body.type,
        idempotencyKey
      });
    } catch (error) {
      console.warn('Failed to write audit log:', error);
      // Don't fail the operation for audit logging issues
    }

    return this.jsonResponse(buildResponse(nextState));
  }

  async handleStatus(request: Request): Promise<Response> {
    // Extract teamId and matterId from the request or state
    const currentState = await this.getCurrentState();
    const teamId = currentState.metadata.teamId;
    const matterId = currentState.metadata.matterId;
    
    // Require both teamId and matterId for any access
    if (!teamId || !matterId) {
      console.warn('Missing required metadata for authorization');
      return new Response('Bad Request: Missing team or matter ID', { status: 400 });
    }

    // Authentication check
    const authResult = await this.authenticateRequest(request);
    if (!authResult.isAuthenticated) {
      console.warn(`Authentication failed for paralegal status: ${authResult.error}`);
      return new Response('Unauthorized', { status: 401 });
    }

    // API key team binding check: ensure API keys can only operate within their own team
    if (authResult.permissions?.includes('api_access') && authResult.teamId !== teamId) {
      console.warn(`API key team binding violation for paralegal status: apiKeyTeamId=${authResult.teamId}, requestedTeamId=${teamId}`);
      return new Response('Forbidden', { status: 403 });
    }
    
    const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
    if (!isAuthorized) {
      console.warn(`Authorization failed for paralegal status: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Unauthorized', { status: 401 });
    }

    // Permission check: verify user has required permissions
    const hasPermissions = await this.verifyUserPermissions(authResult, teamId, matterId);
    if (!hasPermissions) {
      console.warn(`Insufficient permissions for paralegal status: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Forbidden', { status: 403 });
    }
    
    return this.jsonResponse(buildResponse(currentState));
  }

  async handleChecklist(request: Request): Promise<Response> {
    // Extract teamId and matterId from the request or state
    const currentState = await this.getCurrentState();
    const teamId = currentState.metadata.teamId;
    const matterId = currentState.metadata.matterId;
    
    // Require both teamId and matterId for any access
    if (!teamId || !matterId) {
      console.warn('Missing required metadata for authorization');
      return new Response('Bad Request: Missing team or matter ID', { status: 400 });
    }

    // Authentication check
    const authResult = await this.authenticateRequest(request);
    if (!authResult.isAuthenticated) {
      console.warn(`Authentication failed for paralegal checklist: ${authResult.error}`);
      return new Response('Unauthorized', { status: 401 });
    }

    // API key team binding check: ensure API keys can only operate within their own team
    if (authResult.permissions?.includes('api_access') && authResult.teamId !== teamId) {
      console.warn(`API key team binding violation for paralegal checklist: apiKeyTeamId=${authResult.teamId}, requestedTeamId=${teamId}`);
      return new Response('Forbidden', { status: 403 });
    }
    
    const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
    if (!isAuthorized) {
      console.warn(`Authorization failed for paralegal checklist: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Unauthorized', { status: 401 });
    }

    // Permission check: verify user has required permissions
    const hasPermissions = await this.verifyUserPermissions(authResult, teamId, matterId);
    if (!hasPermissions) {
      console.warn(`Insufficient permissions for paralegal checklist: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Forbidden', { status: 403 });
    }
    
    return this.jsonResponse({
      checklist: currentState.checklist,
      stage: currentState.stage,
      completed: currentState.stage === 'completed'
    });
  }

  private async getCurrentState(): Promise<ParalegalState> {
    const stored = await this.state.storage.get<ParalegalState>('state');
    
    if (stored) {
      return stored;
    }

    // Initialize default state
    const { initializeChecklist } = await import('./stateMachine.js');
    const defaultState: ParalegalState = {
      stage: 'collect_parties',
      checklist: initializeChecklist('collect_parties'),
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.saveState(defaultState);
    return defaultState;
  }

  private async saveState(state: ParalegalState): Promise<void> {
    state.updatedAt = Date.now();
    await this.state.storage.put('state', state);
  }

  private async writeAuditLog(
    teamId?: string,
    matterId?: string,
    action: string = 'unknown',
    metadata: any = {}
  ): Promise<void> {
    if (!teamId || !matterId) return;

    try {
      // Note: In a real DO, we'd need to access the DB through a service or API
      // For now, we'll just log the audit event - this would typically be done
      // via a queue message or service call
      console.log('Audit log entry:', {
        id: crypto.randomUUID(),
        matter_id: matterId,
        team_id: teamId,
        actor: 'paralegal.do',
        action,
        entity_type: 'matter_formation',
        entity_id: matterId,
        old_values: metadata.from ? { stage: metadata.from } : null,
        new_values: metadata.to ? { stage: metadata.to } : null,
        metadata,
        created_at: new Date().toISOString()
      });

      // TODO: In production, send this to a queue for async DB writing
      // await this.env.PARALEGAL_TASKS.send({
      //   type: 'audit_log',
      //   data: { teamId, matterId, action, metadata }
      // });

    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  private jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}