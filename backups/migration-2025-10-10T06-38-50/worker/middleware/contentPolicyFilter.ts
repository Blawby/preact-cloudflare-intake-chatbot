import type { Env, AgentMessage } from '../types.js';
import type { TeamConfig } from '../services/TeamService.js';

import type { ConversationContext } from './conversationContextManager.js';
import type { PipelineMiddleware } from './pipeline.js';

// Pre-compiled regex patterns for better performance and accuracy
const JAILBREAK_PATTERNS = [
  /\b(ignore\s+instructions|ignore\s+previous\s+instructions)\b/i,
  /\b(system\s+prompt|bypass\s+restrictions|override\s+restrictions)\b/i,
  /\b(change\s+role|override\s+instructions|disregard\s+instructions)\b/i,
  /\b(forget\s+rules|ignore\s+rules|disregard\s+rules)\b/i,
  /\b(act\s+as\s+[^a-z]|pretend\s+to\s+be\s+[^a-z])\b/i,
  /\b(you\s+are\s+now|from\s+now\s+on)\b/i,
  /\b(disregard\s+previous|ignore\s+previous)\b/i
] as const;

const TECHNICAL_PATTERNS = [
  /\b(cd\s+\w+|ls\s+\w*|sudo\s+\w+|bash\s+\w*)\b/i,
  /\b(terminal\s+commands?|command\s+line\s+interface)\b/i,
  /\b(programming\s+help|coding\s+help|script\s+writing)\b/i,
  /\b(javascript\s+help|python\s+help|html\s+help|css\s+help)\b/i,
  /\b(hack\s+into|crack\s+password|exploit\s+vulnerability)\b/i
] as const;

const ENTERTAINMENT_PATTERNS = [
  /\b(play\s+game|gaming|entertainment\s+only|just\s+for\s+fun)\b/i,
  /\b(roleplay\s+scenario|role\s+play\s+game|pretend\s+scenario)\b/i,
  /\b(legal\s+trivia\s+game|case\s+study\s+game|hypothetical\s+game)\b/i,
  /\b(for\s+entertainment\s+only|entertainment\s+purposes\s+only)\b/i
] as const;

const GENERAL_KNOWLEDGE_PATTERNS = [
  /\b(tell\s+me\s+about\s+geography|explain\s+geography|describe\s+geography)\b/i,
  /\b(tell\s+me\s+about\s+history|explain\s+history|describe\s+history)\b/i,
  /\b(tell\s+me\s+about\s+science|explain\s+science|describe\s+science)\b/i,
  /\b(tell\s+me\s+about\s+technology|explain\s+technology|describe\s+technology)\b/i,
  /\b(tell\s+me\s+about\s+politics|explain\s+politics|describe\s+politics)\b/i,
  /\b(write\s+story|create\s+art|design\s+logo)\b/i,
  /\b(creative\s+writing|artistic\s+expression|imaginative\s+writing)\b/i
] as const;

const ABUSIVE_PATTERNS = [
  /\b(kill\s+someone|murder\s+someone|suicide\s+methods?)\b/i,
  /\b(bomb\s+making|explosive\s+devices?|weapon\s+making)\b/i,
  /\b(hate\s+speech|racist\s+comments?|sexist\s+comments?|homophobic\s+comments?)\b/i,
  /\b(threat\s+to\s+kill|threaten\s+violence|violent\s+threats?)\b/i
] as const;

// Legal context keywords that should whitelist messages
const LEGAL_CONTEXT_KEYWORDS = [
  'legal', 'law', 'attorney', 'lawyer', 'court', 'lawsuit', 'contract', 'agreement',
  'litigation', 'settlement', 'mediation', 'arbitration', 'compliance', 'regulation',
  'statute', 'case', 'precedent', 'jurisdiction', 'evidence', 'testimony', 'deposition',
  'motion', 'brief', 'pleading', 'discovery', 'subpoena', 'injunction', 'judgment',
  'appeal', 'verdict', 'damages', 'liability', 'negligence', 'breach', 'tort',
  'criminal', 'civil', 'constitutional', 'administrative', 'federal', 'state', 'local'
] as const;

/**
 * Content Policy Filter - handles safety and security concerns
 * This is the first line of defense against inappropriate content
 * Now conversation-aware: considers full conversation context for better accuracy
 */
export const contentPolicyFilter: PipelineMiddleware = {
  name: 'contentPolicyFilter',
  
  execute: async (messages: AgentMessage[], context: ConversationContext, _teamConfig: TeamConfig, _env: Env) => {
    // Note: teamConfig parameter is currently unused but kept for interface compatibility
    // Future enhancement: could use team-specific content policies
    
    // Guard clause: ensure we have at least one message
    if (!messages || messages.length === 0) {
      console.warn('contentPolicyFilter: No messages provided');
      return { context };
    }
    
    const latestMessage = messages[messages.length - 1];
    const violations = checkForViolations(latestMessage.content, context, messages);
    
    if (violations.length > 0) {
      // Log security violations (privacy-safe)
      console.warn('Content policy violation detected:', {
        sessionId: context.sessionId,
        teamId: context.teamId,
        violations,
        messageCount: messages.length,
        messageLength: latestMessage.content.length,
        messageHash: latestMessage.content.length > 0 ? globalThis.btoa(latestMessage.content).substring(0, 8) : ''
      });

      // Update context with safety flags
      const updatedContext = {
        ...context,
        safetyFlags: [...context.safetyFlags, ...violations]
      };

      // Return appropriate response based on violation type
      const response = getViolationResponse(violations, context);
      
      return {
        context: updatedContext,
        response,
        shouldStop: true
      };
    }

    // No violations - continue pipeline
    return { context };
  }
};

