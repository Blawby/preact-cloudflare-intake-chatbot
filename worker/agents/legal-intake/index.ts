import { Logger } from '../../utils/logger.js';
import { LegalIntakeLogger, LegalIntakeOperation } from './legalIntakeLogger.js';
import { PromptBuilder, CloudflareAIResponse } from '../../utils/promptBuilder.js';
import { BusinessLogicHandler } from './businessLogicHandler.js';
import { ConversationStateMachine, ConversationState, ConversationContext } from './conversationStateMachine.js';
import { TOOL_HANDLERS, Currency, Recipient, ISODateString } from '../legalIntakeAgent.js';
import { ToolCallParser } from '../../utils/toolCallParser.js';
import { withAIRetry } from '../../utils/retry.js';
import { ToolUsageMonitor } from '../../utils/toolUsageMonitor.js';
import type { Env, AgentMessage, AgentResponse, FileAttachment } from '../../types.js';
import type { ErrorResult } from './errors.js';
import { safeIncludes } from '../../utils/safeStringUtils.js';

// Type definitions and constants
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

const MATTER_TYPES = [
  'Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury',
  'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review',
  'Property Law', 'Administrative Law', 'General Consultation'
] as const;

const COMPLEXITY_LEVELS = ['Low', 'Medium', 'High', 'Very High'] as const;
const ANALYSIS_TYPES = ['general', 'legal_document', 'contract', 'government_form', 'medical_document', 'image', 'resume'] as const;

// Use the existing LegalIntakeOperation enum for type safety

export type MatterType = typeof MATTER_TYPES[number];
export type ComplexityLevel = typeof COMPLEXITY_LEVELS[number];
export type AnalysisType = typeof ANALYSIS_TYPES[number];

// Tool parameter interfaces
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
  readonly currency: Currency;
  readonly recipient: Recipient;
  readonly due_date?: ISODateString;
  readonly description: string;
}

// Tool definitions
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

// Tool definitions
export const createMatter: ToolDefinition<CreateMatterParams> = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information. ONLY use this tool AFTER the user has submitted the contact form and you have all their contact details.',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { type: 'string', description: 'Type of legal matter', enum: MATTER_TYPES },
      description: { type: 'string', description: 'Brief description of the legal issue', maxLength: 1000 },
      name: { type: 'string', description: 'Client full name', minLength: 2, maxLength: 100 },
      phone: { type: 'string', description: 'Client phone number', pattern: '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$' },
      email: { type: 'string', description: 'Client email address', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
      location: { type: 'string', description: 'Client location (city and state)', maxLength: 100 },
      opposing_party: { type: 'string', description: 'Opposing party name if applicable', maxLength: 100 }
    },
    required: ['matter_type', 'description', 'name'] as const,
    additionalProperties: false
  }
};

export const showContactForm: ToolDefinition<{}> = {
  name: 'show_contact_form',
  description: 'CRITICAL: ONLY use this tool AFTER you have had a full conversation, qualified the lead, and determined they are serious about legal action.',
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
      matter_type: { type: 'string', description: 'Type of legal matter', enum: MATTER_TYPES },
      complexity: { type: 'string', description: 'Matter complexity level', enum: COMPLEXITY_LEVELS, default: 'Medium' }
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
      file_id: { type: 'string', description: 'The file ID of the uploaded document to analyze', pattern: '^[a-zA-Z0-9\\-_]+$', minLength: 1, maxLength: 50 },
      analysis_type: { type: 'string', description: 'Type of analysis to perform', enum: ANALYSIS_TYPES, default: 'general' },
      specific_question: { type: 'string', description: 'Optional specific question to ask about the document', maxLength: 500, minLength: 10 }
    },
    required: ['file_id'] as const,
    additionalProperties: false
  }
};

