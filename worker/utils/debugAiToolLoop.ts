/**
 * 🔍 AI Tool Loop Debug Utility
 * 
 * A comprehensive debugging wrapper that:
 * 1. Validates the system prompt
 * 2. Logs missing tool issues
 * 3. Suggests fixes if tools or context are broken
 * 4. Provides detailed diagnostics for AI tool calling issues
 */

import { ToolDefinition } from '../types/toolTypes';
import { ConversationContext, ConversationState } from '../agents/legal-intake/conversationStateMachine';

export interface DebugConfig {
  /** Available tools to validate */
  tools: ToolDefinition<any>[];
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
 * 🔍 Debug the AI tool loop and provide comprehensive diagnostics
 */
export function debugAiToolLoop(config: DebugConfig): DebugResult {
  const result: DebugResult = {
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

  console.log('🔍 Starting AI Tool Loop Debug Analysis...');
  console.log('📋 Debug Config:', {
    toolCount: config.tools.length,
    state: config.state,
    model: config.model,
    verbose: config.verbose
  });

  // Analyze tools
  result.analysis.tools.available = config.tools.map(tool => tool.name);
  result.analysis.tools.expected = ['show_contact_form', 'create_matter', 'request_lawyer_review'];
  result.analysis.tools.missing = result.analysis.tools.expected.filter(
    expected => !result.analysis.tools.available.includes(expected)
  );

  // Check for critical tool issues
  if (result.analysis.tools.missing.includes('show_contact_form')) {
    result.criticalIssues.push('❌ CRITICAL: show_contact_form tool is missing');
    result.fixes.push('Add show_contact_form tool to availableTools array');
  }

  if (result.analysis.tools.available.length === 0) {
    result.criticalIssues.push('❌ CRITICAL: No tools available to AI');
    result.fixes.push('Ensure tools array is passed to env.AI.run() call');
  }

  // Analyze system prompt
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
  }

  if (!result.analysis.systemPrompt.mentionsTools) {
    result.criticalIssues.push('❌ CRITICAL: System prompt does not mention show_contact_form');
    result.fixes.push('Add show_contact_form instructions to system prompt');
  }

  if (!result.analysis.systemPrompt.hasInstructions) {
    result.warnings.push('⚠️ System prompt lacks clear role instructions');
    result.suggestions.push('Add clear "You are a..." instructions to system prompt');
  }

  // Analyze state machine
  result.analysis.stateMachine.currentState = config.state;
  result.analysis.stateMachine.expectedTransitions = getExpectedTransitions(config.state);
  
  // Check context validity
  const contextIssues = validateContext(config.context, config.state);
  result.analysis.stateMachine.contextValid = contextIssues.length === 0;
  result.analysis.stateMachine.missingContext = contextIssues;

  if (contextIssues.length > 0) {
    result.warnings.push(`⚠️ Context issues: ${contextIssues.join(', ')}`);
    result.suggestions.push('Ensure context is properly populated before AI call');
  }

  // Analyze model configuration
  result.analysis.model.configured = Boolean(config.model);
  result.analysis.model.modelName = config.model;
  result.analysis.model.supportsTools = config.model?.includes('llama') || config.model?.includes('gpt') || false;

  if (!result.analysis.model.configured) {
    result.criticalIssues.push('❌ CRITICAL: No AI model configured');
    result.fixes.push('Set AI_MODEL_CONFIG.model in environment');
  }

  if (!result.analysis.model.supportsTools) {
    result.warnings.push('⚠️ Model may not support tool calling');
    result.suggestions.push('Consider using a model that supports function calling');
  }

  // Determine overall health
  result.healthy = result.criticalIssues.length === 0;

  // Generate detailed output
  if (config.verbose) {
    console.log('🔍 Detailed Analysis Results:');
    console.log('  Tools:', result.analysis.tools);
    console.log('  System Prompt:', result.analysis.systemPrompt);
    console.log('  State Machine:', result.analysis.stateMachine);
    console.log('  Model:', result.analysis.model);
  }

  // Log summary
  console.log('🎯 Debug Summary:', {
    healthy: result.healthy,
    criticalIssues: result.criticalIssues.length,
    warnings: result.warnings.length,
    suggestions: result.suggestions.length,
    fixes: result.fixes.length
  });

  return result;
}

/**
 * 🔍 Quick debug function for common issues
 */
export function quickDebugAiToolLoop(
  tools: ToolDefinition<any>[],
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
    case 'SHOWING_CONTACT_FORM':
      if (!context.legalIssueType) {
        issues.push('missing legalIssueType');
      }
      if (!context.description) {
        issues.push('missing description');
      }
      break;
    
    case 'READY_TO_CREATE_MATTER':
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
    'COLLECTING_INFO': ['SHOWING_CONTACT_FORM', 'READY_TO_CREATE_MATTER'],
    'SHOWING_CONTACT_FORM': ['READY_TO_CREATE_MATTER'],
    'READY_TO_CREATE_MATTER': ['MATTER_CREATED'],
    'MATTER_CREATED': [],
    'LAWYER_REVIEW': ['MATTER_CREATED'],
    'PAYMENT_REQUIRED': ['MATTER_CREATED'],
    'GENERAL_INQUIRY': []
  };

  return transitions[state] || [];
}

/**
 * 🔍 Log AI tool loop debug information
 */
export function logAiToolLoopDebug(
  aiResult: any,
  tools: ToolDefinition<any>[],
  systemPrompt: string,
  state: ConversationState,
  context: ConversationContext
): void {
  console.log('🔍 AI Tool Loop Debug:');
  console.log('  Tools available:', tools.map(t => t.name));
  console.log('  System prompt length:', systemPrompt.length);
  console.log('  Current state:', state);
  console.log('  Context valid:', Boolean(context.legalIssueType && context.description));
  console.log('  AI response type:', aiResult.tool_calls ? 'tool_calls' : 'text');
  console.log('  Tool calls:', aiResult.tool_calls?.map((tc: any) => tc.name) || 'none');
  console.log('  Response text:', aiResult.response?.substring(0, 100) || 'null');
  console.log('  Usage:', aiResult.usage || 'not available');
}

/**
 * 🔍 Validate tools array before AI call
 */
export function validateToolsBeforeCall(tools: ToolDefinition<any>[]): {
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
