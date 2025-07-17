import { Env } from './health';
import { parseJsonBody, logChatMessage } from '../utils';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  teamId?: string;
  sessionId?: string;
}

export async function handleChat(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as ChatRequest;
    
    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get team config using cached service
    const { AIService } = await import('../services/AIService.js');
    const aiService = new AIService(env.AI, env);
    const teamConfig = body.teamId ? await aiService.getTeamConfig(body.teamId) : {};

    // Generate AI response with optimized prompt
    const systemPrompt = teamConfig 
      ? `You are a warm, empathetic legal assistant helping people through difficult legal situations. Be conversational, supportive, and understanding. Use natural language and gentle transitions. Acknowledge that legal issues can be stressful. Help users feel heard and supported while organizing their legal matters. ${teamConfig.requiresPayment ? `We do have a consultation fee of $${teamConfig.consultationFee}, but we'll make sure you're prepared before connecting you with an attorney.` : 'We offer free consultations to help you understand your options.'}`
      : 'You are a warm, empathetic legal assistant helping people through difficult legal situations. Be conversational, supportive, and understanding. Use natural language and gentle transitions. Acknowledge that legal issues can be stressful.';

    const aiResult = await aiService.runLLM([
      { role: 'system', content: systemPrompt },
      ...body.messages.slice(-3) // Keep last 3 messages for context
    ]);

    const response = aiResult.response || "I'm here to help with your legal needs. What can I assist you with?";
    
    // Log chat messages to database for AI training
    if (body.sessionId) {
      // Log user messages (only the most recent one to avoid duplicates)
      const lastUserMessage = body.messages[body.messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        await logChatMessage(env, body.sessionId, body.teamId, 'user', lastUserMessage.content);
      }
      
      // Log assistant response
      await logChatMessage(env, body.sessionId, body.teamId, 'assistant', response);
    }
    
    // Save conversation to session if sessionId provided - optimized with structured data
    if (body.sessionId) {
      try {
        const sessionData = {
          teamId: body.teamId,
          messages: [...body.messages, { role: 'assistant', content: response }],
          lastActivity: new Date().toISOString(),
          intent: 'general',
          shouldStartMatterCreation: false
        };

        await env.CHAT_SESSIONS.put(body.sessionId, JSON.stringify(sessionData), {
          expirationTtl: 24 * 60 * 60 // 24 hours
        });
      } catch (error) {
        console.warn('Failed to save session:', error);
      }
    }

    return new Response(JSON.stringify({
      response,
      intent: 'general',
      shouldStartMatterCreation: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Chat service unavailable' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} 