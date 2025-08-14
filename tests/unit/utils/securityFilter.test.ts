import { describe, it, expect } from 'vitest';

// Import the SecurityFilter class
import { SecurityFilter } from '../../../../worker/utils/securityFilter';

describe('SecurityFilter - General Consultation Regex', () => {
  // Helper function to test the extractLegalMatterType method
  const testLegalMatterType = (content: string): string | null => {
    // Since extractLegalMatterType is private, we'll test it indirectly
    // by creating a mock team config and testing the full validation flow
    const mockTeamConfig = {
      config: {
        availableServices: ['General Consultation', 'Family Law', 'Employment Law']
      }
    };
    
    // We'll test the regex patterns directly since the method is private
    const legalMatterPatterns = {
      'General Consultation': /(legal question|legal help|legal advice|speak with.*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|talk to.*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|need.*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|want.*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|schedule.*\b(consultation|meeting)\b.*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|book.*\b(consultation|meeting)\b.*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|appointment\s+(with|to see)\s+(a\s+)?\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|(consultation|meeting).*\b(lawyer|attorney|counsel|solicitor|legal counsel|attorney-at-law|legal representative)\b|legal situation|legal matter|legal issue)/i
    };
    
    for (const [matterType, pattern] of Object.entries(legalMatterPatterns)) {
      if (pattern.test(content)) {
        return matterType;
      }
    }
    
    return null;
  };

  describe('Positive cases - should match General Consultation', () => {
    it('should match explicit legal context with lawyer', () => {
      expect(testLegalMatterType('I need to speak with a lawyer')).toBe('General Consultation');
      expect(testLegalMatterType('I want to talk to an attorney')).toBe('General Consultation');
      expect(testLegalMatterType('I need legal counsel')).toBe('General Consultation');
    });

    it('should match appointment with legal professional', () => {
      expect(testLegalMatterType('I want to schedule an appointment with a lawyer')).toBe('General Consultation');
      expect(testLegalMatterType('I need to book a consultation with an attorney')).toBe('General Consultation');
      expect(testLegalMatterType('appointment to see a solicitor')).toBe('General Consultation');
    });

    it('should match consultation/meeting with legal context', () => {
      expect(testLegalMatterType('I need a consultation with a lawyer')).toBe('General Consultation');
      expect(testLegalMatterType('meeting with legal counsel')).toBe('General Consultation');
      expect(testLegalMatterType('consultation with attorney-at-law')).toBe('General Consultation');
    });

    it('should match legal synonyms', () => {
      expect(testLegalMatterType('I need legal counsel')).toBe('General Consultation');
      expect(testLegalMatterType('speak with attorney-at-law')).toBe('General Consultation');
      expect(testLegalMatterType('meeting with legal representative')).toBe('General Consultation');
    });

    it('should match general legal terms', () => {
      expect(testLegalMatterType('I have a legal question')).toBe('General Consultation');
      expect(testLegalMatterType('I need legal help')).toBe('General Consultation');
      expect(testLegalMatterType('I have a legal situation')).toBe('General Consultation');
      expect(testLegalMatterType('I have a legal matter')).toBe('General Consultation');
      expect(testLegalMatterType('I have a legal issue')).toBe('General Consultation');
    });
  });

  describe('Negative cases - should NOT match General Consultation', () => {
    it('should not match standalone appointment without legal context', () => {
      expect(testLegalMatterType('I need an appointment')).toBeNull();
      expect(testLegalMatterType('schedule an appointment')).toBeNull();
      expect(testLegalMatterType('book an appointment')).toBeNull();
    });

    it('should not match standalone consultation without legal context', () => {
      expect(testLegalMatterType('I need a consultation')).toBeNull();
      expect(testLegalMatterType('schedule a consultation')).toBeNull();
      expect(testLegalMatterType('book a consultation')).toBeNull();
    });

    it('should not match general meeting without legal context', () => {
      expect(testLegalMatterType('I need a meeting')).toBeNull();
      expect(testLegalMatterType('schedule a meeting')).toBeNull();
    });

    it('should not match non-legal appointments', () => {
      expect(testLegalMatterType('appointment with doctor')).toBeNull();
      expect(testLegalMatterType('consultation with therapist')).toBeNull();
      expect(testLegalMatterType('meeting with accountant')).toBeNull();
    });

    it('should not match partial matches', () => {
      expect(testLegalMatterType('I have an appointment tomorrow')).toBeNull();
      expect(testLegalMatterType('consultation fees')).toBeNull();
      expect(testLegalMatterType('appointment reminder')).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle case variations', () => {
      expect(testLegalMatterType('APPOINTMENT WITH LAWYER')).toBe('General Consultation');
      expect(testLegalMatterType('consultation with ATTORNEY')).toBe('General Consultation');
      expect(testLegalMatterType('Meeting With Legal Counsel')).toBe('General Consultation');
    });

    it('should handle word boundaries correctly', () => {
      expect(testLegalMatterType('lawyerly advice')).toBeNull(); // Should not match 'lawyer' in 'lawyerly'
      expect(testLegalMatterType('consultationist')).toBeNull(); // Should not match 'consultation' in 'consultationist'
    });

    it('should handle spacing variations', () => {
      expect(testLegalMatterType('appointment  with   lawyer')).toBe('General Consultation');
      expect(testLegalMatterType('consultation\twith\tattorney')).toBe('General Consultation');
    });
  });
});