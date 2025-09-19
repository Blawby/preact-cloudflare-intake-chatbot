import { CloudflareLocationInfo } from '../../utils/cloudflareLocationValidator.js';
import { TeamService } from '../../services/TeamService.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import { Logger } from '../../utils/logger.js';
import { ToolCallParser } from '../../utils/toolCallParser.js';
import { redactParameters } from './validationUtils.js';
import { handleCollectContactInfo } from './contactInfoHandler.js';
import { handleCreateMatter } from './matterCreationHandler.js';
import { handleRequestLawyerReview, handleAnalyzeDocument } from './otherHandlers.js';
import { BusinessLogicHandler } from './businessLogicHandler.js';

// AI Model Configuration
const AI_MODEL_CONFIG = {
  model: '@cf/meta/llama-3.1-8b-instruct',
  maxTokens: 500,
  temperature: 0.1
} as const;

// Tool handlers mapping
export const TOOL_HANDLERS = {
  collect_contact_info: handleCollectContactInfo,
  create_matter: handleCreateMatter,
  request_lawyer_review: handleRequestLawyerReview,
  analyze_document: handleAnalyzeDocument
};

// Response validation functions
function validateResponse(response: string, messages: any[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  const responseLower = response.toLowerCase();
  
  // Check if pricing is mentioned without user asking
  const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content.toLowerCase());
  const userAskedAboutPricing = userMessages.some(msg => 
    msg.includes('cost') || msg.includes('price') || msg.includes('fee') || 
    msg.includes('charge') || msg.includes('money') || msg.includes('how much')
  );
  
  const responseMentionsPricing = responseLower.includes('$') || 
    responseLower.includes('cost') || responseLower.includes('price') || 
    responseLower.includes('fee') || responseLower.includes('charge');
  
  if (responseMentionsPricing && !userAskedAboutPricing) {
    issues.push('Mentioned pricing without user request');
  }
  
  // Check for legal issue type assumptions
  const legalTypes = ['family law', 'employment law', 'personal injury', 'business law', 'criminal law'];
  const assumesLegalType = legalTypes.some(type => 
    responseLower.includes(`matter_type": "${type}`) || 
    responseLower.includes(`matter_type": "${type.charAt(0).toUpperCase() + type.slice(1)}`)
  );
  
  if (assumesLegalType && !userMessages.some(msg => legalTypes.some(type => msg.includes(type)))) {
    issues.push('Assumed legal issue type without user confirmation');
  }
  
  // Check for placeholder values in tool calls
  const hasPlaceholders = responseLower.includes('your phone') || 
    responseLower.includes('your email') || responseLower.includes('unknown') ||
    responseLower.includes('not provided') || responseLower.includes('placeholder');
  
  if (hasPlaceholders) {
    issues.push('Contains placeholder or fake information');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

function generateCorrectedResponse(issues: string[], messages: any[]): string {
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  
  // Extract information from conversation history
  const conversationText = messages.map(msg => msg.content).join(' ').toLowerCase();
  const hasName = /my name is|i am|name is/.test(conversationText);
  const hasLegalIssue = /divorce|family law|employment|landlord|tenant|personal injury|business|criminal|legal help/.test(conversationText);
  const hasContactInfo = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(conversationText) || /@/.test(conversationText);
  
  if (issues.includes('Mentioned pricing without user request')) {
    if (hasName && hasLegalIssue) {
      return "I understand you need legal help. Let me gather the information I need to assist you properly.";
    }
    return "I'd be happy to help you with your legal matter. To get started, could you please tell me your name?";
  }
  
  if (issues.includes('Assumed legal issue type without user confirmation')) {
    if (hasName) {
      return "Thank you for providing your name. Could you please describe what type of legal help you need?";
    }
    return "I'd like to understand your legal situation better. What type of legal help do you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or something else?";
  }
  
  if (issues.includes('Contains placeholder or fake information')) {
    if (hasName && hasLegalIssue) {
      return "I have your name and understand your legal issue. Let me create a matter for you with the information provided.";
    }
    return "I need your actual contact information to proceed. Could you please provide your real phone number and email address?";
  }
  
  // Default fallback with context awareness
  if (hasName && hasLegalIssue) {
    return "I understand your situation. Let me help you with your legal matter.";
  } else if (hasName) {
    return "Thank you for providing your name. Could you please describe what type of legal help you need?";
  }
  
  return "I'd be happy to help you with your legal matter. Could you please tell me your name and describe what type of legal help you need?";
}

// Helper function to handle lawyer approval
async function handleLawyerApproval(env: any, params: any, teamId: string) {
  Logger.debug('Lawyer approval requested:', ToolCallParser.sanitizeParameters(params));
  
  try {
    // Get team config for notification
    const { AIService } = await import('../../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(teamId);
    
    if (teamConfig.ownerEmail && env.RESEND_API_KEY) {
      const { EmailService } = await import('../../services/EmailService.js');
      const emailService = new EmailService(env.RESEND_API_KEY);
      
      await emailService.send({
        from: 'noreply@blawby.com',
        to: teamConfig.ownerEmail,
        subject: 'New Matter Requires Review',
        text: `A new legal matter requires your review.\n\nMatter Type: ${params.matter_type}\nClient Name: ${params.client_name}\nSubmitted: ${params.submitted ? 'Yes' : 'No'}\n\nPlease log in to the dashboard for full details.`
      });
    } else {
      Logger.info('Email service not configured - skipping email notification');
    }
  } catch (error) {
    console.warn('Failed to send lawyer approval email:', error);
    // Don't fail the request if email fails
  }
}

// Unified legal intake agent that handles both streaming and non-streaming responses
export async function runLegalIntakeAgentStream(
  env: any, 
  messages: any[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: CloudflareLocationInfo,
  controller?: ReadableStreamDefaultController,
  attachments: any[] = []
) {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    const teamService = new TeamService(env);
    const team = await teamService.getTeam(teamId);
    teamConfig = team || null;
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Check if we've already completed a matter creation in this conversation
  const conversationText = formattedMessages.map(msg => msg.content).join(' ').toLowerCase();
  
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

  // Use new business logic handler to determine what should happen
  const businessResult = await BusinessLogicHandler.handleConversation(conversationText, env, teamConfig);
  
  Logger.debug('🔍 Business Logic Result:', businessResult);
  
  // Handle matter creation if business logic determined we should create one
  if (businessResult.shouldCreateMatter) {
    if (controller) {
      try {
        const toolEvent = `data: ${JSON.stringify({
          type: 'tool_call',
          toolName: 'create_matter',
          parameters: businessResult.matterParams
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(toolEvent));
        
        const resultEvent = `data: ${JSON.stringify({
          type: 'tool_result',
          toolName: 'create_matter',
          result: { success: true, message: businessResult.response }
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(resultEvent));
        
        const finalEvent = `data: ${JSON.stringify({
          type: 'final',
          response: businessResult.response
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(finalEvent));
        controller.close();
        return;
      } catch (enqueueError) {
        console.error('❌ Failed to send matter creation events:', enqueueError);
        try {
          controller.close();
        } catch (closeError) {
          console.error('❌ Failed to close controller:', closeError);
        }
        return;
      }
    } else {
      // Non-streaming response
      return {
        success: true,
        message: businessResult.response,
        data: businessResult.matterParams
      };
    }
  }
  
  // If we have a rule-based response, use it directly
  if (!businessResult.useAIResponse && businessResult.response) {
    if (controller) {
      try {
        const finalEvent = `data: ${JSON.stringify({
          type: 'final',
          response: businessResult.response
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(finalEvent));
        controller.close();
        return;
      } catch (enqueueError) {
        console.error('❌ Failed to send rule-based response:', enqueueError);
        try {
          controller.close();
        } catch (closeError) {
          console.error('❌ Failed to close controller:', closeError);
        }
        return;
      }
    } else {
      return {
        success: true,
        message: businessResult.response
      };
    }
  }
  
  // Build system prompt for AI when it should be used
  const context = await PromptBuilder.extractConversationInfo(conversationText, env);
  const fullContext = { ...context, state: businessResult.state };
  const systemPrompt = BusinessLogicHandler.getSystemPromptForAI(businessResult.state, fullContext);
  
  // Continue with AI processing if needed
  

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
    
    // Post-processing validation to catch critical issues
    const validationResult = validateResponse(response, formattedMessages);
    if (!validationResult.isValid) {
      console.error('🚨 RESPONSE VALIDATION FAILED:');
      console.error('   Issues:', validationResult.issues);
      console.error('   Original response:', response);
      console.error('   Messages:', formattedMessages);
      Logger.warn('🚨 Response validation failed:', validationResult.issues);
      const correctedResponse = generateCorrectedResponse(validationResult.issues, formattedMessages);
      Logger.debug('🔧 Using corrected response:', correctedResponse);
      
      if (controller) {
        const correctedEvent = `data: ${JSON.stringify({
          type: 'final',
          response: correctedResponse
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(correctedEvent));
        controller.close();
      } else {
        return {
          response: correctedResponse,
          metadata: {
            validationIssues: validationResult.issues,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId
          }
        };
      }
      return;
    }
    
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
        parameters: parseResult.toolCall.sanitizedParameters || redactParameters(parameters) 
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
          toolName: toolName,
          parameters: parseResult.toolCall.sanitizedParameters || redactParameters(parameters)
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
          toolName: toolName,
          result: toolResult
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(resultEvent));
      }
      
      // If tool was successful and created a matter, trigger lawyer approval
      if (toolResult.success && toolName === 'create_matter') {
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (!lastMessage || !lastMessage.content) {
          console.warn('No last message found for lawyer approval');
        }

        await handleLawyerApproval(env, {
          matter_type: parameters.matter_type,
          client_message: lastMessage?.content || '',
          client_name: parameters.name,
          client_phone: parameters.phone,
          client_email: parameters.email,
          opposing_party: parameters.opposing_party || '',
          matter_details: parameters.description,
          submitted: true,
          requires_payment: toolResult.data?.requires_payment || false,
          consultation_fee: toolResult.data?.consultation_fee || 0,
          payment_link: toolResult.data?.payment_link || null
        }, teamId);
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