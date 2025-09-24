import type { Env } from '../types.js';
import { parseJsonBody } from '../utils.js';
import { HttpErrors, CORS_HEADERS } from '../errorHandler.js';
import { runPipeline } from '../middleware/pipeline.js';
import { ConversationContextManager } from '../middleware/conversationContextManager.js';
import { contentPolicyFilter } from '../middleware/contentPolicyFilter.js';
import { businessScopeValidator } from '../middleware/businessScopeValidator.js';
import { jurisdictionValidator } from '../middleware/jurisdictionValidator.js';
import { createLoggingMiddleware } from '../middleware/pipeline.js';
import { runLegalIntakeAgentStream } from '../agents/legal-intake/index.js';
import { getCloudflareLocation } from '../utils/cloudflareLocationValidator.js';

// Interface for the request body
interface RouteBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  teamId?: string;
  sessionId?: string;
  attachments?: Array<{
    id?: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
}

/**
 * Modern pipeline-based agent handler
 * Uses context-aware middleware instead of hard security filters
 */
export async function handleAgentStreamV2(request: Request, env: Env): Promise<Response> {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'] || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  // Set SSE headers for streaming
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'] || '*',
    'Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods'] || 'POST, OPTIONS',
    'Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'] || 'Content-Type',
  };

  try {
    const rawBody = await parseJsonBody(request);
    
    // Runtime validation of request body
    if (!isValidRouteBody(rawBody)) {
      throw HttpErrors.badRequest('Invalid request body format. Expected messages array with valid message objects.');
    }
    
    const body = rawBody as RouteBody;
    const { messages, teamId, sessionId, attachments = [] } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw HttpErrors.badRequest('No message content provided');
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.content) {
      throw HttpErrors.badRequest('No message content provided');
    }

    // Ensure the latest message is from a user
    if (latestMessage.role !== 'user') {
      throw HttpErrors.badRequest('Latest message must be from user');
    }

    // Get team configuration
    let teamConfig = null;
    if (teamId) {
      try {
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const rawTeamConfig = await aiService.getTeamConfig(teamId);
        teamConfig = rawTeamConfig;
      } catch (error) {
        console.warn('Failed to get team config:', error);
      }
    }

    // Get Cloudflare location data
    const cloudflareLocation = getCloudflareLocation(request);

    // Load conversation context
    const context = await ConversationContextManager.load(sessionId || 'default', teamId || 'default', env);

    // Update context with the latest message before running pipeline
    const updatedContext = ConversationContextManager.updateContext(context, latestMessage.content);

    // Run through pipeline with updated context
    const pipelineResult = await runPipeline(
      latestMessage.content,
      updatedContext,
      teamConfig,
      [
        createLoggingMiddleware(),
        contentPolicyFilter,
        businessScopeValidator,
        jurisdictionValidator
      ]
    );

    // Save updated context
    const saveSuccess = await ConversationContextManager.save(pipelineResult.context, env);
    if (!saveSuccess) {
      console.warn('Failed to save conversation context for session:', pipelineResult.context.sessionId);
    }

    // If pipeline provided a response, return it
    if (pipelineResult.response && pipelineResult.response !== 'AI_HANDLE') {
      const responseEvent = `data: ${JSON.stringify({
        type: 'pipeline_response',
        response: pipelineResult.response,
        middlewareUsed: pipelineResult.middlewareUsed,
        context: {
          establishedMatters: pipelineResult.context.establishedMatters,
          userIntent: pipelineResult.context.userIntent,
          conversationPhase: pipelineResult.context.conversationPhase
        }
      })}\n\n`;
      
      return new Response(responseEvent, { headers });
    }

    // Pipeline didn't provide a response - let AI handle it
    console.log('✅ Pipeline passed, creating AI stream...');

    // Create streaming response using ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
          
          // Convert messages to the format expected by the AI agent
          const formattedMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Validate attachment sizes before processing
          const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB limit
          const oversizedAttachments: string[] = [];
          
          for (const att of attachments) {
            if (att.size > MAX_ATTACHMENT_SIZE) {
              oversizedAttachments.push(`${att.name} (${(att.size / 1024 / 1024).toFixed(1)}MB)`);
            }
          }
          
          if (oversizedAttachments.length > 0) {
            throw HttpErrors.payloadTooLarge(
              `Attachment size limit exceeded. Maximum allowed size is ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB. ` +
              `Oversized attachments: ${oversizedAttachments.join(', ')}`
            );
          }

          const fileAttachments = attachments.map(att => ({
            id: att.id || crypto.randomUUID(),
            name: att.name,
            type: att.type,
            size: att.size,
            url: att.url
          }));

          // Run the AI agent with updated context
          await runLegalIntakeAgentStream(
            env, 
            formattedMessages, 
            teamId, 
            sessionId, 
            cloudflareLocation, 
            controller, 
            fileAttachments
          );
          
        } catch (error) {
          console.error('🚨 ERROR in AI agent:', error);
          
          // Send error event via SSE
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: `Agent error: ${error instanceof Error ? error.message : String(error)}`,
            correlationId: `route_${Date.now()}`
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          
          // Send complete event
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(completeEvent));
          
          // Close controller
          controller.close();
        }
      }
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('🚨 ERROR in agent route:', error);
    
    const errorEvent = `data: ${JSON.stringify({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      correlationId: `route_${Date.now()}`
    })}\n\n`;
    
    return new Response(errorEvent, { headers });
  }
}

/**
 * Validate request body format
 */
function isValidRouteBody(obj: unknown): obj is RouteBody {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const body = obj as Record<string, unknown>;
  
  if (!Array.isArray(body.messages)) {
    return false;
  }

  // Validate each message
  for (const message of body.messages) {
    if (!message || typeof message !== 'object') {
      return false;
    }
    
    const msg = message as Record<string, unknown>;
    
    if (typeof msg.role !== 'string' || !['user', 'assistant', 'system'].includes(msg.role)) {
      return false;
    }
    
    if (typeof msg.content !== 'string') {
      return false;
    }
  }

  // Optional fields validation
  if (body.teamId !== undefined && typeof body.teamId !== 'string') return false;
  if (body.sessionId !== undefined && typeof body.sessionId !== 'string') return false;

  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments)) return false;
    for (const att of body.attachments as any[]) {
      if (!att || typeof att !== 'object') return false;
      const nameOk = typeof att.name === 'string' && att.name.length > 0;
      const typeOk = typeof att.type === 'string' && att.type.length > 0;
      const sizeOk = typeof att.size === 'number' && att.size >= 0 && Number.isFinite(att.size);
      const urlOk = typeof att.url === 'string' && /^(https?):\/\//i.test(att.url);
      if (!(nameOk && typeOk && sizeOk && urlOk)) return false;
    }
  }

  return true;
}
