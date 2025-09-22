import { Page, expect, Locator } from '@playwright/test';

/**
 * Helper function to set up the chat interface for testing
 * Navigates to the page, waits for chat container, and returns input elements
 */
export async function setupChat(page: Page): Promise<{ input: Locator; sendButton: Locator }> {
  // Navigate to the chat interface
  await page.goto('/');
  await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
  
  // Get input elements
  const input = page.locator('[data-testid="message-input"]');
  const sendButton = page.locator('[data-testid="message-send-button"]');
  await expect(input).toBeVisible();
  await expect(sendButton).toBeVisible();
  
  return { input, sendButton };
}

/**
 * Helper function to send a message and wait for AI response
 * Combines message sending with waiting for user message and AI response
 */
export async function sendMessageAndWait(
  page: Page,
  input: Locator,
  sendButton: Locator,
  message: string,
  expectedUserCount: number,
  expectedAiCount: number
): Promise<void> {
  await fillAndSendMessage(input, sendButton, message);
  await waitForUserMessage(page, expectedUserCount);
  await waitForAiResponse(page, expectedAiCount);
}

/**
 * Helper function to fill and send a message, then wait for send readiness
 */
export async function fillAndSendMessage(
  input: Locator,
  sendButton: Locator,
  message: string
): Promise<void> {
  await input.fill(message);
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
}

/**
 * Helper function to wait for and assert user message count
 */
export async function waitForUserMessage(
  page: Page,
  expectedCount: number
): Promise<void> {
  await expect(page.locator('[data-testid="user-message"]')).toHaveCount(
    expectedCount,
    { timeout: 5000 }
  );
}

/**
 * Helper function to wait for AI response to finish streaming
 * Checks that content doesn't contain "AI is thinking" and meets length thresholds
 */
export async function waitForAiResponse(
  page: Page,
  expectedCount: number
): Promise<void> {
  // Wait for AI message to appear
  await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(
    expectedCount,
    { timeout: 10000 }
  );

  // Wait for the AI message to complete streaming
  const aiMessage = page.locator('[data-testid="ai-message"]').nth(expectedCount - 1);
  
  // Wait for content to not contain "AI is thinking" and have substantial content
  await expect(aiMessage).not.toContainText('AI is thinking', { timeout: 15000 });
  
  // Wait for message to have substantial content (more than just loading text)
  await expect(aiMessage).toHaveText(/.{10,}/, { timeout: 15000 });
}

/**
 * Helper function to verify AI is asking qualifying questions
 * Asserts AI text matches qualifying regex and does not mention contact form
 */
export function verifyQualifyingQuestions(aiMessageText: string): void {
  const QUALIFYING_QUESTION_PATTERNS = /urgent|timeline|more about what happened|serious collision|sought medical attention|spoken with.*insurance|tell me.*about|what happened|attorney|medical attention/i;
  
  // AI should be asking qualifying questions, not showing contact form
  expect(aiMessageText).not.toContain('contact form');
  expect(aiMessageText).not.toContain('Contact Information');
  
  // AI should be asking qualifying questions
  const isAskingQualifyingQuestions = QUALIFYING_QUESTION_PATTERNS.test(aiMessageText);
  expect(isAskingQualifyingQuestions).toBe(true);
}

/**
 * Helper function to detect contact form request
 * Checks for visibility of contact form or contact-related text in latest AI message
 */
export async function verifyContactFormRequest(page: Page): Promise<boolean> {
  const CONTACT_DETAILS_PATTERNS = /name|email|phone|contact form|contact information/i;
  
  // Check if contact form is visible
  const hasContactForm = await page.locator('[data-testid="contact-form"]').isVisible();
  
  if (hasContactForm) {
    return true;
  }
  
  // Check if latest AI message contains contact-related text
  const finalAiMessage = page.locator('[data-testid="ai-message"]').last();
  const finalAiMessageText = (await finalAiMessage.textContent()) ?? '';
  
  const isAskingForContactDetails = CONTACT_DETAILS_PATTERNS.test(finalAiMessageText);
  return isAskingForContactDetails;
}
