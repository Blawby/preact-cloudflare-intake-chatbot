// Test script to directly check KV storage
import fetch from 'node-fetch';

async function testDirectKv() {
  console.log('🔍 Testing Direct KV Storage Access...\n');

  // Step 1: Check if the secret exists
  console.log('📋 Step 1: Checking if secret exists...');
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

  // Step 2: Try to get the raw secret data
  console.log('\n📋 Step 2: Getting raw secret data...');
  try {
    // This would be a direct KV access if we had an endpoint for it
    // For now, let's try to see if we can get more detailed information
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e/debug', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const debugData = await response.json();
      console.log('✅ Debug data:', JSON.stringify(debugData, null, 2));
    } else {
      console.log('❌ Debug endpoint not available');
    }
  } catch (error) {
    console.error('❌ Error getting debug data:', error);
  }

  // Step 3: Test the payment flow with more detailed logging
  console.log('\n📋 Step 3: Testing payment flow with detailed logging...');
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
        sessionId: 'direct-kv-test-' + Date.now()
      })
    });

    const result = await response.json();
    
    // Extract payment information
    const paymentMethod = result.data?.metadata?.toolResult?.data?.payment_method;
    const paymentLink = result.data?.metadata?.toolResult?.data?.payment_link;
    
    console.log('✅ Payment Method:', paymentMethod);
    console.log('✅ Payment Link:', paymentLink);
    
    // Show the full tool result for debugging
    console.log('\n📋 Full Tool Result:');
    console.log(JSON.stringify(result.data?.metadata?.toolResult, null, 2));

  } catch (error) {
    console.error('❌ Error in payment flow:', error);
  }
}

// Run the direct KV test
testDirectKv().catch(console.error); 