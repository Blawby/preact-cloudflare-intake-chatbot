import { test, expect, Page, TestInfo } from '@playwright/test';

// Interface for viewport configuration
interface ViewportConfig {
  width: number;
  height: number;
}

// Interface for test message data
interface TestMessageData {
  content: string;
  expectedValue: string;
}

// Interface for test fixtures and configuration
interface TestFixtures {
  mobileViewport: ViewportConfig;
  testMessages: TestMessageData[];
}

// Mobile viewport dimensions for responsive testing
const MOBILE_VIEWPORT: ViewportConfig = { width: 375, height: 667 };

// Test fixtures and data
const testFixtures: TestFixtures = {
  mobileViewport: MOBILE_VIEWPORT,
  testMessages: [
    { content: 'Hello, this is a test message', expectedValue: 'Hello, this is a test message' },
    { content: 'Test message', expectedValue: 'Test message' }
  ]
};

/**
 * Helper function to wait for chat container to be visible
 */
async function waitForChatContainer(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
}

/**
 * Helper function to get and verify message input element
 */
async function getMessageInput(page: Page): Promise<import('@playwright/test').Locator> {
  const messageInput = page.locator('[data-testid="message-input"]');
  await expect(messageInput).toBeVisible();
  await expect(messageInput).toBeEditable();
  return messageInput;
}

/**
 * Helper function to test message input functionality
 */
async function testMessageInput(messageInput: import('@playwright/test').Locator, testData: TestMessageData): Promise<void> {
  await messageInput.fill(testData.content);
  await expect(messageInput).toHaveValue(testData.expectedValue);
  await messageInput.clear();
  await expect(messageInput).toHaveValue('');
}

/**
 * Helper function to capture diagnostic information on test failure
 */
async function captureTestFailure(page: Page, error: Error, testInfo?: TestInfo): Promise<void> {
  console.error('Test failed with error:', error);
  await page.screenshot({ path: 'test-failure-screenshot.png', fullPage: true });
  throw error;
}

/**
 * 🎭 Basic E2E Test: Verify Application Loads
 * 
 * This test ensures the basic application setup works:
 * 1. Application loads successfully
 * 2. Chat interface is visible
 * 3. Message input is functional
 */
test.describe('Basic Application Tests', () => {
  test('application loads and chat interface is visible', async ({ page }: { page: Page }): Promise<void> => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the chat container to be visible
    await waitForChatContainer(page);
    
    // Verify message input is present and functional
    const messageInput = await getMessageInput(page);
    
    // Test basic input functionality using test fixtures
    await testMessageInput(messageInput, testFixtures.testMessages[0]);
  });

  test('application handles basic user interaction', async ({ page }: { page: Page }): Promise<void> => {
    try {
      await page.goto('/');
      
      // Wait for the application to load
      await waitForChatContainer(page);
      
      // Type a message using test fixtures
      const messageInput = await getMessageInput(page);
      await messageInput.fill(testFixtures.testMessages[1].content);
      
      // Press Enter to send (this will trigger the form submission)
      await messageInput.press('Enter');
      
      // Verify the input is cleared after sending
      await expect(messageInput).toHaveValue('');
    } catch (error) {
      // Capture diagnostic information before rethrowing
      await captureTestFailure(page, error as Error);
    }
  });

  test('application is responsive on mobile', async ({ page }: { page: Page }): Promise<void> => {
    // Set mobile viewport using test fixtures
    await page.setViewportSize(testFixtures.mobileViewport);
    
    await page.goto('/');
    
    // Verify chat container is still visible on mobile
    await waitForChatContainer(page);
    
    // Verify message input is still functional on mobile
    await getMessageInput(page);
  });
});
