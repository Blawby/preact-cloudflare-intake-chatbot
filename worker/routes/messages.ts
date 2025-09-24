import { createSuccessResponse, createErrorResponse, handleError, HttpErrors } from '../errorHandler';
import { SECURITY_HEADERS } from '../utils/cors';
import type { Env } from '../types';

export async function handleMessages(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/messages/{sessionId} - Load conversation history
  if (path.startsWith('/api/messages/') && request.method === 'GET') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID is required');
      }

      console.log('Loading messages for session:', sessionId);

      // First, get the conversation record
      const conversationStmt = env.DB.prepare(`
        SELECT id, team_id, session_id, status, created_at
        FROM conversations 
        WHERE session_id = ?
      `);
      const conversation = await conversationStmt.bind(sessionId).first();

      if (!conversation) {
        // Return empty messages for non-existent sessions
        return createSuccessResponse({
          messages: [],
          count: 0,
          conversation: null
        });
      }

      // Get messages for this conversation
      const messagesStmt = env.DB.prepare(`
        SELECT id, conversation_id, content, is_user, metadata, created_at
        FROM messages 
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `);
      const messages = await messagesStmt.bind(conversation.id).all();

      console.log('Found messages for session:', messages.results?.length || 0);

      return createSuccessResponse({
        messages: messages.results || [],
        count: messages.results?.length || 0,
        conversation: {
          id: conversation.id,
          sessionId: conversation.session_id,
          teamId: conversation.team_id,
          status: conversation.status,
          createdAt: conversation.created_at
        }
      });

    } catch (error) {
      console.error('Error loading messages:', error);
      return handleError(error);
    }
  }

  // POST /api/messages - Save new message
  if (path === '/api/messages' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { content, isUser, sessionId, teamId, metadata = null } = body;

      // Validate required fields
      if (!content || typeof isUser !== 'boolean' || !sessionId) {
        throw HttpErrors.badRequest('Missing required fields: content, isUser, sessionId');
      }

      console.log('Saving message for session:', sessionId, 'isUser:', isUser);

      // Get or create conversation
      let conversationId: string;
      
      const conversationStmt = env.DB.prepare(`
        SELECT id FROM conversations WHERE session_id = ?
      `);
      const existingConversation = await conversationStmt.bind(sessionId).first();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        conversationId = crypto.randomUUID();
        
        // Get team ID if provided, otherwise use default
        let actualTeamId = teamId;
        if (!actualTeamId) {
          // Default to blawby-ai team
          const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE slug = ?');
          const defaultTeam = await teamCheckStmt.bind('blawby-ai').first();
          actualTeamId = defaultTeam?.id || '01K0TNGNKTM4Q0AG0XF0A8ST0Q';
        }

        const createConversationStmt = env.DB.prepare(`
          INSERT INTO conversations (id, team_id, session_id, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `);
        await createConversationStmt.bind(conversationId, actualTeamId, sessionId).run();
        console.log('Created new conversation:', conversationId);
      }

      // Save message
      const messageId = crypto.randomUUID();
      const saveMessageStmt = env.DB.prepare(`
        INSERT INTO messages (id, conversation_id, content, is_user, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);
      
      await saveMessageStmt.bind(
        messageId,
        conversationId,
        content,
        isUser ? 1 : 0, // SQLite uses 1/0 for boolean
        metadata ? JSON.stringify(metadata) : null
      ).run();

      // Update conversation timestamp and increment message count
      const updateConversationStmt = env.DB.prepare(`
        UPDATE conversations 
        SET updated_at = datetime('now')
        WHERE id = ?
      `);
      await updateConversationStmt.bind(conversationId).run();
      
      console.log('Updated conversation timestamp for:', conversationId);

      console.log('Message saved successfully:', messageId);

      return createSuccessResponse({
        messageId,
        conversationId,
        sessionId,
        saved: true
      });

    } catch (error) {
      console.error('Error saving message:', error);
      return handleError(error);
    }
  }

  throw HttpErrors.notFound('Message endpoint not found');
}
