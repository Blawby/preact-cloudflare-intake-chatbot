import fetch from 'node-fetch';

async function testTeamSecretsDebug() {
  console.log('🔍 Testing TeamSecretsService Debug...\n');

  try {
    // Step 1: Check if the secret exists in KV
    console.log('📋 Step 1: Checking if secret exists in KV...');
    const kvResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (kvResponse.ok) {
      const kvData = await kvResponse.json();
      console.log('✅ KV Response:', JSON.stringify(kvData, null, 2));
    } else {
      console.log('❌ KV check failed:', kvResponse.status);
    }

    // Step 2: Test the AIService directly by making a simple agent call
    console.log('\n📋 Step 2: Testing AIService team config resolution...');
    const agentResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello, I need help with a legal matter. My name is John Doe, my email is john@example.com, and my phone is 555-123-4567. I live in Charlotte, NC.'
          }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e'
      })
    });

    if (agentResponse.ok) {
      const agentData = await agentResponse.json();
      console.log('✅ Agent Response Status:', agentResponse.status);
      console.log('✅ Agent Response:', JSON.stringify(agentData, null, 2));
    } else {
      console.log('❌ Agent call failed:', agentResponse.status);
      const errorText = await agentResponse.text();
      console.log('Error details:', errorText);
    }

    // Step 3: Test the payment endpoint to confirm it works
    console.log('\n📋 Step 3: Testing payment endpoint...');
    const paymentResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/payment/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
          location: 'Charlotte, NC'
        },
        matterInfo: {
          type: 'Family Law',
          description: 'Test matter',
          urgency: 'medium',
          opposingParty: ''
        },
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'test-session-' + Date.now(),
        consultationFee: 75
      })
    });

    if (paymentResponse.ok) {
      const paymentData = await paymentResponse.json();
      console.log('✅ Payment Endpoint Response:', JSON.stringify(paymentData, null, 2));
    } else {
      console.log('❌ Payment endpoint failed:', paymentResponse.status);
      const errorText = await paymentResponse.text();
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

testTeamSecretsDebug(); 