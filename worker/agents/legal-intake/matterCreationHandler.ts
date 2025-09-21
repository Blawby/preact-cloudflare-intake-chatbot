import { ValidationService } from '../../services/ValidationService.js';
import { createValidationError, createSuccessResponse } from '../../utils/responseUtils.js';
import { Logger } from '../../utils/logger.js';

export const TOOL_HANDLERS = {
  create_matter: handleCreateMatter,
  collect_contact_info: handleCollectContactInfo,
  request_lawyer_review: handleRequestLawyerReview,
  analyze_document: handleAnalyzeDocument
};

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any): Promise<any> {
  Logger.debug('[handleCreateMatter] parameters:', parameters);
  
  const { matter_type, description, name, phone, email, location, opposing_party } = parameters;
  
  // Check for placeholder values
  if (ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Validate required fields
  if (!matter_type || !description || !name) {
    return createValidationError("I'm missing some essential information. Could you please provide your name, contact information, and describe your legal issue?");
  }
  
  // Validate matter type
  if (!ValidationService.validateMatterType(matter_type)) {
    return createValidationError("I need to understand your legal situation better. Could you please describe what type of legal help you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or general consultation.");
  }
  
  // Validate name format
  if (!ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return createValidationError(`The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?`);
    }
  }
  
  // Validate location if provided
  if (location) {
    console.log('🔍 Location Validation Debug:', {
      location,
      locationType: typeof location,
      locationLength: location?.length || 0
    });
    const locationValidation = ValidationService.validateLocation(location);
    console.log('🔍 Location Validation Result:', locationValidation);
    if (!locationValidation) {
      return createValidationError(`Invalid location format. Please provide your city and state or country.`);
    }
  }
  
  if (!phone && !email) {
    return createValidationError("I need at least one way to contact you to proceed. Could you provide either your phone number or email address?");
  }
  
  // Build summary message
  let summaryMessage = `Perfect! I have all the information I need. Here's a summary of your matter:

**Client Information:**
- Name: ${name}
- Contact: ${phone || 'Not provided'}${email ? `, ${email}` : ''}${location ? `, ${location}` : ''}`;

  if (opposing_party) {
    summaryMessage += `
- Opposing Party: ${opposing_party}`;
  }

  summaryMessage += `

**Matter Details:**
- Type: ${matter_type}
- Description: ${description}

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.`;
  
  return createSuccessResponse(summaryMessage, {
    matter_type,
    description,
    name,
    phone,
    email,
    location,
    opposing_party
  });
}

export async function handleCollectContactInfo(parameters: any, env: any, teamConfig: any): Promise<any> {
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
  
  // Validate phone if provided
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return createValidationError(`The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?`);
    }
  }
  
  // Validate location if provided
  if (location && !ValidationService.validateLocation(location)) {
    return createValidationError("Could you please provide your city and state or country?");
  }
  
  if (!name) {
    return createValidationError("I need your name to proceed. Could you please provide your full name?");
  }
  
  // Check if we have at least one contact method
  if (!phone && !email) {
    return createValidationError("I have your name, but I need at least one way to contact you. Could you provide either your phone number or email address?");
  }
  
  return createSuccessResponse(
    `Thank you ${name}! I have your contact information. Now I need to understand your legal situation. Could you briefly describe what you need help with?`,
    { name, phone, email, location }
  );
}

export async function handleRequestLawyerReview(parameters: any, env: any, teamConfig: any): Promise<any> {
  const { urgency, complexity, matter_type } = parameters;
  
  return createSuccessResponse("I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further.");
}

export async function handleAnalyzeDocument(parameters: any, env: any, teamConfig: any): Promise<any> {
  const { file_id, analysis_type, specific_question } = parameters;
  
  Logger.debug('=== ANALYZE DOCUMENT TOOL CALLED ===');
  Logger.debug('File ID:', file_id);
  Logger.debug('Analysis Type:', analysis_type);
  Logger.debug('Specific Question:', specific_question);
  
  // For now, return a simple response
  return createSuccessResponse("I've analyzed your document. Based on the content, I can help you create a legal matter. Could you provide your contact information so we can proceed?");
}
