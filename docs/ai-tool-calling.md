# 🤖 AI Tool Calling Development Guide

This guide covers the development tools and best practices for working with AI tool calling in the legal intake chatbot.

## 🧪 **Development Tools**

### **1. AI Tool Loop Test (`testToolLoop.ts`)**

A comprehensive test utility that validates the complete AI tool calling flow.

#### **Features:**
- ✅ Simulates tool calls from fake prompts
- ✅ Logs what would be emitted
- ✅ Validates form shows up
- ✅ Tests complete AI → tool → SSE → frontend flow
- ✅ Supports both simulation and real AI calls

#### **Usage:**
```typescript
import { testToolLoop, quickToolLoopTest } from '../utils/testToolLoop';

// Quick test
const success = await quickToolLoopTest(env);

// Full test with custom config
const result = await testToolLoop({
  model: '@cf/meta/llama-3.1-8b-instruct',
  tools: availableTools,
  systemPrompt: systemPrompt,
  context: context,
  state: state,
  simulateOnly: false
}, env);
```

#### **Test Results:**
```typescript
interface ToolLoopTestResult {
  success: boolean;
  steps: {
    toolAvailability: { passed: boolean; message: string; toolsFound: string[] };
    systemPrompt: { passed: boolean; message: string; promptLength: number; mentionsTools: boolean };
    aiToolCall: { passed: boolean; message: string; expectedToolCall?: string; actualToolCall?: string };
    sseEvent: { passed: boolean; message: string; eventType?: string; eventData?: any };
    frontendForm: { passed: boolean; message: string; formFields?: string[]; requiredFields?: string[] };
  };
  summary: { totalSteps: number; passedSteps: number; failedSteps: number; duration: number };
  errors: string[];
}
```

### **2. AI Tool Loop Debug (`debugAiToolLoop.ts`)**

A comprehensive debugging wrapper that validates system prompts, logs missing tool issues, and suggests fixes.

#### **Features:**
- ✅ Validates system prompt structure
- ✅ Logs missing tool issues
- ✅ Suggests fixes for broken tools or context
- ✅ Provides detailed diagnostics
- ✅ Analyzes state machine logic

#### **Usage:**
```typescript
import { debugAiToolLoop, quickDebugAiToolLoop } from '../utils/debugAiToolLoop';

// Quick debug
const { healthy, issues, fixes } = quickDebugAiToolLoop(
  tools, systemPrompt, state, context
);

// Full debug with detailed analysis
const result = debugAiToolLoop({
  tools: availableTools,
  systemPrompt: systemPrompt,
  state: state,
  context: context,
  verbose: true
});
```

#### **Debug Results:**
```typescript
interface DebugResult {
  healthy: boolean;
  criticalIssues: string[];
  warnings: string[];
  suggestions: string[];
  analysis: {
    tools: { available: string[]; missing: string[]; expected: string[] };
    systemPrompt: { length: number; mentionsTools: boolean; toolReferences: string[]; hasInstructions: boolean };
    stateMachine: { currentState: string; expectedTransitions: string[]; contextValid: boolean; missingContext: string[] };
    model: { configured: boolean; supportsTools: boolean; modelName?: string };
  };
  fixes: string[];
}
```

## 🚀 **Quick Start**

### **1. Run Tests**

```bash
# Quick test (simulation only)
npm run test:ai-tools:quick

# Full test suite
npm run test:ai-tools

# Verbose output
npm run test:ai-tools:verbose
```

### **2. Debug Issues**

```typescript
// In your AI agent code
import { debugAiToolLoop, logAiToolLoopDebug } from '../utils/debugAiToolLoop';

// Before AI call
const debugResult = debugAiToolLoop({
  tools: availableTools,
  systemPrompt: systemPrompt,
  state: state,
  context: context
});

if (!debugResult.healthy) {
  console.error('🚨 AI Tool Loop Issues:', debugResult.criticalIssues);
  console.log('🔧 Suggested Fixes:', debugResult.fixes);
}

// After AI call
logAiToolLoopDebug(aiResult, availableTools, systemPrompt, state, context);
```

### **3. Validate Tools**

```typescript
import { validateToolsBeforeCall } from '../utils/debugAiToolLoop';

// Before calling AI
const validation = validateToolsBeforeCall(availableTools);
if (!validation.valid) {
  console.error('❌ Tool validation failed:', validation.issues);
  console.log('🔧 Suggestions:', validation.suggestions);
}
```

