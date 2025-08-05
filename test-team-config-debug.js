import fetch from 'node-fetch';

async function testTeamConfigDebug() {
  console.log('🔍 Testing Team Config Debug...\n');

  try {
    // Test the agent with a message that should trigger create_matter
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'I need help with a family law matter. My name is John Doe, my email is john@example.com, and my phone is 555-123-4567. I live in Charlotte, NC. I have a custody dispute with my ex-spouse Jane Doe.'
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
    console.log('📋 Full response:', JSON.stringify(result, null, 2));
    
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
          } else if (toolResult.data?.payment_method === 'payment_service') {
            console.log('✅ SUCCESS: Using payment service!');
          }
        }
      }
    } else {
      console.log('ℹ️ No tool calls in response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTeamConfigDebug(); 