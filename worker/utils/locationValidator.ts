// Location validation utility using comprehensive state and country databases
// This replaces the regex-based location extraction with proper validation

export interface LocationInfo {
  isValid: boolean;
  state?: string;
  country?: string;
  city?: string;
  error?: string;
}

// Comprehensive US state database
const US_STATES = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia',
  'AS': 'American Samoa',
  'GU': 'Guam',
  'MP': 'Northern Mariana Islands',
  'PR': 'Puerto Rico',
  'VI': 'U.S. Virgin Islands'
};

// Major countries database
const COUNTRIES = {
  'US': 'United States',
  'CA': 'Canada',
  'MX': 'Mexico',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
  'IE': 'Ireland',
  'PT': 'Portugal',
  'GR': 'Greece',
  'CY': 'Cyprus',
  'MT': 'Malta',
  'LU': 'Luxembourg',
  'IS': 'Iceland',
  'LI': 'Liechtenstein',
  'MC': 'Monaco',
  'SM': 'San Marino',
  'VA': 'Vatican City',
  'AD': 'Andorra',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'JP': 'Japan',
  'KR': 'South Korea',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'VE': 'Venezuela',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'PY': 'Paraguay',
  'UY': 'Uruguay',
  'GY': 'Guyana',
  'SR': 'Suriname',
  'GF': 'French Guiana',
  'FK': 'Falkland Islands',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'GH': 'Ghana',
  'ET': 'Ethiopia',
  'TZ': 'Tanzania',
  'UG': 'Uganda',
  'RW': 'Rwanda',
  'BI': 'Burundi',
  'MW': 'Malawi',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
  'BW': 'Botswana',
  'NA': 'Namibia',
  'SZ': 'Eswatini',
  'LS': 'Lesotho',
  'MG': 'Madagascar',
  'MU': 'Mauritius',
  'SC': 'Seychelles',
  'KM': 'Comoros',
  'DJ': 'Djibouti',
  'SO': 'Somalia',
  'ER': 'Eritrea',
  'SD': 'Sudan',
  'SS': 'South Sudan',
  'CF': 'Central African Republic',
  'CM': 'Cameroon',
  'GQ': 'Equatorial Guinea',
  'GA': 'Gabon',
  'CG': 'Republic of the Congo',
  'CD': 'Democratic Republic of the Congo',
  'AO': 'Angola',
  'ST': 'São Tomé and Príncipe',
  'CV': 'Cape Verde',
  'GM': 'Gambia',
  'GN': 'Guinea',
  'GW': 'Guinea-Bissau',
  'SL': 'Sierra Leone',
  'LR': 'Liberia',
  'CI': 'Ivory Coast',
  'BF': 'Burkina Faso',
  'ML': 'Mali',
  'NE': 'Niger',
  'TD': 'Chad',
  'SN': 'Senegal',
  'MR': 'Mauritania',
  'TN': 'Tunisia',
  'DZ': 'Algeria',
  'MA': 'Morocco',
  'LY': 'Libya',
  'SA': 'Saudi Arabia',
  'YE': 'Yemen',
  'OM': 'Oman',
  'AE': 'United Arab Emirates',
  'QA': 'Qatar',
  'BH': 'Bahrain',
  'KW': 'Kuwait',
  'IQ': 'Iraq',
  'IR': 'Iran',
  'AF': 'Afghanistan',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'MV': 'Maldives',
  'NP': 'Nepal',
  'BT': 'Bhutan',
  'MM': 'Myanmar',
  'TH': 'Thailand',
  'LA': 'Laos',
  'KH': 'Cambodia',
  'VN': 'Vietnam',
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'BN': 'Brunei',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'TL': 'Timor-Leste',
  'PG': 'Papua New Guinea',
  'FJ': 'Fiji',
  'VU': 'Vanuatu',
  'NC': 'New Caledonia',
  'PF': 'French Polynesia',
  'WS': 'Samoa',
  'TO': 'Tonga',
  'KI': 'Kiribati',
  'TV': 'Tuvalu',
  'NR': 'Nauru',
  'PW': 'Palau',
  'MH': 'Marshall Islands',
  'FM': 'Micronesia',
  'CK': 'Cook Islands',
  'NU': 'Niue',
  'TK': 'Tokelau',
  'AS': 'American Samoa',
  'GU': 'Guam',
  'MP': 'Northern Mariana Islands',
  'PR': 'Puerto Rico',
  'VI': 'U.S. Virgin Islands',
  'AI': 'Anguilla',
  'AG': 'Antigua and Barbuda',
  'AW': 'Aruba',
  'BS': 'Bahamas',
  'BB': 'Barbados',
  'BZ': 'Belize',
  'BM': 'Bermuda',
  'VG': 'British Virgin Islands',
  'KY': 'Cayman Islands',
  'CR': 'Costa Rica',
  'CU': 'Cuba',
  'DM': 'Dominica',
  'DO': 'Dominican Republic',
  'SV': 'El Salvador',
  'GD': 'Grenada',
  'GT': 'Guatemala',
  'HT': 'Haiti',
  'HN': 'Honduras',
  'JM': 'Jamaica',
  'NI': 'Nicaragua',
  'PA': 'Panama',
  'KN': 'Saint Kitts and Nevis',
  'LC': 'Saint Lucia',
  'VC': 'Saint Vincent and the Grenadines',
  'TT': 'Trinidad and Tobago',
  'TC': 'Turks and Caicos Islands'
};

