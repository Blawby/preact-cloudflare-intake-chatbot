import fetch from 'node-fetch';

async function testAgentFlow() {
  console.log('🔍 Testing Agent Flow Step by Step...\n');

  try {
    // Step 1: Start with a simple message
    console.log('📋 Step 1: Initial message...');
    const response1 = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'I need help with a family law matter'
          }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e'
      })
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Step 1 Response:', JSON.stringify(data1, null, 2));
    }

    // Step 2: Provide name
    console.log('\n📋 Step 2: Providing name...');
    const response2 = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
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
          }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e'
      })
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Step 2 Response:', JSON.stringify(data2, null, 2));
    }

    // Step 3: Provide phone
    console.log('\n📋 Step 3: Providing phone...');
    const response3 = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
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
          }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e'
      })
    });

    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ Step 3 Response:', JSON.stringify(data3, null, 2));
    }

    // Step 4: Provide email
    console.log('\n📋 Step 4: Providing email...');
    const response4 = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
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
          }
        ],
        teamId: '01jq70jnstyfzevc6423czh50e'
      })
    });

    if (response4.ok) {
      const data4 = await response4.json();
      console.log('✅ Step 4 Response:', JSON.stringify(data4, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAgentFlow(); 