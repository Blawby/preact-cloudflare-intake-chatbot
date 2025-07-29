// Test for the intake chain
import { runIntakeChain } from './intakeChain.js';

// Mock environment for testing
const mockEnv = {
  AI: {
    run: async (model, options) => {
      // Mock AI responses for testing
      const { messages } = options;
      const lastMessage = messages[0].content;
      
      if (lastMessage.includes('workflow')) {
        return {
          response: '{"workflow": "MATTER_CREATION", "confidence": 0.8, "reasoning": "User wants to create a legal matter"}'
        };
      }
      
      if (lastMessage.includes('matter_type')) {
        return {
          response: '{"matter_type": "Family Law", "urgency": "medium", "complexity": 6, "intent": "matter_creation", "estimated_value": 5000}'
        };
      }
      
      if (lastMessage.includes('full_name')) {
        return {
          response: '{"full_name": "John Doe", "email": "john@example.com", "phone": "555-1234", "matter_description": "Divorce case", "opposing_party": "Jane Doe"}'
        };
      }
      
      if (lastMessage.includes('quality_score')) {
        return {
          response: '{"quality_score": 85, "completeness_score": 90, "clarity_score": 80, "requires_human_review": false, "recommendations": ["Good information provided"]}'
        };
      }
      
      if (lastMessage.includes('action')) {
        return {
          response: '{"action": "request_lawyer_approval", "priority": "medium", "reasoning": "Complete information provided, ready for lawyer review"}'
        };
      }
      
      return { response: '{"error": "Unknown prompt"}' };
    }
  }
};

export async function testIntakeChain() {
  console.log('🧪 Testing Intake Chain...');
  
  try {
    const result = await runIntakeChain({
      message: "I need help with a divorce case",
      teamId: "test-team-id",
      sessionId: "test-session-id",
      env: mockEnv
    });
    
    console.log('✅ Test Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Test Failed:', error);
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIntakeChain().catch(console.error);
} 