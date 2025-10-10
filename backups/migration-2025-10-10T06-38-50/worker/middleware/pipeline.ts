import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { Env, AgentMessage } from '../types.js';

export interface PipelineMiddleware {
  name: string;
  execute: (
    messages: AgentMessage[],
    context: ConversationContext,
    teamConfig: TeamConfig,
    env: Env
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
 * Runs a conversation through a pipeline of middleware functions
 * Each middleware can update context and optionally provide a response
 * If a middleware provides a response, the pipeline stops (graceful degradation)
 */
export async function runPipeline(
  messages: AgentMessage[],
  context: ConversationContext,
  teamConfig: TeamConfig,
  middlewares: PipelineMiddleware[],
  env: Env
): Promise<PipelineResult> {
  let updatedContext = context;
  let finalResponse = "";
  const middlewareUsed: string[] = [];

  for (const middleware of middlewares) {
    try {
      const result = await middleware.execute(messages, updatedContext, teamConfig, env);
      
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
    execute: async (messages, context, teamConfig, env) => {
      // Null-safe access with defaults
      const latestMessage = messages[messages.length - 1];
      const safeMessage = latestMessage ? String(latestMessage.content || '').substring(0, 100) : '';
      const safeContext = context || {};
      const safeTeamConfig = teamConfig || {};
      
      console.log('Pipeline execution:', {
        messageCount: messages.length,
        latestMessage: safeMessage,
        context: {
          establishedMatters: context.establishedMatters || [],
          userIntent: context.userIntent || 'unclear',
          sessionId: context.sessionId || 'unknown'
        },
        teamConfig: {
          availableServices: teamConfig.availableServices || []
        }
      });
      
      return { context };
    }
  };
}
