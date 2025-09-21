import { Logger } from '../../utils/logger.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import { ConversationStateMachine, ConversationState, ConversationContext } from './conversationStateMachine.js';
import { buildSystemPrompt } from './promptTemplates.js';
import type { Env } from '../../types.js';
import {
  BusinessLogicError,
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

export interface MatterParams {
  name?: string;
  matter_type?: string;
  description?: string;
  email?: string;
  phone?: string;
  location?: string;
  opposing_party?: string;
}

export interface BusinessLogicResult {
  shouldCreateMatter: boolean;
  response: string;
  useAIResponse: boolean;
  state: ConversationState;
  matterParams?: MatterParams;
}

export class BusinessLogicHandler {

  /**
   * Creates a minimal context object with default values
   */
  public static createMinimalContext(): ConversationContext {
    return {
      hasName: false,
      hasLegalIssue: false,
      hasEmail: false,
      hasPhone: false,
      hasLocation: false,
      hasOpposingParty: false,
      name: null,
      legalIssueType: null,
      description: null,
      email: null,
      phone: null,
      location: null,
      opposingParty: null,
      isSensitiveMatter: false,
      isGeneralInquiry: true,
      shouldCreateMatter: false,
      state: ConversationState.GATHERING_INFORMATION
    };
  }

  /**
   * Extracts conversation context with error handling
   */
  private static async extractContext(conversationText: string, env: Env): Promise<ConversationContext> {
    if (conversationText && conversationText.trim().length >= 20) {
      try {
        return await PromptBuilder.extractConversationInfo(conversationText, env);
      } catch (error) {
        Logger.error('Failed to extract conversation info, using minimal context:', error);
        return this.createMinimalContext();
      }
    }
    return this.createMinimalContext();
  }

  /**
   * Validates input parameters for conversation handling
   */
  private static validateConversationInputs(conversationText: string, env: Env): void {
    if (!conversationText) {
      throw new ValidationError('Conversation text is required', {
        conversationText: conversationText,
        method: 'handleConversation'
      });
    }

    if (!env) {
      throw new ValidationError('Environment is required', {
        env: env,
        method: 'handleConversation'
      });
    }
  }

  /**
   * Gets conversation state with error handling
   */
  private static async getConversationState(conversationText: string, env: Env): Promise<ConversationState> {
    const stateResult = await ConversationStateMachine.getCurrentState(conversationText, env);
    if (!stateResult.success) {
      const errorMessage = (stateResult as { success: false; error: LegalIntakeError }).error.message;
      throw new BusinessLogicError('Failed to determine conversation state', {
        conversationText: conversationText.substring(0, 100) + '...',
        method: 'handleConversation',
        error: errorMessage
      });
    }
    return stateResult.data;
  }

  /**
   * Validates state machine results
   */
  private static async validateStateMachineResults(
    fullContext: ConversationContext, 
    conversationText: string, 
    env: Env
  ): Promise<void> {
    const shouldCreateMatterResult = ConversationStateMachine.shouldCreateMatter(fullContext);
    if (!shouldCreateMatterResult.success) {
      const errorMessage = (shouldCreateMatterResult as { success: false; error: LegalIntakeError }).error.message;
      throw new BusinessLogicError('Failed to determine if matter should be created', {
        context: fullContext,
        method: 'handleConversation',
        error: errorMessage
      });
    }

    const isGeneralInquiryResult = await ConversationStateMachine.isGeneralInquiry(conversationText, env);
    if (!isGeneralInquiryResult.success) {
      const errorMessage = (isGeneralInquiryResult as { success: false; error: LegalIntakeError }).error.message;
      throw new BusinessLogicError('Failed to determine if conversation is general inquiry', {
        conversationText: conversationText.substring(0, 100) + '...',
        method: 'handleConversation',
        error: errorMessage
      });
    }
  }

  /**
   * Handles the main business logic for conversation processing
   */
  static async handleConversation(
    conversationText: string,
    env: Env,
    teamConfig: any
  ): Promise<ErrorResult<BusinessLogicResult>> {
    return withErrorHandling(
      async () => {
        this.validateConversationInputs(conversationText, env);
        
        const context = await this.extractContext(conversationText, env);
        const state = await this.getConversationState(conversationText, env);
        const fullContext = { ...context, state };
        
        await this.validateStateMachineResults(fullContext, conversationText, env);
        
        Logger.debug('🔍 Business Logic Analysis:', {
          state,
          context: fullContext
        });

        // Let AI handle the response and matter creation decisions
        return {
          shouldCreateMatter: false,
          response: '',
          useAIResponse: true,
          state
        };
      },
      {
        conversationText: conversationText?.substring(0, 100) + '...',
        method: 'handleConversation'
      },
      BusinessLogicError
    );
  }

  /**
   * Determines if we should bypass AI entirely and use rule-based logic
   */
  static async shouldBypassAI(conversationText: string, env?: Env): Promise<ErrorResult<boolean>> {
    return withErrorHandling(
      async () => {
        // Validate input parameters
        if (!conversationText) {
          throw new ValidationError('Conversation text is required', {
            conversationText: conversationText,
            method: 'shouldBypassAI'
          });
        }

        const stateResult = await ConversationStateMachine.getCurrentState(conversationText, env);
        if (!stateResult.success) {
          const errorMessage = (stateResult as { success: false; error: LegalIntakeError }).error.message;
          throw new BusinessLogicError('Failed to determine conversation state', {
            conversationText: conversationText.substring(0, 100) + '...',
            method: 'shouldBypassAI',
            error: errorMessage
          });
        }

        const shouldUseAIResult = ConversationStateMachine.shouldUseAIResponse();
        if (!shouldUseAIResult.success) {
          const errorMessage = (shouldUseAIResult as { success: false; error: LegalIntakeError }).error.message;
          throw new BusinessLogicError('Failed to determine if AI should be used', {
            method: 'shouldBypassAI',
            error: errorMessage
          });
        }

        return stateResult.data === ConversationState.READY_TO_CREATE_MATTER || 
               !shouldUseAIResult.data;
      },
      {
        conversationText: conversationText?.substring(0, 100) + '...',
        method: 'shouldBypassAI'
      },
      BusinessLogicError
    );
  }

  /**
   * Gets the system prompt for AI when it should be used
   */
  static getSystemPromptForAI(state: ConversationState, context: ConversationContext): ErrorResult<string> {
    return withErrorHandlingSync(
      () => {
        // Validate input parameters
        if (!state) {
          throw new ValidationError('Conversation state is required', {
            state: state,
            method: 'getSystemPromptForAI'
          });
        }

        if (!context) {
          throw new ValidationError('Conversation context is required', {
            context: context,
            method: 'getSystemPromptForAI'
          });
        }

        return buildSystemPrompt(context, state);
      },
      {
        state: state,
        context: context,
        method: 'getSystemPromptForAI'
      },
      ValidationError
    );
  }
}
