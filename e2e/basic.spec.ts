import { test, expect } from '@playwright/test';

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
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the chat container to be visible
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Verify message input is present and functional
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toBeEditable();
    
    // Test basic input functionality
    await messageInput.fill('Hello, this is a test message');
    await expect(messageInput).toHaveValue('Hello, this is a test message');
    
    // Clear the input
    await messageInput.clear();
    await expect(messageInput).toHaveValue('');
  });

  test('application handles basic user interaction', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the application to load
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Type a message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test message');
    
    // Press Enter to send (this will trigger the form submission)
    await messageInput.press('Enter');
    
    // Verify the input is cleared after sending
    await expect(messageInput).toHaveValue('');
  });

  test('application is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Verify chat container is still visible on mobile
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Verify message input is still functional on mobile
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toBeEditable();
  });
});
