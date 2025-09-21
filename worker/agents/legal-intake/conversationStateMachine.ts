import { Logger } from '../../utils/logger.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import type { Env } from '../../types.js';
import {
  ConversationStateError,
  AIServiceError,
  ValidationError,
  LegalIntakeError,
  withErrorHandling,
  withErrorHandlingSync,
  ErrorResult,
  createErrorResult,
  createSuccessResult
} from './errors.js';

export enum ConversationState {
  INITIAL = 'INITIAL',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
  COLLECTING_NAME = 'COLLECTING_NAME',
  COLLECTING_LEGAL_ISSUE = 'COLLECTING_LEGAL_ISSUE',
  COLLECTING_DETAILS = 'COLLECTING_DETAILS',
  COLLECTING_EMAIL = 'COLLECTING_EMAIL',
  COLLECTING_PHONE = 'COLLECTING_PHONE',
  COLLECTING_LOCATION = 'COLLECTING_LOCATION',
  COLLECTING_OPPOSING_PARTY = 'COLLECTING_OPPOSING_PARTY',
  READY_TO_CREATE_MATTER = 'READY_TO_CREATE_MATTER',
  MATTER_CREATED = 'MATTER_CREATED',
  MATTER_CREATION_FAILED = 'MATTER_CREATION_FAILED',
  GATHERING_INFORMATION = 'GATHERING_INFORMATION'
}

export interface ConversationContext {
  hasName: boolean;
  hasLegalIssue: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasLocation: boolean;
  hasOpposingParty: boolean;
  name: string | null;
  legalIssueType: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  opposingParty: string | null;
  isSensitiveMatter: boolean;
  isGeneralInquiry: boolean;
  shouldCreateMatter: boolean;
  state: ConversationState;
}

export class ConversationStateMachine {
  /**
   * Determines if the conversation is a general inquiry
   */
  static async isGeneralInquiry(conversationText: string, env: Env): Promise<ErrorResult<boolean>> {
    return withErrorHandling(
      async () => {
        // Validate input parameters
        if (!conversationText) {
          throw new ValidationError('Conversation text is required', {
            conversationText: conversationText,
            method: 'isGeneralInquiry'
          });
        }

        // First check if the conversation is too short to extract meaningful information
        if (conversationText.trim().length < 20) {
          return true; // Treat as general inquiry if conversation is too short
        }
        
        try {
          const context = await PromptBuilder.extractConversationInfo(conversationText, env);
          
          // If we have substantial information (name, legal issue, contact info), it's not a general inquiry
          if (context.hasName && context.legalIssueType && (context.hasEmail || context.hasPhone)) {
            return false;
          }
          
          // If we have a clear legal issue type, it's not a general inquiry
          if (context.legalIssueType) {
            return false;
          }
          
          const generalPatterns = [
            /services in my area/i,
            /pricing/i,
            /cost/i,
            /what.*services/i,
            /do you provide/i,
            /not sure if you provide/i,
            /concerned about.*cost/i,
            /tell me about.*pricing/i,
            /not sure what kind/i,
            /what kind of.*help/i
          ];
          
          return generalPatterns.some(pattern => pattern.test(conversationText));
        } catch (error) {
          // If AI extraction fails, treat as general inquiry but log the error
          Logger.warn('AI extraction failed in isGeneralInquiry, treating as general inquiry', {
            error: error instanceof Error ? error.message : String(error),
            conversationText: conversationText.substring(0, 100) + '...'
          });
          return true;
        }
      },
      {
        conversationText: conversationText?.substring(0, 100) + '...',
        method: 'isGeneralInquiry'
      },
      ConversationStateError
    );
  }

