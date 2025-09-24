import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';

export interface PipelineMiddleware {
  name: string;
  execute: (
    message: string,
    context: ConversationContext,
    teamConfig: TeamConfig
  ) => Promise<{ 
    context: ConversationContext; 
    response?: string;
    shouldStop?: boolean;
  }>;
}

export interface PipelineResult {
  context: ConversationContext;
  response: string;
  middlewareUsed: string[];
}

/**
 * Runs a message through a pipeline of middleware functions
 * Each middleware can update context and optionally provide a response
 * If a middleware provides a response, the pipeline stops (graceful degradation)
 */
export async function runPipeline(
  message: string,
  context: ConversationContext,
  teamConfig: TeamConfig,
  middlewares: PipelineMiddleware[]
): Promise<PipelineResult> {
  let updatedContext = context;
  let finalResponse = "";
  const middlewareUsed: string[] = [];

  for (const middleware of middlewares) {
    try {
      const result = await middleware.execute(message, updatedContext, teamConfig);
      
      // Update context from this middleware
      updatedContext = result.context;
      middlewareUsed.push(middleware.name);
      
      // If middleware provides a response, use it and stop pipeline
      if (result.response) {
        finalResponse = result.response;
        break;
      }
      
      // If middleware says to stop, break the pipeline
      if (result.shouldStop) {
        break;
      }
      
    } catch (error) {
      console.error(`Pipeline middleware ${middleware.name} failed:`, error);
      // Continue to next middleware on error
      continue;
    }
  }

  // If no middleware provided a response, we'll let the AI handle it
  if (!finalResponse) {
    finalResponse = "AI_HANDLE"; // Signal to route handler to use AI
  }

  return {
    context: updatedContext,
    response: finalResponse,
    middlewareUsed
  };
}

/**
 * Creates a middleware that logs pipeline execution
 */
export function createLoggingMiddleware(): PipelineMiddleware {
  return {
    name: 'logging',
    execute: async (message, context, teamConfig) => {
      // Null-safe access with defaults
      const safeMessage = String(message || '').substring(0, 100);
      const safeContext = context || {};
      const safeTeamConfig = teamConfig || {};
      
      console.log('Pipeline execution:', {
        message: safeMessage,
        context: {
          establishedMatters: safeContext.establishedMatters || [],
          userIntent: safeContext.userIntent || 'unclear',
          sessionId: safeContext.sessionId || 'unknown'
        },
        teamConfig: {
          availableServices: safeTeamConfig.availableServices || []
        }
      });
      
      return { context: safeContext };
    }
  };
}
