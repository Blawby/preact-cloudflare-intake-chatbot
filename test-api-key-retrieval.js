// Test script to check API key retrieval step by step
import fetch from 'node-fetch';

async function testApiKeyRetrieval() {
  console.log('🔍 Testing API Key Retrieval Step by Step...\n');

  // Step 1: Store a fresh API key
  console.log('📋 Step 1: Storing fresh API key...');
  try {
    const storeResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'Bearer fresh_test_api_key_456',
        teamUlid: '01jq70jnstyfzevc6423czh50e'
      })
    });
    
    const storeResult = await storeResponse.json();
    console.log('✅ API key stored:', storeResult.success);
  } catch (error) {
    console.error('❌ Error storing API key:', error);
  }

  // Step 2: Verify the secret exists
  console.log('\n📋 Step 2: Verifying secret exists...');
  try {
    const secretResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const secretData = await secretResponse.json();
    console.log('✅ Secret exists:', secretData.data.hasSecret);
  } catch (error) {
    console.error('❌ Error checking secret:', error);
  }

  // Step 3: Test a simple agent call to see if API key is resolved
  console.log('\n📋 Step 3: Testing simple agent call...');
  try {
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'api-key-test-' + Date.now()
      })
    });

    const result = await response.json();
    console.log('✅ Agent response received');
  } catch (error) {
    console.error('❌ Error in agent call:', error);
  }

  // Step 4: Test the payment flow again
  console.log('\n📋 Step 4: Testing payment flow...');
  try {
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'help im getting divorced' },
          { role: 'assistant', content: "I'm so sorry to hear that you're going through a divorce. Can you please provide your full name" },
          { role: 'user', content: 'steve jobs' },
          { role: 'assistant', content: "Thank you Steve Jobs! Now I need to know your city and state. Can you please tell me where you're located?" },
          { role: 'user', content: 'charlotte nc' },
          { role: 'assistant', content: "Thank you Steve Jobs! Now I need your phone number so I can reach out to you with more information. Can you please provide your phone number?" },
          { role: 'user', content: '6159990000' },
          { role: 'assistant', content: "Thank you Steve Jobs! Now I need your email address so I can send you a confirmation and schedule a consultation with one of our attorneys. Can you please provide your email address?" },
          { role: 'user', content: 'test@example.com' }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'payment-test-' + Date.now()
      })
    });

    const result = await response.json();
    
    const paymentMethod = result.data?.metadata?.toolResult?.data?.payment_method;
    const paymentLink = result.data?.metadata?.toolResult?.data?.payment_link;
    
    console.log('✅ Payment Method:', paymentMethod);
    console.log('✅ Payment Link:', paymentLink);
    
    if (paymentMethod === 'blawby_api') {
      console.log('🎉 SUCCESS: Using Blawby API for payment!');
    } else if (paymentMethod === 'fallback_link') {
      console.log('⚠️ WARNING: Still using fallback payment link');
      console.log('🔍 This confirms that API key resolution is not working');
    }

  } catch (error) {
    console.error('❌ Error in payment flow:', error);
  }
}

// Run the API key retrieval test
testApiKeyRetrieval().catch(console.error); 