  /**
   * Determines if we should create a matter based on available information
   */
  static shouldCreateMatter(context: ConversationContext): ErrorResult<boolean> {
    return withErrorHandlingSync(
      () => {
        // Validate input parameters
        if (!context) {
          throw new ValidationError('Conversation context is required', {
            context: context,
            method: 'shouldCreateMatter'
          });
        }

        // For intake agent, we need essential information before creating matters
        // This ensures we have the details needed for a lawyer to contact the client
        
        // Minimum required: name + legal issue + description
        const hasMinimumInfo = context.hasName && 
                              Boolean(context.legalIssueType) && 
                              Boolean(context.description);
        
        // For sensitive matters, only require minimum info
        const sensitiveResult = this.isSensitiveMatter(context);
        if (!sensitiveResult.success) {
          throw new ConversationStateError('Failed to determine if matter is sensitive', {
            context: context,
            method: 'shouldCreateMatter'
          });
        }

        if (sensitiveResult.data) {
          return hasMinimumInfo;
        }
        
        // For standard matters, require minimum info + contact method + location
        const hasContactMethod = context.hasEmail || context.hasPhone;
        const hasLocation = context.hasLocation;
        
        return hasMinimumInfo && hasContactMethod && hasLocation;
      },
      {
        context: context,
        method: 'shouldCreateMatter'
      },
      ValidationError
    );
  }

  /**
   * Determines if this is a sensitive matter that needs immediate attention
   */
  static isSensitiveMatter(context: ConversationContext): ErrorResult<boolean> {
    return withErrorHandlingSync(
      () => {
        // Validate input parameters
        if (!context) {
          throw new ValidationError('Conversation context is required', {
            context: context,
            method: 'isSensitiveMatter'
          });
        }

        if (!context.legalIssueType && !context.description) {
          return false;
        }
        
        const sensitiveKeywords = [
          'criminal', 'arrest', 'jail', 'prison', 'charges', 'court date',
          'accident', 'injury', 'hospital', 'medical', 'death', 'fatal',
          'domestic violence', 'abuse', 'harassment', 'threat', 'danger',
          'emergency', 'urgent', 'immediate', 'asap', 'right now'
        ];
        
        const textToCheck = `${context.legalIssueType || ''} ${context.description || ''}`.toLowerCase();
        return sensitiveKeywords.some(keyword => textToCheck.includes(keyword));
      },
      {
        context: context,
        method: 'isSensitiveMatter'
      },
      ValidationError
    );
  }

  /**
   * Gets the current state of the conversation
   */
  static async getCurrentState(conversationText: string, env: Env): Promise<ErrorResult<ConversationState>> {
    return withErrorHandling(
      async () => {
        // Validate input parameters
        if (!conversationText) {
          throw new ValidationError('Conversation text is required', {
            conversationText: conversationText,
            method: 'getCurrentState'
          });
        }

        if (conversationText.trim().length === 0) {
          return ConversationState.INITIAL;
        }
        
        let context: ConversationContext;
        try {
          context = await PromptBuilder.extractConversationInfo(conversationText, env);
        } catch (error) {
          Logger.error('Failed to extract conversation context:', error);
          return ConversationState.GATHERING_INFORMATION;
        }
        
        // Check for general inquiries first
        const generalInquiryResult = await this.isGeneralInquiry(conversationText, env);
        if (!generalInquiryResult.success) {
          const errorMessage = (generalInquiryResult as { success: false; error: LegalIntakeError }).error.message;
          throw new ConversationStateError('Failed to determine if conversation is general inquiry', {
            conversationText: conversationText.substring(0, 100) + '...',
            method: 'getCurrentState',
            error: errorMessage
          });
        }

        if (generalInquiryResult.data) {
          return ConversationState.GENERAL_INQUIRY;
        }

        // Don't automatically determine we're ready to create a matter
        // Let the AI handle the confirmation flow through conversation

        // Check if this is a sensitive matter that needs immediate attention
        const contextWithState = { ...context, state: ConversationState.INITIAL };
        const sensitiveResult = this.isSensitiveMatter(contextWithState);
        if (!sensitiveResult.success) {
          const errorMessage = (sensitiveResult as { success: false; error: LegalIntakeError }).error.message;
          throw new ConversationStateError('Failed to determine if matter is sensitive', {
            context: contextWithState,
            method: 'getCurrentState',
            error: errorMessage
          });
        }

        const isSensitiveMatter = sensitiveResult.data;

        // Determine what we're missing - prioritize the most important missing pieces
        if (!context.hasName) {
          return ConversationState.COLLECTING_NAME;
        }

        if (!context.legalIssueType || !context.hasLegalIssue) {
          return ConversationState.COLLECTING_LEGAL_ISSUE;
        }

        if (!context.description) {
          return ConversationState.COLLECTING_DETAILS;
        }

        // For sensitive matters, we can create a matter with minimal information
        if (isSensitiveMatter) {
          return ConversationState.READY_TO_CREATE_MATTER;
        }

        // For standard matters, collect contact information - FAIL FAST if missing
        if (!context.hasEmail && !context.hasPhone) {
          return ConversationState.COLLECTING_EMAIL;
        }

        if (!context.hasLocation) {
          return ConversationState.COLLECTING_LOCATION;
        }

        // Opposing party is optional, but ask if we don't have it yet
        if (!context.hasOpposingParty) {
          return ConversationState.COLLECTING_OPPOSING_PARTY;
        }

        return ConversationState.INITIAL;
      },
      {
        conversationText: conversationText?.substring(0, 100) + '...',
        method: 'getCurrentState'
      },
      ConversationStateError
    );
  }

