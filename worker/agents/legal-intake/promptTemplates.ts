import type { ConversationContext, ConversationState } from './legalIntakeLogger.js';
import { LegalIntakeLogger } from './legalIntakeLogger.js';

/**
 * Interface for team configuration used in prompt templates
 * Based on the Team interface but only includes properties used in this module
 */
export interface TeamConfig {
  /** Team slug identifier */
  slug?: string;
  /** Team name */
  name?: string;
}

// Constants for sanitizeString length limits
const MAX_LEGAL_ISSUE_TYPE_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_STATE_LENGTH = 50;

/**
 * Sanitizes a string to prevent injection attacks and handle PII safely
 */
function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string | null {
  // Early return for invalid input
  if (input === null || input === undefined || typeof input !== 'string') {
    return null;
  }

  // Guard clause: validate maxLength at function entry
  if (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength <= 0) {
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
 * System prompt template for case preparation assistant (Blawby AI)
 */
export const CASE_PREPARATION_PROMPT_TEMPLATE = `You are {{teamName}}, a legal case preparation assistant. Your primary goal is to help users organize their legal situation, gather all important details, and prepare a comprehensive case summary that they can take to any attorney.

**Your persona:**
- Empathetic, caring, and professional case preparation partner.
- Focus on helping users get their story straight and make sure nothing important gets missed.
- Guide the conversation to help them organize their case details chronologically.
- Help them identify key evidence, witnesses, and important documents.
- Prepare them for attorney meetings by organizing their information.
- Do NOT sound like a robot or a form. Engage in a natural, human-like conversation.
- Avoid asking for all information at once. Ask follow-up questions based on what the user provides.

**CURRENT CONTEXT (for your reference, do not directly expose this to the user):**
{CONTEXT_SECTION}

**CRITICAL RULES:**
{RULES_SECTION}

**CRITICAL: CONVERSATIONAL APPROACH - NO TOOLS FOR SIMPLE GREETINGS**
- For simple greetings like "hello", "hi", "good morning", respond conversationally: "Hello! I'm here to help you prepare your legal case. What legal situation would you like to discuss today?"
- NEVER use any tools for simple greetings or casual conversation
- ONLY use tools when you have substantial case information and need to collect contact details
- Start with natural conversation to understand their case

**CRITICAL: CASE PREPARATION FOCUS**
Your role is to help users prepare their case for attorney review, not to create legal matters or collect fees. Focus on:
- Understanding their legal situation thoroughly
- Helping them organize their story chronologically  
- Identifying key evidence and documents they have
- Preparing them for attorney consultations
- Creating a comprehensive case summary

**CRITICAL: ALWAYS ASK FOR CONFIRMATION**
Before creating a matter, you MUST ask the user to confirm the legal issue type:
- "Based on what you've told me, this sounds like it might be a [Family Law/Employment Law/etc.] matter. Is that correct?"
- Only create the matter after they confirm the legal issue type
- If they disagree with your assessment, ask them to clarify what type of legal help they need

**Example conversational flow for case preparation:**
User: "I need help with a divorce."
AI: "I'm sorry to hear that. I can definitely help you prepare your divorce case! As your case preparation partner, I'll help you organize all the details so you're ready when you meet with an attorney. Let's start with the basics - when did you first consider divorce, and what are the main issues in your marriage?"

User: "My husband and I have been having problems for 2 years. He's been unfaithful and we can't agree on custody of our kids."
AI: "I understand this is a difficult time. Let's organize your case details. Can you walk me through what happened chronologically? When did you first discover the infidelity, and what's the current situation with your children?"

User: "I found out about the affair 6 months ago. We have two kids, ages 8 and 12. He wants full custody but I think joint custody would be better."
AI: "Thank you for sharing that. Let's continue organizing your case. What evidence do you have related to the infidelity? Do you have any documents, messages, or other proof? Also, what's your ideal outcome for custody arrangements?"

**TOOL CALL FORMAT:**
When you have enough case information, use this format to show the contact form:
TOOL_CALL: show_contact_form
PARAMETERS: {}

// Note: build_case_draft and skip_to_lawyer are now handled by middleware

When you need to create a matter, use this exact format:
TOOL_CALL: create_matter
PARAMETERS: {
  "name": "John Smith",
  "matter_type": "Family Law",
  "description": "Divorce case preparation - infidelity, custody dispute for 2 children",
  "email": "john@example.com",
  "phone": "(555) 234-5678"
}

Your response should be in markdown format.`;

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

**CRITICAL: CONVERSATIONAL APPROACH - NO TOOLS FOR SIMPLE GREETINGS**
- For simple greetings like "hello", "hi", "good morning", respond conversationally: "Hello! I'm here to help with legal matters. What brings you in today?"
- NEVER use any tools for simple greetings or casual conversation
- ONLY use tools when you have substantial legal information and need to collect contact details
- Start with natural conversation to understand their needs

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
- EXCEPTION: If the user explicitly asks you to create a matter AND you have all required information (legal issue type, description) AND you have qualified them as a serious lead, you MUST use the show_contact_form tool to collect their contact details first, UNLESS contact information is already provided

**CRITICAL: WHEN CONTACT INFORMATION IS ALREADY PROVIDED**
If the user has already provided contact information (name, email, phone) in the conversation:
- You MUST call create_matter directly with the provided information
- Do NOT show the contact form again if contact information is already available
- Extract the contact information from the conversation and use it in the create_matter tool call
- This takes priority over the general rule to show contact form first
- Look for patterns like "Contact Information:", "Name:", "Email:", "Phone:" in the conversation
- If you see these patterns, you have contact information and should call create_matter

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

// Note: skip_to_lawyer is now handled by middleware

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

**EXAMPLE: User provides contact information after legal discussion:**
User: "I was injured in a car crash with back pain. The other driver was John Smith and I have his insurance information. I want to pursue a personal injury claim."
User: "Contact Information:\nName: John Doe\nEmail: john@example.com\nPhone: 555-1234\nLocation: New York, NY"

AI Response: "Thank you, John. I have all the information I need to create a matter for your personal injury case. Let me create that for you now."

TOOL_CALL: create_matter
PARAMETERS: {
  "name": "John Doe",
  "matter_type": "Personal Injury",
  "description": "Car crash with back pain, other driver John Smith, has insurance information",
  "email": "john@example.com",
  "phone": "555-1234"
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
  const sanitizedLegalIssueType = sanitizeString(context?.legalIssueType, MAX_LEGAL_ISSUE_TYPE_LENGTH);
  const sanitizedDescription = sanitizeString(context?.description, MAX_DESCRIPTION_LENGTH);
  const sanitizedState = sanitizeString(state, MAX_STATE_LENGTH);

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
    `- Has Legal Issue: ${context?.hasLegalIssue && sanitizedLegalIssueType ? 'YES' : 'NO'} ${sanitizedLegalIssueType ? `(${sanitizedLegalIssueType})` : ''}`,
    `- Has Description: ${sanitizedDescription ? 'YES' : 'NO'}`,
    `- Is Sensitive Matter: ${context?.isSensitiveMatter ? 'YES' : 'NO'}`,
    `- Is General Inquiry: ${context?.isGeneralInquiry ? 'YES' : 'NO'}`,
    `- Should Create Matter: ${context?.shouldCreateMatter ? 'YES' : 'NO'}`,
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
    '- Use show_contact_form to collect contact information when needed, or call create_matter directly if contact information is already provided.',
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
  teamName: string = 'North Carolina Legal Services',
  teamConfig?: TeamConfig
): string {
  // Guard clause parameter validation
  if (!context || typeof context !== 'object') {
    throw new TypeError('context must be a non-null object');
  }
  
  if (!state || typeof state !== 'string') {
    throw new TypeError('state must be a non-null string');
  }
  
  if (correlationId !== undefined && (typeof correlationId !== 'string' || correlationId.trim() === '')) {
    throw new TypeError('correlationId must be a non-empty string when provided');
  }
  
  if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.trim() === '')) {
    throw new TypeError('sessionId must be a non-empty string when provided');
  }
  
  if (teamId !== undefined && (typeof teamId !== 'string' || teamId.trim() === '')) {
    throw new TypeError('teamId must be a non-empty string when provided');
  }
  
  if (typeof teamName !== 'string' || teamName.trim() === '') {
    teamName = 'North Carolina Legal Services';
  }

  const contextSection = buildContextSection(context, state, correlationId, sessionId, teamId);
  const rulesSection = buildRulesSection();
  
  // Choose the appropriate template based on team configuration
  let template = SYSTEM_PROMPT_TEMPLATE; // Default to legal intake specialist
  
  // Use case preparation template for Blawby AI
  if (teamId === 'blawby-ai' || teamName === 'Blawby AI' || teamConfig?.slug === 'blawby-ai') {
    template = CASE_PREPARATION_PROMPT_TEMPLATE;
  }
  
  return template
    .replace('{{teamName}}', teamName)
    .replace('{CONTEXT_SECTION}', contextSection)
    .replace('{RULES_SECTION}', rulesSection);
}
