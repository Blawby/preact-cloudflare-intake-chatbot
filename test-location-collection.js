const testLocationCollection = async () => {
  const baseUrl = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';
  
  console.log('🧪 Testing Location Collection Flow...\n');
  
  const messages = [
    {
      content: "help i got fired for slapping a kid at school i teach a hs math class",
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
      content: "yoshi tagari",
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
    console.log('✅ Expected: Should ask for city and state');
    
    // Add location response
    messages.push({
      content: "charlotte nc",
      isUser: true
    });
    messages.push({
      content: message2,
      isUser: false
    });
    
    // Test 3: Should ask for phone
    console.log('\n🔍 Test 3: Should ask for phone');
    const response3 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'north-carolina-legal-services'
      })
    });
    
    const result3 = await response3.json();
    const message3 = result3.data?.response || result3.message || 'No response';
    console.log('Response:', message3);
    console.log('✅ Expected: Should ask for phone number');
    
    // Add phone response
    messages.push({
      content: "6158888999",
      isUser: true
    });
    messages.push({
      content: message3,
      isUser: false
    });
    
    // Test 4: Should ask for email
    console.log('\n🔍 Test 4: Should ask for email');
    const response4 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'north-carolina-legal-services'
      })
    });
    
    const result4 = await response4.json();
    const message4 = result4.data?.response || result4.message || 'No response';
    console.log('Response:', message4);
    console.log('✅ Expected: Should ask for email address');
    
    // Add email response
    messages.push({
      content: "ajfksdhls@yahoo.com",
      isUser: true
    });
    messages.push({
      content: message4,
      isUser: false
    });
    
    // Test 5: Should create matter with location
    console.log('\n🔍 Test 5: Should create matter with location');
    const response5 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'north-carolina-legal-services'
      })
    });
    
    const result5 = await response5.json();
    const finalMessage = result5.data?.response || result5.message || 'No response';
    console.log('Response:', finalMessage);
    console.log('✅ Expected: Should create matter and include location in summary');
    
    // Check if location appears in summary
    if (finalMessage && typeof finalMessage === 'string' && (finalMessage.includes('Charlotte, NC') || finalMessage.includes('charlotte nc'))) {
      console.log('✅ SUCCESS: Location found in summary');
    } else {
      console.log('❌ FAILURE: Location missing from summary');
      console.log('Summary should include location but shows:', finalMessage);
    }
    
    console.log('\n🎯 Test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

testLocationCollection().catch(console.error); 