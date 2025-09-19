import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../../types';
import type { ParalegalState, MatterFormationEvent } from './types.js';
import { advanceStateMachine, buildResponse } from './stateMachine.js';

export class ParalegalHandlers {
  constructor(private state: DurableObjectState, private env: Env) {}

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

      // 3. TODO: Add user authentication check when user system is implemented
      // For now, we'll rely on the team/matter verification above
      // In the future, this should check:
      // - Request has valid authentication token/session
      // - Authenticated user is a member of the team
      // - User has appropriate permissions for the matter
      
      return true;
    } catch (error) {
      console.error(`Authorization error for team '${teamId}', matter '${matterId}':`, error);
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

    // Authorization check: verify team and matter access
    const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
    if (!isAuthorized) {
      console.warn(`Authorization failed for paralegal advance: teamId=${teamId}, matterId=${matterId}`);
      return new Response('Unauthorized', { status: 401 });
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
    
    // Authorization check for status access
    if (teamId && matterId) {
      const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
      if (!isAuthorized) {
        console.warn(`Authorization failed for paralegal status: teamId=${teamId}, matterId=${matterId}`);
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    return this.jsonResponse(buildResponse(currentState));
  }

  async handleChecklist(request: Request): Promise<Response> {
    // Extract teamId and matterId from the request or state
    const currentState = await this.getCurrentState();
    const teamId = currentState.metadata.teamId;
    const matterId = currentState.metadata.matterId;
    
    // Authorization check for checklist access
    if (teamId && matterId) {
      const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
      if (!isAuthorized) {
        console.warn(`Authorization failed for paralegal checklist: teamId=${teamId}, matterId=${matterId}`);
        return new Response('Unauthorized', { status: 401 });
      }
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