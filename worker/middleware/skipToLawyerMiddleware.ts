import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import { LawyerSearchService } from '../services/LawyerSearchService.js';
import { QuotaExceededError, LawyerSearchError, LawyerSearchTimeoutError } from '../utils/lawyerSearchErrors.js';
import { Logger } from '../utils/logger.js';
import type { Env } from '../types.js';

/**
 * Skip to Lawyer Middleware - handles requests to skip intake and go directly to lawyers
 * Routes to contact form (team mode) or lawyer search (public mode)
 */
export const skipToLawyerMiddleware: PipelineMiddleware = {
  name: 'skipToLawyerMiddleware',
  
  execute: async (message: string, context: ConversationContext, teamConfig: TeamConfig, env: Env) => {
    // Check if user wants to skip intake and go directly to a lawyer
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
      'immediate lawyer'
    ];

    const isSkipRequest = skipKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!isSkipRequest) {
      return { context };
    }

    // Determine if this is public mode or team mode
    const isPublicMode = determineMode(teamConfig);
    
    Logger.debug('[skipToLawyerMiddleware] Team config:', {
      teamId: teamConfig?.id,
      slug: teamConfig?.slug,
      name: teamConfig?.name,
      isPublicMode
    });
    
    // Extract matter type and urgency from message
    const matterInfo = extractMatterInfo(message);

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
function determineMode(teamConfig: TeamConfig | null): boolean {
  // Public mode: no team config, or specific public teams
  if (!teamConfig || !teamConfig.id) {
    return true;
  }

  // Check if this is a public team (like blawby-ai)
  const publicTeams = ['blawby-ai'];
  if (publicTeams.includes(teamConfig.slug || '')) {
    return true;
  }

  // Team mode: specific law firm teams
  return false;
}

/**
 * Extract matter type and urgency from message
 */
function extractMatterInfo(message: string): {
  matterType: string;
  urgency: string;
  reason: string;
} {
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
async function handlePublicMode(matterInfo: any, context: ConversationContext, env: Env): Promise<{
  context: ConversationContext;
  response: string;
  shouldStop: boolean;
  metadata?: any;
}> {
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
      undefined, // location - could be extracted from context if available
      env.LAWYER_SEARCH_API_KEY
    );

    Logger.info('[skipToLawyerMiddleware] Lawyer search successful:', {
      lawyersFound: searchResult.lawyers.length,
      total: searchResult.total
    });

    const response = `I found ${searchResult.total} qualified ${matterInfo.matterType} lawyers in your area! Here are the top matches:\n\n**Available Lawyers:**\n${searchResult.lawyers.slice(0, 5).map((lawyer, index) => 
      `${index + 1}. **${lawyer.name}**${lawyer.firm ? ` (${lawyer.firm})` : ''}\n   📍 ${lawyer.location}\n   ⭐ ${lawyer.rating ? `${lawyer.rating}/5` : 'No rating'}${lawyer.phone ? `\n   📞 ${lawyer.phone}` : ''}${lawyer.email ? `\n   ✉️ ${lawyer.email}` : ''}`
    ).join('\n\n')}\n\n**Next Steps:**\n• Contact any of these lawyers directly\n• Ask about consultation fees and availability\n• Schedule a consultation to discuss your case\n\nWould you like me to help you prepare your case information before meeting with a lawyer?`;

    return {
      context,
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
function handleQuotaExceededFallback(matterInfo: any, context: ConversationContext, errorMessage: string): {
  context: ConversationContext;
  response: string;
  shouldStop: boolean;
  metadata?: any;
} {
  const response = `${errorMessage}\n\n**But don't worry!** I can help you in an even better way. Let me help you:\n\n📋 **Prepare Your Case Completely**\n• Organize all your facts and timeline\n• Create a professional case summary\n• Generate a PDF you can share with any lawyer\n• Build a document checklist\n\n💡 **Why This Is Actually Better:**\n• You'll be prepared for any lawyer consultation\n• You can shop around with confidence\n• You'll save time and money in consultations\n• You'll look professional and organized\n\n🔍 **Finding Lawyers:**\n• Contact your local bar association\n• Use online directories like Avvo or Justia\n• Ask for referrals from friends/family\n• Check with legal aid organizations\n\n**Would you like me to help you build a comprehensive case summary that you can use with any lawyer you find?**\n\nJust tell me about your ${matterInfo.matterType} situation and I'll help you organize everything into a professional case file.`;

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
function handleTeamMode(matterInfo: any, context: ConversationContext): {
  context: ConversationContext;
  response: string;
  shouldStop: boolean;
} {
  const response = `I understand you want to skip the intake process and connect directly with our legal team. ${matterInfo.reason}. I'll show you our contact form so we can get in touch with you right away.\n\n**Contact Information Required:**\n• Full Name\n• Email Address\n• Phone Number\n• Location (City, State)\n• Brief description of your ${matterInfo.matterType} matter\n\n**What happens next:**\n• Our team will review your information\n• A qualified attorney will contact you within 24 hours\n• We'll schedule a consultation to discuss your case\n• You'll receive personalized legal guidance\n\nPlease fill out the contact form below and we'll connect you with the right attorney for your ${matterInfo.matterType} needs.`;

  return {
    context,
    response,
    shouldStop: true
  };
}
