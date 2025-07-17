import type { Env } from '../types';
import { parseJsonBody, logChatMessage } from '../utils';
import { chatRequestSchema } from '../schemas';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleChat(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      throw HttpErrors.methodNotAllowed('Only POST method is allowed');
    }
    const body = await parseJsonBody(request);
    const validatedData = chatRequestSchema.parse(body);

    // Get team config using cached service
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = validatedData.teamId ? await aiService.getTeamConfig(validatedData.teamId) : {};

    // Generate AI response with optimized prompt
    const systemPrompt = teamConfig 
      ? `You are a warm, empathetic legal assistant helping people through difficult legal situations. Be conversational, supportive, and understanding. Use natural language and gentle transitions. Acknowledge that legal issues can be stressful. Help users feel heard and supported while organizing their legal matters. ${teamConfig.requiresPayment ? `We do have a consultation fee of $${teamConfig.consultationFee}, but we'll make sure you're prepared before connecting you with an attorney.` : 'We offer free consultations to help you understand your options.'}`
      : 'You are a warm, empathetic legal assistant helping people through difficult legal situations. Be conversational, supportive, and understanding. Use natural language and gentle transitions. Acknowledge that legal issues can be stressful.';

    const aiResult = await aiService.runLLM([
      { role: 'system', content: systemPrompt },
      ...validatedData.messages.slice(-3) // Keep last 3 messages for context
    ]);

    const response = aiResult.response || "I'm here to help with your legal needs. What can I assist you with?";
    
    // Log chat messages to database for AI training
    if (validatedData.sessionId) {
      // Log user messages (only the most recent one to avoid duplicates)
      const lastUserMessage = validatedData.messages[validatedData.messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        await logChatMessage(env, validatedData.sessionId, validatedData.teamId, 'user', lastUserMessage.content);
      }
      
      // Log assistant response
      await logChatMessage(env, validatedData.sessionId, validatedData.teamId, 'assistant', response);
    }
    
    // Save conversation to session if sessionId provided - optimized with structured data
    if (validatedData.sessionId) {
      try {
        const sessionData = {
          teamId: validatedData.teamId,
          messages: [...validatedData.messages, { role: 'assistant', content: response }],
          lastActivity: new Date().toISOString(),
          intent: 'general',
          shouldStartMatterCreation: false
        };

        await env.CHAT_SESSIONS.put(validatedData.sessionId, JSON.stringify(sessionData), {
          expirationTtl: 24 * 60 * 60 // 24 hours
        });
      } catch (error) {
        console.warn('Failed to save session:', error);
      }
    }

    return createSuccessResponse({
      response,
      intent: 'general',
      shouldStartMatterCreation: false,
      timestamp: new Date().toISOString()
    }, corsHeaders);

  } catch (error) {
    return handleError(error, corsHeaders);
  }
} 