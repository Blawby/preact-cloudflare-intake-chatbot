import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import { LawyerSearchService, type LawyerSearchResponse } from '../services/LawyerSearchService.js';
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

    const response = `I found ${searchResult.total} qualified ${matterInfo.matterType} lawyers in your area! Here are the top matches:\n\n**Available Lawyers:**\n${searchResult.lawyers.slice(0, 5).map((lawyer, index) => 
      `${index + 1}. **${lawyer.name}**${lawyer.firm ? ` (${lawyer.firm})` : ''}\n   📍 ${lawyer.location}\n   ⭐ ${lawyer.rating ? `${lawyer.rating}/5` : 'No rating'}${lawyer.phone ? `\n   📞 ${lawyer.phone}` : ''}${lawyer.email ? `\n   ✉️ ${lawyer.email}` : ''}`
    ).join('\n\n')}\n\n**Next Steps:**\n• Contact any of these lawyers directly\n• Ask about consultation fees and availability\n• Schedule a consultation to discuss your case\n\nWould you like me to help you prepare your case information before meeting with a lawyer?`;

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
  const response = `${errorMessage}\n\n**But don't worry!** I can help you in an even better way. Let me help you:\n\n📋 **Prepare Your Case Completely**\n• Organize all your facts and timeline\n• Create a professional case summary\n• Generate a PDF you can share with any qualified lawyer\n• Build a document checklist\n\n💡 **Why This Is Actually Better:**\n• You'll be prepared for any lawyer consultation\n• You can shop around with confidence\n• You'll save time and money in consultations\n• You'll look professional and organized\n\n🔍 **Finding Qualified Lawyers:**\n• Contact your local bar association\n• Use online directories like Avvo or Justia\n• Ask for referrals from friends/family\n• Check with legal aid organizations\n\n**Would you like me to help you build a comprehensive case summary that you can use with any qualified lawyer you find?**\n\nJust tell me about your ${matterInfo.matterType} situation and I'll help you organize everything into a professional case file.`;

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
    shouldStop: false
  };
}
