/**
 * Redacts sensitive information from tool parameters for safe logging
 * Recursively walks the entire value tree and redacts sensitive data based on field names and value patterns
 */
export function redactParameters(parameters: any): any {
  return redactValue(parameters);
}

/**
 * Recursively redacts sensitive values throughout the entire object tree
 * @private
 */
function redactValue(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '***DEPTH_LIMIT***';
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactValue(item, depth + 1));
  }
  
  // Handle objects
  if (obj && typeof obj === 'object') {
    const result = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      const lowerKey = key.toLowerCase();
      
      // Check if key matches sensitive field patterns
      const sensitiveFields = [
        'name', 'email', 'phone', 'address', 'location', 'ssn', 'social_security',
        'credit_card', 'card_number', 'account_number', 'routing_number',
        'password', 'token', 'secret', 'key', 'credential',
        'description', 'details', 'notes', 'comments', 'message',
        'opposing_party', 'client_info', 'personal_info'
      ];
      
      const isSensitiveKey = sensitiveFields.some(field => lowerKey.includes(field));
      
      // Check if value matches sensitive patterns
      const isSensitiveValue = typeof value === 'string' && (
        // Email pattern
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
        // Phone number pattern (various formats)
        /^[\+]?[0-9\s\-\(\)]{7,20}$/.test(value) ||
        // SSN pattern
        /^\d{3}-?\d{2}-?\d{4}$/.test(value) ||
        // Credit card pattern
        /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value) ||
        // Token/secret pattern (long alphanumeric strings)
        /^[a-zA-Z0-9]{20,}$/.test(value)
      );
      
      if (isSensitiveKey || isSensitiveValue) {
        if (typeof value === 'string') {
          if (value.includes('@')) {
            // Email-like field - mask local part
            const emailParts = value.split('@');
            if (emailParts.length === 2 && 
                emailParts[0]?.trim() && 
                emailParts[1]?.trim()) {
              const [local, domain] = emailParts;
              const trimmedLocal = local.trim();
              const trimmedDomain = domain.trim();
              if (trimmedLocal.length >= 2) {
                result[key] = `${trimmedLocal.substring(0, 2)}***@${trimmedDomain}`;
              } else {
                result[key] = `***@${trimmedDomain}`;
              }
            } else {
              // Fallback for malformed email addresses
              result[key] = '***REDACTED***';
            }
          } else if (value.length > 4) {
            // Long string - show first and last few characters
            result[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
          } else {
            result[key] = '***REDACTED***';
          }
        } else {
          result[key] = '***REDACTED***';
        }
      } else {
        // Recursively process non-sensitive values
        result[key] = redactValue(value, depth + 1);
      }
    }
    return result;
  }
  
  // Return primitives as-is
  return obj;
}