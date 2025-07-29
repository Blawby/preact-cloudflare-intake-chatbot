# Prompt Chaining & Routing Guide

## 🎯 **Overview**

This guide implements **prompt chaining** and **routing** patterns from the [Cloudflare Agents Anthropic Patterns guide](https://github.com/cloudflare/agents/tree/main/guides/anthropic-patterns) to replace our monolithic approach with modular, chainable prompts.

## 📊 **Current vs. Proposed Architecture**

### **Current (Monolithic)**
```
User Message → Single Complex Agent → All Logic in One Place
```

**Problems:**
- 400+ lines of complex logic in one file
- Difficult to test individual components
- Hard to modify specific behaviors
- No separation of concerns

### **Proposed (Prompt Chaining)**
```
User Message → Router Agent → Intent Classifier → Workflow-Specific Chain → Action Decider
```

**Benefits:**
- Modular, testable components
- Clear separation of concerns
- Easy to modify individual steps
- Reusable prompt chains

## 🔗 **Prompt Chain Architecture**

### **1. Router Agent**
**Purpose**: Determine the appropriate workflow
**Input**: User message
**Output**: Workflow type (GENERAL_INQUIRY, MATTER_CREATION, SCHEDULING, etc.)

```typescript
export const routerAgent = new Agent({
  name: "legal-router-agent",
  instructions: `You are a legal intake router. Analyze user messages and determine the appropriate workflow.`,
  tools: [{
    name: "route_to_workflow",
    parameters: {
      workflow: "GENERAL_INQUIRY" | "MATTER_CREATION" | "SCHEDULING" | "CONTACT_FORM" | "URGENT_MATTER",
      confidence: "number",
      reasoning: "string"
    }
  }]
});
```

### **2. Intent Classifier**
**Purpose**: Extract key information from user message
**Input**: User message
**Output**: Matter type, urgency, complexity, intent

```typescript
export const intentClassifier = new Agent({
  name: "intent-classifier",
  instructions: `Classify the user's intent and extract key information.`,
  tools: [{
    name: "classify_intent",
    parameters: {
      matter_type: "string",
      urgency: "low" | "medium" | "high" | "urgent",
      complexity: "number (1-10)",
      intent: "information" | "consultation" | "matter_creation" | "scheduling"
    }
  }]
});
```

### **3. Information Gatherer**
**Purpose**: Collect and validate client information
**Input**: User message + conversation context
**Output**: Validated client information

```typescript
export const infoGatherer = new Agent({
  name: "info-gatherer",
  instructions: `Collect essential client information systematically.`,
  tools: [{
    name: "collect_info",
    parameters: {
      full_name: "string",
      email: "string",
      phone: "string",
      matter_description: "string",
      opposing_party: "string"
    }
  }]
});
```

### **4. Quality Assessor**
**Purpose**: Assess the quality of collected information
**Input**: Collected information
**Output**: Quality scores and recommendations

```typescript
export const qualityAssessor = new Agent({
  name: "quality-assessor",
  instructions: `Assess the quality and completeness of legal intake information.`,
  tools: [{
    name: "assess_quality",
    parameters: {
      quality_score: "number (0-100)",
      completeness_score: "number (0-100)",
      requires_human_review: "boolean",
      recommendations: "string[]"
    }
  }]
});
```

### **5. Action Decider**
**Purpose**: Decide on the appropriate action
**Input**: Quality assessment + intent classification
**Output**: Action to take (approval, scheduling, etc.)

```typescript
export const actionDecider = new Agent({
  name: "action-decider",
  instructions: `Decide on the appropriate action based on collected information.`,
  tools: [{
    name: "decide_action",
    parameters: {
      action: "request_lawyer_approval" | "schedule_consultation" | "send_information_packet" | "request_more_info",
      priority: "low" | "medium" | "high" | "urgent",
      reasoning: "string"
    }
  }]
});
```

## 🔄 **Prompt Chain Orchestrator**

The `PromptChainOrchestrator` class manages the flow between different agents:

```typescript
export class PromptChainOrchestrator {
  async processMessage(message: string, teamId: string, sessionId: string) {
    // Step 1: Route to appropriate workflow
    const routingResult = await routerAgent.run({
      messages: [{ role: 'user', content: message }]
    });

    // Step 2: Classify intent
    const intentResult = await intentClassifier.run({
      messages: [{ role: 'user', content: message }]
    });

    // Step 3: Execute workflow-specific chain
    switch (workflow) {
      case 'MATTER_CREATION':
        return await this.executeMatterCreationChain(message, intentResult, teamId, sessionId);
      case 'SCHEDULING':
        return await this.executeSchedulingChain(message, intentResult, teamId, sessionId);
      // ... other workflows
    }
  }
}
```

## 🛠️ **Workflow-Specific Chains**

### **Matter Creation Chain**
```typescript
private async executeMatterCreationChain(message: string, intentResult: any, teamId: string, sessionId: string) {
  // Step 1: Gather information
  const infoResult = await infoGatherer.run({
    messages: [{ role: 'user', content: message }]
  });

  // Step 2: Assess quality
  const qualityResult = await qualityAssessor.run({
    messages: [
      { role: 'user', content: message },
      { role: 'assistant', content: `Collected info: ${JSON.stringify(infoResult.tools?.[0]?.parameters)}` }
    ]
  });

  // Step 3: Decide action
  const actionResult = await actionDecider.run({
    messages: [
      { role: 'user', content: message },
      { role: 'assistant', content: `Quality assessment: ${JSON.stringify(qualityResult.tools?.[0]?.parameters)}` }
    ]
  });

  return {
    workflow: 'MATTER_CREATION',
    response: this.generateMatterCreationResponse(infoResult, qualityResult, actionResult),
    actions: actionResult.actions || [],
    metadata: {
      intent: intentResult.tools?.[0]?.parameters,
      info: infoResult.tools?.[0]?.parameters,
      quality: qualityResult.tools?.[0]?.parameters,
      action: actionResult.tools?.[0]?.parameters
    }
  };
}
```

### **Scheduling Chain**
```typescript
private async executeSchedulingChain(message: string, intentResult: any, teamId: string, sessionId: string) {
  return {
    workflow: 'SCHEDULING',
    response: "I'd be happy to help you schedule a consultation. What day would work best for you?",
    actions: [{ name: 'schedule_consultation', parameters: { client_message: message } }]
  };
}
```

### **Urgent Matter Chain**
```typescript
private async executeUrgentMatterChain(message: string, intentResult: any, teamId: string, sessionId: string) {
  return {
    workflow: 'URGENT_MATTER',
    response: "I understand this is urgent. I'm routing you to a lawyer immediately.",
    actions: [
      { name: 'request_lawyer_approval', parameters: { urgency: 'urgent', client_message: message } },
      { name: 'send_urgent_notification', parameters: { teamId, sessionId } }
    ]
  };
}
```

## 🧪 **Testing Strategy**

### **Unit Tests for Each Agent**
```typescript
describe('Router Agent', () => {
  it('should route matter creation requests correctly', async () => {
    const result = await routerAgent.run({
      messages: [{ role: 'user', content: 'I need help with a divorce' }]
    });
    expect(result.tools[0].parameters.workflow).toBe('MATTER_CREATION');
  });
});

