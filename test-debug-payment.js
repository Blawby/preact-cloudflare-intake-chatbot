// Debug test script to check payment flow details
import fetch from 'node-fetch';

async function testDebugPayment() {
  console.log('🔍 Debugging Blawby API Payment Flow...\n');

  // Test 1: Check if API key is stored correctly
  console.log('📋 Test 1: Checking stored API key...');
  try {
    const secretResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const secretData = await secretResponse.json();
    console.log('✅ Secret check response:', JSON.stringify(secretData, null, 2));
  } catch (error) {
    console.error('❌ Error checking secret:', error);
  }

  // Test 2: Check team configuration
  console.log('\n📋 Test 2: Checking team configuration...');
  try {
    const teamsResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const teamsData = await teamsResponse.json();
    const ncTeam = teamsData.find(team => team.id === '01jq70jnstyfzevc6423czh50e');
    console.log('✅ NC Team config:', JSON.stringify(ncTeam, null, 2));
  } catch (error) {
    console.error('❌ Error checking teams:', error);
  }

  // Test 3: Simulate payment flow with detailed logging
  console.log('\n📋 Test 3: Simulating payment flow...');
  const messages = [
    { role: 'user', content: 'help im getting divorced' },
    { role: 'assistant', content: "I'm so sorry to hear that you're going through a divorce. Can you please provide your full name" },
    { role: 'user', content: 'steve jobs' },
    { role: 'assistant', content: "Thank you Steve Jobs! Now I need to know your city and state. Can you please tell me where you're located?" },
    { role: 'user', content: 'charlotte nc' },
    { role: 'assistant', content: "Thank you Steve Jobs! Now I need your phone number so I can reach out to you with more information. Can you please provide your phone number?" },
    { role: 'user', content: '6159990000' },
    { role: 'assistant', content: "Thank you Steve Jobs! Now I need your email address so I can send you a confirmation and schedule a consultation with one of our attorneys. Can you please provide your email address?" },
    { role: 'user', content: 'test@example.com' }
  ];

  try {
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'debug-session-' + Date.now()
      })
    });

    const result = await response.json();
    
    // Extract payment method from the response
    const paymentMethod = result.data?.metadata?.toolResult?.data?.payment_method;
    const paymentLink = result.data?.metadata?.toolResult?.data?.payment_link;
    
    console.log('✅ Payment Method:', paymentMethod);
    console.log('✅ Payment Link:', paymentLink);
    
    if (paymentMethod === 'blawby_api') {
      console.log('🎉 SUCCESS: Using Blawby API for payment!');
    } else if (paymentMethod === 'fallback_link') {
      console.log('⚠️ WARNING: Using fallback payment link');
      console.log('🔍 This means the API key is not being resolved properly');
    } else {
      console.log('❓ Unknown payment method:', paymentMethod);
    }

  } catch (error) {
    console.error('❌ Error in payment flow:', error);
  }
}

// Run the debug test
testDebugPayment().catch(console.error); 