import fetch from 'node-fetch';
import type { ToolCall } from '../../worker/routes/judge';

interface JudgeEvaluation {
  empathy: number;
  accuracy: number;
  completeness: number;
  relevance: number;
  professionalism: number;
  actionability: number;
  legalAccuracy: number;
  conversationFlow: number;
  toolUsage: number;
  feedback: string;
  criticalIssues: string[];
  suggestions: string[];
  flags: Record<string, boolean>;
  conversationAnalysis?: any;
}

export class LLMJudge {
  private apiUrl: string;
  private teamId: string;

  constructor(apiUrl: string, teamId: string) {
    this.apiUrl = apiUrl;
    this.teamId = teamId;
  }

  async generateAssistantResponse(messages: any[], sessionId: string): Promise<{
    response: string;
    toolCalls: ToolCall[];
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    const response = await fetch(`${this.apiUrl}/api/agent/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        teamId: this.teamId,
        sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    // Parse the streaming response
    if (!response.body) {
      throw new Error('No response body available');
    }

    let assistantResponse = '';
    let toolCalls: ToolCall[] = [];
    let hasError = false;
    let errorMessage = '';

    // Handle the streaming response
    const chunks: string[] = [];
    
    // Collect all chunks
    for await (const chunk of response.body) {
      chunks.push(chunk.toString());
    }
    
    const fullResponse = chunks.join('');
    const lines = fullResponse.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'error') {
            hasError = true;
            errorMessage = data.message || 'Unknown error';
            break;
          } else if (data.type === 'text') {
            assistantResponse += data.text || '';
          } else if (data.type === 'tool_call') {
            // Schema-agnostic tool call parsing
            const toolName = data.name || data.tool?.name || data.function?.name || data.toolName || data.tool_name;
            let parameters = data.parameters || data.arguments || data.args;
            
            // Handle stringified parameters
            if (typeof parameters === 'string') {
              try {
                parameters = JSON.parse(parameters);
              } catch (parseError) {
                // Fall back to original string if parsing fails
                console.warn('Failed to parse tool call parameters as JSON:', parameters);
              }
            }
            
            if (toolName) {
              toolCalls.push({
                name: toolName,
                parameters: parameters || {}
              });
            }
          } else if (data.type === 'complete') {
            // Stream completed successfully
            break;
          } else if (data.type === 'connected') {
            // Initial connection event, ignore
            continue;
          }
        } catch (parseError) {
          // Ignore parsing errors for individual chunks
          console.warn('Failed to parse SSE chunk:', line);
        }
      }
    }

    const responseTime = Date.now() - startTime;

    if (hasError) {
      throw new Error(`Streaming API call failed: ${errorMessage}`);
    }

    return {
      response: assistantResponse.trim(),
      toolCalls,
      responseTime
    };
  }

  async evaluateResponse(
    testCase: any,
    userMessage: string,
    assistantResponse: string,
    toolCalls: ToolCall[]
  ): Promise<JudgeEvaluation> {
    const evaluationPrompt = `
TEST CASE: ${testCase.scenario}
USER: ${testCase.user}

CONVERSATION CONTEXT:
${testCase.messages.map(m => `${m.role}: ${m.content}`).join('\n')}

CURRENT USER MESSAGE: ${userMessage}
ASSISTANT RESPONSE: ${assistantResponse}
TOOL CALLS: ${JSON.stringify(toolCalls, null, 2)}

EVALUATION CRITERIA (Rate each 1-10):
1. Empathy: Shows understanding and compassion for client situation
2. Accuracy: Provides correct legal information and guidance
3. Completeness: Addresses all aspects of the query comprehensively
4. Relevance: Response is appropriate to the specific scenario
5. Professionalism: Maintains professional tone and conduct
6. Actionability: Provides clear next steps and guidance
7. Legal Accuracy: Demonstrates correct legal knowledge
8. Conversation Flow: Natural and helpful conversation progression
9. Tool Usage: Appropriate use of available tools and escalation

RESPONSE FORMAT (JSON only):
{
  "empathy": <score 1-10>,
  "accuracy": <score 1-10>,
  "completeness": <score 1-10>,
  "relevance": <score 1-10>,
  "professionalism": <score 1-10>,
  "actionability": <score 1-10>,
  "legalAccuracy": <score 1-10>,
  "conversationFlow": <score 1-10>,
  "toolUsage": <score 1-10>,
  "feedback": "<brief feedback on performance>",
  "criticalIssues": ["<list any critical issues>"],
  "suggestions": ["<list improvement suggestions>"]
}
`;

    // Format the testCase object to match the expected structure
    const formattedTestCase = {
      testCaseId: testCase.id,
      scenario: testCase.scenario,
      expectedBehavior: [
        'Collect client information efficiently and naturally',
        'Create matter with appropriate parameters',
        'Provide clear next steps and guidance',
        'Maintain professional and empathetic tone throughout'
      ],
      criticalRequirements: [
        'Must collect name, phone, email, location, and matter description',
        'Must call create_matter tool with correct parameters',
        'Must provide summary and next steps after matter creation',
        'Must NOT mention costs or pricing unless specifically asked',
        'Must NOT assume legal issue types without user confirmation'
      ],
      minScore: 7.0
    };

    const response = await fetch(`${this.apiUrl}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testCase: formattedTestCase,
        userMessage,
        agentResponse: assistantResponse,
        toolCalls,
        prompt: evaluationPrompt
      })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMessage += ` - ${JSON.stringify(errorBody)}`;
      } catch (parseError) {
        try {
          const errorText = await response.text();
          errorMessage += ` - ${errorText}`;
        } catch (textError) {
          // If we can't parse the error body, just use the status
        }
      }
      throw new Error(`Judge evaluation failed: ${errorMessage}`);
    }

    const result = await response.json() as any;
    
    if (!result.success) {
      const errorDetails = result.error || result.message || 'Unknown error';
      throw new Error(`Judge evaluation failed: ${errorDetails}`);
    }

    // Normalize the response to a stable shape
    const data = result.data || result;
    const normalizedResponse = {
      scores: data.scores || data,
      feedback: data.feedback || '',
      flags: data.flags || {},
      averageScore: data.averageScore || 0,
      conversationAnalysis: data.conversationAnalysis || null
    };

    console.log('Normalized judge response:', JSON.stringify(normalizedResponse, null, 2));

    // Return scores plus feedback fields for reporting
    return {
      ...(normalizedResponse.scores || {}),
      feedback: normalizedResponse.feedback,
      criticalIssues: data.criticalIssues || [],
      suggestions: data.suggestions || [],
      flags: normalizedResponse.flags,
      conversationAnalysis: normalizedResponse.conversationAnalysis
    };
  }

  async runConversationTest(conversation: any): Promise<any> {
    const sessionId = `test-${conversation.id}-${Date.now()}`;
    const actualResponses: string[] = [];
    const actualToolCalls: ToolCall[] = [];
    let totalResponseTime = 0;
    const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

    // Run through each user message and generate assistant response
    for (let i = 0; i < conversation.messages.length; i++) {
      const message = conversation.messages[i];
      
      if (message.role === 'user') {
        // Add the current user message to running conversation history
        conversationHistory.push({
          role: 'user',
          content: message.content
        });

        // Generate assistant response using actual API
        const { response, toolCalls, responseTime } = await this.generateAssistantResponse(
          conversationHistory,
          sessionId
        );

        actualResponses.push(response);
        actualToolCalls.push(...toolCalls);
        totalResponseTime += responseTime;

        // Add the generated response to conversation history for next iteration
        conversationHistory.push({
          role: 'assistant',
          content: response
        });
      }
    }

    // Evaluate the final response
    const lastUserMessage = conversation.messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';
    
    const lastAssistantResponse = actualResponses[actualResponses.length - 1] || '';
    const finalToolCalls = conversation.expectedToolCalls.length === 0 
      ? [] 
      : actualToolCalls.slice(-conversation.expectedToolCalls.length);

    const evaluation = await this.evaluateResponse(
      conversation,
      lastUserMessage,
      lastAssistantResponse,
      finalToolCalls
    );

    // Calculate average score from numeric values only
    const numericScores = Object.values(evaluation).filter((value): value is number => typeof value === 'number');
    const averageScore = numericScores.length > 0 ? numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length : 0;
    const passed = averageScore >= 7.0; // Minimum passing score

    // Extract only numeric score values for the scores field
    const scoresOnly = Object.fromEntries(
      Object.entries(evaluation).filter(([_, value]) => typeof value === 'number')
    );

    return {
      conversationId: conversation.id,
      user: conversation.user,
      scenario: conversation.scenario,
      messages: conversation.messages,
      actualResponses,
      expectedToolCalls: conversation.expectedToolCalls,
      actualToolCalls: finalToolCalls,
      evaluation: {
        scores: scoresOnly,
        averageScore,
        feedback: evaluation.feedback,
        criticalIssues: evaluation.criticalIssues,
        suggestions: evaluation.suggestions,
        flags: evaluation.flags,
        conversationAnalysis: evaluation.conversationAnalysis
      },
      passed,
      responseTime: totalResponseTime
    };
  }
}
