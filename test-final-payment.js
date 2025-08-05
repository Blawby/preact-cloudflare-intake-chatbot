import fetch from 'node-fetch';

async function testFinalPayment() {
  console.log('🔍 Testing Final Payment Flow...\n');

  try {
    // Step 0: Clear the AIService cache for the team (simulate by updating the secret)
    console.log('🧹 Clearing AIService cache for team...');
    await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'Bearer sk_test_1234567890abcdef',
        teamUlid: '01jq70jnstyfzevc6423czh50e'
      })
    });

    // Use the step-by-step flow that we know works
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'I need help with a family law matter'
          },
          {
            role: 'user',
            content: 'My name is John Doe'
          },
          {
            role: 'user',
            content: 'My phone number is 555-123-4567'
          },
          {
            role: 'user',
            content: 'My email is john@example.com'
          },
          {
            role: 'user',
            content: 'I live in Charlotte, NC'
          },
          {
            role: 'user',
            content: 'I have a custody dispute with my ex-spouse Jane Doe'
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
    
    // Check if there are any tool calls that would trigger payment
    if (result.data && result.data.toolCalls) {
      console.log('📋 Tool calls found:', result.data.toolCalls.length);
      
      for (const toolCall of result.data.toolCalls) {
        console.log(`📋 Tool: ${toolCall.name}`);
        console.log(`📋 Parameters:`, JSON.stringify(toolCall.parameters, null, 2));
        
        if (toolCall.name === 'create_matter' && result.data.metadata && result.data.metadata.toolResult) {
          const toolResult = result.data.metadata.toolResult;
          console.log('💰 Payment method:', toolResult.data?.payment_method);
          console.log('💰 Payment link:', toolResult.data?.payment_link);
          console.log('💰 Payment ID:', toolResult.data?.payment_id);
          
          if (toolResult.data?.payment_method === 'fallback_link') {
            console.log('⚠️ WARNING: Still using fallback payment link');
            console.log('🔍 This means the API key is not being resolved from KV storage');
            console.log('🔍 The team config blawbyApi.enabled might be false or apiKey might be null');
          } else if (toolResult.data?.payment_method === 'payment_service') {
            console.log('✅ SUCCESS: Using payment service!');
            console.log('✅ Real invoice URL:', toolResult.data?.payment_link);
          }
        }
      }
    } else {
      console.log('ℹ️ No tool calls in response');
      console.log('📋 Full response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalPayment(); 