  /**
   * Gets the appropriate response based on current state
   */
  static getResponseForState(state: ConversationState, context: ConversationContext): ErrorResult<string> {
    return withErrorHandlingSync(
      () => {
        // Validate input parameters
        if (!state) {
          throw new ValidationError('Conversation state is required', {
            state: state,
            method: 'getResponseForState'
          });
        }

        if (!context) {
          throw new ValidationError('Conversation context is required', {
            context: context,
            method: 'getResponseForState'
          });
        }

        switch (state) {
          case ConversationState.GENERAL_INQUIRY:
            return "I'd be happy to help you with information about our services. Could you please tell me your name so I can better assist you?";
          
          case ConversationState.COLLECTING_NAME:
            return "I'd be happy to help you with your legal matter. Could you please tell me your name?";
          
          case ConversationState.COLLECTING_LEGAL_ISSUE:
            return `Thanks ${context.name}. What type of legal issue are you facing? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or something else?`;
          
          case ConversationState.COLLECTING_DETAILS:
            if (context.legalIssueType) {
              // Check if this might be a sensitive matter
              const sensitiveResult = this.isSensitiveMatter(context);
              if (!sensitiveResult.success) {
                // If we can't determine sensitivity, use default response
                return `I understand you're dealing with a ${context.legalIssueType.toLowerCase()} matter. Can you tell me more about your situation? What specific help do you need?`;
              }
              
              if (sensitiveResult.data) {
                return `I understand this is a serious matter. Can you tell me more about what happened? Please provide as much detail as you're comfortable sharing.`;
              } else {
                return `I understand you're dealing with a ${context.legalIssueType.toLowerCase()} matter. Can you tell me more about your situation? What specific help do you need?`;
              }
            }
            return "Can you tell me more about your legal situation? What specific help do you need?";
          
          case ConversationState.COLLECTING_EMAIL:
            return "I need a way to contact you. Could you please provide your email address?";
          
          case ConversationState.COLLECTING_PHONE:
            return "I need a way to contact you. Could you please provide your phone number?";
          
          case ConversationState.COLLECTING_LOCATION:
            return "Could you please tell me your city and state? This helps us understand if we can assist you in your area.";
          
          case ConversationState.COLLECTING_OPPOSING_PARTY:
            return "Is there another party involved in this matter? If so, could you tell me their name?";
          
          case ConversationState.READY_TO_CREATE_MATTER:
            return "I have all the information I need. Let me create a matter for you.";
          
          case ConversationState.MATTER_CREATED:
            return "Your matter has been created successfully. A lawyer will contact you within 24 hours.";
          
          case ConversationState.MATTER_CREATION_FAILED:
            return "I'm sorry, there was an issue creating your matter. Let me try to help you in a different way.";
          
          default:
            return "I'm here to help you with your legal matter. How can I assist you today?";
        }
      },
      {
        state: state,
        context: context,
        method: 'getResponseForState'
      },
      ValidationError
    );
  }

  /**
   * Determines if we should use AI response or rule-based response
   */
  static shouldUseAIResponse(): ErrorResult<boolean> {
    return withErrorHandlingSync(
      () => {
        // Always use AI for more natural conversation flow
        return true;
      },
      {
        method: 'shouldUseAIResponse'
      },
      ValidationError
    );
  }
}
