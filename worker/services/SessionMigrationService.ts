import { Env } from "../types";

export class SessionMigrationService {
  /**
   * Migrate anonymous session data to authenticated user account
   * Called after user signs up/in for the first time with an existing session
   */
  static async migrateSessionToUser(
    sessionId: string,
    userId: string,
    env: Env
  ): Promise<void> {
    // Migrate conversations from session to user
    await env.DB.prepare(`
      UPDATE conversations 
      SET user_id = ? 
      WHERE session_id = ? AND user_id IS NULL
    `).bind(userId, sessionId).run();

    // Migrate matters
    await env.DB.prepare(`
      UPDATE matters 
      SET user_id = ? 
      WHERE id IN (
        SELECT DISTINCT m.id 
        FROM matters m
        JOIN conversations c ON c.organization_id = m.organization_id
        WHERE c.session_id = ? AND m.user_id IS NULL
      )
    `).bind(userId, sessionId).run();

    // Migrate messages
    await env.DB.prepare(`
      UPDATE messages 
      SET user_id = ? 
      WHERE conversation_id IN (
        SELECT id FROM conversations WHERE session_id = ?
      ) AND user_id IS NULL
    `).bind(userId, sessionId).run();

    // Migrate chat_sessions
    await env.DB.prepare(`
      UPDATE chat_sessions 
      SET user_id = ? 
      WHERE id = ? AND user_id IS NULL
    `).bind(userId, sessionId).run();

    // Migrate chat_messages
    await env.DB.prepare(`
      UPDATE chat_messages 
      SET user_id = ? 
      WHERE session_id = ? AND user_id IS NULL
    `).bind(userId, sessionId).run();

    // Migrate files
    await env.DB.prepare(`
      UPDATE files 
      SET user_id = ? 
      WHERE session_id = ? AND user_id IS NULL
    `).bind(userId, sessionId).run();

    console.log(`✅ Migrated session ${sessionId} data to user ${userId}`);
  }
}

