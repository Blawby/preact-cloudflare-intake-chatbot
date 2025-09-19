import { describe, it, expect } from 'vitest';

describe('LLM Judge Evaluation - Paralegal Case Summary Test', () => {

  it('should generate case summary for employment discrimination case', async () => {
    const testCase = {
      testCaseId: 'paralegal-case-summary',
      scenario: 'Generate case summary for employment discrimination',
      expectedBehavior: [
        'Guide user through case preparation stages',
        'Generate comprehensive case summary',
        'Maintain professional tone'
      ],
      criticalRequirements: [
        'Must generate a case summary',
        'Must include key facts and evidence',
        'Must NOT create matters (paralegal focuses on case preparation)'
      ],
      minScore: 7
    };

    console.log('🧪 Starting case summary test...');

    // Enable paralegal-first mode for this test
    await fetch('http://localhost:8787/api/teams/blawby-ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          features: {
            enableParalegalAgent: true,
            paralegalFirst: true
          }
        }
      })
    });

    // Build a conversation that should trigger case summary generation
    const conversation = [
      { role: 'user', content: 'I have a workplace discrimination situation' },
      { role: 'user', content: 'My manager has been making inappropriate comments about my age and gender. This started about 3 months ago. He said things like "you\'re too old for this job" and "women shouldn\'t be in leadership positions".' },
      { role: 'user', content: 'I\'ve been passed over for promotions and given worse assignments. It\'s affecting my career and mental health. I have emails from my manager with these comments and my coworker Sarah witnessed some of the incidents.' },
      { role: 'user', content: 'Yes, I have the emails from my manager, performance reviews showing my good work, and Sarah can testify about the comments. I also have a timeline of when these incidents occurred.' },
      { role: 'user', content: 'I believe this violates employment discrimination laws. I\'ve suffered emotional distress, lost career opportunities, and financial harm from being passed over for promotions. I want to stop the discrimination and get compensation for the harm done.' }
    ];

    let fullResponse = '';
    let caseSummary = '';
    let stage = '';

    // Send all messages at once to simulate a complete conversation
    const messages = conversation;
    
    console.log('📝 Sending complete conversation...');
    
    const response = await fetch('http://localhost:8787/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'blawby-ai',
        sessionId: `test-case-summary-${Date.now()}`
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body available');
    }

    const chunks: string[] = [];
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }
    
    const responseText = chunks.join('');
    const lines = responseText.split('\n');
    let responseContent = '';
        
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'text') {
            responseContent += data.text;
          } else if (data.type === 'final') {
            responseContent = data.response || responseContent;
            if (data.caseSummary) {
              caseSummary = data.caseSummary;
            }
            if (data.stage) {
              stage = data.stage;
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    // If no response content was parsed, try to extract from the raw response
    if (!responseContent && responseText) {
      // Look for any text content in the response
      const textMatches = responseText.match(/"text":"([^"]+)"/g);
      if (textMatches) {
        responseContent = textMatches.map(match => 
          match.replace(/"text":"([^"]+)"/, '$1')
        ).join('');
      }
    }

    fullResponse = responseContent;
    console.log('🤖 Agent response length:', fullResponse.length);
    console.log('🤖 Raw response text:', responseText.substring(0, 500));
    console.log('🎯 Stage:', stage);
    console.log('📋 Case Summary Generated:', caseSummary ? 'Yes' : 'No');

    if (caseSummary) {
      console.log('📄 Case Summary Preview:', caseSummary.substring(0, 200));
    }

    // Disable paralegal-first mode after test
    await fetch('http://localhost:8787/api/teams/blawby-ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          features: {
            enableParalegalAgent: true,
            paralegalFirst: false
          }
        }
      })
    });

    // Evaluate with LLM Judge
    const judgeResponse = await fetch('http://localhost:8787/api/judge/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testCase,
        userMessage: conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
        agentResponse: fullResponse,
        toolCalls: [] // Paralegal agent doesn't use tools
      })
    });

    if (!judgeResponse.ok) {
      throw new Error(`Judge evaluation failed: ${judgeResponse.status} ${judgeResponse.statusText}`);
    }

    const judgeResult = await judgeResponse.json() as { data: any };
    const evaluation = judgeResult.data;

    console.log(`\n📊 Results for ${testCase.testCaseId}:`);
    console.log(`✅ Passed: ${evaluation.passed}`);
    console.log(`📈 Average Score: ${evaluation.averageScore}/10`);
    console.log(`🎯 Stage: ${stage}`);
    console.log(`📋 Case Summary Generated: ${caseSummary ? 'Yes' : 'No'}`);

    expect(evaluation.passed).toBe(true);
    expect(evaluation.averageScore).toBeGreaterThanOrEqual(7);
    
    // Explicitly assert that a case summary was generated
    expect(caseSummary).toBeTruthy();
    expect(caseSummary).not.toBeNull();
    expect(caseSummary).not.toBeUndefined();
    
    // Assert that the case summary contains expected content
    expect(caseSummary).toContain('Employment Law');
    expect(caseSummary).toContain('discrimination');
  }, 30000);
});
