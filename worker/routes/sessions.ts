import { createSuccessResponse, handleError, HttpErrors } from '../errorHandler';
import type { Env } from '../types';

export async function handleSessions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/sessions/{sessionId}/validate - Validate session exists
  if (path.startsWith('/api/sessions/') && path.endsWith('/validate') && request.method === 'GET') {
    try {
      const pathParts = path.split('/');
      const sessionId = pathParts[pathParts.length - 2]; // Get sessionId before /validate
      
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID is required');
      }

      console.log('Validating session:', sessionId);

      // Check if session exists in conversations table
      const conversationStmt = env.DB.prepare(`
        SELECT id, team_id, session_id, status, created_at, updated_at
        FROM conversations 
        WHERE session_id = ?
      `);
      const conversation = await conversationStmt.bind(sessionId).first();

      if (!conversation) {
        return createSuccessResponse({
          valid: false,
          exists: false,
          sessionId: sessionId
        });
      }

      // Get message count for this conversation
      const messageCountStmt = env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM messages 
        WHERE conversation_id = ?
      `);
      const messageCount = await messageCountStmt.bind(conversation.id).first();

      // Get file count for this session
      const fileCountStmt = env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM files 
        WHERE session_id = ? AND is_deleted = FALSE
      `);
      const fileCount = await fileCountStmt.bind(sessionId).first();

      console.log('Session validation result:', {
        sessionId,
        exists: true,
        messageCount: messageCount?.count || 0,
        fileCount: fileCount?.count || 0
      });

      return createSuccessResponse({
        valid: true,
        exists: true,
        sessionId: sessionId,
        conversation: {
          id: conversation.id,
          teamId: conversation.team_id,
          status: conversation.status,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at
        },
        stats: {
          messageCount: messageCount?.count || 0,
          fileCount: fileCount?.count || 0
        }
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

  throw HttpErrors.notFound('Session endpoint not found');
}
