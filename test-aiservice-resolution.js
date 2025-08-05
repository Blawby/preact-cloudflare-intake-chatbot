import fetch from 'node-fetch';

async function testAIServiceResolution() {
  console.log('🔍 Testing AIService API key resolution...\n');

  try {
    // Test the agent endpoint to see if it resolves the API key
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'I need help with a family law matter. My name is John Doe, my email is john@example.com, and my phone is 555-123-4567. I live in Charlotte, NC.'
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
    console.log('📋 Response data:', JSON.stringify(result, null, 2));

    // Check if the response contains payment information
    if (result.data && result.data.payment_method) {
      console.log(`💰 Payment method: ${result.data.payment_method}`);
      console.log(`💰 Payment link: ${result.data.payment_link}`);
      
      if (result.data.payment_method === 'blawby_api') {
        console.log('✅ SUCCESS: Using Blawby API for payment!');
      } else if (result.data.payment_method === 'fallback_link') {
        console.log('⚠️ WARNING: Still using fallback payment link');
        console.log('🔍 This means the API key resolution is still not working');
      } else {
        console.log(`ℹ️ Payment method: ${result.data.payment_method}`);
      }
    } else {
      console.log('ℹ️ No payment information in response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAIServiceResolution(); 