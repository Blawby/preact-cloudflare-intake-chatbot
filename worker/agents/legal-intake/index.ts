import { Logger } from '../../utils/logger.js';
import { LegalIntakeLogger } from './legalIntakeLogger.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import { BusinessLogicHandler } from './businessLogicHandler.js';
import { ConversationStateMachine, ConversationState, ConversationContext } from './conversationStateMachine.js';
import { TOOL_HANDLERS } from '../legalIntakeAgent.js';
import { ToolCallParser, ToolCall, ToolCallParseResult } from '../../utils/toolCallParser.js';
import { withAIRetry } from '../../utils/retry.js';
import type { Env, Team, ChatMessage } from '../../types.js';
import type { ErrorResult } from './errors.js';
import { ExternalServiceError, ConfigurationError, LegalIntakeError } from './errors.js';

/**
 * Extracts a user-friendly response from a tool result
 * @param toolResult The result from a tool execution
 * @returns A user-friendly string response
 */
function extractToolResponse<T>(toolResult: ErrorResult<T>): string {
  if (toolResult.success) {
    const data = toolResult.data as { message?: string; response?: string };
    return data.message || data.response || 'Tool executed successfully.';
  } else {
    return toolResult.error.toUserResponse();
  }
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
  description: 'Create a new legal matter with all required information',
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

export const collectContactInfo: ToolDefinition<CollectContactInfoParams> = {
  name: 'collect_contact_info',
  description: 'Collect contact information from the user',
  parameters: {
    type: 'object',
    properties: {
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
      }
    },
    required: ['name'] as const,
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
  const formattedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = messages.map(msg => ({
    role: msg.role || (msg.isUser ? 'user' : 'assistant'),
    content: msg.content
  }));

  // Check if we've already completed a matter creation in this conversation
  // For multi-turn conversations, preserve role information for better context
  const conversationText = formattedMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n')
    .toLowerCase();
  
  // Check for completion cues in conversation text or last assistant message
  const hasCompletionCues = conversationText.includes('matter created') ||
                            conversationText.includes('consultation fee') ||
                            conversationText.includes('lawyer will contact you') ||
                            conversationText.includes('already helped you create a matter') ||
                            conversationText.includes('conversation is complete');
  
  // Check for actual tool invocations in message history
  const hasToolInvocation = messages.some(msg => 
    msg.metadata?.toolName === 'create_matter' || 
    msg.metadata?.toolCall?.toolName === 'create_matter' ||
    (msg.content && msg.content.includes('TOOL_CALL: create_matter'))
  );
  
  // Also check if the last assistant message was a completion message
  const lastAssistantMessage = formattedMessages.filter(msg => msg.role === 'assistant').pop();
  const isAlreadyCompleted = lastAssistantMessage?.content?.includes('already helped you create a matter');
  
  // Trigger if either completion cues are detected OR actual tool invocation is found
  if ((hasCompletionCues || hasToolInvocation) && isAlreadyCompleted) {
    const completionMessage = "I've already helped you create a matter for your case. A lawyer will contact you within 24 hours to discuss your situation further. Is there anything else I can help you with?";
    
    if (controller) {
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: completionMessage
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      controller.close();
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
  const sanitizedConversationText = conversationText.length > 200 
    ? conversationText.substring(0, 200) + '...' 
    : conversationText;
  Logger.debug('🔍 Conversation Text for Extraction:', { 
    conversationText: sanitizedConversationText,
    originalLength: conversationText.length,
    correlationId
  });
  const businessResult = await BusinessLogicHandler.handleConversation(conversationText, env, teamConfig);
  
  // Build system prompt for AI when it should be used
  let context: ConversationContext;
  try {
    context = await PromptBuilder.extractConversationInfo(conversationText, env);
  } catch (error) {
    // For short conversations or extraction failures, create a minimal context
    Logger.debug('🔍 AI context extraction failed, using minimal context:', error);
    context = BusinessLogicHandler.createMinimalContext();
    // Override the state with the one determined by business logic
    if (businessResult.success) {
      context.state = businessResult.data.state;
    }
  }
  
  const fullContext = { 
    ...context, 
    state: businessResult.success ? businessResult.data.state : context.state 
  };
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
      error: systemPromptResult.error.message,
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
  
  try {
    Logger.debug('🔄 Starting agent...');
    
    // Send initial connection event for streaming
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use AI call with retry logic
    Logger.debug('🤖 Calling AI model...');
    
    // Log AI model call start
    const aiCallStartTime = Date.now();
    LegalIntakeLogger.logAIModelCall(
      correlationId,
      sessionId,
      teamId,
      'ai_model_call' as any,
      AI_MODEL_CONFIG.model
    );
    
    const aiResult = await withAIRetry(
      () => env.AI.run(AI_MODEL_CONFIG.model as any, {
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages
        ],
        max_tokens: AI_MODEL_CONFIG.maxTokens,
        temperature: AI_MODEL_CONFIG.temperature
      }),
      {
        attempts: 4,
        baseDelay: 400,
        operationName: 'Legal Intake AI Call'
      }
    );
    
    Logger.debug('✅ AI result:', aiResult);
    
    // Runtime validation of aiResult structure
    const response = (typeof aiResult === 'object' && aiResult !== null && typeof (aiResult as any).response === 'string') 
      ? (aiResult as any).response 
      : 'I apologize, but I encountered an error processing your request.';
    
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
        controller.enqueue(new TextEncoder().encode(errorEvent));
        
        // Close the stream after sending fallback response
        controller.close();
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
    
    // Parse tool call using ToolCallParser
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
    
    // Check if we have valid tool call data
    if (toolName && parameters) {
      // Handle streaming case
      if (controller) {
        const toolEvent = `data: ${JSON.stringify({
          type: 'tool_call',
          name: toolName,
          parameters: parseResult.toolCall.sanitizedParameters || parameters
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
          controller.close();
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
      
      let toolResult: ErrorResult<unknown>;
      try {
        toolResult = await handler(parameters, env, teamConfig, correlationId, sessionId, teamId);
        Logger.debug('Tool execution result:', toolResult);
        
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
      
      // Close the stream after sending final event
      controller.close();
      
      // Return after tool execution for streaming case
      return;
    }
    
    // If no tool call detected, handle the regular response
    Logger.debug('📝 No tool call detected, handling regular response');
    
    if (controller) {
      // Streaming case: simulate streaming by sending response in chunks
      const chunkSize = 3;
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize);
        const textEvent = `data: ${JSON.stringify({
          type: 'text',
          text: chunk
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(textEvent));
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Send final response
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: response
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      
      // Close the stream after sending final event
      controller.close();
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
      
      // Safely close controller with try/catch
      try {
        controller.close();
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
          correlationId,
          error: {
            message: errorMessage,
            stack: errorStack
          },
          inputMessageCount: formattedMessages.length,
          lastUserMessage,
          sessionId,
          teamId
        }
      };
    }
  }
}
