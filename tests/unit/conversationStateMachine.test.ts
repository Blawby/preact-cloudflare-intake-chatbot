import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationStateMachine, ConversationState } from '../../worker/agents/legal-intake/conversationStateMachine.js';
import { hasContactInformation } from '../../worker/utils/contactInfoUtils.js';
import type { Env } from '../../worker/types.js';

// Mock the contact info utility
vi.mock('../../worker/utils/contactInfoUtils.js', () => ({
  hasContactInformation: vi.fn(),
  detectContactInfo: vi.fn(),
  logContactInfoDetection: vi.fn()
}));

// Mock the prompt builder
vi.mock('../../worker/utils/promptBuilder.js', () => ({
  PromptBuilder: {
    extractConversationInfo: vi.fn()
  }
}));

// Mock the logger
vi.mock('../../worker/utils/logger.js', () => ({
  Logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}));

// Mock the AI service
vi.mock('../../worker/services/AIService.js', () => ({
  AIService: {
    analyzeGeneralInquiry: vi.fn()
  }
}));

describe('ConversationStateMachine Business Logic', () => {
  // Create a properly typed mock environment that satisfies the Env interface
  // Using Record<string, any> for Cloudflare-specific types that aren't used in these tests
  const mockEnv: Env = {
    AI: {} as any, // Mock AI interface - not used in these specific tests
    DB: {} as any, // Mock D1Database - not used in these specific tests
    CHAT_SESSIONS: {} as any, // Mock KVNamespace - not used in these specific tests
    RESEND_API_KEY: 'test-api-key',
    DOC_EVENTS: {} as any, // Mock Queue - not used in these specific tests
    PARALEGAL_TASKS: {} as any, // Mock Queue - not used in these specific tests
    PARALEGAL_AGENT: {} as any // Mock DurableObjectNamespace - not used in these specific tests
  };
  const mockConversationText = 'Test conversation text';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentState business logic matrix', () => {
    it('should return GATHERING_INFORMATION when no legal info and no contact info', async () => {
      // Mock context with no legal info and no contact info
      const mockContext = {
        hasLegalIssue: false,
        legalIssueType: null,
        description: null,
        isQualifiedLead: false,
        hasPreviousLawyer: null,
        isSensitiveMatter: false,
        isGeneralInquiry: false,
        shouldCreateMatter: false
      };

      vi.mocked(require('../../worker/utils/promptBuilder.ts').PromptBuilder.extractConversationInfo)
        .mockResolvedValue(mockContext);
      
      vi.mocked(hasContactInformation).mockReturnValue(false);

      const result = await ConversationStateMachine.getCurrentState(mockConversationText, mockEnv);
      
      expect(result).toBe(ConversationState.GATHERING_INFORMATION);
    });

    it('should return SHOWING_CONTACT_FORM when legal info present but no contact info', async () => {
      // Mock context with legal info but no contact info
      const mockContext = {
        hasLegalIssue: true,
        legalIssueType: 'Personal Injury',
        description: 'Car accident with injuries',
        isQualifiedLead: true,
        hasPreviousLawyer: null,
        isSensitiveMatter: false,
        isGeneralInquiry: false,
        shouldCreateMatter: true
      };

      vi.mocked(require('../../worker/utils/promptBuilder.ts').PromptBuilder.extractConversationInfo)
        .mockResolvedValue(mockContext);
      
      vi.mocked(hasContactInformation).mockReturnValue(false);

      const result = await ConversationStateMachine.getCurrentState(mockConversationText, mockEnv);
      
      expect(result).toBe(ConversationState.SHOWING_CONTACT_FORM);
    });

    it('should return GATHERING_INFORMATION when contact info present but no legal info', async () => {
      // Mock context with contact info but no legal info
      const mockContext = {
        hasLegalIssue: false,
        legalIssueType: null,
        description: null,
        isQualifiedLead: false,
        hasPreviousLawyer: null,
        isSensitiveMatter: false,
        isGeneralInquiry: false,
        shouldCreateMatter: false
      };

      vi.mocked(require('../../worker/utils/promptBuilder.ts').PromptBuilder.extractConversationInfo)
        .mockResolvedValue(mockContext);
      
      vi.mocked(hasContactInformation).mockReturnValue(true);

      const result = await ConversationStateMachine.getCurrentState(mockConversationText, mockEnv);
      
      expect(result).toBe(ConversationState.GATHERING_INFORMATION);
    });

    it('should return READY_TO_CREATE_MATTER when both legal and contact info present', async () => {
      // Mock context with both legal and contact info
      const mockContext = {
        hasLegalIssue: true,
        legalIssueType: 'Personal Injury',
        description: 'Car accident with injuries',
        isQualifiedLead: true,
        hasPreviousLawyer: null,
        isSensitiveMatter: false,
        isGeneralInquiry: false,
        shouldCreateMatter: true
      };

      vi.mocked(require('../../worker/utils/promptBuilder.ts').PromptBuilder.extractConversationInfo)
        .mockResolvedValue(mockContext);
      
      vi.mocked(hasContactInformation).mockReturnValue(true);

      const result = await ConversationStateMachine.getCurrentState(mockConversationText, mockEnv);
      
      expect(result).toBe(ConversationState.READY_TO_CREATE_MATTER);
    });

    it('should return QUALIFYING_LEAD when legal info present but lead not qualified', async () => {
      // Mock context with legal info but unqualified lead
      const mockContext = {
        hasLegalIssue: true,
        legalIssueType: 'Personal Injury',
        description: 'Car accident with injuries',
        isQualifiedLead: false, // Not qualified
        hasPreviousLawyer: null,
        isSensitiveMatter: false,
        isGeneralInquiry: false,
        shouldCreateMatter: true
      };

      vi.mocked(require('../../worker/utils/promptBuilder.ts').PromptBuilder.extractConversationInfo)
        .mockResolvedValue(mockContext);
      
      vi.mocked(hasContactInformation).mockReturnValue(false);

      const result = await ConversationStateMachine.getCurrentState(mockConversationText, mockEnv);
      
      expect(result).toBe(ConversationState.QUALIFYING_LEAD);
    });

    it('should return GENERAL_INQUIRY when conversation is a general inquiry', async () => {
      // Mock context indicating general inquiry
      const mockContext = {
        hasLegalIssue: false,
        legalIssueType: null,
        description: null,
        isQualifiedLead: false,
        hasPreviousLawyer: null,
        isSensitiveMatter: false,
        isGeneralInquiry: true, // General inquiry
        shouldCreateMatter: false
      };

      vi.mocked(require('../../worker/utils/promptBuilder.ts').PromptBuilder.extractConversationInfo)
        .mockResolvedValue(mockContext);
      
      vi.mocked(hasContactInformation).mockReturnValue(false);

      // Mock the general inquiry check
      vi.mocked(require('../../worker/services/AIService.js').AIService.analyzeGeneralInquiry)
        .mockResolvedValue({ success: true, data: true });

      const result = await ConversationStateMachine.getCurrentState(mockConversationText, mockEnv);
      
      expect(result).toBe(ConversationState.GENERAL_INQUIRY);
    });
  });

  describe('hasContactInformation', () => {
    it('should return true when contact information is detected', () => {
      vi.mocked(hasContactInformation).mockReturnValue(true);
      
      const result = ConversationStateMachine.hasContactInformation('Contact Information:\nName: John Doe\nEmail: john@example.com');
      
      expect(result).toBe(true);
      expect(hasContactInformation).toHaveBeenCalledWith('Contact Information:\nName: John Doe\nEmail: john@example.com');
    });

    it('should return false when no contact information is detected', () => {
      vi.mocked(hasContactInformation).mockReturnValue(false);
      
      const result = ConversationStateMachine.hasContactInformation('Just a regular conversation');
      
      expect(result).toBe(false);
      expect(hasContactInformation).toHaveBeenCalledWith('Just a regular conversation');
    });
  });
});
