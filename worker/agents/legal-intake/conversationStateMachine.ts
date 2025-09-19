import { PromptBuilder } from '../../utils/promptBuilder.js';

export enum ConversationState {
  INITIAL = 'initial',
  COLLECTING_NAME = 'collecting_name',
  COLLECTING_LEGAL_ISSUE = 'collecting_legal_issue',
  COLLECTING_DETAILS = 'collecting_details',
  COLLECTING_EMAIL = 'collecting_email',
  COLLECTING_PHONE = 'collecting_phone',
  COLLECTING_LOCATION = 'collecting_location',
  COLLECTING_OPPOSING_PARTY = 'collecting_opposing_party',
  READY_TO_CREATE_MATTER = 'ready_to_create_matter',
  MATTER_CREATED = 'matter_created',
  MATTER_CREATION_FAILED = 'matter_creation_failed',
  GENERAL_INQUIRY = 'general_inquiry'
}

export interface ConversationContext {
  hasName: boolean;
  hasLegalIssue: boolean;
  hasContactInfo: boolean;
  hasLocation: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasOpposingParty: boolean;
  legalIssueType?: string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  location?: string;
  opposingParty?: string;
  state: ConversationState;
}

export class ConversationStateMachine {
  /**
   * Determines if this is a sensitive legal matter that requires immediate attention
   */
  private static isSensitiveMatter(context: ConversationContext): boolean {
    return context.legalIssueType === 'Criminal Law' || 
           context.legalIssueType === 'Personal Injury' ||
           (context.description && (
             context.description.toLowerCase().includes('death') ||
             context.description.toLowerCase().includes('died') ||
             context.description.toLowerCase().includes('fatal') ||
             context.description.toLowerCase().includes('killed') ||
             context.description.toLowerCase().includes('accident') ||
             context.description.toLowerCase().includes('arrest')
           ));
  }

  /**
   * Determines if this is a general inquiry that shouldn't result in matter creation
   */
  static async isGeneralInquiry(conversationText: string, env?: any): Promise<boolean> {
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
      /\bservices in my area\b/i,
      /\bpricing\b/i,
      /\bcost\b/i,
      /\bwhat.*services\b/i,
      /\bdo you provide\b/i,
      /\bnot sure if you provide\b/i,
      /\bconcerned about.*cost\b/i,
      /\btell me about.*pricing\b/i,
      /\bnot sure what kind\b/i,
      /\bwhat kind of.*help\b/i
    ];
    return generalPatterns.some(pattern => pattern.test(conversationText));
  }

  /**
   * Determines if we should create a matter based on available information
   */
  static shouldCreateMatter(context: ConversationContext): boolean {
    // For intake agent, we need essential information before creating matters
    // This ensures we have the details needed for a lawyer to contact the client
    
    // Minimum required: name + legal issue + description
    const hasMinimumInfo = context.hasName && 
                          Boolean(context.legalIssueType) && 
                          Boolean(context.description);
    
    // For sensitive matters, only require minimum info
    if (this.isSensitiveMatter(context)) {
      return hasMinimumInfo;
    }
    
    // For standard matters, require minimum info + contact method + location
    const hasContactMethod = context.hasEmail || context.hasPhone;
    const hasLocation = context.hasLocation;
    
    return hasMinimumInfo && hasContactMethod && hasLocation;
  }

  /**
   * Gets the current conversation state based on context
   */
  static async getCurrentState(conversationText: string, env?: any): Promise<ConversationState> {
    const context = await PromptBuilder.extractConversationInfo(conversationText, env);
    
    // Check for general inquiries first
    if (await this.isGeneralInquiry(conversationText, env)) {
      return ConversationState.GENERAL_INQUIRY;
    }

    // Check if we have all required info for matter creation
    // Create a temporary context with state property to satisfy ConversationContext interface
    const contextWithState = { ...context, state: ConversationState.INITIAL };
    if (this.shouldCreateMatter(contextWithState)) {
      return ConversationState.READY_TO_CREATE_MATTER;
    }

    // Check if this is a sensitive matter that needs immediate attention
    const isSensitiveMatter = this.isSensitiveMatter(contextWithState);

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

    // For standard matters, try to collect contact information but don't block
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
  }

  /**
   * Gets the appropriate response based on current state
   */
  static getResponseForState(state: ConversationState, context: ConversationContext): string {
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
          const isSensitiveMatter = this.isSensitiveMatter(context);
          
          if (isSensitiveMatter) {
            return `I understand you're dealing with a ${context.legalIssueType.toLowerCase()} issue. This must be very difficult for you. Can you tell me more about what's happening so I can help you get the right legal assistance?`;
          }
          return `I understand you're dealing with a ${context.legalIssueType.toLowerCase()} issue. Can you tell me more about what's happening?`;
        }
        return `I understand you need legal help. Can you tell me more about what's happening? What type of legal issue are you facing?`;
      
      case ConversationState.COLLECTING_EMAIL:
        return `Thank you for that information. What's your email address so we can contact you?`;
      
      case ConversationState.COLLECTING_PHONE:
        return `Great! What's your phone number?`;
      
      case ConversationState.COLLECTING_LOCATION:
        return `What city and state are you located in?`;
      
      case ConversationState.COLLECTING_OPPOSING_PARTY:
        return `Is there an opposing party involved in this matter? If so, who are they? (This is optional - you can say "none" or "not applicable")`;
      
      case ConversationState.READY_TO_CREATE_MATTER:
        return "Perfect! I have all the information I need to create your matter.";
      
      case ConversationState.MATTER_CREATED:
        return "Your matter has been created successfully.";
      
      default:
        return "I'd be happy to help you with your legal matter. Could you please tell me your name?";
    }
  }

  /**
   * Determines if we should use AI response generation or rule-based response
   */
  static shouldUseAIResponse(): boolean {
    // Let AI handle most responses - it's better at understanding context
    return true;
  }
}
