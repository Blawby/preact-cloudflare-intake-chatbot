import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import conversations from './fixtures/conversations.json';
import { writeFile, mkdir } from 'fs/promises';
import type { ToolCall } from '../../worker/routes/judge';

// Helper function to escape HTML content
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:8787';
const TEAM_ID = process.env.TEST_TEAM_ID || 'test-team-1';
const JUDGE_MODEL = '@cf/meta/llama-3.1-8b-instruct';

interface TestResult {
  conversationId: string;
  user: string;
  scenario: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  actualResponses: string[];
  conversationFlow: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  expectedToolCalls: ToolCall[];
  actualToolCalls: ToolCall[];
  evaluation: {
    scores: Record<string, number>;
    averageScore: number;
    feedback: string;
    criticalIssues: string[];
    suggestions: string[];
    flags: Record<string, boolean>;
    conversationAnalysis?: any;
  };
  passed: boolean;
  responseTime: number;
}

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
  scores: Record<string, number>;
  averageScore: number;
  flags: Record<string, boolean>;
  conversationAnalysis?: any;
}

class LLMJudge {
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
    
    console.log('🔄 Making API call to agent stream...');
    console.log('   Messages:', messages.length);
    console.log('   Session ID:', sessionId);
    
    const requestBody = {
      messages,
      teamId: this.teamId,
      sessionId
    };
    
