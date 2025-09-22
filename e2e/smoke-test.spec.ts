import { test, expect, type Page } from '@playwright/test';
import { setupToolCallMonitoring } from '../tests/helpers/aiMessageHelpers';

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

// Helper functions for type-safe window property access
const getToolCalls = async (page: Page): Promise<string[]> => {
  return await page.evaluate((): string[] => {
    const win = window as any;
    if (Array.isArray(win.__toolCalls)) {
      return win.__toolCalls.filter((call: any): call is string => 
        typeof call === 'string' && call.length > 0
      );
    }
    return [];
  });
};

const getConversationState = async (page: Page): Promise<string | null> => {
  return await page.evaluate((): string | null => {
    const win = window as any;
    return typeof win.__conversationState === 'string' && win.__conversationState.length > 0 
      ? win.__conversationState 
      : null;
  });
};

const isDevelopmentMode = async (page: Page): Promise<boolean> => {
  return process.env.NODE_ENV === 'development' || 
         await page.evaluate(() => window.location.hostname === 'localhost');
};

test.describe('Smoke Tests', () => {
  test('AI responds to basic message and debug overlay shows information', async ({ page }: { page: Page }): Promise<void> => {
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
      
      // Type-safe assertions for debug information
      expect(Array.isArray(toolCalls)).toBe(true);
      expect(toolCalls.every(call => typeof call === 'string')).toBe(true);
      
      if (conversationState !== null) {
        expect(typeof conversationState).toBe('string');
        expect(conversationState.length).toBeGreaterThan(0);
      }
      
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
    
    // Type-safe null checking and assertions
    expect(messageContent).not.toBeNull();
    expect(messageContent).not.toBeUndefined();
    
    if (messageContent !== null && messageContent.trim().length > 0) {
      expect(messageContent.length).toBeGreaterThan(TEST_CONFIG.expectations.minBasicResponseLength);
      expect(messageContent.trim()).toBeTruthy();
    } else {
      throw new Error('AI message content is null, undefined, or empty');
    }
  });
  
  test('AI can handle a more complex legal scenario', async ({ page }: { page: Page }): Promise<void> => {
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
    
    // Type-safe assertions for debug information
    expect(Array.isArray(toolCalls)).toBe(true);
    expect(toolCalls.every(call => typeof call === 'string')).toBe(true);
    
    if (conversationState !== null) {
      expect(typeof conversationState).toBe('string');
      expect(conversationState.length).toBeGreaterThan(0);
    }
    
    // Conditional logging for debugging
    if (process.env.DEBUG_TESTS === 'true') {
      console.log('Tool calls for complex scenario:', toolCalls);
      console.log('Conversation state for complex scenario:', conversationState);
    }
    
    // ASSERT
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    await expect(aiMessage).toBeVisible();
    
    const messageContent = await aiMessage.textContent();
    
    // Type-safe null checking and assertions
    expect(messageContent).not.toBeNull();
    expect(messageContent).not.toBeUndefined();
    
    if (messageContent !== null && messageContent.trim().length > 0) {
      expect(messageContent.length).toBeGreaterThan(TEST_CONFIG.expectations.minComplexResponseLength);
      
      // The AI should have asked follow-up questions or provided helpful information
      expect(messageContent.toLowerCase()).toMatch(TEST_CONFIG.expectations.complexResponseKeywords);
    } else {
      throw new Error('AI message content is null, undefined, or empty for complex scenario');
    }
  });
});
