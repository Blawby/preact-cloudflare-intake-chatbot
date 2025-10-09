import type { Env } from '../types.js';
import { parseJsonBody } from '../utils.js';
import { HttpErrors } from '../errorHandler.js';
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
import { fileAnalysisMiddleware } from '../middleware/fileAnalysisMiddleware.js';
import { runLegalIntakeAgentStream } from '../agents/legal-intake/index.js';
import { getCloudflareLocation } from '../utils/cloudflareLocationValidator.js';
import { SessionService } from '../services/SessionService.js';
import { chunkResponseText } from '../utils/streaming.js';

// Interface for the request body
interface RouteBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  teamId?: string;
  sessionId?: string;
  aiProvider?: string;
  aiModel?: string;
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

  // Handle GET requests for SSE connections
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      throw HttpErrors.badRequest('sessionId parameter is required');
    }

    // Create SSE response for status updates
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // For now, return a simple SSE stream that sends periodic status updates
    // In a real implementation, this would connect to a Durable Object or KV store
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
        
        // Keep connection alive with periodic pings
        const interval = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
          } catch (error) {
            clearInterval(interval);
          }
        }, 30000); // Ping every 30 seconds

        // Clean up on close
        request.signal?.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      }
    });

    return new Response(stream, { headers });
  }

  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST and GET methods are allowed');
  }

  // Set SSE headers for streaming
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  try {
    const rawBody = await parseJsonBody(request);
    
    // Runtime validation of request body
    if (!isValidRouteBody(rawBody)) {
      throw HttpErrors.badRequest('Invalid request body format. Expected messages array with valid message objects.');
    }
    
    const body = rawBody as RouteBody;
    const { messages, teamId, sessionId, attachments = [], aiProvider, aiModel } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw HttpErrors.badRequest('No message content provided');
    }
    
    const normalizedMessages = messages.map(message => {
      const rawRole = typeof message.role === 'string' ? message.role.trim().toLowerCase() : '';
      const normalizedRole = rawRole === 'user'
        ? 'user'
        : rawRole === 'system'
          ? 'system'
          : 'assistant';

      const content = typeof message.content === 'string' ? message.content : '';

      return {
        ...message,
        role: normalizedRole,
        content
      };
    });

    let latestMessage = normalizedMessages[normalizedMessages.length - 1];

    if (!latestMessage?.content) {
      if (attachments.length > 0) {
        latestMessage = {
          ...latestMessage,
          content: latestMessage?.content?.trim().length
            ? latestMessage.content
            : 'User uploaded new documents for review.'
        };
        normalizedMessages[normalizedMessages.length - 1] = latestMessage;
      } else {
        throw HttpErrors.badRequest('No message content provided');
      }
    }

    if (latestMessage.role !== 'user') {
      if (attachments.length > 0) {
        latestMessage = {
          ...latestMessage,
          role: 'user'
        };
        normalizedMessages[normalizedMessages.length - 1] = latestMessage;
      } else {
        throw HttpErrors.badRequest('Latest message must be from user');
      }
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

    const providerOverride = typeof aiProvider === 'string' && aiProvider.trim().length > 0
      ? aiProvider.trim()
      : undefined;
    const modelOverride = typeof aiModel === 'string' && aiModel.trim().length > 0
      ? aiModel.trim()
      : undefined;

    const sessionResolution = await SessionService.resolveSession(env, {
      request,
      sessionId: trimmedSessionId,
      teamId: effectiveTeamId,
      createIfMissing: true
    });

    const resolvedSessionId = sessionResolution.session.id;
    const resolvedTeamId = sessionResolution.session.teamId;

    // Security check: ensure session belongs to the requested team
    if (resolvedTeamId !== effectiveTeamId) {
      throw HttpErrors.forbidden('Session does not belong to the specified team');
    }

    if (sessionResolution.cookie) {
      headers.append('Set-Cookie', sessionResolution.cookie);
    }

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

      const messageRecord = latestMessage as { id?: unknown };
      const messageId = typeof messageRecord.id === 'string' ? messageRecord.id : undefined;

      await SessionService.persistMessage(env, {
        sessionId: resolvedSessionId,
        teamId: resolvedTeamId,
        role: 'user',
        content: latestMessage.content,
        metadata,
        messageId
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
    const updatedContext = ConversationContextManager.updateContext(context, normalizedMessages);
    
    // Add current attachments to context for middleware processing
    if (attachments && attachments.length > 0) {
      updatedContext.currentAttachments = attachments;
    }

    // Run through pipeline with full conversation history
    const pipelineResult = await runPipeline(
      normalizedMessages,
      updatedContext,
      teamConfig,
      [
        createLoggingMiddleware(),
        contentPolicyFilter,
        skipToLawyerMiddleware,
        businessScopeValidator,
        fileAnalysisMiddleware, // Handle file analysis early in pipeline
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
          const encoder = new TextEncoder();
          const sendEvent = (event: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          };

          try {
            sendEvent({ type: 'connected' });

            const responseChunks = chunkResponseText(pipelineResult.response);
            if (responseChunks.length === 0) {
              sendEvent({ type: 'text', text: pipelineResult.response });
            } else {
              for (const chunk of responseChunks) {
                sendEvent({ type: 'text', text: chunk });
              }
            }

            // Check for UI components in context and send them as separate events
            if (pipelineResult.context.caseDraft) {
              sendEvent({
                type: 'matter_canvas',
                data: {
                  matterId: pipelineResult.context.caseDraft.matter_type?.toLowerCase().replace(/\s+/g, '-') || 'general-case',
                  matterNumber: `CASE-${Date.now()}`,
                  service: pipelineResult.context.caseDraft.matter_type || 'General Consultation',
                  matterSummary: pipelineResult.context.caseDraft.key_facts?.join(' ') || 'Case information organized',
                  answers: {}
                }
              });
            }

            if (pipelineResult.context.documentChecklist) {
              const { documentChecklist } = pipelineResult.context;
              const providedSet = new Set((documentChecklist.provided || []).map(name => name.toLowerCase().trim()));

              sendEvent({
                type: 'document_checklist',
                data: {
                  matterType: documentChecklist.matter_type,
                  documents: (documentChecklist.required || []).map(name => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    description: `Required document for ${documentChecklist.matter_type}`,
                    required: true,
                    status: providedSet.has(name.toLowerCase().trim()) ? 'provided' : 'missing'
                  }))
                }
              });
            }

            if (pipelineResult.context.generatedPDF) {
              sendEvent({
                type: 'pdf_generation',
                data: {
                  filename: pipelineResult.context.generatedPDF.filename,
                  size: pipelineResult.context.generatedPDF.size,
                  generatedAt: pipelineResult.context.generatedPDF.generatedAt,
                  matterType: pipelineResult.context.generatedPDF.matterType
                }
              });
            }

            if (pipelineResult.context.lawyerSearchResults) {
              sendEvent({
                type: 'lawyer_search',
                data: {
                  matterType: pipelineResult.context.lawyerSearchResults.matterType,
                  lawyers: pipelineResult.context.lawyerSearchResults.lawyers,
                  total: pipelineResult.context.lawyerSearchResults.total
                }
              });
            }

            sendEvent({
              type: 'final',
              response: pipelineResult.response,
              middlewareUsed: pipelineResult.middlewareUsed,
              context: {
                establishedMatters: pipelineResult.context.establishedMatters,
                userIntent: pipelineResult.context.userIntent,
                conversationPhase: pipelineResult.context.conversationPhase
              }
            });

            sendEvent({ type: 'complete' });
            controller.close();

          } catch (error) {
            console.error('Error in pipeline response stream:', error);
            sendEvent({
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
            sendEvent({ type: 'complete' });
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
        const formattedMessages = normalizedMessages.map(msg => ({
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
            fileAttachments,
            {
              provider: providerOverride,
              model: modelOverride
            }
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

  if (body.aiProvider !== undefined && typeof body.aiProvider !== 'string') return false;
  if (body.aiModel !== undefined && typeof body.aiModel !== 'string') return false;

  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments)) return false;
    for (const item of body.attachments) {
      if (!item || typeof item !== 'object') return false;
      const att = item as Record<string, unknown>;
      const name = att.name;
      const type = att.type;
      const size = att.size;
      const url = att.url;

      const nameOk = typeof name === 'string' && name.length > 0;
      const typeOk = typeof type === 'string' && type.length > 0;
      const sizeOk = typeof size === 'number' && size >= 0 && Number.isFinite(size);
      const urlOk = typeof url === 'string' && (
        /^(https?):\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'))
      );
      if (!(nameOk && typeOk && sizeOk && urlOk)) return false;
    }
  }

  return true;
}