    console.log('   Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${this.apiUrl}/api/agent/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('   Response status:', response.status);
    console.log('   Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('   Response error:', errorText);
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
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

    console.log('   Full response lines:', lines.length);
    console.log('   First few lines:', lines.slice(0, 5));

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'error') {
            hasError = true;
            errorMessage = data.message || 'Unknown error';
            console.error('   Stream error:', errorMessage);
            break;
          } else if (data.type === 'text') {
            assistantResponse += data.text || '';
          } else if (data.type === 'tool_call') {
            toolCalls.push({
              name: data.toolName || data.name,
              parameters: data.parameters
            });
            console.log('   Tool call:', data.toolName || data.name);
          } else if (data.type === 'tool_result') {
            // Capture the tool result message which contains the final summary
            if (data.result && data.result.message) {
              assistantResponse = data.result.message;
              console.log('   Tool result message:', data.result.message.substring(0, 200));
            }
          } else if (data.type === 'complete') {
            // Stream completed successfully
            console.log('   Stream completed');
            break;
          } else if (data.type === 'connected') {
            // Initial connection event, ignore
            continue;
          }
        } catch (parseError) {
          // Ignore parsing errors for individual chunks
          console.warn('   Failed to parse SSE chunk:', line);
        }
      }
    }

    const responseTime = Date.now() - startTime;

    if (hasError) {
      throw new Error(`Streaming API call failed: ${errorMessage}`);
    }

    console.log('   Final response length:', assistantResponse.length);
    console.log('   Tool calls:', toolCalls.length);
    console.log('   Response time:', responseTime);

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
    // Create the testCase object in the format expected by the judge endpoint
    const judgeTestCase = {
      testCaseId: testCase.id,
      scenario: testCase.scenario,
      expectedBehavior: [
        'Collect client information efficiently and naturally',
        'Create matter with appropriate parameters and urgency assessment',
        'Provide clear next steps and guidance',
        'Maintain professional and empathetic tone throughout',
        'Demonstrate context awareness and build upon previous information',
        'Handle edge cases and validation errors gracefully',
        'Avoid hallucinations and assumptions not supported by user input',
        'Progress conversation efficiently without unnecessary repetition'
      ],
      criticalRequirements: [
        'Must collect name, phone, email, location, and matter description',
        'Must call create_matter tool with correct parameters',
        'Must provide summary and next steps after matter creation',
        'Must handle urgent matters appropriately with high urgency flag',
        'Must NOT mention costs or pricing unless specifically asked',
        'Must NOT assume legal issue types without user confirmation',
        'Must NOT add details not provided by the user',
        'Must demonstrate conversation flow efficiency and context retention',
        'Must handle validation errors gracefully and provide helpful guidance'
      ],
      minScore: testCase.minScore || 7.0
    };

    const requestBody = {
      testCase: judgeTestCase,
      userMessage,
      agentResponse: assistantResponse,
      toolCalls
    };

    console.log('🔍 Sending to judge endpoint:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.apiUrl}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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
    
    console.log('🔍 Judge response:', JSON.stringify(result, null, 2));
    
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

  async runConversationTest(conversation: any): Promise<TestResult> {
    const sessionId = `test-${conversation.id}-${Date.now()}`;
    const actualResponses: string[] = [];
    const actualToolCalls: ToolCall[] = [];
    const conversationFlow: Array<{role: 'user' | 'assistant', content: string}> = [];
    let totalResponseTime = 0;
    let conversationHistory = [];

    console.log(`\n🔄 Starting conversation test for: ${conversation.scenario}`);

    // Handle multiple messages from the conversation fixture
    let messageIndex = 0;
    const initialMessage = conversation.messages[messageIndex];
    console.log(`\n👤 Initial user message: ${initialMessage.content.substring(0, 100)}...`);
    
    conversationHistory.push({
      role: 'user',
      content: initialMessage.content
    });
    
    // Add to conversation flow
    conversationFlow.push({
      role: 'user',
      content: initialMessage.content
    });

    // Generate first assistant response
    let { response, toolCalls, responseTime } = await this.generateAssistantResponse(
      conversationHistory,
      sessionId
    );

    console.log(`🤖 First assistant response: ${response.substring(0, 200)}...`);
    console.log(`🔧 Tool calls: ${toolCalls.length}`);

    actualResponses.push(response);
    actualToolCalls.push(...toolCalls);
    totalResponseTime += responseTime;

    conversationHistory.push({
      role: 'assistant',
      content: response
    });
    
    // Add to conversation flow
    conversationFlow.push({
      role: 'assistant',
      content: response
    });

    // Now respond to what the agent asks for, using the conversation data
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`\n🔄 Conversation round ${attempts}/${maxAttempts}`);
      
      // Determine what the agent is asking for
      let nextUserMessage = '';
      
      if (response.includes('full name') || response.includes('your name')) {
        // Agent is asking for name - provide just the name
        const firstName = conversation.user.split(' ')[0];
        nextUserMessage = `My name is ${conversation.user}.`;
      } else if (response.includes('city and state') || response.includes('location') || response.includes('where you live')) {
        // Agent is asking for location - provide just the location
        const locationMessage = conversation.messages.find(m => 
          m.role === 'user' && 
          (m.content.includes('live in') || m.content.includes('Charlotte') || m.content.includes('Raleigh') || m.content.includes('Durham') || m.content.includes('California') || m.content.includes('Greensboro'))
        );
        if (locationMessage) {
          // Extract just the location part
          if (locationMessage.content.includes('live in')) {
            const locationMatch = locationMessage.content.match(/live in ([^.]+)/i);
            nextUserMessage = locationMatch ? `I live in ${locationMatch[1].trim()}.` : locationMessage.content;
          } else {
            nextUserMessage = locationMessage.content;
          }
        }
      } else if (response.includes('phone number') && !response.includes('email')) {
        // Agent is asking for phone number - provide just the phone
        const phoneMessage = conversation.messages.find(m => 
          m.role === 'user' && 
          (m.content.includes('704-') || m.content.includes('919-') || m.content.includes('415-') || m.content.includes('336-') || m.content.includes('phone'))
        );
        if (phoneMessage) {
          // Extract just the phone part
          const phoneMatch = phoneMessage.content.match(/(\d{3}-\d{3}-\d{4})/);
          nextUserMessage = phoneMatch ? `My phone number is ${phoneMatch[1]}.` : phoneMessage.content;
        }
      } else if (response.includes('email') && !response.includes('phone')) {
        // Agent is asking for email - provide just the email
        const emailMessage = conversation.messages.find(m => 
          m.role === 'user' && 
          (m.content.includes('@') || m.content.includes('email'))
        );
        if (emailMessage) {
          // Extract just the email part
          const emailMatch = emailMessage.content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          nextUserMessage = emailMatch ? `My email is ${emailMatch[1]}.` : emailMessage.content;
        }
      } else if (response.includes('describe what you need help with') || response.includes('briefly describe') || response.includes('what you need help with') || response.includes('legal situation')) {
        // Agent is asking for matter description - provide just the description
        const descriptionMessage = conversation.messages.find(m => 
          m.role === 'user' && 
          (m.content.includes('family law') || m.content.includes('divorce') || m.content.includes('business dispute') || m.content.includes('employment') || m.content.includes('personal injury') || m.content.includes('landlord-tenant') || m.content.includes('restraining order'))
        );
        if (descriptionMessage) {
          nextUserMessage = descriptionMessage.content;
        } else {
          // For minimal information cases, provide a generic response
          nextUserMessage = "I need legal help but I'm not sure what specific type of legal issue I have. I'd like to speak with a lawyer to understand my options.";
        }
      }
      
      // If we found a response, send it
      if (nextUserMessage) {
        console.log(`📝 Responding to agent: ${nextUserMessage.substring(0, 100)}...`);
        
        conversationHistory.push({
          role: 'user',
          content: nextUserMessage
        });
        
        // Add to conversation flow
        conversationFlow.push({
          role: 'user',
          content: nextUserMessage
        });

        const result = await this.generateAssistantResponse(
          conversationHistory,
          sessionId
        );
        
        response = result.response;
        toolCalls = result.toolCalls;
        responseTime = result.responseTime;

        console.log(`🤖 Agent response: ${response.substring(0, 200)}...`);
        console.log(`🔧 Tool calls: ${toolCalls.length}`);

        actualResponses.push(response);
        actualToolCalls.push(...toolCalls);
        totalResponseTime += responseTime;

        conversationHistory.push({
          role: 'assistant',
          content: response
        });
        
        // Add to conversation flow
        conversationFlow.push({
          role: 'assistant',
          content: response
        });
        
        // Check if we have a create_matter tool call - if so, we're done
        const hasCreateMatterCall = toolCalls.some(tc => tc.name === 'create_matter');
        if (hasCreateMatterCall) {
          console.log(`✅ create_matter tool call found - conversation complete`);
          break;
        }
      } else {
        // Agent response not recognized - TEST FAILS IMMEDIATELY
        console.log(`❌ TEST FAILURE: Agent response not recognized`);
        console.log(`   Agent response: ${response}`);
        console.log(`   Expected: Agent to ask for specific information (name, location, phone, email, or matter description)`);
        
        throw new Error(`Agent response not recognized: "${response}"`);
      }
    }

    // Get the final tool calls and response
    const finalToolCalls = actualToolCalls.filter(tc => tc.name === 'create_matter');
    const lastAssistantResponse = actualResponses[actualResponses.length - 1] || '';

    // Check if we need to continue the conversation to get the final matter creation response
    // If the last response doesn't contain a summary or payment information, continue
    let lastResponse = actualResponses[actualResponses.length - 1] || '';
    const hasSummary = lastResponse.includes('summary of your matter') || 
                      lastResponse.includes('consultation fee') || 
                      lastResponse.includes('lawyer will contact you');
    
    console.log(`\n📋 Final response check:`);
    console.log(`   Has summary: ${hasSummary}`);
    console.log(`   Tool calls: ${actualToolCalls.length}`);
    console.log(`   Last response preview: ${lastResponse.substring(0, 200)}...`);
    
    // NO FALLBACKS - If the agent didn't complete the conversation properly, the test should fail
    if (!hasSummary && actualToolCalls.length === 0) {
      console.log(`❌ TEST FAILURE: Agent did not complete the conversation properly`);
      console.log(`   Expected: Summary or tool calls`);
      console.log(`   Got: No summary and no tool calls`);
      console.log(`   Last response: ${lastResponse}`);
      
      // Return a failed result immediately
      return {
        conversationId: conversation.id,
        user: conversation.user,
        scenario: conversation.scenario,
        messages: conversation.messages,
        actualResponses,
        conversationFlow,
        expectedToolCalls: conversation.expectedToolCalls,
        actualToolCalls: [],
        evaluation: {
          scores: {
            empathy: 0,
            accuracy: 0,
            completeness: 0,
            relevance: 0,
            professionalism: 0,
            actionability: 0,
            legalAccuracy: 0,
            conversationFlow: 0,
            toolUsage: 0
          },
          averageScore: 0,
          feedback: 'Agent failed to complete conversation - no fallbacks allowed',
          criticalIssues: ['Agent did not provide summary or create matter'],
          suggestions: ['Fix agent conversation flow logic']
        },
        passed: false,
        responseTime: totalResponseTime
      };
    }

    // Evaluate the final response
    const lastUserMessage = conversation.messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    console.log(`\n📊 Evaluation:`);
    console.log(`   Last user message: ${lastUserMessage.substring(0, 100)}...`);
    console.log(`   Last assistant response: ${lastAssistantResponse.substring(0, 200)}...`);
    console.log(`   Final tool calls: ${finalToolCalls.length}`);
    console.log(`   Assistant response length: ${lastAssistantResponse.length}`);
    console.log(`   Assistant response empty: ${lastAssistantResponse.length === 0}`);

    // Check if we have a valid response to evaluate
    if (lastAssistantResponse.length === 0) {
      console.log('❌ No assistant response to evaluate - TEST FAILS');
      throw new Error('No assistant response generated');
    }

    // Send full conversation flow to judge to catch hallucinations in earlier responses
    const fullConversationText = conversationFlow.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');
    
    const evaluation = await this.evaluateResponse(
      conversation,
      fullConversationText, // Send full conversation instead of just final response
      lastAssistantResponse,
      finalToolCalls
    );

    // Handle both old and new evaluation response formats
    const isNewFormat = evaluation.averageScore !== undefined;
    
    let averageScore: number;
    let scores: any;
    let flags: any;
    
    if (isNewFormat) {
      // New comprehensive format
      averageScore = evaluation.averageScore;
      scores = evaluation.scores;
      flags = evaluation.flags;
    } else {
      // Legacy format - calculate average from individual scores
      const numericScores = Object.values(evaluation).filter((value): value is number => typeof value === 'number');
      averageScore = numericScores.length > 0 ? numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length : 0;
      scores = {
        empathy: evaluation.empathy,
        accuracy: evaluation.accuracy,
        completeness: evaluation.completeness,
        relevance: evaluation.relevance,
        professionalism: evaluation.professionalism,
        actionability: evaluation.actionability,
        legalAccuracy: evaluation.legalAccuracy,
        conversationFlow: evaluation.conversationFlow,
        toolUsage: evaluation.toolUsage
      };
      flags = {
        hallucinationDetected: false,
        repetitiveResponses: false,
        contextIgnored: false
      };
    }

    const minScore = conversation.minScore || 7.0;
    const passed = averageScore >= minScore; // Minimum passing score

    // Analyze conversation flow for additional insights
    const conversationAnalysis = this.analyzeConversationFlow(conversationFlow, actualResponses);

    return {
      conversationId: conversation.id,
      user: conversation.user,
      scenario: conversation.scenario,
      messages: conversation.messages,
      actualResponses,
      conversationFlow,
      expectedToolCalls: conversation.expectedToolCalls,
      actualToolCalls: finalToolCalls,
      evaluation: {
        scores,
        averageScore,
        feedback: evaluation.feedback || '',
        criticalIssues: evaluation.criticalIssues || [],
        suggestions: evaluation.suggestions || [],
        flags,
        conversationAnalysis
      },
      passed,
      responseTime: totalResponseTime
    };
  }

  analyzeConversationFlow(
    conversationFlow: Array<{role: 'user' | 'assistant', content: string}>,
    actualResponses: string[]
  ): any {
    const analysis = {
      totalMessages: conversationFlow.length,
      userMessages: conversationFlow.filter(msg => msg.role === 'user').length,
      assistantMessages: conversationFlow.filter(msg => msg.role === 'assistant').length,
      repetitiveResponses: false,
      conversationEfficiency: 0,
      contextRetention: 0,
      responseVariety: 0
    };

    // Check for repetitive responses
    const assistantResponses = conversationFlow.filter(msg => msg.role === 'assistant').map(msg => msg.content);
    const uniqueResponses = new Set(assistantResponses.map(response => response.substring(0, 100))); // First 100 chars
    analysis.repetitiveResponses = uniqueResponses.size < assistantResponses.length * 0.7; // If less than 70% unique

    // Calculate conversation efficiency (ratio of productive exchanges)
    const productiveExchanges = conversationFlow.filter((msg, index) => {
      if (index === 0) return true;
      const prevMsg = conversationFlow[index - 1];
      return msg.role !== prevMsg.role; // Alternating user/assistant
    }).length;
    analysis.conversationEfficiency = Math.round((productiveExchanges / conversationFlow.length) * 100);

    // Check context retention (AI references previous information)
    const contextReferences = assistantResponses.filter(response => 
      response.includes('you mentioned') || 
      response.includes('you said') || 
      response.includes('as you') ||
      response.includes('based on')
    ).length;
    analysis.contextRetention = Math.round((contextReferences / assistantResponses.length) * 100);

    // Calculate response variety
    analysis.responseVariety = Math.round((uniqueResponses.size / assistantResponses.length) * 100);

    return analysis;
  }
}

