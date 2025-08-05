// Test script to verify Blawby API integration
import fetch from 'node-fetch';

async function testPaymentFlow() {
  console.log('🧪 Testing Blawby API Payment Flow...\n');

  // Step 1: Simulate the intake conversation
  const messages = [
    {
      role: 'user',
      content: 'help im getting divorced'
    },
    {
      role: 'assistant',
      content: "I'm so sorry to hear that you're going through a divorce. Can you please provide your full name"
    },
    {
      role: 'user',
      content: 'steve jobs'
    },
    {
      role: 'assistant',
      content: "Thank you Steve Jobs! Now I need to know your city and state. Can you please tell me where you're located?"
    },
    {
      role: 'user',
      content: 'charlotte nc'
    },
    {
      role: 'assistant',
      content: "Thank you Steve Jobs! Now I need your phone number so I can reach out to you with more information. Can you please provide your phone number?"
    },
    {
      role: 'user',
      content: '6159990000'
    },
    {
      role: 'assistant',
      content: "Thank you Steve Jobs! Now I need your email address so I can send you a confirmation and schedule a consultation with one of our attorneys. Can you please provide your email address?"
    },
    {
      role: 'user',
      content: 'test@example.com'
    }
  ];

  // Step 2: Call the legal intake agent with the matter creation
  const matterData = {
    name: 'Steve Jobs',
    email: 'test@example.com',
    phone: '6159990000',
    location: 'Charlotte, NC',
    matter_type: 'Family Law',
    description: 'Client involved in divorce',
    urgency: 'high',
    opposing_party: ''
  };

  console.log('📋 Matter Data:', JSON.stringify(matterData, null, 2));

  try {
    // Call the agent endpoint to simulate the conversation
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages,
        teamId: '01jq70jnstyfzevc6423czh50e', // North Carolina Legal Services
        sessionId: 'test-session-' + Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Chat Response:', JSON.stringify(result, null, 2));

    // Check if the response contains payment information
    if (result.message && result.message.includes('payment')) {
      console.log('\n💰 Payment Information Found!');
      
      // Extract payment link if present
      const paymentLinkMatch = result.message.match(/https:\/\/[^\s]+/);
      if (paymentLinkMatch) {
        const paymentLink = paymentLinkMatch[0];
        console.log('🔗 Payment Link:', paymentLink);
        
        // Check if it's a real invoice or fallback link
        if (paymentLink.includes('staging.blawby.com') || paymentLink.includes('app.blawby.com')) {
          console.log('✅ Real Blawby API invoice link detected!');
        } else {
          console.log('⚠️ Fallback payment link detected');
        }
      }
    } else {
      console.log('❌ No payment information found in response');
    }

  } catch (error) {
    console.error('❌ Error testing payment flow:', error);
  }
}

// Run the test
testPaymentFlow().catch(console.error); 