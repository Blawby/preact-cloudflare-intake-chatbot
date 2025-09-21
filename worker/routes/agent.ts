import type { Env, FileAttachment } from '../types';
import type { TeamConfig } from '../services/TeamService';
import { parseJsonBody } from '../utils';
import { runLegalIntakeAgentStream } from '../agents/legal-intake/index';
import { HttpErrors, handleError, createSuccessResponse, CORS_HEADERS, SECURITY_HEADERS } from '../errorHandler';
import { validateInput, getSecurityResponse } from '../middleware/inputValidation.js';
import { SecurityLogger } from '../utils/securityLogger.js';
import { getCloudflareLocation, isCloudflareLocationSupported, getLocationDescription } from '../utils/cloudflareLocationValidator.js';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';

// Interface for the request body in the route method
interface RouteBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  teamId?: string;
  sessionId?: string;
  attachments?: Array<{
    id?: string; // Optional id field for backward compatibility
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
}

// Validation error class for contextual error messages
class ValidationError extends Error {
  constructor(message: string, public context?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Validate a single message with contextual error information
function validateMessage(msg: unknown, index: number): void {
  if (typeof msg !== 'object' || msg === null) {
    throw new ValidationError(`Message at index ${index} must be an object`, `message[${index}]`);
  }

  const message = msg as Record<string, unknown>;

  // Check if content exists and is a string
  if (typeof message.content !== 'string') {
    throw new ValidationError(
      `Message at index ${index} must have a string 'content' property`, 
      `message[${index}].content`
    );
  }

  // Check if role exists and is one of the allowed values
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') {
    throw new ValidationError(
      `Message at index ${index} must have a 'role' property with value 'user', 'assistant', or 'system'`, 
      `message[${index}].role`
    );
  }
}

// Validate messages array
function validateMessages(messages: unknown): void {
  if (!Array.isArray(messages)) {
    throw new ValidationError('Request body must have a "messages" property that is an array', 'messages');
  }

  // Validate each message in the array
  for (let i = 0; i < messages.length; i++) {
    validateMessage(messages[i], i);
  }
}

// Validate a single attachment with contextual error information
function validateAttachment(att: unknown, index: number): void {
  if (typeof att !== 'object' || att === null) {
    throw new ValidationError(
      `Attachment at index ${index} must be an object`, 
      `attachment[${index}]`
    );
  }

  const attachment = att as Record<string, unknown>;

  // Check required attachment fields
  if (typeof attachment.name !== 'string') {
    throw new ValidationError(
      `Attachment at index ${index} must have a string 'name' property`, 
      `attachment[${index}].name`
    );
  }

  if (typeof attachment.size !== 'number') {
    throw new ValidationError(
      `Attachment at index ${index} must have a number 'size' property`, 
      `attachment[${index}].size`
    );
  }

  if (typeof attachment.type !== 'string') {
    throw new ValidationError(
      `Attachment at index ${index} must have a string 'type' property`, 
      `attachment[${index}].type`
    );
  }

  if (typeof attachment.url !== 'string') {
    throw new ValidationError(
      `Attachment at index ${index} must have a string 'url' property`, 
      `attachment[${index}].url`
    );
  }

  // Validate optional id field
  if (attachment.id !== undefined && typeof attachment.id !== 'string') {
    throw new ValidationError(
      `Attachment at index ${index} 'id' property must be a string if provided`, 
      `attachment[${index}].id`
    );
  }
}

// Validate attachments array
function validateAttachments(attachments: unknown): void {
  if (!Array.isArray(attachments)) {
    throw new ValidationError('Attachments property must be an array', 'attachments');
  }

  // Validate each attachment in the array
  for (let i = 0; i < attachments.length; i++) {
    validateAttachment(attachments[i], i);
  }
}

// Type guard function for runtime validation of RouteBody
function isValidRouteBody(obj: unknown): obj is RouteBody {
  try {
    // Check if obj is an object and not null
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const body = obj as Record<string, unknown>;

    // Validate messages array
    validateMessages(body.messages);

    // Validate optional fields
    if (body.teamId !== undefined && typeof body.teamId !== 'string') {
      throw new ValidationError('teamId must be a string if provided', 'teamId');
    }

    if (body.sessionId !== undefined && typeof body.sessionId !== 'string') {
      throw new ValidationError('sessionId must be a string if provided', 'sessionId');
    }

    // Validate attachments if present
    if (body.attachments !== undefined) {
      validateAttachments(body.attachments);
    }

    return true;
  } catch (error) {
    // Log validation errors for debugging
    if (error instanceof ValidationError) {
      console.error(`Validation failed: ${error.message} (context: ${error.context})`);
    } else {
      console.error('Unexpected validation error:', error);
    }
    return false;
  }
}

// Supervisor router for intent-based routing between agents
// Helper functions for intent detection
function wantsHuman(text: string, messages?: any[]): boolean {
  // Check if user is responding "yes" to attorney referral
  if (messages && messages.length >= 2) {
    const previousMessage = messages[messages.length - 2]?.content?.toLowerCase() || '';
    const currentMessage = text.toLowerCase();
    
    console.log('🔍 Checking attorney referral acceptance:');
    console.log('  Previous message:', previousMessage.substring(0, 100));
    console.log('  Current message:', currentMessage);
    console.log('  Has attorney suggestion:', previousMessage.includes('would you like me to connect you with'));
    console.log('  Is affirmative:', ['yes', 'yeah', 'sure', 'ok'].includes(currentMessage));
    
    // If previous message suggested attorney and current is affirmative
    if (previousMessage.includes('would you like me to connect you with') && 
        (currentMessage === 'yes' || currentMessage === 'yeah' || currentMessage === 'sure' || currentMessage === 'ok')) {
      console.log('✅ Attorney referral accepted - routing to intake!');
      return true;
    }
  }
  
  const regularMatch = /\b(lawyer|attorney|human|person|call|phone|consult|consultation)\b/i.test(text);
  console.log('🔍 Regular wantsHuman check:', regularMatch, 'for text:', text);
  return regularMatch;
}

function needsDocAnalysis(text: string, attachments?: any[]): boolean {
  return (attachments?.length ?? 0) > 0 || /\b(analy[sz]e|scan|ocr|pdf|document)\b/i.test(text);
}

class SupervisorRouter {
  constructor(private env: Env) {}

