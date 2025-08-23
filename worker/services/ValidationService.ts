import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { validateLocation as validateLocationUtil } from '../utils/locationValidator.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationService {
  /**
   * Validates a phone number using NANP (North American Numbering Plan) rules
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone || phone.trim() === '') {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    try {
      // Remove extension suffixes (e.g., "x123", "ext.123", "ext 123")
      const withoutExtension = phone.replace(/\s*(?:x|ext\.?|extension)\s*\d+$/i, '');
      
      // Clean the phone number - remove all non-digit characters
      const cleaned = withoutExtension.replace(/\D/g, '');
      
      // NANP validation patterns
      // Area code: [2-9]\d{2} (starts with 2-9, followed by 2 digits)
      // Exchange code: [2-9]\d{2} (starts with 2-9, followed by 2 digits)  
      // Subscriber number: \d{4} (4 digits)
      
      let normalizedNumber: string;
      
      // Handle 11-digit numbers with country code
      if (cleaned.length === 11 && cleaned.startsWith('1')) {
        normalizedNumber = cleaned.substring(1); // Remove leading '1'
      } else if (cleaned.length === 10) {
        normalizedNumber = cleaned;
      } else {
        return { isValid: false, error: 'Invalid phone number format' };
      }
      
      // Validate NANP structure: area code + exchange + subscriber
      const nanpPattern = /^([2-9]\d{2})([2-9]\d{2})(\d{4})$/;
      const match = normalizedNumber.match(nanpPattern);
      
      if (!match) {
        return { isValid: false, error: 'Invalid phone number format' };
      }
      
      // Additional validation: ensure area code and exchange code are valid
      const [, areaCode, exchangeCode] = match;
      
      // Area code cannot be 0 or 1, and exchange code cannot be 0 or 1
      if (areaCode.startsWith('0') || areaCode.startsWith('1') || 
          exchangeCode.startsWith('0') || exchangeCode.startsWith('1')) {
        return { isValid: false, error: 'Invalid phone number format' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Phone validation error' };
    }
  }

  /**
   * Validates an email address format
   */
  static validateEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validates a person's name
   */
  static validateName(name: string): boolean {
    if (!name) return false;
    const trimmedName = name.trim();
    return trimmedName.length >= 2 && trimmedName.length <= 100;
  }

  /**
   * Validates a location string
   */
  static validateLocation(location: string): boolean {
    if (!location) return false;
    const locationInfo = validateLocationUtil(location);
    return locationInfo.isValid;
  }

  /**
   * Checks if contact information contains placeholder values
   */
  static hasPlaceholderValues(phone?: string, email?: string): boolean {
    const placeholderPatterns = [/\[user_phone\]/i, /\[user_email\]/i];
    const emptyTokens = new Set(['', 'none', 'null', 'n/a', 'na', 'tbd', 'unknown']);
    const isEmptyish = (v?: string) => {
      if (v == null) return false;
      const t = v.trim().toLowerCase();
      return emptyTokens.has(t);
    };

    // Check phone for placeholders
    if (phone) {
      const trimmedPhone = phone.trim();
      if (isEmptyish(trimmedPhone)) return true;
      if (placeholderPatterns.some(pattern => pattern.test(trimmedPhone))) return true;
    }

    // Check email for placeholders
    if (email) {
      const trimmedEmail = email.trim();
      if (isEmptyish(trimmedEmail)) return true;
      if (placeholderPatterns.some(pattern => pattern.test(trimmedEmail))) return true;
    }

    return false;
  }

  /**
   * Validates matter type is not a placeholder
   */
  static validateMatterType(matterType: string): boolean {
    if (!matterType) return false;
    const invalidTypes = ['Unknown', 'unknown', 'None', 'null', ''];
    return !invalidTypes.includes(matterType.trim());
  }
}
