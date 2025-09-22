/**
 * Centralized utilities for contact information detection and validation
 */

export interface ContactInfoPatterns {
  name: RegExp;
  email: RegExp;
  phone: RegExp;
  location: RegExp;
  contactInfoHeader: RegExp;
}

export interface ContactInfoMatch {
  hasName: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasLocation: boolean;
  hasContactInfoHeader: boolean;
  matches: Array<{ pattern: string; matched: boolean }>;
}

/**
 * Standard contact information detection patterns
 */
export const CONTACT_INFO_PATTERNS: ContactInfoPatterns = {
  // Contact info header patterns
  contactInfoHeader: /Contact Information:/i,
  
  // Name patterns - more flexible to catch various formats
  name: /Name:\s*.+/i,
  
  // Email patterns - standard email format
  email: /Email:\s*\S+@\S+\.\S+/i,
  
  // Phone patterns - flexible format matching
  phone: /Phone:\s*.+/i,
  
  // Location patterns - flexible location matching
  location: /Location:\s*.+/i
};

/**
 * Detects contact information in conversation text
 * @param conversationText - The conversation text to analyze
 * @returns ContactInfoMatch with detection results
 */
export function detectContactInfo(conversationText: string): ContactInfoMatch {
  if (!conversationText) {
    return {
      hasName: false,
      hasEmail: false,
      hasPhone: false,
      hasLocation: false,
      hasContactInfoHeader: false,
      matches: []
    };
  }

  const patterns = CONTACT_INFO_PATTERNS;
  const matches = [
    { pattern: 'contactInfoHeader', matched: patterns.contactInfoHeader.test(conversationText) },
    { pattern: 'name', matched: patterns.name.test(conversationText) },
    { pattern: 'email', matched: patterns.email.test(conversationText) },
    { pattern: 'phone', matched: patterns.phone.test(conversationText) },
    { pattern: 'location', matched: patterns.location.test(conversationText) }
  ];

  return {
    hasName: matches.find(m => m.pattern === 'name')?.matched || false,
    hasEmail: matches.find(m => m.pattern === 'email')?.matched || false,
    hasPhone: matches.find(m => m.pattern === 'phone')?.matched || false,
    hasLocation: matches.find(m => m.pattern === 'location')?.matched || false,
    hasContactInfoHeader: matches.find(m => m.pattern === 'contactInfoHeader')?.matched || false,
    matches
  };
}

/**
 * Determines if contact information has been provided in the conversation
 * @param conversationText - The conversation text to analyze
 * @returns boolean indicating if contact info is present
 */
export function hasContactInformation(conversationText: string): boolean {
  const detection = detectContactInfo(conversationText);
  
  // Consider contact info present if we have at least name, email, and phone
  // OR if we have the contact info header with at least 2 other fields
  const hasCoreInfo = detection.hasName && detection.hasEmail && detection.hasPhone;
  const hasHeaderWithInfo = detection.hasContactInfoHeader && 
    [detection.hasName, detection.hasEmail, detection.hasPhone, detection.hasLocation]
      .filter(Boolean).length >= 2;
  
  return hasCoreInfo || hasHeaderWithInfo;
}

/**
 * Extracts contact information from conversation text
 * @param conversationText - The conversation text to analyze
 * @returns Object with extracted contact information
 */
export function extractContactInfo(conversationText: string): {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
} {
  if (!conversationText) {
    return {};
  }

  const result: { name?: string; email?: string; phone?: string; location?: string } = {};

  // Extract name
  const nameMatch = conversationText.match(/Name:\s*(.+?)(?:\n|$)/i);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // Extract email
  const emailMatch = conversationText.match(/Email:\s*(\S+@\S+\.\S+)/i);
  if (emailMatch) {
    result.email = emailMatch[1].trim();
  }

  // Extract phone
  const phoneMatch = conversationText.match(/Phone:\s*(.+?)(?:\n|$)/i);
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim();
  }

  // Extract location
  const locationMatch = conversationText.match(/Location:\s*(.+?)(?:\n|$)/i);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  return result;
}

/**
 * Validates that contact information is complete enough for matter creation
 * @param conversationText - The conversation text to analyze
 * @returns boolean indicating if contact info is sufficient
 */
export function isContactInfoComplete(conversationText: string): boolean {
  const detection = detectContactInfo(conversationText);
  
  // Require at least name, email, and phone for complete contact info
  return detection.hasName && detection.hasEmail && detection.hasPhone;
}

/**
 * Logs contact information detection for debugging
 * @param conversationText - The conversation text that was analyzed
 * @param detection - The detection results
 * @param correlationId - Optional correlation ID for logging
 */
export function logContactInfoDetection(
  conversationText: string, 
  detection: ContactInfoMatch, 
  correlationId?: string
): void {
  // Parameter validation with guard clauses
  if (typeof conversationText !== 'string') {
    throw new Error('conversationText must be a string');
  }
  if (!detection || typeof detection !== 'object') {
    throw new Error('detection must be a ContactInfoMatch object');
  }

  // Use structured logging (replace with your logging framework)
  const logData = {
    level: 'info',
    message: 'Contact information detection',
    correlationId,
    hasContactInfo: hasContactInformation(conversationText),
    isComplete: isContactInfoComplete(conversationText),
    detection,
    conversationText: conversationText.substring(0, 300) + '...'
  };
  console.log(JSON.stringify(logData));
}
