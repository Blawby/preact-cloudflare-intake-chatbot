const testSimpleFlow = async () => {
  const baseUrl = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';
  
  console.log('🧪 Testing Simple Flow - Should ask for location after name...\n');
  
  const messages = [
    {
      content: "help i ran over my neighbors dog with my lawnmower",
      isUser: true
    }
  ];
  
  console.log('📝 Initial message:', messages[0].content);
  
  // Test 1: Should ask for name first
  console.log('\n🔍 Test 1: Should ask for name first');
  try {
    const response1 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'north-carolina-legal-services'
      })
    });
    
    const result1 = await response1.json();
    const message1 = result1.data?.response || result1.message || 'No response';
    console.log('Response:', message1);
    console.log('✅ Expected: Should ask for name');
    
    // Add name response
    messages.push({
      content: "steve holoy",
      isUser: true
    });
    messages.push({
      content: message1,
      isUser: false
    });
    
    // Test 2: Should ask for location
    console.log('\n🔍 Test 2: Should ask for location');
    const response2 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'north-carolina-legal-services'
      })
    });
    
    const result2 = await response2.json();
    const message2 = result2.data?.response || result2.message || 'No response';
    console.log('Response:', message2);
    
    // Check if it asks for location
    if (message2.toLowerCase().includes('city and state') || message2.toLowerCase().includes('location')) {
      console.log('✅ SUCCESS: Agent asked for location');
    } else {
      console.log('❌ FAILURE: Agent did not ask for location');
      console.log('Expected: Should ask for city and state');
      console.log('Actual:', message2);
    }
    
    console.log('\n🎯 Test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

testSimpleFlow().catch(console.error); 