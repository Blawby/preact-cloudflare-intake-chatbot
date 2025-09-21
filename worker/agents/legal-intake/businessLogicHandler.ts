import { Logger } from '../../utils/logger.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import { ConversationStateMachine, ConversationState, ConversationContext } from './conversationStateMachine.js';
import { TOOL_HANDLERS } from './matterCreationHandler.js';
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
  private static readonly SYSTEM_PROMPT_TEMPLATE = `You are a legal intake specialist for North Carolina Legal Services. Your primary goal is to empathetically assist users, understand their legal needs, and gather necessary information to create a legal matter.

**Your persona:**
- Empathetic, caring, and professional.
- Focus on understanding the user's situation and making them feel heard.
- Guide the conversation naturally to collect required information (name, legal issue, description, contact info, location).
- Do NOT sound like a robot or a form. Engage in a natural, human-like conversation.
- Avoid asking for all information at once. Ask follow-up questions based on what the user provides.
- If information is missing, politely ask for it in a conversational manner.

**CURRENT CONTEXT (for your reference, do not directly expose this to the user):**
{CONTEXT_SECTION}

**CRITICAL RULES:**
{RULES_SECTION}

**CRITICAL: ALWAYS ASK FOR CONFIRMATION**
Before creating a matter, you MUST ask the user to confirm the legal issue type:
- "Based on what you've told me, this sounds like it might be a [Family Law/Employment Law/etc.] matter. Is that correct?"
- Only create the matter after they confirm the legal issue type
- If they disagree with your assessment, ask them to clarify what type of legal help they need
- EXCEPTION: If the user explicitly asks you to create a matter AND you have all required information (name, legal issue type, description, contact info, location), you MUST create it directly using the create_matter tool
- When the user says "please create a matter for me" or "create a matter" and you have the required information, use the create_matter tool immediately

**Example conversational flow for matter creation:**
User: "I need help with a divorce."
AI: "I'm sorry to hear that. I can help you with that. To get started, could you please tell me your full name and a brief description of your situation?"
User: "My name is Jane Doe, and my husband is divorcing me. I need help with child custody."
AI: "Thank you, Jane. I understand this is a difficult time. To help you further, could you also provide your email address and phone number, and let me know your city and state?"
User: "My email is jane@example.com, phone is 555-123-4567, and I live in Raleigh, NC."
AI: "Thank you, Jane. I have all the necessary information. I'm now creating a matter for your divorce and child custody case. You will be contacted shortly by one of our attorneys."

**TOOL CALL FORMAT:**
When you need to create a matter, use this exact format:
TOOL_CALL: create_matter
PARAMETERS: {
  "name": "John Smith",
  "matter_type": "Employment Law",
  "description": "Boss forcing overtime without pay",
  "email": "john@example.com",
  "phone": "(555) 234-5678",
  "location": "Raleigh, North Carolina"
}

**EXAMPLE: User provides all info and asks to create matter:**
User: "my name is John Smith and I need help with employment law. My boss is forcing me to work overtime without pay. My email is john@example.com, my phone is (555) 234-5678, and I live in Raleigh, North Carolina. Please create a matter for me."

AI Response: "Thank you, John. I have all the information I need. I'm creating a matter for your employment law case now."

TOOL_CALL: create_matter
PARAMETERS: {
  "name": "John Smith",
  "matter_type": "Employment Law",
  "description": "Boss forcing overtime without pay",
  "email": "john@example.com",
  "phone": "(555) 234-5678",
  "location": "Raleigh, North Carolina"
}

Your response should be in markdown format.`;

  /**
   * Builds the context section for the system prompt
   */
  private static buildContextSection(context: ConversationContext, state: ConversationState): string {
    return `- Has Name: ${context.hasName ? 'YES' : 'NO'} ${context.name ? `(${context.name})` : ''}
- Has Legal Issue: ${context.hasLegalIssue ? 'YES' : 'NO'} ${context.legalIssueType ? `(${context.legalIssueType})` : ''}
- Has Description: ${context.description ? 'YES' : 'NO'}
- Has Email: ${context.hasEmail ? 'YES' : 'NO'} ${context.email ? `(${context.email})` : ''}
- Has Phone: ${context.hasPhone ? 'YES' : 'NO'} ${context.phone ? `(${context.phone})` : ''}
- Has Location: ${context.hasLocation ? 'YES' : 'NO'} ${context.location ? `(${context.location})` : ''}
- Current State: ${state}`;
  }

  /**
   * Builds the rules section for the system prompt
   */
  private static buildRulesSection(): string {
    return `- NEVER repeat the same response or question.
- ALWAYS maintain an empathetic and supportive tone.
- If the user provides enough information to create a matter (name, legal issue, description, and at least one contact method like email or phone, and location), you MUST call the \`create_matter\` tool.
- If the user explicitly asks you to create a matter and you have all required information, create it immediately without asking for confirmation.
- If the user's query is a general inquiry (e.g., "what services do you offer?", "how much does it cost?"), respond conversationally without trying to extract personal details or create a matter.
- If the user asks a question that can be answered directly (e.g., "what is family law?"), provide a concise and helpful answer.
- If the user provides sensitive information (e.g., "I ran over my child"), acknowledge the sensitivity with empathy and gently guide them towards providing necessary details for a matter, or offer to connect them with a lawyer if appropriate.
- Do NOT make assumptions about missing information. Always ask the user.
- Ensure all required fields for \`create_matter\` are present before calling the tool. If not, ask for the missing pieces.
- When asking for information, be specific but polite. For example, instead of "Give me your email", say "Could you please provide your email address so we can reach you?"
- If the user provides an invalid format for an input (e.g., email, phone, location), politely inform them and ask for the correct format.
- Your responses should be concise and to the point, but still friendly and helpful.
- Do NOT generate tool calls for \`collect_contact_info\` or \`request_lawyer_review\`. Only use \`create_matter\` when all necessary information is available.
- When you have all required information and the user asks you to create a matter, you MUST use the create_matter tool immediately.
- If the user explicitly states they do not want to provide certain information, respect their decision and try to proceed with what you have, or explain why certain information is necessary for matter creation.
- If the user's intent is unclear, ask clarifying questions.
- If the user is just greeting you, respond with a friendly greeting and offer assistance.
- If the user is asking for general information about legal topics, provide it concisely.
- If the user is asking about services, provide a general overview of services offered by North Carolina Legal Services.`;
  }

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
   * Handles the main business logic for conversation processing
   */
  static async handleConversation(
    conversationText: string,
    env: Env,
    teamConfig: any
  ): Promise<ErrorResult<BusinessLogicResult>> {
    return withErrorHandling(
      async () => {
        // Validate input parameters
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

        let context: ConversationContext;
        
        // Only attempt to extract context if the conversation is long enough
        if (conversationText && conversationText.trim().length >= 20) {
          try {
            context = await PromptBuilder.extractConversationInfo(conversationText, env);
          } catch (error) {
            Logger.error('Failed to extract conversation info, using minimal context:', error);
            context = this.createMinimalContext();
          }
        } else {
          // For very short conversations, provide a minimal context
          context = this.createMinimalContext();
        }
        
        const stateResult = await ConversationStateMachine.getCurrentState(conversationText, env);
        if (!stateResult.success) {
          const errorMessage = (stateResult as { success: false; error: LegalIntakeError }).error.message;
          throw new BusinessLogicError('Failed to determine conversation state', {
            conversationText: conversationText.substring(0, 100) + '...',
            method: 'handleConversation',
            error: errorMessage
          });
        }

        const state = stateResult.data;
        
        // Add state to context to satisfy ConversationContext interface
        const fullContext = { ...context, state };
        
        // Get shouldCreateMatter result
        const shouldCreateMatterResult = ConversationStateMachine.shouldCreateMatter(fullContext);
        if (!shouldCreateMatterResult.success) {
          const errorMessage = (shouldCreateMatterResult as { success: false; error: LegalIntakeError }).error.message;
          throw new BusinessLogicError('Failed to determine if matter should be created', {
            context: fullContext,
            method: 'handleConversation',
            error: errorMessage
          });
        }

        // Get isGeneralInquiry result
        const isGeneralInquiryResult = await ConversationStateMachine.isGeneralInquiry(conversationText, env);
        if (!isGeneralInquiryResult.success) {
          const errorMessage = (isGeneralInquiryResult as { success: false; error: LegalIntakeError }).error.message;
          throw new BusinessLogicError('Failed to determine if conversation is general inquiry', {
            conversationText: conversationText.substring(0, 100) + '...',
            method: 'handleConversation',
            error: errorMessage
          });
        }
        
        Logger.debug('🔍 Business Logic Analysis:', {
          state,
          context: fullContext,
          shouldCreateMatter: shouldCreateMatterResult.data,
          isGeneralInquiry: isGeneralInquiryResult.data
        });

        // Even when we have all the information, let the AI ask for confirmation first
        // The AI will handle matter creation through tool calls after getting user confirmation

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

        const contextSection = this.buildContextSection(context, state);
        const rulesSection = this.buildRulesSection();
        
        return this.SYSTEM_PROMPT_TEMPLATE
          .replace('{CONTEXT_SECTION}', contextSection)
          .replace('{RULES_SECTION}', rulesSection);
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