/**
 * Check for various types of content policy violations
 * Now conversation-aware for better accuracy
 */
function checkForViolations(message: string, context: ConversationContext, messages: AgentMessage[]): string[] {
  const violations: string[] = [];

  // 1. Jailbreak attempts
  if (isJailbreakAttempt(message)) {
    violations.push('jailbreak_attempt');
  }

  // 2. Non-legal requests (but be context-aware with conversation history)
  if (isNonLegalRequest(message, context, messages)) {
    violations.push('non_legal_request');
  }

  // 3. Abusive or harmful content
  if (isAbusiveContent(message)) {
    violations.push('abusive_content');
  }

  // 4. Spam or repetitive content
  if (isSpamContent(message, context, messages)) {
    violations.push('spam_content');
  }

  return violations;
}

/**
 * Check for jailbreak attempts
 */
function isJailbreakAttempt(message: string): boolean {
  return JAILBREAK_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check for non-legal requests (context-aware with legal whitelisting and conversation history)
 */
function isNonLegalRequest(message: string, context: ConversationContext, messages: AgentMessage[]): boolean {
  // If we have established legal context, be more permissive
  if (context.establishedMatters.length > 0) {
    return false; // Allow follow-up questions in legal context
  }

  // Check for legal context keywords in the current message
  const hasLegalContext = LEGAL_CONTEXT_KEYWORDS.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasLegalContext) {
    return false; // Allow messages with legal context
  }

  // Check for legal context in conversation history (user messages only)
  const conversationText = messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .join(' ');
  const hasConversationLegalContext = LEGAL_CONTEXT_KEYWORDS.some(keyword => 
    conversationText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasConversationLegalContext) {
    return false; // Allow follow-up questions in legal conversation
  }

  // Check for specific non-legal patterns
  const hasTechnicalPattern = TECHNICAL_PATTERNS.some(pattern => pattern.test(message));
  const hasEntertainmentPattern = ENTERTAINMENT_PATTERNS.some(pattern => pattern.test(message));
  const hasGeneralKnowledgePattern = GENERAL_KNOWLEDGE_PATTERNS.some(pattern => pattern.test(message));

  return hasTechnicalPattern || hasEntertainmentPattern || hasGeneralKnowledgePattern;
}

/**
 * Check for abusive or harmful content
 */
function isAbusiveContent(message: string): boolean {
  return ABUSIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check for spam or repetitive content (now conversation-aware)
 */
function isSpamContent(message: string, context: ConversationContext, messages: AgentMessage[]): boolean {
  // Extract user messages only for spam detection
  const userMessages = messages.filter(m => m.role === 'user');
  const latestUserMessage = userMessages.at(-1)?.content ?? '';
  const prev3UserMessages = userMessages.slice(-4, -1).map(m => m.content);
  

  // Length check (latest user message only)
  const isTooLong = latestUserMessage.length > 2000;
  if (isTooLong) {
    return true;
  }

  // Repetition check (latest vs previous 3 user messages only)
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const repeatedAgainstPrev3 = prev3UserMessages
    .map(normalize)
    .includes(normalize(latestUserMessage));
  
  if (repeatedAgainstPrev3) {
    return true;
  }

  // Internal repetition within latest message only
  if (context.messageCount > 10) {
    const words = latestUserMessage.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    // If message is mostly repeated words, flag as spam
    if (words.length > 5 && uniqueWords.size < words.length * 0.3) {
      return true;
    }
  }

  return false;
}

/**
 * Get appropriate response for violation type
 */
function getViolationResponse(violations: string[], _context: ConversationContext): string {
  if (violations.includes('jailbreak_attempt')) {
    return "I'm a legal intake specialist and can only help with legal matters. I cannot change my role or provide other types of assistance.";
  }

  if (violations.includes('non_legal_request')) {
    return "I'm a legal intake specialist and can only help with legal matters. I can help you with legal questions, case preparation, and connecting you with attorneys. How can I assist you with your legal needs?";
  }

  if (violations.includes('abusive_content')) {
    return "I cannot help with that type of request. I'm here to assist with legal matters only. If you have a legal question or need help with a legal issue, I'd be happy to help.";
  }

  if (violations.includes('spam_content')) {
    return "I notice you've sent a very long message. Could you please provide a brief summary of your legal question or situation? I'm here to help with legal matters.";
  }

  // Default response
  return "I'm a legal intake specialist. I can only help with legal matters and connecting you with lawyers.";
}