// Create reverse lookup maps for easier searching
const STATE_NAMES_TO_CODES = Object.entries(US_STATES).reduce((acc, [code, name]) => {
  acc[name.toLowerCase()] = code;
  return acc;
}, {} as Record<string, string>);

const COUNTRY_NAMES_TO_CODES = Object.entries(COUNTRIES).reduce((acc, [code, name]) => {
  acc[name.toLowerCase()] = code;
  return acc;
}, {} as Record<string, string>);

/**
 * Validates and parses a location string
 * @param location - The location string to validate
 * @returns LocationInfo with validation results
 */
export function validateLocation(location: string): LocationInfo {
  if (!location || typeof location !== 'string') {
    return { isValid: false, error: 'Location is required' };
  }

  const trimmed = location.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Location must be at least 2 characters' };
  }

  // Split by common separators
  const parts = trimmed.split(/[,\s]+/).filter(part => part.length > 0);
  
  let state: string | undefined;
  let country: string | undefined;
  let city: string | undefined;
  let foundValidLocation = false;

  // First, check if the entire location is a state name or code
  const lowerLocationFull = trimmed.toLowerCase();
  
  // Check if it's a state code
  if (US_STATES[trimmed.toUpperCase()]) {
    state = trimmed.toUpperCase();
    foundValidLocation = true;
  }
  // Check if it's a state name
  else if (STATE_NAMES_TO_CODES[lowerLocationFull]) {
    state = STATE_NAMES_TO_CODES[lowerLocationFull];
    foundValidLocation = true;
  }
  // Check if it's a country code
  else if (COUNTRIES[trimmed.toUpperCase()]) {
    country = trimmed.toUpperCase();
    foundValidLocation = true;
  }
  // Check if it's a country name
  else if (COUNTRY_NAMES_TO_CODES[lowerLocationFull]) {
    country = COUNTRY_NAMES_TO_CODES[lowerLocationFull];
    foundValidLocation = true;
  }
  // If not a single state/country, check each part
  else {
    // Check each part for state, country, or city
    for (const part of parts) {
      const cleanPart = part.trim().toLowerCase();
      
      // Check if it's a state code
      if (US_STATES[cleanPart.toUpperCase()]) {
        state = cleanPart.toUpperCase();
        foundValidLocation = true;
        continue;
      }
      
      // Check if it's a state name
      if (STATE_NAMES_TO_CODES[cleanPart]) {
        state = STATE_NAMES_TO_CODES[cleanPart];
        foundValidLocation = true;
        continue;
      }
      
      // Check for multi-word state names within the full location string
      const lowerLocation = trimmed.toLowerCase();
      for (const [stateName, stateCode] of Object.entries(STATE_NAMES_TO_CODES)) {
        if (lowerLocation.includes(stateName)) {
          state = stateCode;
          foundValidLocation = true;
          break;
        }
      }
      
      // Check if it's a country code
      if (COUNTRIES[cleanPart.toUpperCase()]) {
        country = cleanPart.toUpperCase();
        foundValidLocation = true;
        continue;
      }
      
      // Check if it's a country name
      if (COUNTRY_NAMES_TO_CODES[cleanPart]) {
        country = COUNTRY_NAMES_TO_CODES[cleanPart];
        foundValidLocation = true;
        continue;
      }
      
      // If it's not a state or country, assume it's a city (if it's not too short)
      if (cleanPart.length >= 2 && !city) {
        city = part.trim(); // Keep original case for city
      }
    }
  }

  // If we found at least one valid location component, consider it valid
  if (foundValidLocation) {
    return {
      isValid: true,
      state,
      country,
      city
    };
  }

  // If no valid components found, check if it might be a valid location we missed
  const lowerLocation = trimmed.toLowerCase();
  
  // Check for common location patterns
  if (lowerLocation.includes('united states') || lowerLocation.includes('usa') || lowerLocation.includes('us')) {
    return { isValid: true, country: 'US' };
  }
  
  if (lowerLocation.includes('canada')) {
    return { isValid: true, country: 'CA' };
  }
  
  if (lowerLocation.includes('mexico')) {
    return { isValid: true, country: 'MX' };
  }

  return { isValid: false, error: 'Invalid location format' };
}