## 🎯 **Best Practices**

### **1. Always Use Health Checks**

```typescript
// Before any AI call
const healthCheck = validateAIToolLoop(
  availableTools,
  systemPrompt,
  state,
  context
);

if (!healthCheck.isValid) {
  Logger.error('🚨 AI Tool Loop Health Check FAILED:', healthCheck.issues);
  // Handle the error appropriately
}
```

### **2. Log Everything**

```typescript
// Essential debugging logs
console.log('[SYSTEM PROMPT]', systemPrompt);
console.log('[TOOLS PASSED]', availableTools.map(t => t.name));
console.log('[AI RAW RESULT]', JSON.stringify(aiResult, null, 2));
```

### **3. Test Tool Scenarios**

```typescript
// Test all tool scenarios
const scenarios = await testToolScenarios(env);
console.log('Tool Scenarios:', {
  contactForm: scenarios.contactForm,
  matterCreation: scenarios.matterCreation,
  lawyerReview: scenarios.lawyerReview
});
```

## 🚨 **Common Issues & Solutions**

### **Issue: AI Not Calling Tools**

**Symptoms:**
- AI responds with text instead of calling tools
- No tool_calls in AI response
- "No tool call detected" in logs

**Solutions:**
1. ✅ Check if `tools` parameter is passed to `env.AI.run()`
2. ✅ Verify `show_contact_form` is in tools array
3. ✅ Ensure system prompt mentions the tool
4. ✅ Check if state machine is in correct state

### **Issue: Tool Call Detection Fails**

**Symptoms:**
- AI calls tool but system doesn't detect it
- "parseResult is not defined" errors
- Tool calls not being processed

**Solutions:**
1. ✅ Check for `aiResult.tool_calls` before checking `aiResult.response`
2. ✅ Ensure proper variable scoping in tool call paths
3. ✅ Remove old tool call parsing logic

### **Issue: System Prompt Generation Fails**

**Symptoms:**
- "sanitizeEmail is not defined" errors
- "Failed to generate system prompt" errors
- Context building crashes

**Solutions:**
1. ✅ Remove references to deleted functions (`sanitizeEmail`, `sanitizePhone`)
2. ✅ Clean up old context flags (`hasEmail`, `hasPhone`)
3. ✅ Ensure `buildContextSection` only handles legal info

## 📊 **Monitoring & Metrics**

### **Key Metrics to Track:**

1. **Tool Call Success Rate**: Percentage of successful tool calls
2. **System Prompt Generation Time**: Time to build system prompt
3. **AI Response Time**: Time for AI to respond
4. **Tool Execution Time**: Time to execute tool handlers
5. **SSE Event Emission**: Time to emit events to frontend

### **Health Check Indicators:**

- ✅ All tools available in tools array
- ✅ System prompt mentions required tools
- ✅ Context is valid for current state
- ✅ AI model supports tool calling
- ✅ No critical issues in debug analysis

## 🔧 **Development Workflow**

### **1. Before Making Changes:**
```bash
# Run health check
npm run test:ai-tools:quick
```

### **2. During Development:**
```typescript
// Add debug logging
const debugResult = debugAiToolLoop({ tools, systemPrompt, state, context });
if (!debugResult.healthy) {
  console.error('Issues found:', debugResult.criticalIssues);
}
```

### **3. After Making Changes:**
```bash
# Run full test suite
npm run test:ai-tools

# Test with real AI calls (requires wrangler dev)
npm run test:ai-tools:verbose
```

### **4. Before Deployment:**
```bash
# Ensure all tests pass
npm run test:ai-tools
npm test
```

## 🎉 **Success Criteria**

Your AI tool calling system is working correctly when:

- ✅ All health checks pass
- ✅ AI successfully calls `show_contact_form` when appropriate
- ✅ Tool calls are properly detected and processed
- ✅ SSE events are emitted to frontend
- ✅ Contact form renders with correct fields
- ✅ Form submissions are processed correctly
- ✅ No critical issues in debug analysis

## 📚 **Additional Resources**

- [AI Tool Calling Best Practices](../README.md#-ai-tool-calling-best-practices)
- [Main README](../README.md)
- [Test Documentation](../tests/README.md)
