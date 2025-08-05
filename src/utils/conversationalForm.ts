/**
 * Validation utilities for conversational form data
 */

/**
 * Validates email address format
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: any): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return false;
  }

  // Comprehensive email validation that prevents consecutive dots and ensures proper domain structure
  const emailRegex = /^[^\s@]+(\.[^\s@]+)*@[^\s@]+\.[^\s@]+$/;
  
  // Additional checks for common invalid patterns
  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }
  
  // Check for consecutive dots in local or domain part
  const [localPart, domainPart] = trimmedEmail.split('@');
  if (localPart.includes('..') || domainPart.includes('..')) {
    return false;
  }
  
  // Check that domain has at least one dot and proper structure
  if (!domainPart.includes('.') || domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return false;
  }
  
  return true;
}

/**
 * Validates phone number format
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function validatePhone(phone: any): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const trimmedPhone = phone.trim();
  if (!trimmedPhone) {
    return false;
  }

  // Remove all non-digit characters for validation
  const digitsOnly = trimmedPhone.replace(/\D/g, '');
  
  // Check if we have at least 10 digits (US phone number minimum)
  return digitsOnly.length >= 10;
}

/**
 * Validates matter details for sufficient length
 * @param details - Matter details to validate
 * @returns true if valid, false otherwise
 */
export function validateMatterDetails(details: any): boolean {
  if (!details || typeof details !== 'string') {
    return false;
  }

  const trimmedDetails = details.trim();
  if (!trimmedDetails) {
    return false;
  }

  // Require at least 10 characters for meaningful matter details
  return trimmedDetails.length >= 10;
} 