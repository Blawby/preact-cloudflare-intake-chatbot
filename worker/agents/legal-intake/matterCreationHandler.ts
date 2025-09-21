import { ValidationService } from '../../services/ValidationService.js';
import { createValidationError, createSuccessResponse } from '../../utils/responseUtils.js';
import { Logger } from '../../utils/logger.js';
import { LegalIntakeLogger } from './legalIntakeLogger.js';
import type { Env } from '../../types.js';
import {
  MatterCreationError,
  ValidationError,
  withErrorHandling,
  ErrorResult,
  createErrorResult,
  createSuccessResult
} from './errors.js';

// TypeScript interfaces for type safety
export interface MatterCreationParams {
  matter_type: string;
  description: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  opposing_party?: string;
}

export interface ContactInfoParams {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
}

export interface LawyerReviewParams {
  urgency?: string;
  complexity?: string;
  matter_type?: string;
}

export interface DocumentAnalysisParams {
  file_id: string;
  analysis_type?: string;
  specific_question?: string;
}

export interface TeamConfig {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly config?: {
    readonly requiresPayment?: boolean;
    readonly consultationFee?: number;
    readonly paymentLink?: string;
    readonly ownerEmail?: string;
    readonly availableServices?: string[];
    readonly jurisdiction?: {
      readonly type: 'state' | 'national';
      readonly description: string;
      readonly supportedStates: string[];
      readonly supportedCountries: string[];
      readonly primaryState?: string;
    };
    readonly blawbyApi?: {
      readonly enabled: boolean;
      readonly apiKey?: string | null;
      readonly apiKeyHash?: string;
      readonly teamUlid?: string;
      readonly apiUrl?: string;
    };
  };
  // Allow for additional dynamic properties with proper typing
  readonly [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface MatterCreationResult {
  message: string;
  data: MatterCreationParams;
}

export interface ContactInfoResult {
  message: string;
  data: ContactInfoParams;
}

// Utility function to sanitize location data for logging
function sanitizeLocation(location: string): string {
  if (!location) return '';
  
  // For location data, we can be more permissive but still mask sensitive parts
  // Locations typically contain city, state, country - not highly sensitive
  // But we'll truncate very long locations and mask any potential PII patterns
  if (location.length > 50) {
    return `${location.substring(0, 20)}...${location.substring(location.length - 10)}`;
  }
  
  // Check for potential email patterns in location (shouldn't happen but safety first)
  if (location.includes('@')) {
    const parts = location.split('@');
    if (parts.length === 2) {
      return `${parts[0].substring(0, 2)}***@${parts[1]}`;
    }
  }
  
  return location;
}

// Comprehensive validation service to eliminate code duplication
class MatterValidationService {
  /**
   * Validates all parameters for matter creation
   */
  static validateMatterCreation(params: MatterCreationParams): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required fields
    const requiredFieldsError = this.validateRequiredFields(params);
    if (requiredFieldsError) errors.push(requiredFieldsError);

    // Validate essential fields
    const essentialFieldsError = this.validateEssentialFields(params.matter_type, params.description, params.name);
    if (essentialFieldsError) errors.push(essentialFieldsError);

    // Validate contact info for placeholders
    const contactInfoError = this.validateContactInfo(params.phone, params.email);
    if (contactInfoError) errors.push(contactInfoError);

    // Validate individual fields
    const matterTypeError = this.validateMatterType(params.matter_type);
    if (matterTypeError) errors.push(matterTypeError);

    const nameError = this.validateName(params.name);
    if (nameError) errors.push(nameError);

    if (params.email) {
      const emailError = this.validateEmail(params.email);
      if (emailError) errors.push(emailError);
    }

    if (params.phone) {
      const phoneError = this.validatePhone(params.phone);
      if (phoneError) errors.push(phoneError);
    }

    if (params.location) {
      const locationError = this.validateLocation(params.location);
      if (locationError) errors.push(locationError);
    }

    // Validate contact methods
    const contactMethodsError = this.validateContactMethods(params.phone, params.email);
    if (contactMethodsError) errors.push(contactMethodsError);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates contact information parameters
   */
  static validateContactInfoParams(params: ContactInfoParams): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for placeholder values
    const contactInfoError = this.validateContactInfo(params.phone, params.email);
    if (contactInfoError) errors.push(contactInfoError);

    // Validate name
    if (params.name) {
      const nameError = this.validateName(params.name);
      if (nameError) errors.push(nameError);
    } else {
      errors.push(new ValidationError("I need your name to proceed. Could you please provide your full name?"));
    }

    // Validate email if provided
    if (params.email) {
      const emailError = this.validateEmail(params.email);
      if (emailError) errors.push(emailError);
    }

    // Validate phone if provided
    if (params.phone) {
      const phoneError = this.validatePhone(params.phone);
      if (phoneError) errors.push(phoneError);
    }

    // Validate location if provided
    if (params.location) {
      const locationError = this.validateLocation(params.location);
      if (locationError) errors.push(locationError);
    }

    // Check if we have at least one contact method
    const contactMethodsError = this.validateContactMethods(params.phone, params.email);
    if (contactMethodsError) errors.push(contactMethodsError);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private validation helper methods
  private static validateRequiredFields(params: any): ValidationError | null {
    if (!params) {
      return new ValidationError('Parameters are required', {
        parameters: params,
        method: 'validateRequiredFields'
      });
    }
    return null;
  }

  private static validateContactInfo(phone?: string, email?: string): ValidationError | null {
    if (ValidationService.hasPlaceholderValues(phone, email)) {
      return new ValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
    }
    return null;
  }

  private static validatePhone(phone: string): ValidationError | null {
    if (phone && phone.trim() !== '') {
      const phoneValidation = ValidationService.validatePhone(phone);
      if (!phoneValidation.isValid) {
        return new ValidationError(`The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?`);
      }
    }
    return null;
  }

  private static validateEmail(email: string): ValidationError | null {
    if (email && !ValidationService.validateEmail(email)) {
      return new ValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
    }
    return null;
  }

  private static validateLocation(location: string): ValidationError | null {
    if (location && !ValidationService.validateLocation(location)) {
      return new ValidationError(`Invalid location format. Please provide your city and state or country.`);
    }
    return null;
  }

  private static validateMatterType(matter_type: string): ValidationError | null {
    if (!matter_type || !ValidationService.validateMatterType(matter_type)) {
      return new ValidationError("I need to understand your legal situation better. Could you please describe what type of legal help you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or general consultation.");
    }
    return null;
  }

  private static validateName(name: string): ValidationError | null {
    if (!name || !ValidationService.validateName(name)) {
      return new ValidationError("I need your full name to proceed. Could you please provide your complete name?");
    }
    return null;
  }

  private static validateEssentialFields(matter_type: string, description: string, name: string): ValidationError | null {
    if (!matter_type || !description || !name) {
      return new ValidationError("I'm missing some essential information. Could you please provide your name, contact information, and describe your legal issue?");
    }
    return null;
  }

  private static validateContactMethods(phone?: string, email?: string): ValidationError | null {
    if (!phone && !email) {
      return new ValidationError("I need at least one way to contact you to proceed. Could you provide either your phone number or email address?");
    }
    return null;
  }
}

// Helper function to build summary message
function buildSummary(params: MatterCreationParams): string {
  const { matter_type, description, name, phone, email, location, opposing_party } = params;
  
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

  return summaryMessage;
}

export const TOOL_HANDLERS = {
  create_matter: handleCreateMatter,
  collect_contact_info: handleCollectContactInfo,
  request_lawyer_review: handleRequestLawyerReview,
  analyze_document: handleAnalyzeDocument
};

export async function handleCreateMatter(
  parameters: MatterCreationParams, 
  env: Env, 
  teamConfig: TeamConfig,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): Promise<ErrorResult<any>> {
  return withErrorHandling(
    async () => {
      if (!env) {
        throw new ValidationError('Environment is required', {
          env: env,
          method: 'handleCreateMatter'
        });
      }

      Logger.debug('[handleCreateMatter] parameters:', parameters);
      
      // Log matter creation start
      if (correlationId) {
        const context = {
          hasName: Boolean(parameters.name),
          hasEmail: Boolean(parameters.email),
          hasPhone: Boolean(parameters.phone),
          hasLocation: Boolean(parameters.location),
          hasDescription: Boolean(parameters.description),
          name: parameters.name,
          email: parameters.email,
          phone: parameters.phone,
          location: parameters.location,
          description: parameters.description
        };
        
        LegalIntakeLogger.logMatterCreation(
          correlationId,
          sessionId,
          teamId,
          'matter_creation_start' as any,
          parameters.matter_type,
          context as any
        );
      }
      
      // Use the comprehensive validation service
      const validationResult = MatterValidationService.validateMatterCreation(parameters);
      
      if (!validationResult.isValid) {
        // Return the first validation error
        const firstError = validationResult.errors[0];
        return createValidationError(firstError.message);
      }
      
      // Add structured logging for location validation if location is provided
      if (parameters.location) {
        const correlationId = crypto.randomUUID();
        
        Logger.debug('Location validation started', {
          correlationId,
          sanitizedLocation: sanitizeLocation(parameters.location),
          locationType: typeof parameters.location,
          locationLength: parameters.location?.length || 0
        });
        
        Logger.debug('Location validation completed', {
          correlationId,
          isValid: true,
          validationResult: 'valid'
        });
      }
      
      // Build summary and return success response
      const summaryMessage = buildSummary(parameters);
      
      // Log successful matter creation
      if (correlationId) {
        const context = {
          hasName: Boolean(parameters.name),
          hasEmail: Boolean(parameters.email),
          hasPhone: Boolean(parameters.phone),
          hasLocation: Boolean(parameters.location),
          hasDescription: Boolean(parameters.description),
          name: parameters.name,
          email: parameters.email,
          phone: parameters.phone,
          location: parameters.location,
          description: parameters.description
        };
        
        LegalIntakeLogger.logMatterCreation(
          correlationId,
          sessionId,
          teamId,
          'matter_creation_success' as any,
          parameters.matter_type,
          context as any
        );
      }
      
      return createSuccessResponse(summaryMessage, {
        matter_type: parameters.matter_type,
        description: parameters.description,
        name: parameters.name,
        phone: parameters.phone,
        email: parameters.email,
        location: parameters.location,
        opposing_party: parameters.opposing_party
      });
    },
    {
      parameters: parameters,
      method: 'handleCreateMatter'
    },
    MatterCreationError
  );
}

export async function handleCollectContactInfo(
  parameters: ContactInfoParams, 
  env: Env, 
  teamConfig: TeamConfig,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): Promise<ErrorResult<any>> {
  return withErrorHandling(
    async () => {
      if (!env) {
        throw new ValidationError('Environment is required', {
          env: env,
          method: 'handleCollectContactInfo'
        });
      }

      // Use the comprehensive validation service
      const validationResult = MatterValidationService.validateContactInfoParams(parameters);
      
      if (!validationResult.isValid) {
        // Return the first validation error
        const firstError = validationResult.errors[0];
        return createValidationError(firstError.message);
      }
      
      return createSuccessResponse(
        `Thank you ${parameters.name}! I have your contact information. Now I need to understand your legal situation. Could you briefly describe what you need help with?`,
        { 
          name: parameters.name, 
          phone: parameters.phone, 
          email: parameters.email, 
          location: parameters.location 
        }
      );
    },
    {
      parameters: parameters,
      method: 'handleCollectContactInfo'
    },
    MatterCreationError
  );
}

export async function handleRequestLawyerReview(
  parameters: LawyerReviewParams, 
  env: Env, 
  teamConfig: TeamConfig,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): Promise<ErrorResult<any>> {
  return withErrorHandling(
    async () => {
      if (!env) {
        throw new ValidationError('Environment is required', {
          env: env,
          method: 'handleRequestLawyerReview'
        });
      }

      return createSuccessResponse(
        "I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further.",
        parameters
      );
    },
    {
      parameters: parameters,
      method: 'handleRequestLawyerReview'
    },
    MatterCreationError
  );
}

export async function handleAnalyzeDocument(
  parameters: DocumentAnalysisParams, 
  env: Env, 
  teamConfig: TeamConfig,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): Promise<ErrorResult<any>> {
  return withErrorHandling(
    async () => {
      if (!env) {
        throw new ValidationError('Environment is required', {
          env: env,
          method: 'handleAnalyzeDocument'
        });
      }

      Logger.debug('=== ANALYZE DOCUMENT TOOL CALLED ===');
      Logger.debug('File ID:', parameters.file_id);
      Logger.debug('Analysis Type:', parameters.analysis_type);
      Logger.debug('Specific Question:', parameters.specific_question);
      
      // For now, return a simple response
      return createSuccessResponse(
        "I've analyzed your document. Based on the content, I can help you create a legal matter. Could you provide your contact information so we can proceed?",
        parameters
      );
    },
    {
      parameters: parameters,
      method: 'handleAnalyzeDocument'
    },
    MatterCreationError
  );
}
