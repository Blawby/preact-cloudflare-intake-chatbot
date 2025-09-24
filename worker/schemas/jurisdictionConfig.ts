/**
 * Jurisdiction Configuration Schema
 * Defines the geographic scope and service areas for legal teams
 */

export interface JurisdictionConfig {
  /** Type of jurisdiction coverage */
  type: 'national' | 'state' | 'multi_state' | 'county' | 'city';
  
  /** Human-readable description of service area */
  description: string;
  
  /** Supported states (ISO 3166-2 codes) */
  supportedStates?: string[];
  
  /** Supported countries (ISO 3166-1 alpha-2 codes) */
  supportedCountries?: string[];
  
  /** Supported counties (for county-level services) */
  supportedCounties?: string[];
  
  /** Supported cities (for city-level services) */
  supportedCities?: string[];
  
  /** Whether to allow out-of-jurisdiction requests with warnings */
  allowOutOfJurisdiction?: boolean;
  
  /** Custom message for out-of-jurisdiction users */
  outOfJurisdictionMessage?: string;
  
  /** Whether to require location information */
  requireLocation?: boolean;
}

/**
 * Predefined jurisdiction configurations for common scenarios
 */
export const JURISDICTION_PRESETS = {
  /** National coverage - serves all US states */
  NATIONAL_US: {
    type: 'national' as const,
    description: 'All 50 US states and territories',
    supportedCountries: ['US'],
    allowOutOfJurisdiction: true,
    requireLocation: false
  },
  
  /** Single state coverage */
  NORTH_CAROLINA: {
    type: 'state' as const,
    description: 'North Carolina',
    supportedStates: ['NC'],
    supportedCountries: ['US'],
    allowOutOfJurisdiction: true,
    requireLocation: true,
    outOfJurisdictionMessage: 'We primarily serve clients in North Carolina. While we can provide general guidance, we recommend consulting with a local attorney in your state for state-specific legal matters.'
  },
  
  /** Multi-state coverage */
  SOUTHEAST_US: {
    type: 'multi_state' as const,
    description: 'Southeast United States',
    supportedStates: ['NC', 'SC', 'GA', 'FL', 'TN', 'AL', 'MS'],
    supportedCountries: ['US'],
    allowOutOfJurisdiction: true,
    requireLocation: true
  },
  
  /** County-level coverage */
  MECKLENBURG_COUNTY: {
    type: 'county' as const,
    description: 'Mecklenburg County, North Carolina',
    supportedStates: ['NC'],
    supportedCounties: ['Mecklenburg'],
    supportedCountries: ['US'],
    allowOutOfJurisdiction: true,
    requireLocation: true
  }
};

/**
 * Validation functions for jurisdiction configuration
 */
export class JurisdictionValidator {
  /**
   * Validate jurisdiction configuration
   */
  static validateConfig(config: JurisdictionConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.type) {
      errors.push('Jurisdiction type is required');
    }
    
    if (!config.description) {
      errors.push('Jurisdiction description is required');
    }
    
    if (config.type === 'state' && (!config.supportedStates || config.supportedStates.length === 0)) {
      errors.push('State jurisdiction requires supportedStates');
    }
    
    if (config.type === 'multi_state' && (!config.supportedStates || config.supportedStates.length < 2)) {
      errors.push('Multi-state jurisdiction requires at least 2 supportedStates');
    }
    
    if (config.type === 'county' && (!config.supportedCounties || config.supportedCounties.length === 0)) {
      errors.push('County jurisdiction requires supportedCounties');
    }
    
    if (config.type === 'city' && (!config.supportedCities || config.supportedCities.length === 0)) {
      errors.push('City jurisdiction requires supportedCities');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if a location is supported by the jurisdiction
   */
  static isLocationSupported(
    location: string, 
    config: JurisdictionConfig
  ): boolean {
    if (config.type === 'national') {
      return true;
    }
    
    const locationLower = location.toLowerCase();
    
    // Check states (use word boundaries for precise matching)
    if (config.supportedStates) {
      const stateMatch = config.supportedStates.some(state => {
        const stateRegex = new RegExp(`\\b${state.toLowerCase()}\\b`, 'i');
        const stateNameRegex = new RegExp(`\\b${getStateName(state).toLowerCase()}\\b`, 'i');
        return stateRegex.test(location) || stateNameRegex.test(location);
      });
      if (stateMatch) return true;
    }
    
    // Check counties
    if (config.supportedCounties) {
      const countyMatch = config.supportedCounties.some(county => {
        const countyRegex = new RegExp(`\\b${county.toLowerCase()}\\b`, 'i');
        return countyRegex.test(location);
      });
      if (countyMatch) return true;
    }
    
    // Check cities
    if (config.supportedCities) {
      const cityMatch = config.supportedCities.some(city => {
        const cityRegex = new RegExp(`\\b${city.toLowerCase()}\\b`, 'i');
        return cityRegex.test(location);
      });
      if (cityMatch) return true;
    }
    
    return false;
  }
  
  /**
   * Get jurisdiction warning message
   */
  static getJurisdictionWarning(
    userLocation: string,
    config: JurisdictionConfig,
    teamName: string
  ): string {
    if (config.outOfJurisdictionMessage) {
      return config.outOfJurisdictionMessage;
    }
    
    const baseMessage = `I notice you're located in ${userLocation}. ${teamName} primarily serves clients in ${config.description}.`;
    
    if (config.allowOutOfJurisdiction) {
      return `${baseMessage} While I can provide general guidance, I recommend consulting with a local attorney in your area for state-specific legal matters. Would you like me to help you find local legal resources?`;
    } else {
      return `${baseMessage} I'm unable to provide legal assistance outside our service area. I recommend contacting a local attorney in your area.`;
    }
  }
}

/**
 * Helper function to get state name from state code
 */
function getStateName(stateCode: string): string {
  const stateNames: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };
  
  return stateNames[stateCode.toUpperCase()] || stateCode;
}
