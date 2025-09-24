import type { ConversationContext } from './conversationContextManager.js';
import type { TeamConfig } from '../services/TeamService.js';
import type { PipelineMiddleware } from './pipeline.js';

/**
 * Content Policy Filter - handles safety and security concerns
 * This is the first line of defense against inappropriate content
 */
export const contentPolicyFilter: PipelineMiddleware = {
  name: 'contentPolicyFilter',
  
  execute: async (message: string, context: ConversationContext, teamConfig: TeamConfig) => {
    const violations = checkForViolations(message, context);
    
    if (violations.length > 0) {
      // Log security violations
      console.warn('Content policy violation detected:', {
        sessionId: context.sessionId,
        teamId: context.teamId,
        violations,
        message: message.substring(0, 100)
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
 */
function checkForViolations(message: string, context: ConversationContext): string[] {
  const violations: string[] = [];
  const lowerMessage = message.toLowerCase();

  // 1. Jailbreak attempts
  if (isJailbreakAttempt(message)) {
    violations.push('jailbreak_attempt');
  }

  // 2. Non-legal requests (but be context-aware)
  if (isNonLegalRequest(message, context)) {
    violations.push('non_legal_request');
  }

  // 3. Abusive or harmful content
  if (isAbusiveContent(message)) {
    violations.push('abusive_content');
  }

  // 4. Spam or repetitive content
  if (isSpamContent(message, context)) {
    violations.push('spam_content');
  }

  return violations;
}

/**
 * Check for jailbreak attempts
 */
function isJailbreakAttempt(message: string): boolean {
  const jailbreakPatterns = [
    /(ignore.*instructions)/i,
    /(system prompt|bypass.*restrictions)/i,
    /(change.*role|override.*instructions)/i,
    /(ignore.*previous|forget.*rules)/i,
    /(act.*as|pretend.*to.*be)/i,
    /(you are now|from now on)/i,
    /(disregard.*previous)/i
  ];

  return jailbreakPatterns.some(pattern => pattern.test(message));
}

/**
 * Check for non-legal requests (context-aware)
 */
function isNonLegalRequest(message: string, context: ConversationContext): boolean {
  // If we have established legal context, be more permissive
  if (context.establishedMatters.length > 0) {
    return false; // Allow follow-up questions in legal context
  }

  const nonLegalPatterns = [
    // Technical/Programming
    /(^cd\s|^ls\s|^sudo\s|^bash\s|\.py$|<script>|SELECT .* FROM)/i,
    /(terminal|command line|shell|programming|coding|script)/i,
    /(javascript|python|html|css|sql|api)/i,
    /(hack|crack|exploit|vulnerability)/i,
    
    // Entertainment/Role-playing
    /(play game|game|entertainment|fun|trivia)/i,
    /(roleplay|role play|role-playing|scenario)/i,
    /(act as client|be the client|pretend to be client)/i,
    /(legal trivia|case study|hypothetical)/i,
    /(for entertainment|entertainment purposes)/i,
    
    // General Knowledge/Research (but allow if in legal context)
    /(write.*document|create.*document|research.*)/i,
    /(tell me about.*geography|tell me about.*history|tell me about.*science|tell me about.*technology|tell me about.*politics)/i,
    /(explain.*geography|explain.*history|explain.*science|explain.*technology|explain.*politics)/i,
    /(describe.*geography|describe.*history|describe.*science|describe.*technology|describe.*politics)/i,
    /(geography|history|science|technology|politics)/i,
    /(write.*story|create.*content|generate.*)/i,
    
    // Creative Tasks
    /(write.*poem|create.*art|design.*)/i,
    /(creative|artistic|imaginative)/i
  ];

  return nonLegalPatterns.some(pattern => pattern.test(message));
}

/**
 * Check for abusive or harmful content
 */
function isAbusiveContent(message: string): boolean {
  const abusivePatterns = [
    /(kill|murder|suicide|self-harm)/i,
    /(bomb|explosive|weapon)/i,
    /(hate speech|racist|sexist|homophobic)/i,
    /(threat|threaten|violence)/i
  ];

  return abusivePatterns.some(pattern => pattern.test(message));
}

/**
 * Check for spam or repetitive content
 */
function isSpamContent(message: string, context: ConversationContext): boolean {
  // Check for excessive repetition
  if (context.messageCount > 10) {
    const words = message.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    // If message is mostly repeated words, flag as spam
    if (words.length > 5 && uniqueWords.size < words.length * 0.3) {
      return true;
    }
  }

  // Check for excessive length (potential spam)
  if (message.length > 2000) {
    return true;
  }

  return false;
}

/**
 * Get appropriate response for violation type
 */
function getViolationResponse(violations: string[], context: ConversationContext): string {
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
