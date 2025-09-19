import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { runLegalIntakeAgentStream } from '../agents/legalIntakeAgent';
import { runParalegalAgentStream } from '../agents/ParalegalAgent';
import { HttpErrors, handleError, createSuccessResponse, CORS_HEADERS, SECURITY_HEADERS } from '../errorHandler';
import { validateInput, getSecurityResponse } from '../middleware/inputValidation.js';
import { SecurityLogger } from '../utils/securityLogger.js';
import { getCloudflareLocation, isCloudflareLocationSupported, getLocationDescription } from '../utils/cloudflareLocationValidator.js';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';
import { Logger } from '../utils/logger.js';
import { ToolCallParser } from '../utils/toolCallParser.js';

// Helper function to sanitize team config for logging
function sanitizeTeamConfig(config: any): any {
  if (!config || typeof config !== 'object') return config;
  
  const sanitized = { ...config };
  const sensitiveFields = [
    'apiKey', 'token', 'secret', 'password', 'credentials', 'accessToken', 
    'privateKey', 'apiToken', 'blawbyApi', 'ownerEmail', 'contactEmail'
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = '***REDACTED***';
      } else if (typeof sanitized[field] === 'object') {
        sanitized[field] = '***REDACTED_OBJECT***';
      }
    }
  }
  
  return sanitized;
}

// Helper function to safely log errors without exposing PII
function safeLogError(message: string, error: any): void {
  if (error instanceof Error) {
    // Worker-safe environment check - avoid process.env which throws in Workers
    const isProduction = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
                        (typeof globalThis !== 'undefined' && globalThis.NODE_ENV === 'production');
    
    Logger.error(message, {
      name: error.name,
      message: error.message,
      // Don't log stack traces in production
      ...(!isProduction && { stack: error.stack })
    });
  } else {
    Logger.error(message, typeof error === 'string' ? error : 'Unknown error');
  }
}

// Supervisor router for intent-based routing between agents
// Helper functions for intent detection
function wantsHuman(text: string, messages?: any[]): boolean {
  // Check if user is responding "yes" to attorney referral
  if (messages && messages.length >= 2) {
    const previousMessage = messages[messages.length - 2]?.content?.toLowerCase() || '';
    const currentMessage = text.toLowerCase();
    
    Logger.debug('🔍 Checking attorney referral acceptance:');
    Logger.debug('  Previous message:', previousMessage.substring(0, 100));
    Logger.debug('  Current message:', currentMessage);
    Logger.debug('  Has attorney suggestion:', previousMessage.includes('would you like me to connect you with'));
    Logger.debug('  Is affirmative:', ['yes', 'yeah', 'sure', 'ok'].includes(currentMessage));
    
    // If previous message suggested attorney and current is affirmative
    if (previousMessage.includes('would you like me to connect you with') && 
        (currentMessage === 'yes' || currentMessage === 'yeah' || currentMessage === 'sure' || currentMessage === 'ok')) {
      Logger.debug('✅ Attorney referral accepted - routing to intake!');
      return true;
    }
  }
  
  const regularMatch = /\b(lawyer|attorney|human|person|call|phone|consult|consultation)\b/i.test(text);
  Logger.debug('🔍 Regular wantsHuman check:', regularMatch, 'for text:', text);
  return regularMatch;
}

function needsDocAnalysis(text: string, attachments?: any[]): boolean {
  return (attachments?.length ?? 0) > 0 || /\b(analy[sz]e|scan|ocr|pdf|document)\b/i.test(text);
}

class SupervisorRouter {
  constructor(private env: Env) {}