  async route(body: RouteBody, teamConfig: TeamConfig): Promise<'intake'> {
    // Simplified routing - always use intake agent for everything
    console.log('📋 Routing to Intake Agent (simplified)');
    return 'intake';
  }

  private shouldRouteToParalegal(text: string, body: any): boolean {
    const messages = body.messages || [];
    const allContent = messages.map((msg: any) => msg.content || '').join(' ').toLowerCase();
    
    // Check if this looks like a post-payment/post-intake scenario
    const hasCompletedIntake = this.hasCompletedIntakeFlow(messages);
    const isPostPaymentQuery = this.isPostPaymentQuery(text, messages);
    
    if (hasCompletedIntake && isPostPaymentQuery) {
      console.log('🎯 Detected post-payment scenario, routing to Paralegal Agent');
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
    
    console.log(`📋 Intake flow check: markers=${hasIntakeMarkers}, contact=${hasProvidedContactInfo}`);
    
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
  console.log('🚀 Streaming endpoint called!');
  
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
    
    const body = rawBody;
    console.log('📥 Request metadata: messageCount=', body.messages?.length, 'attachmentCount=', body.attachments?.length || 0);
    
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
        const aiService = new AIService(env.AI, env as any);
        const rawTeamConfig = await aiService.getTeamConfig(teamId);
        teamConfig = rawTeamConfig;
      } catch (error) {
        console.warn('Failed to get team config for security validation:', error);
      }
    }

    // Get Cloudflare location data
    const cloudflareLocation = getCloudflareLocation(request);
    console.log('Cloudflare location data:', cloudflareLocation);

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

    console.log('✅ Security validation passed, creating stream...');

    // Create streaming response using ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🔄 Starting streaming agent...');
          
          // Send initial connection event
          controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
          
          // Simplified routing - always use intake agent
          console.log('📞 Using simplified intake agent routing...');
          const fileAttachments: FileAttachment[] = attachments.map(att => ({
            id: att.id || crypto.randomUUID(), // Use provided id or generate UUID
            name: att.name,
            type: att.type,
            size: att.size,
            url: att.url
          }));
          await runLegalIntakeAgentStream(env, messages, teamId, sessionId, cloudflareLocation, controller, fileAttachments);
          
          // Send completion event
          controller.enqueue(new TextEncoder().encode('data: {"type":"complete"}\n\n'));
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'An error occurred while processing your request'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
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