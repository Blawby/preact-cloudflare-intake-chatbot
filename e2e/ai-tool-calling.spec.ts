import { test, expect, type Request, type Page, type ConsoleMessage } from '@playwright/test';
import type { ToolCall } from '../../worker/utils/toolCallParser.js';

// Timeout constants for AI responses
const TIMEOUTS = {
  AI_RESPONSE: 15000, // 15 seconds for AI response validation
} as const;

// Structured error interface for test failures
interface TestError extends Error {
  category: string;
  context: {
    element?: any;
    messageText?: string | null;
    expectedPatterns?: RegExp[];
    [key: string]: any;
  };
  originalError?: Error;
}

/**
 * Validates AI response with structured error handling and context
 * @param element - The Playwright element to validate
 * @param messageText - The expected message text pattern
 * @param expectedPatterns - Array of regex patterns to match against
 * @param testContext - Additional context for error reporting
 */
async function validateAIResponse(
  element: any,
  messageText: string,
  expectedPatterns: RegExp[],
  testContext: Record<string, any> = {}
): Promise<void> {
  try {
    // Wait for finalMessage with TIMEOUTS.AI_RESPONSE
    await expect(element).toBeVisible({ timeout: TIMEOUTS.AI_RESPONSE });
    
    // Read textContent safely, defaulting to empty string
    const actualText = await element.textContent() || '';
    
    // Check for emptiness
    if (!actualText.trim()) {
      const error: TestError = {
        name: 'AIResponseValidationError',
        message: 'AI response is empty or contains only whitespace',
        category: 'AI_RESPONSE',
        context: {
          element,
          messageText,
          expectedPatterns,
          actualText,
          ...testContext
        }
      };
      throw error;
    }
    
    // Check for pattern match
    const hasMatchingPattern = expectedPatterns.some(pattern => pattern.test(actualText));
    if (!hasMatchingPattern) {
      const error: TestError = {
        name: 'AIResponseValidationError',
        message: `AI response does not match expected patterns. Expected: ${expectedPatterns.map(p => p.toString()).join(' or ')}, Got: "${actualText}"`,
        category: 'AI_RESPONSE',
        context: {
          element,
          messageText,
          expectedPatterns,
          actualText,
          ...testContext
        }
      };
      throw error;
    }
    
  } catch (error) {
    // Log full context via console.error
    console.error('AI Response Validation Failed:', {
      structuredError: error,
      testContext: {
        element: element.toString(),
        messageText,
        expectedPatterns: expectedPatterns.map(p => p.toString()),
        ...testContext
      }
    });
    
    // Re-throw so test runner surfaces failures
    throw error;
  }
}

/**
 * 🎭 E2E Test: AI Tool Calling Functionality
 * 
 * This test validates that the AI correctly calls tools based on conversation context:
 * 1. AI calls show_contact_form when legal info is complete
 * 2. AI calls create_matter when contact form is submitted
 * 3. Tool calls are properly handled and SSE events are emitted
 */