export const createPaymentInvoice: ToolDefinition<CreatePaymentInvoiceParams> = {
  name: 'create_payment_invoice',
  description: 'Create a payment invoice for consultation or legal services',
  parameters: {
    type: 'object',
    properties: {
      invoice_id: { type: 'string', description: 'Unique identifier for the invoice', pattern: '^[a-zA-Z0-9\\-_]+$', minLength: 1, maxLength: 50 },
      amount: { type: 'number', description: 'Invoice amount in cents (e.g., 7500 for $75.00)', minimum: 100, maximum: 1000000 },
      currency: { type: 'string', description: 'Currency code for the invoice', enum: Object.values(Currency), default: Currency.USD },
      recipient: { type: 'object', description: 'Recipient information for the invoice', properties: { email: { type: 'string', description: 'Recipient email address', maxLength: 255 }, name: { type: 'string', description: 'Recipient full name', minLength: 1, maxLength: 255 } } },
      due_date: { type: 'string', description: 'Invoice due date in ISO 8601 format (YYYY-MM-DD)', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      description: { type: 'string', description: 'Description of services or consultation', minLength: 1, maxLength: 500 }
    },
    required: ['invoice_id', 'amount', 'currency', 'recipient', 'description'] as const,
    additionalProperties: false
  }
};

export const collectContactInfo = showContactForm; // Alias for backward compatibility

export interface CloudflareLocation {
  readonly city?: string;
  readonly country?: string;
  readonly region?: string;
  readonly timezone?: string;
}

// Type guards
function hasMessageProperty(obj: unknown): obj is { message: string } {
  return obj !== null && typeof obj === 'object' && 'message' in obj && typeof (obj as Record<string, unknown>).message === 'string';
}

function hasResponseProperties(obj: unknown): obj is { message?: string; response?: string } {
  return obj !== null && typeof obj === 'object' && ('message' in obj || 'response' in obj);
}

function hasToolCalls(aiResult: unknown): aiResult is CloudflareAIResponse & { tool_calls: NonNullable<CloudflareAIResponse['tool_calls']> } {
  return aiResult !== null && typeof aiResult === 'object' && 'tool_calls' in aiResult && 
         Array.isArray((aiResult as CloudflareAIResponse).tool_calls) && (aiResult as CloudflareAIResponse).tool_calls!.length > 0;
}

// Utility functions
function extractStringFromResponse(obj: { message?: string; response?: string }): string | undefined {
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.response === 'string') return obj.response;
  return undefined;
}

function extractToolResponse<T>(toolResult: ErrorResult<T>): string {
  if (toolResult.success) {
    if (hasMessageProperty(toolResult)) return toolResult.message;
    const data = toolResult.data;
    if (data && typeof data === 'object' && hasResponseProperties(data)) {
      const extractedString = extractStringFromResponse(data);
      if (extractedString) return extractedString;
    }
    return 'Tool executed successfully.';
  } else {
    const errorResult = toolResult as Extract<ErrorResult<T>, { success: false }>;
    return errorResult.error.toUserResponse() || errorResult.error.message || 'An error occurred while executing the tool.';
  }
}

function extractAIResponse(aiResult: unknown): string {
  if (aiResult !== null && typeof aiResult === 'object' && 'response' in aiResult) {
    const response = (aiResult as CloudflareAIResponse).response;
    return typeof response === 'string' ? response : 'I apologize, but I encountered an error processing your request.';
  }
  return 'I apologize, but I encountered an error processing your request.';
}

function getAvailableToolsForState(state: ConversationState, context: ConversationContext): ToolDefinition<any>[] {
  const allTools = [createMatter, showContactForm, requestLawyerReview, createPaymentInvoice];

  switch (state) {
    case ConversationState.GATHERING_INFORMATION:
    case ConversationState.COLLECTING_LEGAL_ISSUE:
    case ConversationState.COLLECTING_DETAILS:
      return [];
    case ConversationState.QUALIFYING_LEAD:
      return context.isQualifiedLead ? [showContactForm] : [];
    case ConversationState.SHOWING_CONTACT_FORM:
      return [showContactForm];
    case ConversationState.READY_TO_CREATE_MATTER:
    case ConversationState.CREATING_MATTER:
      return [createMatter];
    case ConversationState.COMPLETED:
      return allTools;
    default:
      return [];
  }
}

