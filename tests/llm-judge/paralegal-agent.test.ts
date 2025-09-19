import { describe, it, expect } from 'vitest';

describe('LLM Judge Evaluation - Paralegal Agent Tests', () => {

  it('should evaluate "Case preparation flow - Employment discrimination" for Sarah Johnson', async () => {
    const testCase = {
      testCaseId: 'paralegal-employment-discrimination',
      scenario: 'Case preparation flow - Employment discrimination',
      expectedBehavior: [
        'Guide user through case preparation stages',
        'Collect key facts about the discrimination situation',
        'Identify evidence and witnesses',
        'Generate comprehensive case summary',
        'Maintain professional and empathetic tone throughout',
        'Progress through case preparation stages efficiently'
      ],
      criticalRequirements: [
        'Must progress through case preparation stages (assessing issue, gathering facts, collecting evidence, identifying legal issues)',
        'Must generate a comprehensive case summary with facts, evidence, and legal issues',
        'Must NOT create matters (paralegal focuses on case preparation)',
        'Must demonstrate structured case preparation approach',
        'Must provide lawyer-ready case file'
      ],
      minScore: 7
    };

    const conversation = [
      { role: 'user', content: 'I have a workplace discrimination situation' },
      { role: 'assistant', content: 'I understand you\'re dealing with a legal issue. To help you prepare a strong case, I need to understand the specifics. Can you tell me:\n\n1. What type of legal problem is this? (e.g., employment, family law, personal injury, etc.)\n2. When did this situation begin?\n3. Who else is involved?' },
      { role: 'user', content: 'My manager has been making inappropriate comments about my age and gender. This started about 3 months ago. He said things like "you\'re too old for this job" and "women shouldn\'t be in leadership positions".' },
      { role: 'assistant', content: 'Great! I can see this involves Employment Law. Now let\'s gather the key facts. Please tell me:\n\n1. What exactly happened? (Give me the main events in order)\n2. When did each event occur?\n3. What was said or done by each person involved?\n4. How has this situation affected you?' },
      { role: 'user', content: 'I\'ve been passed over for promotions and given worse assignments. It\'s affecting my career and mental health. I have emails from my manager with these comments and my coworker Sarah witnessed some of the incidents.' },
      { role: 'assistant', content: 'Excellent! I have the basic facts. Now let\'s identify evidence that could support your case:\n\n1. Do you have any documents related to this? (contracts, emails, texts, photos, etc.)\n2. Are there any witnesses who saw what happened?\n3. Do you have any records of communications (emails, texts, voicemails)?\n4. Are there any other materials that could help your case?' },
      { role: 'user', content: 'Yes, I have the emails from my manager, performance reviews showing my good work, and Sarah can testify about the comments. I also have a timeline of when these incidents occurred.' }
    ];

    const result = await runParalegalConversationTest(testCase, conversation, 'paralegal-employment-discrimination');
    
    expect(result.passed).toBe(true);
    expect(result.averageScore).toBeGreaterThanOrEqual(7);
    // Case summary may not be generated if conversation doesn't reach final stage
    if (result.caseSummary) {
      expect(result.caseSummary).toContain('Employment Law');
      expect(result.caseSummary).toContain('discrimination');
    }
  }, 30000);
});

async function runParalegalConversationTest(testCase: any, conversation: any[], sessionId: string) {
  console.log(`\n🧪 Starting paralegal test for: ${testCase.scenario}`);
  console.log(`👤 User: ${sessionId}`);
  console.log(`📋 Conversation ID: ${testCase.testCaseId}`);
  console.log(`📝 Messages: ${conversation.length}`);
  console.log('🔄 Calling runParalegalConversationTest...\n');

  // Enable paralegal-first mode for this test
  const BASE_URL = process.env.TEST_API_URL || 'http://localhost:8787';
  const response = await fetch(`${BASE_URL}/api/teams/blawby-ai`, {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to enable paralegal-first mode: ${response.status} ${response.statusText} - ${errorText}`);
  }

  let fullResponse = '';
  let caseSummary = '';
  let stage = '';

  // Run the conversation
  for (let i = 0; i < conversation.length; i += 2) {
    const userMessage = conversation[i];
    const expectedAssistantMessage = conversation[i + 1];

    console.log(`📝 User message ${Math.floor(i/2) + 1}: ${userMessage.content.substring(0, 50)}...`);
    
    // Build messages array up to this point
    const messages = conversation.slice(0, i + 1);
    
    const response = await fetch('http://localhost:8787/api/agent/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'blawby-ai',
        sessionId: `test-${sessionId}-${Date.now()}`
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body available');
    }

    const chunks: string[] = [];
    for await (const chunk of response.body) {
      chunks.push(chunk.toString());
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
            responseContent = data.response;
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

    fullResponse += responseContent;
    console.log(`🤖 Agent response: ${responseContent.substring(0, 100)}...`);
  }

  // Disable paralegal-first mode after test
  try {
    const cleanupResponse = await fetch('http://localhost:8787/api/teams/blawby-ai', {
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
    
    if (!cleanupResponse.ok) {
      console.error(`Failed to disable paralegal-first mode: ${cleanupResponse.status}`);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
    // Don't throw to allow test results to be returned
  }

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

  if (caseSummary) {
    console.log(`📄 Case Summary Preview: ${caseSummary.substring(0, 200)}...`);
  }

  return {
    passed: evaluation.passed,
    averageScore: evaluation.averageScore,
    caseSummary,
    stage,
    evaluation
  };
}