import { Logger } from '../../utils/logger.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import { BusinessLogicHandler } from './businessLogicHandler.js';
import { ConversationStateMachine, ConversationState } from './conversationStateMachine.js';
import { TOOL_HANDLERS } from './matterCreationHandler.js';
import { ToolCallParser } from '../../utils/toolCallParser.js';

// AI Model Configuration
const AI_MODEL_CONFIG = {
  model: '@cf/meta/llama-3.1-8b-instruct',
  maxTokens: 500,
  temperature: 0.1
} as const;

// Tool definitions with structured schemas
export const createMatter = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string', 
        description: 'Type of legal matter',
        enum: ['Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury', 'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review', 'Property Law', 'Administrative Law', 'General Consultation']
      },
      description: { type: 'string', description: 'Brief description of the legal issue' },
      name: { type: 'string', description: 'Client full name' },
      phone: { type: 'string', description: 'Client phone number' },
      email: { type: 'string', description: 'Client email address' },
      location: { type: 'string', description: 'Client location (city and state)' },
      opposing_party: { type: 'string', description: 'Opposing party name if applicable' }
    },
    required: ['matter_type', 'description', 'name']
  }
};

export const collectContactInfo = {
  name: 'collect_contact_info',
  description: 'Collect contact information from the user',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Client full name' },
      phone: { type: 'string', description: 'Client phone number' },
      email: { type: 'string', description: 'Client email address' },
      location: { type: 'string', description: 'Client location (city and state)' }
    },
    required: ['name']
  }
};

export const requestLawyerReview = {
  name: 'request_lawyer_review',
  description: 'Request lawyer review for complex matters',
  parameters: {
    type: 'object',
    properties: {
      complexity: { type: 'string', description: 'Matter complexity level' },
      matter_type: { type: 'string', description: 'Type of legal matter' }
    },
    required: ['matter_type']
  }
};

export const analyzeDocument = {
  name: 'analyze_document',
  description: 'Analyze an uploaded document or image to extract key information for legal intake',
  parameters: {
    type: 'object',
    properties: {
      file_id: { 
        type: 'string', 
        description: 'The file ID of the uploaded document to analyze',
        pattern: '^[a-zA-Z0-9\\-_]+$'
      },
      analysis_type: { 
        type: 'string', 
        description: 'Type of analysis to perform',
        enum: ['general', 'legal_document', 'contract', 'government_form', 'medical_document', 'image', 'resume'],
        default: 'general'
      },
      specific_question: { 
        type: 'string', 
        description: 'Optional specific question to ask about the document',
        maxLength: 500
      }
    },
    required: ['file_id']
  }
};

// Unified legal intake agent that handles both streaming and non-streaming responses
export async function runLegalIntakeAgentStream(
  env: any, 
  messages: any[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: any,
  controller?: ReadableStreamDefaultController,
  attachments: any[] = []
) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    const { TeamService } = await import('../../services/TeamService.js');
    const teamService = new TeamService(env);
    const team = await teamService.getTeam(teamId);
    teamConfig = team || null;
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
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
  Logger.debug('🔍 Conversation Text for Extraction:', { conversationText });
  const businessResult = await BusinessLogicHandler.handleConversation(conversationText, env, teamConfig);
  
  // Build system prompt for AI when it should be used
  let context;
  try {
    context = await PromptBuilder.extractConversationInfo(conversationText, env);
  } catch (error) {
    // For short conversations or extraction failures, create a minimal context
    Logger.debug('🔍 AI context extraction failed, using minimal context:', error);
    context = {
      hasName: false,
      hasLegalIssue: false,
      hasEmail: false,
      hasPhone: false,
      hasLocation: false,
      name: null,
      legalIssueType: null,
      description: null,
      email: null,
      phone: null,
      location: null,
      isSensitiveMatter: false,
      isGeneralInquiry: true,
      shouldCreateMatter: false,
      state: businessResult.state // Use the state determined by business logic
    };
  }
  const fullContext = { ...context, state: businessResult.state };
  const systemPrompt = BusinessLogicHandler.getSystemPromptForAI(businessResult.state, fullContext);

  // Hoist tool parsing variables to function scope
  let toolName: string | null = null;
  let parameters: any = null;
  
  try {
    Logger.debug('🔄 Starting agent...');
    
    // Send initial connection event for streaming
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use AI call
    Logger.debug('🤖 Calling AI model...');
    
    const aiResult = await env.AI.run(AI_MODEL_CONFIG.model, {
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      max_tokens: AI_MODEL_CONFIG.maxTokens,
      temperature: AI_MODEL_CONFIG.temperature
    });
    
    Logger.debug('✅ AI result:', aiResult);
    
    const response = aiResult.response || 'I apologize, but I encountered an error processing your request.';
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
        metadata: { error: parseResult.error, rawParameters: parseResult.rawParameters }
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
          metadata: { error: `Unknown tool: ${toolName}` }
        };
      }
      
      let toolResult;
      try {
        toolResult = await handler(parameters, env, teamConfig);
        Logger.debug('Tool execution result:', toolResult);
      } catch (error) {
        Logger.error('Tool execution failed:', error);
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
          metadata: { error: error instanceof Error ? error.message : String(error) }
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
        return {
          response: toolResult.message || toolResult.response || 'Tool executed successfully.',
          metadata: {
            toolName,
            toolResult,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId,
            allowRetry: !toolResult.success && toolName === 'create_matter'
          }
        };
      }
      
      // For streaming case, send the tool result as the response
      const finalResponse = toolResult.message || toolResult.response || 'Tool executed successfully.';
      
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
    console.error('Agent error:', error);
    const errorMessage = error.message || 'An error occurred while processing your request';

    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: errorMessage
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
      try {
        controller.close();
      } catch (closeError) {
        console.error('Error closing controller:', closeError);
      }
    } else {
      return {
        response: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
        metadata: {
          error: error.message,
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
  }
}
