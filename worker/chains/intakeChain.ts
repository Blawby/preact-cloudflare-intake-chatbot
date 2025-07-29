import { runLegalIntakeAgent, TOOL_HANDLERS } from '../agents/legalIntakeAgent.js';

// Helper function to get team configuration
async function getTeamConfig(env: any, teamId: string) {
  try {
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    console.log('Retrieving team config for teamId:', teamId);
    const teamConfig = await aiService.getTeamConfig(teamId);
    console.log('Retrieved team config:', JSON.stringify(teamConfig, null, 2));
    return teamConfig;
  } catch (error) {
    console.warn('Failed to get team config:', error);
    return {
      config: {
        requiresPayment: false,
        consultationFee: 0,
        paymentLink: null
      }
    };
  }
}

export interface ChainResult {
  workflow: string;
  response: string;
  actions: Array<{ name: string; parameters: any }>;
  metadata: any;
}

export interface ChainContext {
  teamId: string;
  sessionId: string;
  message: string;
  messages?: Array<{ role: string; content: string }>;
  env: any;
}

// Simplified intake chain using improved Cloudflare Agents pattern
export async function runIntakeChain(context: ChainContext): Promise<ChainResult> {
  const { env, message, messages, sessionId, teamId } = context;
  
  // Get team configuration
  let teamConfig;
  try {
    teamConfig = await getTeamConfig(env, teamId);
  } catch (error) {
    console.error('Error getting team config:', error);
    return {
      workflow: 'MATTER_CREATION',
      response: "I'm here to help with your legal needs. What can I assist you with?",
      actions: [],
      metadata: {
        error: 'Failed to get team config',
        sessionId
      }
    };
  }
  
  // Prepare conversation history
  const conversationHistory = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));
  
  try {
    // Run the legal intake agent
    const result = await runLegalIntakeAgent(env, conversationHistory);
    
    console.log('Agent result:', JSON.stringify(result, null, 2));
    
    // Handle tool calls if any
    if (result.toolCalls?.length) {
      for (const toolCall of result.toolCalls) {
        const toolName = toolCall.name;
        const toolParams = toolCall.parameters;
        
        console.log(`Tool called: ${toolName}`, toolParams);
        
        const handler = TOOL_HANDLERS[toolName];
        if (!handler) {
          console.warn(`Unknown tool called: ${toolName}`);
          continue;
        }
        
        const toolResult = await handler(toolParams, env, teamConfig);
        
        // If tool was successful and created a matter, trigger lawyer approval
        if (toolResult.success && toolName === 'create_matter') {
          return {
            workflow: 'MATTER_CREATION',
            response: toolResult.message,
            actions: [{
              name: 'request_lawyer_approval',
              parameters: {
                matter_type: toolParams.matter_type,
                urgency: toolParams.urgency,
                client_message: message,
                client_name: toolParams.name,
                client_phone: toolParams.phone,
                client_email: toolParams.email,
                opposing_party: toolParams.opposing_party || '',
                matter_details: toolParams.description,
                submitted: true,
                requires_payment: toolResult.data.requires_payment,
                consultation_fee: toolResult.data.consultation_fee,
                payment_link: toolResult.data.payment_link
              }
            }],
            metadata: {
              toolResult,
              sessionId,
              teamId,
              inputMessage: message,
              contextHistoryLength: conversationHistory.length,
              agentMetadata: result.metadata
            }
          };
        }
        
        // If tool was successful but didn't create a matter, return the response
        if (toolResult.success) {
          return {
            workflow: 'MATTER_CREATION',
            response: toolResult.message,
            actions: [],
            metadata: {
              toolResult,
              sessionId,
              teamId,
              inputMessage: message,
              contextHistoryLength: conversationHistory.length,
              agentMetadata: result.metadata
            }
          };
        }
        
        // If tool failed, return error response
        return {
          workflow: 'MATTER_CREATION',
          response: toolResult.message,
          actions: [],
          metadata: {
            toolResult,
            sessionId,
            teamId,
            inputMessage: message,
            contextHistoryLength: conversationHistory.length,
            agentMetadata: result.metadata
          }
        };
      }
    }
    
    // If no tool calls, return the agent's response
    return {
      workflow: 'MATTER_CREATION',
      response: result.response || "I'm here to help with your legal needs. What can I assist you with?",
      actions: [],
      metadata: {
        sessionId,
        teamId,
        inputMessage: message,
        contextHistoryLength: conversationHistory.length,
        agentMetadata: result.metadata
      }
    };
    
  } catch (error) {
    console.error('Error running legal intake agent:', error);
    
    // Fallback response
    return {
      workflow: 'MATTER_CREATION',
      response: "I'm here to help with your legal needs. What can I assist you with?",
      actions: [],
      metadata: {
        error: error.message,
        sessionId,
        teamId,
        inputMessage: message,
        contextHistoryLength: conversationHistory.length
      }
    };
  }
} 