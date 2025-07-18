import type { Env } from './types';

export async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON");
  }
}

export async function logChatMessage(
  env: Env,
  sessionId: string,
  teamId: string | undefined,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  try {
    const messageId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO chat_logs (id, session_id, team_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(messageId, sessionId, teamId || null, role, content).run();
  } catch (error) {
    console.warn('Failed to log chat message:', error);
  }
}

export async function storeMatterQuestion(
  env: Env,
  matterId: string | undefined,
  teamId: string | undefined,
  question: string,
  answer: string,
  source: 'ai-form' | 'human-entry' | 'followup' = 'ai-form'
): Promise<void> {
  try {
    const questionId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO matter_questions (id, matter_id, team_id, question, answer, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(questionId, matterId || null, teamId || null, question, answer, source).run();
  } catch (error) {
    console.warn('Failed to store matter question:', error);
  }
}

export async function createMatterRecord(
  env: Env,
  teamId: string,
  sessionId: string,
  service: string,
  description: string,
  urgency: string = 'normal'
): Promise<string> {
  try {
    const matterId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const matterNumberResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM matters 
      WHERE team_id = ? AND strftime('%Y', created_at) = ?
    `).bind(teamId, year.toString()).first();
    const count = (matterNumberResult as any)?.count || 0;
    const matterNumber = `MAT-${year}-${(count + 1).toString().padStart(3, '0')}`;
    await env.DB.prepare(`
      INSERT INTO matters (
        id, team_id, client_name, matter_type, title, description, status, priority, 
        lead_source, matter_number, custom_fields, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'lead', ?, 'website', ?, ?, datetime('now'))
    `).bind(
      matterId,
      teamId,
      'Client (AI Intake)', // Default client name for AI-generated matters
      service,
      `${service} Matter`,
      description,
      urgency === 'urgent' ? 'high' : urgency === 'somewhat urgent' ? 'normal' : 'low',
      matterNumber,
      JSON.stringify({ sessionId, source: 'ai-intake' })
    ).run();
    return matterId;
  } catch (error) {
    console.warn('Failed to create matter record:', error);
    throw error;
  }
}

export async function storeAISummary(
  env: Env,
  matterId: string | undefined,
  summary: string,
  modelUsed: string,
  promptSnapshot: string
): Promise<void> {
  try {
    const summaryId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO ai_generated_summaries (id, matter_id, summary, model_used, prompt_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(summaryId, matterId || null, summary, modelUsed, promptSnapshot).run();
  } catch (error) {
    console.warn('Failed to store AI summary:', error);
  }
}

export async function updateAISummary(
  env: Env,
  matterId: string,
  summary: string,
  modelUsed: string,
  promptSnapshot: string
): Promise<void> {
  try {
    // First, check if there's an existing summary for this matter
    const existingSummary = await env.DB.prepare(`
      SELECT id FROM ai_generated_summaries 
      WHERE matter_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(matterId).first();
    
    if (existingSummary) {
      // Update the existing summary
      await env.DB.prepare(`
        UPDATE ai_generated_summaries 
        SET summary = ?, model_used = ?, prompt_snapshot = ?, created_at = datetime('now')
        WHERE id = ?
      `).bind(summary, modelUsed, promptSnapshot, (existingSummary as any).id).run();
    } else {
      // Create a new summary if none exists
      await storeAISummary(env, matterId, summary, modelUsed, promptSnapshot);
    }
  } catch (error) {
    console.warn('Failed to update AI summary:', error);
  }
}

export async function updateMatterRecord(
  env: Env,
  matterId: string,
  description: string,
  urgency: string = 'normal'
): Promise<void> {
  try {
    await env.DB.prepare(`
      UPDATE matters 
      SET description = ?, priority = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      description,
      urgency === 'urgent' ? 'high' : urgency === 'somewhat urgent' ? 'normal' : 'low',
      matterId
    ).run();
  } catch (error) {
    console.warn('Failed to update matter record:', error);
  }
}

export async function getMatterIdBySession(
  env: Env,
  sessionId: string,
  teamId: string
): Promise<string | null> {
  try {
    const result = await env.DB.prepare(`
      SELECT id FROM matters 
      WHERE custom_fields->>'$.sessionId' = ? AND team_id = ?
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(sessionId, teamId).first();
    
    return (result as any)?.id || null;
  } catch (error) {
    console.warn('Failed to get matter ID by session:', error);
    return null;
  }
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}; 