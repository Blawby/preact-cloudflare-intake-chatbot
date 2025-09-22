import { Page } from '@playwright/test';

/**
 * Waits for an AI message to complete streaming by checking that it:
 * 1. Is visible
 * 2. Does not contain "AI is thinking" text
 * 3. Has substantial content (at least 50 characters)
 * 
 * @param page - Playwright page object
 * @param messageIndex - Zero-based index of the AI message to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 20000)
 */
export async function waitForCompleteAiMessage(
  page: Page, 
  messageIndex: number, 
  timeout: number = 20000
): Promise<void> {
  const aiMessage = page.locator('[data-testid="ai-message"]').nth(messageIndex);
  
  // Wait for the message to be visible
  await aiMessage.waitFor({ state: 'visible', timeout });
  
  // Wait for the message to not contain "AI is thinking" and have substantial content
  await page.waitForFunction(
    ({ selector, index, minLength }) => {
      const messages = document.querySelectorAll(selector);
      const message = messages[index];
      
      if (!message) return false;
      
      const text = message.textContent || '';
      const isNotThinking = !text.includes('AI is thinking');
      const hasSubstantialContent = text.length >= minLength;
      
      return isNotThinking && hasSubstantialContent;
    },
    { 
      selector: '[data-testid="ai-message"]', 
      index: messageIndex, 
      minLength: 50 
    },
    { timeout }
  );
}

/**
 * Waits for the last AI message to complete streaming
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: 20000)
 */
export async function waitForLastCompleteAiMessage(
  page: Page, 
  timeout: number = 20000
): Promise<void> {
  const aiMessage = page.locator('[data-testid="ai-message"]').last();
  
  // Wait for the message to be visible
  await aiMessage.waitFor({ state: 'visible', timeout });
  
  // Wait for the message to not contain "AI is thinking" and have substantial content
  await page.waitForFunction(
    ({ selector, minLength }) => {
      const messages = document.querySelectorAll(selector);
      const lastMessage = messages[messages.length - 1];
      
      if (!lastMessage) return false;
      
      const text = lastMessage.textContent || '';
      const isNotThinking = !text.includes('AI is thinking');
      const hasSubstantialContent = text.length >= minLength;
      
      return isNotThinking && hasSubstantialContent;
    },
    { 
      selector: '[data-testid="ai-message"]', 
      minLength: 50 
    },
    { timeout }
  );
}
