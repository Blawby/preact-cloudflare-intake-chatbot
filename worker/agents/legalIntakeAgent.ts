import { isLocationSupported } from '../utils/locationValidator';
import { CloudflareLocationInfo } from '../utils/cloudflareLocationValidator';
import { ValidationService } from '../services/ValidationService';
import { TeamService } from '../services/TeamService';
import { PaymentServiceFactory } from '../services/PaymentServiceFactory';
import { createValidationError, createSuccessResponse } from '../utils/responseUtils';
import { analyzeFile, getAnalysisQuestion } from '../utils/fileAnalysisUtils';
// PromptBuilder removed for performance optimization
import { Logger } from '../utils/logger';
import { ToolCallParser } from '../utils/toolCallParser';
import type { Env, FileAttachment } from '../types';
import type { Team } from '../services/TeamService';
import type { ErrorResult } from './legal-intake/errors';
import { createSuccessResult, createErrorResult, ValidationError } from './legal-intake/errors';
import { safeIncludes } from '../utils/safeStringUtils';


// Import shared types from types.ts
import type { AgentMessage, AgentResponse } from '../types.js';

// Contact form field interface
export interface ContactFormField {
  readonly required: boolean;
  readonly label: string;
}

// Contact form fields interface
export interface ContactFormFields {
  readonly name: ContactFormField;
  readonly email: ContactFormField;
  readonly phone: ContactFormField;
  readonly location: ContactFormField;
  readonly opposing_party: ContactFormField;
  readonly message: ContactFormField;
}

// Contact form data interface
export interface ContactFormData {
  readonly reason: string;
  readonly fields: ContactFormFields;
  readonly submitText: string;
}

// Contact form parameters interface
export interface ContactFormParameters {
  readonly reason?: string;
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly location?: string;
  readonly message?: string;
}


// Contact form response interface
export interface ContactFormResponse {
  readonly success: boolean;
  readonly action: string;
  readonly message: string;
  readonly contactForm: ContactFormData;
}

// Currency enum for type-safe currency handling
export enum Currency {
  USD = 'USD',
  CAD = 'CAD',
  EUR = 'EUR',
  GBP = 'GBP'
}

// Branded type for ISO date strings to ensure proper format
export type ISODateString = string & { __isoDate: true };

// Recipient interface with explicit required fields
export interface Recipient {
  readonly email: string;
  readonly name: string;
}

// Runtime validation helper for ISO 8601 date format
export function validateISODate(dateString: string): dateString is ISODateString {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!isoDateRegex.test(dateString) && !simpleDateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString.split('T')[0]);
}

// Payment invoice request parameters interface - aligned with tool schema
export interface PaymentInvoiceParameters {
  readonly invoice_id: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly recipient: Recipient;
  readonly description: string;
  readonly due_date?: ISODateString;
}


// Payment invoice response interface
export interface PaymentInvoiceResponse {
  readonly success: boolean;
  readonly action?: string;
  readonly message?: string;
  readonly payment?: {
    readonly invoiceUrl: string;
    readonly paymentId: string;
    readonly amount: number;
    readonly serviceType: string;
    readonly sessionId?: string;
  };
  readonly error?: string;
  readonly errorDetails?: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
    readonly timestamp: string;
  };
}

// Error payload interface for detailed error information
export interface ErrorPayload {
  readonly success: false;
  readonly error: string;
  readonly errorDetails: {
    readonly code?: string;
    readonly message: string;
    readonly retryable?: boolean;
    readonly timestamp: string;
    readonly originalError?: string;
    readonly sessionId?: string;
    readonly validationErrors?: string[];
  };
}

/**
 * Redacts sensitive information from tool parameters for safe logging
 * Recursively walks the entire value tree and redacts sensitive data based on field names and value patterns
 */
function redactParameters(parameters: any): any {
  return redactValue(parameters);
}

/**
 * Recursively redacts sensitive values throughout the entire object tree
 * @private
 */
function redactValue(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '***DEPTH_LIMIT***';
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactValue(item, depth + 1));
  }
  
  // Handle objects
  if (obj && typeof obj === 'object') {
    const result = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      const lowerKey = key.toLowerCase();
      
      // Check if key matches sensitive field patterns
      const sensitiveFields = [
        'name', 'email', 'phone', 'address', 'location', 'ssn', 'social_security',
        'credit_card', 'card_number', 'account_number', 'routing_number',
        'password', 'token', 'secret', 'key', 'credential',
        'description', 'details', 'notes', 'comments', 'message',
        'opposing_party', 'client_info', 'personal_info'
      ];
      
      const isSensitiveKey = sensitiveFields.some(field => lowerKey.includes(field));
      
      // Check if value matches sensitive patterns
      const isSensitiveValue = typeof value === 'string' && (
        // Email pattern
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
        // Phone number pattern (various formats)
        /^[\+]?[0-9\s\-\(\)]{7,20}$/.test(value) ||
        // SSN pattern
        /^\d{3}-?\d{2}-?\d{4}$/.test(value) ||
        // Credit card pattern
        /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value) ||
        // Token/secret pattern (long alphanumeric strings)
        /^[a-zA-Z0-9]{20,}$/.test(value)
      );
      
      if (isSensitiveKey || isSensitiveValue) {
        if (typeof value === 'string' && value) {
          if (safeIncludes(value, '@')) {
            // Email-like field - mask local part
            const [local, domain] = value.split('@');
            result[key] = `${local.substring(0, 2)}***@${domain}`;
          } else if (value.length > 4) {
            // Long string - show first and last few characters
            result[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
          } else {
            result[key] = '***REDACTED***';
          }
        } else {
          result[key] = '***REDACTED***';
        }
      } else {
        // Recursively process non-sensitive values
        result[key] = redactValue(value, depth + 1);
      }
    }
    return result;
  }
  
  // Return primitives as-is
  return obj;
}

