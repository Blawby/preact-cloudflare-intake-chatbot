import { Page } from '@playwright/test';

// Constants for AI message testing
const DEFAULT_TIMEOUT_MS = 20000;
const MIN_MESSAGE_CONTENT_LENGTH = 50;

/**
 * Waits for a specific tool call to be made by the AI
 * @param page - Playwright page object
 * @param toolName - Name of the tool to wait for (e.g., 'show_contact_form', 'create_matter')
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 */
export async function waitForToolCall(
  page: Page, 
  toolName: string, 
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (name) => {
      const logs = (window as any).__toolCalls || [];
      return logs.some((log: any) => log.tool === name);
    },
    toolName,
    { timeout }
  );
}

/**
 * Sets up tool call monitoring by injecting a global variable to track tool calls
 * @param page - Playwright page object
 */
export async function setupToolCallMonitoring(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__toolCalls = [];
  });
}

/**
 * Waits for an AI message to complete streaming by checking that it:
 * 1. Is visible
 * 2. Does not contain "AI is thinking" text
 * 3. Has substantial content (at least MIN_MESSAGE_CONTENT_LENGTH characters)
 * 
 * @param page - Playwright page object
 * @param messageIndex - Zero-based index of the AI message to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: DEFAULT_TIMEOUT_MS)
 */
export async function waitForCompleteAiMessage(
  page: Page, 
  messageIndex: number, 
  timeout: number = DEFAULT_TIMEOUT_MS
): Promise<void> {
  // Validate messageIndex parameter
  if (typeof messageIndex !== 'number' || !Number.isInteger(messageIndex) || messageIndex < 0) {
    throw new RangeError('messageIndex must be a non-negative integer');
  }
  
  const selector = '[data-testid="ai-message"]';
  const aiMessage = page.locator(selector).nth(messageIndex);
  
  try {
    // Wait for the message to be visible
    await aiMessage.waitFor({ state: 'visible', timeout });
  } catch (error) {
    const currentUrl = page.url();
    const contextMessage = `waitForCompleteAiMessage: Failed to wait for AI message visibility. ` +
      `Selector: '${selector}', messageIndex: ${messageIndex}, timeout: ${timeout}ms, currentUrl: ${currentUrl}. ` +
      `Original error: ${error instanceof Error ? error.message : String(error)}`;
    
    throw new Error(contextMessage);
  }
  
  try {
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
        selector, 
        index: messageIndex, 
        minLength: MIN_MESSAGE_CONTENT_LENGTH 
      },
      { timeout }
    );
  } catch (error) {
    const currentUrl = page.url();
    const contextMessage = `waitForCompleteAiMessage: Failed to wait for AI message completion. ` +
      `Selector: '${selector}', messageIndex: ${messageIndex}, timeout: ${timeout}ms, minLength: ${MIN_MESSAGE_CONTENT_LENGTH}, currentUrl: ${currentUrl}. ` +
      `Original error: ${error instanceof Error ? error.message : String(error)}`;
    
    throw new Error(contextMessage);
  }
}

/**
 * Waits for the last AI message to complete streaming
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (default: DEFAULT_TIMEOUT_MS)
 */
export async function waitForLastCompleteAiMessage(
  page: Page, 
  timeout: number = DEFAULT_TIMEOUT_MS
): Promise<void> {
  const aiMessage = page.locator('[data-testid="ai-message"]').last();
  const minLength = MIN_MESSAGE_CONTENT_LENGTH;
  
  try {
    // Wait for the message to be visible
    await aiMessage.waitFor({ state: 'visible', timeout });
  } catch (error) {
    throw new Error(
      `waitForLastCompleteAiMessage: Failed to wait for AI message visibility. ` +
      `Selector: '[data-testid="ai-message"]', timeout: ${timeout}ms. ` +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  
  try {
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
        minLength 
      },
      { timeout }
    );
  } catch (error) {
    throw new Error(
      `waitForLastCompleteAiMessage: Failed to wait for AI message completion. ` +
      `Selector: '[data-testid="ai-message"]', timeout: ${timeout}ms, minLength: ${minLength}. ` +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
