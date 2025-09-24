import type { Env, AgentMessage } from '../types.js';

export interface CaseDraft {
  matter_type: string;
  key_facts: string[];
  timeline?: string;
  parties: Array<{
    role: string;
    name?: string;
    relationship?: string;
  }>;
  documents: string[];
  evidence: string[];
  jurisdiction?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'ready';
  created_at: string;
  updated_at: string;
}

export interface DocumentChecklist {
  matter_type: string;
  required: string[];
  provided: string[];
  missing: string[];
  last_updated: string;
}

export interface GeneratedPDF {
  filename: string;
  size: number;
  generatedAt: string;
  matterType: string;
}

export interface LawyerSearchResults {
  matterType: string;
  lawyers: Array<{
    id: string;
    name: string;
    firm?: string;
    location: string;
    practiceAreas: string[];
    rating?: number;
    reviewCount?: number;
    phone?: string;
    email?: string;
    website?: string;
    bio?: string;
    experience?: string;
    languages?: string[];
    consultationFee?: number;
    availability?: string;
  }>;
  total: number;
}

export interface ConversationContext {
  sessionId: string;
  teamId: string;
  establishedMatters: string[];
  jurisdiction: string | null;
  safetyFlags: string[];
  userIntent: 'intake' | 'lawyer_contact' | 'general_info' | 'unclear';
  conversationPhase: 'initial' | 'gathering_info' | 'qualifying' | 'contact_collection' | 'completed';
  lastUpdated: number;
  messageCount: number;
  // Lead qualification data
  urgencyLevel: string | null;
  timeline: string | null;
  hasPreviousLawyer: boolean | null;
  // Contact information
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  // Case draft and document tracking
  caseDraft?: CaseDraft;
  documentChecklist?: DocumentChecklist;
  generatedPDF?: GeneratedPDF;
  lawyerSearchResults?: LawyerSearchResults;
  // Pending contact form for skip-to-lawyer flow
  pendingContactForm?: {
    matterType: string;
    urgency: string;
    reason: string;
  };
}

export class ConversationContextManager {
  private static readonly KV_PREFIX = 'conv_ctx:';
  private static readonly TTL = 3600; // 1 hour

  /**
   * Load conversation context from KV storage
   */
  static async load(sessionId: string, teamId: string, env: Env): Promise<ConversationContext> {
    const key = `${this.KV_PREFIX}${sessionId}:${teamId}`;
    
    try {
      const stored = await env.CHAT_SESSIONS.get(key);
      if (stored) {
        const context = JSON.parse(stored) as ConversationContext;
        // Update last accessed time
        context.lastUpdated = Date.now();
        return context;
      }
    } catch (error) {
      console.warn('Failed to load conversation context:', error);
    }

    // Return default context if not found
    return this.createDefaultContext(sessionId, teamId);
  }

  /**
   * Save conversation context to KV storage
   */
  static async save(context: ConversationContext, env: Env): Promise<boolean> {
    const key = `${this.KV_PREFIX}${context.sessionId}:${context.teamId}`;
    
    try {
      await env.CHAT_SESSIONS.put(key, JSON.stringify(context), {
        expirationTtl: this.TTL
      });
      return true;
    } catch (error) {
      console.error('Failed to save conversation context:', error);
      return false;
    }
  }

  /**
   * Create default conversation context
   */
  private static createDefaultContext(sessionId: string, teamId: string): ConversationContext {
    return {
      sessionId,
      teamId,
      establishedMatters: [],
      jurisdiction: null,
      safetyFlags: [],
      userIntent: 'unclear',
      conversationPhase: 'initial',
      lastUpdated: Date.now(),
      messageCount: 0,
      urgencyLevel: null,
      timeline: null,
      hasPreviousLawyer: null,
      contactInfo: {},
      caseDraft: undefined,
      documentChecklist: undefined,
      generatedPDF: undefined,
      lawyerSearchResults: undefined
    };
  }