function validateAIToolLoop(
  availableTools: ToolDefinition<any>[],
  systemPrompt: string,
  state: ConversationState,
  context: ConversationContext,
  correlationId?: string
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  const hasShowContactFormTool = availableTools.some(tool => tool.name === 'show_contact_form');
  if (state === ConversationState.SHOWING_CONTACT_FORM && !hasShowContactFormTool) {
    issues.push('show_contact_form tool is NOT included in availableTools array when state is SHOWING_CONTACT_FORM');
  }

  if (state === ConversationState.QUALIFYING_LEAD && availableTools.length > 0 && !hasShowContactFormTool) {
    issues.push('show_contact_form should be available during QUALIFYING_LEAD state');
  }

  const systemPromptMentionsShowContactForm = safeIncludes(systemPrompt, 'show_contact_form');
  if (!systemPromptMentionsShowContactForm) {
    issues.push('System prompt does NOT mention show_contact_form tool');
  }

  const shouldShowContactForm = context.legalIssueType && context.description && context.isQualifiedLead;
  const stateIsShowingContactForm = state === ConversationState.SHOWING_CONTACT_FORM;
  if (shouldShowContactForm && !stateIsShowingContactForm) {
    issues.push(`State machine should be SHOWING_CONTACT_FORM but is ${state}`);
  }

  if (state === ConversationState.SHOWING_CONTACT_FORM) {
    if (!context.hasLegalIssue || !context.legalIssueType) {
      issues.push('State is SHOWING_CONTACT_FORM but missing legal issue info');
    }
    if (!context.description) {
      issues.push('State is SHOWING_CONTACT_FORM but missing description');
    }
    if (!context.isQualifiedLead) {
      issues.push('State is SHOWING_CONTACT_FORM but lead is not qualified');
    }
  }

  const isValid = issues.length === 0;
  
  if (correlationId) {
    Logger.debug('AI Tool Loop Health Check:', {
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

// SSE Helper functions
async function emitSSEEvent(controller: ReadableStreamDefaultController<Uint8Array> | undefined, event: any): Promise<void> {
  if (!controller) return;
  
  try {
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(new TextEncoder().encode(eventData));
      } catch (error) {
    Logger.warn('Failed to emit SSE event', { event: event.type, error });
  }
}

async function emitComplete(controller: ReadableStreamDefaultController<Uint8Array> | undefined): Promise<void> {
  await emitSSEEvent(controller, { type: 'complete' });
    
    if (controller) {
      try {
        controller.close();
      } catch (closeError) {
      Logger.debug('Controller already closed or closing');
    }
  }
}

async function emitError(controller: ReadableStreamDefaultController<Uint8Array> | undefined, error: unknown, correlationId: string): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await emitSSEEvent(controller, {
    type: 'error',
    message: errorMessage,
    correlationId
  });
}
  
// Context extraction with fallback
async function safeExtractContext(conversationText: string, env: Env): Promise<ConversationContext> {
  try {
    return await PromptBuilder.extractConversationInfo(conversationText, env);
  } catch (error) {
    Logger.debug('AI context extraction failed, using minimal context:', error);
    return BusinessLogicHandler.createMinimalContext();
  }
}

// Tool call handlers
async function handleToolCall(
  toolCall: { name: string; arguments?: Record<string, unknown> },
  env: Env,
  teamConfig: unknown,
  controller: ReadableStreamDefaultController<Uint8Array> | undefined,
  correlationId: string,
  sessionId?: string,
  teamId?: string
): Promise<void> {
  const { name: toolName, arguments: parameters = {} } = toolCall;
  
  await emitSSEEvent(controller, {
    type: 'tool_call',
    name: toolName,
    parameters
  });

  const handler = TOOL_HANDLERS[toolName as keyof typeof TOOL_HANDLERS];
  if (!handler) {
    Logger.warn(`Unknown tool: ${toolName}`);
    LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_FAILED, toolName, parameters, undefined, new Error(`Unknown tool: ${toolName}`));
    await emitError(controller, `Unknown tool: ${toolName}`, correlationId);
    return;
  }

  LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_START, toolName, parameters);

  try {
    const toolResult = await handler(parameters, env, teamConfig, correlationId, sessionId, teamId);
    
    ToolUsageMonitor.recordToolUsage(toolName, toolResult.success);
    LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_SUCCESS, toolName, parameters, toolResult);

    await emitSSEEvent(controller, {
      type: 'tool_result',
      name: toolName,
      result: toolResult
    });

    // Special handling for show_contact_form
    if (toolName === 'show_contact_form' && toolResult.success) {
      await emitSSEEvent(controller, {
        type: 'contact_form',
        data: {
          fields: ['name', 'email', 'phone', 'location', 'opposingParty'],
          required: ['name', 'email', 'phone'],
          message: ('data' in toolResult ? (toolResult.data as any)?.message : null) || 'Please fill out the contact form below.'
        }
      });
      return;
    }

    const finalResponse = extractToolResponse(toolResult as ErrorResult<any>);

    if (!toolResult.success && toolName === 'create_matter') {
      await emitSSEEvent(controller, {
        type: 'tool_error',
        response: finalResponse,
        toolName: toolName,
        allowRetry: true
      });
      return; // Don't close - allow retry
    }

    await emitSSEEvent(controller, {
      type: 'final',
      response: finalResponse
    });

  } catch (error) {
    Logger.error('Tool execution failed:', error);
    ToolUsageMonitor.recordToolUsage(toolName, false);
    LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_FAILED, toolName, parameters, undefined, error instanceof Error ? error : new Error(String(error)));
    await emitError(controller, 'Tool execution failed. Please try again.', correlationId);
  }
}

