/**
 * 🔍 AI Tool Loop Debug Utility
 * 
 * A comprehensive debugging wrapper that:
 * 1. Validates the system prompt
 * 2. Logs missing tool issues
 * 3. Suggests fixes if tools or context are broken
 * 4. Provides detailed diagnostics for AI tool calling issues
 */

import { ToolDefinition } from '../agents/legal-intake/index.ts';
import { ConversationContext, ConversationState } from '../agents/legal-intake/conversationStateMachine.ts';
import { Logger } from './logger.ts';

/**
 * Generate a unique correlation ID for tracking debug sessions
 */
function generateCorrelationId(): string {
  const timestamp = Date.now();
  let randomSegment: string;
  
  // Try to use crypto.getRandomValues() for stronger entropy
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    randomSegment = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback to Math.random() if crypto is unavailable
    randomSegment = Math.random().toString(16).substr(2, 8);
  }
  
  return `debug-${timestamp}-${randomSegment}`;
}

/**
 * Structured logger for debug operations
 */
function logDebug(correlationId: string, level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
  const logEntry = {
    correlationId,
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(metadata && { metadata })
  };
  
  console.log(JSON.stringify(logEntry));
}

export interface DebugConfig {
  /** Available tools to validate */
  tools: ToolDefinition[];
  /** System prompt to analyze */
  systemPrompt: string;
  /** Current conversation state */
  state: ConversationState;
  /** Current conversation context */
  context: ConversationContext;
  /** AI model being used */
  model?: string;
  /** Whether to include detailed analysis */
  verbose?: boolean;
}

export interface DebugResult {
  /** Overall health status */
  healthy: boolean;
  /** Critical issues that will break the system */
  criticalIssues: string[];
  /** Warning issues that might cause problems */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Detailed analysis results */
  analysis: {
    /** Tool availability analysis */
    tools: {
      available: string[];
      missing: string[];
      expected: string[];
    };
    /** System prompt analysis */
    systemPrompt: {
      length: number;
      mentionsTools: boolean;
      toolReferences: string[];
      hasInstructions: boolean;
    };
    /** State machine analysis */
    stateMachine: {
      currentState: string;
      expectedTransitions: string[];
      contextValid: boolean;
      missingContext: string[];
    };
    /** AI model analysis */
    model: {
      configured: boolean;
      supportsTools: boolean;
      modelName?: string;
    };
  };
  /** Recommended fixes */
  fixes: string[];
}

/**
 * Initialize debug result with default values
 */
function initializeDebugResult(): DebugResult {
  return {
    healthy: true,
    criticalIssues: [],
    warnings: [],
    suggestions: [],
    analysis: {
      tools: { available: [], missing: [], expected: [] },
      systemPrompt: { length: 0, mentionsTools: false, toolReferences: [], hasInstructions: false },
      stateMachine: { currentState: '', expectedTransitions: [], contextValid: false, missingContext: [] },
      model: { configured: false, supportsTools: false }
    },
    fixes: []
  };
}

/**
 * Analyze available tools and identify issues
 */
function analyzeTools(config: DebugConfig, result: DebugResult, correlationId: string): void {
  logDebug(correlationId, 'info', 'Starting tool analysis', { toolCount: config.tools.length });
  
  result.analysis.tools.available = config.tools.map(tool => tool.name);
  result.analysis.tools.expected = ['show_contact_form', 'create_matter', 'request_lawyer_review'];
  result.analysis.tools.missing = result.analysis.tools.expected.filter(
    expected => !result.analysis.tools.available.includes(expected)
  );

  // Check for critical tool issues
  if (result.analysis.tools.missing.includes('show_contact_form')) {
    result.criticalIssues.push('❌ CRITICAL: show_contact_form tool is missing');
    result.fixes.push('Add show_contact_form tool to availableTools array');
    logDebug(correlationId, 'error', 'Critical tool missing', { tool: 'show_contact_form' });
  }

  if (result.analysis.tools.available.length === 0) {
    result.criticalIssues.push('❌ CRITICAL: No tools available to AI');
    result.fixes.push('Ensure tools array is passed to env.AI.run() call');
    logDebug(correlationId, 'error', 'No tools available', { toolCount: 0 });
  }

  logDebug(correlationId, 'info', 'Tool analysis completed', {
    available: result.analysis.tools.available,
    missing: result.analysis.tools.missing
  });
}

/**
 * Analyze system prompt for completeness and tool references
 */
