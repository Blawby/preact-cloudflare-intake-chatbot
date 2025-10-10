import { Logger } from '../../utils/logger.js';

/**
 * Base error class for all legal intake related errors
 */
export abstract class LegalIntakeError extends Error {
  public readonly errorCode: string;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    errorCode: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isRetryable = isRetryable;
  }

  /**
   * Logs the error with contextual information
   */
  public log(): void {
    Logger.error(`[${this.errorCode}] ${this.message}`, {
      error: this.name,
      errorCode: this.errorCode,
      context: this.context,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack
    });
  }

  /**
   * Converts error to a user-friendly response
   */
  public abstract toUserResponse(): string;
}

/**
 * Error thrown when conversation state analysis fails
 */
export class ConversationStateError extends LegalIntakeError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = true
  ) {
    super(message, 'CONVERSATION_STATE_ERROR', context, isRetryable);
  }

  public toUserResponse(): string {
    return "I'm having trouble understanding your message. Could you please rephrase or provide more details?";
  }
}

/**
 * Error thrown when AI service calls fail
 */
export class AIServiceError extends LegalIntakeError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = true
  ) {
    super(message, 'AI_SERVICE_ERROR', context, isRetryable);
  }

  public toUserResponse(): string {
    return "I'm experiencing some technical difficulties. Please try again in a moment.";
  }
}

/**
 * Error thrown when business logic processing fails
 */
export class BusinessLogicError extends LegalIntakeError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = false
  ) {
    super(message, 'BUSINESS_LOGIC_ERROR', context, isRetryable);
  }

  public toUserResponse(): string {
    return "I encountered an issue processing your request. Please try again or contact support if the problem persists.";
  }
}

/**
 * Error thrown when matter creation fails
 */
export class MatterCreationError extends LegalIntakeError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = true
  ) {
    super(message, 'MATTER_CREATION_ERROR', context, isRetryable);
  }

  public toUserResponse(): string {
    return "I'm having trouble creating your matter. Please try again or contact our support team for assistance.";
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends LegalIntakeError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = false
  ) {
    super(message, 'VALIDATION_ERROR', context, isRetryable);
  }

  public toUserResponse(): string {
    return this.message; // Validation errors are usually user-friendly
  }
}

/**
 * Error thrown when external service calls fail
 */
export class ExternalServiceError extends LegalIntakeError {
  constructor(
    serviceName: string,
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = true
  ) {
    super(
      `External service error (${serviceName}): ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      { ...context, serviceName },
      isRetryable
    );
  }

  public toUserResponse(): string {
    return "I'm having trouble connecting to our services. Please try again in a moment.";
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends LegalIntakeError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    isRetryable: boolean = false
  ) {
    super(message, 'CONFIGURATION_ERROR', context, isRetryable);
  }

  public toUserResponse(): string {
    return "There's a configuration issue. Please contact support.";
  }
}

/**
 * Error result type for methods that can fail
 */
export type ErrorResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: LegalIntakeError;
};

/**
 * Error handling wrapper for async methods
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: Record<string, unknown> = {},
  errorType: new (message: string, context: Record<string, unknown>, isRetryable: boolean) => LegalIntakeError = ConversationStateError
): Promise<ErrorResult<T>> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    let legalIntakeError: LegalIntakeError;

    if (error instanceof LegalIntakeError) {
      legalIntakeError = error;
    } else if (error instanceof Error) {
      legalIntakeError = new errorType(
        error.message,
        { ...errorContext, originalError: error.message },
        true // Assume retryable for unknown errors
      );
    } else {
      legalIntakeError = new errorType(
        'Unknown error occurred',
        { ...errorContext, originalError: String(error) },
        true
      );
    }

    // Log the error
    legalIntakeError.log();

    return { success: false, error: legalIntakeError };
  }
}

/**
 * Error handling wrapper for sync methods
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  errorContext: Record<string, unknown> = {},
  errorType: new (message: string, context: Record<string, unknown>, isRetryable: boolean) => LegalIntakeError = ValidationError
): ErrorResult<T> {
  try {
    const result = operation();
    return { success: true, data: result };
  } catch (error) {
    let legalIntakeError: LegalIntakeError;

    if (error instanceof LegalIntakeError) {
      legalIntakeError = error;
    } else if (error instanceof Error) {
      legalIntakeError = new errorType(
        error.message,
        { ...errorContext, originalError: error.message },
        false // Sync errors are typically not retryable
      );
    } else {
      legalIntakeError = new errorType(
        'Unknown error occurred',
        { ...errorContext, originalError: String(error) },
        false
      );
    }

    // Log the error
    legalIntakeError.log();

    return { success: false, error: legalIntakeError };
  }
}

/**
 * Helper to create error results
 */
export function createErrorResult<T>(
  error: LegalIntakeError
): ErrorResult<T> {
  return { success: false, error };
}

/**
 * Helper to create success results
 */
export function createSuccessResult<T>(data: T): ErrorResult<T> {
  return { success: true, data };
}