async function handleParsedToolCall(
  response: string,
  env: Env,
  teamConfig: unknown,
  controller: ReadableStreamDefaultController<Uint8Array> | undefined,
  correlationId: string,
  sessionId?: string,
  teamId?: string
): Promise<void> {
  const parseResult = ToolCallParser.parseToolCall(response);
  
  if (!parseResult.success || !parseResult.toolCall) {
    if (parseResult.error && parseResult.error !== 'No tool call detected') {
      Logger.error('Tool call parsing failed:', parseResult.error);
      await emitError(controller, 'Failed to parse tool parameters. Please try rephrasing your request.', correlationId);
    }
      return;
  }

  const { toolName, parameters } = parseResult.toolCall;
  await handleToolCall({ name: toolName, arguments: parameters }, env, teamConfig, controller, correlationId, sessionId, teamId);
}

async function streamTextResponse(response: string, controller: ReadableStreamDefaultController<Uint8Array> | undefined): Promise<void> {
  if (!response || response.trim().length < 10) {
    response = 'I apologize, but I encountered an error processing your request.';
  }

  await emitSSEEvent(controller, {
    type: 'text',
    text: response
  });

  await emitSSEEvent(controller, {
    type: 'final',
    response: response
  });
}

function buildPrompt(messages: readonly AgentMessage[], context: ConversationContext): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return messages.map(msg => ({
    role: msg.role || (msg.isUser ? 'user' : 'assistant'),
    content: msg.content || ''
  }));
}

function looksLikeToolCall(response: string): boolean {
  return typeof response === 'string' && safeIncludes(response.toLowerCase(), 'tool_call');
}

