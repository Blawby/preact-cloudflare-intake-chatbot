import { isLocationSupported } from '../../utils/locationValidator.js';
import { ValidationService } from '../../services/ValidationService.js';
import { createValidationError, createSuccessResponse } from '../../utils/responseUtils.js';
import type { Env, Team } from '../../types.js';

// Interface for contact information parameters
export interface ContactInfoParameters {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
}

// Runtime type guard for ContactInfoParameters
function isContactInfoParameters(obj: any): obj is ContactInfoParameters {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.name === 'string' &&
    (obj.phone === undefined || typeof obj.phone === 'string') &&
    (obj.email === undefined || typeof obj.email === 'string') &&
    (obj.location === undefined || typeof obj.location === 'string')
  );
}

export async function handleCollectContactInfo(parameters: ContactInfoParameters, env: Env, teamConfig: Team | null) {
  // Runtime validation of parameters
  if (!isContactInfoParameters(parameters)) {
    return createValidationError("Invalid contact information parameters provided.");
  }

  const { name, phone, email, location } = parameters;
  
  // Check for placeholder values - but only if both phone and email are provided
  if (phone && email && ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Check for placeholder values in individual fields
  if (phone && ValidationService.hasPlaceholderValues(phone)) {
    return createValidationError("I need your actual phone number to proceed. Could you please provide your real phone number?");
  }
  
  if (email && ValidationService.hasPlaceholderValues(undefined, email)) {
    return createValidationError("I need your actual email address to proceed. Could you please provide your real email address?");
  }
  
  // Validate name if provided
  if (name && !ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided - FAIL FAST if invalid
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return createValidationError(`Invalid phone number format: ${phoneValidation.error}. Please provide a valid phone number.`);
    }
  }
  
  // Validate location if provided
  if (location && !ValidationService.validateLocation(location)) {
    return createValidationError("Could you please provide your city and state or country?");
  }
  
  // First, verify jurisdiction if location is provided
  if (location) {
    const jurisdiction = teamConfig?.config?.jurisdiction;
    if (jurisdiction && jurisdiction.type) {
      const supportedStates = Array.isArray(jurisdiction.supportedStates) ? jurisdiction.supportedStates : [];
      const supportedCountries = Array.isArray(jurisdiction.supportedCountries) ? jurisdiction.supportedCountries : [];
      
      const isSupported = isLocationSupported(location, supportedStates, supportedCountries);
      
      if (!isSupported) {
        return createValidationError(`We don't currently provide services in ${location}. Please contact a local attorney in your area.`);
      }
    }
  }
  
  if (!name) {
    return createValidationError("I need your name to proceed. Could you please provide your full name?");
  }
  
  // Check if we have at least one contact method - FAIL FAST if missing
  if (!phone && !email) {
    return createValidationError("I need at least one way to contact you. Please provide either your phone number or email address.");
  }
  
  return createSuccessResponse(
    `Thank you ${name}! I have your contact information. Now I need to understand your legal situation. Could you briefly describe what you need help with?`,
    { name, phone, email, location }
  );
}