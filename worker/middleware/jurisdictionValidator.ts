import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';
import { JurisdictionValidator as JurisdictionValidatorUtil, type JurisdictionConfig } from '../schemas/jurisdictionConfig.js';

/**
 * Jurisdiction Validator - handles geographic scope validation
 * This provides warnings for out-of-jurisdiction users but doesn't block them
 */
export const jurisdictionValidator: PipelineMiddleware = {
  name: 'jurisdictionValidator',
  
  execute: async (message: string, context: ConversationContext, teamConfig: TeamConfig) => {
    const jurisdiction = teamConfig?.jurisdiction as JurisdictionConfig | undefined;
    
    // If no jurisdiction restrictions, allow all
    if (!jurisdiction) {
      return { context };
    }

    // Validate jurisdiction configuration
    const validation = JurisdictionValidatorUtil.validateConfig(jurisdiction);
    if (!validation.isValid) {
      console.warn('Invalid jurisdiction configuration:', validation.errors);
      return { context }; // Bypass if config is invalid
    }

    // Check if user is in supported jurisdiction
    const userLocation = context.jurisdiction || extractLocationFromMessage(message);
    
    if (userLocation) {
      const isSupported = JurisdictionValidatorUtil.isLocationSupported(userLocation, jurisdiction);
      
      if (!isSupported) {
        // User is outside jurisdiction - provide warning but don't block
        const warning = JurisdictionValidatorUtil.getJurisdictionWarning(
          userLocation, 
          jurisdiction, 
          teamConfig.name || 'our legal team'
        );
        
        // Update context with jurisdiction warning
        const updatedContext = {
          ...context,
          jurisdiction: userLocation,
          safetyFlags: [...context.safetyFlags, 'out_of_jurisdiction']
        };

        // Return warning response but continue pipeline
        return {
          context: updatedContext,
          response: warning
        };
      }
    } else if (jurisdiction.requireLocation) {
      // Location required but not provided - ask for location
      const locationRequest = `To help you best, could you please tell me your city and state? This helps us provide location-specific legal guidance.`;
      
      return {
        context,
        response: locationRequest
      };
    }

    // No jurisdiction issues - continue pipeline
    return { context };
  }
};

/**
 * Extract location from message content
 */
function extractLocationFromMessage(message: string): string | null {
  // Simple state extraction
  const stateMatch = message.match(/\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i);
  
  if (stateMatch) {
    return stateMatch[1];
  }

  return null;
}

/**
 * Check if location is supported by team jurisdiction
 */
function isLocationSupported(userLocation: string, jurisdiction: any): boolean {
  const supportedStates = jurisdiction.supportedStates || [];
  const supportedCountries = jurisdiction.supportedCountries || [];

  // Check if "all" is supported
  if (supportedStates.includes('all') || supportedCountries.includes('all')) {
    return true;
  }

  // Check specific states
  if (supportedStates.includes(userLocation)) {
    return true;
  }

  // Check countries (US is default)
  if (supportedCountries.includes('US') && isUSState(userLocation)) {
    return true;
  }

  return false;
}

/**
 * Check if location is a US state
 */
function isUSState(location: string): boolean {
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  return usStates.includes(location);
}

/**
 * Get jurisdiction warning message
 */
function getJurisdictionWarning(userLocation: string, jurisdiction: any, teamConfig: TeamConfig): string {
  const teamName = teamConfig?.name || 'our legal team';
  const supportedStates = jurisdiction.supportedStates || [];
  const supportedCountries = jurisdiction.supportedCountries || [];

  let supportedAreas = '';
  if (supportedStates.includes('all')) {
    supportedAreas = 'all US states';
  } else if (supportedStates.length > 0) {
    supportedAreas = supportedStates.join(', ');
  } else if (supportedCountries.includes('all')) {
    supportedAreas = 'all areas';
  }

  return `I notice you're located in ${userLocation}. ${teamName} primarily serves clients in ${supportedAreas}. 

While I can still help you with general legal information and case preparation, you may want to consult with a local attorney in ${userLocation} for specific legal advice and representation.

Would you like me to:
1. Continue helping you with general legal guidance?
2. Provide resources to find a local attorney in ${userLocation}?
3. Answer questions about your legal situation?`;
}
