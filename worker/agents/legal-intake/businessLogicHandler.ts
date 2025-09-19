import { ConversationStateMachine, ConversationState, ConversationContext } from './conversationStateMachine.js';
import { PromptBuilder } from '../../utils/promptBuilder.js';
import { TOOL_HANDLERS } from './index.js';
import { Logger } from '../../utils/logger.js';

export interface BusinessLogicResult {
  shouldCreateMatter: boolean;
  response: string;
  matterParams?: any;
  useAIResponse: boolean;
  state: ConversationState;
}

export class BusinessLogicHandler {
  /**
   * Main business logic handler that determines what should happen
   */
  static async handleConversation(
    conversationText: string,
    env: any,
    teamConfig: any
  ): Promise<BusinessLogicResult> {
    const context = await PromptBuilder.extractConversationInfo(conversationText, env);
    const state = await ConversationStateMachine.getCurrentState(conversationText, env);
    
    Logger.debug('🔍 Business Logic Analysis:', {
      state,
      context,
      shouldCreateMatter: ConversationStateMachine.shouldCreateMatter(context),
      isGeneralInquiry: ConversationStateMachine.isGeneralInquiry(conversationText)
    });
    
    // Debug logging to see what's happening
    console.log('🔍 DEBUG - Business Logic Analysis:');
    console.log('  State:', state);
    console.log('  Context:', JSON.stringify(context, null, 2));
    console.log('  Should Create Matter:', ConversationStateMachine.shouldCreateMatter(context));
    console.log('  Is General Inquiry:', ConversationStateMachine.isGeneralInquiry(conversationText));
    console.log('  Conversation Text:', conversationText);

    // Handle matter creation
    if (state === ConversationState.READY_TO_CREATE_MATTER) {
      const matterParams = {
        name: context.name || 'Unknown',
        matter_type: context.legalIssueType || 'General Consultation',
        description: context.description || 'Client seeking legal assistance',
        email: context.email,
        phone: context.phone,
        location: context.location,
        opposing_party: context.opposingParty
      };

      try {
        const toolResult = await TOOL_HANDLERS.create_matter(matterParams, env, teamConfig);
        return {
          shouldCreateMatter: true,
          response: toolResult.message || toolResult.response || 'Matter created successfully.',
          matterParams,
          useAIResponse: false,
          state: ConversationState.MATTER_CREATED
        };
      } catch (error) {
        Logger.error('Matter creation failed:', error);
        return {
          shouldCreateMatter: false,
          response: "I'm sorry, there was an issue creating your matter. Let me try to help you in a different way.",
          useAIResponse: true,
          state
        };
      }
    }

    // Let AI handle the response and matter creation decisions
    return {
      shouldCreateMatter: false,
      response: '',
      useAIResponse: true,
      state
    };
  }

  /**
   * Determines if we should bypass AI entirely and use rule-based logic
   */
  static shouldBypassAI(conversationText: string): boolean {
    const state = ConversationStateMachine.getCurrentState(conversationText);
    return state === ConversationState.READY_TO_CREATE_MATTER || 
           !ConversationStateMachine.shouldUseAIResponse(state);
  }

  /**
   * Gets the system prompt for AI when it should be used
   */
  static getSystemPromptForAI(state: ConversationState, context: ConversationContext): string {
    return `You are a legal intake specialist. Help clients with their legal matters.

**CURRENT CONTEXT:**
- Has Name: ${context.hasName ? 'YES' : 'NO'} ${context.name ? `(${context.name})` : ''}
- Has Legal Issue: ${context.hasLegalIssue ? 'YES' : 'NO'} ${context.legalIssueType ? `(${context.legalIssueType})` : ''}
- Has Description: ${context.description ? 'YES' : 'NO'}
- Has Email: ${context.hasEmail ? 'YES' : 'NO'} ${context.email ? `(${context.email})` : ''}
- Has Phone: ${context.hasPhone ? 'YES' : 'NO'} ${context.phone ? `(${context.phone})` : ''}
- Has Location: ${context.hasLocation ? 'YES' : 'NO'} ${context.location ? `(${context.location})` : ''}

**CRITICAL RULES:**
- NEVER repeat the same response twice
- ALWAYS acknowledge what the user just said
- Build on previous conversation - don't ignore context
- Only ask for information you don't already have
- CREATE MATTER when you have: name + legal issue + description + contact info + location

**TOOLS:**
- create_matter: Use when you have ALL required information

**FORMAT:**
TOOL_CALL: create_matter
PARAMETERS: {
  "name": "Client Name",
  "matter_type": "Family Law", 
  "description": "Description",
  "email": "email@example.com",
  "phone": "123-456-7890",
  "location": "City, State",
  "opposing_party": null
}

**MATTER TYPES:** Family Law, Personal Injury, Employment Law, Landlord/Tenant, Business Law, Criminal Law, General Consultation`;
  }
}
