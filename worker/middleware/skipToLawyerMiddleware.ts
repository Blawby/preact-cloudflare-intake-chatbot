import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import { LawyerSearchService } from '../services/LawyerSearchService.js';
import type { LawyerSearchResponse } from '../schemas/lawyer';
import { QuotaExceededError, LawyerSearchError, LawyerSearchTimeoutError } from '../utils/lawyerSearchErrors.js';
import { Logger } from '../utils/logger.js';
import type { Env, AgentMessage } from '../types.js';

// Matter information extracted from user message
interface MatterInfo {
  matterType: string;
  urgency: string;
  reason: string;
}

// Middleware response type
interface MiddlewareResponse {
  context: ConversationContext;
  response: string;
  shouldStop: boolean;
  metadata?: {
    action: string;
    lawyers?: LawyerSearchResponse['lawyers'];
    total?: number;
    matterType?: string;
    alternatives?: string[];
  };
}

/**
 * Skip to Lawyer Middleware - handles requests to skip intake and go directly to lawyers
 * Routes to contact form (team mode) or lawyer search (public mode)
 * Now conversation-aware: only triggers on explicit skip requests, not casual mentions
 */
export const skipToLawyerMiddleware: PipelineMiddleware = {
  name: 'skipToLawyerMiddleware',
  
  execute: async (messages: AgentMessage[], context: ConversationContext, teamConfig: TeamConfig, env: Env) => {
    // Guard against empty messages array
    if (!messages || messages.length === 0) {
      return { context };
    }

    // Build conversation text for context-aware analysis
    const conversationText = messages.map(msg => msg.content).join(' ');
    const latestMessage = messages[messages.length - 1];
    
    // Guard against missing or invalid message content
    if (!latestMessage || !latestMessage.content || typeof latestMessage.content !== 'string') {
      return { context };
    }
    
    // Check if user wants to skip intake and go directly to a lawyer
    // Only trigger on explicit requests, not casual mentions in conversation
    const skipKeywords = [
      'skip the intake',
      'skip intake',
      'go directly to a lawyer',
      'find a lawyer',
      'need a lawyer',
      'want a lawyer',
      'connect with a lawyer',
      'speak to a lawyer',
      'talk to a lawyer',
      'get a lawyer',
      'hire a lawyer',
      'lawyer now',
      'urgent lawyer',
      'immediate lawyer',
      'contact your team',
      'want to contact your team',
      'contact the team',
      'want to contact the team',
      'connect with your team',
      'speak to your team',
      'talk to your team'
    ];

    // Only check the latest message for skip requests to avoid false positives
    // from earlier conversation context
    const isSkipRequest = skipKeywords.some(keyword => 
      latestMessage.content.toLowerCase().includes(keyword.toLowerCase())
    );

    // Additional context check: if we're in the middle of a conversation about a legal issue,
    // be more conservative about triggering skip
    const hasEstablishedLegalContext = context.establishedMatters.length > 0 || 
                                     context.conversationPhase !== 'initial';
    
    if (!isSkipRequest || (hasEstablishedLegalContext && messages.length > 3)) {
      return { context };
    }

    // Determine if this is public mode or team mode based on teamId
    const isPublicMode = determineMode(context.teamId);
    
    Logger.debug('[skipToLawyerMiddleware] Team config:', {
      teamId: context.teamId,
      isPublicMode,
      messageCount: messages.length,
      hasEstablishedLegalContext
    });
    
    // Extract matter type and urgency from conversation context
    const matterInfo = extractMatterInfo(conversationText);

    if (isPublicMode) {
      // Public mode: Trigger lawyer search
      return await handlePublicMode(matterInfo, context, env);
    } else {
      // Team mode: Show contact form
      return handleTeamMode(matterInfo, context);
    }
  }
};

/**
 * Determine if this is public mode or team mode
 */
function determineMode(teamId: string | null | undefined): boolean {
  // Public mode: no team ID, or specific public teams
  if (!teamId) {
    return true;
  }

  // Check if this is a public team (like blawby-ai)
  const publicTeams = ['blawby-ai'];
  if (publicTeams.includes(teamId)) {
    return true;
  }

  // Team mode: specific law firm teams
  return false;
}

/**
 * Extract matter type and urgency from message
 */
function extractMatterInfo(message: string): MatterInfo {
  const matterTypes = [
    'family law', 'employment law', 'business law', 'contract review',
    'intellectual property', 'personal injury', 'criminal law', 'civil law',
    'real estate', 'estate planning', 'immigration', 'bankruptcy'
  ];

  const matterType = matterTypes.find(type => 
    message.toLowerCase().includes(type.toLowerCase())
  ) || 'General Consultation';

  let urgency = 'medium';
  if (message.toLowerCase().includes('urgent') || message.toLowerCase().includes('emergency') || 
      message.toLowerCase().includes('immediate') || message.toLowerCase().includes('asap')) {
    urgency = 'high';
  } else if (message.toLowerCase().includes('not urgent') || message.toLowerCase().includes('routine')) {
    urgency = 'low';
  }

  const reason = message.length > 100 ? message.substring(0, 100) + '...' : message;

  return { matterType, urgency, reason };
}

