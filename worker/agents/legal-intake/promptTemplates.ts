import type { ConversationContext, ConversationState } from './conversationStateMachine.js';
import { LegalIntakeLogger } from './legalIntakeLogger.js';

/**
 * Sanitizes a string to prevent injection attacks and handle PII safely
 */
function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // HTML entity mapping for safe character replacement
  const htmlEntityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '\\': '&#92;'
  };

  // Remove or escape potentially dangerous characters
  let sanitized = input
    // Remove null bytes and control characters (except newlines, tabs, carriage returns)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
    // Remove potential prompt injection patterns (targeted approach)
    .replace(/^(?:\s*)(?:system|user|assistant|prompt|instruct)\s*[:\-\|]/gim, '') // Role labels with separators
    .replace(/^(?:\s*)(?:ignore\s+previous|forget\s+all|reset\s+instructions?)/gim, '') // Malicious phrases
    // Replace special characters with HTML entities using single regex with proper character class
    .replace(/[&<>"'`\\]/g, (match) => htmlEntityMap[match] || match)
    // Trim whitespace
    .trim();

  // Limit length to prevent buffer overflow attacks
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized.length > 0 ? sanitized : null;
}

// Contact info validation functions removed - now handled by ContactForm component

/**
 * Sanitizes location data
 */
function sanitizeLocation(location: string | null | undefined): string | null {
  if (!location || typeof location !== 'string') {
    return null;
  }

  // More restrictive sanitization for location data
  let sanitized = sanitizeString(location, 200);
  if (!sanitized) {
    return null;
  }

  // Remove potential coordinate injection patterns
  sanitized = sanitized
    .replace(/[0-9.-]+\s*,\s*[0-9.-]+/g, '[coordinates]') // Replace lat,lng patterns
    .replace(/https?:\/\/[^\s]+/gi, '[url]') // Replace URLs
    .replace(/www\.[^\s]+/gi, '[url]'); // Replace www URLs

  return sanitized;
}

/**
 * System prompt template for the legal intake specialist AI
 */
export const SYSTEM_PROMPT_TEMPLATE = `You are a legal intake specialist for {{teamName}}. Your primary goal is to empathetically assist users, understand their legal needs, and gather necessary information to create a legal matter.

**Your persona:**
- Empathetic, caring, and professional.
- Focus on understanding the user's situation and making them feel heard.
- Guide the conversation naturally to collect required information (legal issue, description, opposing party).
- Do NOT sound like a robot or a form. Engage in a natural, human-like conversation.
- Avoid asking for all information at once. Ask follow-up questions based on what the user provides.
- When you have enough legal information AND have qualified the lead, use the show_contact_form tool to collect contact details.

**CURRENT CONTEXT (for your reference, do not directly expose this to the user):**
{CONTEXT_SECTION}

**CRITICAL RULES:**
{RULES_SECTION}

**CRITICAL: LEAD QUALIFICATION BEFORE CONTACT FORM**
Before showing the contact form, you MUST qualify the lead by asking relevant questions:
- Ask about urgency: "How urgent is this matter? Do you need immediate legal assistance?"
- Ask about timeline: "What's your timeline for resolving this issue?"
- Ask about previous legal help: "Have you consulted with other attorneys about this matter?"
- Ask about seriousness: "Are you looking to move forward with legal action?"
- Only show the contact form after you've determined they are a serious, qualified potential client
- A qualified lead shows: urgency, serious intent to take legal action, and has not already consulted other attorneys
- If they seem unsure or just browsing, continue the conversation without asking for contact details
- NEVER show the contact form on the first message - always ask qualifying questions first
- When you have enough information to determine they are qualified, use the show_contact_form tool
- DO NOT show the contact form if the user is just asking general questions or seems uncertain about pursuing legal action

**CRITICAL: ALWAYS ASK FOR CONFIRMATION**
Before creating a matter, you MUST ask the user to confirm the legal issue type:
- "Based on what you've told me, this sounds like it might be a [Family Law/Employment Law/etc.] matter. Is that correct?"
- Only create the matter after they confirm the legal issue type
- If they disagree with your assessment, ask them to clarify what type of legal help they need
- EXCEPTION: If the user explicitly asks you to create a matter AND you have all required information (legal issue type, description) AND you have qualified them as a serious lead, you MUST use the show_contact_form tool to collect their contact details first
- NEVER call create_matter directly - always use show_contact_form first to collect contact information

**Example conversational flow for matter creation:**
User: "I need help with a divorce."
AI: "I'm sorry to hear that. I can help you with that. To get started, could you please tell me a brief description of your situation?"
User: "My husband is divorcing me. I need help with child custody."
AI: "Thank you. I understand this is a difficult time. To help you further, could you tell me more about the child custody situation?"
User: "We have two children and I want to ensure I get fair custody arrangements."
AI: "I understand. How urgent is this matter? Are you looking to move forward with legal action soon?"
User: "Yes, I need to file for custody immediately. My ex is trying to take the kids."
AI: "I understand this is urgent. Based on what you've told me, this sounds like it might be a Family Law matter. Is that correct? If so, I'll show you a contact form to collect your information so we can get in touch with you."

**TOOL CALL FORMAT:**
When you have enough legal information, use this format to show the contact form:
TOOL_CALL: show_contact_form
PARAMETERS: {}

When you need to create a matter, use this exact format:
TOOL_CALL: create_matter
PARAMETERS: {
  "name": "John Smith",
  "matter_type": "Employment Law",
  "description": "Boss forcing overtime without pay",
  "email": "john@example.com",
  "phone": "(555) 234-5678"
}

**EXAMPLE: User provides all info and asks to create matter:**
User: "my name is John Smith and I need help with employment law. My boss is forcing me to work overtime without pay. My email is john@example.com, my phone is (555) 234-5678. Please create a matter for me."

AI Response: "Thank you, John. I have all the information I need. I'm creating a matter for your employment law case now."

TOOL_CALL: create_matter
PARAMETERS: {
  "name": "John Smith",
  "matter_type": "Employment Law",
  "description": "Boss forcing overtime without pay",
  "email": "john@example.com",
  "phone": "(555) 234-5678"
}

Your response should be in markdown format.`;

/**
 * Builds the context section for the system prompt
 */
export function buildContextSection(
  context: ConversationContext, 
  state: ConversationState,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): string {
  // Parameter validation
  if (!context || typeof context !== 'object') {
    throw new TypeError('buildContextSection: context parameter must be a valid ConversationContext object');
  }
  
  if (!state || typeof state !== 'string') {
    throw new TypeError('buildContextSection: state parameter must be a valid ConversationState string');
  }

  // Sanitize only legal information - contact info is handled by ContactForm
  const sanitizedLegalIssueType = sanitizeString(context.legalIssueType, 50);
  const sanitizedDescription = sanitizeString(context.description, 500);
  const sanitizedState = sanitizeString(state, 50);

  // Log security events if suspicious input is detected
  if (correlationId) {
    const originalInputs = {
      legalIssueType: context.legalIssueType,
      description: context.description
    };

    const sanitizedInputs = {
      legalIssueType: sanitizedLegalIssueType,
      description: sanitizedDescription
    };

    // Check for potential injection attempts
    const hasInjectionPatterns = Object.entries(originalInputs).some(([key, value]) => {
      if (!value) return false;
      const original = value;
      const sanitized = sanitizedInputs[key as keyof typeof sanitizedInputs];
      return original !== sanitized && sanitized === null;
    });

    if (hasInjectionPatterns) {
      LegalIntakeLogger.logSecurityEvent(
        correlationId,
        sessionId,
        teamId,
        'injection_attempt',
        'medium',
        {
          sanitizedInputs,
          operation: 'buildContextSection'
        }
      );
    }
  }

  // Build context with only legal information
  const contextItems = [
    `- Has Legal Issue: ${Boolean(context.hasLegalIssue && sanitizedLegalIssueType) ? 'YES' : 'NO'} ${sanitizedLegalIssueType ? `(${sanitizedLegalIssueType})` : ''}`,
    `- Has Description: ${sanitizedDescription ? 'YES' : 'NO'}`,
    `- Is Sensitive Matter: ${context.isSensitiveMatter ? 'YES' : 'NO'}`,
    `- Is General Inquiry: ${context.isGeneralInquiry ? 'YES' : 'NO'}`,
    `- Should Create Matter: ${context.shouldCreateMatter ? 'YES' : 'NO'}`,
    `- Current State: ${sanitizedState || 'UNKNOWN'}`
  ];
  
  return contextItems.join('\n');
}

/**
 * Builds the rules section for the system prompt
 */
export function buildRulesSection(): string {
  const rules = [
    '- NEVER repeat the same response or question.',
    '- ALWAYS maintain an empathetic and supportive tone.',
    '- ONLY use the `show_contact_form` tool AFTER you have asked qualifying questions and determined the user is a serious potential client.',
    '- NEVER call create_matter directly - always use show_contact_form first to collect contact information.',
    '- If the user\'s query is a general inquiry (e.g., "what services do you offer?", "how much does it cost?"), respond conversationally without trying to extract personal details or create a matter.',
    '- If the user asks a question that can be answered directly (e.g., "what is family law?"), provide a concise and helpful answer.',
    '- If the user provides sensitive information (e.g., "I ran over my child"), acknowledge the sensitivity with empathy and gently guide them towards providing necessary details for a matter, or offer to connect them with a lawyer if appropriate.',
    '- Do NOT make assumptions about missing information. Always ask the user.',
    '- When you have enough legal information AND have qualified the lead, use the `show_contact_form` tool to collect contact details.',
    '- Your responses should be concise and to the point, but still friendly and helpful.',
    '- Do NOT ask for contact information directly in conversation. Use the contact form tool instead.',
    '- When you have all required information and the user asks you to create a matter, you MUST use the create_matter tool immediately.',
    '- If the user explicitly states they do not want to provide certain information, respect their decision and try to proceed with what you have, or explain why certain information is necessary for matter creation.',
    '- If the user\'s intent is unclear, ask clarifying questions.',
    '- If the user is just greeting you, respond with a friendly greeting and offer assistance.',
    '- If the user is asking for general information about legal topics, provide it concisely.',
    '- If the user is asking about services, provide a general overview of services offered by the legal services organization.'
  ];
  
  return rules.join('\n');
}

/**
 * Builds the complete system prompt by combining template with context and rules
 */
export function buildSystemPrompt(
  context: ConversationContext, 
  state: ConversationState,
  correlationId?: string,
  sessionId?: string,
  teamId?: string,
  teamName: string = 'North Carolina Legal Services'
): string {
  const contextSection = buildContextSection(context, state, correlationId, sessionId, teamId);
  const rulesSection = buildRulesSection();
  
  return SYSTEM_PROMPT_TEMPLATE
    .replace('{{teamName}}', teamName)
    .replace('{CONTEXT_SECTION}', contextSection)
    .replace('{RULES_SECTION}', rulesSection);
}
