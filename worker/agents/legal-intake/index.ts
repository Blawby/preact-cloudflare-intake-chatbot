import type { Env, AgentMessage, AgentResponse, FileAttachment } from '../../types.js';
import type { ErrorResult } from './errors.js';

import { TeamService } from '../../services/TeamService.js';
import { ConversationContextManager } from '../../middleware/conversationContextManager.js';
import { Logger } from '../../utils/logger.js';
import { ToolCallParser } from '../../utils/toolCallParser.js';
import { withAIRetry } from '../../utils/retry.js';
import { ToolUsageMonitor } from '../../utils/toolUsageMonitor.js';
import { safeIncludes } from '../../utils/safeStringUtils.js';

// Import types and utilities
import { ValidationService } from '../../services/ValidationService.js';
import { PaymentServiceFactory } from '../../services/PaymentServiceFactory.js';
import { ContactIntakeOrchestrator } from '../../services/ContactIntakeOrchestrator.js';
import { createValidationError, createSuccessResponse } from '../../utils/responseUtils.js';
import { analyzeFile, getAnalysisQuestion } from '../../utils/fileAnalysisUtils.js';
import { createSuccessResult, createErrorResult, ValidationError } from './errors.js';
import { LegalIntakeLogger, LegalIntakeOperation } from './legalIntakeLogger.js';

// Type definitions and constants
interface AIModelConfig {
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
}

const AI_MODEL_CONFIG: Readonly<AIModelConfig> = {
  model: '@cf/meta/llama-3.1-8b-instruct',
  maxTokens: 500,
  temperature: 0.1
} as const;

const MATTER_TYPES = [
  'Family Law', 'Employment Law', 'Landlord/Tenant', 'Personal Injury',
  'Business Law', 'Criminal Law', 'Civil Law', 'Contract Review',
  'Property Law', 'Administrative Law', 'General Consultation'
] as const;

const COMPLEXITY_LEVELS = ['Low', 'Medium', 'High', 'Very High'] as const;
const ANALYSIS_TYPES = ['general', 'legal_document', 'contract', 'government_form', 'medical_document', 'image', 'resume'] as const;

export type MatterType = typeof MATTER_TYPES[number];
export type ComplexityLevel = typeof COMPLEXITY_LEVELS[number];
export type AnalysisType = typeof ANALYSIS_TYPES[number];

// Currency enum for type-safe currency handling
export enum Currency {
  USD = 'USD',
  CAD = 'CAD',
  EUR = 'EUR',
  GBP = 'GBP'
}

// Branded type for ISO date strings to ensure proper format
export type ISODateString = string & { __isoDate: true };

// Recipient interface with explicit required fields
export interface Recipient {
  readonly email: string;
  readonly name: string;
}

// Runtime validation helper for ISO 8601 date format
export function validateISODate(dateString: string): dateString is ISODateString {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!isoDateRegex.test(dateString) && !simpleDateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString.split('T')[0]);
}

// Contact form interfaces
export interface ContactFormField {
  readonly required: boolean;
  readonly label: string;
}

export interface ContactFormFields {
  readonly name: ContactFormField;
  readonly email: ContactFormField;
  readonly phone: ContactFormField;
  readonly location: ContactFormField;
  readonly opposing_party: ContactFormField;
  readonly message: ContactFormField;
}

export interface ContactFormData {
  readonly reason: string;
  readonly fields: ContactFormFields;
  readonly submitText: string;
  readonly initialValues?: {
    readonly name?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly location?: string;
    readonly opposingParty?: string;
  };
}

export interface ContactFormParameters {
  readonly reason?: string;
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly location?: string;
  readonly message?: string;
}

export interface ContactFormResponse {
  readonly success: boolean;
  readonly action: string;
  readonly message: string;
  readonly contactForm: ContactFormData;
}

// Simplified conversation state enum
export enum ConversationState {
  INITIAL = 'INITIAL',
  GATHERING_INFORMATION = 'GATHERING_INFORMATION',
  QUALIFYING_LEAD = 'QUALIFYING_LEAD',
  SHOWING_CONTACT_FORM = 'SHOWING_CONTACT_FORM',
  READY_TO_CREATE_MATTER = 'READY_TO_CREATE_MATTER',
  CREATING_MATTER = 'CREATING_MATTER',
  COMPLETED = 'COMPLETED'
}

// Simplified conversation context interface
export interface ConversationContext {
  hasLegalIssue: boolean;
  hasOpposingParty: boolean;
  legalIssueType: string | null;
  description: string | null;
  opposingParty: string | null;
  isSensitiveMatter: boolean;
  isGeneralInquiry: boolean;
  shouldCreateMatter: boolean;
  state: ConversationState;
  // Lead qualification fields
  hasAskedUrgency: boolean;
  urgencyLevel: string | null;
  hasAskedTimeline: boolean;
  timeline: string | null;
  hasAskedBudget: boolean;
  budget: string | null;
  hasAskedPreviousLawyer: boolean;
  hasPreviousLawyer: boolean | null;
  isQualifiedLead: boolean;
  // Safety flags for middleware integration
  safetyFlags?: string[];
  // User intent and conversation phase (set by middleware)
  userIntent?: 'intake' | 'lawyer_contact' | 'general_info' | 'unclear' | 'skip_to_lawyer';
  conversationPhase?: 'initial' | 'gathering_info' | 'qualifying' | 'contact_collection' | 'completed' | 'showing_contact_form';
}

// Tool parameter interfaces
export interface CreateMatterParams {
  readonly matter_type: MatterType;
  readonly description: string;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly location?: string;
  readonly opposing_party?: string;
}

export interface CollectContactInfoParams {
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly location?: string;
}

export interface RequestLawyerReviewParams {
  readonly matter_type: MatterType;
  readonly complexity?: ComplexityLevel;
}

export interface AnalyzeDocumentParams {
  readonly file_id: string;
  readonly analysis_type?: AnalysisType;
  readonly specific_question?: string;
}

export interface CreatePaymentInvoiceParams {
  readonly invoice_id: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly recipient: Recipient;
  readonly due_date?: ISODateString;
  readonly description: string;
}

// Tool definitions
export interface ToolParameterProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description: string;
  readonly enum?: readonly string[];
  readonly pattern?: string;
  readonly default?: string | number | boolean;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly maximum?: number;
  readonly minimum?: number;
  readonly items?: ToolParameterProperty;
  readonly properties?: Record<string, ToolParameterProperty>;
}

export interface ToolDefinition<_T = Record<string, unknown>> {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, ToolParameterProperty>;
    readonly required: readonly string[];
    readonly additionalProperties?: boolean;
  };
}

// Tool definitions
export const createMatter: ToolDefinition<CreateMatterParams> = {
  name: 'create_matter',
  description: 'Create a new legal matter with all required information. ONLY use this tool AFTER the user has submitted the contact form and you have all their contact details.',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { type: 'string', description: 'Type of legal matter', enum: MATTER_TYPES },
      description: { type: 'string', description: 'Brief description of the legal issue', maxLength: 1000 },
      name: { type: 'string', description: 'Client full name', minLength: 2, maxLength: 100 },
      phone: { type: 'string', description: 'Client phone number', pattern: '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$' },
      email: { type: 'string', description: 'Client email address', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
      location: { type: 'string', description: 'Client location (city and state)', maxLength: 100 },
      opposing_party: { type: 'string', description: 'Opposing party name if applicable', maxLength: 100 }
    },
    required: ['matter_type', 'description', 'name'] as const,
    additionalProperties: false
  }
};

export const showContactForm: ToolDefinition<Record<string, never>> = {
  name: 'show_contact_form',
  description: 'CRITICAL: ONLY use this tool AFTER you have had a full conversation, qualified the lead, and determined they are serious about legal action.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false
  }
};