  async route(body: any, teamConfig: any): Promise<'paralegal' | 'analysis' | 'intake'> {
    // Check feature flags
    const paralegalEnabled = teamConfig?.config?.features?.enableParalegalAgent || teamConfig?.features?.enableParalegalAgent || false;
    const paralegalFirst = teamConfig?.config?.features?.paralegalFirst || teamConfig?.features?.paralegalFirst || false;
    
    const messages = body.messages || [];
    const latestMessage = messages?.at(-1)?.content || '';
    const text = latestMessage.toLowerCase();
    
    Logger.debug(`🤖 Routing: paralegalEnabled=${paralegalEnabled}, paralegalFirst=${paralegalFirst}`);
    
    // 0. Check if user is already in intake flow - if so, stay in intake
    if (this.isInIntakeFlow(messages)) {
      Logger.debug('📋 User is in intake flow, staying in Intake Agent');
      return 'intake';
    }
    
    // 1. Check for explicit human intent (always goes to intake)
    if (wantsHuman(text, messages)) {
      Logger.debug('👤 User wants human interaction, routing to Intake Agent');
      return 'intake';
    }
    
    // 2. Check for document analysis intent/uploads (always goes to analysis)
    if (needsDocAnalysis(text, body.attachments) || this.shouldRouteToAnalysis(body)) {
      Logger.debug('🔍 Document analysis needed, routing to Analysis Agent');
      return 'analysis';
    }
    
    // 3. If paralegal-first mode enabled, default to paralegal for all legal questions
    if (paralegalEnabled && paralegalFirst) {
      Logger.debug('🎯 Paralegal-first mode: routing to Paralegal Agent');
      return 'paralegal';
    }
    
    // 4. Legacy routing: check specific paralegal triggers if enabled
    if (paralegalEnabled && this.shouldRouteToParalegal(text, body)) {
      Logger.debug('🎯 Legacy routing: specific paralegal triggers matched');
      return 'paralegal';
    }
    
    // 5. Default fallback to intake
    Logger.debug('🏢 Default routing to Intake Agent');
    return 'intake';
  }

  private shouldRouteToParalegal(text: string, body: any): boolean {
    const messages = body.messages || [];
    const allContent = messages.map((msg: any) => msg.content || '').join(' ').toLowerCase();
    
    // Check if this looks like a post-payment/post-intake scenario
    const hasCompletedIntake = this.hasCompletedIntakeFlow(messages);
    const isPostPaymentQuery = this.isPostPaymentQuery(text, messages);
    
    if (hasCompletedIntake && isPostPaymentQuery) {
      Logger.debug('🎯 Detected post-payment scenario, routing to Paralegal Agent');
      return true;
    }

    // Direct paralegal keywords (explicit requests)
    const paralegalKeywords = [
      'matter formation', 'engagement letter', 'conflict check', 'retainer',
      'checklist', 'stage', 'document requirements', 'fee scope',
      'filing prep', 'case status', 'paralegal'
    ];

    if (paralegalKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      return true;
    }

    // Post-payment/consultation phrases (explicit)
    const postPaymentKeywords = [
      'paid', 'payment complete', 'now what', 'next steps', 'what happens now',
      'consultation', 'proceeding', 'continue', 'move forward', 'what now'
    ];

    if (postPaymentKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      // Only route to paralegal if there's legal context
      const hasLegalContext = allContent.includes('legal') || 
                             allContent.includes('lawyer') || 
                             allContent.includes('attorney') ||
                             allContent.includes('divorce') ||
                             allContent.includes('employment') ||
                             allContent.includes('matter');
      return hasLegalContext;
    }

    return false;
  }

  private hasCompletedIntakeFlow(messages: any[]): boolean {
    const allContent = messages.map((msg: any) => msg.content || '').join(' ').toLowerCase();
    
    // Look for signs of completed intake
    const intakeCompletionMarkers = [
      'perfect! i have all the information',
      'here\'s a summary of your matter',
      'consultation fee',
      'pay $',
      'payment using the embedded',
      'lawyer will contact you within',
      'matter created',

    ];
    
    return intakeCompletionMarkers.some(marker => allContent.includes(marker));
  }

