import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { runLegalIntakeAgent, runLegalIntakeAgentStream } from '../agents/legalIntakeAgent';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { validateInput, getSecurityResponse } from '../middleware/inputValidation.js';
import { SecurityLogger } from '../utils/securityLogger.js';
import { getCloudflareLocation, isCloudflareLocationSupported, getLocationDescription } from '../utils/cloudflareLocationValidator.js';

export async function handleAgent(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  try {
    const body = await request.json(); // Read body once here
    const { messages, teamId, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw HttpErrors.badRequest('No message content provided');
    }
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.content) {
      throw HttpErrors.badRequest('No message content provided');
    }

    // Get team configuration for security validation
    let teamConfig = null;
    if (teamId) {
      try {
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const rawTeamConfig = await aiService.getTeamConfig(teamId);
        // Extract the config object for security validation
        teamConfig = rawTeamConfig?.config || rawTeamConfig;
      } catch (error) {
        console.warn('Failed to get team config for security validation:', error);
      }
    }

    // Get Cloudflare location data
    const cloudflareLocation = getCloudflareLocation(request);
    console.log('Cloudflare location data:', cloudflareLocation);

    // Security validation with Cloudflare location
    const validation = await validateInput(body, teamConfig, cloudflareLocation);
    if (!validation.isValid) {
      SecurityLogger.logInputValidation(validation, latestMessage.content, teamId);
      
      const securityResponse = getSecurityResponse(validation.violations || [], teamConfig);
      
      return createSuccessResponse({
        response: securityResponse,
        workflow: 'SECURITY_BLOCK',
        actions: [],
        metadata: { 
          securityBlock: true, 
          reason: validation.reason,
          violations: validation.violations,
          cloudflareLocation: cloudflareLocation.isValid ? getLocationDescription(cloudflareLocation) : 'Unknown'
        },
        sessionId
      }, corsHeaders);
    }

    // Run the legal intake agent directly
    const agentResponse = await runLegalIntakeAgent(env, messages, teamId, sessionId, cloudflareLocation);
    return createSuccessResponse(agentResponse, corsHeaders);
  } catch (error) {
    return handleError(error, corsHeaders);
  }
}

// New streaming endpoint for real-time AI responses
export async function handleAgentStream(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  console.log('🚀 Streaming endpoint called!');
  
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  // Set SSE headers for streaming
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'] || '*',
    'Access-Control-Allow-Methods': corsHeaders['Access-Control-Allow-Methods'] || 'POST, OPTIONS',
    'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'] || 'Content-Type',
  };

  try {
    const body = await request.json();
    console.log('📥 Request body:', body);
    
    const { messages, teamId, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw HttpErrors.badRequest('No message content provided');
    }
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.content) {
      throw HttpErrors.badRequest('No message content provided');
    }

    // Get team configuration for security validation
    let teamConfig = null;
    if (teamId) {
      try {
        const { AIService } = await import('../services/AIService.js');
        const aiService = new AIService(env.AI, env);
        const rawTeamConfig = await aiService.getTeamConfig(teamId);
        teamConfig = rawTeamConfig?.config || rawTeamConfig;
      } catch (error) {
        console.warn('Failed to get team config for security validation:', error);
      }
    }

    // Security validation
    const validation = await validateInput(body, teamConfig);
    if (!validation.isValid) {
      SecurityLogger.logInputValidation(validation, latestMessage.content, teamId);
      
      const securityResponse = getSecurityResponse(validation.violations || [], teamConfig);
      
      // Send security block as a single SSE event
      const securityEvent = `data: ${JSON.stringify({
        type: 'security_block',
        response: securityResponse,
        reason: validation.reason,
        violations: validation.violations
      })}\n\n`;
      
      return new Response(securityEvent, { headers });
    }

    console.log('✅ Security validation passed, creating stream...');

    // Create streaming response using ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🔄 Starting streaming agent...');
          
          // Send initial connection event
          controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
          
          // Run streaming agent
          console.log('📞 Calling runLegalIntakeAgentStream...');
          await runLegalIntakeAgentStream(env, messages, teamId, sessionId, controller);
          
          // Send completion event
          controller.enqueue(new TextEncoder().encode('data: {"type":"complete"}\n\n'));
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'An error occurred while processing your request'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
        }
      }
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error('❌ Route error:', error);
    const errorEvent = `data: ${JSON.stringify({
      type: 'error',
      message: error.message || 'An error occurred'
    })}\n\n`;
    return new Response(errorEvent, { headers });
  }
} 