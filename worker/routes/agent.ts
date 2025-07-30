import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { runLegalIntakeAgent } from '../agents/legalIntakeAgent';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { validateInput, getSecurityResponse } from '../middleware/inputValidation.js';
import { SecurityLogger } from '../utils/securityLogger.js';

export async function handleAgent(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  try {
    const body = await parseJsonBody(request);
    const { messages, teamId, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      throw HttpErrors.badRequest('Messages array is required');
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || !latestMessage.content) {
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

    // Security validation
    const validation = await validateInput(body, teamConfig);
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
          violations: validation.violations 
        },
        sessionId
      }, corsHeaders);
    }

    // Run the legal intake agent directly
    const result = await runLegalIntakeAgent(env, messages, teamId, sessionId);

    // Handle tool calls if any
    if (result.toolCalls?.length) {
      // Tool execution is now handled within the agent
      // Return the result with the tool call information in the expected format
      return createSuccessResponse({
        response: result.response,
        workflow: 'MATTER_CREATION',
        actions: result.toolCalls.map(toolCall => ({
          name: toolCall.name,
          parameters: toolCall.parameters
        })),
        metadata: result.metadata || {},
        sessionId,
        // Add backward compatibility properties
        success: true,
        data: {
          response: result.response,
          toolCalls: result.toolCalls,
          metadata: result.metadata
        }
      }, corsHeaders);
    }

    // Return the agent's response with backward compatibility
    return createSuccessResponse({
      response: result.response,
      workflow: 'MATTER_CREATION',
      actions: [],
      metadata: result.metadata || {},
      sessionId,
      // Add backward compatibility properties
      success: true,
      data: {
        response: result.response,
        metadata: result.metadata
      }
    }, corsHeaders);

  } catch (error) {
    return handleError(error, corsHeaders);
  }
} 