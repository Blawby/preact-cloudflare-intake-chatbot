// Debug script to test API key resolution
import fetch from 'node-fetch';

async function debugApiKeyResolution() {
  console.log('🔍 Debugging API Key Resolution...\n');

  // Step 1: Check what's stored in KV
  console.log('📋 Step 1: Checking KV storage...');
  try {
    const secretResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const secretData = await secretResponse.json();
    console.log('✅ KV Secret Response:', JSON.stringify(secretData, null, 2));
  } catch (error) {
    console.error('❌ Error checking KV:', error);
  }

  // Step 2: Test the AIService directly by calling the agent with a simple message
  console.log('\n📋 Step 2: Testing AIService resolution...');
  const simpleMessages = [
    { role: 'user', content: 'test' }
  ];

  try {
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: simpleMessages,
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'debug-session-' + Date.now()
      })
    });

    const result = await response.json();
    console.log('✅ Agent Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error testing agent:', error);
  }

  // Step 3: Check if the team configuration is being loaded correctly
  console.log('\n📋 Step 3: Checking team configuration loading...');
  try {
    // This will help us see if the team config is being loaded with the API key
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is my team configuration?' }],
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'config-debug-' + Date.now()
      })
    });

    const result = await response.json();
    console.log('✅ Team Config Test Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error testing team config:', error);
  }
}

// Run the debug test
debugApiKeyResolution().catch(console.error); 