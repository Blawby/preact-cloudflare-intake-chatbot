// Test script to verify JSON structure of stored secrets
import fetch from 'node-fetch';

async function testJsonStructure() {
  console.log('🔍 Testing JSON Structure of Stored Secrets...\n');

  // Step 1: Store a secret with a known structure
  console.log('📋 Step 1: Storing secret with known structure...');
  const testSecret = {
    apiKey: 'Bearer test_api_key_789',
    teamUlid: '01jq70jnstyfzevc6423czh50e',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const storeResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: testSecret.apiKey,
        teamUlid: testSecret.teamUlid
      })
    });
    
    const storeResult = await storeResponse.json();
    console.log('✅ Secret stored:', storeResult.success);
    console.log('📋 Expected structure:', JSON.stringify(testSecret, null, 2));
  } catch (error) {
    console.error('❌ Error storing secret:', error);
  }

  // Step 2: Test the payment flow to see if the API key is resolved
  console.log('\n📋 Step 2: Testing payment flow with new secret...');
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
        sessionId: 'json-test-' + Date.now()
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
      console.log('🔍 This means the JSON structure is not the issue');
    }

  } catch (error) {
    console.error('❌ Error in payment flow:', error);
  }

  // Step 3: Check if there are any validation errors
  console.log('\n📋 Step 3: Checking for validation errors...');
  try {
    const secretResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const secretData = await secretResponse.json();
    console.log('✅ Secret validation:', secretData.data.hasSecret);
  } catch (error) {
    console.error('❌ Error checking secret:', error);
  }
}

// Run the JSON structure test
testJsonStructure().catch(console.error); 