function analyzeSystemPrompt(config: DebugConfig, result: DebugResult, correlationId: string): void {
  logDebug(correlationId, 'info', 'Starting system prompt analysis', { promptLength: config.systemPrompt.length });
  
  result.analysis.systemPrompt.length = config.systemPrompt.length;
  result.analysis.systemPrompt.mentionsTools = config.systemPrompt.includes('show_contact_form');
  result.analysis.systemPrompt.hasInstructions = config.systemPrompt.includes('You are') || 
                                               config.systemPrompt.includes('Your role');
  
  // Extract tool references from system prompt
  const toolRegex = /(\w+_contact_form|\w+_matter|\w+_review)/g;
  const matches = config.systemPrompt.match(toolRegex);
  result.analysis.systemPrompt.toolReferences = matches || [];

  // Check for system prompt issues
  if (config.systemPrompt.length < 500) {
    result.warnings.push('⚠️ System prompt is very short (< 500 chars)');
    result.suggestions.push('Consider expanding system prompt with more detailed instructions');
    logDebug(correlationId, 'warn', 'System prompt too short', { length: config.systemPrompt.length });
  }

  if (!result.analysis.systemPrompt.mentionsTools) {
    result.criticalIssues.push('❌ CRITICAL: System prompt does not mention show_contact_form');
    result.fixes.push('Add show_contact_form instructions to system prompt');
    logDebug(correlationId, 'error', 'System prompt missing tool reference', { tool: 'show_contact_form' });
  }

  if (!result.analysis.systemPrompt.hasInstructions) {
    result.warnings.push('⚠️ System prompt lacks clear role instructions');
    result.suggestions.push('Add clear "You are a..." instructions to system prompt');
    logDebug(correlationId, 'warn', 'System prompt lacks role instructions');
  }

  logDebug(correlationId, 'info', 'System prompt analysis completed', {
    length: result.analysis.systemPrompt.length,
    mentionsTools: result.analysis.systemPrompt.mentionsTools,
    hasInstructions: result.analysis.systemPrompt.hasInstructions,
    toolReferences: result.analysis.systemPrompt.toolReferences
  });
}

/**
 * Analyze state machine and context validity
 */
function analyzeStateMachine(config: DebugConfig, result: DebugResult, correlationId: string): void {
  logDebug(correlationId, 'info', 'Starting state machine analysis', { currentState: config.state });
  
  result.analysis.stateMachine.currentState = config.state;
  result.analysis.stateMachine.expectedTransitions = getExpectedTransitions(config.state);
  
  // Check context validity
  const contextIssues = validateContext(config.context, config.state);
  result.analysis.stateMachine.contextValid = contextIssues.length === 0;
  result.analysis.stateMachine.missingContext = contextIssues;

  if (contextIssues.length > 0) {
    result.warnings.push(`⚠️ Context issues: ${contextIssues.join(', ')}`);
    result.suggestions.push('Ensure context is properly populated before AI call');
    logDebug(correlationId, 'warn', 'Context validation issues', { issues: contextIssues });
  }

  logDebug(correlationId, 'info', 'State machine analysis completed', {
    currentState: result.analysis.stateMachine.currentState,
    expectedTransitions: result.analysis.stateMachine.expectedTransitions,
    contextValid: result.analysis.stateMachine.contextValid,
    missingContext: result.analysis.stateMachine.missingContext
  });
}

/**
 * Analyze AI model configuration
 */
function analyzeModel(config: DebugConfig, result: DebugResult, correlationId: string): void {
  logDebug(correlationId, 'info', 'Starting model analysis', { model: config.model });
  
  result.analysis.model.configured = Boolean(config.model);
  result.analysis.model.modelName = config.model;
  result.analysis.model.supportsTools = config.model?.includes('llama') || config.model?.includes('gpt') || false;

  if (!result.analysis.model.configured) {
    result.criticalIssues.push('❌ CRITICAL: No AI model configured');
    result.fixes.push('Set AI_MODEL_CONFIG.model in environment');
    logDebug(correlationId, 'error', 'No AI model configured');
  }

  if (!result.analysis.model.supportsTools) {
    result.warnings.push('⚠️ Model may not support tool calling');
    result.suggestions.push('Consider using a model that supports function calling');
    logDebug(correlationId, 'warn', 'Model may not support tool calling', { model: config.model });
  }

  logDebug(correlationId, 'info', 'Model analysis completed', {
    configured: result.analysis.model.configured,
    modelName: result.analysis.model.modelName,
    supportsTools: result.analysis.model.supportsTools
  });
}

/**
 * Log debug summary with structured logging
 */
function logDebugSummary(result: DebugResult, correlationId: string, config: DebugConfig): void {
  const summary = {
    healthy: result.healthy,
    criticalIssues: result.criticalIssues.length,
    warnings: result.warnings.length,
    suggestions: result.suggestions.length,
    fixes: result.fixes.length
  };

  logDebug(correlationId, 'info', 'Debug analysis completed', summary);

  if (config.verbose) {
    logDebug(correlationId, 'info', 'Detailed analysis results', {
      tools: result.analysis.tools,
      systemPrompt: result.analysis.systemPrompt,
      stateMachine: result.analysis.stateMachine,
      model: result.analysis.model
    });
  }
}

/**
 * 🔍 Debug the AI tool loop and provide comprehensive diagnostics
 */
export function debugAiToolLoop(config: DebugConfig): DebugResult {
  const correlationId = generateCorrelationId();
  const result = initializeDebugResult();

  logDebug(correlationId, 'info', 'Starting AI Tool Loop Debug Analysis', {
    toolCount: config.tools.length,
    state: config.state,
    model: config.model,
    verbose: config.verbose
  });

  // Run all analysis functions
  analyzeTools(config, result, correlationId);
  analyzeSystemPrompt(config, result, correlationId);
  analyzeStateMachine(config, result, correlationId);
  analyzeModel(config, result, correlationId);

  // Determine overall health
  result.healthy = result.criticalIssues.length === 0;

  // Log summary
  logDebugSummary(result, correlationId, config);

  return result;
}

