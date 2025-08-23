import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { validateLocation as validateLocationUtil } from '../utils/locationValidator.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationService {
  /**
   * Validates a phone number using libphonenumber-js
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone || phone.trim() === '') {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    try {
      const phoneNumber = parsePhoneNumber(phone, 'US');
      
      if (!phoneNumber) {
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