// AI Model Configuration
const AI_MODEL_CONFIG = {
  model: '@cf/meta/llama-3.1-8b-instruct',
  maxTokens: 500,
  temperature: 0.1
} as const;

// Tool definitions with structured schemas

export const createMatter = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string', 
        description: 'Type of legal matter',
        enum: ['Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury', 'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review', 'Property Law', 'Administrative Law', 'General Consultation']
      },
      description: { type: 'string', description: 'Brief description of the legal issue' },
      name: { type: 'string', description: 'Client full name' },
      phone: { type: 'string', description: 'Client phone number' },
      email: { type: 'string', description: 'Client email address' },
      location: { type: 'string', description: 'Client location (city and state)' },
      opposing_party: { type: 'string', description: 'Opposing party name if applicable' }
    },
    required: ['matter_type', 'description', 'name']
  }
};

export const requestLawyerReview = {
  name: 'request_lawyer_review',
  description: 'Request lawyer review for complex matters',
  parameters: {
    type: 'object',
    properties: {
      complexity: { type: 'string', description: 'Matter complexity level' },
      matter_type: { type: 'string', description: 'Type of legal matter' }
    },
    required: ['matter_type']
  }
};



export const analyzeDocument = {
  name: 'analyze_document',
  description: 'Analyze an uploaded document or image to extract key information for legal intake',
  parameters: {
    type: 'object',
    properties: {
      file_id: { 
        type: 'string', 
        description: 'The file ID of the uploaded document to analyze',
        pattern: '^[a-zA-Z0-9\\-_]+$'
      },
      analysis_type: { 
        type: 'string', 
        description: 'Type of analysis to perform',
        enum: ['general', 'legal_document', 'contract', 'government_form', 'medical_document', 'image', 'resume'],
        default: 'general'
      },
      specific_question: { 
        type: 'string', 
        description: 'Optional specific question to ask about the document',
        maxLength: 500
      }
    },
    required: ['file_id']
  }
};

export const buildCaseDraft = {
  name: 'build_case_draft',
  description: 'Build a structured case draft with organized information for attorney review',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { 
        type: 'string', 
        description: 'Type of legal matter',
        enum: ['Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury', 'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review', 'Property Law', 'Administrative Law', 'General Consultation']
      },
      key_facts: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Key facts and events in chronological order'
      },
      timeline: { 
        type: 'string', 
        description: 'Timeline of events and important dates'
      },
      parties: { 
        type: 'array', 
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'Role in the case (e.g., client, opposing party, witness)' },
            name: { type: 'string', description: 'Name of the party' },
            relationship: { type: 'string', description: 'Relationship to the case' }
          },
          required: ['role']
        },
        description: 'Parties involved in the case'
      },
      documents: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Documents mentioned or available'
      },
      evidence: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Evidence and supporting materials'
      },
      jurisdiction: { 
        type: 'string', 
        description: 'Jurisdiction or location where the matter occurred'
      },
      urgency: { 
        type: 'string', 
        description: 'Urgency level of the matter',
        enum: ['low', 'normal', 'high', 'urgent']
      }
    },
    required: ['matter_type', 'key_facts']
  }
};

export const createPaymentInvoice = {
  name: 'create_payment_invoice',
  description: 'Create a payment invoice for consultation or legal services',
  parameters: {
    type: 'object',
    properties: {
      customer_name: { type: 'string', description: 'Customer full name' },
      customer_email: { type: 'string', description: 'Customer email address' },
      customer_phone: { type: 'string', description: 'Customer phone number' },
      matter_type: { type: 'string', description: 'Type of legal matter' },
      matter_description: { type: 'string', description: 'Description of the legal issue' },
      amount: { type: 'number', description: 'Amount in cents (e.g., 7500 for $75.00)' },
      service_type: { 
        type: 'string', 
        description: 'Type of service being billed',
        enum: ['consultation', 'document_review', 'legal_advice', 'case_preparation']
      }
    },
    required: ['customer_name', 'customer_email', 'customer_phone', 'matter_type', 'matter_description', 'amount', 'service_type']
  }
};

// Contact form request handler
async function handleRequestContactForm(parameters: any, env: any, teamConfig?: any): Promise<ContactFormResponse> {
  // Validate required reason field
  if (!parameters || typeof parameters !== 'object') {
    throw new Error('Invalid parameters: expected object');
  }
  
  const { reason } = parameters;
  
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error('Invalid reason: expected non-empty string');
  }
  
  return {
    success: true,
    action: 'show_contact_form',
    message: `I'd be happy to help you with ${reason.toLowerCase()}. Please fill out the contact form below so we can get in touch with you.`,
    contactForm: {
      reason,
      fields: {
        name: { required: true, label: 'Full Name' },
        email: { required: true, label: 'Email Address' },
        phone: { required: false, label: 'Phone Number' },
        location: { required: true, label: 'Location (City, State)' },
        opposing_party: { required: false, label: 'Opposing Party (if applicable)' },
        message: { required: true, label: 'Brief description of your legal issue' }
      },
      submitText: 'Submit Contact Form'
    }
  };
}