  private isPostPaymentQuery(text: string, messages: any[]): boolean {
    const lowerText = text.toLowerCase();
    const recentMessages = messages.slice(-3); // Look at last 3 messages
    
    // Simple acknowledgments that could indicate payment completion
    const acknowledgments = ['ok', 'yes', 'done', 'completed', 'finished', 'thanks'];
    
    // Check if user just gave a simple acknowledgment after payment prompt
    if (acknowledgments.includes(lowerText.trim())) {
      // Check if previous assistant message mentioned payment
      const lastAssistantMsg = messages.filter(msg => msg.role === 'assistant').pop();
      if (lastAssistantMsg && lastAssistantMsg.content) {
        const assistantContent = lastAssistantMsg.content.toLowerCase();
        return assistantContent.includes('pay $') || 
               assistantContent.includes('payment') || 
               assistantContent.includes('consultation fee');
      }
    }
    
    // Explicit post-payment queries
    const postPaymentQueries = [
      'what now', 'now what', 'what next', 'next steps', 'what happens',
      'proceed', 'continue', 'move forward', 'what do we do'
    ];
    
    return postPaymentQueries.some(query => lowerText.includes(query));
  }

  private shouldRouteToAnalysis(body: any): boolean {
    // Route to analysis for document analysis requests
    const hasAttachments = (body.attachments?.length || 0) > 0;
    const latestMessage = body.messages?.at(-1)?.content || '';
    const analysisKeywords = ['analyze document', 'pdf', 'ocr', 'extract', 'review document'];
    
    return hasAttachments || analysisKeywords.some(keyword => 
      latestMessage.toLowerCase().includes(keyword)
    );
  }

  private isInIntakeFlow(messages: any[]): boolean {
    const allContent = messages.map((msg: any) => msg.content || '').join(' ').toLowerCase();
    
    // Check for intake flow indicators
    const intakeMarkers = [
      'can you please provide your full name',
      'thank you! now i need your phone number',
      'thank you! now i need your email address',
      'could you please provide a valid phone number',
      'could you please provide a valid email address',
      'i need your name to proceed',
      'i have your contact information',
      'the phone number you provided',
      'the email address you provided'
    ];
    
    // If any intake markers are present, user is in intake flow
    const hasIntakeMarkers = intakeMarkers.some(marker => allContent.includes(marker));
    
    // Also check if user has already provided contact info (sign they're in intake)
    const hasProvidedContactInfo = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(allContent) || // phone pattern
                                   /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(allContent); // email pattern
    
    Logger.debug(`📋 Intake flow check: markers=${hasIntakeMarkers}, contact=${hasProvidedContactInfo}`);
    
    return hasIntakeMarkers || hasProvidedContactInfo;
  }
}

// Helper functions for supervisor router
function extractClientInfo(messages: any[]): any {
  // Extract client information from conversation history
  // This is a simplified version - in production, you'd parse more thoroughly
  const allContent = messages.map(m => m.content).join(' ').toLowerCase();
  
  return {
    hasName: allContent.includes('name') || allContent.includes('i am') || allContent.includes('my name'),
    hasPhone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(allContent),
    hasEmail: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(allContent),
    hasLocation: allContent.includes('live in') || allContent.includes('located in') || allContent.includes('from')
  };
}

function formatParalegalResponse(paralegalData: any): string {
  const { stage, checklist, nextActions, missing, directive, handoffMessage } = paralegalData;
  
  // Check if this is a handoff to intake
  if (directive === 'handoff_to_intake') {
    return `${handoffMessage || 'Let me help you with this.'}\n\nI'll collect your information so we can get you the right assistance.`;
  }
  
  // For now, always hand off to intake for conversational responses
  // The Paralegal Agent will determine when to hand off based on the conversation
  return `Hi! I'm your AI Paralegal. I can help you understand your legal situation and gather what we need to move forward. If things get complex, I'll connect you with a lawyer.

Can you tell me more about what's going on with your case? The more details you share, the better I can help you figure out next steps.`;
}



