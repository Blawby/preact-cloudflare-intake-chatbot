import { test, expect } from '@playwright/test';

// Extend Window interface to include our debug hook
declare global {
  interface Window {
    __DEBUG_SEND_MESSAGE__?: (message: string, attachments?: any[]) => void;
  }
}

/**
 * Debug test to understand why sendMessage is not being called
 */
test.describe('Debug Message Flow', () => {
  test('Basic message sending works', async ({ page }): Promise<void> => {
    // Set up debug hooks
    await page.addInitScript(() => {
      (window as any).__DEBUG_SEND_MESSAGE__ = (message: string, attachments?: any[]) => {
        try {
          console.log('[TEST] ✅ sendMessage called:', message);
        } catch (error) {
          console.error('[TEST] ❌ Error in debug hook:', error);
        }
      };
    });
    
    try {
      // Navigate to the chat interface
      await page.goto('/');
      
      // Wait for the chat interface to load
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      
      // Find the input and send button
      const input = page.locator('[data-testid="message-input"]');
      const sendButton = page.locator('[data-testid="message-send-button"]');
      
      await expect(input).toBeVisible();
      await expect(sendButton).toBeVisible();
      
      // Fill the input
      await input.fill('Hello world');
      
      // Check if send button is enabled
      await expect(sendButton).toBeEnabled();
      
      // Try clicking the send button
      await sendButton.click();
      
      // Wait for user message to appear
      await expect(page.locator('[data-testid="user-message"]')).toHaveCount(1, { timeout: 5000 });
      
      // If we get here, the basic flow works
      console.log('✅ Basic message sending works!');
    } catch (error) {
      console.error('[TEST] ❌ Basic message sending failed:', error);
      throw error;
    }
  });
  
  test('Enter key triggers message sending', async ({ page }): Promise<void> => {
    // Set up debug hooks
    await page.addInitScript(() => {
      (window as any).__DEBUG_SEND_MESSAGE__ = (message: string, attachments?: any[]) => {
        try {
          console.log('[TEST] ✅ sendMessage called via Enter key:', message);
        } catch (error) {
          console.error('[TEST] ❌ Error in debug hook:', error);
        }
      };
    });
    
    try {
      // Navigate to the chat interface
      await page.goto('/');
      
      // Wait for the chat interface to load
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      
      // Find the input
      const input = page.locator('[data-testid="message-input"]');
      await expect(input).toBeVisible();
      
      // Fill the input and press Enter
      await input.fill('Hello via Enter key');
      await input.press('Enter');
      
      // Wait for user message to appear
      await expect(page.locator('[data-testid="user-message"]')).toHaveCount(1, { timeout: 5000 });
      
      console.log('✅ Enter key message sending works!');
    } catch (error) {
      console.error('[TEST] ❌ Enter key message sending failed:', error);
      throw error;
    }
  });
});
