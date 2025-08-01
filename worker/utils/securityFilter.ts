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
  static validateRequest(content: string, teamConfig: any): { isValid: boolean; violations: string[]; reason?: string } {
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
    
    // 4. Check for jurisdiction violations
    const jurisdictionViolation = this.validateJurisdiction(content, teamConfig);
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
      // Technical/Programming
      /(cd|ls|sudo|bash|\.py|<script>|SELECT .* FROM)/i,
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
    const availableServices = teamConfig?.availableServices || [];
    
    // Extract legal matter type from content
    const legalMatterType = this.extractLegalMatterType(content);
    
    // Only validate if we found a specific legal matter type AND have team config
    if (legalMatterType && teamConfig && !availableServices.includes(legalMatterType)) {
      return 'service_not_offered';
    }
    
    return null;
  }

  private static validateJurisdiction(content: string, teamConfig: any): string | null {
    const jurisdiction = teamConfig?.jurisdiction || teamConfig?.config?.jurisdiction;
    if (!jurisdiction) return null;
    
    // Extract location from content
    const location = this.extractLocation(content);
    
    // Only validate jurisdiction if a location is actually mentioned
    if (!location) {
      return null;
    }
    
    const supportedStates = jurisdiction.supportedStates || [];
    const supportedCountries = jurisdiction.supportedCountries || [];
    
    // Check if location is in supported jurisdictions
    if (supportedStates.includes('all') || supportedCountries.includes('all')) {
      return null; // All jurisdictions supported
    }
    
    // Check state/country match with full name mapping
    const stateNameMap: { [key: string]: string } = {
      'NC': 'north carolina',
      'CA': 'california',
      'NY': 'new york',
      'TX': 'texas',
      'FL': 'florida',
      'PA': 'pennsylvania',
      'IL': 'illinois',
      'OH': 'ohio',
      'GA': 'georgia',
      'MI': 'michigan'
    };
    
    const stateMatch = supportedStates.some(state => {
      const stateCode = state.toLowerCase();
      const stateName = stateNameMap[state.toUpperCase()] || stateCode;
      return location.toLowerCase().includes(stateName) || location.toLowerCase().includes(stateCode);
    });
    
    const countryMatch = supportedCountries.some(country => 
      location.toLowerCase().includes(country.toLowerCase())
    );
    
    if (!stateMatch && !countryMatch) {
      return 'jurisdiction_not_supported';
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

  private static extractLocation(content: string): string | null {
    
    // Extract location patterns - more specific to avoid false matches
    const locationPatterns = [
      // Specific location mentions
      /(?:in|from|located in|based in)\s+([A-Za-z\s,]+?)(?:\s+and|\s+with|\s+for|\s+need|\s+want|\s+looking|\s+seeking|\s+but|\s+however|\s+though)/i,
      /(?:state|country)\s+of\s+([A-Za-z\s]+)/i,
      /([A-Z]{2})\s+(?:state|country)/i,
      // More specific pattern for "in" followed by location
      /(?:in|from)\s+([A-Za-z\s]+?)(?:\s+and|\s+with|\s+for|\s+need|\s+want|\s+looking|\s+seeking|\s+but|\s+however|\s+though|\s+for|\s+my|\s+your|\s+his|\s+her|\s+their)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match) {
        const extractedLocation = match[1] || match[0];
        // Additional validation: location should be reasonable (not too long, not contain certain words)
        if (extractedLocation && 
            extractedLocation.length < 50 && 
            !extractedLocation.toLowerCase().includes('job') &&
            !extractedLocation.toLowerCase().includes('employee') &&
            !extractedLocation.toLowerCase().includes('harass') &&
            !extractedLocation.toLowerCase().includes('fire')) {
          return extractedLocation;
        }
      }
    }
    
    return null;
  }
} 