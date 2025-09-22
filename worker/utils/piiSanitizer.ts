/**
 * PII (Personally Identifiable Information) Sanitization Utility
 * Provides functions to redact or mask sensitive information from text content
 */

// Module-level regex patterns for PII detection and sanitization
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

const PHONE_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 1234567890
  /(?:^|\s)\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b/g, // (123) 456-7890, (123) 456.7890, (123) 456 7890
  /\b\+1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // +1-123-456-7890
  /\b1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/g // 1-123-456-7890
];

const SSN_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // 123-45-6789
  /\b\d{3}\s\d{2}\s\d{4}\b/g // 123 45 6789
];

const CONTEXTUAL_SSN_PATTERN = /(?:(?:SSN|Social\s+Security|SSN:|Social\s+Security\s+Number|SS#|SS\s*#)\s*:?\s*)(\d{9})\b/gi;

const ADDRESS_PATTERNS = [
  /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Place|Pl|Way|Circle|Cir)\b/gi,
  /\b\d+\s+[A-Za-z\s]+(?:Apt|Apartment|Unit|Suite|Ste|#)\s*\d+/gi,
  /\b(?:PO Box|P\.O\. Box|P\.O\.\s*Box)\s*\d+/gi
];

const ADDITIONAL_PII_PATTERNS = [
  // Credit card numbers (basic pattern)
  /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g
];

export interface SanitizationOptions {
  /** Whether to completely remove PII (true) or mask it (false) */
  remove?: boolean;
  /** Custom replacement text for masked PII */
  maskText?: string;
  /** Maximum length of content to process (for performance) */
  maxLength?: number;
}

export interface SanitizedContent {
  /** The sanitized content */
  content: string;
  /** Metadata about what was sanitized */
  metadata: {
    hasEmail: boolean;
    hasPhone: boolean;
    hasSSN: boolean;
    hasAddress: boolean;
    hasPII: boolean;
    originalLength: number;
    sanitizedLength: number;
  };
}

/**
 * Comprehensive PII sanitization function
 * Redacts or masks emails, phone numbers, SSNs, and addresses
 */
export function sanitizePII(
  content: string | null | undefined, 
  options: SanitizationOptions = {}
): SanitizedContent {
  // Guard against null/undefined input - coerce to empty string
  const safeContent = content || '';
  
  const {
    remove = false,
    maskText = '[REDACTED]',
    maxLength = 10000
  } = options;

  // Truncate if too long
  const processedContent = safeContent.length > maxLength 
    ? safeContent.substring(0, maxLength) + '...' 
    : safeContent;

  let sanitized = processedContent;
  const metadata = {
    hasEmail: false,
    hasPhone: false,
    hasSSN: false,
    hasAddress: false,
    hasPII: false,
    originalLength: safeContent.length,
    sanitizedLength: 0
  };

  // Email patterns - more comprehensive
  if (EMAIL_PATTERN.test(sanitized)) {
    metadata.hasEmail = true;
    sanitized = sanitized.replace(EMAIL_PATTERN, remove ? '' : maskText);
  }

  // Phone number patterns - various formats
  for (const pattern of PHONE_PATTERNS) {
    // Create a fresh regex instance to avoid lastIndex issues
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(sanitized)) {
      metadata.hasPhone = true;
      sanitized = sanitized.replace(freshPattern, remove ? '' : maskText);
    }
  }

  // SSN patterns - contextual matching to avoid false positives
  for (const pattern of SSN_PATTERNS) {
    // Create a fresh regex instance to avoid lastIndex issues
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(sanitized)) {
      metadata.hasSSN = true;
      sanitized = sanitized.replace(freshPattern, remove ? '' : maskText);
    }
  }
  
  // Handle contextual unformatted SSNs
  const freshContextualSSNPattern = new RegExp(CONTEXTUAL_SSN_PATTERN.source, CONTEXTUAL_SSN_PATTERN.flags);
  if (freshContextualSSNPattern.test(sanitized)) {
    metadata.hasSSN = true;
    sanitized = sanitized.replace(freshContextualSSNPattern, (match, ssnDigits) => {
      return remove ? '' : match.replace(ssnDigits, maskText);
    });
  }

  // Address patterns - common address indicators
  for (const pattern of ADDRESS_PATTERNS) {
    // Create a fresh regex instance to avoid lastIndex issues
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(sanitized)) {
      metadata.hasAddress = true;
      sanitized = sanitized.replace(freshPattern, remove ? '' : maskText);
    }
  }

  // Additional PII patterns
  for (const pattern of ADDITIONAL_PII_PATTERNS) {
    // Create a fresh regex instance to avoid lastIndex issues
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(sanitized)) {
      sanitized = sanitized.replace(freshPattern, remove ? '' : maskText);
    }
  }

  // Clean up extra whitespace if content was removed
  if (remove) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }

  metadata.hasPII = metadata.hasEmail || metadata.hasPhone || metadata.hasSSN || metadata.hasAddress;
  metadata.sanitizedLength = sanitized.length;

  return {
    content: sanitized,
    metadata
  };
}

/**
 * Creates a secure SHA-256 hash of content for logging purposes
 * Useful when you need to track content without storing PII
 */
export async function createContentHash(content: string | null | undefined): Promise<string> {
  // Validate that content is a non-null/undefined string
  if (content === null || content === undefined) {
    throw new TypeError('Content must be a non-null, non-undefined string');
  }
  
  // Convert string to UTF-8 bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // Compute SHA-256 hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert ArrayBuffer to hex string for stable representation
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Sanitizes content for logging with metadata
 * Returns sanitized content and metadata for structured logging
 */
export async function sanitizeForLogging(
  content: string | null | undefined,
  options: SanitizationOptions = {}
): Promise<{ sanitizedContent: string; hash: string; metadata: SanitizedContent['metadata'] }> {
  const sanitized = sanitizePII(content, options);
  const hash = await createContentHash(content);
  
  return {
    sanitizedContent: sanitized.content,
    hash,
    metadata: sanitized.metadata
  };
}

/**
 * Quick check if content contains PII
 * Useful for conditional logging
 */
export function containsPII(content: string | null | undefined): boolean {
  // Input validation: return false for non-string or empty inputs
  if (typeof content !== 'string' || content.trim() === '') {
    return false;
  }
  
  // Email pattern check
  const freshEmailPattern = new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags);
  if (freshEmailPattern.test(content)) {
    return true;
  }
  
  // Phone pattern check - use comprehensive patterns
  for (const pattern of PHONE_PATTERNS) {
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(content)) {
      return true;
    }
  }
  
  // SSN pattern check - use comprehensive patterns
  for (const pattern of SSN_PATTERNS) {
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(content)) {
      return true;
    }
  }
  
  // Contextual SSN pattern check
  const freshContextualSSNPattern = new RegExp(CONTEXTUAL_SSN_PATTERN.source, CONTEXTUAL_SSN_PATTERN.flags);
  if (freshContextualSSNPattern.test(content)) {
    return true;
  }
  
  // Address pattern check - use comprehensive patterns
  for (const pattern of ADDRESS_PATTERNS) {
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(content)) {
      return true;
    }
  }
  
  // Additional PII pattern check
  for (const pattern of ADDITIONAL_PII_PATTERNS) {
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    if (freshPattern.test(content)) {
      return true;
    }
  }
  
  return false;
}
