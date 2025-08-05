// Test script to verify KV storage resolution
import fetch from 'node-fetch';

async function testKvResolution() {
  console.log('🔍 Testing KV Storage Resolution...\n');

  // Step 1: Check what's actually stored in KV
  console.log('📋 Step 1: Checking raw KV data...');
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

  // Step 2: Test the TeamSecretsService methods directly
  console.log('\n📋 Step 2: Testing TeamSecretsService methods...');
  try {
    // Test getBlawbyApiKey
    const apiKeyResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e/api-key', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (apiKeyResponse.ok) {
      const apiKeyData = await apiKeyResponse.json();
      console.log('✅ API Key Response:', JSON.stringify(apiKeyData, null, 2));
    } else {
      console.log('❌ API Key endpoint not found');
    }
  } catch (error) {
    console.error('❌ Error testing API key retrieval:', error);
  }

  // Step 3: Test with a simple agent call to see the debug logs
  console.log('\n📋 Step 3: Testing agent with debug logging...');
  try {
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'debug payment configuration' }],
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'kv-test-' + Date.now()
      })
    });

    const result = await response.json();
    console.log('✅ Agent Debug Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error testing agent debug:', error);
  }
}

// Run the KV resolution test
testKvResolution().catch(console.error); 