import { extractLocationFromText, isLocationSupported } from './locationValidator.js';
import { CloudflareLocationInfo, isCloudflareLocationSupported } from './cloudflareLocationValidator.js';

export class SecurityFilter {
  // Core legal intake activities (always allowed)
  private static CORE_INTAKE_ACTIVITIES = [
    'client information collection',
    'matter classification', 
    'team routing',
    'consultation scheduling',
    'jurisdiction verification',
    'contact information gathering'
  ];

  // Comprehensive security validation
  static validateRequest(content: string, teamConfig: any, cloudflareLocation?: CloudflareLocationInfo): { isValid: boolean; violations: string[]; reason?: string } {
    const violations: string[] = [];
    
    // 1. Check for jailbreak attempts first (highest priority)
    if (this.isJailbreakAttempt(content)) {
      violations.push('jailbreak_attempt');
      return { 
        isValid: false, 
        violations,
        reason: 'Security violation detected'
      };
    }
    
    // 2. Check for non-legal requests (always blocked)
    if (this.isNonLegalRequest(content)) {
      violations.push('non_legal_request');
      return { 
        isValid: false, 
        violations,
        reason: 'Request outside legal domain'
      };
    }
    
    // 3. Check for service scope violations
    const serviceViolation = this.validateServiceScope(content, teamConfig);
    if (serviceViolation) {
      violations.push(serviceViolation);
      return { 
        isValid: false, 
        violations,
        reason: 'Service not offered by this team'
      };
    }
    
    // 4. Check for jurisdiction violations using Cloudflare location data
    const jurisdictionViolation = this.validateJurisdictionWithCloudflare(content, teamConfig, cloudflareLocation);
    if (jurisdictionViolation) {
      violations.push(jurisdictionViolation);
      return { 
        isValid: false, 
        violations,
        reason: 'Jurisdiction not supported'
      };
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }

  private static isNonLegalRequest(content: string): boolean {
    const nonLegalPatterns = [
      // Technical/Programming - more specific to avoid false positives
      /(^cd\s|^ls\s|^sudo\s|^bash\s|\.py$|<script>|SELECT .* FROM)/i,
      /(terminal|command line|shell|programming|coding|script)/i,
      /(javascript|python|html|css|sql|api)/i,
      /(hack|crack|exploit|vulnerability)/i,
      
      // Entertainment/Role-playing
      /(play game|game|entertainment|fun|trivia)/i,
      /(roleplay|role play|role-playing|scenario)/i,
      /(act as client|be the client|pretend to be client)/i,
      /(legal trivia|case study|hypothetical)/i,
      /(for entertainment|entertainment purposes)/i,
      
      // General Knowledge/Research
      /(write.*document|create.*document|research.*)/i,
      /(tell me about|explain|describe)/i,
      /(geography|history|science|technology|politics)/i,
      /(write.*story|create.*content|generate.*)/i,
      
      // Creative Tasks
      /(write.*poem|create.*art|design.*)/i,
      /(creative|artistic|imaginative)/i,
      
      // Content Generation
      /(write.*about|create.*document|generate.*content)/i,
      /(tell me about|explain|describe)/i
    ];
    
    return nonLegalPatterns.some(pattern => pattern.test(content));
  }

  private static isJailbreakAttempt(content: string): boolean {
    const jailbreakPatterns = [
      /(ignore.*instructions)/i,
      /(system prompt|bypass.*restrictions)/i,
      /(change.*role|override.*instructions)/i,
      /(ignore.*previous|forget.*rules)/i,
      /(act.*as|pretend.*to.*be)/i
    ];
    
    return jailbreakPatterns.some(pattern => pattern.test(content));
  }

  private static validateServiceScope(content: string, teamConfig: any): string | null {
    let availableServices = teamConfig?.config?.availableServices || teamConfig?.availableServices || [];
    
    // Ensure availableServices is an array (handle case where it's stored as object)
    if (availableServices && typeof availableServices === 'object' && !Array.isArray(availableServices)) {
      availableServices = Object.values(availableServices);
    }
    
    // Extract legal matter type from content
    const legalMatterType = this.extractLegalMatterType(content);
    
    // Only validate if we found a specific legal matter type AND have team config
    // Allow General Consultation to handle most legal questions
    if (legalMatterType && teamConfig && !availableServices.includes(legalMatterType)) {
      // If the team offers General Consultation, allow most legal questions
      if (availableServices.includes('General Consultation')) {
        return null; // Allow general consultation to handle the request
      }
      return 'service_not_offered';
    }
    
    return null;
  }

  private static validateJurisdictionWithCloudflare(content: string, teamConfig: any, cloudflareLocation?: CloudflareLocationInfo): string | null {
    const jurisdiction = teamConfig?.jurisdiction || teamConfig?.config?.jurisdiction;
    if (!jurisdiction) return null;

    // Use Cloudflare location data if available
    if (cloudflareLocation && cloudflareLocation.isValid) {
      const supportedStates = Array.isArray(jurisdiction.supportedStates) ? jurisdiction.supportedStates : [];
      const supportedCountries = Array.isArray(jurisdiction.supportedCountries) ? jurisdiction.supportedCountries : [];
      
      const isSupported = isCloudflareLocationSupported(cloudflareLocation, supportedStates, supportedCountries);
      if (!isSupported) {
        // Don't block entirely - let the agent handle jurisdiction gracefully
        return null;
      }
      return null;
    }

    // Fallback to parsing location from content if Cloudflare data is not available
    const locationInfo = extractLocationFromText(content);
    console.log('SecurityFilter: Extracted location info:', locationInfo, 'from content:', content);

    // Only validate jurisdiction if a location is actually mentioned
    if (!locationInfo) {
      return null;
    }

    // Ensure supportedStates and supportedCountries are arrays
    const supportedStates = Array.isArray(jurisdiction.supportedStates) ? jurisdiction.supportedStates : [];
    const supportedCountries = Array.isArray(jurisdiction.supportedCountries) ? jurisdiction.supportedCountries : [];
    
    // Check if location is supported using the new validator
    const isSupported = isLocationSupported(
      locationInfo.state || locationInfo.country || locationInfo.city || '',
      supportedStates,
      supportedCountries
    );
    
    if (!isSupported) {
      // Don't block entirely - let the agent handle jurisdiction gracefully
      return null;
    }
    
    return null;
  }

  private static extractLegalMatterType(content: string): string | null {
    const legalMatterPatterns = {
      'Family Law': /(divorce|custody|child support|family dispute|marriage|paternity)/i,
      'Employment Law': /(employment|workplace|termination|discrimination|harassment|wage|overtime)/i,
      'Business Law': /(business|contract|corporate|company|startup|partnership)/i,
      'Intellectual Property': /(patent|trademark|copyright|intellectual property|IP|trade secret)/i,
      'Personal Injury': /(accident|injury|personal injury|damage|liability|negligence)/i,
      'Criminal Law': /(criminal|arrest|charges|trial|violation|felony|misdemeanor)/i,
      'Civil Law': /(civil|dispute|contract|property|tort)/i,
      'Tenant Rights Law': /(tenant|landlord|rental|eviction|housing|lease)/i,
      'Probate and Estate Planning': /(estate|probate|inheritance|will|trust|power of attorney)/i,
      'Special Education and IEP Advocacy': /(special education|IEP|disability|accommodation|504 plan)/i,
      'Small Business and Nonprofits': /(small business|nonprofit|non-profit|entrepreneur|startup)/i,
      'Contract Review': /(contract|agreement|terms|clause|legal document)/i,
      'General Consultation': /(legal question|legal help|legal advice|consultation)/i
    };
    
    for (const [matterType, pattern] of Object.entries(legalMatterPatterns)) {
      if (pattern.test(content)) {
        return matterType;
      }
    }
    
    return null;
  }


} 