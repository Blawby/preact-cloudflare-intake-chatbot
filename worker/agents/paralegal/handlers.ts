import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../../types';
import type { ParalegalState, MatterFormationEvent } from './types.js';
import { advanceStateMachine, buildResponse } from './stateMachine.js';

export class ParalegalHandlers {
  constructor(private state: DurableObjectState, private env: Env) {}

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

    // TODO: Add team/matter authorization check here
    // const isAuthorized = await this.verifyTeamAccess(teamId, matterId);
    // if (!isAuthorized) return new Response('Unauthorized', { status: 401 });

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
    const currentState = await this.getCurrentState();
    return this.jsonResponse(buildResponse(currentState));
  }

  async handleChecklist(request: Request): Promise<Response> {
    const currentState = await this.getCurrentState();
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