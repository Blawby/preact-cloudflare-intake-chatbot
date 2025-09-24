import { SessionService } from '../services/SessionService';
import { Env } from '../types';

/**
 * Session cleanup consumer for Cloudflare Queues
 * Automatically cleans up expired sessions on a schedule
 */
export class SessionCleanupConsumer {
  private env: Env;
  private sessionService: SessionService;

  constructor(env: Env) {
    this.env = env;
    this.sessionService = new SessionService(env);
  }

  /**
   * Process session cleanup queue messages
   */
  async consume(batch: MessageBatch<any>): Promise<void> {
    console.log('🧹 Processing session cleanup batch:', batch.messages.length, 'messages');

    for (const message of batch.messages) {
      try {
        await this.processCleanupMessage(message);
        message.ack();
      } catch (error) {
        console.error('❌ Failed to process cleanup message:', error);
        message.retry();
      }
    }
  }

  /**
   * Process a single cleanup message
   */
  private async processCleanupMessage(message: Message<any>): Promise<void> {
    const { type, data } = message.body;

    switch (type) {
      case 'cleanup_expired_sessions':
        await this.cleanupExpiredSessions();
        break;
      
      case 'cleanup_orphaned_conversations':
        await this.cleanupOrphanedConversations();
        break;
      
      case 'update_session_stats':
        await this.updateSessionStats(data?.teamId);
        break;
      
      default:
        console.warn('⚠️ Unknown cleanup message type:', type);
    }
  }

  /**
   * Clean up expired sessions and related data
   */
  private async cleanupExpiredSessions(): Promise<void> {
    console.log('🧹 Starting expired session cleanup...');

    try {
      // Clean up expired sessions
      const expiredCount = await this.sessionService.cleanupExpiredSessions();
      
      // Clean up conversations for expired sessions
      const orphanedConversationsStmt = this.env.DB.prepare(`
        UPDATE conversations 
        SET status = 'archived', updated_at = datetime('now')
        WHERE session_id IN (
          SELECT id FROM sessions WHERE status = 'expired'
        ) AND status = 'active'
      `);
      const conversationResult = await orphanedConversationsStmt.run();
      const archivedConversations = conversationResult.changes || 0;

      console.log(`✅ Session cleanup completed: ${expiredCount} sessions expired, ${archivedConversations} conversations archived`);

      // Update cleanup statistics
      await this.updateCleanupStats(expiredCount, archivedConversations);

    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up conversations that are orphaned (no valid session)
   */
  private async cleanupOrphanedConversations(): Promise<void> {
    console.log('🧹 Cleaning up orphaned conversations...');

    try {
      const orphanedStmt = this.env.DB.prepare(`
        UPDATE conversations 
        SET status = 'archived', updated_at = datetime('now')
        WHERE session_id NOT IN (
          SELECT id FROM sessions WHERE status = 'active'
        ) AND status = 'active'
      `);
      
      const result = await orphanedStmt.run();
      const orphanedCount = result.changes || 0;

      console.log(`✅ Orphaned conversation cleanup completed: ${orphanedCount} conversations archived`);

    } catch (error) {
      console.error('❌ Orphaned conversation cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Update session statistics for a team
   */
  private async updateSessionStats(teamId?: string): Promise<void> {
    if (!teamId) {
      console.log('🔄 Updating session stats for all teams...');
      
      // Get all team IDs
      const teamsStmt = this.env.DB.prepare('SELECT id FROM teams');
      const teams = await teamsStmt.all();
      
      for (const team of teams.results || []) {
        await this.sessionService.getSessionStats(team.id);
      }
    } else {
      console.log('🔄 Updating session stats for team:', teamId);
      await this.sessionService.getSessionStats(teamId);
    }

    console.log('✅ Session stats update completed');
  }

  /**
   * Update cleanup statistics
   */
  private async updateCleanupStats(expiredSessions: number, archivedConversations: number): Promise<void> {
    try {
      // Store cleanup statistics (could be expanded to a dedicated table)
      const statsStmt = this.env.DB.prepare(`
        INSERT OR REPLACE INTO team_api_tokens 
        (id, team_id, token_name, token_hash, permissions, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      await statsStmt.bind(
        'cleanup-stats',
        '01K0TNGNKTM4Q0AG0XF0A8ST0Q', // blawby-ai team
        'Session Cleanup Stats',
        'internal-stats',
        JSON.stringify({ type: 'cleanup_stats' }),
        JSON.stringify({
          lastCleanup: new Date().toISOString(),
          expiredSessions,
          archivedConversations,
          totalCleaned: expiredSessions + archivedConversations
        })
      ).run();

    } catch (error) {
      console.warn('⚠️ Failed to update cleanup stats:', error);
      // Don't throw - cleanup stats are not critical
    }
  }
}

/**
 * Schedule session cleanup jobs
 */
export async function scheduleSessionCleanup(env: Env): Promise<void> {
  try {
    // Schedule cleanup every 6 hours
    await env.SESSION_CLEANUP_QUEUE.send({
      type: 'cleanup_expired_sessions',
      scheduledFor: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    });

    // Schedule orphaned conversation cleanup daily
    await env.SESSION_CLEANUP_QUEUE.send({
      type: 'cleanup_orphaned_conversations',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    console.log('✅ Session cleanup jobs scheduled');

  } catch (error) {
    console.error('❌ Failed to schedule session cleanup:', error);
  }
}

/**
 * Manual cleanup trigger (for testing or emergency cleanup)
 */
export async function triggerManualCleanup(env: Env): Promise<{
  expiredSessions: number;
  archivedConversations: number;
}> {
  const consumer = new SessionCleanupConsumer(env);
  
  const expiredCount = await consumer['sessionService'].cleanupExpiredSessions();
  
  const orphanedStmt = env.DB.prepare(`
    UPDATE conversations 
    SET status = 'archived', updated_at = datetime('now')
    WHERE session_id NOT IN (
      SELECT id FROM sessions WHERE status = 'active'
    ) AND status = 'active'
  `);
  
  const result = await orphanedStmt.run();
  const archivedCount = result.changes || 0;

  return {
    expiredSessions: expiredCount,
    archivedConversations: archivedCount
  };
}