  /**
   * Update context with full conversation history
   */
  static updateContext(
    context: ConversationContext,
    messages: AgentMessage[]
  ): ConversationContext {
    const updated = { ...context };
    updated.messageCount = messages.length;
    updated.lastUpdated = Date.now();

    // Build conversation history from all messages
    const conversationText = messages.map(msg => msg.content).join(' ');
    const userMessages = messages.filter(msg => msg.role === 'user' || msg.isUser);
    const latestUserMessage = userMessages[userMessages.length - 1];

    // Extract legal matter types from full conversation
    const legalMatterTypes = this.extractLegalMatterTypes(conversationText);
    legalMatterTypes.forEach(matter => {
      if (!updated.establishedMatters.includes(matter)) {
        updated.establishedMatters.push(matter);
      }
    });

    // Update user intent based on full conversation context
    updated.userIntent = this.determineUserIntent(conversationText, updated);

    // Update conversation phase using full conversation context
    updated.conversationPhase = this.determineConversationPhase(updated, conversationText);

    // Extract contact information from full conversation
    const contactInfo = this.extractContactInfo(conversationText);
    if (contactInfo.name) updated.contactInfo.name = contactInfo.name;
    if (contactInfo.email) updated.contactInfo.email = contactInfo.email;
    if (contactInfo.phone) updated.contactInfo.phone = contactInfo.phone;
    if (contactInfo.location) updated.contactInfo.location = contactInfo.location;

    // Extract jurisdiction from full conversation
    const jurisdiction = this.extractJurisdiction(conversationText);
    if (jurisdiction) updated.jurisdiction = jurisdiction;

    return updated;
  }

  /**
   * Extract legal matter types from message content
   */
  private static extractLegalMatterTypes(content: string): string[] {
    const legalMatterPatterns = {
      'Family Law': /(divorce|custody|child support|family dispute|marriage|paternity|alimony)/i,
      'Employment Law': /(employment|workplace|termination|discrimination|harassment|wage|overtime|fired|laid off)/i,
      'Business Law': /(business|contract|corporate|company|startup|partnership|LLC|corporation)/i,
      'Intellectual Property': /(patent|trademark|copyright|intellectual property|IP|trade secret)/i,
      'Personal Injury': /(accident|injury|personal injury|damage|liability|negligence|car crash|slip and fall)/i,
      'Criminal Law': /(criminal|arrest|charges|trial|violation|felony|misdemeanor|DUI|theft)/i,
      'Civil Law': /(civil|dispute|contract|property|tort|lawsuit)/i,
      'Tenant Rights Law': /(tenant|landlord|rental|eviction|housing|lease|rent)/i,
      'Probate and Estate Planning': /(estate|probate|inheritance|will|trust|power of attorney)/i,
      'Special Education and IEP Advocacy': /(special education|IEP|disability|accommodation|504 plan)/i,
      'Small Business and Nonprofits': /(small business|nonprofit|non-profit|entrepreneur|startup)/i,
      'Contract Review': /(contract|agreement|terms|clause|legal document)/i
    };

    const foundMatters: string[] = [];
    for (const [matterType, pattern] of Object.entries(legalMatterPatterns)) {
      if (pattern.test(content)) {
        foundMatters.push(matterType);
      }
    }

    return foundMatters;
  }

  /**
   * Determine user intent from message content
   */
  private static determineUserIntent(message: string, context: ConversationContext): ConversationContext['userIntent'] {
    // Check for explicit lawyer contact requests
    if (/(need a lawyer|want a lawyer|talk to a lawyer|speak with attorney|hire an attorney)/i.test(message)) {
      return 'lawyer_contact';
    }

    // Check for general information requests
    if (/(what is|how does|explain|tell me about|information about)/i.test(message)) {
      return 'general_info';
    }

    // If we have established legal matters, likely intake
    if (context.establishedMatters.length > 0) {
      return 'intake';
    }

    // Check for legal issue descriptions
    if (/(help with|need help|problem with|issue with|situation with)/i.test(message)) {
      return 'intake';
    }

    return 'unclear';
  }

  /**
   * Determine conversation phase based on context
   */
  private static determineConversationPhase(context: ConversationContext, message: string): ConversationContext['conversationPhase'] {
    // If we have contact info and legal matters, we're in contact collection
    if (context.contactInfo.name && context.contactInfo.email && context.establishedMatters.length > 0) {
      return 'contact_collection';
    }

    // If we have legal matters but no contact info, we're qualifying
    if (context.establishedMatters.length > 0 && !context.contactInfo.name) {
      return 'qualifying';
    }

    // If we have some information but no clear legal matter, gathering info
    if (context.messageCount > 2) {
      return 'gathering_info';
    }

    return 'initial';
  }