// Payment invoice handler with proper TypeScript types and dependency injection
async function handleCreatePaymentInvoice(
  parameters: PaymentInvoiceParameters, 
  env: Env, 
  teamConfig?: Team
): Promise<PaymentInvoiceResponse | ErrorPayload> {
  // Generate unique session ID for idempotency
  const sessionId = crypto.randomUUID();
  
  // Validate team configuration
  if (!teamConfig?.id) {
    return {
      success: false,
      error: 'Team configuration missing: team ID is required for payment processing',
      errorDetails: {
        code: 'MISSING_TEAM_CONFIG',
        message: 'Team configuration is missing or invalid',
        retryable: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Validate input parameters
  const validationErrors: string[] = [];
  
  if (!parameters.invoice_id || typeof parameters.invoice_id !== 'string' || parameters.invoice_id.trim().length === 0) {
    validationErrors.push('invoice_id is required and must be a non-empty string');
  }
  
  if (typeof parameters.amount !== 'number' || parameters.amount <= 0) {
    validationErrors.push('amount is required and must be a positive number');
  }
  
  if (!parameters.currency || !Object.values(Currency).includes(parameters.currency)) {
    validationErrors.push('currency is required and must be one of: USD, CAD, EUR, GBP');
  }
  
  if (!parameters.recipient || typeof parameters.recipient !== 'object') {
    validationErrors.push('recipient is required and must be an object');
  } else {
    if (!parameters.recipient.email || typeof parameters.recipient.email !== 'string' || parameters.recipient.email.trim().length === 0) {
      validationErrors.push('recipient.email is required and must be a non-empty string');
    }
    if (!parameters.recipient.name || typeof parameters.recipient.name !== 'string' || parameters.recipient.name.trim().length === 0) {
      validationErrors.push('recipient.name is required and must be a non-empty string');
    }
  }
  
  if (!parameters.description || typeof parameters.description !== 'string' || parameters.description.trim().length === 0) {
    validationErrors.push('description is required and must be a non-empty string');
  }
  
  // Validate due_date if provided - must be valid ISO date format
  if (parameters.due_date && !validateISODate(parameters.due_date)) {
    validationErrors.push('due_date must be a valid ISO 8601 date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)');
  }
  
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: 'Validation failed: ' + validationErrors.join('; '),
      errorDetails: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        retryable: false,
        timestamp: new Date().toISOString(),
        validationErrors
      }
    };
  }

  const { 
    invoice_id,
    amount, 
    currency,
    recipient,
    description,
    due_date
  } = parameters;

  try {
    // Create payment service using dependency injection
    const paymentService = PaymentServiceFactory.createPaymentService(env);
    
    // Create payment request with proper typing and unique session ID
    const paymentRequest = {
      customerInfo: {
        name: recipient.name,
        email: recipient.email,
        phone: '', // Not provided in new schema
        location: '' // Default empty location as required by PaymentRequest interface
      },
      matterInfo: {
        type: 'consultation', // Default type since not in new schema
        description: description,
        urgency: 'normal', // Default urgency as required by PaymentRequest interface
        opposingParty: '' // Default empty opposing party
      },
      teamId: teamConfig.id, // Use validated team ID
      sessionId: sessionId, // Use generated unique session ID for idempotency
      invoiceId: invoice_id, // Add invoice ID
      currency: currency, // Add currency
      dueDate: due_date // Add due date if provided
    };

    // Call payment service with retry logic (handled internally)
    const result = await paymentService.createInvoice(paymentRequest);

    if (result.success) {
      return {
        success: true,
        action: 'show_payment',
        message: `I've created a payment invoice for your consultation. Please complete the payment to proceed.`,
        payment: {
          invoiceUrl: result.invoiceUrl!,
          paymentId: result.paymentId!,
          amount: amount,
          serviceType: 'consultation',
          sessionId: sessionId // Include session ID for correlation
        }
      };
    } else {
      // Return detailed error information for debugging
      return {
        success: false,
        error: result.error || 'Failed to create payment invoice',
        errorDetails: {
          code: 'PAYMENT_SERVICE_ERROR',
          message: result.error || 'Failed to create payment invoice',
          retryable: true, // Payment service errors are generally retryable
          timestamp: new Date().toISOString(),
          sessionId: sessionId, // Include session ID for correlation
          originalError: result.error
        }
      };
    }
  } catch (error) {
    // Log detailed error information
    Logger.error('❌ Payment invoice creation failed:', error);
    
    // Return detailed error payload for debugging
    return {
      success: false,
      error: 'Payment service unavailable. Please try again later.',
      errorDetails: {
        code: 'PAYMENT_SERVICE_EXCEPTION',
        message: 'Payment service threw an exception during invoice creation',
        retryable: true,
        timestamp: new Date().toISOString(),
        sessionId: sessionId, // Include session ID for correlation
        originalError: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

// Validation utilities for contact form parameters
function validateContactFormParameters(parameters: unknown): { isValid: boolean; error?: string; params?: ContactFormParameters } {
  // Check if parameters exist and is an object
  if (!parameters || typeof parameters !== 'object') {
    return { isValid: false, error: 'Invalid parameters: expected object' };
  }

  const params = parameters as Record<string, unknown>;
  const resultParams: Partial<ContactFormParameters> = {};
  
  // Validate reason if provided
  if (params.reason !== undefined) {
    if (typeof params.reason !== 'string' || params.reason.trim().length === 0) {
      return { isValid: false, error: 'Invalid reason: expected non-empty string' };
    }
    (resultParams as any).reason = params.reason;
  }

  // Validate name if provided
  if (params.name !== undefined) {
    if (typeof params.name !== 'string' || params.name.trim().length === 0) {
      return { isValid: false, error: 'Invalid name: expected non-empty string' };
    }
    (resultParams as any).name = params.name;
  }

  // Validate email if provided
  if (params.email !== undefined) {
    if (typeof params.email !== 'string' || !ValidationService.validateEmail(params.email)) {
      return { isValid: false, error: 'Invalid email: expected valid email address' };
    }
    (resultParams as any).email = params.email;
  }

  // Validate phone if provided
  if (params.phone !== undefined) {
    if (typeof params.phone !== 'string') {
      return { isValid: false, error: 'Invalid phone: expected string' };
    }
    if (params.phone.trim() !== '') {
      const phoneValidation = ValidationService.validatePhone(params.phone);
      if (!phoneValidation.isValid) {
        return { isValid: false, error: `Invalid phone: ${phoneValidation.error}` };
      }
    }
    (resultParams as any).phone = params.phone;
  }

  // Validate location if provided
  if (params.location !== undefined) {
    if (typeof params.location !== 'string' || params.location.trim().length === 0) {
      return { isValid: false, error: 'Invalid location: expected non-empty string' };
    }
    (resultParams as any).location = params.location;
  }

  // Validate message if provided
  if (params.message !== undefined) {
    if (typeof params.message !== 'string' || params.message.trim().length === 0) {
      return { isValid: false, error: 'Invalid message: expected non-empty string' };
    }
    (resultParams as any).message = params.message;
  }

  return { 
    isValid: true, 
    params: Object.keys(resultParams).length ? (resultParams as ContactFormParameters) : undefined
  };
}

// Handler for showing contact form with proper types and validation
// Compatible with both old and new systems
async function handleShowContactForm(
  parameters: unknown, 
  env: Env, 
  teamConfig?: Team,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): Promise<ErrorResult<ContactFormResponse>> {
  try {
    // Validate parameters
    const validation = validateContactFormParameters(parameters);
    if (!validation.isValid) {
      const error = new ValidationError(
        validation.error || 'Invalid parameters provided',
        {
          parameters: parameters,
          method: 'handleShowContactForm',
          correlationId,
          sessionId,
          teamId
        }
      );
      return createErrorResult(error);
    }

    const params = validation.params || {};
    const reason = params.reason || 'your legal matter';

    const response: ContactFormResponse = {
      success: true,
      action: 'show_contact_form',
      message: `I'd be happy to help you with ${reason.toLowerCase()}. Please fill out the contact form below so we can get in touch with you.`,
      contactForm: {
        reason,
        fields: {
          name: { required: true, label: 'Full Name' },
          email: { required: true, label: 'Email Address' },
          phone: { required: false, label: 'Phone Number' },
          location: { required: true, label: 'Location (City, State)' },
          opposing_party: { required: false, label: 'Opposing Party (if applicable)' },
          message: { required: false, label: 'Additional Details' }
        },
        submitText: 'Submit Contact Form'
      }
    };

    return createSuccessResult(response);
  } catch (error) {
    Logger.error('[handleShowContactForm] Unexpected error:', error);
    const validationError = new ValidationError(
      'An unexpected error occurred while processing your request. Please try again.',
      {
        originalError: error instanceof Error ? error.message : String(error),
        method: 'handleShowContactForm',
        correlationId,
        sessionId,
        teamId
      }
    );
    return createErrorResult(validationError);
  }
}

// Tool handlers mapping
export const TOOL_HANDLERS = {
  show_contact_form: handleShowContactForm,
  create_matter: handleCreateMatter,
  request_lawyer_review: handleRequestLawyerReview,
  analyze_document: handleAnalyzeDocument,
  create_payment_invoice: handleCreatePaymentInvoice,
  build_case_draft: handleBuildCaseDraft
};

// Unified legal intake agent that handles both streaming and non-streaming responses
export async function runLegalIntakeAgentStream(
  env: Env, 
  messages: readonly AgentMessage[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: CloudflareLocationInfo,
  controller?: ReadableStreamDefaultController<Uint8Array>,
  attachments: readonly FileAttachment[] = []
): Promise<AgentResponse | void> {
  // Get team configuration if teamId is provided
  let teamConfig = null;
  if (teamId) {
    const teamService = new TeamService(env);
    const team = await teamService.getTeam(teamId);
    teamConfig = team || null;
  }

  // Convert messages to the format expected by Cloudflare AI
  const formattedMessages = messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.content
  }));

  // Check if we've already completed a matter creation in this conversation
  const conversationText = formattedMessages.map(msg => msg.content).join(' ').toLowerCase();
  
  // Check for completion cues in conversation text or last assistant message
  const hasCompletionCues = conversationText.includes('matter created') ||
                            conversationText.includes('consultation fee') ||
                            conversationText.includes('lawyer will contact you') ||
                            conversationText.includes('already helped you create a matter') ||
                            conversationText.includes('conversation is complete');
  
  // Check for actual tool invocations in message history
  const hasToolInvocation = messages.some(msg => 
    msg.metadata?.toolName === 'create_matter' || 
    msg.metadata?.toolCall?.toolName === 'create_matter' ||
    (msg.content && msg.content.includes('TOOL_CALL: create_matter'))
  );
  
  // Also check if the last assistant message was a completion message
  const lastAssistantMessage = formattedMessages.filter(msg => msg.role === 'assistant').pop();
  const isAlreadyCompleted = lastAssistantMessage?.content?.includes('already helped you create a matter');
  
  // Trigger if either completion cues are detected OR actual tool invocation is found
  if ((hasCompletionCues || hasToolInvocation) && isAlreadyCompleted) {
    const completionMessage = "I've already helped you create a matter for your case. A lawyer will contact you within 24 hours to discuss your situation further. Is there anything else I can help you with?";
    
    if (controller) {
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: completionMessage
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      controller.close();
    } else {
      return {
        response: completionMessage,
        metadata: {
          conversationComplete: true,
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
    return;
  }

  // Build simple system prompt (PromptBuilder removed for performance)
  const systemPrompt = `You are a legal intake specialist. Help users with legal matters and use tools when appropriate.

Available tools: create_matter, show_contact_form, request_lawyer_review, create_payment_invoice, analyze_document

Rules:
- Use create_matter when you have name + legal issue + contact info
- Use show_contact_form when you have legal issue but need contact info
- Be conversational and helpful

Tool calling format:
TOOL_CALL: tool_name
PARAMETERS: {valid JSON}`;

  // Hoist tool parsing variables to function scope
  let toolName: string | null = null;
  let parameters: any = null;
  
  try {
    Logger.debug('🔄 Starting agent...');
    
    // Send initial connection event for streaming
    if (controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    }
    
    // Use AI call
    Logger.debug('🤖 Calling AI model...');
    
    const aiResult = await env.AI.run(AI_MODEL_CONFIG.model as any, {
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedMessages
      ],
      max_tokens: AI_MODEL_CONFIG.maxTokens,
      temperature: AI_MODEL_CONFIG.temperature
    });
    
    Logger.debug('✅ AI result:', aiResult);
    
    const response = (typeof aiResult === 'string' ? aiResult : (aiResult as any).response) || 'I apologize, but I encountered an error processing your request.';
    Logger.debug('📝 Full response:', response);
    
    // Check if response is empty or too short
    if (!response || response.trim().length < 10) {
      Logger.error('❌ AI returned empty or very short response:', response);
      const fallbackResponse = 'I apologize, but I encountered an error processing your request. Please try again.';
      
      if (controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'final',
          response: fallbackResponse
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorEvent));
        
        // Close the stream after sending fallback response
        controller.close();
      } else {
        return {
          response: fallbackResponse,
          metadata: {
            error: 'Empty AI response',
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId
          }
        };
      }
      return;
    }
    
    // Parse tool call using ToolCallParser
    const parseResult = ToolCallParser.parseToolCall(response);
    
    if (parseResult.success && parseResult.toolCall) {
      Logger.debug('Tool call detected in response');
      
      // Handle streaming case
      if (controller) {
        const typingEvent = `data: ${JSON.stringify({
          type: 'typing',
          text: 'Processing your request...'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(typingEvent));
      }
      
      toolName = parseResult.toolCall.toolName;
      parameters = parseResult.toolCall.parameters;
      
      Logger.debug('Parsed tool call:', { 
        toolName, 
        parameters: parseResult.toolCall.sanitizedParameters || redactParameters(parameters) 
      });
    } else if (parseResult.error && parseResult.error !== 'No tool call detected') {
      Logger.error('Tool call parsing failed:', parseResult.error);
      if (controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          message: 'Failed to parse tool parameters. Please try rephrasing your request.'
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorEvent));
      }
      return {
        response: 'I encountered an error processing your request. Please try rephrasing your request.',
        metadata: { 
          error: parseResult.error, 
          rawParameters: parseResult.rawParameters,
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null
        }
      };
    }
    
    // Check if we have valid tool call data
    if (toolName && parameters) {
      // Handle streaming case
      if (controller) {
        const toolEvent = `data: ${JSON.stringify({
          type: 'tool_call',
          toolName: toolName,
          parameters: parseResult.toolCall.sanitizedParameters || redactParameters(parameters)
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(toolEvent));
      }
      
      // Execute the tool handler using the mapping
      const handler = TOOL_HANDLERS[toolName as keyof typeof TOOL_HANDLERS];
      if (!handler) {
        Logger.warn(`❌ Unknown tool: ${toolName}`);
        if (controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: `Unknown tool: ${toolName}`
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
        }
        return {
          response: `I'm sorry, but I don't know how to handle that type of request.`,
          metadata: { 
            error: `Unknown tool: ${toolName}`,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null
          }
        };
      }
      
      let toolResult;
      try {
        // Pass additional parameters for build_case_draft tool
        if (toolName === 'build_case_draft') {
          toolResult = await handler(parameters, env, teamConfig, sessionId, teamId);
        } else {
          toolResult = await handler(parameters, env, teamConfig);
        }
        Logger.debug('Tool execution result:', toolResult);
      } catch (error) {
        Logger.error('Tool execution failed:', error);
        if (controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'Tool execution failed. Please try again.'
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          try { controller.close(); } catch {}
        }
        return {
          response: 'I encountered an error while processing your request. Please try again.',
          metadata: { 
            error: error instanceof Error ? error.message : String(error),
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null
          }
        };
      }
      
      // Handle streaming case
      if (controller) {
        const resultEvent = `data: ${JSON.stringify({
          type: 'tool_result',
          toolName: toolName,
          result: toolResult
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(resultEvent));
      }
      
      // If tool was successful and created a matter, trigger lawyer approval
      if (toolResult.success && toolName === 'create_matter') {
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (!lastMessage || !lastMessage.content) {
          console.warn('No last message found for lawyer approval');
        }

        await handleLawyerApproval(env, {
          matter_type: parameters.matter_type,
          urgency: parameters.urgency,
          client_message: lastMessage?.content || '',
          client_name: parameters.name,
          client_phone: parameters.phone,
          client_email: parameters.email,
          opposing_party: parameters.opposing_party || '',
          matter_details: parameters.description,
          submitted: true,
          requires_payment: toolResult.data?.requires_payment || false,
          consultation_fee: toolResult.data?.consultation_fee || 0,
          payment_link: toolResult.data?.payment_link || null
        }, teamId);
      }
      
      // Return tool result for non-streaming case
      if (!controller) {
        return {
          response: toolResult.message || toolResult.response || 'Tool executed successfully.',
          metadata: {
            toolName,
            toolResult,
            inputMessageCount: formattedMessages.length,
            lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
            sessionId,
            teamId,
            allowRetry: !toolResult.success && toolName === 'create_matter'
          }
        };
      }
      
      // For streaming case, send the tool result as the response
      const finalResponse = toolResult.message || toolResult.response || 'Tool executed successfully.';
      
      // Check if the tool failed and we should allow retry
      if (!toolResult.success && toolName === 'create_matter') {
        // Tool failed - send error message but don't close the conversation
        const errorEvent = `data: ${JSON.stringify({
          type: 'tool_error',
          response: finalResponse,
          toolName: toolName,
          allowRetry: true
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorEvent));
        
        // Don't close the controller - let the conversation continue
        return;
      }
      
      // Tool succeeded or it's not create_matter - send final response and close
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: finalResponse
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      
      // Close the stream after sending final event
      controller.close();
      
      // Return after tool execution for streaming case
      return;
    }
    
    // If no tool call detected, handle the regular response
    Logger.debug('📝 No tool call detected, handling regular response');
    
    if (controller) {
      // Streaming case: simulate streaming by sending response in chunks
      const chunkSize = 3;
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize);
        const textEvent = `data: ${JSON.stringify({
          type: 'text',
          text: chunk
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(textEvent));
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Send final response
      const finalEvent = `data: ${JSON.stringify({
        type: 'final',
        response: response
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(finalEvent));
      
      // Close the stream after sending final event
      controller.close();
    } else {
      // Non-streaming case: return the response directly
      return {
        response,
        metadata: {
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
  } catch (error) {
    console.error('Agent error:', error);
    const errorMessage = error.message || 'An error occurred while processing your request';

    if (controller) {
      const errorEvent = `data: ${JSON.stringify({
        type: 'error',
        message: errorMessage
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorEvent));
      try {
        controller.close();
      } catch (closeError) {
        console.error('Error closing controller:', closeError);
      }
    } else {
      return {
        response: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
        metadata: {
          error: error.message,
          inputMessageCount: formattedMessages.length,
          lastUserMessage: formattedMessages[formattedMessages.length - 1]?.content || null,
          sessionId,
          teamId
        }
      };
    }
  }
}

// Helper function to handle lawyer approval
async function handleLawyerApproval(env: any, params: any, teamId: string) {
          Logger.debug('Lawyer approval requested:', ToolCallParser.sanitizeParameters(params));
  
  try {
    // Get team config for notification
    const { AIService } = await import('../services/AIService');
    const aiService = new AIService(env.AI, env);
    const teamConfig = await aiService.getTeamConfig(teamId);
    
    if (teamConfig.ownerEmail && env.RESEND_API_KEY) {
      const { EmailService } = await import('../services/EmailService');
      const emailService = new EmailService(env.RESEND_API_KEY);
      
      await emailService.send({
        from: 'noreply@blawby.com',
        to: teamConfig.ownerEmail,
        subject: 'New Matter Requires Review',
        text: `A new legal matter requires your review.\n\nMatter Details: ${JSON.stringify(params, null, 2)}`
      });
    } else {
      Logger.info('Email service not configured - skipping email notification');
    }
  } catch (error) {
    Logger.warn('Failed to send lawyer approval email:', error instanceof Error ? error.message : 'Unknown error');
    // Don't fail the request if email fails
  }
}

// Tool handlers
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
  
  // First, verify jurisdiction if location is provided
  if (location) {
    const jurisdiction = teamConfig?.config?.jurisdiction;
    if (jurisdiction && jurisdiction.type) {
      const supportedStates = Array.isArray(jurisdiction.supportedStates) ? jurisdiction.supportedStates : [];
      const supportedCountries = Array.isArray(jurisdiction.supportedCountries) ? jurisdiction.supportedCountries : [];
      
      const isSupported = isLocationSupported(location, supportedStates, supportedCountries);
      
      if (!isSupported) {
        return createValidationError(`I understand you're located in ${location}. While we primarily serve ${jurisdiction.description || 'our service area'}, I can still help you with general legal guidance and information. For specific legal representation in your area, I'd recommend contacting a local attorney. However, I'm happy to continue helping you with your legal questions and can assist with general consultation.`);
      }
    }
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

export async function handleCreateMatter(parameters: any, env: any, teamConfig: any) {
  Logger.debug('[handleCreateMatter] parameters:', ToolCallParser.sanitizeParameters(parameters));
  Logger.logTeamConfig(teamConfig, true); // Include sanitized config in debug mode
  const { matter_type, description, urgency, name, phone, email, location, opposing_party } = parameters;
  
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
  
  // Set default urgency if not provided
  const finalUrgency = urgency || 'unknown';
  
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
  if (location && !ValidationService.validateLocation(location)) {
    return createValidationError("Could you please provide your city and state or country?");
  }
  
  if (!phone && !email) {
    return createValidationError("I need at least one way to contact you to proceed. Could you provide either your phone number or email address?");
  }
  
  // Process payment using the PaymentServiceFactory
  const paymentRequest = {
    customerInfo: {
      name: name,
      email: email || '',
      phone: phone || '',
      location: location || ''
    },
    matterInfo: {
      type: matter_type,
      description: description,
      urgency: finalUrgency,
      opposingParty: opposing_party || ''
    },
    teamId: (() => {
      if (teamConfig?.id) {
        return teamConfig.id;
      }
      if (env.BLAWBY_TEAM_ULID) {
        console.warn('⚠️  Using environment variable BLAWBY_TEAM_ULID as fallback - team configuration not found in database');
        return env.BLAWBY_TEAM_ULID;
      }
      console.error('❌ CRITICAL: No team ID available for payment processing');
      console.error('   - teamConfig?.id:', teamConfig?.id);
      console.error('   - env.BLAWBY_TEAM_ULID:', env.BLAWBY_TEAM_ULID);
      console.error('   - Team configuration should be set in database for team:', teamConfig?.slug || 'unknown');
      throw new Error('Team ID not configured - cannot process payment. Check database configuration.');
    })(),
    sessionId: 'session-' + Date.now()
  };
  
  const { invoiceUrl, paymentId } = await PaymentServiceFactory.processPayment(env, paymentRequest, teamConfig);
  
  // Build summary message
  const requiresPayment = teamConfig?.config?.requiresPayment || false;
  const consultationFee = teamConfig?.config?.consultationFee || 0;
  
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
- Urgency: ${finalUrgency}`;

  if (requiresPayment && consultationFee > 0) {
    if (invoiceUrl) {
      summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using the embedded payment form below
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    } else {
      summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using this link: ${teamConfig?.config?.paymentLink || 'Payment link will be sent shortly'}
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    }
  } else {
    summaryMessage += `

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.`;
  }
  
  const result = createSuccessResponse(summaryMessage, {
    matter_type,
    description,
    urgency: finalUrgency,
    name,
    phone,
    email,
    location,
    opposing_party,
    requires_payment: requiresPayment,
    consultation_fee: consultationFee,
    payment_link: invoiceUrl || teamConfig?.config?.paymentLink,
    payment_embed: invoiceUrl ? {
      paymentUrl: invoiceUrl,
      amount: consultationFee,
      description: `${matter_type}: ${description}`,
      paymentId: paymentId
    } : null
  });
  
  Logger.debug('[handleCreateMatter] result created successfully');
  return result;
}

export async function handleRequestLawyerReview(parameters: any, env: any, teamConfig: any) {
  const { urgency, complexity, matter_type } = parameters;
  
  // Send notification using NotificationService
  const { NotificationService } = await import('../services/NotificationService');
  const notificationService = new NotificationService(env);
  
  await notificationService.sendLawyerReviewNotification({
    type: 'lawyer_review',
    teamConfig,
    matterInfo: {
      type: matter_type,
      urgency,
      complexity
    }
  });
  
  return createSuccessResponse("I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further.");
}



export async function handleAnalyzeDocument(parameters: any, env: any, teamConfig: any) {
  const { file_id, analysis_type, specific_question } = parameters;
  
  Logger.debug('=== ANALYZE DOCUMENT TOOL CALLED ===');
  Logger.debug('File ID:', ToolCallParser.sanitizeParameters(file_id));
  Logger.debug('Analysis Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Specific Question:', ToolCallParser.sanitizeParameters(specific_question));
  
  // Get the appropriate analysis question
  const customQuestion = getAnalysisQuestion(analysis_type, specific_question);
  
  // Perform the analysis
  const fileAnalysis = await analyzeFile(env, file_id, customQuestion);
  
  if (!fileAnalysis) {
    return createValidationError("I'm sorry, I couldn't analyze that document. The file may not be accessible or may not be in a supported format. Could you please try uploading it again or provide more details about what you'd like me to help you with?");
  }
  
  // Check if the analysis returned an error response (low confidence indicates error)
  if (fileAnalysis.confidence === 0.0) {
    return createValidationError(fileAnalysis.summary || "I'm sorry, I couldn't analyze that document. Please try uploading it again or contact support if the issue persists.");
  }
  
  // Add document type to analysis
  fileAnalysis.documentType = analysis_type;
  
  // Log the analysis results
  Logger.debug('=== DOCUMENT ANALYSIS RESULTS ===');
  Logger.debug('Document Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  Logger.debug('Summary:', ToolCallParser.sanitizeParameters(fileAnalysis.summary));
  Logger.debug('Key Facts:', ToolCallParser.sanitizeParameters(fileAnalysis.key_facts));
  Logger.debug('Entities:', ToolCallParser.sanitizeParameters(fileAnalysis.entities));
  Logger.debug('Action Items:', ToolCallParser.sanitizeParameters(fileAnalysis.action_items));
  Logger.debug('================================');
  
  // Create a legally-focused response that guides toward matter creation
  let response = '';
  
  // Extract key information for legal intake
  const parties = fileAnalysis.entities?.people || [];
  const organizations = fileAnalysis.entities?.orgs || [];
  const dates = fileAnalysis.entities?.dates || [];
  const keyFacts = fileAnalysis.key_facts || [];
  
  // Determine likely matter type based on document analysis
  let suggestedMatterType = 'General Consultation';
  if (analysis_type === 'contract' || fileAnalysis.summary?.toLowerCase().includes('contract')) {
    suggestedMatterType = 'Contract Review';
  } else if (analysis_type === 'medical_document' || fileAnalysis.summary?.toLowerCase().includes('medical')) {
    suggestedMatterType = 'Personal Injury';
  } else if (analysis_type === 'government_form' || fileAnalysis.summary?.toLowerCase().includes('form')) {
    suggestedMatterType = 'Administrative Law';
  } else if (analysis_type === 'image' && (fileAnalysis.summary?.toLowerCase().includes('accident') || fileAnalysis.summary?.toLowerCase().includes('injury'))) {
    suggestedMatterType = 'Personal Injury';
  } else if (analysis_type === 'image' && fileAnalysis.summary?.toLowerCase().includes('property')) {
    suggestedMatterType = 'Property Law';
  }
  
  // Build legally-focused response
  response += `I've analyzed your document and here's what I found:\n\n`;
  
  // Document identification
  if (fileAnalysis.summary) {
    response += `**Document Analysis:** ${fileAnalysis.summary}\n\n`;
  }
  
  // Key legal details
  if (parties.length > 0) {
    response += `**Parties Involved:** ${parties.join(', ')}\n`;
  }
  
  if (organizations.length > 0) {
    response += `**Organizations:** ${organizations.join(', ')}\n`;
  }
  
  if (dates.length > 0) {
    response += `**Important Dates:** ${dates.join(', ')}\n`;
  }
  
  if (keyFacts.length > 0) {
    response += `**Key Facts:**\n`;
    keyFacts.slice(0, 3).forEach(fact => {
      response += `• ${fact}\n`;
    });
  }
  
  response += `\n**Suggested Legal Matter Type:** ${suggestedMatterType}\n\n`;
  
  // Legal guidance and next steps
  response += `Based on this analysis, I can help you:\n`;
  response += `• Create a legal matter for attorney review\n`;
  response += `• Identify potential legal issues or concerns\n`;
  response += `• Determine appropriate legal services needed\n`;
  response += `• Prepare for consultation with an attorney\n\n`;
  
  // Call to action
  response += `Would you like me to create a legal matter for this ${suggestedMatterType.toLowerCase()} case? I'll need your contact information to get started.`;
  
  Logger.debug('=== FINAL ANALYSIS RESPONSE ===');
  Logger.debug('Response:', ToolCallParser.sanitizeParameters(response));
  Logger.debug('Response Length:', `${response.length} characters`);
  Logger.debug('Response Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Suggested Matter Type:', ToolCallParser.sanitizeParameters(suggestedMatterType));
  Logger.debug('Response Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  Logger.debug('==============================');
  
  return createSuccessResponse(response, {
    ...fileAnalysis,
    suggestedMatterType,
    parties,
    organizations,
    dates,
    keyFacts
  });
}

export async function handleBuildCaseDraft(parameters: any, env: any, teamConfig: any, sessionId?: string, teamId?: string) {
  Logger.debug('[handleBuildCaseDraft] parameters:', ToolCallParser.sanitizeParameters(parameters));
  
  const { 
    matter_type, 
    key_facts, 
    timeline, 
    parties, 
    documents, 
    evidence, 
    jurisdiction, 
    urgency 
  } = parameters;
  
  // Validate required fields
  if (!matter_type || !key_facts || !Array.isArray(key_facts) || key_facts.length === 0) {
    return createValidationError("I need the matter type and key facts to build your case draft. Could you please provide the type of legal matter and the main facts of your case?");
  }
  
  // Validate matter type
  if (!ValidationService.validateMatterType(matter_type)) {
    return createValidationError("I need to understand your legal situation better. Could you please describe what type of legal help you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or general consultation.");
  }
  
  // Build structured case draft
  const caseDraft = {
    matter_type,
    key_facts,
    timeline: timeline || 'Timeline not specified',
    parties: parties || [],
    documents: documents || [],
    evidence: evidence || [],
    jurisdiction: jurisdiction || 'Jurisdiction not specified',
    urgency: urgency || 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'draft' as const
  };

  // Save case draft to conversation context if session info is available
  if (sessionId && teamId) {
    try {
      const { ConversationContextManager } = await import('../middleware/conversationContextManager.js');
      const context = await ConversationContextManager.load(sessionId, teamId, env);
      const updatedContext = ConversationContextManager.updateCaseDraft(context, caseDraft);
      
      // Initialize document checklist for this matter type
      const contextWithChecklist = await ConversationContextManager.initializeDocumentChecklist(
        updatedContext, 
        matter_type, 
        env
      );
      
      await ConversationContextManager.save(contextWithChecklist, env);
      Logger.debug('[handleBuildCaseDraft] Case draft saved to conversation context');
    } catch (error) {
      Logger.warn('[handleBuildCaseDraft] Failed to save case draft to context:', error);
      // Continue without failing the operation
    }
  }
  
  // Create comprehensive case summary
  let summaryMessage = `Perfect! I've organized your case information into a structured draft. Here's your case summary:\n\n`;
  
  summaryMessage += `**Case Type:** ${matter_type}\n`;
  summaryMessage += `**Jurisdiction:** ${caseDraft.jurisdiction}\n`;
  summaryMessage += `**Urgency:** ${caseDraft.urgency}\n\n`;
  
  summaryMessage += `**Key Facts:**\n`;
  key_facts.forEach((fact, index) => {
    summaryMessage += `${index + 1}. ${fact}\n`;
  });
  
  if (timeline) {
    summaryMessage += `\n**Timeline:**\n${timeline}\n`;
  }
  
  if (parties && parties.length > 0) {
    summaryMessage += `\n**Parties Involved:**\n`;
    parties.forEach(party => {
      summaryMessage += `• ${party.role}: ${party.name || 'Name not provided'}${party.relationship ? ` (${party.relationship})` : ''}\n`;
    });
  }
  
  if (documents && documents.length > 0) {
    summaryMessage += `\n**Documents Available:**\n`;
    documents.forEach(doc => {
      summaryMessage += `• ${doc}\n`;
    });
  }
  
  if (evidence && evidence.length > 0) {
    summaryMessage += `\n**Evidence:**\n`;
    evidence.forEach(ev => {
      summaryMessage += `• ${ev}\n`;
    });
  }
  
  summaryMessage += `\n**Next Steps:**\n`;
  summaryMessage += `• Review this case summary for accuracy\n`;
  summaryMessage += `• Gather any missing documents or evidence\n`;
  summaryMessage += `• Consider what additional information might be helpful\n`;
  summaryMessage += `• This summary can be shared with attorneys for consultation\n\n`;
  
  summaryMessage += `Would you like me to help you gather any additional information or documents for your case?`;
  
  Logger.debug('[handleBuildCaseDraft] case draft created successfully');
  
  return createSuccessResponse(summaryMessage, {
    caseDraft,
    matter_type,
    key_facts,
    timeline,
    parties,
    documents,
    evidence,
    jurisdiction,
    urgency
  });
}