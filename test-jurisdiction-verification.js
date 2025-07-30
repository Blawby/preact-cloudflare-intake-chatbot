// Test script for jurisdiction verification
const testJurisdictionVerification = async () => {
  console.log('🧪 Testing Jurisdiction Verification...\n');

  const testCases = [
    {
      name: 'North Carolina Legal Services - NC Resident',
      teamId: 'north-carolina-legal-services',
      location: 'Charlotte, NC',
      expected: 'supported'
    },
    {
      name: 'North Carolina Legal Services - Out of State',
      teamId: 'north-carolina-legal-services',
      location: 'Los Angeles, CA',
      expected: 'not supported'
    },
    {
      name: 'Blawby AI - National Service',
      teamId: 'blawby-ai',
      location: 'New York, NY',
      expected: 'supported'
    },
    {
      name: 'Blawby AI - International',
      teamId: 'blawby-ai',
      location: 'Toronto, Canada',
      expected: 'supported'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch('http://localhost:8787/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `I'm from ${testCase.location} and need legal help`
            }
          ],
          teamId: testCase.teamId,
          sessionId: `test-jurisdiction-${Date.now()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Response: ${result.message.substring(0, 100)}...`);
        
        if (testCase.expected === 'supported' && result.message.includes('can help')) {
          console.log('✅ PASS: Correctly identified as supported\n');
        } else if (testCase.expected === 'not supported' && result.message.includes('cannot assist')) {
          console.log('✅ PASS: Correctly identified as not supported\n');
        } else {
          console.log('❌ FAIL: Unexpected response\n');
        }
      } else {
        console.log(`❌ HTTP Error: ${response.status}\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  console.log('🏁 Jurisdiction verification test completed!');
};

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  testJurisdictionVerification();
} 