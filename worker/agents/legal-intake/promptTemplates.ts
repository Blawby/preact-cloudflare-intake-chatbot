import type { ConversationContext, ConversationState } from './conversationStateMachine.js';
import { LegalIntakeLogger } from './legalIntakeLogger.js';

/**
 * Sanitizes a string to prevent injection attacks and handle PII safely
 */
function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove or escape potentially dangerous characters
  let sanitized = input
    // Remove null bytes and control characters (except newlines, tabs, carriage returns)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
    // Escape backticks to prevent code injection
    .replace(/`/g, '\\`')
    // Escape backslashes to prevent escape sequence injection
    .replace(/\\/g, '\\\\')
    // Remove potential prompt injection patterns (targeted approach)
    .replace(/^(?:\s*)(?:system|user|assistant|prompt|instruct)\s*[:\-\|]/gim, '') // Role labels with separators
    .replace(/^(?:\s*)(?:ignore\s+previous|forget\s+all|reset\s+instructions?)/gim, '') // Malicious phrases
    // Remove potential command injection patterns
    .replace(/[<>{}[\]|&$;`'"\\]/g, (match) => {
      // Replace with safe alternatives or remove entirely
      const safeChars: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '{': '&#123;',
        '}': '&#125;',
        '[': '&#91;',
        ']': '&#93;',
        '|': '&#124;',
        '&': '&amp;',
        '$': '&#36;',
        ';': '&#59;',
        '`': '&#96;',
        "'": '&#39;',
        '"': '&quot;',
        '\\': '&#92;'
      };
      return safeChars[match] || '';
    })
    // Trim whitespace
    .trim();

  // Limit length to prevent buffer overflow attacks
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Sanitizes email addresses with additional validation
 */
function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  let sanitized = sanitizeString(email, 254); // RFC 5321 limit
  if (!sanitized || !emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitizes phone numbers with additional validation
 */
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except + at the beginning
  let sanitized = phone.replace(/[^\d+]/g, '');
  
  // Ensure + is only at the beginning
  if (sanitized.includes('+') && !sanitized.startsWith('+')) {
    sanitized = sanitized.replace(/\+/g, '');
  }

  // Basic phone number validation (7-15 digits)
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  if (!phoneRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

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
- Guide the conversation naturally to collect required information (name, legal issue, description, and at least one contact method).
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
- EXCEPTION: If the user explicitly asks you to create a matter AND you have all required information (name, legal issue type, description, and at least one contact method), you MUST create it directly using the create_matter tool
- When the user says "please create a matter for me" or "create a matter" and you have the required information, use the create_matter tool immediately

**Example conversational flow for matter creation:**
User: "I need help with a divorce."
AI: "I'm sorry to hear that. I can help you with that. To get started, could you please tell me your full name and a brief description of your situation?"
User: "My name is Jane Doe, and my husband is divorcing me. I need help with child custody."
AI: "Thank you, Jane. I understand this is a difficult time. To help you further, could you also provide your email address and phone number?"
User: "My email is jane@example.com and phone is 555-123-4567."
AI: "Thank you, Jane. I have all the necessary information. I'm now creating a matter for your divorce and child custody case. You will be contacted shortly by one of our attorneys."

**TOOL CALL FORMAT:**
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

  // Sanitize all string inputs to prevent injection attacks and handle PII safely
  const sanitizedName = sanitizeString(context.name, 100);
  const sanitizedLegalIssueType = sanitizeString(context.legalIssueType, 50);
  const sanitizedDescription = sanitizeString(context.description, 500);
  const sanitizedEmail = sanitizeEmail(context.email);
  const sanitizedPhone = sanitizePhone(context.phone);
  const sanitizedLocation = sanitizeLocation(context.location);
  const sanitizedState = sanitizeString(state, 50);

  // Log security events if suspicious input is detected
  if (correlationId) {
    const originalInputs = {
      name: context.name,
      legalIssueType: context.legalIssueType,
      description: context.description,
      email: context.email,
      phone: context.phone,
      location: context.location
    };

    const sanitizedInputs = {
      name: sanitizedName,
      legalIssueType: sanitizedLegalIssueType,
      description: sanitizedDescription,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      location: sanitizedLocation
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

  // Ensure required properties exist with safe defaults
  const safeContext = {
    hasName: Boolean(context.hasName && sanitizedName),
    hasLegalIssue: Boolean(context.hasLegalIssue && sanitizedLegalIssueType),
    hasEmail: Boolean(context.hasEmail && sanitizedEmail),
    hasPhone: Boolean(context.hasPhone && sanitizedPhone),
    hasLocation: Boolean(context.hasLocation && sanitizedLocation),
    name: sanitizedName,
    legalIssueType: sanitizedLegalIssueType,
    description: sanitizedDescription,
    email: sanitizedEmail,
    phone: sanitizedPhone,
    location: sanitizedLocation
  };

  const contextItems = [
    `- Has Name: ${safeContext.hasName ? 'YES' : 'NO'} ${safeContext.name ? `(${safeContext.name})` : ''}`,
    `- Has Legal Issue: ${safeContext.hasLegalIssue ? 'YES' : 'NO'} ${safeContext.legalIssueType ? `(${safeContext.legalIssueType})` : ''}`,
    `- Has Description: ${safeContext.description ? 'YES' : 'NO'}`,
    `- Has Email: ${safeContext.hasEmail ? 'YES' : 'NO'} ${safeContext.email ? `(${safeContext.email})` : ''}`,
    `- Has Phone: ${safeContext.hasPhone ? 'YES' : 'NO'} ${safeContext.phone ? `(${safeContext.phone})` : ''}`,
    `- Has Location: ${safeContext.hasLocation ? 'YES' : 'NO'} ${safeContext.location ? `(${safeContext.location})` : ''}`,
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
    '- If the user provides enough information to create a matter (name, legal issue, description, and at least one contact method like email or phone), you MUST call the `create_matter` tool.',
    '- If the user explicitly asks you to create a matter and you have all required information, create it immediately without asking for confirmation.',
    '- If the user\'s query is a general inquiry (e.g., "what services do you offer?", "how much does it cost?"), respond conversationally without trying to extract personal details or create a matter.',
    '- If the user asks a question that can be answered directly (e.g., "what is family law?"), provide a concise and helpful answer.',
    '- If the user provides sensitive information (e.g., "I ran over my child"), acknowledge the sensitivity with empathy and gently guide them towards providing necessary details for a matter, or offer to connect them with a lawyer if appropriate.',
    '- Do NOT make assumptions about missing information. Always ask the user.',
    '- Ensure all required fields for `create_matter` are present before calling the tool. If not, ask for the missing pieces.',
    '- When asking for information, be specific but polite. For example, instead of "Give me your email", say "Could you please provide your email address so we can reach you?"',
    '- If the user provides an invalid format for an input (e.g., email, phone, location), politely inform them and ask for the correct format.',
    '- Your responses should be concise and to the point, but still friendly and helpful.',
    '- Do NOT generate tool calls for `collect_contact_info` or `request_lawyer_review`. Only use `create_matter` when all necessary information is available.',
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
