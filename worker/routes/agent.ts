import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { runLegalIntakeAgent } from '../agents/legalIntakeAgent';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

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