export const requestLawyerReview: ToolDefinition<RequestLawyerReviewParams> = {
  name: 'request_lawyer_review',
  description: 'Request lawyer review for complex matters',
  parameters: {
    type: 'object',
    properties: {
      matter_type: { type: 'string', description: 'Type of legal matter', enum: MATTER_TYPES },
      complexity: { type: 'string', description: 'Matter complexity level', enum: COMPLEXITY_LEVELS, default: 'Medium' }
    },
    required: ['matter_type'] as const,
    additionalProperties: false
  }
};

export const analyzeDocument: ToolDefinition<AnalyzeDocumentParams> = {
  name: 'analyze_document',
  description: 'Analyze an uploaded document or image to extract key information for legal intake',
  parameters: {
    type: 'object',
    properties: {
      file_id: { type: 'string', description: 'The file ID of the uploaded document to analyze', pattern: '^[a-zA-Z0-9\\-_]+$', minLength: 1, maxLength: 50 },
      analysis_type: { type: 'string', description: 'Type of analysis to perform', enum: ANALYSIS_TYPES, default: 'general' },
      specific_question: { type: 'string', description: 'Optional specific question to ask about the document', maxLength: 500, minLength: 10 }
    },
    required: ['file_id'] as const,
    additionalProperties: false
  }
};

