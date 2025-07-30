const testSummaryFormat = async () => {
  const baseUrl = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';
  
  console.log('🧪 Testing Summary Format - Should show formatted summary, not tool calls...\n');
  
  const messages = [
    {
      content: "hey there my landlord is kicking me out because i refused to flush the toilet",
      isUser: true
    }
  ];
  
  console.log('📝 Initial message:', messages[0].content);
  
  // Simulate the full conversation flow
  const conversationSteps = [
    { user: "ysohi hadarki", expected: "name" },
    { user: "charlotte nc", expected: "location" },
    { user: "61588899999", expected: "phone" },
    { user: "fsdhklahsdfl@yahoo.com", expected: "email" }
  ];
  
  for (let i = 0; i < conversationSteps.length; i++) {
    const step = conversationSteps[i];
    console.log(`\n🔍 Step ${i + 1}: User provides ${step.expected}`);
    
    const response = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        teamId: 'north-carolina-legal-services'
      })
    });
    
    const result = await response.json();
    const message = result.data?.response || result.message || 'No response';
    console.log('Response:', message);
    
    // Add user response
    messages.push({
      content: step.user,
      isUser: true
    });
    messages.push({
      content: message,
      isUser: false
    });
  }
  
  // Final test - should show formatted summary
  console.log('\n🔍 Final Step: Should show formatted summary');
  const finalResponse = await fetch(`${baseUrl}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      teamId: 'north-carolina-legal-services'
    })
  });
  
  const finalResult = await finalResponse.json();
  const finalMessage = finalResult.data?.response || finalResult.message || 'No response';
  console.log('Final Response:', finalMessage);
  
  // Check if it shows tool call or formatted summary
  if (finalMessage.includes('TOOL_CALL:') || finalMessage.includes('PARAMETERS:')) {
    console.log('❌ FAILURE: Agent showing raw tool call instead of formatted summary');
  } else if (finalMessage.includes('Client Information:') || finalMessage.includes('Matter Details:')) {
    console.log('✅ SUCCESS: Agent showing formatted summary');
  } else {
    console.log('⚠️ UNKNOWN: Response format unclear');
  }
  
  console.log('\n🎯 Test completed!');
};

testSummaryFormat().catch(console.error); 