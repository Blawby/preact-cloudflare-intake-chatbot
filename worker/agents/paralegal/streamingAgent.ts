import { CasePreparationFlow, CasePreparationStage, CasePreparationContext, CaseInformation } from './casePreparationFlow.js';
import { Env } from '../../types.js';
import { TeamConfig } from '../../services/TeamService.js';
import { Logger } from '../../utils/logger.js';

// Message interface for type safety
interface Message {
  isUser: boolean;
  content: string;
}

// Streaming conversational paralegal agent
export async function runParalegalAgentStream(
  env: Env, 
  messages: Message[], 
  teamId?: string, 
  controller?: ReadableStreamDefaultController
) {
  // Get team configuration if teamId is provided
  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map((msg: Message) => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Build conversation text for case preparation
  const conversationText = formattedMessages.map(msg => msg.content).join(' ');
  
  // Extract case information from conversation using enhanced basic patterns
  const extractedInfo = await CasePreparationFlow.extractCaseInformation(conversationText, env);
  
  // Create case preparation context
  const context: CasePreparationContext = {
    stage: CasePreparationStage.INITIAL,
    information: {
      keyFacts: [],
      timeline: [],
      evidence: [],
      witnesses: [],
      communications: [],
      legalIssues: [],
      damages: [],
      ...extractedInfo
    },
    conversationHistory: conversationText
  };

  // Determine current stage
  const currentStage = CasePreparationFlow.getCurrentStage(context);
  context.stage = currentStage;

  // Get rule-based response for the current stage
  const ruleBasedResponse = CasePreparationFlow.getResponseForStage(currentStage, context);

  // If we're ready to generate a case summary, do it
  if (currentStage === CasePreparationStage.CASE_READY || currentStage === CasePreparationStage.GENERATING_SUMMARY) {
    const caseSummary = CasePreparationFlow.generateCaseSummary(context.information);
    context.information.caseSummary = caseSummary;
  }

  try {
    Logger.debug('🔄 Starting paralegal case preparation agent...');
    Logger.debug('🎯 Current stage:', currentStage);
    // Avoid logging sensitive information like messages and case details
    
    // Send initial connection event
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use rule-based response for case preparation
    const response = ruleBasedResponse;
    Logger.debug('📝 Paralegal response generated');
    
    if (controller) {
      // Stream the response word by word
      const chunks = response.split(' ');
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLastChunk = i === chunks.length - 1;
        const separator = isLastChunk ? '' : ' ';
        const textContent = `${chunk}${separator}`;
        const eventData = {
          type: 'text',
          text: textContent
        };
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(eventData)}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for streaming effect
      }
      
      // Send final response with case summary if available
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: response,
        workflow: 'PARALEGAL_AGENT',
        stage: currentStage,
        caseSummary: context.information.caseSummary
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      
      // Close the stream after sending final event
      controller.close();
    }
    
    return { 
      response, 
      workflow: 'PARALEGAL_AGENT',
      stage: currentStage,
      caseSummary: context.information.caseSummary
    };
  } catch (error) {
    console.error('❌ Paralegal streaming error:', error);
    
    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: error.message || 'An error occurred'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
    }
    
    throw error;
  }
}