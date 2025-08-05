// Test script with mocked Blawby API responses
import fetch from 'node-fetch';

// Mock the fetch function to simulate Blawby API responses
const originalFetch = global.fetch;

// Mock successful Blawby API responses
global.fetch = async (url, options) => {
  console.log('🔍 Mock fetch called for:', url);
  
  // Mock customer creation
  if (url.includes('/api/v1/teams/') && url.includes('/customer') && options.method === 'POST') {
    console.log('✅ Mocking customer creation response');
    return {
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Customer created successfully.',
        data: {
          id: 'customer_test_123',
          name: 'Steve Jobs',
          email: 'test@example.com',
          phone: '6159990000',
          status: 'Lead'
        }
      })
    };
  }
  
  // Mock invoice creation
  if (url.includes('/api/v1/teams/') && url.includes('/invoice') && options.method === 'POST') {
    console.log('✅ Mocking invoice creation response');
    return {
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Invoice created successfully.',
        data: {
          id: 'invoice_test_456',
          customer_id: 'customer_test_123',
          amount: 7500,
          status: 'pending',
          payment_link: 'https://staging.blawby.com/pay/invoice_test_456',
          created_at: new Date().toISOString()
        }
      })
    };
  }
  
  // Mock customer search (not found)
  if (url.includes('/api/v1/teams/') && url.includes('/customers') && options.method === 'GET') {
    console.log('✅ Mocking customer search response (not found)');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        message: 'No customers found'
      })
    };
  }
  
  // For all other requests, use the original fetch
  return originalFetch(url, options);
};

async function testMockPaymentFlow() {
  console.log('🧪 Testing Mocked Blawby API Payment Flow...\n');

  // Store a test API key
  console.log('📋 Step 1: Storing test API key...');
  try {
    const storeResponse = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'Bearer test_mock_api_key',
        teamUlid: '01jq70jnstyfzevc6423czh50e'
      })
    });
    
    const storeResult = await storeResponse.json();
    console.log('✅ API key stored:', storeResult.success);
  } catch (error) {
    console.error('❌ Error storing API key:', error);
  }

  // Test the payment flow
  console.log('\n📋 Step 2: Testing payment flow...');
  const messages = [
    { role: 'user', content: 'help im getting divorced' },
    { role: 'assistant', content: "I'm so sorry to hear that you're going through a divorce. Can you please provide your full name" },
    { role: 'user', content: 'steve jobs' },
    { role: 'assistant', content: "Thank you Steve Jobs! Now I need to know your city and state. Can you please tell me where you're located?" },
    { role: 'user', content: 'charlotte nc' },
    { role: 'assistant', content: "Thank you Steve Jobs! Now I need your phone number so I can reach out to you with more information. Can you please provide your phone number?" },
    { role: 'user', content: '6159990000' },
    { role: 'assistant', content: "Thank you Steve Jobs! Now I need your email address so I can send you a confirmation and schedule a consultation with one of our attorneys. Can you please provide your email address?" },
    { role: 'user', content: 'test@example.com' }
  ];

  try {
    const response = await fetch('https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        teamId: '01jq70jnstyfzevc6423czh50e',
        sessionId: 'mock-test-session-' + Date.now()
      })
    });

    const result = await response.json();
    
    // Extract payment method from the response
    const paymentMethod = result.data?.metadata?.toolResult?.data?.payment_method;
    const paymentLink = result.data?.metadata?.toolResult?.data?.payment_link;
    
    console.log('✅ Payment Method:', paymentMethod);
    console.log('✅ Payment Link:', paymentLink);
    
    if (paymentMethod === 'blawby_api') {
      console.log('🎉 SUCCESS: Using Blawby API for payment!');
      console.log('🔗 Real invoice link:', paymentLink);
    } else if (paymentMethod === 'fallback_link') {
      console.log('⚠️ WARNING: Still using fallback payment link');
      console.log('🔍 This means the API key resolution is not working');
    } else {
      console.log('❓ Unknown payment method:', paymentMethod);
    }

    // Show the full response for debugging
    console.log('\n📋 Full Response Data:');
    console.log(JSON.stringify(result.data?.metadata?.toolResult?.data, null, 2));

  } catch (error) {
    console.error('❌ Error in payment flow:', error);
  }
}

// Run the mock test
testMockPaymentFlow().catch(console.error); 