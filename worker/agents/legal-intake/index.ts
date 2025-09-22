import { Logger } from '../../utils/logger.js';
import { LegalIntakeLogger } from './legalIntakeLogger.js';
import { PromptBuilder, CloudflareAIResponse } from '../../utils/promptBuilder.js';
import { BusinessLogicHandler } from './businessLogicHandler.js';
import { ConversationStateMachine, ConversationState, ConversationContext } from './conversationStateMachine.js';
import { TOOL_HANDLERS } from '../legalIntakeAgent.js';
import { ToolCallParser, ToolCall, ToolCallParseResult } from '../../utils/toolCallParser.js';
import { withAIRetry } from '../../utils/retry.js';
import { ToolUsageMonitor } from '../../utils/toolUsageMonitor.js';
import type { Env, Team, ChatMessage } from '../../types.js';
import type { ErrorResult } from './errors.js';
import { ExternalServiceError, ConfigurationError, LegalIntakeError } from './errors.js';
import { safeIncludes } from '../../utils/safeStringUtils.js';

/**
 * Type guard to check if an object has a message property with a string value
 */
function hasMessageProperty(obj: unknown): obj is { message: string } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'message' in obj &&
    typeof (obj as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if an object has response-related properties
 */
function hasResponseProperties(obj: unknown): obj is { message?: string; response?: string } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ('message' in obj || 'response' in obj)
  );
}

/**
 * Safely extracts a string value from an object with message or response properties
 */
function extractStringFromResponse(obj: { message?: string; response?: string }): string | undefined {
  if (typeof obj.message === 'string') {
    return obj.message;
  }
  if (typeof obj.response === 'string') {
    return obj.response;
  }
  return undefined;
}

/**
 * Extracts a user-friendly response from a tool result
 * @param toolResult The result from a tool execution
 * @returns A user-friendly string response
 */
function extractToolResponse<T>(toolResult: ErrorResult<T>): string {
  if (toolResult.success) {
    // Check for message directly on toolResult first
    if (hasMessageProperty(toolResult)) {
      return toolResult.message;
    }
    
    // Then check in data
    const data = toolResult.data;
    if (data && typeof data === 'object' && hasResponseProperties(data)) {
      const extractedString = extractStringFromResponse(data);
      if (extractedString) {
        return extractedString;
      }
    }
    
    return 'Tool executed successfully.';
  } else {
    // Explicitly handle the error case with proper type narrowing
    const errorResult = toolResult as Extract<ErrorResult<T>, { success: false }>;
    return errorResult.error.toUserResponse() || errorResult.error.message || 'An error occurred while executing the tool.';
  }
}

/**
 * Type guard to check if an AI result has tool calls
 * @param aiResult The AI result to check
 * @returns True if the result has tool calls, false otherwise
 */
function hasToolCalls(aiResult: unknown): aiResult is CloudflareAIResponse & { tool_calls: NonNullable<CloudflareAIResponse['tool_calls']> } {
  return (
    aiResult !== null &&
    typeof aiResult === 'object' &&
    'tool_calls' in aiResult &&
    Array.isArray((aiResult as CloudflareAIResponse).tool_calls) &&
    (aiResult as CloudflareAIResponse).tool_calls!.length > 0
  );
}

/**
 * Safely extracts the response text from an AI result
 * @param aiResult The AI result to extract response from
 * @returns The response text or a default error message
 */
function extractAIResponse(aiResult: unknown): string {
  if (aiResult !== null && typeof aiResult === 'object' && 'response' in aiResult) {
    const response = (aiResult as CloudflareAIResponse).response;
    return typeof response === 'string' ? response : 'I apologize, but I encountered an error processing your request.';
  }
  return 'I apologize, but I encountered an error processing your request.';
}

// AI Model Configuration with explicit typing
interface AIModelConfig {
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
}

const AI_MODEL_CONFIG: Readonly<AIModelConfig> = {
  model: '@cf/meta/llama-3.1-8b-instruct',
  maxTokens: 500,
  temperature: 0.1
} as const;

// Legal matter types as const for type safety
const MATTER_TYPES = [
  'Family Law',
  'Employment Law', 
  'Landlord/Tenant',
  'Personal Injury',
  'Business Law',
  'Criminal Law',
  'Civil Law',
  'Contract Review',
  'Property Law',
  'Administrative Law',
  'General Consultation'
] as const;

// Complexity levels as const for type safety
const COMPLEXITY_LEVELS = [
  'Low',
  'Medium', 
  'High',
  'Very High'
] as const;

// Analysis types as const for type safety
const ANALYSIS_TYPES = [
  'general',
  'legal_document',
  'contract', 
  'government_form',
  'medical_document',
  'image',
  'resume'
] as const;

// Type definitions for const arrays
export type MatterType = typeof MATTER_TYPES[number];
export type ComplexityLevel = typeof COMPLEXITY_LEVELS[number];
export type AnalysisType = typeof ANALYSIS_TYPES[number];

// Tool parameter types with enhanced typing
export interface CreateMatterParams {
  readonly matter_type: MatterType;
  readonly description: string;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly location?: string;
  readonly opposing_party?: string;
}

export interface CollectContactInfoParams {
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly location?: string;
}

export interface RequestLawyerReviewParams {
  readonly matter_type: MatterType;
  readonly complexity?: ComplexityLevel;
}

export interface AnalyzeDocumentParams {
  readonly file_id: string;
  readonly analysis_type?: AnalysisType;
  readonly specific_question?: string;
}

