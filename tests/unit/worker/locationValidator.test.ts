import { describe, it, expect } from 'vitest';
import { validateLocation, isLocationSupported } from '../../../worker/utils/locationValidator';

describe('locationValidator', () => {
  describe('validateLocation', () => {
    it('should validate Nashville, TN correctly', () => {
      const location = 'nashville tn';
      const result = validateLocation(location);
      
      expect(result.isValid).toBe(true);
      expect(result.state).toBe('TN');
      expect(result.city).toBe('nashville');
      expect(result.country).toBeUndefined();
    });

    it('should validate Charlotte, NC correctly', () => {
      const location = 'Charlotte, NC';
      const result = validateLocation(location);
      
      expect(result.isValid).toBe(true);
      expect(result.state).toBe('NC');
      expect(result.city).toBe('Charlotte');
      expect(result.country).toBeUndefined();
    });

    it('should validate state codes correctly', () => {
      const testCases = [
        { input: 'NC', expected: { state: 'NC', city: undefined } },
        { input: 'TN', expected: { state: 'TN', city: undefined } },
        { input: 'CA', expected: { state: 'CA', city: undefined } },
        { input: 'NY', expected: { state: 'NY', city: undefined } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = validateLocation(input);
        expect(result.isValid).toBe(true);
        expect(result.state).toBe(expected.state);
        expect(result.city).toBe(expected.city);
      });
    });

    it('should validate state names correctly', () => {
      const testCases = [
        { input: 'North Carolina', expected: { state: 'NC', city: undefined } },
        { input: 'Tennessee', expected: { state: 'TN', city: undefined } },
        { input: 'California', expected: { state: 'CA', city: undefined } },
        { input: 'New York', expected: { state: 'NY', city: undefined } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = validateLocation(input);
        expect(result.isValid).toBe(true);
        expect(result.state).toBe(expected.state);
        expect(result.city).toBe(expected.city);
      });
    });

    it('should handle invalid locations', () => {
      const invalidLocations = [
        '',
        'a',
        'invalid location',
        '12345'
      ];

      invalidLocations.forEach(location => {
        const result = validateLocation(location);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('isLocationSupported', () => {
    const ncLegalServices = {
      supportedStates: ['NC'],
      supportedCountries: ['US']
    };

    it('should support North Carolina locations', () => {
      const ncLocations = [
        'Charlotte, NC',
        'Raleigh, NC',
        'NC',
        'North Carolina'
      ];

      ncLocations.forEach(location => {
        const isSupported = isLocationSupported(location, ncLegalServices.supportedStates, ncLegalServices.supportedCountries);
        expect(isSupported).toBe(true);
      });
    });

    it('should not support non-North Carolina locations', () => {
      const nonNcLocations = [
        'Nashville, TN',
        'Atlanta, GA',
        'New York, NY',
        'TN',
        'Tennessee'
      ];

      nonNcLocations.forEach(location => {
        const isSupported = isLocationSupported(location, ncLegalServices.supportedStates, ncLegalServices.supportedCountries);
        expect(isSupported).toBe(false);
      });
    });

    it('should support all locations when "all" is in supported states', () => {
      const allStatesConfig = {
        supportedStates: ['all'],
        supportedCountries: ['US']
      };

      const testLocations = [
        'Charlotte, NC',
        'Nashville, TN',
        'Atlanta, GA',
        'New York, NY'
      ];

      testLocations.forEach(location => {
        const isSupported = isLocationSupported(location, allStatesConfig.supportedStates, allStatesConfig.supportedCountries);
        expect(isSupported).toBe(true);
      });
    });

    it('should handle the Nashville, TN case for NC Legal Services', () => {
      const location = 'nashville tn';
      const isSupported = isLocationSupported(location, ncLegalServices.supportedStates, ncLegalServices.supportedCountries);
      
      // This should be false because Nashville, TN is not in NC Legal Services jurisdiction
      expect(isSupported).toBe(false);
    });
  });
}); 