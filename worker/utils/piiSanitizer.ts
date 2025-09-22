/**
 * PII (Personally Identifiable Information) Sanitization Utility
 * Provides functions to redact or mask sensitive information from text content
 */

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
  content: string, 
  options: SanitizationOptions = {}
): SanitizedContent {
  const {
    remove = false,
    maskText = '[REDACTED]',
    maxLength = 10000
  } = options;

  // Truncate if too long
  const processedContent = content.length > maxLength 
    ? content.substring(0, maxLength) + '...' 
    : content;

  let sanitized = processedContent;
  const metadata = {
    hasEmail: false,
    hasPhone: false,
    hasSSN: false,
    hasAddress: false,
    hasPII: false,
    originalLength: content.length,
    sanitizedLength: 0
  };

  // Email patterns - more comprehensive
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailPattern.test(sanitized)) {
    metadata.hasEmail = true;
    sanitized = sanitized.replace(emailPattern, remove ? '' : maskText);
  }

  // Phone number patterns - various formats
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 1234567890
    /\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g, // (123) 456-7890
    /\b\+1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // +1-123-456-7890
    /\b1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/g // 1-123-456-7890
  ];
  
  for (const pattern of phonePatterns) {
    if (pattern.test(sanitized)) {
      metadata.hasPhone = true;
      sanitized = sanitized.replace(pattern, remove ? '' : maskText);
    }
  }

  // SSN patterns
  const ssnPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // 123-45-6789
    /\b\d{3}\s\d{2}\s\d{4}\b/g, // 123 45 6789
    /\b\d{9}\b/g // 123456789 (9 consecutive digits, but be careful of false positives)
  ];
  
  for (const pattern of ssnPatterns) {
    if (pattern.test(sanitized)) {
      metadata.hasSSN = true;
      sanitized = sanitized.replace(pattern, remove ? '' : maskText);
    }
  }

  // Address patterns - common address indicators
  const addressPatterns = [
    /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Place|Pl|Way|Circle|Cir)\b/gi,
    /\b\d+\s+[A-Za-z\s]+(?:Apt|Apartment|Unit|Suite|Ste|#)\s*\d+/gi,
    /\b(?:PO Box|P\.O\. Box|P\.O\.\s*Box)\s*\d+/gi
  ];
  
  for (const pattern of addressPatterns) {
    if (pattern.test(sanitized)) {
      metadata.hasAddress = true;
      sanitized = sanitized.replace(pattern, remove ? '' : maskText);
    }
  }

  // Additional PII patterns
  const additionalPIIPatterns = [
    // Credit card numbers (basic pattern)
    /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    // Driver's license (varies by state, basic pattern)
    /\b[A-Z]\d{7,8}\b/g,
    // Passport numbers (basic pattern)
    /\b[A-Z]{1,2}\d{6,9}\b/g
  ];
  
  for (const pattern of additionalPIIPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, remove ? '' : maskText);
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
 * Creates a hash of content for logging purposes
 * Useful when you need to track content without storing PII
 */
export function createContentHash(content: string): string {
  // Simple hash function (for production, consider using crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sanitizes content for logging with metadata
 * Returns sanitized content and metadata for structured logging
 */
export function sanitizeForLogging(
  content: string,
  options: SanitizationOptions = {}
): { sanitizedContent: string; hash: string; metadata: SanitizedContent['metadata'] } {
  const sanitized = sanitizePII(content, options);
  const hash = createContentHash(content);
  
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
export function containsPII(content: string): boolean {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
  const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
  const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Place|Pl|Way|Circle|Cir)\b/i;
  
  return emailPattern.test(content) || 
         phonePattern.test(content) || 
         ssnPattern.test(content) || 
         addressPattern.test(content);
}