// Main agent function
export async function runLegalIntakeAgentStream(
  env: Env, 
  messages: readonly AgentMessage[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: CloudflareLocation,
  controller?: ReadableStreamDefaultController<Uint8Array>,
  attachments: readonly FileAttachment[] = []
): Promise<AgentResponse | void> {
  
  Logger.initialize({ DEBUG: env.DEBUG, NODE_ENV: env.NODE_ENV });
  const correlationId = LegalIntakeLogger.generateCorrelationId();
  const aiCallStartTime = Date.now();

  try {
    // Initial connection
    await emitSSEEvent(controller, { type: 'connected' });

    // Team configuration
    let teamConfig: unknown = null;
    if (teamId) {
      try {
        const { TeamService } = await import('../../services/TeamService.js');
        const teamService = new TeamService(env);
        teamConfig = await teamService.getTeam(teamId);
      } catch (error) {
        Logger.error('Failed to retrieve team configuration', { teamId, error: error instanceof Error ? error.message : String(error) });
        await emitError(controller, 'Failed to retrieve team configuration', correlationId);
        teamConfig = null;
      }
    }

    // Log agent start
    LegalIntakeLogger.logAgentStart(correlationId, sessionId, teamId, messages.length, attachments.length > 0, attachments.length, teamConfig ? { hasConfig: true } : { hasConfig: false });

    // Build conversation text
    const conversationText = messages.map(msg => `${msg.role || (msg.isUser ? 'user' : 'assistant')}: ${msg.content || ''}`).join('\n');

    // Check for completion state
    const hasCompletionCues = safeIncludes(conversationText.toLowerCase(), 'matter created') ||
                              safeIncludes(conversationText.toLowerCase(), 'consultation fee') ||
                              safeIncludes(conversationText.toLowerCase(), 'already helped you create a matter');
    
    const hasToolInvocation = messages.some(msg => 
      msg.metadata?.toolName === 'create_matter' || 
      (msg.content && safeIncludes(msg.content, 'TOOL_CALL: create_matter'))
    );

    if (hasCompletionCues || hasToolInvocation) {
      const completionMessage = "I've already helped you create a matter for your case. A lawyer will contact you within 24 hours to discuss your situation further. Is there anything else I can help you with?";
      
        if (controller) {
        await emitSSEEvent(controller, { type: 'final', response: completionMessage });
        await emitComplete(controller);
      } else {
        const lastUserMessage = messages.filter(msg => msg.isUser).pop()?.content || null;
        return {
          response: completionMessage,
          metadata: { 
            conversationComplete: true, 
          sessionId,
          teamId,
            inputMessageCount: messages.length,
            lastUserMessage
          }
        };
      }
        return;
      }
      
    // Extract context and determine state
    const baseContext = await safeExtractContext(conversationText, env);
    const businessResult = await BusinessLogicHandler.handleConversation(conversationText, env, teamConfig);
    const context = { ...baseContext, state: businessResult.success ? businessResult.data.state : baseContext.state };
    
    // Get available tools and system prompt
    const availableTools = getAvailableToolsForState(context.state, context);
    const systemPromptResult = BusinessLogicHandler.getSystemPromptForAI(context.state, context, correlationId, sessionId, teamId, teamConfig);
    
    if (!systemPromptResult.success) {
      const errorResult = systemPromptResult as Extract<typeof systemPromptResult, { success: false }>;
      Logger.error('Failed to generate system prompt', { correlationId, error: errorResult.error.message });
      await emitError(controller, 'Failed to generate system prompt', correlationId);
      await emitComplete(controller);
        return;
      }
      
    const systemPrompt = systemPromptResult.data;

    // Validate tool loop
    const healthCheck = validateAIToolLoop(availableTools, systemPrompt, context.state, context, correlationId);
    if (!healthCheck.isValid) {
      Logger.error('AI Tool Loop Health Check FAILED:', { correlationId, issues: healthCheck.issues });
      await emitError(controller, 'AI Tool Loop Health Check Failed', correlationId);
      await emitComplete(controller);
      return;
    }
    
    // Log conversation state
    Logger.info('Conversation State:', {
      correlationId, sessionId, teamId, state: context.state,
      messageCount: messages.length, hasLegalIssue: Boolean(context.legalIssueType),
      hasDescription: Boolean(context.description), isQualifiedLead: context.isQualifiedLead,
      availableTools: availableTools.map(tool => tool.name)
    });

    // Call AI
    LegalIntakeLogger.logAIModelCall(correlationId, sessionId, teamId, LegalIntakeOperation.AI_MODEL_CALL, AI_MODEL_CONFIG.model);
    
    const aiResult = await withAIRetry(
      () => env.AI.run(AI_MODEL_CONFIG.model as any, {
        messages: [
          { role: 'system', content: systemPrompt },
          ...buildPrompt(messages, context)
        ],
        tools: availableTools,
        max_tokens: AI_MODEL_CONFIG.maxTokens,
        temperature: AI_MODEL_CONFIG.temperature
      }),
      { attempts: 4, baseDelay: 400, operationName: 'Legal Intake AI Call' }
    );

    // Log AI response metadata
    const processingTime = Date.now() - aiCallStartTime;
    const response = extractAIResponse(aiResult);
    LegalIntakeLogger.logAIModelCall(correlationId, sessionId, teamId, LegalIntakeOperation.AI_MODEL_RESPONSE, AI_MODEL_CONFIG.model, undefined, response.length, processingTime);

    // Handle AI response
    if (hasToolCalls(aiResult)) {
      await handleToolCall(aiResult.tool_calls[0], env, teamConfig, controller, correlationId, sessionId, teamId);
    } else if (looksLikeToolCall(response)) {
      await handleParsedToolCall(response, env, teamConfig, controller, correlationId, sessionId, teamId);
    } else {
      await streamTextResponse(response, controller);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Agent error occurred', { correlationId, sessionId, teamId, error: errorMessage });
    LegalIntakeLogger.logAgentError(correlationId, sessionId, teamId, error instanceof Error ? error : new Error(String(error)));
    
    await emitError(controller, errorMessage, correlationId);
    
    if (!controller) {
      const lastUserMessage = messages.filter(msg => msg.isUser).pop()?.content || null;
        return {
          response: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
          metadata: {
            error: errorMessage,
      sessionId,
      teamId,
          inputMessageCount: messages.length,
          lastUserMessage
        }
      };
    }
  } finally {
    await emitComplete(controller);
  }
}