/**
 * Handle public mode - trigger lawyer search
 */
async function handlePublicMode(matterInfo: MatterInfo, context: ConversationContext, env: Env): Promise<MiddlewareResponse> {
  try {
    Logger.debug('[skipToLawyerMiddleware] Attempting lawyer search for:', matterInfo);
    
    // Check if we have the API key
    if (!env.LAWYER_SEARCH_API_KEY) {
      Logger.warn('[skipToLawyerMiddleware] No lawyer search API key available');
      return handleQuotaExceededFallback(matterInfo, context, 'Our lawyer search service is temporarily unavailable.');
    }

    // Attempt to search for lawyers
    const searchResult = await LawyerSearchService.searchLawyersByMatterType(
      matterInfo.matterType,
      env.LAWYER_SEARCH_API_KEY,
      undefined // location - could be extracted from context if available
    );

    Logger.info('[skipToLawyerMiddleware] Lawyer search successful:', {
      lawyersFound: searchResult.lawyers.length,
      total: searchResult.total
    });

    const lawyerSummaries = searchResult.lawyers.slice(0, 3).map((lawyer, index) => {
      const parts = [
        `${index + 1}. ${lawyer.name}${lawyer.firm ? ` (${lawyer.firm})` : ''}`,
        lawyer.location ? `   • ${lawyer.location}` : null,
        lawyer.phone ? `   • ${lawyer.phone}` : null,
        lawyer.email ? `   • ${lawyer.email}` : null
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n');

    const response = `I found ${searchResult.total} ${matterInfo.matterType} lawyers who match what you're looking for.${lawyerSummaries ? `\n\nTop matches:\n${lawyerSummaries}` : ''}\n\nReach out to any of them directly, or tell me if you want help organizing your case summary and documents before you call.`;

    // Update context with lawyer search results
    const updatedContext = {
      ...context,
      lawyerSearchResults: {
        matterType: matterInfo.matterType,
        lawyers: searchResult.lawyers,
        total: searchResult.total
      },
      lastUpdated: Date.now()
    };

    return {
      context: updatedContext,
      response,
      shouldStop: true,
      metadata: {
        action: 'lawyer_search_success',
        lawyers: searchResult.lawyers,
        total: searchResult.total
      }
    };

  } catch (error) {
    Logger.error('[skipToLawyerMiddleware] Lawyer search failed:', error);
    
    // Handle quota exceeded with friendly case preparation pivot
    if (error instanceof QuotaExceededError) {
      return handleQuotaExceededFallback(matterInfo, context, error.message);
    }
    
    // Handle other lawyer search errors
    if (error instanceof LawyerSearchError || error instanceof LawyerSearchTimeoutError) {
      return handleQuotaExceededFallback(matterInfo, context, error.message);
    }
    
    // Handle any other errors
    return handleQuotaExceededFallback(matterInfo, context, 'We\'re having trouble connecting to our lawyer search service right now.');
  }
}

/**
 * Handle quota exceeded or other errors by pivoting to case preparation
 */

function handleQuotaExceededFallback(matterInfo: MatterInfo, context: ConversationContext, errorMessage: string): MiddlewareResponse {
  const response = `${errorMessage}\n\nLet's get you ready for the next lawyer you contact: share the key facts and I'll build a clean case summary, checklist, and PDF you can hand to anyone.`;

  return {
    context,
    response,
    shouldStop: true,
    metadata: {
      action: 'quota_exceeded_fallback',
      matterType: matterInfo.matterType,
      alternatives: ['bar_association', 'online_directories', 'case_preparation']
    }
  };
}

/**
 * Handle team mode - show contact form
 */
function handleTeamMode(matterInfo: MatterInfo, context: ConversationContext): MiddlewareResponse {
  // Check if location is required but not provided
  const _needsLocation = context.safetyFlags?.includes('location_required');
  
  // Instead of returning a text response, set a flag in context to trigger contact form
  const updatedContext = {
    ...context,
    userIntent: 'lawyer_contact' as const,
    conversationPhase: 'contact_collection' as const,
    // Store the matter info for the AI agent to use
    establishedMatters: [matterInfo.matterType],
    pendingContactForm: {
      matterType: matterInfo.matterType,
      urgency: matterInfo.urgency,
      reason: matterInfo.reason
    },
    lastUpdated: Date.now()
  };

  // Return context without stopping - let AI agent handle the contact form
  return {
    context: updatedContext,
    response: '', // Empty response since AI agent will handle the contact form
    shouldStop: false
  };
}
