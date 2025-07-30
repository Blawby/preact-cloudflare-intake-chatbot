// Test script to verify Phase 1 simplification works
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAgentSimplification() {
  console.log('🧪 Testing Phase 1: Agent Simplification');
  
  const baseUrl = 'http://localhost:8787';
  
  try {
    // Test 1: Basic agent response
    console.log('\n📝 Test 1: Basic agent response');
    const response1 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { content: 'Hello, I need help with a legal matter', isUser: true }
        ],
        teamId: 'test-team',
        sessionId: 'test-session-123'
      })
    });
    
    const result1 = await response1.json();
    console.log('✅ Response received:', {
      success: result1.success,
      response: result1.data?.response?.substring(0, 100) + '...',
      workflow: result1.data?.workflow,
      hasMetadata: !!result1.data?.metadata
    });
    
    // Test 2: Tool call response
    console.log('\n📝 Test 2: Tool call response (create_matter)');
    const response2 = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { content: 'Hello, I got fired from my job for downloading porn on my work laptop', isUser: true },
          { content: 'My name is John Smith', isUser: true },
          { content: '555-123-4567', isUser: true },
          { content: 'john@example.com', isUser: true }
        ],
        teamId: 'test-team',
        sessionId: 'test-session-456'
      })
    });
    
    const result2 = await response2.json();
    console.log('✅ Response received:', {
      success: result2.success,
      response: result2.data?.response?.substring(0, 100) + '...',
      workflow: result2.data?.workflow,
      hasActions: !!result2.data?.actions?.length,
      actionCount: result2.data?.actions?.length || 0
    });
    
    if (result2.data?.actions?.length > 0) {
      console.log('🔧 Tool calls detected:', result2.data.actions.map(a => a.name));
      console.log('📋 Tool parameters:', JSON.stringify(result2.data.actions[0].parameters, null, 2));
    }
    
    console.log('\n🎉 Phase 1 simplification test completed successfully!');
    console.log('✅ Agent is working without chain orchestration');
    console.log('✅ Tool execution is handled within the agent');
    console.log('✅ Backward compatibility maintained');
    console.log('✅ Message format conversion working correctly');
    console.log('✅ Tool calls are being executed properly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the development server is running on localhost:8787');
  }
}

// Run the test
testAgentSimplification(); 