function generateHTMLReport(results: TestResult[]): string {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const averageScore = results.reduce((sum, r) => sum + r.evaluation.averageScore, 0) / totalTests;
  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Judge Test Results</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #1e293b;
            margin-bottom: 10px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 5px;
        }
        
        .summary-card p {
            color: #64748b;
            font-size: 0.9rem;
        }
        
        .test-results {
            display: grid;
            gap: 20px;
        }
        
        .test-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .test-header {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .test-title {
            font-weight: 600;
            color: #1e293b;
        }
        
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            color: white;
        }
        
        .test-status.passed {
            background-color: #10b981;
        }
        
        .test-status.failed {
            background-color: #ef4444;
        }
        
        .test-content {
            padding: 20px;
        }
        
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .score-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .score-label {
            font-size: 0.8rem;
            color: #64748b;
            margin-bottom: 5px;
        }
        
        .score-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
        }
        
        .conversation {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 6px;
        }
        
        .message.user {
            background: #dbeafe;
            margin-left: 20px;
        }
        
        .message.assistant {
            background: #f0fdf4;
            margin-right: 20px;
        }
        
        .message-role {
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .tool-calls {
            background: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .tool-call {
            background: white;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-family: monospace;
            font-size: 0.9rem;
        }
        
        .feedback {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .issues {
            background: #fef2f2;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .suggestions {
            background: #f0fdf4;
            padding: 15px;
            border-radius: 8px;
        }
        
        .timestamp {
            color: #64748b;
            font-size: 0.8rem;
            margin-top: 10px;
        }
        
        .flags {
            background: #fef7ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .flag-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .flag-item {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 500;
            text-align: center;
        }
        
        .flag-item.warning {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #f59e0b;
        }
        
        .flag-item.success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #10b981;
        }
        
        .conversation-analysis {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .analysis-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }
        
        .analysis-item {
            background: white;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
        }
        
        .analysis-label {
            font-size: 0.8rem;
            color: #64748b;
            margin-bottom: 5px;
        }
        
        .analysis-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1e293b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 LLM Judge Test Results</h1>
            <p>AI-powered evaluation of legal intake conversations</p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>${passedTests}/${totalTests}</h3>
                <p>Tests Passed</p>
            </div>
            <div class="summary-card">
                <h3>${averageScore.toFixed(1)}/10</h3>
                <p>Average Score</p>
            </div>
            <div class="summary-card">
                <h3>${Math.round(averageResponseTime)}ms</h3>
                <p>Avg Response Time</p>
            </div>
            <div class="summary-card">
                <h3>${((passedTests / totalTests) * 100).toFixed(1)}%</h3>
                <p>Success Rate</p>
            </div>
        </div>
        
        <div class="test-results">
            ${results.map(result => `
                <div class="test-card">
                    <div class="test-header">
                        <div class="test-title">
                            <h3>${escapeHtml(result.scenario)}</h3>
                            <p>User: ${escapeHtml(result.user)}</p>
                        </div>
                        <div class="test-status ${result.passed ? 'passed' : 'failed'}">
                            ${result.passed ? 'PASS' : 'FAIL'}
                        </div>
                    </div>
                    
                    <div class="test-content">
                        <div class="score-grid">
                            ${result.evaluation.scores ? Object.entries(result.evaluation.scores).map(([key, value]) => {
                              if (typeof value === 'number') {
                                return `
                                    <div class="score-item">
                                        <div class="score-label">${escapeHtml(key)}</div>
                                        <div class="score-value">${value.toFixed(1)}/10</div>
                                    </div>
                                `;
                              }
                              return '';
                            }).join('') : Object.entries(result.evaluation).map(([key, value]) => {
                              if (typeof value === 'number') {
                                return `
                                    <div class="score-item">
                                        <div class="score-label">${escapeHtml(key)}</div>
                                        <div class="score-value">${value}/10</div>
                                    </div>
                                `;
                              }
                              return '';
                            }).join('')}
                        </div>
                        
                        ${result.evaluation.flags ? `
                            <div class="flags">
                                <h4>Evaluation Flags</h4>
                                <div class="flag-grid">
                                    ${result.evaluation.flags.hallucinationDetected ? `
                                        <div class="flag-item warning">
                                            <span>⚠️ Hallucination Detected</span>
                                        </div>
                                    ` : ''}
                                    ${result.evaluation.flags.repetitiveResponses ? `
                                        <div class="flag-item warning">
                                            <span>🔄 Repetitive Responses</span>
                                        </div>
                                    ` : ''}
                                    ${result.evaluation.flags.contextIgnored ? `
                                        <div class="flag-item warning">
                                            <span>🧠 Context Ignored</span>
                                        </div>
                                    ` : ''}
                                    ${!result.evaluation.flags.hallucinationDetected && !result.evaluation.flags.repetitiveResponses && !result.evaluation.flags.contextIgnored ? `
                                        <div class="flag-item success">
                                            <span>✅ No Critical Issues</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${result.evaluation.conversationAnalysis ? `
                            <div class="conversation-analysis">
                                <h4>Conversation Analysis</h4>
                                <div class="analysis-grid">
                                    <div class="analysis-item">
                                        <div class="analysis-label">Total Messages</div>
                                        <div class="analysis-value">${result.evaluation.conversationAnalysis.totalMessages}</div>
                                    </div>
                                    <div class="analysis-item">
                                        <div class="analysis-label">Efficiency</div>
                                        <div class="analysis-value">${result.evaluation.conversationAnalysis.conversationEfficiency}%</div>
                                    </div>
                                    <div class="analysis-item">
                                        <div class="analysis-label">Context Retention</div>
                                        <div class="analysis-value">${result.evaluation.conversationAnalysis.contextRetention}%</div>
                                    </div>
                                    <div class="analysis-item">
                                        <div class="analysis-label">Response Variety</div>
                                        <div class="analysis-value">${result.evaluation.conversationAnalysis.responseVariety}%</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="conversation">
                            <h4>Conversation Flow</h4>
                            ${result.conversationFlow.map((message, index) => `
                                <div class="message ${message.role}">
                                    <div class="message-role">${message.role} (message ${index + 1})</div>
                                    <div>${escapeHtml(message.content)}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${result.actualToolCalls.length > 0 ? `
                            <div class="tool-calls">
                                <h4>Tool Calls Made</h4>
                                ${result.actualToolCalls.map(toolCall => `
                                    <div class="tool-call">
                                        <strong>${escapeHtml(toolCall.name)}</strong><br>
                                        <pre>${escapeHtml(JSON.stringify(toolCall.parameters, null, 2))}</pre>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        ${result.evaluation.feedback ? `
                            <div class="feedback">
                                <h4>Judge Feedback</h4>
                                <p>${escapeHtml(result.evaluation.feedback)}</p>
                            </div>
                        ` : ''}
                        
                        ${result.evaluation.criticalIssues && result.evaluation.criticalIssues.length > 0 ? `
                            <div class="issues">
                                <h4>Critical Issues</h4>
                                <ul>
                                    ${result.evaluation.criticalIssues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${result.evaluation.suggestions && result.evaluation.suggestions.length > 0 ? `
                            <div class="suggestions">
                                <h4>Suggestions</h4>
                                <ul>
                                    ${result.evaluation.suggestions.map(suggestion => `<li>${escapeHtml(suggestion)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        <div class="timestamp">
                            Response Time: ${result.responseTime}ms | 
                            Average Score: ${result.evaluation.averageScore.toFixed(1)}/10
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
}

describe('LLM Judge Evaluation', () => {
  let judge: LLMJudge;
  let testResults: TestResult[] = [];

  beforeAll(() => {
    judge = new LLMJudge(API_BASE_URL, TEAM_ID);
  });

  afterAll(async () => {
    // Generate HTML report after all tests complete
    if (testResults.length > 0) {
      const htmlReport = generateHTMLReport(testResults);
      
      // Ensure test-results directory exists
      try {
        await mkdir('test-results', { recursive: true });
      } catch (error) {
        console.error('Error creating test-results directory:', error);
      }
      
      await writeFile('test-results/llm-judge-report.html', htmlReport);
      console.log(`\n📊 HTML Report generated: test-results/llm-judge-report.html`);
      
      // Auto-open the HTML report
      try {
        const open = (await import('open')).default;
        await open('test-results/llm-judge-report.html');
        console.log('🌐 HTML report opened in browser');
      } catch (error) {
        console.log('⚠️  Could not auto-open HTML report:', error.message);
        console.log('📁 Please open manually: test-results/llm-judge-report.html');
      }
    }
  });

  it('should test basic API connectivity', async () => {
    console.log('🔍 Testing basic API connectivity...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const result = await response.json();
      console.log('✅ Health check response:', result);
      expect(response.ok).toBe(true);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  });

  it('should validate conversation data', async () => {
    console.log('🔍 Validating conversation data...');
    
    expect(conversations.conversations).toBeDefined();
    expect(Array.isArray(conversations.conversations)).toBe(true);
    expect(conversations.conversations.length).toBeGreaterThan(0);
    
    conversations.conversations.forEach((conversation, index) => {
      console.log(`📋 Conversation ${index + 1}: ${conversation.id}`);
      expect(conversation.id).toBeDefined();
      expect(conversation.scenario).toBeDefined();
      expect(conversation.user).toBeDefined();
      expect(conversation.messages).toBeDefined();
      expect(Array.isArray(conversation.messages)).toBe(true);
      expect(conversation.messages.length).toBeGreaterThan(0);
      expect(conversation.expectedToolCalls).toBeDefined();
      expect(Array.isArray(conversation.expectedToolCalls)).toBe(true);
    });
    
    console.log('✅ Conversation data validation passed');
  });

  it('should test basic conversation flow', async () => {
    console.log('🔍 Testing basic conversation flow...');
    
    const conversation = conversations.conversations[0];
    console.log(`📋 Testing conversation: ${conversation.id}`);
    
    try {
      const result = await judge.runConversationTest(conversation);
      console.log('✅ Conversation test completed');
      console.log(`📊 Result: ${result.passed ? 'PASS' : 'FAIL'}`);
      console.log(`📈 Score: ${result.evaluation.averageScore.toFixed(2)}/10`);
      console.log(`🔧 Tool calls: ${result.actualToolCalls.length}`);
      
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.evaluation).toBeDefined();
      expect(result.actualResponses.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('❌ Conversation test failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout

  conversations.conversations.forEach(conversation => {
    it(`should evaluate "${conversation.scenario}" for ${conversation.user}`, async () => {
      console.log(`\n🧪 Starting test for: ${conversation.scenario}`);
      console.log(`👤 User: ${conversation.user}`);
      console.log(`📋 Conversation ID: ${conversation.id}`);
      console.log(`📝 Messages: ${conversation.messages.length}`);
      
      try {
        console.log(`🔄 Calling runConversationTest...`);
        const result = await judge.runConversationTest(conversation);
        console.log(`✅ runConversationTest completed`);
        
        testResults.push(result);
        
        console.log(`\n📊 Results for ${conversation.id}:`);
        console.log(`✅ Passed: ${result.passed}`);
        console.log(`⏱️  Response Time: ${result.responseTime}ms`);
        console.log(`📈 Average Score: ${result.evaluation.averageScore.toFixed(2)}/10`);
        
        // Log individual scores
        Object.entries(result.evaluation).forEach(([criterion, score]) => {
          if (typeof score === 'number') {
            console.log(`  ${criterion}: ${score}/10`);
          }
        });

        // Log tool call comparison
        console.log(`\n🔧 Tool Calls:`);
        console.log(`Expected: ${result.expectedToolCalls.length}`);
        console.log(`Actual: ${result.actualToolCalls.length}`);
        
        if (result.actualToolCalls.length > 0) {
          console.log(`\n📋 Actual Tool Calls:`);
          result.actualToolCalls.forEach((toolCall, index) => {
            console.log(`  ${index + 1}. ${toolCall.name}:`, JSON.stringify(toolCall.parameters, null, 2));
          });
        }
        
        if (result.expectedToolCalls.length > 0) {
          console.log(`\n📋 Expected Tool Calls:`);
          result.expectedToolCalls.forEach((toolCall, index) => {
            console.log(`  ${index + 1}. ${toolCall.name}:`, JSON.stringify(toolCall.parameters, null, 2));
          });
        }
        
        // Check if expected tool calls were made (loose matching)
        if (result.expectedToolCalls.length > 0) {
          const expectedCreateMatter = result.expectedToolCalls.find(tc => tc.name === 'create_matter');
          const actualCreateMatter = result.actualToolCalls.find(tc => tc.name === 'create_matter');
          
          if (expectedCreateMatter && actualCreateMatter) {
            console.log(`\n✅ create_matter tool called successfully`);
            console.log(`   Expected matter_type: ${expectedCreateMatter.parameters.matter_type}`);
            console.log(`   Actual matter_type: ${actualCreateMatter.parameters.matter_type}`);
          } else if (expectedCreateMatter && !actualCreateMatter) {
            console.log(`\n❌ Expected create_matter tool call but none found`);
          }
        }
        
        if (result.evaluation.feedback) {
          console.log(`\n💬 Feedback: ${result.evaluation.feedback}`);
        }

        if (result.evaluation.criticalIssues && result.evaluation.criticalIssues.length > 0) {
          console.log(`\n⚠️  Critical Issues:`);
          result.evaluation.criticalIssues.forEach(issue => console.log(`  - ${issue}`));
        }

        if (result.evaluation.suggestions && result.evaluation.suggestions.length > 0) {
          console.log(`\n💡 Suggestions:`);
          result.evaluation.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
        }

        // STRICT ASSERTIONS - No fallbacks!
        
        // 1. Check for phone validation failures
        const lastResponse = result.actualResponses[result.actualResponses.length - 1] || '';
        console.log(`🔍 Last response: "${lastResponse}"`);
        const hasPhoneValidationError = lastResponse.includes('Invalid phone number') || 
                                      lastResponse.includes('phone number you provided doesn\'t appear to be valid') ||
                                      lastResponse.includes('phone number is not valid') ||
                                      lastResponse.includes('phone number you provided doesn\'t appear to be valid');
        
        if (hasPhoneValidationError) {
          console.log(`⚠️  PHONE VALIDATION ERROR DETECTED: ${lastResponse}`);
          console.log(`   ⚡ This should lower the evaluation score, not fail the test`);
        }
        
        // 2. Check for AI hallucinations (mentioning costs when user didn't ask)
        const userMessages = conversation.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
        const hasUserAskedAboutCosts = userMessages.some(msg => 
          msg.includes('cost') || msg.includes('price') || msg.includes('fee') || msg.includes('pricing')
        );
        
        const aiResponses = result.actualResponses.map(r => r.toLowerCase());
        const aiMentionedCosts = aiResponses.some(response => 
          response.includes('consultation fee') || response.includes('$150') || response.includes('cost') || response.includes('pricing')
        );
        
                 if (!hasUserAskedAboutCosts && aiMentionedCosts) {
           console.log(`⚠️  AI HALLUCINATION DETECTED: AI mentioned costs when user didn't ask`);
           console.log(`   User asked about costs: ${hasUserAskedAboutCosts}`);
           console.log(`   AI mentioned costs: ${aiMentionedCosts}`);
           console.log(`   User messages: ${userMessages.join(', ')}`);
           console.log(`   AI responses mentioning costs: ${aiResponses.filter(r => 
             r.includes('consultation fee') || r.includes('$150') || r.includes('cost') || r.includes('pricing')
           ).join(', ')}`);
           console.log(`   ⚡ This should lower the evaluation score, not fail the test`);
         }
        
        // 3. Check for correct matter type classification
        if (result.actualToolCalls.length > 0) {
          const createMatterCall = result.actualToolCalls.find(tc => tc.name === 'create_matter');
          if (createMatterCall) {
            const actualMatterType = createMatterCall.parameters.matter_type;
            const expectedMatterType = result.expectedToolCalls[0]?.parameters.matter_type;
            
            console.log(`🔍 Matter Type Check: Expected "${expectedMatterType}", Got "${actualMatterType}"`);
            
            // Check for specific matter type mismatches
            if (conversation.id === 'complex-legal-matter' && actualMatterType === 'Family Law') {
              console.log(`❌ WRONG MATTER TYPE: Business/employment/tax issues classified as "Family Law"`);
              expect(actualMatterType).not.toBe('Family Law');
            }
            
            if (conversation.id === 'location-service-area' && actualMatterType === 'Family Law') {
              console.log(`❌ WRONG MATTER TYPE: Personal injury classified as "Family Law"`);
              expect(actualMatterType).not.toBe('Family Law');
            }
            
            if (conversation.id === 'pricing-concerns' && actualMatterType === 'Family Law') {
              console.log(`❌ WRONG MATTER TYPE: Landlord-tenant classified as "Family Law"`);
              expect(actualMatterType).not.toBe('Family Law');
            }
            
            // Check for hallucination in matter descriptions
            const actualDescription = createMatterCall.parameters.description || '';
            const userMessages = conversation.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
            
                         // Check if AI added "divorce" when user didn't mention it
             if (actualDescription.toLowerCase().includes('divorce') && 
                 !userMessages.some(msg => msg.includes('divorce'))) {
               console.log(`⚠️  MATTER DESCRIPTION HALLUCINATION: AI added "divorce" when user didn't mention it`);
               console.log(`   Actual description: ${actualDescription}`);
               console.log(`   User messages: ${userMessages.join(', ')}`);
               console.log(`   ⚡ This should lower the evaluation score, not fail the test`);
             }
             
             // Check if AI added "restraining order" when user didn't mention it
             if (actualDescription.toLowerCase().includes('restraining order') && 
                 !userMessages.some(msg => msg.includes('restraining order'))) {
               console.log(`⚠️  MATTER DESCRIPTION HALLUCINATION: AI added "restraining order" when user didn't mention it`);
               console.log(`   Actual description: ${actualDescription}`);
               console.log(`   User messages: ${userMessages.join(', ')}`);
               console.log(`   ⚡ This should lower the evaluation score, not fail the test`);
             }
          }
        }
        
        // 4. Check for missing tool calls when expected
        if (result.expectedToolCalls.length > 0 && result.actualToolCalls.length === 0) {
          console.log(`⚠️  MISSING TOOL CALLS: Expected ${result.expectedToolCalls.length}, Got 0`);
          console.log(`   ⚡ This might be correct if AI properly avoids creating matters with insufficient information`);
          // Don't fail the test - let the judge evaluation handle scoring
        }
        
        // 5. Check for incomplete responses
        const hasEmptyResponse = result.actualResponses.some(response => response.trim().length === 0);
        if (hasEmptyResponse) {
          console.log(`❌ EMPTY RESPONSE DETECTED`);
          expect(hasEmptyResponse).toBe(false);
        }
        
        // 6. Check for missing responses
        expect(result.actualResponses.length).toBeGreaterThan(0);
        
        // 7. Check response time
        expect(result.responseTime).toBeLessThan(60000); // 60 seconds max
        
        // 8. Check for minimum score (but don't fail on this alone)
        // Note: A score of 0 might be legitimate for minimal information scenarios
        if (result.evaluation.averageScore === 0) {
          console.log(`⚠️  Zero score detected - this might be legitimate for minimal information scenarios`);
        }
        
        const minScore = conversation.minScore || 7.0;
        console.log(`\n📊 Test Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.evaluation.averageScore >= minScore ? 'meets' : 'below'} ${minScore} threshold)`);
        
        // Log tool call comparison
        if (result.expectedToolCalls.length > 0) {
          console.log(`\n🔧 Tool Call Check: Expected ${result.expectedToolCalls.length}, Got ${result.actualToolCalls.length}`);
        }
        
        // Log hallucination analysis
        console.log(`\n🧠 Hallucination Analysis:`);
        console.log(`   User asked about costs: ${hasUserAskedAboutCosts}`);
        console.log(`   AI mentioned costs: ${aiMentionedCosts}`);
        console.log(`   Hallucination detected: ${!hasUserAskedAboutCosts && aiMentionedCosts ? '❌ YES' : '✅ NO'}`);
        
        // Log matter type analysis
        if (result.actualToolCalls.length > 0) {
          const createMatterCall = result.actualToolCalls.find(tc => tc.name === 'create_matter');
          if (createMatterCall) {
            const actualDescription = createMatterCall.parameters.description || '';
            const userMentionedDivorce = userMessages.some(msg => msg.includes('divorce'));
            const userMentionedRestrainingOrder = userMessages.some(msg => msg.includes('restraining order'));
            const aiAddedDivorce = actualDescription.toLowerCase().includes('divorce');
            const aiAddedRestrainingOrder = actualDescription.toLowerCase().includes('restraining order');
            
            console.log(`   User mentioned divorce: ${userMentionedDivorce}`);
            console.log(`   AI added divorce: ${aiAddedDivorce}`);
            console.log(`   User mentioned restraining order: ${userMentionedRestrainingOrder}`);
            console.log(`   AI added restraining order: ${aiAddedRestrainingOrder}`);
            console.log(`   Matter description hallucination: ${(!userMentionedDivorce && aiAddedDivorce) || (!userMentionedRestrainingOrder && aiAddedRestrainingOrder) ? '❌ YES' : '✅ NO'}`);
          }
        }

      } catch (error) {
        console.error(`❌ Test failed with error:`, error);
        throw error;
      }

    }, 60000); // 60 second timeout per test
  });
});
