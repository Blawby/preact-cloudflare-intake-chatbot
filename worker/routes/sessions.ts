import { createSuccessResponse, handleError, HttpErrors } from '../errorHandler';
import { parseJsonBody } from '../utils';
import { SessionService } from '../services/SessionService';
import type { Env } from '../types';

export async function handleSessions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const sessionService = new SessionService(env);

  // POST /api/sessions/create - Create new session with enhanced metadata
  if (path === '/api/sessions/create' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request);
      const { teamId, userFingerprint, deviceInfo, locationInfo, sessionId: providedSessionId, migration } = body;

      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      console.log('🔄 Creating enhanced session for team:', teamId);

      // Get actual team ID from slug if needed
      let actualTeamId = teamId;
      if (teamId === 'blawby-ai') {
        const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE slug = ?');
        const team = await teamCheckStmt.bind('blawby-ai').first();
        actualTeamId = team?.id || '01K0TNGNKTM4Q0AG0XF0A8ST0Q';
      }

      // Generate device fingerprint if not provided
      const fingerprint = userFingerprint || sessionService.generateDeviceFingerprint(request);

      const session = await sessionService.createSession({
        teamId: actualTeamId,
        sessionId: providedSessionId, // Support for migration
        userFingerprint: fingerprint,
        deviceInfo,
        locationInfo,
        request
      });

      // Log migration if applicable
      if (migration && providedSessionId) {
        console.log('✅ Legacy session migrated to database:', providedSessionId);
      }

      return createSuccessResponse({
        sessionId: session.id,
        userFingerprint: session.userFingerprint,
        deviceInfo: session.deviceInfo,
        expiresAt: session.expiresAt,
        message: 'Enhanced session created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating enhanced session:', error);
      return handleError(error);
    }
  }

  // GET /api/sessions/{sessionId}/validate - Enhanced session validation
  if (path.startsWith('/api/sessions/') && path.endsWith('/validate') && request.method === 'GET') {
    try {
      const pathParts = path.split('/');
      const sessionId = pathParts[pathParts.length - 2]; // Get sessionId before /validate
      
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID is required');
      }

      console.log('🔍 Validating enhanced session:', sessionId);

      // Use SessionService for validation
      const validation = await sessionService.validateSession(sessionId);

      if (!validation.isValid) {
        return createSuccessResponse({
          valid: false,
          sessionId: sessionId,
          reason: validation.reason
        });
      }

      // Get conversation data if session is valid
      const conversationStmt = env.DB.prepare(`
        SELECT id, team_id, status, created_at, updated_at
        FROM conversations 
        WHERE session_id = ?
      `);
      const conversation = await conversationStmt.bind(sessionId).first();

      // Get message and file counts
      let messageCount = 0;
      let fileCount = 0;

      if (conversation) {
        const messageCountStmt = env.DB.prepare(`
          SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
        `);
        const msgResult = await messageCountStmt.bind(conversation.id).first();
        messageCount = msgResult?.count || 0;

        const fileCountStmt = env.DB.prepare(`
          SELECT COUNT(*) as count FROM files WHERE session_id = ? AND is_deleted = FALSE
        `);
        const fileResult = await fileCountStmt.bind(sessionId).first();
        fileCount = fileResult?.count || 0;
      }

      return createSuccessResponse({
        valid: true,
        sessionId: sessionId,
        session: validation.session,
        conversationId: conversation?.id,
        messageCount,
        fileCount,
        message: 'Session is valid and active'
      });

    } catch (error) {
      console.error('Error validating session:', error);
      return handleError(error);
    }
  }

  // POST /api/sessions - Create new session
  if (path === '/api/sessions' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { teamId = 'blawby-ai' } = body;

      const sessionId = crypto.randomUUID();
      const conversationId = crypto.randomUUID();

      // Get actual team ID
      let actualTeamId = teamId;
      if (teamId === 'blawby-ai') {
        const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE slug = ?');
        const defaultTeam = await teamCheckStmt.bind('blawby-ai').first();
        actualTeamId = defaultTeam?.id || '01K0TNGNKTM4Q0AG0XF0A8ST0Q';
      }

      // Create conversation record
      const createConversationStmt = env.DB.prepare(`
        INSERT INTO conversations (id, team_id, session_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'))
      `);
      await createConversationStmt.bind(conversationId, actualTeamId, sessionId).run();

      console.log('Created new session:', sessionId, 'with conversation:', conversationId);

      return createSuccessResponse({
        sessionId,
        conversationId,
        teamId: actualTeamId,
        created: true
      });

    } catch (error) {
      console.error('Error creating session:', error);
      return handleError(error);
    }
  }

  // GET /api/sessions/conversations/{teamId} - List conversations for a team
  if (path.startsWith('/api/sessions/conversations/') && request.method === 'GET') {
    try {
      const teamId = path.split('/').pop();
      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      console.log('Fetching conversations for team:', teamId);

      // Get actual team ID from slug if needed
      let actualTeamId = teamId;
      if (teamId === 'blawby-ai') {
        const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE slug = ?');
        const team = await teamCheckStmt.bind('blawby-ai').first();
        actualTeamId = team?.id || '01K0TNGNKTM4Q0AG0XF0A8ST0Q';
      }

      // Get conversations with message counts and recent activity
      const conversationsStmt = env.DB.prepare(`
        SELECT 
          c.id,
          c.session_id,
          c.status,
          c.created_at,
          c.updated_at,
          -- Count messages for this conversation
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
          -- Count files for this session
          (SELECT COUNT(*) FROM files f WHERE f.session_id = c.session_id AND f.is_deleted = FALSE) as file_count,
          -- Get the first user message as title
          (SELECT content FROM messages m 
           WHERE m.conversation_id = c.id 
           AND m.is_user = 1 
           ORDER BY m.created_at ASC 
           LIMIT 1) as first_message,
          -- Get the latest message preview
          (SELECT content FROM messages m 
           WHERE m.conversation_id = c.id 
           ORDER BY m.created_at DESC 
           LIMIT 1) as latest_message,
          -- Get the last message timestamp
          (SELECT created_at FROM messages m 
           WHERE m.conversation_id = c.id 
           ORDER BY m.created_at DESC 
           LIMIT 1) as last_message_at
        FROM conversations c
        WHERE c.team_id = ? 
        AND (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) > 0
        ORDER BY c.updated_at DESC
        LIMIT 50
      `);
      
      const conversations = await conversationsStmt.bind(actualTeamId).all();

      console.log('Found conversations for team:', conversations.results?.length || 0);

      // Format conversations for frontend
      const formattedConversations = (conversations.results || []).map((conv: any) => ({
        id: conv.id,
        sessionId: conv.session_id,
        title: conv.first_message ? 
          (conv.first_message.length > 50 ? 
            conv.first_message.substring(0, 50) + '...' : 
            conv.first_message) : 
          'New Conversation',
        preview: conv.latest_message ? 
          (conv.latest_message.length > 100 ? 
            conv.latest_message.substring(0, 100) + '...' : 
            conv.latest_message) : 
          '',
        messageCount: conv.message_count || 0,
        fileCount: conv.file_count || 0,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        status: conv.status
      }));

      return createSuccessResponse({
        conversations: formattedConversations,
        count: formattedConversations.length,
        teamId: actualTeamId
      });

    } catch (error) {
      console.error('Error fetching conversations:', error);
      return handleError(error);
    }
  }

  // POST /api/sessions/{sessionId}/refresh - Refresh session expiration
  if (path.startsWith('/api/sessions/') && path.endsWith('/refresh') && request.method === 'POST') {
    try {
      const pathParts = path.split('/');
      const sessionId = pathParts[pathParts.length - 2]; // Get sessionId before /refresh
      
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID is required');
      }

      await sessionService.refreshSession(sessionId);

      return createSuccessResponse({
        sessionId: sessionId,
        message: 'Session refreshed successfully'
      });

    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      return handleError(error);
    }
  }

  // DELETE /api/sessions/{sessionId} - Terminate session
  if (path.startsWith('/api/sessions/') && !path.includes('/') && request.method === 'DELETE') {
    try {
      const sessionId = path.split('/').pop();
      
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID is required');
      }

      await sessionService.terminateSession(sessionId);

      return createSuccessResponse({
        sessionId: sessionId,
        message: 'Session terminated successfully'
      });

    } catch (error) {
      console.error('❌ Error terminating session:', error);
      return handleError(error);
    }
  }

  // GET /api/sessions/fingerprint/{fingerprint}/{teamId} - Find sessions by fingerprint
  if (path.startsWith('/api/sessions/fingerprint/') && request.method === 'GET') {
    try {
      const pathParts = path.split('/');
      const fingerprint = pathParts[4];
      const teamId = pathParts[5];
      
      if (!fingerprint || !teamId) {
        throw HttpErrors.badRequest('Fingerprint and team ID are required');
      }

      const sessions = await sessionService.findSessionsByFingerprint(fingerprint, teamId);

      return createSuccessResponse({
        fingerprint,
        teamId,
        sessions,
        count: sessions.length,
        message: 'Sessions retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error finding sessions by fingerprint:', error);
      return handleError(error);
    }
  }

  // POST /api/sessions/cleanup - Comprehensive cleanup of expired sessions and orphaned data
  if (path === '/api/sessions/cleanup' && request.method === 'POST') {
    try {
      console.log('🧹 Starting comprehensive session cleanup...');

      // Clean up expired sessions
      const expiredCount = await sessionService.cleanupExpiredSessions();
      
      // Clean up orphaned conversations
      const orphanedConversationsStmt = env.DB.prepare(`
        UPDATE conversations 
        SET status = 'archived', updated_at = datetime('now')
        WHERE session_id NOT IN (
          SELECT id FROM sessions WHERE status = 'active'
        ) AND status = 'active'
      `);
      const conversationResult = await orphanedConversationsStmt.run();
      const archivedConversations = conversationResult.changes || 0;

      // Clean up orphaned files (soft delete files for archived conversations)
      const orphanedFilesStmt = env.DB.prepare(`
        UPDATE files 
        SET is_deleted = TRUE, updated_at = datetime('now')
        WHERE session_id NOT IN (
          SELECT id FROM sessions WHERE status = 'active'
        ) AND is_deleted = FALSE
      `);
      const filesResult = await orphanedFilesStmt.run();
      const archivedFiles = filesResult.changes || 0;

      console.log(`✅ Comprehensive cleanup completed: ${expiredCount} sessions, ${archivedConversations} conversations, ${archivedFiles} files`);

      return createSuccessResponse({
        expiredSessions: expiredCount,
        archivedConversations,
        archivedFiles,
        totalCleaned: expiredCount + archivedConversations + archivedFiles,
        message: `Cleanup completed: ${expiredCount} sessions expired, ${archivedConversations} conversations archived, ${archivedFiles} files archived`
      });

    } catch (error) {
      console.error('❌ Error during comprehensive cleanup:', error);
      return handleError(error);
    }
  }

  // GET /api/sessions/stats/{teamId} - Get session statistics
  if (path.startsWith('/api/sessions/stats/') && request.method === 'GET') {
    try {
      const teamId = path.split('/').pop();
      
      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      const stats = await sessionService.getSessionStats(teamId);

      return createSuccessResponse({
        teamId,
        stats,
        message: 'Session statistics retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error getting session stats:', error);
      return handleError(error);
    }
  }

  throw HttpErrors.notFound('Session endpoint not found');
}
