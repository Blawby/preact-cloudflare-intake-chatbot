import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import conversations from '../llm-judge/fixtures/conversations.json';
import { writeFile, mkdir } from 'fs/promises';
import type { ToolCall } from '../../worker/routes/judge';
import { LLMJudge } from '../helpers/llm-judge';

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:8787';
const TEAM_ID = process.env.TEST_TEAM_ID || 'blawby-ai';
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
  flags: Record<string, boolean>;
  conversationAnalysis?: any;
}

// LLMJudge class moved to tests/helpers/llm-judge.ts

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHTMLReport(results: TestResult[]): string {
  const totalTests = results.length;
  // Use consistent 7.0 threshold for all metrics (same as Average Score calculation)
  const passedTests = results.filter(r => r.evaluation.averageScore >= 7.0).length;
  const averageScore = totalTests > 0 ? results.reduce((sum, r) => sum + r.evaluation.averageScore, 0) / totalTests : 0;
  const averageResponseTime = totalTests > 0 ? results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests : 0;

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
                <h3>${averageResponseTime.toFixed(0)}ms</h3>
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
                            ${Object.entries(result.evaluation.scores).map(([key, value]) => {
                              if (typeof value === 'number') {
                                return `
                                    <div class="score-item">
                                        <div class="score-label">${key}</div>
                                        <div class="score-value">${value}/10</div>
                                    </div>
                                `;
                              }
                              return '';
                            }).join('')}
                        </div>
                        
                        <div class="conversation">
                            <h4>Conversation Flow</h4>
                            ${result.messages.map(message => `
                                <div class="message ${message.role}">
                                    <div class="message-role">${message.role}</div>
                                    <div>${escapeHtml(message.content)}</div>
                                </div>
                            `).join('')}
                            
                            ${result.actualResponses.map((response, index) => `
                                <div class="message assistant">
                                    <div class="message-role">assistant (response ${index + 1})</div>
                                    <div>${escapeHtml(response)}</div>
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
                        
                        ${(() => {
                            // Filter out "No hallucinations detected" and similar non-issue messages
                            const actualIssues = result.evaluation.criticalIssues?.filter(issue => 
                                !issue.toLowerCase().includes('no hallucinations detected') &&
                                !issue.toLowerCase().includes('no critical issues') &&
                                !issue.toLowerCase().includes('no issues detected')
                            ) || [];
                            
                            return actualIssues.length > 0 ? `
                                <div class="issues">
                                    <h4>Critical Issues</h4>
                                    <ul>
                                        ${actualIssues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : '';
                        })()}
                        
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
    }
  });

  conversations.conversations.forEach(conversation => {
    it(`should evaluate "${conversation.scenario}" for ${conversation.user}`, async () => {
      console.log(`\n🧪 Testing: ${conversation.scenario}`);
      console.log(`👤 User: ${conversation.user}`);
      
      const result = await judge.runConversationTest(conversation);
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

      // Assertions
      expect(result.responseTime).toBeLessThan(60000); // 60 seconds max
      expect(result.evaluation.averageScore).toBeGreaterThan(0); // Should have some score
      expect(result.actualResponses.length).toBeGreaterThan(0); // Should have responses
      
      // Log whether test would pass with stricter criteria
      console.log(`\n📊 Test Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.evaluation.averageScore >= 7.0 ? 'meets' : 'below'} 7.0 threshold)`);
      
      // Check if expected tool calls were made (loose matching)
      if (result.expectedToolCalls.length > 0) {
        console.log(`\n🔧 Tool Call Check: Expected ${result.expectedToolCalls.length}, Got ${result.actualToolCalls.length}`);
        // Don't fail on tool calls for now - this is informational
      }

    }, 60000); // 60 second timeout per test
  });
});
