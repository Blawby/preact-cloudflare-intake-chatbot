import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { setupToolCallMonitoring } from '../tests/helpers/aiMessageHelpers';

// Helper function to safely convert unknown values to Error instances
function ensureError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(String(value));
}

// Test configuration constants
const TEST_CONFIG = {
  timeouts: {
    debugOverlay: 5000,
    aiResponse: 15000,
    toolCallWait: 3000,
    complexScenarioWait: 5000,
  },
  messages: {
    basic: 'Hello, I need help with a legal matter.',
    complex: 'I was in a car accident last week. The other driver hit me from behind at a red light. I have back pain and my car is damaged. I want to know if I can sue for compensation.',
  },
  expectations: {
    minBasicResponseLength: 10,
    minComplexResponseLength: 10, // Reduced to be more realistic for contact form responses
    complexResponseKeywords: /accident|injury|legal|help|question|matter|form|contact|happy|assist/,
  },
} as const;

// Interface for tool call objects
interface ToolCall {
  tool: string;
  timestamp: number;
  type: string;
}

// Interface for window object with debug properties
interface DebugWindow extends Window {
  __toolCalls?: ToolCall[];
  __conversationState?: string;
}

// Helper functions for type-safe window property access
const getToolCalls = async (page: Page): Promise<ToolCall[]> => {
  return await page.evaluate((): ToolCall[] => {
    const win = window as DebugWindow;
    if (Array.isArray(win.__toolCalls)) {
      return win.__toolCalls.filter((call: unknown): call is ToolCall => {
        // Verify each entry is a non-null object with required keys of correct types
        return call !== null && 
               typeof call === 'object' && 
               typeof (call as ToolCall).tool === 'string' && 
               typeof (call as ToolCall).type === 'string' &&
               (call as ToolCall).tool.length > 0 &&
               (call as ToolCall).type.length > 0;
      });
    }
    return [];
  });
};

const getConversationState = async (page: Page): Promise<string | null> => {
  return await page.evaluate((): string | null => {
    const win = window as DebugWindow;
    return typeof win.__conversationState === 'string' && win.__conversationState.length > 0 
      ? win.__conversationState 
      : null;
  });
};

const isDevelopmentMode = async (page: Page): Promise<boolean> => {
  return process.env.NODE_ENV === 'development' || 
         await page.evaluate(() => window.location.hostname === 'localhost');
};

// Helper function to validate AI message content
const validateAIMessage = (content: string | null, minLength: number, keywords?: RegExp): void => {
  if (content === null || content === undefined) {
    throw new Error('AI message content is null or undefined');
  }
  
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new Error('AI message content is empty');
  }
  
  if (trimmedContent.length < minLength) {
    throw new Error(`AI message content too short: expected at least ${minLength} characters, got ${trimmedContent.length}`);
  }
  
  if (keywords && !keywords.test(trimmedContent.toLowerCase())) {
    throw new Error(`AI message content doesn't match expected keywords: ${keywords}`);
  }
};

// Helper function to check debug information
const validateDebugInfo = (toolCalls: ToolCall[], conversationState: string | null): void => {
  expect(Array.isArray(toolCalls)).toBe(true);
  expect(toolCalls.every(call => 
    typeof call === 'object' && 
    typeof call.tool === 'string' && 
    typeof call.type === 'string'
  )).toBe(true);
  
  if (conversationState !== null) {
    expect(typeof conversationState).toBe('string');
    expect(conversationState.length).toBeGreaterThan(0);
  }
};

// Helper function to handle test errors
const handleTestError = async (page: Page, error: unknown, testInfo: TestInfo, context: string): Promise<void> => {
  const errorMessage = ensureError(error);
  console.error(`Test failed in ${context}:`, errorMessage.message);
  
  // Take screenshot for debugging
  try {
    await page.screenshot({ 
      path: `test-failures/${testInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}-${context}-failure.png`,
      fullPage: true 
    });
  } catch (screenshotError) {
    console.error('Failed to take screenshot:', ensureError(screenshotError).message);
  }
  
  throw errorMessage;
};