// New streaming endpoint for real-time AI responses
export async function handleAgentStream(request: Request, env: Env): Promise<Response> {
  Logger.debug('🚀 Streaming endpoint called!');
  
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
    const body = await request.json();
    Logger.debug('📥 Request body:', ToolCallParser.sanitizeParameters(body));
    
    const { messages, teamId, sessionId, attachments = [] } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw HttpErrors.badRequest('No message content provided');
    }
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.content) {
      throw HttpErrors.badRequest('No message content provided');
    }

    // Get team configuration for security validation
    let teamConfig = null;
    if (teamId) {
      try {
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const rawTeamConfig = await aiService.getTeamConfig(teamId);
        teamConfig = rawTeamConfig?.config || rawTeamConfig;
        
        // Debug logging for test team configuration (only in debug mode)
        if (env.DEBUG === true || env.DEBUG === 'true') {
          const sanitizedConfig = sanitizeTeamConfig(teamConfig);
          Logger.debug(`🔍 Team config for ${teamId}:`, JSON.stringify(sanitizedConfig, null, 2));
          Logger.debug(`🔍 Features:`, teamConfig?.features);
          Logger.debug(`🔍 enableParalegalAgent:`, teamConfig?.features?.enableParalegalAgent);
          Logger.debug(`🔍 paralegalFirst:`, teamConfig?.features?.paralegalFirst);
        }
      } catch (error) {
        safeLogError('Failed to get team config for security validation', error);
      }
    }

    // Get Cloudflare location data
    const cloudflareLocation = getCloudflareLocation(request);
    Logger.debug('Cloudflare location data:', cloudflareLocation);

    // Security validation with Cloudflare location
    const validation = await validateInput(body, teamConfig, cloudflareLocation);
    if (!validation.isValid) {
      SecurityLogger.logInputValidation(validation, latestMessage.content, teamId);
      
      const securityResponse = getSecurityResponse(validation.violations || [], teamConfig);
      
      // Send security block as a single SSE event
      const securityEvent = `data: ${JSON.stringify({
        type: 'security_block',
        response: securityResponse,
        reason: validation.reason,
        violations: validation.violations
      })}\n\n`;
      
      return new Response(securityEvent, { headers });
    }

    Logger.debug('✅ Security validation passed, creating stream...');

    // Create streaming response using ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          Logger.debug('🔄 Starting streaming agent...');
          
          // Send initial connection event
          controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
          
          // Use SupervisorRouter to determine which agent to use
          Logger.debug('📞 Using SupervisorRouter for streaming...');
          const router = new SupervisorRouter(env);
          const route = await router.route(body, teamConfig);
          
          Logger.debug(`🎯 Streaming route decision: ${route}`);
          
          if (route === 'paralegal') {
            // Route to Paralegal Agent (but stream the response)
            Logger.debug('🎯 Streaming via Paralegal Agent');
            
            // Generate a matter ID from session or team
            const matterId = sessionId || `matter-${teamId}-${Date.now()}`;
            
            try {
              // Use conversational paralegal agent for streaming
              await runParalegalAgentStream(env, messages, teamId, sessionId, cloudflareLocation, controller, attachments);
            } catch (error) {
              console.error('Streaming paralegal agent error:', error);
              // Fallback to intake agent
              await runLegalIntakeAgentStream(env, messages, teamId, sessionId, cloudflareLocation, controller, attachments);
            }
          } else {
            // Use regular intake agent streaming
            await runLegalIntakeAgentStream(env, messages, teamId, sessionId, cloudflareLocation, controller, attachments);
          }
          
          // Send completion event
          try {
            controller.enqueue(new TextEncoder().encode('data: {"type":"complete"}\n\n'));
            controller.close();
          } catch (closeError) {
            console.warn('⚠️ Controller already closed:', closeError.message);
          }
        } catch (error) {
          console.error('❌ Streaming error:', error);
          try {
            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              message: 'An error occurred while processing your request'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
            controller.close();
          } catch (enqueueError) {
            console.error('❌ Failed to send error event:', enqueueError);
            try {
              controller.close();
            } catch (closeError) {
              console.error('❌ Failed to close controller:', closeError);
            }
          }
        }
      }
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error('❌ Route error:', error);
    const errorEvent = `data: ${JSON.stringify({
      type: 'error',
      message: error.message || 'An error occurred'
    })}\n\n`;
    return new Response(errorEvent, { headers });
  }
}