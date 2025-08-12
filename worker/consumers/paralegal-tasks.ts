import type { Env } from '../types';

export interface ParalegalTaskMessage {
  type: 'audit_log' | 'risk_assessment' | 'document_request' | 'conflict_check' | 'engagement_letter';
  matterId: string;
  teamId: string;
  data: any;
  timestamp: number;
}

export default {
  async queue(batch: MessageBatch<ParalegalTaskMessage>, env: Env): Promise<void> {
    console.log(`Processing ${batch.messages.length} paralegal task messages`);

    for (const message of batch.messages) {
      try {
        await processParalegalTask(message.body, env);
        console.log('Successfully processed paralegal task:', message.body.type);
      } catch (error) {
        console.error('Failed to process paralegal task:', error);
        
        // Retry the message
        message.retry();
      }
    }
  }
};

async function processParalegalTask(task: ParalegalTaskMessage, env: Env): Promise<void> {
  const { type, matterId, teamId, data } = task;

  switch (type) {
    case 'audit_log':
      await writeAuditLog(task, env);
      break;
      
    case 'risk_assessment':
      await processRiskAssessment(task, env);
      break;
      
    case 'document_request':
      await processDocumentRequest(task, env);
      break;
      
    case 'conflict_check':
      await processConflictCheck(task, env);
      break;
      
    case 'engagement_letter':
      await processEngagementLetter(task, env);
      break;
      
    default:
      console.warn('Unknown paralegal task type:', type);
  }
}

async function writeAuditLog(task: ParalegalTaskMessage, env: Env): Promise<void> {
  const { matterId, teamId, data } = task;
  
  await env.DB.prepare(`
    INSERT INTO audit_log (
      id, matter_id, team_id, actor, action, entity_type, entity_id,
      old_values, new_values, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    crypto.randomUUID(),
    matterId,
    teamId,
    data.actor || 'paralegal.queue',
    data.action || 'unknown',
    data.entityType || 'matter_formation',
    data.entityId || matterId,
    JSON.stringify(data.oldValues || null),
    JSON.stringify(data.newValues || null),
    JSON.stringify(data.metadata || {}),
  ).run();
  
  console.log('Audit log entry created for matter:', matterId);
}

async function processRiskAssessment(task: ParalegalTaskMessage, env: Env): Promise<void> {
  const { matterId, data } = task;
  
  // This would trigger a risk assessment service
  console.log('Processing risk assessment for matter:', matterId);
  
  // For now, just log the task
  await env.DB.prepare(`
    INSERT INTO risk_assessments (
      id, matter_id, assessment_type, risk_level, risk_factors,
      recommendations, confidence_score, model_used, assessed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    crypto.randomUUID(),
    matterId,
    'queue_triggered',
    data.riskLevel || 'medium',
    JSON.stringify(data.riskFactors || []),
    JSON.stringify(data.recommendations || []),
    data.confidenceScore || 0.7,
    data.modelUsed || 'queue-processor',
    data.assessedBy || 'system'
  ).run();
}

async function processDocumentRequest(task: ParalegalTaskMessage, env: Env): Promise<void> {
  const { matterId, data } = task;
  
  console.log('Processing document request for matter:', matterId);
  
  // Update document requirement status
  if (data.documentType && data.status) {
    await env.DB.prepare(`
      UPDATE document_requirements 
      SET status = ?, updated_at = datetime('now')
      WHERE matter_id = ? AND document_type = ?
    `).bind(data.status, matterId, data.documentType).run();
  }
}

async function processConflictCheck(task: ParalegalTaskMessage, env: Env): Promise<void> {
  const { matterId, teamId, data } = task;
  
  console.log('Processing conflict check for matter:', matterId);
  
  // Record the conflict check result
  await env.DB.prepare(`
    INSERT INTO conflict_checks (
      id, matter_id, parties, result, cleared, checked_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    crypto.randomUUID(),
    matterId,
    JSON.stringify(data.parties || []),
    JSON.stringify(data.result || {}),
    data.cleared || false,
    data.checkedBy || 'queue-processor',
    data.notes || 'Processed via queue'
  ).run();
}

async function processEngagementLetter(task: ParalegalTaskMessage, env: Env): Promise<void> {
  const { matterId, data } = task;
  
  console.log('Processing engagement letter for matter:', matterId);
  
  // Update engagement letter status
  if (data.letterId && data.status) {
    await env.DB.prepare(`
      UPDATE engagement_letters 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(data.status, data.letterId).run();
  }
}
