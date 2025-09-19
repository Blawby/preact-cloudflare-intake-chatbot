import { CasePreparationFlow, CasePreparationStage, CasePreparationContext, CaseInformation } from './casePreparationFlow.js';

// Streaming conversational paralegal agent
export async function runParalegalAgentStream(
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
    const { AIService } = await import('../../services/AIService');
    const aiService = new AIService(env.AI, env);
    teamConfig = await aiService.getTeamConfig(teamId);
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map((msg: any) => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Build conversation text for case preparation
  const conversationText = formattedMessages.map(msg => msg.content).join(' ');
  
  // Extract case information from conversation using enhanced basic patterns
  const extractedInfo = CasePreparationFlow.extractCaseInformation(conversationText, env);
  
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
    console.log('🔄 Starting paralegal case preparation agent...');
    console.log('📥 Messages received:', JSON.stringify(formattedMessages, null, 2));
    console.log('🎯 Current stage:', currentStage);
    console.log('📋 Case information:', JSON.stringify(context.information, null, 2));
    
    // Send initial connection event
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use rule-based response for case preparation
    const response = ruleBasedResponse;
    console.log('📝 Paralegal response:', response);
    
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