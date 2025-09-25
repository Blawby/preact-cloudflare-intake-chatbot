import type { Env } from '../types.js';
import { parseJsonBody } from '../utils.js';
import { HttpErrors, CORS_HEADERS } from '../errorHandler.js';
import { runPipeline } from '../middleware/pipeline.js';
import { ConversationContextManager } from '../middleware/conversationContextManager.js';
import { contentPolicyFilter } from '../middleware/contentPolicyFilter.js';
import { businessScopeValidator } from '../middleware/businessScopeValidator.js';
import { jurisdictionValidator } from '../middleware/jurisdictionValidator.js';
import { createLoggingMiddleware } from '../middleware/pipeline.js';
import { caseDraftMiddleware } from '../middleware/caseDraftMiddleware.js';
import { documentChecklistMiddleware } from '../middleware/documentChecklistMiddleware.js';
import { skipToLawyerMiddleware } from '../middleware/skipToLawyerMiddleware.js';
import { pdfGenerationMiddleware } from '../middleware/pdfGenerationMiddleware.js';
import { runLegalIntakeAgentStream } from '../agents/legal-intake/index.js';
import { getCloudflareLocation } from '../utils/cloudflareLocationValidator.js';
import { SessionService } from '../services/SessionService.js';

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
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'] || '*',
    'Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods'] || 'POST, OPTIONS',
    'Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'] || 'Content-Type'
  });

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

    const trimmedSessionId = typeof sessionId === 'string' && sessionId.trim().length > 0
      ? sessionId.trim()
      : undefined;

    let effectiveTeamId = typeof teamId === 'string' && teamId.trim().length > 0
      ? teamId.trim()
      : undefined;

    if (!effectiveTeamId && trimmedSessionId) {
      try {
        const priorSession = await SessionService.getSessionById(env, trimmedSessionId);
        if (priorSession) {
          effectiveTeamId = priorSession.teamId;
        }
      } catch (lookupError) {
        console.warn('Failed to lookup existing session before resolution', lookupError);
      }
    }

    if (!effectiveTeamId) {
      throw HttpErrors.badRequest('teamId is required for agent interactions');
    }

    const sessionResolution = await SessionService.resolveSession(env, {
      request,
      sessionId: trimmedSessionId,
      teamId: effectiveTeamId,
      createIfMissing: true
    });

    const resolvedSessionId = sessionResolution.session.id;
    const resolvedTeamId = sessionResolution.session.teamId;

    if (sessionResolution.cookie) {
      headers.append('Set-Cookie', sessionResolution.cookie);
    }

    effectiveTeamId = resolvedTeamId;

    // Persist the latest user message for auditing
    try {
      const metadata = attachments.length > 0
        ? {
            attachments: attachments.map(att => ({
              id: att.id ?? null,
              name: att.name,
              size: att.size,
              type: att.type,
              url: att.url
            }))
          }
        : undefined;

      await SessionService.persistMessage(env, {
        sessionId: resolvedSessionId,
        teamId: resolvedTeamId,
        role: 'user',
        content: latestMessage.content,
        metadata,
        messageId: typeof (latestMessage as any).id === 'string' ? (latestMessage as any).id : undefined
      });
    } catch (persistError) {
      console.warn('Failed to persist chat message to D1', persistError);
    }

    // Get team configuration
    let teamConfig = null;
    if (effectiveTeamId) {
      try {
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const rawTeamConfig = await aiService.getTeamConfig(effectiveTeamId);
        teamConfig = rawTeamConfig;
      } catch (error) {
        console.warn('Failed to get team config:', error);
      }
    }

    // Get Cloudflare location data
    const cloudflareLocation = getCloudflareLocation(request);

    // Load conversation context
    const context = await ConversationContextManager.load(resolvedSessionId, resolvedTeamId, env);

    // Update context with the full conversation before running pipeline
    const updatedContext = ConversationContextManager.updateContext(context, messages);

    // Run through pipeline with full conversation history
    const pipelineResult = await runPipeline(
      messages,
      updatedContext,
      teamConfig,
      [
        createLoggingMiddleware(),
        contentPolicyFilter,
        businessScopeValidator,
        skipToLawyerMiddleware, // Move skip middleware before jurisdiction validator
        jurisdictionValidator,
        caseDraftMiddleware,
        documentChecklistMiddleware,
        pdfGenerationMiddleware
      ],
      env
    );

    // Save updated context
    const saveSuccess = await ConversationContextManager.save(pipelineResult.context, env);
    if (!saveSuccess) {
      console.warn('Failed to save conversation context for session:', pipelineResult.context.sessionId);
    }

    // If pipeline provided a response, return it with UI components
    if (pipelineResult.response && pipelineResult.response !== 'AI_HANDLE') {
      // Create streaming response to include UI components
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial connection event
            controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
            
            // Send the main response
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
            controller.enqueue(new TextEncoder().encode(responseEvent));
            
            // Check for UI components in context and send them as separate events
            if (pipelineResult.context.caseDraft) {
              const matterCanvasEvent = `data: ${JSON.stringify({
                type: 'matter_canvas',
                data: {
                  matterId: pipelineResult.context.caseDraft.matter_type.toLowerCase().replace(/\s+/g, '-'),
                  matterNumber: `CASE-${Date.now()}`,
                  service: pipelineResult.context.caseDraft.matter_type,
                  matterSummary: pipelineResult.context.caseDraft.key_facts?.join(' ') || 'Case information organized',
                  answers: {}
                }
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(matterCanvasEvent));
            }
            
            if (pipelineResult.context.documentChecklist) {
              const { documentChecklist } = pipelineResult.context;
              const providedSet = new Set((documentChecklist.provided || []).map(name => name.toLowerCase().trim()));
              
              const documentChecklistEvent = `data: ${JSON.stringify({
                type: 'document_checklist',
                data: {
                  matterType: documentChecklist.matter_type,
                  documents: (documentChecklist.required || []).map(name => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name: name,
                    description: `Required document for ${documentChecklist.matter_type}`,
                    required: true,
                    status: providedSet.has(name.toLowerCase().trim()) ? 'provided' : 'missing'
                  }))
                }
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(documentChecklistEvent));
            }
            
            if (pipelineResult.context.generatedPDF) {
              const pdfGenerationEvent = `data: ${JSON.stringify({
                type: 'pdf_generation',
                data: {
                  filename: pipelineResult.context.generatedPDF.filename,
                  size: pipelineResult.context.generatedPDF.size,
                  generatedAt: pipelineResult.context.generatedPDF.generatedAt,
                  matterType: pipelineResult.context.generatedPDF.matterType
                }
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(pdfGenerationEvent));
            }
            
            if (pipelineResult.context.lawyerSearchResults) {
              const lawyerSearchEvent = `data: ${JSON.stringify({
                type: 'lawyer_search',
                data: {
                  matterType: pipelineResult.context.lawyerSearchResults.matterType,
                  lawyers: pipelineResult.context.lawyerSearchResults.lawyers,
                  total: pipelineResult.context.lawyerSearchResults.total
                }
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(lawyerSearchEvent));
            }
            
            

              // Send completion event
              controller.enqueue(new TextEncoder().encode('data: {"type":"complete"}\n\n'));
              controller.close();
            
          } catch (error) {
            console.error('Error in pipeline response stream:', error);
            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
            controller.close();
          }
        }
      });
      
      return new Response(stream, { headers });
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
            effectiveTeamId,
            resolvedSessionId,
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