/**
 * 🔍 Quick debug function for common issues
 */
export function quickDebugAiToolLoop(
  tools: ToolDefinition[],
  systemPrompt: string,
  state: ConversationState,
  context: ConversationContext
): {
  healthy: boolean;
  issues: string[];
  fixes: string[];
} {
  const debugResult = debugAiToolLoop({
    tools,
    systemPrompt,
    state,
    context,
    verbose: false
  });

  return {
    healthy: debugResult.healthy,
    issues: [...debugResult.criticalIssues, ...debugResult.warnings],
    fixes: debugResult.fixes
  };
}

/**
 * 🔍 Validate conversation context for current state
 */
function validateContext(context: ConversationContext, state: ConversationState): string[] {
  const issues: string[] = [];

  // Check for required context based on state
  switch (state) {
    case ConversationState.SHOWING_CONTACT_FORM:
      if (!context.legalIssueType) {
        issues.push('missing legalIssueType');
      }
      if (!context.description) {
        issues.push('missing description');
      }
      break;
    
    case ConversationState.READY_TO_CREATE_MATTER:
      if (!context.legalIssueType) {
        issues.push('missing legalIssueType');
      }
      if (!context.description) {
        issues.push('missing description');
      }
      break;
    
    default:
      // No specific requirements for other states
      break;
  }

  return issues;
}

/**
 * 🔍 Get expected state transitions for current state
 */
function getExpectedTransitions(state: ConversationState): string[] {
  const transitions: Record<ConversationState, string[]> = {
    [ConversationState.INITIAL]: [ConversationState.GENERAL_INQUIRY, ConversationState.COLLECTING_LEGAL_ISSUE],
    [ConversationState.GENERAL_INQUIRY]: [],
    [ConversationState.COLLECTING_LEGAL_ISSUE]: [ConversationState.COLLECTING_DETAILS, ConversationState.GENERAL_INQUIRY],
    [ConversationState.COLLECTING_DETAILS]: [ConversationState.QUALIFYING_LEAD, ConversationState.SHOWING_CONTACT_FORM],
    [ConversationState.QUALIFYING_LEAD]: [ConversationState.SHOWING_CONTACT_FORM, ConversationState.READY_TO_CREATE_MATTER],
    [ConversationState.SHOWING_CONTACT_FORM]: [ConversationState.READY_TO_CREATE_MATTER],
    [ConversationState.READY_TO_CREATE_MATTER]: [ConversationState.MATTER_CREATED, ConversationState.MATTER_CREATION_FAILED],
    [ConversationState.MATTER_CREATED]: [],
    [ConversationState.MATTER_CREATION_FAILED]: [ConversationState.READY_TO_CREATE_MATTER],
    [ConversationState.GATHERING_INFORMATION]: [ConversationState.COLLECTING_DETAILS, ConversationState.QUALIFYING_LEAD]
  };

  return transitions[state] || [];
}

/**
 * 🔍 Log AI tool loop debug information
 */
export function logAiToolLoopDebug(
  aiResult: {
    tool_calls?: Array<{ name: string }>;
    response?: string;
    usage?: unknown;
  },
  tools: ToolDefinition[],
  systemPrompt: string,
  state: ConversationState,
  context: ConversationContext
): void {
  Logger.info('AI Tool Loop Debug', {
    correlationId: generateCorrelationId(),
    toolsAvailable: tools.map(t => t.name),
    systemPromptLength: systemPrompt.length,
    currentState: state,
    contextValid: Boolean(context.legalIssueType && context.description),
    aiResponseType: aiResult.tool_calls ? 'tool_calls' : 'text',
    toolCalls: aiResult.tool_calls?.map(tc => tc.name) || [],
    responsePreview: aiResult.response?.substring(0, 100) || null
  });
}

/**
 * 🔍 Validate tools array before AI call
 */
export function validateToolsBeforeCall(tools: ToolDefinition[]): {
  valid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!tools || tools.length === 0) {
    issues.push('No tools provided');
    suggestions.push('Ensure tools array is passed to AI call');
    return { valid: false, issues, suggestions };
  }

  const toolNames = tools.map(tool => tool.name);
  
  if (!toolNames.includes('show_contact_form')) {
    issues.push('show_contact_form tool missing');
    suggestions.push('Add show_contact_form tool to tools array');
  }

  // Check for duplicate tool names
  const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    issues.push(`Duplicate tool names: ${duplicates.join(', ')}`);
    suggestions.push('Remove duplicate tool definitions');
  }

  // Check for valid tool structure
  tools.forEach((tool, index) => {
    if (!tool.name) {
      issues.push(`Tool ${index} missing name`);
    }
    if (!tool.description) {
      issues.push(`Tool ${tool.name || index} missing description`);
    }
    if (!tool.parameters) {
      issues.push(`Tool ${tool.name || index} missing parameters`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    suggestions
  };
}