export const createPaymentInvoice: ToolDefinition<CreatePaymentInvoiceParams> = {
  name: 'create_payment_invoice',
  description: 'Create a payment invoice for consultation or legal services',
  parameters: {
    type: 'object',
    properties: {
      invoice_id: { type: 'string', description: 'Unique identifier for the invoice', pattern: '^[a-zA-Z0-9\\-_]+$', minLength: 1, maxLength: 50 },
      amount: { type: 'number', description: 'Invoice amount in cents (e.g., 7500 for $75.00)', minimum: 100, maximum: 1000000 },
      currency: { type: 'string', description: 'Currency code for the invoice', enum: Object.values(Currency), default: Currency.USD },
      recipient: { type: 'object', description: 'Recipient information for the invoice', properties: { email: { type: 'string', description: 'Recipient email address', maxLength: 255 }, name: { type: 'string', description: 'Recipient full name', minLength: 1, maxLength: 255 } } },
      due_date: { type: 'string', description: 'Invoice due date in ISO 8601 format (YYYY-MM-DD)', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      description: { type: 'string', description: 'Description of services or consultation', minLength: 1, maxLength: 500 }
    },
    required: ['invoice_id', 'amount', 'currency', 'recipient', 'description'] as const,
    additionalProperties: false
  }
};

export const collectContactInfo = showContactForm; // Alias for backward compatibility

export interface CloudflareLocation {
  readonly city?: string;
  readonly country?: string;
  readonly region?: string;
  readonly timezone?: string;
}

// Team configuration cache
const teamConfigCache = new Map<string, { config: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTeamConfig(teamId: string, env: Env): Promise<unknown> {
  if (teamConfigCache.has(teamId)) {
    const cached = teamConfigCache.get(teamId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.config;
    }
  }
  
  const teamService = new TeamService(env);
  const config = await teamService.getTeam(teamId);
  teamConfigCache.set(teamId, { config, timestamp: Date.now() });
  return config;
}

// Fast context detection function (no AI calls)
function detectContextFast(conversationText: string): ConversationContext {
  const lowerText = conversationText.toLowerCase();
  
  // Legal issue detection (simple keyword matching)
  const legalPatterns = {
    'Family Law': ['divorce', 'custody', 'child support', 'family dispute', 'marriage', 'paternity', 'alimony'],
    'Employment Law': ['fired', 'wrongful termination', 'discrimination', 'harassment', 'wage', 'overtime', 'employment', 'workplace'],
    'Personal Injury': ['accident', 'injured', 'car crash', 'personal injury', 'damage', 'liability', 'negligence', 'slip and fall'],
    'Landlord/Tenant': ['eviction', 'rent', 'landlord', 'tenant', 'rental', 'housing', 'lease'],
    'Criminal Law': ['arrested', 'charged', 'dui', 'criminal', 'arrest', 'charges', 'trial', 'violation'],
    'Business Law': ['contract', 'business', 'partnership', 'corporate', 'company', 'startup', 'llc', 'corporation'],
    'Civil Law': ['civil', 'dispute', 'lawsuit', 'tort'],
    'Contract Review': ['contract', 'agreement', 'terms', 'clause', 'legal document'],
    'Property Law': ['property', 'real estate', 'land', 'deed', 'title'],
    'Administrative Law': ['government', 'administrative', 'regulatory', 'compliance'],
    'General Consultation': ['legal advice', 'lawyer', 'attorney', 'legal question']
  };

  let legalIssueType = null;
  for (const [type, keywords] of Object.entries(legalPatterns)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      legalIssueType = type;
      break;
    }
  }

  // Contact detection
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(conversationText);
  const hasPhone = /\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(conversationText);
  const hasName = /(?:my name is|i'm|i am|call me|name:|^|\s)([A-Z][a-z]+\s+[A-Z][a-z]+)/i.test(conversationText) ||
                  /(?:name)\s*[:=]\s*([A-Za-z\s]+)/i.test(conversationText);
  
  // Opposing party detection
  const hasOpposingParty = /(?:opposing|against|versus|vs\.?)\s+([A-Za-z\s]+)/i.test(conversationText);
  
  // Sensitive matter detection
  const sensitiveKeywords = ['criminal', 'arrest', 'jail', 'prison', 'charges', 'court date', 'accident', 'injury', 'hospital', 'medical', 'death', 'fatal', 'domestic violence', 'abuse', 'harassment', 'threat', 'danger', 'emergency', 'urgent', 'immediate', 'asap', 'right now'];
  const isSensitiveMatter = sensitiveKeywords.some(keyword => lowerText.includes(keyword));
  
  // General inquiry detection
  const generalInquiryPatterns = ['services in my area', 'pricing', 'cost', 'what services', 'do you provide', 'not sure if you provide', 'concerned about cost', 'tell me about pricing', 'not sure what kind', 'what kind of help'];
  const isGeneralInquiry = generalInquiryPatterns.some(pattern => lowerText.includes(pattern));
  
  // State determination
  let state = ConversationState.GATHERING_INFORMATION;
  if (legalIssueType) {
    if (hasName && (hasEmail || hasPhone)) {
      state = ConversationState.READY_TO_CREATE_MATTER;
    } else {
      state = ConversationState.QUALIFYING_LEAD;
    }
  } else if (isGeneralInquiry) {
    state = ConversationState.GATHERING_INFORMATION;
  }

  // Lead qualification (simple heuristics)
  const hasUrgency = ['urgent', 'immediate', 'asap', 'emergency', 'right now'].some(word => lowerText.includes(word));
  const hasTimeline = ['timeline', 'when', 'how long', 'deadline'].some(word => lowerText.includes(word));
  const hasBudget = ['cost', 'price', 'fee', 'budget', 'afford'].some(word => lowerText.includes(word));
  const hasPreviousLawyer = ['other lawyer', 'previous attorney', 'consulted', 'already have'].some(word => lowerText.includes(word));
  
  const isQualifiedLead = legalIssueType && (hasUrgency || hasTimeline) && !hasPreviousLawyer;

  return {
    hasLegalIssue: !!legalIssueType,
    hasOpposingParty,
    legalIssueType,
    description: legalIssueType ? `Client seeking help with ${legalIssueType.toLowerCase()}` : null,
    opposingParty: hasOpposingParty ? 'Opposing party mentioned' : null,
    isSensitiveMatter,
    isGeneralInquiry,
    shouldCreateMatter: !!(legalIssueType && hasName && (hasEmail || hasPhone)),
    state,
    // Lead qualification fields
    hasAskedUrgency: hasUrgency,
    urgencyLevel: hasUrgency ? 'high' : null,
    hasAskedTimeline: hasTimeline,
    timeline: hasTimeline ? 'Timeline mentioned' : null,
    hasAskedBudget: hasBudget,
    budget: hasBudget ? 'Budget discussed' : null,
    hasAskedPreviousLawyer: hasPreviousLawyer,
    hasPreviousLawyer: hasPreviousLawyer ? true : null,
    isQualifiedLead
  };
}

// Team configuration interface
interface TeamConfig {
  name?: string;
  jurisdiction?: {
    requireLocation?: boolean;
  };
}

const PUBLIC_TEAM_IDS = new Set(['blawby-ai']);

function isPublicMode(teamId?: string | null): boolean {
  if (!teamId) {
    return true;
  }
  return PUBLIC_TEAM_IDS.has(teamId);
}

function extractPromptTeamConfig(rawConfig: unknown): TeamConfig {
  if (!rawConfig || typeof rawConfig !== 'object') {
    return {};
  }

  if ('config' in rawConfig && typeof (rawConfig as any).config === 'object') {
    const nested = (rawConfig as any).config;
    return {
      name: typeof (rawConfig as any).name === 'string' ? (rawConfig as any).name : undefined,
      jurisdiction: typeof nested?.jurisdiction === 'object'
        ? { requireLocation: Boolean((nested.jurisdiction as any)?.requireLocation) }
        : undefined
    };
  }

  return {
    name: typeof (rawConfig as any).name === 'string' ? (rawConfig as any).name : undefined,
    jurisdiction: typeof (rawConfig as any).jurisdiction === 'object'
      ? { requireLocation: Boolean(((rawConfig as any).jurisdiction as any)?.requireLocation) }
      : undefined
  };
}

// Build system prompt function
function buildSystemPrompt(context: ConversationContext, teamConfigInput: unknown, teamId?: string | null): string {
  const teamConfig = extractPromptTeamConfig(teamConfigInput);
  const teamName = teamConfig?.name || 'our law firm';
  const jurisdiction = teamConfig?.jurisdiction;
  const publicMode = isPublicMode(teamId);
  
  // Check if location is required
  const requiresLocation = jurisdiction?.requireLocation;
  const locationRequirement = requiresLocation ? 
    `\nIMPORTANT: This team requires location information (city and state) before proceeding with contact forms or matter creation. Always ask for location first if not provided.` : '';
  
  // Check if there's a location requirement flag in context
  const hasLocationFlag = context.safetyFlags?.includes('location_required');
  const locationFlagMessage = hasLocationFlag ? 
    `\nURGENT: The user's location is required before proceeding. Ask for their city and state immediately.` : '';
  
  // Check if this is a skip-to-lawyer scenario
  const isSkipToLawyer = context.userIntent === 'skip_to_lawyer' || context.conversationPhase === 'showing_contact_form';
  const skipToLawyerMessage = isSkipToLawyer ? 
    `\nURGENT: The user wants to skip the intake process and contact the legal team directly. You MUST immediately show the contact form using the show_contact_form tool.` : '';

  const styleGuidance = publicMode
    ? `- Keep responses to three short sentences or fewer.
- Give the user one clear next step and reference existing checklists or PDFs instead of describing them in detail.
- Avoid repeating prior details unless the user asks.`
    : `- Confirm missing key facts in no more than two follow-up questions.
- Transition to the contact form or explain precisely what is still needed instead of rehashing prior guidance.
- Keep answers crisp and professional; avoid script-style introductions.`;
  
  return `You are a legal intake specialist for ${teamName}.

Current situation: ${context.legalIssueType ? `Client has ${context.legalIssueType} issue` : 'Gathering information'}${locationRequirement}${locationFlagMessage}${skipToLawyerMessage}

Available tools: create_matter, show_contact_form, request_lawyer_review, create_payment_invoice, analyze_document

Rules:
- CRITICAL: Use create_matter ONLY when you have ACTUAL values for: name + legal issue + contact info${requiresLocation ? ' + location' : ''}
- If ANY field would use a placeholder like "Client Name", "Client Location", STOP and use show_contact_form instead
- Use show_contact_form when user agrees to create matter but is missing name, email, phone, or location
- Use show_contact_form ONLY after qualifying the lead with questions about urgency, timeline, and seriousness

DECISION TREE:
1. Do you have the user's actual name (not "Client Name")? If NO → use show_contact_form
2. Do you have the user's actual email and phone? If NO → use show_contact_form  
3. Do you have the user's actual location${requiresLocation ? ' (not "Client Location")' : ''}? If NO → use show_contact_form
4. Only if you have ALL actual values → use create_matter
- Always start by briefly reflecting the user’s latest concern so they know you understood (e.g., "I’m sorry you were fired").
- Be concise and skip pleasantries; respond to the user's latest question directly
- Let middleware-driven UI (case drafts, checklists, PDFs) speak for itself—mention them briefly rather than describing their contents
- Only show contact form when user explicitly asks to skip intake or contact the team directly
- For employment law issues, ask specific questions like: "When were you fired?", "What reason was given?", "Do you have any documentation?"
- When you don’t yet have contact information, collect at least two concrete qualifiers (e.g., reason, timeline, urgency) before moving on.
${styleGuidance}

Tool calling format:
TOOL_CALL: tool_name
PARAMETERS: {valid JSON}

CRITICAL: When calling a tool, output ONLY the tool call format above. 
Do NOT include any explanatory text before or after the tool call.
Do NOT say things like "I'll call the tool" or "Here's the function call".
Output the tool call format directly with no preamble.

Example tool calls:
TOOL_CALL: show_contact_form
PARAMETERS: {}

TOOL_CALL: create_matter
PARAMETERS: {"name": "John Doe", "matter_type": "Family Law", "description": "Divorce and child custody case", "email": "john@example.com", "phone": "555-123-4567"${requiresLocation ? ', "location": "Raleigh, NC"' : ''}}

NEVER DO THIS - These are WRONG examples:
TOOL_CALL: create_matter
PARAMETERS: {"name": "Client Name", "matter_type": "Family Law", "description": "Divorce case", "email": "user@example.com", "phone": "555-123-4567"}
TOOL_CALL: create_matter
PARAMETERS: {"name": "John Doe", "matter_type": "Family Law", "description": "Divorce case", "email": "user@example.com", "phone": "555-123-4567", "location": "Client Location"}

// Note: build_case_draft, show_document_checklist, and skip_to_lawyer are now handled by middleware

Be empathetic and professional. Focus on understanding the client's legal needs and gathering necessary information.`;
}

// Get available tools based on context
function getAvailableToolsForState(state: ConversationState, context: ConversationContext): ToolDefinition<Record<string, unknown>>[] {
  const allTools = [createMatter, showContactForm, requestLawyerReview, createPaymentInvoice, analyzeDocument];

  switch (state) {
    case ConversationState.GATHERING_INFORMATION:
      // For simple greetings, provide no tools - let AI respond conversationally
      // Only provide document analysis if there are actual attachments
      return context.hasLegalIssue ? [analyzeDocument] : [];
    case ConversationState.QUALIFYING_LEAD:
      // Only provide contact form if lead is highly qualified
      // Otherwise, let AI ask qualifying questions first
      return context.isQualifiedLead ? [showContactForm] : [];
    case ConversationState.SHOWING_CONTACT_FORM:
      return [showContactForm];
    case ConversationState.READY_TO_CREATE_MATTER:
    case ConversationState.CREATING_MATTER:
      return [createMatter, showContactForm];
    case ConversationState.COMPLETED:
      return allTools;
    default:
      return [];
  }
}

// Type guards
function hasMessageProperty(obj: unknown): obj is { message: string } {
  return obj !== null && typeof obj === 'object' && 'message' in obj && typeof (obj as Record<string, unknown>).message === 'string';
}

function hasResponseProperties(obj: unknown): obj is { message?: string; response?: string } {
  return obj !== null && typeof obj === 'object' && ('message' in obj || 'response' in obj);
}

function hasToolCalls(aiResult: unknown): aiResult is { tool_calls: unknown[] } {
  return aiResult !== null && typeof aiResult === 'object' && 'tool_calls' in aiResult && 
         Array.isArray((aiResult as Record<string, unknown>).tool_calls) && ((aiResult as Record<string, unknown>).tool_calls as unknown[]).length > 0;
}

// Utility functions
function extractStringFromResponse(obj: { message?: string; response?: string }): string | undefined {
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.response === 'string') return obj.response;
  return undefined;
}

function extractToolResponse<T>(toolResult: ErrorResult<T>): string {
  if (toolResult.success) {
    if (hasMessageProperty(toolResult)) return toolResult.message;
    const data = toolResult.data;
    if (data && typeof data === 'object' && hasResponseProperties(data)) {
      const extractedString = extractStringFromResponse(data);
      if (extractedString) return extractedString;
    }
    return 'Tool executed successfully.';
  } else {
    const errorResult = toolResult as Extract<ErrorResult<T>, { success: false }>;
    if (errorResult.error && typeof errorResult.error.toUserResponse === 'function') {
      return errorResult.error.toUserResponse();
    } else if (errorResult.error && errorResult.error.message) {
      return errorResult.error.message;
    } else {
      return 'An error occurred while executing the tool.';
    }
  }
}

function extractAIResponse(aiResult: unknown): string {
  if (aiResult !== null && typeof aiResult === 'object' && 'response' in aiResult) {
    const response = (aiResult as Record<string, unknown>).response;
    return typeof response === 'string' ? response : 'I apologize, but I encountered an error processing your request.';
  }
  return 'I apologize, but I encountered an error processing your request.';
}

// SSE Helper functions
async function emitSSEEvent(controller: globalThis.ReadableStreamDefaultController<Uint8Array> | undefined, event: unknown): Promise<void> {
  if (!controller) return;
  
  try {
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(new TextEncoder().encode(eventData));
  } catch (error) {
    Logger.warn('Failed to emit SSE event', { event: (event as any)?.type, error });
  }
}

async function emitComplete(controller: globalThis.ReadableStreamDefaultController<Uint8Array> | undefined): Promise<void> {
  await emitSSEEvent(controller, { type: 'complete' });
    
  if (controller) {
    try {
      controller.close();
    } catch (_closeError) {
      Logger.debug('Controller already closed or closing');
    }
  }
}

async function emitError(controller: globalThis.ReadableStreamDefaultController<Uint8Array> | undefined, error: unknown, correlationId: string): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await emitSSEEvent(controller, {
    type: 'error',
    message: errorMessage,
    correlationId
  });
}