export interface CreatePaymentInvoiceParams {
  readonly invoice_id: string;
  readonly amount: number;
  readonly currency: 'USD' | 'CAD' | 'EUR' | 'GBP';
  readonly recipient: {
    readonly email: string;
    readonly name: string;
  };
  readonly due_date?: string;
  readonly description: string;
}

// Enhanced tool parameter property types
export interface ToolParameterProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description: string;
  readonly enum?: readonly string[];
  readonly pattern?: string;
  readonly default?: string | number | boolean;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly maximum?: number;
  readonly minimum?: number;
  readonly items?: ToolParameterProperty;
  readonly properties?: Record<string, ToolParameterProperty>;
}

// Enhanced tool definition interface
export interface ToolDefinition<T = Record<string, unknown>> {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, ToolParameterProperty>;
    readonly required: readonly string[];
    readonly additionalProperties?: boolean;
  };
}

// Tool definitions with structured schemas
export const createMatter: ToolDefinition<CreateMatterParams> = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information. ONLY use this tool AFTER the user has submitted the contact form and you have all their contact details. This tool creates the actual legal matter record.',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string' as const, 
        description: 'Type of legal matter',
        enum: MATTER_TYPES
      },
      description: { 
        type: 'string' as const, 
        description: 'Brief description of the legal issue',
        maxLength: 1000
      },
      name: { 
        type: 'string' as const, 
        description: 'Client full name',
        minLength: 2,
        maxLength: 100
      },
      phone: { 
        type: 'string' as const, 
        description: 'Client phone number',
        pattern: '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$'
      },
      email: { 
        type: 'string' as const, 
        description: 'Client email address',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      location: { 
        type: 'string' as const, 
        description: 'Client location (city and state)',
        maxLength: 100
      },
      opposing_party: { 
        type: 'string' as const, 
        description: 'Opposing party name if applicable',
        maxLength: 100
      }
    },
    required: ['matter_type', 'description', 'name'] as const,
    additionalProperties: false
  }
};

export const showContactForm: ToolDefinition<{}> = {
  name: 'show_contact_form',
  description: 'Show the contact form to collect user contact information. ONLY use this tool AFTER you have qualified the lead by asking about urgency, timeline, and intent to take legal action. Do NOT use this tool on the first message or for unqualified leads.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false
  }
};

export const requestLawyerReview: ToolDefinition<RequestLawyerReviewParams> = {
  name: 'request_lawyer_review',
  description: 'Request lawyer review for complex matters',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string' as const, 
        description: 'Type of legal matter',
        enum: MATTER_TYPES
      },
      complexity: { 
        type: 'string' as const, 
        description: 'Matter complexity level',
        enum: COMPLEXITY_LEVELS,
        default: 'Medium'
      }
    },
    required: ['matter_type'] as const,
    additionalProperties: false
  }
};

export const analyzeDocument: ToolDefinition<AnalyzeDocumentParams> = {
  name: 'analyze_document',
  description: 'Analyze an uploaded document or image to extract key information for legal intake',
  parameters: {
    type: 'object',
    properties: {
      file_id: { 
        type: 'string' as const, 
        description: 'The file ID of the uploaded document to analyze',
        pattern: '^[a-zA-Z0-9\\-_]+$',
        minLength: 1,
        maxLength: 50
      },
      analysis_type: { 
        type: 'string' as const, 
        description: 'Type of analysis to perform',
        enum: ANALYSIS_TYPES,
        default: 'general'
      },
      specific_question: { 
        type: 'string' as const, 
        description: 'Optional specific question to ask about the document',
        maxLength: 500,
        minLength: 10
      }
    },
    required: ['file_id'] as const,
    additionalProperties: false
  }
};

// Alias for backward compatibility
export const collectContactInfo = showContactForm;

export const createPaymentInvoice: ToolDefinition<CreatePaymentInvoiceParams> = {
  name: 'create_payment_invoice',
  description: 'Create a payment invoice for consultation or legal services',
  parameters: {
    type: 'object',
    properties: {
      invoice_id: { 
        type: 'string' as const, 
        description: 'Unique identifier for the invoice',
        pattern: '^[a-zA-Z0-9\\-_]+$',
        minLength: 1,
        maxLength: 50
      },
      amount: { 
        type: 'number' as const, 
        description: 'Invoice amount in cents (e.g., 7500 for $75.00)',
        minimum: 100,
        maximum: 1000000
      },
      currency: { 
        type: 'string' as const, 
        description: 'Currency code for the invoice',
        enum: ['USD', 'CAD', 'EUR', 'GBP'],
        default: 'USD'
      },
      recipient: { 
        type: 'object' as const, 
        description: 'Recipient information for the invoice',
        properties: {
          email: { 
            type: 'string' as const, 
            description: 'Recipient email address',
            maxLength: 255
          },
          name: { 
            type: 'string' as const, 
            description: 'Recipient full name',
            minLength: 1,
            maxLength: 255
          }
        },
        required: ['email', 'name'] as const,
        additionalProperties: false
      },
      due_date: { 
        type: 'string' as const, 
        description: 'Invoice due date in ISO 8601 format (YYYY-MM-DD)',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$'
      },
      description: { 
        type: 'string' as const, 
        description: 'Description of services or consultation',
        minLength: 1,
        maxLength: 500
      }
    },
    required: ['invoice_id', 'amount', 'currency', 'recipient', 'description'] as const,
    additionalProperties: false
  }
};

