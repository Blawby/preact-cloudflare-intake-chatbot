import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';

/**
 * Business Scope Validator - handles service availability and scope validation
 * This is where we check if the team offers the services the user needs
 */
export const businessScopeValidator: PipelineMiddleware = {
  name: 'businessScopeValidator',
  
  execute: async (message: string, context: ConversationContext, teamConfig: TeamConfig) => {
    const availableServices = teamConfig?.availableServices || [];
    
    // If team offers General Consultation, allow most requests
    if (availableServices.includes('General Consultation')) {
      return { context };
    }

    // Check if we have established legal context that matches available services
    if (context.establishedMatters.length > 0) {
      const hasRelevantService = context.establishedMatters.some(matter => 
        availableServices.includes(matter)
      );

      if (hasRelevantService) {
        // User is asking about a service the team offers - allow
        return { context };
      }
    }

    // Check current message for legal matter types
    const currentMessageMatters = extractLegalMatterTypes(message);
    
    if (currentMessageMatters.length > 0) {
      const hasRelevantService = currentMessageMatters.some(matter => 
        availableServices.includes(matter)
      );

      if (hasRelevantService) {
        // Current message is about a service the team offers - allow
        return { context };
      }

      // Current message is about a service the team doesn't offer
      const unavailableMatters = currentMessageMatters.filter(matter => 
        !availableServices.includes(matter)
      );

      if (unavailableMatters.length > 0) {
        const response = getScopeViolationResponse(unavailableMatters, availableServices, teamConfig);
        
        return {
          context,
          response,
          shouldStop: true
        };
      }
    }

    // Check for general legal requests when no specific matter is established
    if (isGeneralLegalRequest(message) && context.establishedMatters.length === 0) {
      const response = getGeneralLegalResponse(availableServices, teamConfig);
      
      return {
        context,
        response,
        shouldStop: true
      };
    }

    // No scope violations - continue pipeline
    return { context };
  }
};

/**
 * Extract legal matter types from message content
 */
function extractLegalMatterTypes(content: string): string[] {
  const legalMatterPatterns = {
    'Family Law': /(divorce|custody|child support|family dispute|marriage|paternity|alimony)/i,
    'Employment Law': /(employment|workplace|termination|discrimination|harassment|wage|overtime|fired|laid off)/i,
    'Business Law': /(business|contract|corporate|company|startup|partnership|LLC|corporation)/i,
    'Intellectual Property': /(patent|trademark|copyright|intellectual property|IP|trade secret)/i,
    'Personal Injury': /(accident|injury|personal injury|damage|liability|negligence|car crash|slip and fall)/i,
    'Criminal Law': /(criminal|arrest|charges|trial|violation|felony|misdemeanor|DUI|theft)/i,
    'Civil Law': /(civil|dispute|contract|property|tort|lawsuit)/i,
    'Tenant Rights Law': /(tenant|landlord|rental|eviction|housing|lease|rent)/i,
    'Probate and Estate Planning': /(estate|probate|inheritance|will|trust|power of attorney)/i,
    'Special Education and IEP Advocacy': /(special education|IEP|disability|accommodation|504 plan)/i,
    'Small Business and Nonprofits': /(small business|nonprofit|non-profit|entrepreneur|startup)/i,
    'Contract Review': /(contract|agreement|terms|clause|legal document)/i,
    'Immigration Law': /(immigration|visa|green card|citizenship|deportation|asylum|refugee|naturalization|work permit)/i,
    'General Consultation': /(legal question|legal help|legal advice|consultation|lawyer|attorney|legal situation|legal matter|legal issue)/i
  };

  const foundMatters: string[] = [];
  for (const [matterType, pattern] of Object.entries(legalMatterPatterns)) {
    if (pattern.test(content)) {
      foundMatters.push(matterType);
    }
  }

  return foundMatters;
}

/**
 * Check if message is a general legal request
 */
function isGeneralLegalRequest(message: string): boolean {
  const generalLegalPatterns = [
    /(legal question|legal help|legal advice|consultation|lawyer|attorney|legal situation|legal matter|legal issue)/i,
    /(need a lawyer|want a lawyer|talk to a lawyer|speak with attorney|hire an attorney)/i,
    /(legal problem|legal issue|legal situation)/i
  ];

  return generalLegalPatterns.some(pattern => pattern.test(message));
}

/**
 * Get response for scope violations
 */
function getScopeViolationResponse(
  unavailableMatters: string[], 
  availableServices: string[], 
  teamConfig: TeamConfig
): string {
  const teamName = teamConfig?.name || 'our legal team';
  const matterList = unavailableMatters.join(', ');
  const availableList = availableServices.join(', ');

  return `I understand you're dealing with a ${matterList} matter. While ${teamName} specializes in ${availableList}, I'd be happy to help you find a lawyer who specializes in ${matterList}. 

Would you like me to:
1. Help you with a different legal matter that we do handle?
2. Provide you with resources to find a ${matterList} attorney?
3. Answer general questions about ${matterList}?`;
}

/**
 * Get response for general legal requests when team doesn't offer General Consultation
 */
function getGeneralLegalResponse(availableServices: string[], teamConfig: TeamConfig): string {
  const teamName = teamConfig?.name || 'our legal team';
  const availableList = availableServices.join(', ');

  return `I'd be happy to help you with your legal needs! ${teamName} specializes in ${availableList}.

To better assist you, could you tell me:
1. What type of legal issue are you dealing with?
2. What specific help do you need?

This will help me determine if we can assist you directly or connect you with the right resources.`;
}

/**
 * Get referral response for out-of-scope matters
 */
function getReferralResponse(matterType: string, teamConfig: TeamConfig): string {
  const teamName = teamConfig?.name || 'our legal team';
  
  return `While ${teamName} doesn't handle ${matterType} matters, I can help you find a qualified attorney who specializes in this area. 

Here are some resources:
- State Bar Association referral services
- Legal aid organizations
- Specialized attorney directories

Would you like me to provide more specific guidance on finding a ${matterType} attorney?`;
}