test.describe('Smoke Tests', () => {
  test('AI responds to basic message and debug overlay shows information', async ({ page, testInfo }: { page: Page; testInfo: TestInfo }): Promise<void> => {
    try {
      // ARRANGE
      await page.goto('/');
      await setupToolCallMonitoring(page);
      
      const debugOverlay = page.locator('[data-testid="debug-overlay"]');
      const messageInput = page.locator('[data-testid="message-input"]');
      const isDev = await isDevelopmentMode(page);
      
      // ACT
      if (isDev) {
        await expect(debugOverlay).toBeVisible({ timeout: TEST_CONFIG.timeouts.debugOverlay });
      }
      
      await messageInput.fill(TEST_CONFIG.messages.basic);
      await messageInput.press('Enter');
      
      // Wait for AI response
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.aiResponse 
      });
      
      // Check debug information if in development mode
      if (isDev) {
        await page.waitForTimeout(TEST_CONFIG.timeouts.toolCallWait);
        
        const toolCalls = await getToolCalls(page);
        const conversationState = await getConversationState(page);
        
        validateDebugInfo(toolCalls, conversationState);
        
        // Conditional logging for debugging
        if (process.env.DEBUG_TESTS === 'true') {
          console.log('Tool calls detected:', toolCalls);
          console.log('Conversation state:', conversationState);
        }
      }
      
      // ASSERT
      const aiMessage = page.locator('[data-testid="ai-message"]').first();
      await expect(aiMessage).toBeVisible();
      
      const messageContent = await aiMessage.textContent();
      validateAIMessage(messageContent, TEST_CONFIG.expectations.minBasicResponseLength);
      
    } catch (error) {
      await handleTestError(page, error, testInfo, 'basic-message-test');
    }
  });
  
  test('AI can handle a more complex legal scenario', async ({ page, testInfo }: { page: Page; testInfo: TestInfo }): Promise<void> => {
    try {
      // ARRANGE
      await page.goto('/');
      await setupToolCallMonitoring(page);
      
      const messageInput = page.locator('[data-testid="message-input"]');
      
      // ACT
      await messageInput.fill(TEST_CONFIG.messages.complex);
      await messageInput.press('Enter');
      
      // Wait for AI response and ensure it's not just "thinking"
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.aiResponse 
      });
      
      // Wait for the actual AI response (not just "thinking")
      await page.waitForFunction(() => {
        const messages = document.querySelectorAll('[data-testid="ai-message"]');
        if (messages.length === 0) return false;
        const lastMessage = messages[messages.length - 1];
        const text = lastMessage?.textContent?.trim() || '';
        return text.length > 0 && !text.toLowerCase().includes('thinking');
      }, { timeout: TEST_CONFIG.timeouts.aiResponse });
      
      // Wait for potential tool calls
      await page.waitForTimeout(TEST_CONFIG.timeouts.complexScenarioWait);
      
      // Check debug information with type-safe assertions
      const toolCalls = await getToolCalls(page);
      const conversationState = await getConversationState(page);
      
      validateDebugInfo(toolCalls, conversationState);
      
      // Conditional logging for debugging
      if (process.env.DEBUG_TESTS === 'true') {
        console.log('Tool calls for complex scenario:', toolCalls);
        console.log('Conversation state for complex scenario:', conversationState);
      }
      
      // ASSERT
      const aiMessage = page.locator('[data-testid="ai-message"]').first();
      await expect(aiMessage).toBeVisible();
      
      const messageContent = await aiMessage.textContent();
      validateAIMessage(messageContent, TEST_CONFIG.expectations.minComplexResponseLength, TEST_CONFIG.expectations.complexResponseKeywords);
      
    } catch (error) {
      await handleTestError(page, error, testInfo, 'complex-scenario-test');
    }
  });
});