describe('Intent Classifier', () => {
  it('should classify urgency correctly', async () => {
    const result = await intentClassifier.run({
      messages: [{ role: 'user', content: 'This is urgent, I need immediate help' }]
    });
    expect(result.tools[0].parameters.urgency).toBe('urgent');
  });
});
```

### **Integration Tests for Chains**
```typescript
describe('Matter Creation Chain', () => {
  it('should process complete matter creation flow', async () => {
    const orchestrator = new PromptChainOrchestrator(env);
    const result = await orchestrator.processMessage(
      'I need help with a custody dispute',
      'test-team',
      'test-session'
    );
    expect(result.workflow).toBe('MATTER_CREATION');
    expect(result.actions).toHaveLength(1);
  });
});
```

## 📈 **Benefits of Prompt Chaining**

### **1. Modularity**
- Each agent has a single responsibility
- Easy to test individual components
- Simple to modify specific behaviors

### **2. Reusability**
- Agents can be reused across different workflows
- Common patterns (validation, classification) are shared
- Consistent behavior across the application

### **3. Maintainability**
- Clear separation of concerns
- Easy to debug specific issues
- Simple to add new workflows

### **4. Scalability**
- New agents can be added without affecting existing ones
- Workflows can be composed from existing agents
- Easy to A/B test different approaches

## 🔧 **Configuration**

### **Agent Configuration**
```typescript
const agentConfig = {
  router: {
    confidence_threshold: 0.8,
    fallback_workflow: 'GENERAL_INQUIRY'
  },
  quality: {
    min_completeness_score: 70,
    min_quality_score: 60,
    human_review_threshold: 7
  },
  urgency: {
    urgent_keywords: ['immediate', 'emergency', 'urgent', 'asap'],
    high_priority_keywords: ['important', 'serious', 'critical']
  }
};
```

### **Workflow Configuration**
```typescript
const workflowConfig = {
  MATTER_CREATION: {
    required_fields: ['full_name', 'email', 'matter_description'],
    optional_fields: ['phone', 'opposing_party'],
    quality_threshold: 70
  },
  SCHEDULING: {
    required_fields: ['email', 'preferred_date'],
    optional_fields: ['phone', 'notes']
  },
  URGENT_MATTER: {
    bypass_quality_check: true,
    immediate_human_routing: true
  }
};
```

## 🚀 **Deployment Strategy**

### **Phase 1: Parallel Deployment**
1. Deploy prompt chains alongside existing API
2. Route 10% of traffic to new system
3. Monitor performance and accuracy

### **Phase 2: Gradual Migration**
1. Increase traffic to prompt chains
2. Compare results with existing system
3. Optimize based on feedback

### **Phase 3: Full Migration**
1. Route 100% of traffic to prompt chains
2. Deprecate old monolithic approach
3. Remove legacy code

## 📊 **Monitoring & Analytics**

### **Chain Performance Metrics**
- Response time per agent
- Success rate per workflow
- Quality scores distribution
- Human review rates

### **Business Metrics**
- Matter creation completion rates
- Scheduling success rates
- Client satisfaction scores
- Lawyer response times

## 🔄 **Migration from Monolithic Approach**

### **Step 1: Extract Router Logic**
```typescript
// Before: All logic in one place
if (message.includes('schedule') || message.includes('appointment')) {
  // 50 lines of scheduling logic
} else if (message.includes('matter') || message.includes('case')) {
  // 200 lines of matter creation logic
}

// After: Router agent
const workflow = await routerAgent.run({ messages: [{ role: 'user', content: message }] });
```

### **Step 2: Extract Intent Classification**
```typescript
// Before: Manual intent detection
const urgency = message.toLowerCase().includes('urgent') ? 'high' : 'normal';

// After: Intent classifier
const intent = await intentClassifier.run({ messages: [{ role: 'user', content: message }] });
```

### **Step 3: Extract Information Gathering**
```typescript
// Before: Complex slot-filling logic
const slots = ['full_name', 'email', 'phone', 'matter_details'];
// 100+ lines of slot management

// After: Information gatherer
const info = await infoGatherer.run({ messages: [{ role: 'user', content: message }] });
```

## 📞 **Support & Resources**

- [Cloudflare Agents Documentation](https://github.com/cloudflare/agents)
- [Anthropic Patterns Guide](https://github.com/cloudflare/agents/tree/main/guides/anthropic-patterns)
- [Human-in-the-Loop Guide](https://github.com/cloudflare/agents/tree/main/guides/human-in-the-loop)

---

*This prompt chaining approach provides a much more maintainable and scalable architecture compared to our previous monolithic approach.* 