const testSensitiveMatters = async () => {
  const baseUrl = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';
  
  console.log('🧪 Testing Sensitive Legal Matters - Should handle divorce/marital issues properly...\n');
  
  const testCases = [
    {
      name: "Divorce/Cheating Case",
      initialMessage: "yo i cheated on my wife and bnow she wants all my money",
      expectedBehavior: "Should proceed with intake, not reject"
    },
    {
      name: "Custody Case", 
      initialMessage: "my ex is trying to take my kids away from me",
      expectedBehavior: "Should proceed with intake, not reject"
    },
    {
      name: "Criminal Case",
      initialMessage: "i got arrested for drunk driving last night",
      expectedBehavior: "Should proceed with intake, not reject"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`📝 Message: "${testCase.initialMessage}"`);
    console.log(`🎯 Expected: ${testCase.expectedBehavior}`);
    
    const messages = [
      {
        content: testCase.initialMessage,
        isUser: true
      }
    ];
    
    try {
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
      
      // Check if agent rejects or proceeds
      const rejectionPhrases = [
        'cannot provide legal advice',
        'suggest you seek',
        'professional help',
        'not a lawyer',
        'cannot help'
      ];
      
      const isRejecting = rejectionPhrases.some(phrase => 
        message.toLowerCase().includes(phrase.toLowerCase())
      );
      
      if (isRejecting) {
        console.log('❌ FAILURE: Agent rejected the case instead of proceeding with intake');
      } else if (message.toLowerCase().includes('name') || message.toLowerCase().includes('full name')) {
        console.log('✅ SUCCESS: Agent proceeding with normal intake process');
      } else {
        console.log('⚠️ UNKNOWN: Response unclear - neither rejecting nor asking for name');
      }
      
    } catch (error) {
      console.error('❌ Test failed with error:', error);
    }
  }
  
  console.log('\n🎯 All tests completed!');
};

testSensitiveMatters().catch(console.error); 