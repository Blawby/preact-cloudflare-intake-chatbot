import { test, expect, Page, TestInfo } from '@playwright/test';
import { randomUUID } from 'crypto';

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

// Interface for structured logging context data
interface LogContextData {
  viewport?: ViewportConfig;
  messageContent?: string;
  screenshotPath?: string;
  testTitle?: string;
  testFile?: string;
  testLine?: number;
  testColumn?: number;
  testDuration?: number;
  testRetry?: number;
  testWorkerIndex?: number;
  originalError?: string;
  screenshotError?: string;
}

// Interface for structured logging context
interface LogContext {
  correlationId: string;
  testName: string;
  timestamp: string;
  operation: string;
  context?: LogContextData;
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
 * Structured logging utility for E2E tests
 */
function createLogContext(testName: string, operation: string, context?: LogContextData): LogContext {
  return {
    correlationId: randomUUID(),
    testName,
    timestamp: new Date().toISOString(),
    operation,
    context
  };
}

/**
 * Structured error logging for E2E tests
 */
function logError(message: string, error: Error, logContext: LogContext): void {
  const errorLog = {
    level: 'ERROR',
    message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...logContext
  };
  
  // Use structured logging instead of console.error
  console.log(JSON.stringify(errorLog, null, 2));
}

/**
 * Structured info logging for E2E tests
 */
function logInfo(message: string, logContext: LogContext): void {
  const infoLog = {
    level: 'INFO',
    message,
    ...logContext
  };
  
  console.log(JSON.stringify(infoLog, null, 2));
}

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
 * Helper function to safely convert unknown values to Error instances
 */
function ensureError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(String(value));
}

/**
 * Helper function to capture diagnostic information on test failure
 */
async function captureTestFailure(
  page: Page, 
  error: Error, 
  testInfo: TestInfo, 
  logContext: LogContext
): Promise<void> {
  // Generate unique screenshot path to avoid conflicts in parallel tests
  const screenshotPath = `test-failures/${logContext.correlationId}-${testInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}-failure.png`;
  
  try {
    // Capture screenshot with unique path
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    // Log structured error information
    logError('Test failure captured with diagnostic information', error, {
      ...logContext,
      context: {
        ...logContext.context,
        screenshotPath,
        testTitle: testInfo.title,
        testFile: testInfo.file,
        testLine: testInfo.line,
        testColumn: testInfo.column,
        testDuration: testInfo.duration,
        testRetry: testInfo.retry,
        testWorkerIndex: testInfo.workerIndex
      }
    });
  } catch (screenshotError) {
    // Log screenshot capture failure
    logError('Failed to capture test failure screenshot', screenshotError as Error, {
      ...logContext,
      context: {
        ...logContext.context,
        originalError: error.message,
        screenshotError: (screenshotError as Error).message
      }
    });
  }
  
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
  test('application loads and chat interface is visible', async ({ page }) => {
    const testInfo = test.info();
    const logContext = createLogContext(testInfo.title, 'application_load_test');
    
    try {
      logInfo('Starting application load test', logContext);
      
      // Navigate to the application
      await page.goto('/');
      logInfo('Application navigation completed', { ...logContext, operation: 'page_navigation' });
      
      // Wait for the chat container to be visible
      await waitForChatContainer(page);
      logInfo('Chat container is visible', { ...logContext, operation: 'chat_container_verification' });
      
      // Verify message input is present and functional
      const messageInput = await getMessageInput(page);
      logInfo('Message input is functional', { ...logContext, operation: 'message_input_verification' });
      
      // Test basic input functionality using test fixtures
      await testMessageInput(messageInput, testFixtures.testMessages[0]);
      logInfo('Message input test completed successfully', { ...logContext, operation: 'message_input_test' });
      
    } catch (error) {
      await captureTestFailure(page, ensureError(error), testInfo, logContext);
    }
  });

  test('application handles basic user interaction', async ({ page }) => {
    const testInfo = test.info();
    const logContext = createLogContext(testInfo.title, 'user_interaction_test');
    
    try {
      logInfo('Starting user interaction test', logContext);
      
      await page.goto('/');
      logInfo('Application navigation completed', { ...logContext, operation: 'page_navigation' });
      
      // Wait for the application to load
      await waitForChatContainer(page);
      logInfo('Chat container is visible', { ...logContext, operation: 'chat_container_verification' });
      
      // Type a message using test fixtures
      const messageInput = await getMessageInput(page);
      await messageInput.fill(testFixtures.testMessages[1].content);
      logInfo('Message input filled with test content', { 
        ...logContext, 
        operation: 'message_input_fill',
        context: { messageContent: testFixtures.testMessages[1].content }
      });
      
      // Press Enter to send (this will trigger the form submission)
      await messageInput.press('Enter');
      logInfo('Enter key pressed to send message', { ...logContext, operation: 'message_send' });
      
      // Verify the input is cleared after sending
      await expect(messageInput).toHaveValue('');
      logInfo('Message input cleared after sending', { ...logContext, operation: 'message_input_clear_verification' });
      
    } catch (error) {
      // Capture diagnostic information before rethrowing
      await captureTestFailure(page, ensureError(error), testInfo, logContext);
    }
  });

  test('application is responsive on mobile', async ({ page }) => {
    const testInfo = test.info();
    const logContext = createLogContext(testInfo.title, 'mobile_responsive_test');
    
    try {
      logInfo('Starting mobile responsive test', logContext);
      
      // Set mobile viewport using test fixtures
      await page.setViewportSize(testFixtures.mobileViewport);
      logInfo('Mobile viewport set', { 
        ...logContext, 
        operation: 'viewport_set',
        context: { viewport: testFixtures.mobileViewport }
      });
      
      await page.goto('/');
      logInfo('Application navigation completed on mobile', { ...logContext, operation: 'page_navigation' });
      
      // Verify chat container is still visible on mobile
      await waitForChatContainer(page);
      logInfo('Chat container is visible on mobile', { ...logContext, operation: 'chat_container_verification' });
      
      // Verify message input is still functional on mobile
      await getMessageInput(page);
      logInfo('Message input is functional on mobile', { ...logContext, operation: 'message_input_verification' });
      
    } catch (error) {
      await captureTestFailure(page, ensureError(error), testInfo, logContext);
    }
  });
});