  /**
   * Extract contact information from message
   */
  private static extractContactInfo(message: string): Partial<ConversationContext['contactInfo']> {
    const contactInfo: Partial<ConversationContext['contactInfo']> = {};

    // Extract email
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      contactInfo.email = emailMatch[1];
    }

    // Extract phone
    const phoneMatch = message.match(/(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[1];
    }

    // Extract name (simple pattern)
    const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+([A-Za-z\s]+)/i);
    if (nameMatch) {
      contactInfo.name = nameMatch[1].trim();
    }

    // Extract location
    const locationMatch = message.match(/(?:i'm in|i live in|located in|from)\s+([A-Za-z\s,]+)/i);
    if (locationMatch) {
      contactInfo.location = locationMatch[1].trim();
    }

    return contactInfo;
  }

  /**
   * Extract jurisdiction from message
   */
  private static extractJurisdiction(message: string): string | null {
    // Simple state extraction
    const stateMatch = message.match(/\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i);
    
    if (stateMatch) {
      return stateMatch[1];
    }

    return null;
  }

  /**
   * Update case draft in conversation context
   */
  static updateCaseDraft(
    context: ConversationContext,
    caseDraft: CaseDraft
  ): ConversationContext {
    const updated = { ...context };
    updated.caseDraft = {
      ...caseDraft,
      updated_at: new Date().toISOString()
    };
    updated.lastUpdated = Date.now();
    return updated;
  }

  /**
   * Update document checklist in conversation context
   */
  static updateDocumentChecklist(
    context: ConversationContext,
    documentChecklist: DocumentChecklist
  ): ConversationContext {
    const updated = { ...context };
    updated.documentChecklist = {
      ...documentChecklist,
      last_updated: new Date().toISOString()
    };
    updated.lastUpdated = Date.now();
    return updated;
  }

  /**
   * Add document to checklist
   */
  static addDocumentToChecklist(
    context: ConversationContext,
    documentType: string
  ): ConversationContext {
    const updated = { ...context };
    
    if (!updated.documentChecklist) {
      return updated;
    }

    const checklist = { ...updated.documentChecklist };
    
    // Ensure provided and missing are arrays
    if (!Array.isArray(checklist.provided)) {
      checklist.provided = [];
    }
    if (!Array.isArray(checklist.missing)) {
      checklist.missing = [];
    }
    
    // Add to provided if not already there
    if (!checklist.provided.includes(documentType)) {
      checklist.provided.push(documentType);
    }
    
    // Remove from missing if it was there
    checklist.missing = checklist.missing.filter(doc => doc !== documentType);
    
    updated.documentChecklist = {
      ...checklist,
      last_updated: new Date().toISOString()
    };
    updated.lastUpdated = Date.now();
    
    return updated;
  }

  /**
   * Initialize document checklist for a matter type
   */
  static async initializeDocumentChecklist(
    context: ConversationContext,
    matterType: string,
    env: Env
  ): Promise<ConversationContext> {
    const updated = { ...context };
    
    try {
      // Import DocumentRequirementService
      const { DocumentRequirementService } = await import('../services/DocumentRequirementService.js');
      const docService = new DocumentRequirementService(env);
      const requirements = await docService.getRequirements(matterType);
      
      updated.documentChecklist = {
        matter_type: matterType,
        required: requirements.requirements.map(req => req.documentType),
        provided: [],
        missing: requirements.requirements.map(req => req.documentType),
        last_updated: new Date().toISOString()
      };
      updated.lastUpdated = Date.now();
    } catch (error) {
      console.warn('Failed to initialize document checklist:', error);
      // Create basic checklist if service fails
      updated.documentChecklist = {
        matter_type: matterType,
        required: ['General case documents'],
        provided: [],
        missing: ['General case documents'],
        last_updated: new Date().toISOString()
      };
    }
    
    return updated;
  }
}
