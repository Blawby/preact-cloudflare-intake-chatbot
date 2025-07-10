import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validateCaseDetails } from '../../utils/conversationalForm';

describe('conversationalForm', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@numbers.com',
        'test.email@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example..com',
        '',
        '   ',
        'user name@example.com',
        'user@example com',
        'user@.',
        'user@example.',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        if (result === true) {
          console.log(`Unexpectedly valid email: "${email}"`);
        }
        expect(result).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
      expect(validateEmail({} as any)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '555-123-4567',
        '(555) 123-4567',
        '5551234567',
        '+1-555-123-4567',
      ];

      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '555-123',
        'abc-def-ghij',
        '',
        '   ',
      ];

      invalidPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(false);
      });
    });
  });

  describe('validateCaseDetails', () => {
    it('should validate case details with sufficient length', () => {
      const validDetails = [
        'This is a detailed case description with enough information.',
        'I need help with a contract dispute that has been ongoing for months.',
      ];

      validDetails.forEach(details => {
        expect(validateCaseDetails(details)).toBe(true);
      });
    });

    it('should reject case details that are too short', () => {
      const invalidDetails = [
        'Help',
        '',
        '   ',
        'Short',
        'No',
        '12345',
      ];

      invalidDetails.forEach(details => {
        const result = validateCaseDetails(details);
        if (result === true) {
          console.log(`Unexpectedly valid case details: "${details}" (length: ${details.length})`);
        }
        expect(result).toBe(false);
      });
    });
  });
}); 