// Tool call handlers
async function handleToolCall(
  toolCall: { name: string; arguments?: Record<string, unknown> },
  env: Env,
  teamConfig: unknown,
  controller: globalThis.ReadableStreamDefaultController<Uint8Array> | undefined,
  correlationId: string,
  sessionId?: string,
  teamId?: string
): Promise<void> {
  const { name: toolName, arguments: parameters = {} } = toolCall;
  
  // PRE-FLIGHT CHECK: Detect placeholder values in create_matter calls
  if (toolName === 'create_matter') {
    const { name, email, phone, location } = parameters;
    
    const placeholders = ['client name', 'client location', 'user name', 'user location', 
                          'client email', 'user email', 'client phone', 'user phone'];
    
    const hasPlaceholder = [name, email, phone, location].some(val => 
      typeof val === 'string' && placeholders.some(p => val.toLowerCase().includes(p))
    );
    
    if (hasPlaceholder) {
      Logger.warn('Detected placeholder values in create_matter call, redirecting to contact form', {
        parameters,
        correlationId,
        sessionId,
        teamId
      });
      
      // Override the tool call - force contact form instead
      toolCall.name = 'show_contact_form';
      toolCall.arguments = {};
    }
  }
  
  await emitSSEEvent(controller, {
    type: 'tool_call',
    name: toolCall.name,
    parameters: toolCall.arguments
  });

  const handler = TOOL_HANDLERS[toolCall.name as keyof typeof TOOL_HANDLERS];
  if (!handler) {
    Logger.warn(`Unknown tool: ${toolCall.name}`);
    LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_FAILED, toolCall.name, toolCall.arguments, undefined, new Error(`Unknown tool: ${toolCall.name}`));
    await emitError(controller, `Unknown tool: ${toolCall.name}`, correlationId);
    return;
  }

  LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_START, toolCall.name, toolCall.arguments);

  try {
    const toolResult = await handler(toolCall.arguments, env, teamConfig, correlationId, sessionId, teamId);
    
    ToolUsageMonitor.recordToolUsage(toolCall.name, toolResult.success);
    LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_SUCCESS, toolCall.name, toolCall.arguments, toolResult);

    await emitSSEEvent(controller, {
      type: 'tool_result',
      name: toolCall.name,
      result: toolResult
    });

    // Special handling for show_contact_form
    if (toolCall.name === 'show_contact_form' && toolResult.success) {
      const contactFormResponse = (toolResult.data && typeof toolResult.data === 'object')
        ? toolResult.data as ContactFormResponse
        : null;
      // Check if location is required for this team
      const requiresLocation = (teamConfig as any)?.jurisdiction?.requireLocation;
      const requiredFields = ['name', 'email', 'phone'];
      if (requiresLocation) {
        requiredFields.push('location');
      }
      
      await emitSSEEvent(controller, {
        type: 'contact_form',
        data: {
          fields: ['name', 'email', 'phone', 'location', 'opposingParty'],
          required: requiredFields,
          message: ('data' in toolResult ? (toolResult.data as Record<string, unknown>)?.message : null) || 'Please fill out the contact form below.',
          initialValues: contactFormResponse?.contactForm?.initialValues
        }
      });
      return;
    }

    // Note: skip_to_lawyer is now handled by middleware, not as an AI tool

    const finalResponse = extractToolResponse(toolResult as ErrorResult<Record<string, unknown>>);

    if (!toolResult.success && toolCall.name === 'create_matter') {
      await emitSSEEvent(controller, {
        type: 'tool_error',
        response: finalResponse,
        toolName: toolCall.name,
        allowRetry: true
      });
      return; // Don't close - allow retry
    }

    await emitSSEEvent(controller, {
      type: 'final',
      response: finalResponse
    });

  } catch (error) {
    Logger.error('Tool execution failed:', error);
    ToolUsageMonitor.recordToolUsage(toolCall.name, false);
    LegalIntakeLogger.logToolCall(correlationId, sessionId, teamId, LegalIntakeOperation.TOOL_CALL_FAILED, toolCall.name, toolCall.arguments, undefined, error instanceof Error ? error : new Error(String(error)));
    await emitError(controller, 'Tool execution failed. Please try again.', correlationId);
  }
}

async function handleParsedToolCall(
  response: string,
  env: Env,
  teamConfig: unknown,
  controller: globalThis.ReadableStreamDefaultController<Uint8Array> | undefined,
  correlationId: string,
  sessionId?: string,
  teamId?: string
): Promise<void> {
  const parseResult = ToolCallParser.parseToolCall(response);
  
  if (!parseResult.success || !parseResult.toolCall) {
    if (parseResult.error && parseResult.error !== 'No tool call detected') {
      Logger.error('Tool call parsing failed:', parseResult.error);
      await emitError(controller, 'Failed to parse tool parameters. Please try rephrasing your request.', correlationId);
    }
    return;
  }

  const { toolName, parameters } = parseResult.toolCall;
  await handleToolCall({ name: toolName, arguments: parameters }, env, teamConfig, controller, correlationId, sessionId, teamId);
}

