import conversations from './conversations.json';

// Simple LLMJudge class for the test runner
class LLMJudge {
  private apiUrl: string;
  private teamId: string;

  constructor(apiUrl: string, teamId: string) {
    this.apiUrl = apiUrl;
    this.teamId = teamId;
  }

  async generateAssistantResponse(messages: any[], sessionId: string): Promise<{
    response: string;
    toolCalls: any[];
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
    let toolCalls: any[] = [];

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
            throw new Error(data.message || 'Unknown error');
          } else if (data.type === 'text') {
            assistantResponse += data.text || '';
          } else if (data.type === 'tool_call') {
            toolCalls.push({
              name: data.name,
              parameters: data.parameters
            });
          } else if (data.type === 'complete') {
            break;
          }
        } catch (parseError) {
          // Ignore parsing errors for individual chunks
          console.warn('Failed to parse SSE chunk:', line);
        }
      }
    }

    const responseTime = Date.now() - startTime;

    return {
      response: assistantResponse.trim(),
      toolCalls,
      responseTime
    };
  }

  async evaluateResponse(conversation: any, userMessage: string, assistantResponse: string, toolCalls: any[]): Promise<any> {
    const evaluationPrompt = `
You are an expert legal AI evaluator. Rate the following AI assistant response on a scale of 1-10 for each criterion:

CONVERSATION CONTEXT:
${conversation.scenario}

USER MESSAGE:
${userMessage}

ASSISTANT RESPONSE:
${assistantResponse}

TOOL CALLS MADE:
${JSON.stringify(toolCalls, null, 2)}

EVALUATION CRITERIA:
- empathy: How well does the response show understanding and care for the user's situation?
- accuracy: How accurate and factually correct is the information provided?
- completeness: How thoroughly does the response address the user's needs?
- relevance: How relevant is the response to the user's specific situation?
- professionalism: How professional and appropriate is the tone and approach?
- actionability: How actionable and clear are the next steps provided?
- legalAccuracy: How accurate is the legal information and advice given?
- conversationFlow: How natural and logical is the conversation flow?
- toolUsage: How appropriately and effectively are tools used?

Provide scores for each criterion and overall feedback.
`;

    const response = await fetch(`${this.apiUrl}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testCase: {
          testCaseId: conversation.id,
          scenario: conversation.scenario,
          expectedBehavior: ['Collect client information', 'Create matter appropriately'],
          criticalRequirements: ['No hallucinations', 'Accurate information collection'],
          minScore: 7.0
        },
        userMessage: userMessage || '',
        agentResponse: assistantResponse,
        toolCalls: toolCalls || [],
        prompt: evaluationPrompt
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Judge evaluation failed: ${result.error}`);
    }

    // The judge response is nested in result.data
    const data = result.data;
    if (!data || !data.success) {
      throw new Error(`Judge evaluation failed: ${data?.error || 'Invalid response structure'}`);
    }

    // Return scores plus feedback fields for reporting
    return {
      ...(data.scores || {}),
      feedback: data.feedback,
      criticalIssues: data.criticalIssues,
      suggestions: data.suggestions
    };
  }

  async runConversationTest(conversation: any): Promise<any> {
    const sessionId = `test-${conversation.id}-${Date.now()}`;
    const actualResponses: string[] = [];
    const actualToolCalls: any[] = [];
    let totalResponseTime = 0;

    // Run through each user message and generate assistant response
    for (let i = 0; i < conversation.messages.length; i++) {
      const message = conversation.messages[i];
      
      if (message.role === 'user') {
        // Build conversation history up to this point
        const conversationHistory = conversation.messages
          .slice(0, i)
          .map(m => ({
            role: m.role,
            content: m.content
          }));

        // Add the current user message
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
    const finalToolCalls = actualToolCalls.slice(-conversation.expectedToolCalls.length);

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

    return {
      conversationId: conversation.id,
      user: conversation.user,
      scenario: conversation.scenario,
      messages: conversation.messages,
      actualResponses,
      expectedToolCalls: conversation.expectedToolCalls,
      actualToolCalls: finalToolCalls,
      evaluation: {
        ...evaluation,
        averageScore
      },
      passed,
      responseTime: totalResponseTime
    };
  }
}

export async function runTestsAndGenerateReport(): Promise<string> {
  const apiUrl = process.env.TEST_API_URL || 'http://localhost:8787';
  const teamId = process.env.TEST_TEAM_ID || 'blawby-ai';
  
  const judge = new LLMJudge(apiUrl, teamId);
  const results = [];
  
  console.log('🧪 Running LLM Judge tests...');
  
  for (const conversation of conversations.conversations) {
    try {
      console.log(`\n📋 Testing conversation: ${conversation.scenario}`);
      const result = await judge.runConversationTest(conversation);
      results.push(result);
      console.log(`✅ ${conversation.scenario}: ${result.passed ? 'PASSED' : 'FAILED'} (Score: ${result.evaluation.averageScore.toFixed(2)})`);
    } catch (error) {
      console.error(`❌ Error testing ${conversation.scenario}:`, error);
      results.push({
        conversationId: conversation.id,
        user: conversation.user,
        scenario: conversation.scenario,
        messages: conversation.messages,
        actualResponses: [],
        expectedToolCalls: conversation.expectedToolCalls,
        actualToolCalls: [],
        evaluation: {
          scores: {},
          averageScore: 0,
          feedback: `Error: ${error}`,
          criticalIssues: [`Test failed: ${error}`],
          suggestions: []
        },
        passed: false,
        responseTime: 0
      });
    }
  }
  
  return generateHTMLReport(results);
}

function generateHTMLReport(results: any[]): string {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const averageScore = results.reduce((sum, r) => sum + r.evaluation.averageScore, 0) / totalTests;
  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .summary { padding: 30px; border-bottom: 1px solid #eee; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .results { padding: 30px; }
        .test-result { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
        .test-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #ddd; }
        .test-header h3 { margin: 0; }
        .test-content { padding: 20px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .badge.passed { background: #d4edda; color: #155724; }
        .badge.failed { background: #f8d7da; color: #721c24; }
        .scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0; }
        .score-item { background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: center; }
        .score-value { font-size: 1.2em; font-weight: bold; color: #333; }
        .conversation { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .message { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .message.user { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .message.assistant { background: #f3e5f5; border-left: 4px solid #9c27b0; }
        .tool-calls { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Agent Test Report</h1>
            <p>Comprehensive evaluation of AI agent performance and conversation quality</p>
        </div>
        
        <div class="summary">
            <h2>📊 Test Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Tests</h3>
                    <div class="value">${totalTests}</div>
                </div>
                <div class="summary-card">
                    <h3>Passed</h3>
                    <div class="value passed">${passedTests}</div>
                </div>
                <div class="summary-card">
                    <h3>Failed</h3>
                    <div class="value failed">${totalTests - passedTests}</div>
                </div>
                <div class="summary-card">
                    <h3>Success Rate</h3>
                    <div class="value">${((passedTests / totalTests) * 100).toFixed(1)}%</div>
                </div>
                <div class="summary-card">
                    <h3>Average Score</h3>
                    <div class="value">${averageScore.toFixed(2)}/10</div>
                </div>
                <div class="summary-card">
                    <h3>Avg Response Time</h3>
                    <div class="value">${averageResponseTime.toFixed(0)}ms</div>
                </div>
            </div>
        </div>
        
        <div class="results">
            <h2>📋 Detailed Results</h2>
            ${results.map(result => `
                <div class="test-result">
                    <div class="test-header">
                        <h3>${result.scenario}</h3>
                        <span class="badge ${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</span>
                        <span>Score: ${result.evaluation.averageScore.toFixed(2)}/10</span>
                        <span>Response Time: ${result.responseTime}ms</span>
                    </div>
                    <div class="test-content">
                        <div class="scores">
                            ${Object.entries(result.evaluation.scores || {}).map(([key, value]) => `
                                <div class="score-item">
                                    <div class="score-value">${value}</div>
                                    <div>${key}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${result.evaluation.feedback ? `
                            <h4>Feedback:</h4>
                            <p>${result.evaluation.feedback}</p>
                        ` : ''}
                        
                        ${result.evaluation.criticalIssues && result.evaluation.criticalIssues.length > 0 ? `
                            <h4>Critical Issues:</h4>
                            <ul>
                                ${result.evaluation.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
                            </ul>
                        ` : ''}
                        
                        ${result.evaluation.suggestions && result.evaluation.suggestions.length > 0 ? `
                            <h4>Suggestions:</h4>
                            <ul>
                                ${result.evaluation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                            </ul>
                        ` : ''}
                        
                        <h4>Conversation Flow:</h4>
                        <div class="conversation">
                            ${result.messages.map((message: any) => `
                                <div class="message ${message.role}">
                                    <strong>${message.role === 'user' ? '👤 User' : '🤖 Assistant'}:</strong>
                                    <div>${message.content}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${result.actualToolCalls && result.actualToolCalls.length > 0 ? `
                            <h4>Tool Calls:</h4>
                            <div class="tool-calls">
                                <pre>${JSON.stringify(result.actualToolCalls, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `;
}