// Message types for the agent
export interface AgentMessage {
  readonly role?: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly isUser?: boolean;
  readonly metadata?: {
    readonly toolName?: string;
    readonly toolCall?: {
      readonly toolName: string;
      readonly parameters: Record<string, unknown>;
    };
  };
}

export interface CloudflareLocation {
  readonly city?: string;
  readonly country?: string;
  readonly region?: string;
  readonly timezone?: string;
}

export interface FileAttachment {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly url: string;
}

// Response types
export interface AgentResponse {
  readonly response: string;
  readonly metadata: {
    readonly conversationComplete?: boolean;
    readonly inputMessageCount: number;
    readonly lastUserMessage: string | null;
    readonly sessionId?: string;
    readonly teamId?: string;
    readonly error?: string;
    readonly toolName?: string;
    readonly toolResult?: unknown;
    readonly allowRetry?: boolean;
  };
}

/**
 * Get available tools based on conversation state
 * This ensures AI can only call appropriate tools for the current state
 */
function getAvailableToolsForState(
  state: ConversationState,
  context: ConversationContext
): ToolDefinition<any>[] {
  const allTools = [
    createMatter,
    showContactForm,
    requestLawyerReview,
    createPaymentInvoice
  ];

  switch (state) {
    case ConversationState.GATHERING_INFORMATION:
    case ConversationState.COLLECTING_LEGAL_ISSUE:
    case ConversationState.COLLECTING_DETAILS:
    case ConversationState.QUALIFYING_LEAD:
      // During information gathering and lead qualification, allow show_contact_form
      // so AI can show the form when it has enough information
      return [showContactForm];
      
    case ConversationState.SHOWING_CONTACT_FORM:
      // Only show_contact_form should be available
      return [showContactForm];
      
    case ConversationState.READY_TO_CREATE_MATTER:
    case ConversationState.CREATING_MATTER:
      // Only create_matter should be available after contact form submission
      return [createMatter];
      
    case ConversationState.COMPLETED:
      // All tools available for follow-up actions
      return allTools;
      
    default:
      // Fallback: allow show_contact_form for unknown states
      return [showContactForm];
  }
}

/**
 * AI Tool Loop Health Check - MANDATORY validation before any tool changes
 * This function validates the entire AI tool calling pipeline
 */
function validateAIToolLoop(
  availableTools: ToolDefinition<any>[],
  systemPrompt: string,
  state: ConversationState,
  context: ConversationContext,
  correlationId?: string
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // 1. Check if show_contact_form is included in tools (only when it should be available)
  const hasShowContactFormTool = availableTools.some(tool => tool.name === 'show_contact_form');
  if (state === ConversationState.SHOWING_CONTACT_FORM && !hasShowContactFormTool) {
    issues.push('❌ show_contact_form tool is NOT included in availableTools array when state is SHOWING_CONTACT_FORM');
  }
  
  // Check if tools are properly gated by state
  // Note: We now allow show_contact_form in QUALIFYING_LEAD state
  if (state === ConversationState.QUALIFYING_LEAD && availableTools.length > 0 && !availableTools.some(tool => tool.name === 'show_contact_form')) {
    issues.push('❌ show_contact_form should be available during QUALIFYING_LEAD state');
  }

  // 2. Check if system prompt mentions show_contact_form
  const systemPromptMentionsShowContactForm = safeIncludes(systemPrompt, 'show_contact_form');
  if (!systemPromptMentionsShowContactForm) {
    issues.push('❌ System prompt does NOT mention show_contact_form tool');
  }

  // 3. Check if state machine correctly determines SHOWING_CONTACT_FORM
  const shouldShowContactForm = context.legalIssueType && context.description && context.isQualifiedLead;
  const stateIsShowingContactForm = state === ConversationState.SHOWING_CONTACT_FORM;
  if (shouldShowContactForm && !stateIsShowingContactForm) {
    issues.push(`❌ State machine should be SHOWING_CONTACT_FORM but is ${state}`);
  }

  // 4. Check if context has required legal info for contact form
  if (state === ConversationState.SHOWING_CONTACT_FORM) {
    if (!context.hasLegalIssue || !context.legalIssueType) {
      issues.push('❌ State is SHOWING_CONTACT_FORM but missing legal issue info');
    }
    if (!context.description) {
      issues.push('❌ State is SHOWING_CONTACT_FORM but missing description');
    }
    if (!context.isQualifiedLead) {
      issues.push('❌ State is SHOWING_CONTACT_FORM but lead is not qualified');
    }
  }

  // 5. Check if buildContextSection is safe (no broken references)
  try {
    // This would throw if there are undefined function calls
    const contextSection = safeIncludes(systemPrompt, '- Has Legal Issue:') && 
                          safeIncludes(systemPrompt, '- Has Description:') &&
                          safeIncludes(systemPrompt, '- Current State:');
    if (!contextSection) {
      issues.push('❌ Context section appears malformed in system prompt');
    }
  } catch (error) {
    issues.push(`❌ Context section generation failed: ${error}`);
  }

  const isValid = issues.length === 0;
  
  // Log results
  if (correlationId) {
    Logger.debug('🔍 AI Tool Loop Health Check:', {
      correlationId,
      isValid,
      issues,
      toolNames: availableTools.map(tool => tool.name),
      state,
      hasLegalInfo: Boolean(context.legalIssueType && context.description)
    });
  }

  return { isValid, issues };
}