async function streamTextResponse(response: string, controller: ReadableStreamDefaultController<Uint8Array> | undefined): Promise<void> {
  if (!response || response.trim().length < 10) {
    response = 'I apologize, but I encountered an error processing your request.';
  }

  await emitSSEEvent(controller, {
    type: 'text',
    text: response
  });

  await emitSSEEvent(controller, {
    type: 'final',
      response
  });
}

function buildPrompt(messages: readonly AgentMessage[], _context: ConversationContext): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return messages.map(msg => ({
    role: msg.role || (msg.isUser ? 'user' : 'assistant'),
    content: msg.content || ''
  }));
}

function looksLikeToolCall(response: string): boolean {
  if (typeof response !== 'string') {
    return false;
  }

  const lower = response.toLowerCase();
  
  // Original pattern: TOOL_CALL: format
  if (safeIncludes(lower, 'tool_call')) {
    return true;
  }

  // NEW: Detect JSON objects with "name" and "arguments" fields
  // This catches: {"name": "tool_name", "arguments": {...}}
  if (lower.includes('"name"') && lower.includes('"arguments"')) {
    try {
      const trimmed = response.trim();
      // Try to find JSON object in the response
      const jsonMatch = trimmed.match(/\{[^}]*"name"[^}]*"arguments"[^}]*\}/);
      if (jsonMatch) {
        return true;
      }
    } catch {
      // Not valid JSON, continue checking
    }
  }

  // Existing pattern check
  const trimmed = response.trim();
  return trimmed.startsWith('{') && safeIncludes(lower, '"name"');
}

// Main agent function - SIMPLIFIED TO SINGLE AI CALL
export async function runLegalIntakeAgentStream(
  env: Env, 
  messages: readonly AgentMessage[], 
  teamId?: string, 
  sessionId?: string,
  cloudflareLocation?: CloudflareLocation,
  controller?: ReadableStreamDefaultController<Uint8Array>,
  attachments: readonly FileAttachment[] = []
): Promise<AgentResponse | void> {
  
  Logger.initialize({ DEBUG: env.DEBUG, NODE_ENV: env.NODE_ENV });
  const correlationId = LegalIntakeLogger.generateCorrelationId();
  const aiCallStartTime = Date.now();

  try {
    // Initial connection
    await emitSSEEvent(controller, { type: 'connected' });

    // Team configuration with caching
    let teamConfig: unknown = null;
    if (teamId) {
      try {
        teamConfig = await getTeamConfig(teamId, env);
      } catch (error) {
        Logger.error('Failed to retrieve team configuration', { teamId, error: error instanceof Error ? error.message : String(error) });
        await emitError(controller, 'Failed to retrieve team configuration', correlationId);
        teamConfig = null;
      }
    }

    // Log agent start
    LegalIntakeLogger.logAgentStart(correlationId, sessionId, teamId, messages.length, attachments.length > 0, attachments.length, teamConfig ? { hasConfig: true } : { hasConfig: false });

    // Build conversation text
    const conversationText = messages.map(msg => `${msg.role || (msg.isUser ? 'user' : 'assistant')}: ${msg.content || ''}`).join('\n');

    // Check for completion state
    const hasCompletionCues = safeIncludes(conversationText.toLowerCase(), 'matter created') ||
                              safeIncludes(conversationText.toLowerCase(), 'consultation fee') ||
                              safeIncludes(conversationText.toLowerCase(), 'already helped you create a matter');
    
    const hasToolInvocation = messages.some(msg => 
      msg.metadata?.toolName === 'create_matter' || 
      (msg.content && safeIncludes(msg.content, 'TOOL_CALL: create_matter'))
    );

    if (hasCompletionCues || hasToolInvocation) {
      const completionMessage = "I've already helped you create a matter for your case. A lawyer will contact you within 24 hours to discuss your situation further. Is there anything else I can help you with?";
      
      if (controller) {
        await emitSSEEvent(controller, { type: 'final', response: completionMessage });
        await emitComplete(controller);
      } else {
        const lastUserMessage = messages.filter(msg => msg.isUser).pop()?.content || null;
        return {
          response: completionMessage,
          metadata: { 
            conversationComplete: true, 
            sessionId,
            teamId,
            inputMessageCount: messages.length,
            lastUserMessage
          }
        };
      }
      return;
    }
    
    // FAST CONTEXT DETECTION (no AI calls)
    const context = detectContextFast(conversationText);
    
    // Get available tools and system prompt
    const availableTools = getAvailableToolsForState(context.state, context);
    const systemPrompt = buildSystemPrompt(context, teamConfig, teamId);
    
    // Log conversation state
    Logger.info('Conversation State:', {
      correlationId, sessionId, teamId, state: context.state,
      messageCount: messages.length, hasLegalIssue: Boolean(context.legalIssueType),
      hasDescription: Boolean(context.description), isQualifiedLead: context.isQualifiedLead,
      availableTools: availableTools.map(tool => tool.name)
    });

    // SINGLE AI CALL
    LegalIntakeLogger.logAIModelCall(correlationId, sessionId, teamId, LegalIntakeOperation.AI_MODEL_CALL, AI_MODEL_CONFIG.model);
    
    const aiResult = await withAIRetry(
      () => env.AI.run(AI_MODEL_CONFIG.model as any, {
        messages: [
          { role: 'system', content: systemPrompt },
          ...buildPrompt(messages, context)
        ],
        tools: availableTools,
        max_tokens: AI_MODEL_CONFIG.maxTokens,
        temperature: AI_MODEL_CONFIG.temperature
      }),
      { attempts: 4, baseDelay: 400, operationName: 'Legal Intake AI Call' }
    );

    // Log AI response metadata
    const processingTime = Date.now() - aiCallStartTime;
    const response = extractAIResponse(aiResult);
    LegalIntakeLogger.logAIModelCall(correlationId, sessionId, teamId, LegalIntakeOperation.AI_MODEL_RESPONSE, AI_MODEL_CONFIG.model, undefined, response.length, processingTime);

    // Handle AI response
    if (hasToolCalls(aiResult)) {
      const toolCall = aiResult.tool_calls[0] as { name: string; arguments?: Record<string, unknown> };
      await handleToolCall(toolCall, env, teamConfig, controller, correlationId, sessionId, teamId);
    } else if (looksLikeToolCall(response)) {
      await handleParsedToolCall(response, env, teamConfig, controller, correlationId, sessionId, teamId);
    } else {
      await streamTextResponse(response, controller);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Agent error occurred', { correlationId, sessionId, teamId, error: errorMessage });
    LegalIntakeLogger.logAgentError(correlationId, sessionId, teamId, error instanceof Error ? error : new Error(String(error)));
    
    await emitError(controller, errorMessage, correlationId);
    
    if (!controller) {
      const lastUserMessage = messages.filter(msg => msg.isUser).pop()?.content || null;
      return {
        response: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
        metadata: {
          error: errorMessage,
          sessionId,
          teamId,
          inputMessageCount: messages.length,
          lastUserMessage
        }
      };
    }
  } finally {
    await emitComplete(controller);
  }
}

// Tool handlers - extracted from the old legalIntakeAgent.ts
export async function handleCreateMatter(
  parameters: any,
  env: Env,
  teamConfig: any,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
) {
  Logger.debug('[handleCreateMatter] parameters:', ToolCallParser.sanitizeParameters(parameters));
  const { matter_type, description, urgency, name, phone, email, location, opposing_party } = parameters;
  
  // Check for placeholder values
  if (ValidationService.hasPlaceholderValues(phone, email)) {
    return createValidationError("I need your actual contact information to proceed. Could you please provide your real phone number and email address?");
  }
  
  // Check for common placeholder patterns in name and location
  const placeholderPatterns = /client|user|placeholder|example|test|xxx|n\/a|tbd/i;
  
  if (placeholderPatterns.test(name || '') || 
      placeholderPatterns.test(location || '')) {
    return createValidationError("I need your actual information to proceed. Could you please provide your real name and location?");
  }
  
  // Validate required fields
  if (!matter_type || !description || !name) {
    return createValidationError("I'm missing some essential information. Could you please provide your name, contact information, and describe your legal issue?");
  }
  
  // Validate matter type
  if (!ValidationService.validateMatterType(matter_type)) {
    return createValidationError("I need to understand your legal situation better. Could you please describe what type of legal help you need? For example: family law, employment issues, landlord-tenant disputes, personal injury, business law, or general consultation.");
  }
  
  // Set default urgency if not provided
  const finalUrgency = urgency || 'unknown';
  
  // Validate name format
  if (!ValidationService.validateName(name)) {
    return createValidationError("I need your full name to proceed. Could you please provide your complete name?");
  }
  
  // Validate email if provided
  if (email && !ValidationService.validateEmail(email)) {
    return createValidationError("The email address you provided doesn't appear to be valid. Could you please provide a valid email address?");
  }
  
  // Validate phone if provided
  if (phone && phone.trim() !== '') {
    const phoneValidation = ValidationService.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return createValidationError(`The phone number you provided doesn't appear to be valid: ${phoneValidation.error}. Could you please provide a valid phone number?`);
    }
  }
  
  // Validate location if provided
  if (location && !ValidationService.validateLocation(location)) {
    return createValidationError("Could you please provide your city and state or country?");
  }
  
  if (!phone && !email) {
    return createValidationError("I need at least one way to contact you to proceed. Could you provide either your phone number or email address?");
  }
  
  // Process payment using the PaymentServiceFactory
  const paymentRequest = {
    customerInfo: {
      name: name,
      email: email || '',
      phone: phone || '',
      location: location || ''
    },
    matterInfo: {
      type: matter_type,
      description: description,
      urgency: finalUrgency,
      opposingParty: opposing_party || ''
    },
    teamId: (() => {
      if (teamConfig?.id) {
        return teamConfig.id;
      }
      if (env.BLAWBY_TEAM_ULID) {
        console.warn('⚠️  Using environment variable BLAWBY_TEAM_ULID as fallback - team configuration not found in database');
        return env.BLAWBY_TEAM_ULID;
      }
      console.error('❌ CRITICAL: No team ID available for payment processing');
      throw new Error('Team ID not configured - cannot process payment. Check database configuration.');
    })(),
    sessionId: 'session-' + Date.now()
  };
  
  const { invoiceUrl, paymentId } = await PaymentServiceFactory.processPayment(env, paymentRequest, teamConfig);

  const orchestrationResult = await ContactIntakeOrchestrator.finalizeSubmission({
    env,
    teamConfig: teamConfig ?? null,
    sessionId,
    teamId,
    correlationId,
    matter: {
      matterType: matter_type,
      description,
      name,
      email: email || undefined,
      phone: phone || undefined,
      location: location || undefined,
      opposingParty: opposing_party || undefined,
      urgency: finalUrgency
    }
  });
  
  // Build summary message
  const requiresPayment = teamConfig?.config?.requiresPayment || false;
  const consultationFee = teamConfig?.config?.consultationFee || 0;
  
  let summaryMessage = `Perfect! I have all the information I need. Here's a summary of your matter:

**Client Information:**
- Name: ${name}
- Contact: ${phone || 'Not provided'}${email ? `, ${email}` : ''}${location ? `, ${location}` : ''}`;

  if (opposing_party) {
    summaryMessage += `
- Opposing Party: ${opposing_party}`;
  }

  summaryMessage += `

**Matter Details:**
- Type: ${matter_type}
- Description: ${description}
- Urgency: ${finalUrgency}`;

  if (requiresPayment && consultationFee > 0) {
    if (invoiceUrl) {
      summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using the embedded payment form below
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    } else {
      summaryMessage += `

Before we can proceed with your consultation, there's a consultation fee of $${consultationFee}.

**Next Steps:**
1. Please complete the payment using this link: ${teamConfig?.config?.paymentLink || 'Payment link will be sent shortly'}
2. Once payment is confirmed, a lawyer will contact you within 24 hours

Please complete the payment to secure your consultation. If you have any questions about the payment process, please let me know.`;
    }
  } else {
    summaryMessage += `

I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.`;
  }

  if (orchestrationResult.pdf) {
    summaryMessage += `

I've generated a case summary PDF (${orchestrationResult.pdf.filename}) you can download or share when you're ready.`;
  }

  if (orchestrationResult.notifications?.matterCreatedSent) {
    summaryMessage += `

Your full submission has already been sent to our legal team for review${requiresPayment && consultationFee > 0 ? ', and we alerted them that payment is pending.' : '.'}`;
  }
  
  const result = createSuccessResponse(summaryMessage, {
    matter_type,
    description,
    urgency: finalUrgency,
    name,
    phone,
    email,
    location,
    opposing_party,
    requires_payment: requiresPayment,
    consultation_fee: consultationFee,
    payment_link: invoiceUrl || teamConfig?.config?.paymentLink,
    payment_embed: invoiceUrl ? {
      paymentUrl: invoiceUrl,
      amount: consultationFee,
      description: `${matter_type}: ${description}`,
      paymentId: paymentId
    } : null,
    case_summary_pdf: orchestrationResult.pdf ?? null,
    notifications: orchestrationResult.notifications ?? null
  });
  
  Logger.debug('[handleCreateMatter] result created successfully');
  return result;
}

