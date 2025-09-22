import { test, expect, type Page } from '@playwright/test';
import { setupToolCallMonitoring } from '../tests/helpers/aiMessageHelpers';

test.describe('Smoke Tests', () => {
  test('AI responds to basic message and debug overlay shows information', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Setup tool call monitoring
    await setupToolCallMonitoring(page);
    
    // Check if debug overlay is visible in development
    const debugOverlay = page.locator('[data-testid="debug-overlay"]');
    // In test environment, we'll assume it's development mode
    const isDev = true;
    
    if (isDev) {
      await expect(debugOverlay).toBeVisible({ timeout: 5000 });
    }
    
    // Send a simple message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Hello, I need help with a legal matter.');
    await messageInput.press('Enter');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 15000 });
    
    // Check if we can see tool calls in the debug overlay (if in dev mode)
    if (isDev) {
      // Wait a bit for any potential tool calls
      await page.waitForTimeout(3000);
      
      // Check if tool calls are being logged
      const toolCalls = await page.evaluate(() => (window as any).__toolCalls || []);
      console.log('Tool calls detected:', toolCalls);
      
      // Check conversation state
      const conversationState = await page.evaluate(() => (window as any).__conversationState || 'unknown');
      console.log('Conversation state:', conversationState);
    }
    
    // Verify AI responded with some content
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    await expect(aiMessage).toBeVisible();
    
    const messageContent = await aiMessage.textContent();
    expect(messageContent).toBeTruthy();
    expect(messageContent!.length).toBeGreaterThan(10);
  });
  
  test('AI can handle a more complex legal scenario', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Setup tool call monitoring
    await setupToolCallMonitoring(page);
    
    // Send a more detailed legal message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('I was in a car accident last week. The other driver hit me from behind at a red light. I have back pain and my car is damaged. I want to know if I can sue for compensation.');
    await messageInput.press('Enter');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 15000 });
    
    // Wait a bit more for any potential tool calls
    await page.waitForTimeout(5000);
    
    // Check if any tool calls were made
    const toolCalls = await page.evaluate(() => (window as any).__toolCalls || []);
    console.log('Tool calls for complex scenario:', toolCalls);
    
    // Check conversation state
    const conversationState = await page.evaluate(() => (window as any).__conversationState || 'unknown');
    console.log('Conversation state for complex scenario:', conversationState);
    
    // Verify AI responded appropriately
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    await expect(aiMessage).toBeVisible();
    
    const messageContent = await aiMessage.textContent();
    expect(messageContent).toBeTruthy();
    expect(messageContent!.length).toBeGreaterThan(20);
    
    // The AI should have asked follow-up questions or provided helpful information
    expect(messageContent!.toLowerCase()).toMatch(/accident|injury|legal|help|question/);
  });
});
