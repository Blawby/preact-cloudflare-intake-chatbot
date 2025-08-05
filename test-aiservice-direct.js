import fetch from 'node-fetch';

async function testAIServiceDirect() {
  console.log('🔍 Testing AIService Directly...\n');

  try {
    // Test the agent with a simple message to trigger the AIService
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e'
      })
    });

    if (!response.ok) {
      console.error('❌ Agent request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Agent response received');
    console.log('📋 Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAIServiceDirect(); 