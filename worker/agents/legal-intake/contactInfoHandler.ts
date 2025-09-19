import { isLocationSupported } from '../../utils/locationValidator.js';
import { ValidationService } from '../../services/ValidationService.js';
import { createValidationError, createSuccessResponse } from '../../utils/responseUtils.js';

export async function handleCollectContactInfo(parameters: any, env: any, teamConfig: any) {
  const { name, phone, email, location } = parameters;
  
  // Check for placeholder values
  if (ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Validate name if provided
  if (name && !ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided (but don't block if invalid)
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      // Don't block the conversation for invalid phone - just note it
      console.warn(`Invalid phone number provided: ${phone} - ${phoneValidation.error}`);
      // Continue with the conversation instead of blocking
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
        // Don't block the conversation - just note the jurisdiction issue and continue
        console.warn(`User in unsupported jurisdiction: ${location} - continuing with general guidance`);
      }
    }
  }
  
  if (!name) {
    return createValidationError("I need your name to proceed. Could you please provide your full name?");
  }
  
  // Check if we have at least one contact method (but don't block if missing)
  if (!phone && !email) {
    console.warn(`No contact method provided for ${name} - continuing with name only`);
  }
  
  return createSuccessResponse(
    `Thank you ${name}! I have your contact information. Now I need to understand your legal situation. Could you briefly describe what you need help with?`,
    { name, phone, email, location }
  );
}