/**
 * Checks if a location is within supported jurisdictions
 * @param location - The location to check
 * @param supportedStates - Array of supported state codes
 * @param supportedCountries - Array of supported country codes
 * @returns boolean indicating if location is supported
 */
export function isLocationSupported(
  location: string, 
  supportedStates: string[] = [], 
  supportedCountries: string[] = []
): boolean {
  const locationInfo = validateLocation(location);
  
  if (!locationInfo.isValid) {
    return false;
  }

  // If 'all' is in supported states or countries, accept everything
  if (supportedStates.includes('all') || supportedCountries.includes('all')) {
    return true;
  }

  // Check if the location's state is supported
  if (locationInfo.state && supportedStates.includes(locationInfo.state)) {
    return true;
  }

  // Check if the location's country is supported
  if (locationInfo.country && supportedCountries.includes(locationInfo.country)) {
    return true;
  }

  return false;
}

/**
 * Extracts location information from text content
 * @param content - The text content to search for locations
 * @returns LocationInfo or null if no location found
 */
export function extractLocationFromText(content: string): LocationInfo | null {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Filter out messages that are just discussing locations rather than providing them
  const lowerContent = content.toLowerCase();
  const locationDiscussionKeywords = [
    'dont need', 'dont want', 'dont have', 'dont provide',
    'need my', 'want my', 'have my', 'provide my',
    'suggest', 'options', 'choices', 'alternatives',
    'tell me', 'give me', 'show me', 'help me',
    'what are', 'what is', 'how do', 'how can',
    'city and state', 'state and city', 'location and',
    'you dont', 'you do not', 'you cant', 'you cannot'
  ];

  // If the message contains these keywords, it's likely just discussing locations, not providing one
  if (locationDiscussionKeywords.some(keyword => lowerContent.includes(keyword))) {
    return null;
  }

  // Common location patterns in text - more precise to avoid false matches
  const locationPatterns = [
    // "in [location]" - must be followed by a word boundary or end of string
    /(?:in|from|located in|based in)\s+([A-Za-z\s,]+?)(?=\s+(?:and|with|for|need|want|looking|seeking|but|however|though|my|your|his|her|their|to|the|a|an|$))/gi,
    // "state of [location]"
    /(?:state|country)\s+of\s+([A-Za-z\s]+)/gi,
    // "[STATE] state/country" - only match actual state codes
    /(?:^|\s)([A-Z]{2})\s+(?:state|country)(?:\s|$)/gi,
    // "I'm in [location]"
    /(?:I'm|I am|we're|we are)\s+(?:in|from)\s+([A-Za-z\s,]+?)(?=\s+(?:and|with|for|need|want|looking|seeking|but|however|though|my|your|his|her|their|to|the|a|an|$))/gi
  ];

  for (const pattern of locationPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const extractedLocation = match[1]?.trim();
      if (extractedLocation && extractedLocation.length >= 2) {
        const locationInfo = validateLocation(extractedLocation);
        if (locationInfo.isValid) {
          return locationInfo;
        }
      }
    }
  }

  return null;
} 