export async function handleRequestLawyerReview(
  parameters: any,
  env: Env,
  teamConfig: any,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
) {
  const { urgency, complexity, matter_type } = parameters;

  let contactName: string | undefined;
  let contactEmail: string | undefined;
  let contactPhone: string | undefined;
  let matterDescription: string | undefined;

  if (sessionId && teamId) {
    try {
      const context = await ConversationContextManager.load(sessionId, teamId, env);
      contactName = context.contactInfo?.name?.trim() || undefined;
      contactEmail = context.contactInfo?.email?.trim() || undefined;
      contactPhone = context.contactInfo?.phone?.trim() || undefined;

      if (context.caseDraft?.key_facts?.length) {
        matterDescription = context.caseDraft.key_facts.join('\n');
      } else if (context.pendingContactForm?.reason) {
        matterDescription = context.pendingContactForm.reason;
      }
    } catch (error) {
      Logger.warn('[handleRequestLawyerReview] Failed to load conversation context', {
        correlationId,
        sessionId,
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Hardened contact and name validation, plus placeholder rejection
  const hasValidEmail = Boolean(contactEmail && ValidationService.validateEmail(contactEmail));
  const hasValidPhone = Boolean(contactPhone && ValidationService.validatePhone(contactPhone).isValid);
  const hasReachableContact = hasValidEmail || hasValidPhone;
  const isNameValid = Boolean(contactName && ValidationService.validateName(contactName));
  const hasPlaceholders = ValidationService.hasPlaceholderValues(contactPhone, contactEmail);

  if (!isNameValid || !hasReachableContact || hasPlaceholders) {
    return createValidationError(
      "I still need your real contact information before I can connect you with a lawyer. " +
      "Please share your full name and either a valid email address or phone number."
    );
  }

  // Optionally also validate the matter type before proceeding
  if (parameters.matter_type && !ValidationService.validateMatterType(parameters.matter_type)) {
    return createValidationError(
      "Please confirm the type of legal matter so I can route your request correctly " +
      "(e.g., family law, employment, landlord/tenant)."
    );
  }
  // Send notification using NotificationService
  const { NotificationService } = await import('../../services/NotificationService.js');
  const notificationService = new NotificationService(env);
  
  await notificationService.sendLawyerReviewNotification({
    type: 'lawyer_review',
    teamConfig,
    matterInfo: {
      type: matter_type,
      urgency,
      complexity,
      description: matterDescription
    },
    clientInfo: {
      name: contactName,
      email: contactEmail,
      phone: contactPhone
    }
  });
  
  return createSuccessResponse("I've requested a lawyer review for your case due to its urgent nature. A lawyer will review your case and contact you to discuss further.");
}

export async function handleAnalyzeDocument(parameters: any, env: any, _teamConfig: any) {
  const { file_id, analysis_type, specific_question } = parameters;
  
  Logger.debug('=== ANALYZE DOCUMENT TOOL CALLED ===');
  Logger.debug('File ID:', ToolCallParser.sanitizeParameters(file_id));
  Logger.debug('Analysis Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Specific Question:', ToolCallParser.sanitizeParameters(specific_question));
  
  // Get the appropriate analysis question
  const customQuestion = getAnalysisQuestion(analysis_type, specific_question);
  
  // Perform the analysis
  const fileAnalysis = await analyzeFile(env, file_id, customQuestion);
  
  if (!fileAnalysis) {
    return createValidationError("I'm sorry, I couldn't analyze that document. The file may not be accessible or may not be in a supported format. Could you please try uploading it again or provide more details about what you'd like me to help you with?");
  }
  
  // Check if the analysis returned an error response (low confidence indicates error)
  if (fileAnalysis.confidence === 0.0) {
    return createValidationError(fileAnalysis.summary || "I'm sorry, I couldn't analyze that document. Please try uploading it again or contact support if the issue persists.");
  }
  
  // Add document type to analysis
  fileAnalysis.documentType = analysis_type;
  
  // Log the analysis results
  Logger.debug('=== DOCUMENT ANALYSIS RESULTS ===');
  Logger.debug('Document Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  Logger.debug('Summary:', ToolCallParser.sanitizeParameters(fileAnalysis.summary));
  Logger.debug('Key Facts:', ToolCallParser.sanitizeParameters(fileAnalysis.key_facts));
  Logger.debug('Entities:', ToolCallParser.sanitizeParameters(fileAnalysis.entities));
  Logger.debug('Action Items:', ToolCallParser.sanitizeParameters(fileAnalysis.action_items));
  Logger.debug('================================');
  
  // Create a legally-focused response that guides toward matter creation
  let response = '';
  
  // Extract key information for legal intake
  const parties = fileAnalysis.entities?.people || [];
  const organizations = fileAnalysis.entities?.orgs || [];
  const dates = fileAnalysis.entities?.dates || [];
  const keyFacts = fileAnalysis.key_facts || [];
  
  // Determine likely matter type based on document analysis
  let suggestedMatterType = 'General Consultation';
  if (analysis_type === 'contract' || fileAnalysis.summary?.toLowerCase().includes('contract')) {
    suggestedMatterType = 'Contract Review';
  } else if (analysis_type === 'medical_document' || fileAnalysis.summary?.toLowerCase().includes('medical')) {
    suggestedMatterType = 'Personal Injury';
  } else if (analysis_type === 'government_form' || fileAnalysis.summary?.toLowerCase().includes('form')) {
    suggestedMatterType = 'Administrative Law';
  } else if (analysis_type === 'image' && (fileAnalysis.summary?.toLowerCase().includes('accident') || fileAnalysis.summary?.toLowerCase().includes('injury'))) {
    suggestedMatterType = 'Personal Injury';
  } else if (analysis_type === 'image' && fileAnalysis.summary?.toLowerCase().includes('property')) {
    suggestedMatterType = 'Property Law';
  }
  
  // Build legally-focused response
  response += `I've analyzed your document and here's what I found:\n\n`;
  
  // Document identification
  if (fileAnalysis.summary) {
    response += `**Document Analysis:** ${fileAnalysis.summary}\n\n`;
  }
  
  // Key legal details
  if (parties.length > 0) {
    response += `**Parties Involved:** ${parties.join(', ')}\n`;
  }
  
  if (organizations.length > 0) {
    response += `**Organizations:** ${organizations.join(', ')}\n`;
  }
  
  if (dates.length > 0) {
    response += `**Important Dates:** ${dates.join(', ')}\n`;
  }
  
  if (keyFacts.length > 0) {
    response += `**Key Facts:**\n`;
    keyFacts.slice(0, 3).forEach(fact => {
      response += `• ${fact}\n`;
    });
  }
  
  response += `\n**Suggested Legal Matter Type:** ${suggestedMatterType}\n\n`;
  
  // Legal guidance and next steps
  response += `Based on this analysis, I can help you:\n`;
  response += `• Create a legal matter for attorney review\n`;
  response += `• Identify potential legal issues or concerns\n`;
  response += `• Determine appropriate legal services needed\n`;
  response += `• Prepare for consultation with an attorney\n\n`;
  
  // Call to action
  response += `Would you like me to create a legal matter for this ${suggestedMatterType.toLowerCase()} case? I'll need your contact information to get started.`;
  
  Logger.debug('=== FINAL ANALYSIS RESPONSE ===');
  Logger.debug('Response:', ToolCallParser.sanitizeParameters(response));
  Logger.debug('Response Length:', `${response.length} characters`);
  Logger.debug('Response Type:', ToolCallParser.sanitizeParameters(analysis_type));
  Logger.debug('Suggested Matter Type:', ToolCallParser.sanitizeParameters(suggestedMatterType));
  Logger.debug('Response Confidence:', `${(fileAnalysis.confidence * 100).toFixed(1)}%`);
  Logger.debug('==============================');
  
  return createSuccessResponse(response, {
    ...fileAnalysis,
    suggestedMatterType,
    parties,
    organizations,
    dates,
    keyFacts
  });
}

// Payment invoice handler with proper TypeScript types and dependency injection
export async function handleCreatePaymentInvoice(
  parameters: any, 
  env: Env, 
  teamConfig?: any
): Promise<any> {
  // Generate unique session ID for idempotency
  const sessionId = crypto.randomUUID();
  
  // Validate team configuration
  if (!teamConfig?.id) {
    return {
      success: false,
      error: 'Team configuration missing: team ID is required for payment processing',
      errorDetails: {
        code: 'MISSING_TEAM_CONFIG',
        message: 'Team configuration is missing or invalid',
        retryable: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  const { 
    invoice_id,
    amount, 
    currency,
    recipient,
    description,
    due_date
  } = parameters;

  try {
    // Create payment service using dependency injection
    const paymentService = PaymentServiceFactory.createPaymentService(env);
    
    // Create payment request with proper typing and unique session ID
    const paymentRequest = {
      customerInfo: {
        name: recipient.name,
        email: recipient.email,
        phone: '', // Not provided in new schema
        location: '' // Default empty location as required by PaymentRequest interface
      },
      matterInfo: {
        type: 'consultation', // Default type since not in new schema
        description: description,
        urgency: 'normal', // Default urgency as required by PaymentRequest interface
        opposingParty: '' // Default empty opposing party
      },
      teamId: teamConfig.id, // Use validated team ID
      sessionId: sessionId, // Use generated unique session ID for idempotency
      invoiceId: invoice_id, // Add invoice ID
      currency: currency, // Add currency
      dueDate: due_date // Add due date if provided
    };

    // Call payment service with retry logic (handled internally)
    const result = await paymentService.createInvoice(paymentRequest);

    if (result.success) {
      return {
        success: true,
        action: 'show_payment',
        message: `I've created a payment invoice for your consultation. Please complete the payment to proceed.`,
        payment: {
          invoiceUrl: result.invoiceUrl!,
          paymentId: result.paymentId!,
          amount: amount,
          serviceType: 'consultation',
          sessionId: sessionId // Include session ID for correlation
        }
      };
    } else {
      // Return detailed error information for debugging
      return {
        success: false,
        error: result.error || 'Failed to create payment invoice',
        errorDetails: {
          code: 'PAYMENT_SERVICE_ERROR',
          message: result.error || 'Failed to create payment invoice',
          retryable: true, // Payment service errors are generally retryable
          timestamp: new Date().toISOString(),
          sessionId: sessionId, // Include session ID for correlation
          originalError: result.error
        }
      };
    }
  } catch (error) {
    // Log detailed error information
    Logger.error('❌ Payment invoice creation failed:', error);
    
    // Return detailed error payload for debugging
    return {
      success: false,
      error: 'Payment service unavailable. Please try again later.',
      errorDetails: {
        code: 'PAYMENT_SERVICE_EXCEPTION',
        message: 'Payment service threw an exception during invoice creation',
        retryable: true,
        timestamp: new Date().toISOString(),
        sessionId: sessionId, // Include session ID for correlation
        originalError: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

// Validation utilities for contact form parameters
function validateContactFormParameters(parameters: unknown): { isValid: boolean; error?: string; params?: ContactFormParameters } {
  // Check if parameters exist and is an object
  if (!parameters || typeof parameters !== 'object') {
    return { isValid: false, error: 'Invalid parameters: expected object' };
  }

  const params = parameters as Record<string, unknown>;
  const resultParams: Partial<ContactFormParameters> = {};
  
  // Validate reason if provided
  if (params.reason !== undefined) {
    if (typeof params.reason !== 'string' || params.reason.trim().length === 0) {
      return { isValid: false, error: 'Invalid reason: expected non-empty string' };
    }
    (resultParams as any).reason = params.reason;
  }

  // Validate name if provided
  if (params.name !== undefined) {
    if (typeof params.name !== 'string' || params.name.trim().length === 0) {
      return { isValid: false, error: 'Invalid name: expected non-empty string' };
    }
    (resultParams as any).name = params.name;
  }

  // Validate email if provided
  if (params.email !== undefined) {
    if (typeof params.email !== 'string' || !ValidationService.validateEmail(params.email)) {
      return { isValid: false, error: 'Invalid email: expected valid email address' };
    }
    (resultParams as any).email = params.email;
  }

  // Validate phone if provided
  if (params.phone !== undefined) {
    if (typeof params.phone !== 'string') {
      return { isValid: false, error: 'Invalid phone: expected string' };
    }
    if (params.phone.trim() !== '') {
      const phoneValidation = ValidationService.validatePhone(params.phone);
      if (!phoneValidation.isValid) {
        return { isValid: false, error: `Invalid phone: ${phoneValidation.error}` };
      }
    }
    (resultParams as any).phone = params.phone;
  }

  // Validate location if provided
  if (params.location !== undefined) {
    if (typeof params.location !== 'string' || params.location.trim().length === 0) {
      return { isValid: false, error: 'Invalid location: expected non-empty string' };
    }
    (resultParams as any).location = params.location;
  }

  // Validate message if provided
  if (params.message !== undefined) {
    if (typeof params.message !== 'string' || params.message.trim().length === 0) {
      return { isValid: false, error: 'Invalid message: expected non-empty string' };
    }
    (resultParams as any).message = params.message;
  }

  return { 
    isValid: true, 
    params: Object.keys(resultParams).length ? (resultParams as ContactFormParameters) : undefined
  };
}

// Handler for showing contact form with proper types and validation
export async function handleShowContactForm(
  parameters: unknown, 
  env: Env, 
  teamConfig?: any,
  correlationId?: string,
  sessionId?: string,
  teamId?: string
): Promise<ErrorResult<ContactFormResponse>> {
  try {
    // Validate parameters
    const validation = validateContactFormParameters(parameters);
    if (!validation.isValid) {
      const error = new ValidationError(
        validation.error || 'Invalid parameters provided',
        {
          parameters: parameters,
          method: 'handleShowContactForm',
          correlationId,
          sessionId,
          teamId
        }
      );
      return createErrorResult(error);
    }

    const params = validation.params || {};
    const reason = params.reason || 'your legal matter';

    let initialValues: ContactFormData['initialValues'];
    if (sessionId && teamId) {
      try {
        const context = await ConversationContextManager.load(sessionId, teamId, env);
        if (context?.contactInfo) {
          const sanitizedValues: Record<string, string> = {};
          const { contactInfo } = context;

          if (contactInfo.name && typeof contactInfo.name === 'string') {
            sanitizedValues.name = contactInfo.name.trim();
          }
          if (contactInfo.email && typeof contactInfo.email === 'string') {
            sanitizedValues.email = contactInfo.email.trim();
          }
          if (contactInfo.phone && typeof contactInfo.phone === 'string') {
            sanitizedValues.phone = contactInfo.phone.trim();
          }
          if (contactInfo.location && typeof contactInfo.location === 'string') {
            sanitizedValues.location = contactInfo.location.trim();
          }

          if (Object.keys(sanitizedValues).length > 0) {
            initialValues = sanitizedValues;
          }
        }
      } catch (contextError) {
        Logger.warn('[handleShowContactForm] Failed to load conversation context for initial values', {
          sessionId,
          teamId,
          error: contextError instanceof Error ? contextError.message : String(contextError)
        });
      }
    }

    let response: ContactFormResponse = {
      success: true,
      action: 'show_contact_form',
      message: `I'd be happy to help you with ${reason.toLowerCase()}. Please fill out the contact form below so we can get in touch with you.`,
      contactForm: {
        reason,
        fields: {
          name: { required: true, label: 'Full Name' },
          email: { required: true, label: 'Email Address' },
          phone: { required: false, label: 'Phone Number' },
          location: { required: true, label: 'Location (City, State)' },
          opposing_party: { required: false, label: 'Opposing Party (if applicable)' },
          message: { required: false, label: 'Additional Details' }
        },
        submitText: 'Submit Contact Form'
      }
    };

    if (initialValues) {
      const allowedInitialValues: Record<string, string> = {};
      const contactFormFields = Object.keys(response.contactForm.fields);
      for (const fieldKey of contactFormFields) {
        const normalizedKey = fieldKey === 'opposing_party' ? 'opposingParty' : fieldKey;
        if (normalizedKey === 'message') {
          continue;
        }
        const value = initialValues[normalizedKey as keyof NonNullable<ContactFormData['initialValues']>];
        if (typeof value === 'string' && value.trim()) {
          allowedInitialValues[normalizedKey] = value.trim();
        }
      }

      if (Object.keys(allowedInitialValues).length > 0) {
        response = {
          ...response,
          contactForm: {
            ...response.contactForm,
            initialValues: allowedInitialValues
          } as ContactFormData
        };
      }
    }

    return createSuccessResult(response);
  } catch (error) {
    Logger.error('[handleShowContactForm] Unexpected error:', error);
    const validationError = new ValidationError(
      'An unexpected error occurred while processing your request. Please try again.',
      {
        originalError: error instanceof Error ? error.message : String(error),
        method: 'handleShowContactForm',
        correlationId,
        sessionId,
        teamId
      }
    );
    return createErrorResult(validationError);
  }
}

// Tool handlers mapping
export const TOOL_HANDLERS = {
  show_contact_form: handleShowContactForm,
  create_matter: handleCreateMatter,
  request_lawyer_review: handleRequestLawyerReview,
  analyze_document: handleAnalyzeDocument,
  create_payment_invoice: handleCreatePaymentInvoice
  // Note: build_case_draft, show_document_checklist, and skip_to_lawyer are now handled by middleware
};