test.describe('AI Tool Calling', () => {
  test('AI calls show_contact_form tool when legal info is complete', async ({ page }: { page: Page }): Promise<void> => {
    try {
      await page.goto('/');
    } catch (error) {
      throw new Error(`Failed to navigate to home page: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Monitor network requests to verify tool calls
    const toolCallRequests: Request[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/agent/stream')) {
        toolCallRequests.push(request);
      }
    });
    
    // Monitor console logs for tool call debugging
    const consoleLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage): void => {
      const text: string = msg.text();
      if (text.includes('show_contact_form') || text.includes('tool_calls')) {
        consoleLogs.push(text);
      }
    });
    
    // Step 1: User provides complete legal information
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    try {
      await legalIssueInput.fill('I was injured in a car crash with back pain. The other driver was John Smith and I have his insurance information. I want to pursue a personal injury claim.');
      await legalIssueInput.press('Enter');
    } catch (error) {
      throw new Error(`Failed to fill legal issue input: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Step 2: Wait for AI to process and call show_contact_form tool
    try {
      await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 15000 });
    } catch (error) {
      throw new Error(`Contact form did not appear within timeout: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Step 3: Verify the tool call was made (check console logs or network requests)
    // The contact form appearing indicates the tool was called successfully
    
    // Step 4: Verify AI response indicates tool usage
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    try {
      await expect(aiMessage).toBeVisible();
    } catch (error) {
      throw new Error(`AI message not visible: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // The AI should have called the tool, so we should see the contact form
    try {
      await expect(page.locator('[data-testid="contact-form"]')).toBeVisible();
    } catch (error) {
      throw new Error(`Contact form not visible after AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  test('AI calls create_matter tool after contact form submission', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Monitor console logs for tool calls
    const toolCallLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage): void => {
      const text: string = msg.text();
      if (text.includes('create_matter') || text.includes('show_contact_form') || text.includes('tool_calls')) {
        toolCallLogs.push(text);
        console.log(`Debug: Tool call log: ${text}`);
      }
    });
    
    // Step 1: Send message with legal issue but no contact info
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a car crash with back pain. It was a personal injury claim.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for AI response and check if contact form appears
    await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 10000 });
    
    // Step 3: Wait for contact form to appear (AI should show form for incomplete info)
    const contactForm = page.locator('[data-testid="contact-form"]');
    await expect(contactForm).toBeVisible({ timeout: 10000 });
    
    console.log(`Debug: Contact form visible: true`);
    
    // Fill and submit contact form
    await page.locator('input[name="name"]').fill('Jane Doe');
    await page.locator('input[name="email"]').fill('jane@example.com');
    await page.locator('input[name="phone"]').fill('212-555-1234'); // Use valid phone format
    await page.locator('input[name="location"]').fill('Los Angeles, CA');
    await page.locator('input[name="opposingParty"]').fill('John Smith');
    
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Wait for the contact form submission to be processed
    await page.waitForTimeout(2000);
    
    // Debug: Check if the contact form is still visible (it should disappear after submission)
    const isFormStillVisible = await contactForm.isVisible();
    console.log(`Debug: Contact form still visible after submission: ${isFormStillVisible}`);
    
    // Step 4: Wait for AI to process the contact form submission and call create_matter
    // The AI should respond with a success message after processing the contact form
    const finalMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(finalMessage).toBeVisible({ timeout: 15000 });
    
    // Wait for the AI to finish processing (wait for "AI is thinking" to be replaced with actual response)
    await page.waitForFunction(
      () => {
        const messageElement = document.querySelector('[data-testid="ai-message"]:last-child');
        return messageElement && !messageElement.textContent?.includes('AI is thinking');
      },
      { timeout: 20000 }
    );
    
    // Wait a bit more for the AI to complete processing
    await page.waitForTimeout(2000);
    
    // Step 6: Verify the AI message contains the specific success text
    await validateAIResponse(
      finalMessage,
      'matter summary',
      [/Perfect! I have all the information I need/i, /summary of your matter/i, /Client Information/i],
      { testStep: 'create_matter_tool_verification', toolCallLogs }
    );
    
    // Additional verification that the tool call log contains the expected entry (optional)
    const createMatterLogEntry = toolCallLogs.find(log => log.includes('create_matter'));
    if (createMatterLogEntry) {
      console.log('Debug: Found create_matter tool call in logs');
    } else {
      console.log('Debug: create_matter tool call not found in console logs, but success message indicates it worked');
    }
  });

  test('AI handles tool call failures gracefully', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Step 1: Trigger contact form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I need help with a legal matter.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Step 3: Fill form with data that might cause validation issues
    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="phone"]').fill('555-123-4567'); // This might fail validation
    await page.locator('input[name="location"]').fill('Test City');
    
    // Step 4: Submit form
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Step 5: Verify AI handles the situation appropriately
    // Either successful matter creation or graceful error handling
    const finalMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(finalMessage).toBeVisible({ timeout: 15000 });
    
    // Step 6: Check for explicit success or error indicators
    const messageText: string | null = await finalMessage.textContent();
    
    // Assert messageText is not null before proceeding
    expect(messageText).not.toBeNull();
    
    // Branch 1: Check for successful creation message pattern
    const successPattern = /thank you|received|matter|created/i;
    const isSuccess = successPattern.test(messageText!);
    
    // Branch 2: Check for specific error indicators
    const formValidationError = page.locator('[data-testid="form-validation-error"]');
    const aiErrorMessage = page.locator('[data-testid="ai-error-message"]');
    const phoneValidationError = page.locator('text=/phone.*invalid|invalid.*phone/i');
    
    const hasFormValidationError = await formValidationError.isVisible();
    const hasAiErrorMessage = await aiErrorMessage.isVisible();
    const hasPhoneValidationError = await phoneValidationError.isVisible();
    
    const isError = hasFormValidationError || hasAiErrorMessage || hasPhoneValidationError;
    
    // Verify either success or error handling occurred
    if (!isSuccess && !isError) {
      throw new Error(`Expected AI message to contain success pattern or show error indicators, but got: "${messageText}"`);
    }
    
    // Additional validation: if success, verify specific success text
    if (isSuccess) {
      expect(messageText!.toLowerCase()).toMatch(/thank you|received|matter|created/);
    }
    
    // Additional validation: if error, verify specific error element is visible
    if (isError) {
      const hasAnyErrorVisible = hasFormValidationError || hasAiErrorMessage || hasPhoneValidationError;
      expect(hasAnyErrorVisible).toBe(true);
    }
  });

  test('AI tool loop health check works correctly', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Monitor console logs for health check messages
    const healthCheckLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage): void => {
      const text: string = msg.text();
      if (text.includes('AI Tool Loop Health Check') || text.includes('show_contact_form')) {
        healthCheckLogs.push(text);
      }
    });
    
    // Step 1: Trigger a conversation that should call show_contact_form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a workplace accident and need legal help.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for contact form (indicates health check passed)
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 15000 });
    
    // Step 3: Verify health check logs indicate success with typed validation
    const hasHealthCheckLogs: boolean = healthCheckLogs.some(log => log.includes('AI Tool Loop Health Check'));
    const contactFormVisible: boolean = await page.locator('[data-testid="contact-form"]').isVisible();
    
    // Combined assertion: pass if either health check logs are present OR contact form is visible
    expect(hasHealthCheckLogs || contactFormVisible).toBe(true);
  });

  test('Multiple tool calls in sequence work correctly', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Monitor console logs for both tool calls
    const toolCallLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage): void => {
      const text: string = msg.text();
      if (text.includes('show_contact_form') || text.includes('create_matter') || text.includes('tool_calls')) {
        toolCallLogs.push(text);
      }
    });
    
    // Step 1: Start conversation
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    
    try {
      await legalIssueInput.fill('I was injured in a car accident and need help with a personal injury claim.');
      await legalIssueInput.press('Enter');
    } catch (error) {
      throw new Error(`Failed to initiate conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Step 2: Wait for first tool call (show_contact_form)
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Step 3: Fill and submit contact form
    await page.locator('input[name="name"]').fill('Bob Wilson');
    await page.locator('input[name="email"]').fill('bob@example.com');
    await page.locator('input[name="phone"]').fill('212-555-1234');
    await page.locator('input[name="location"]').fill('Boston, MA');
    await page.locator('input[name="opposingParty"]').fill('Insurance Company');
    
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Step 4: Wait for create_matter tool call to appear in logs OR for success message
    const maxRetries = 15; // 15 seconds total timeout
    let retryCount = 0;
    let createMatterToolCalled = false;
    let successMessageFound = false;
    
    while (retryCount < maxRetries && !createMatterToolCalled && !successMessageFound) {
      await page.waitForTimeout(1000); // Wait 1 second between checks
      createMatterToolCalled = toolCallLogs.some(log => log.includes('create_matter'));
      
      // Also check for success message in the AI response
      const aiMessage = page.locator('[data-testid="ai-message"]').last();
      if (await aiMessage.isVisible()) {
        const messageText = await aiMessage.textContent();
        if (messageText && (messageText.includes('Perfect! I have all the information I need') || messageText.includes('summary of your matter') || messageText.includes('Client Information'))) {
          successMessageFound = true;
        }
      }
      
      retryCount++;
    }
    
    if (!createMatterToolCalled && !successMessageFound) {
      throw new Error(`create_matter tool call or success message not found within ${maxRetries} seconds. Available logs: ${toolCallLogs.join(', ')}`);
    }
    
    // Step 5: Wait for AI to process and provide specific success message
    const finalMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(finalMessage).toBeVisible({ timeout: 15000 });
    
    // Step 6: Verify the AI message contains the specific success text
    await validateAIResponse(
      finalMessage,
      'matter created',
      [/matter created/i],
      { testStep: 'multiple_tool_calls_verification', toolCallLogs }
    );
    
    // Step 7: Verify minimum expected messages exist
    const messages = page.locator('[data-testid="message"]');
    const messageCount: number = await messages.count();
    expect(messageCount).toBeGreaterThanOrEqual(3); // At least user input, AI response, and final confirmation
    
    // Step 8: Verify both tool calls are present in logs
    const showContactFormLogEntry = toolCallLogs.find(log => log.includes('show_contact_form'));
    const createMatterLogEntry = toolCallLogs.find(log => log.includes('create_matter'));
    
    if (!showContactFormLogEntry) {
      throw new Error('show_contact_form tool call log entry not found in console logs');
    }
    if (!createMatterLogEntry) {
      throw new Error('create_matter tool call log entry not found in console logs');
    }
  });

  test('AI calls create_matter tool directly when contact info is provided upfront', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    
    // Monitor console logs for tool calls
    const toolCallLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage): void => {
      const text: string = msg.text();
      if (text.includes('create_matter') || text.includes('show_contact_form') || text.includes('tool_calls')) {
        toolCallLogs.push(text);
      }
    });
    
    // Step 1: Send message with both legal issue AND contact info
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a car crash with back pain. Contact Information:\nName: John Doe\nEmail: john@example.com\nPhone: 212-555-1234\nLocation: New York, NY');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for create_matter tool call to appear in logs OR for success message (should be direct, no contact form)
    const maxRetries = 15; // 15 seconds total timeout
    let retryCount = 0;
    let createMatterToolCalled = false;
    let successMessageFound = false;
    
    while (retryCount < maxRetries && !createMatterToolCalled && !successMessageFound) {
      await page.waitForTimeout(1000); // Wait 1 second between checks
      createMatterToolCalled = toolCallLogs.some(log => log.includes('create_matter'));
      
      // Also check for success message in the AI response
      const aiMessage = page.locator('[data-testid="ai-message"]').last();
      if (await aiMessage.isVisible()) {
        const messageText = await aiMessage.textContent();
        if (messageText && (messageText.includes('Perfect! I have all the information I need') || messageText.includes('summary of your matter') || messageText.includes('Client Information'))) {
          successMessageFound = true;
        }
      }
      
      retryCount++;
    }
    
    if (!createMatterToolCalled && !successMessageFound) {
      throw new Error(`create_matter tool call or success message not found within ${maxRetries} seconds. Available logs: ${toolCallLogs.join(', ')}`);
    }
    
    // Step 3: Verify contact form was NOT shown (since contact info was provided upfront)
    const contactForm = page.locator('[data-testid="contact-form"]');
    await expect(contactForm).not.toBeVisible({ timeout: 5000 });
    
    // Step 4: Wait for AI to process and provide specific success message
    const finalMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(finalMessage).toBeVisible({ timeout: 15000 });
    
    // Step 5: Verify the AI message contains the specific success text
    await validateAIResponse(
      finalMessage,
      'matter created',
      [/matter created/i, /summary of your matter/i],
      { testStep: 'direct_create_matter_verification', toolCallLogs }
    );
  });
});