// Unified legal intake agent that handles both streaming and non-streaming responses
export async function runLegalIntakeAgentStream(
  env: Env, 
  messages: readonly AgentMessage[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: CloudflareLocation,
  controller?: ReadableStreamDefaultController<Uint8Array>,
  attachments: readonly FileAttachment[] = []
): Promise<AgentResponse | void> {
  
  // Generate correlation ID for error tracking
  const correlationId = LegalIntakeLogger.generateCorrelationId();
  
  // Add comprehensive error handling to catch null reference errors
  try {
  
  console.log('🔍 Starting runLegalIntakeAgentStream with correlationId:', correlationId);
  console.log('🔍 Messages count:', messages?.length || 0);
  console.log('🔍 First message:', messages?.[0] ? { role: messages[0].role, contentLength: messages[0].content?.length || 0 } : 'null');
  
  // Get team configuration if teamId is provided
  let teamConfig: unknown = null;
  if (teamId) {
    // Validate teamId before making service call
    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
      Logger.warn('Invalid teamId provided for team configuration lookup', { teamId });
      teamConfig = null;
    } else {
      try {
        const { TeamService } = await import('../../services/TeamService.js');
        const teamService = new TeamService(env);
        const team = await teamService.getTeam(teamId);
        teamConfig = team || null;
        Logger.debug('Successfully retrieved team configuration', { teamId, hasConfig: !!team });
      } catch (error) {
        // Log error with contextual information
        Logger.error('Failed to retrieve team configuration', {
          teamId,
          operation: 'getTeam',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Set teamConfig to null on failure
        teamConfig = null;
        
        // Create and log a wrapped error preserving the original stack
        const wrappedError = new ExternalServiceError(
          'TeamService',
          `Failed to retrieve team configuration for teamId: ${teamId}`,
          { teamId, operation: 'getTeam' },
          true // Retryable
        );
        
        // Preserve original stack trace if available
        if (error instanceof Error && error.stack) {
          wrappedError.stack = `${wrappedError.stack}\nCaused by: ${error.stack}`;
        }
        
        // Log the wrapped error and emit SSE error report
        Logger.error('Team configuration retrieval failed', {
          correlationId,
          teamId,
          error: wrappedError.message,
          stack: wrappedError.stack
        });
        
        // Emit SSE error report if controller is available
        if (controller) {
          try {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'error',
                message: 'Failed to retrieve team configuration',
                correlationId
              })}\n\n`
            ));
          } catch (sseError) {
            Logger.warn('Failed to emit SSE error report', { sseError });
          }
        }
      }
    }
  }

  // Log agent start with structured logging after team configuration is retrieved
  LegalIntakeLogger.logAgentStart(
    correlationId,
    sessionId,
    teamId,
    messages.length,
    attachments.length > 0,
    attachments.length,
    teamConfig ? { hasConfig: true, teamSlug: (teamConfig as any)?.slug } : { hasConfig: false }
  );

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = (messages || []).map(msg => ({
    role: msg.role || (msg.isUser ? 'user' : 'assistant'),
    content: msg.content || ''
  }));

  // 🧪 DIAGNOSTIC: Check for contact form submissions
  const lastUserMessage = formattedMessages[formattedMessages.length - 1];
  if (lastUserMessage?.role === 'user' && lastUserMessage.content && safeIncludes(lastUserMessage.content, 'Contact Information:')) {
    Logger.debug('🧪 Received contact form submission:', {
      correlationId,
      sessionId,
      teamId,
      contactFormContent: lastUserMessage.content,
      timestamp: new Date().toISOString()
    });
  }

  // Check if we've already completed a matter creation in this conversation
  // For multi-turn conversations, preserve role information for better context
  const conversationTextRaw = formattedMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  
  // Create normalized version for keyword detection only
  const conversationTextNormalized = conversationTextRaw ? conversationTextRaw.toLowerCase() : '';
  
  // Check for completion cues in conversation text or last assistant message
  const hasCompletionCues = safeIncludes(conversationTextNormalized, 'matter created') ||
                            safeIncludes(conversationTextNormalized, 'consultation fee') ||
                            safeIncludes(conversationTextNormalized, 'lawyer will contact you') ||
                            safeIncludes(conversationTextNormalized, 'already helped you create a matter') ||
                            safeIncludes(conversationTextNormalized, 'conversation is complete');
  
  // Check for actual tool invocations in message history
  const hasToolInvocation = messages.some(msg => 
    msg.metadata?.toolName === 'create_matter' || 
    msg.metadata?.toolCall?.toolName === 'create_matter' ||
    (msg.content && typeof msg.content === 'string' && safeIncludes(msg.content, 'TOOL_CALL: create_matter'))
  );
  
  // Also check if the last assistant message was a completion message
  const lastAssistantMessage = formattedMessages.filter(msg => msg.role === 'assistant').pop();
  const isAlreadyCompleted = lastAssistantMessage?.content && typeof lastAssistantMessage.content === 'string' && safeIncludes(lastAssistantMessage.content, 'already helped you create a matter');
  
  // Trigger if either completion cues are detected OR actual tool invocation is found
  if ((hasCompletionCues || hasToolInvocation) && isAlreadyCompleted) {
    const completionMessage = "I've already helped you create a matter for your case. A lawyer will contact you within 24 hours to discuss your situation further. Is there anything else I can help you with?";
    
    if (controller) {
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: completionMessage
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      
      // Send complete event before closing
      try {
        const completeEvent = `data: ${JSON.stringify({
          type: 'complete'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(completeEvent));
        console.log('✅ SSE complete event sent');
      } catch (completeError) {
        console.log('Failed to send complete event:', completeError);
      }
      
      try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
    } else {
      return {
        response: completionMessage,
        metadata: {
          conversationComplete: true,
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
    return;
  }

  // Process business logic
  // Sanitize conversation text for logging to avoid PII exposure
  const sanitizedConversationText = conversationTextRaw.length > 200 
    ? conversationTextRaw.substring(0, 200) + '...' 
    : conversationTextRaw;
  Logger.debug('🔍 Conversation Text for Extraction:', { 
    conversationText: sanitizedConversationText,
    originalLength: conversationTextRaw.length,
    correlationId
  });
  const businessResult = await BusinessLogicHandler.handleConversation(conversationTextRaw, env, teamConfig);
  
  // Build system prompt for AI when it should be used
  let context: ConversationContext;
  try {
    context = await PromptBuilder.extractConversationInfo(conversationTextRaw, env);
  } catch (error) {
    // For short conversations or extraction failures, create a minimal context
    Logger.debug('🔍 AI context extraction failed, using minimal context:', error);
    context = BusinessLogicHandler.createMinimalContext();
    // Override the state with the one determined by business logic
    if (businessResult.success) {
      context.state = businessResult.data.state;
    }
  }
  
  // Debug logging for conversation text and state
  console.log('🔍 Conversation text for state determination:', {
    conversationText: conversationTextRaw.substring(0, 500) + '...',
    state: businessResult.success ? businessResult.data.state : context.state,
    correlationId,
    messageCount: formattedMessages.length,
    lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content?.substring(0, 100) + '...'
  });
  
  const fullContext = { 
    ...context, 
    state: businessResult.success ? businessResult.data.state : context.state 
  };
  
  // Debug logging for available tools
  const availableTools = getAvailableToolsForState(fullContext.state, fullContext);
  console.log('🛠 Available tools for state:', {
    state: fullContext.state,
    availableTools: availableTools.map(t => t.name),
    correlationId
  });
  
  const systemPromptResult = BusinessLogicHandler.getSystemPromptForAI(
    businessResult.success ? businessResult.data.state : context.state, 
    fullContext,
    correlationId,
    sessionId,
    teamId
  );
  
    // Handle system prompt generation error
    let systemPrompt: string;
    if (!systemPromptResult.success) {
      Logger.error('Failed to generate system prompt', {
        correlationId,
        error: systemPromptResult.error?.message || 'Unknown error',
        state: businessResult.success ? businessResult.data.state : context.state
      });
    
    // Use fallback system prompt
    systemPrompt = `You are a helpful legal assistant. Please help the user with their legal inquiry.`;
    
    // Emit error via SSE if controller is available
    if (controller) {
      try {
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to generate system prompt',
            correlationId
          })}\n\n`
        ));
      } catch (sseError) {
        Logger.warn('Failed to emit SSE error report for system prompt failure', { sseError });
      }
    }
  } else {
    systemPrompt = systemPromptResult.data;
  }

  // Hoist tool parsing variables to function scope
  let toolName: string | null = null;
  let parameters: Record<string, unknown> | null = null;
  let response: string | null = null;
  
  try {
    Logger.debug('🔄 Starting agent...');
    
    // Send initial connection event for streaming
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use AI call with retry logic
    Logger.debug('🤖 Calling AI model...');
    
    // Log system prompt for debugging (first 500 chars)
    Logger.debug('📝 System prompt preview:', {
      correlationId,
      promptPreview: systemPrompt.substring(0, 500) + (systemPrompt.length > 500 ? '...' : ''),
      promptLength: systemPrompt.length,
      state: businessResult.success ? businessResult.data.state : context.state,
      contextHasLegalIssue: context.hasLegalIssue,
      contextLegalIssueType: context.legalIssueType,
      contextDescription: context.description ? 'YES' : 'NO'
    });
    
    // Log AI model call start
    const aiCallStartTime = Date.now();
    LegalIntakeLogger.logAIModelCall(
      correlationId,
      sessionId,
      teamId,
      'ai_model_call' as any,
      AI_MODEL_CONFIG.model
    );
    
    // Define tools available to AI based on conversation state
    const currentState = businessResult.success ? businessResult.data.state : context.state;
    const availableTools = getAvailableToolsForState(currentState, fullContext);
    
    // Log state transition for debugging
    if (currentState !== context.state) {
      Logger.debug('🔄 State transition:', {
        correlationId,
        from: context.state,
        to: currentState,
        reason: 'Business logic determined new state'
      });
    }
    
    // Log tools being passed to AI for debugging
    Logger.debug('🔧 Tools passed to AI:', {
      correlationId,
      toolNames: availableTools.map(tool => tool.name),
      toolCount: availableTools.length,
      systemPromptLength: systemPrompt.length,
      currentState,
      contextSummary: {
        hasLegalIssue: Boolean(fullContext.legalIssueType),
        hasDescription: Boolean(fullContext.description),
        isQualifiedLead: fullContext.isQualifiedLead,
        state: currentState
      }
    });

    // Log conversation state for audit/debugging
    Logger.info('📊 Conversation State:', {
      correlationId,
      sessionId,
      teamId,
      state: currentState,
      messageCount: formattedMessages.length,
      hasLegalIssue: Boolean(fullContext.legalIssueType),
      hasDescription: Boolean(fullContext.description),
      isQualifiedLead: fullContext.isQualifiedLead,
      availableTools: availableTools.map(tool => tool.name),
      timestamp: new Date().toISOString()
    });
    
    // MANDATORY: Validate AI tool loop before calling AI (temporarily disabled for debugging)
    // const healthCheck = validateAIToolLoop(
    //   availableTools,
    //   systemPrompt,
    //   businessResult.success ? businessResult.data.state : context.state,
    //   fullContext,
    //   correlationId
    // );
    
    // if (!healthCheck.isValid) {
    //   Logger.error('🚨 AI Tool Loop Health Check FAILED:', {
    //     correlationId,
    //     issues: healthCheck.issues
    //   });
      
    //   // Emit health check failure via SSE
    //   if (controller) {
    //     controller.enqueue(new TextEncoder().encode(
    //       `data: ${JSON.stringify({
    //         type: 'error',
    //         message: 'AI Tool Loop Health Check Failed',
    //         details: healthCheck.issues,
    //         correlationId
    //       })}\n\n`
    //     ));
    //   }
    // } else {
    //   Logger.debug('✅ AI Tool Loop Health Check PASSED');
    // }
    
    Logger.debug('✅ AI Tool Loop Health Check DISABLED for debugging');
    
    const aiResult = await withAIRetry(
      () => env.AI.run(AI_MODEL_CONFIG.model as any, {
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages
        ],
        tools: availableTools,
        max_tokens: AI_MODEL_CONFIG.maxTokens,
        temperature: AI_MODEL_CONFIG.temperature
      }),
      {
        attempts: 4,
        baseDelay: 400,
        operationName: 'Legal Intake AI Call'
      }
    );
    
    // Log raw AI response for debugging
    console.log('[RAW_AI_RESPONSE]', JSON.stringify(aiResult, null, 2));
    Logger.debug('✅ AI result:', aiResult);
    
    // Check for tool calls first
    if (hasToolCalls(aiResult)) {
      Logger.debug('🔧 Tool calls detected:', aiResult.tool_calls);
      
      // Handle tool calls
      const toolCalls = aiResult.tool_calls;
      const firstToolCall = toolCalls[0];
      
      toolName = firstToolCall.name;
      parameters = firstToolCall.arguments || {};
      
      Logger.debug('🔧 Processing tool call:', { toolName, parameters });
      
      // Handle streaming case for tool calls
      if (controller) {
        const typingEvent = `data: ${JSON.stringify({
          type: 'typing',
          text: 'Processing your request...'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(typingEvent));
      }
    } else {
      // Handle regular text response
      response = extractAIResponse(aiResult);
      
      Logger.debug('📝 No tool call detected, handling regular response:', response);
      
      // Stream the text response directly
      if (controller && response) {
        // Stream the response as text chunks
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const textEvent = `data: ${JSON.stringify({
            type: 'text',
            text: i === 0 ? word : ' ' + word
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(textEvent));
          
          // Add small delay between words for streaming effect
          if (i < words.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        // Send final response event
        const finalEvent = `data: ${JSON.stringify({
          type: 'final',
          response: response
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(finalEvent));
        
        // Send complete event before closing
        try {
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(completeEvent));
          console.log('✅ SSE complete event sent in regular response path');
        } catch (completeError) {
          console.log('❌ Failed to send complete event:', completeError);
        }
        
        // Close the controller
        try {
          controller.close();
        } catch (closeError) {
          console.log('Controller already closed, ignoring close attempt');
        }
      }
      
      return;
      
      // Log AI model response
      const aiCallEndTime = Date.now();
      const processingTime = aiCallEndTime - aiCallStartTime;
      LegalIntakeLogger.logAIModelCall(
        correlationId,
        sessionId,
        teamId,
        'ai_model_response' as any,
        AI_MODEL_CONFIG.model,
        undefined, // tokenCount not available from Cloudflare AI
        response?.length,
        processingTime
      );
      Logger.debug('📝 Full response:', response);
      
      // Check if response is empty or too short
      if (!response || response.trim().length < 10) {
        Logger.error('❌ AI returned empty or very short response:', response);
        const fallbackResponse = 'I apologize, but I encountered an error processing your request. Please try again.';
        
        if (controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'final',
            response: fallbackResponse
          })}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(errorEvent));
          } catch (closeError) {
            console.log('Controller already closed, ignoring fallback error event');
          }
          
          // Send complete event before closing
          try {
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(completeEvent));
            console.log('✅ SSE complete event sent');
          } catch (completeError) {
            console.log('Failed to send complete event:', completeError);
          }
          
          // Close the stream after sending fallback response
          try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
        } else {
          return {
            response: fallbackResponse,
            metadata: {
              error: 'Empty AI response',
              inputMessageCount: formattedMessages.length,
              lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
              sessionId,
              teamId
            }
          };
        }
        return;
      }
      
      // For text responses, continue to the tool execution logic below
      // (This will be handled by the existing logic)
    }
    
    // Handle tool calls (this should only happen when tools are available)
    if (hasToolCalls) {
      // Parse tool call using ToolCallParser for text-based tool calls
      const parseResult = ToolCallParser.parseToolCall(response);
    
      if (parseResult.success && parseResult.toolCall) {
        Logger.debug('Tool call detected in response');
        
        // Handle streaming case
        if (controller) {
          const typingEvent = `data: ${JSON.stringify({
            type: 'typing',
            text: 'Processing your request...'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(typingEvent));
        }
        
        toolName = parseResult.toolCall.toolName;
        parameters = parseResult.toolCall.parameters;
        
        Logger.debug('Parsed tool call:', { 
          toolName, 
          parameters: parseResult.toolCall.sanitizedParameters || parameters
        });
      } else if (parseResult.error && parseResult.error !== 'No tool call detected') {
        Logger.error('Tool call parsing failed:', parseResult.error);
        if (controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to parse tool parameters. Please try rephrasing your request.'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
        }
        return {
          response: 'I encountered an error processing your request. Please try rephrasing your request.',
          metadata: { 
            error: parseResult.error, 
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null
          }
        };
      }
    } // Close the if (!hasToolCalls) block
    
    // Check if we have valid tool call data
    if (toolName && parameters) {
      // Handle streaming case
      if (controller) {
        const toolEvent = `data: ${JSON.stringify({
          type: 'tool_call',
          name: toolName,
          parameters: parameters
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(toolEvent));
      }
      
      // Execute the tool handler using the mapping
      const handler = TOOL_HANDLERS[toolName as keyof typeof TOOL_HANDLERS];
      if (!handler) {
        Logger.warn(`❌ Unknown tool: ${toolName}`);
        
        // Log unknown tool call
        LegalIntakeLogger.logToolCall(
          correlationId,
          sessionId,
          teamId,
          'tool_call_failed' as any,
          toolName,
          parameters,
          undefined,
          new Error(`Unknown tool: ${toolName}`)
        );
        if (controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: `Unknown tool: ${toolName}`
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          
          // Send complete event before closing
          try {
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(completeEvent));
            console.log('✅ SSE complete event sent');
          } catch (completeError) {
            console.log('Failed to send complete event:', completeError);
          }
          
          try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
        }
        return {
          response: `I'm sorry, but I don't know how to handle that type of request.`,
          metadata: { 
            error: `Unknown tool: ${toolName}`,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null
          }
        };
      }
      
      // Log tool call start
      LegalIntakeLogger.logToolCall(
        correlationId,
        sessionId,
        teamId,
        'tool_call_start' as any,
        toolName,
        parameters
      );
      
      let toolResult: any;
      try {
        toolResult = await handler(parameters, env, teamConfig, correlationId, sessionId, teamId);
        // Note: Raw toolResult logging removed to prevent PII exposure
        // LegalIntakeLogger.logToolCall handles sanitized logging above
        
        // Record successful tool usage for monitoring
        ToolUsageMonitor.recordToolUsage(toolName, toolResult.success);
        
        // Log successful tool call
        LegalIntakeLogger.logToolCall(
          correlationId,
          sessionId,
          teamId,
          'tool_call_success' as any,
          toolName,
          parameters,
          toolResult
        );
      } catch (error) {
        Logger.error('Tool execution failed:', error);
        
        // Record failed tool usage for monitoring
        ToolUsageMonitor.recordToolUsage(toolName, false);
        
        // Log failed tool call
        LegalIntakeLogger.logToolCall(
          correlationId,
          sessionId,
          teamId,
          'tool_call_failed' as any,
          toolName,
          parameters,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        );
        if (controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'Tool execution failed. Please try again.'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          
          // Send complete event before closing
          try {
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(completeEvent));
            console.log('✅ SSE complete event sent');
          } catch (completeError) {
            console.log('Failed to send complete event:', completeError);
          }
          
          try { controller.close(); } catch {}
        }
        return {
          response: 'I encountered an error while processing your request. Please try again.',
          metadata: { 
            error: error instanceof Error ? error.message : String(error),
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null
          }
        };
      }
      
      // Handle streaming case
      if (controller) {
        const resultEvent = `data: ${JSON.stringify({
          type: 'tool_result',
          name: toolName,
          result: toolResult
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(resultEvent));
      }
      
      // Return tool result for non-streaming case
      if (!controller) {
        const toolResponse = extractToolResponse(toolResult);
        
        // Log agent completion for tool execution
        const toolEndTime = Date.now();
        const totalDuration = toolEndTime - (aiCallStartTime || Date.now());
        LegalIntakeLogger.logAgentComplete(
          correlationId,
          sessionId,
          teamId,
          totalDuration,
          toolResult.success,
          toolResponse.length
        );
        
        return {
          response: toolResponse,
          metadata: {
            toolName,
            toolResult: toolResult.success ? toolResult.data : (toolResult as { success: false; error: unknown }).error,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId,
            allowRetry: !toolResult.success && toolName === 'create_matter'
          }
        };
      }
      
      // Special handling for show_contact_form tool
      if (toolName === 'show_contact_form' && toolResult.success) {
        // Send contact form event to frontend
        const contactFormEvent = `data: ${JSON.stringify({
          type: 'contact_form',
          data: {
            fields: ['name', 'email', 'phone', 'location', 'opposingParty'],
            required: ['name', 'email', 'phone'],
            message: (toolResult.data as any)?.message || 'Please fill out the contact form below.'
          }
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(contactFormEvent));
        
        // Send complete event before closing
        try {
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(completeEvent));
          console.log('✅ SSE complete event sent');
        } catch (completeError) {
          console.log('Failed to send complete event:', completeError);
        }
        
        // Close the stream after sending contact form event
        try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
        return;
      }
      
      // For streaming case, send the tool result as the response
      const finalResponse = extractToolResponse(toolResult);
      
      // Check if the tool failed and we should allow retry
      if (!toolResult.success && toolName === 'create_matter') {
        // Tool failed - send error message but don't close the conversation
        const errorEvent = `data: ${JSON.stringify({
          type: 'tool_error',
          response: finalResponse,
          toolName: toolName,
          allowRetry: true
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorEvent));
        
        // Don't close the controller - let the conversation continue
        return;
      }
      
      // Tool succeeded or it's not create_matter - send final response and close
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: finalResponse
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      
      // Send complete event before closing
      try {
        const completeEvent = `data: ${JSON.stringify({
          type: 'complete'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(completeEvent));
        console.log('✅ SSE complete event sent');
      } catch (completeError) {
        console.log('Failed to send complete event:', completeError);
      }
      
      // Close the stream after sending final event
      try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
      
      // Return after tool execution for streaming case
      return;
    }
    
    // If no tool call detected, handle the regular response
    Logger.debug('📝 No tool call detected, handling regular response');
    
    // Ensure response is defined (this should only happen if no tool calls and no text response)
    if (!response) {
      response = 'I apologize, but I encountered an error processing your request.';
    }
    
    console.log('🔍 Controller check:', !!controller, 'Response length:', response.length);
    
    if (controller) {
      console.log('🎯 ENTERING STREAMING SECTION - controller exists');
      try {
        // Streaming case: send response as single text event (no artificial chunking)
        const textEvent = `data: ${JSON.stringify({
          type: 'text',
          text: response
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(textEvent));
        
        // Send final response
        const finalEvent = `data: ${JSON.stringify({
          type: 'final',
          response: response
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(finalEvent));
      } finally {
        // ALWAYS send complete event before closing - this ensures it's sent even if there's an error
        console.log('🔄 About to send complete event in regular response path...');
        try {
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete'
          })}\n\n`;
          console.log('📤 Sending complete event:', completeEvent.trim());
          controller.enqueue(new TextEncoder().encode(completeEvent));
          console.log('✅ SSE complete event sent successfully');
        } catch (completeError) {
          console.log('❌ Failed to send complete event:', completeError);
        }
        
        // Close the stream after sending complete event
        try {
          controller.close();
        } catch (closeError) {
          console.log('Controller already closed, ignoring close attempt');
        }
      }
      
      // Return early for streaming case - don't fall through to non-streaming logic
      // The stream is now properly closed, so we can return undefined
      return;
    } else {
      // Non-streaming case: return the response directly
      // Log agent completion
      const agentEndTime = Date.now();
      const totalDuration = agentEndTime - (aiCallStartTime || Date.now());
      LegalIntakeLogger.logAgentComplete(
        correlationId,
        sessionId,
        teamId,
        totalDuration,
        true,
        response.length
      );
      
      return {
        response,
        metadata: {
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
  } catch (error) {
    // Extract error details safely
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your request';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const lastUserMessage = formattedMessages[formattedMessages.length - 1]?.content || null;
    
    // Create structured error log object
    const structuredError = {
      correlationId,
      sessionId,
      teamId,
      inputMessageCount: formattedMessages.length,
      lastUserMessage,
      error: {
        message: errorMessage,
        stack: errorStack
      },
      timestamp: new Date().toISOString(),
      operation: 'runLegalIntakeAgentStream'
    };
    
    // Log structured error using project's Logger
    Logger.error('Agent error occurred', structuredError);
    
    // Log agent error with structured logging
    LegalIntakeLogger.logAgentError(
      correlationId,
      sessionId,
      teamId,
      error instanceof Error ? error : new Error(String(error)),
      {
        inputMessageCount: formattedMessages.length,
        lastUserMessage,
        operation: 'runLegalIntakeAgentStream'
      }
    );

    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: errorMessage,
        correlationId
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
      
      // Log the same structured error for SSE case
      Logger.error('SSE error event sent', structuredError);
      
      // Send complete event before closing
      try {
        const completeEvent = `data: ${JSON.stringify({
          type: 'complete'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(completeEvent));
        console.log('✅ SSE complete event sent');
      } catch (completeError) {
        console.log('Failed to send complete event:', completeError);
      }
      
      // Safely close controller with try/catch
      try {
        try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
      } catch (closeError) {
        Logger.error('Error closing SSE controller', {
          correlationId,
          closeError: closeError instanceof Error ? closeError.message : String(closeError),
          stack: closeError instanceof Error ? closeError.stack : undefined
        });
      }
    } else {
        return {
          response: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
          metadata: {
            error: errorMessage,
            inputMessageCount: formattedMessages.length,
            lastUserMessage,
            sessionId,
            teamId
          }
        };
    }
  }
  
  } catch (error) {
    // Catch any null reference errors or other unexpected errors
    console.error('🚨 CRITICAL ERROR in runLegalIntakeAgentStream:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      correlationId: correlationId || 'unknown',
      sessionId,
      teamId,
      messageCount: messages?.length || 0
    });
    
    // Send error event via SSE if controller is available
    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: `Critical error: ${error instanceof Error ? error.message : String(error)}`,
        correlationId: correlationId || 'unknown'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
      
      // Send complete event before closing
      try {
        const completeEvent = `data: ${JSON.stringify({
          type: 'complete'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(completeEvent));
        console.log('✅ SSE complete event sent after critical error');
      } catch (completeError) {
        console.log('Failed to send complete event after critical error:', completeError);
      }
      
      // Close the stream after sending complete event
      try {
        controller.close();
      } catch (closeError) {
        console.log('Controller already closed, ignoring close attempt');
      }
    }
    
    // Return error response for non-streaming case
    return {
      response: 'I apologize, but I encountered a critical error processing your request. Please try again.',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        inputMessageCount: messages?.length || 0,
        lastUserMessage: null,
        sessionId,
        teamId
      }
    };
  }
}
