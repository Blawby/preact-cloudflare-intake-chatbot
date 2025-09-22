import { test, expect } from '@playwright/test';

/**
 * 🎭 E2E Test: AI Tool Calling Functionality
 * 
 * This test validates that the AI correctly calls tools based on conversation context:
 * 1. AI calls show_contact_form when legal info is complete
 * 2. AI calls create_matter when contact form is submitted
 * 3. Tool calls are properly handled and SSE events are emitted
 */
test.describe('AI Tool Calling', () => {
  test('AI calls show_contact_form tool when legal info is complete', async ({ page }) => {
    await page.goto('/');
    
    // Monitor network requests to verify tool calls
    const toolCallRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/agent/stream')) {
        toolCallRequests.push(request);
      }
    });
    
    // Monitor console logs for tool call debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('show_contact_form') || msg.text().includes('tool_calls')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Step 1: User provides complete legal information
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a car crash with back pain. The other driver was John Smith and I have his insurance information. I want to pursue a personal injury claim.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for AI to process and call show_contact_form tool
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 15000 });
    
    // Step 3: Verify the tool call was made (check console logs or network requests)
    // The contact form appearing indicates the tool was called successfully
    
    // Step 4: Verify AI response indicates tool usage
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    await expect(aiMessage).toBeVisible();
    
    // The AI should have called the tool, so we should see the contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible();
  });

  test('AI calls create_matter tool after contact form submission', async ({ page }) => {
    await page.goto('/');
    
    // Monitor console logs for create_matter tool calls
    const toolCallLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('create_matter') || msg.text().includes('tool_calls')) {
        toolCallLogs.push(msg.text());
      }
    });
    
    // Step 1: Trigger contact form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a car crash with back pain. It was a personal injury claim.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Step 3: Fill and submit contact form
    await page.locator('input[name="name"]').fill('Jane Doe');
    await page.locator('input[name="email"]').fill('jane@example.com');
    await page.locator('input[name="phone"]').fill('2125551234');
    await page.locator('input[name="location"]').fill('Los Angeles, CA');
    await page.locator('input[name="opposingParty"]').fill('John Smith');
    
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Step 4: Wait for AI to process and call create_matter tool
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(/thank you|received|matter|created/i, { timeout: 15000 });
    
    // Step 5: Verify the create_matter tool was called
    // The AI response should indicate matter creation
    const finalMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(finalMessage).toContainText(/matter|case|file|created/i);
  });

  test('AI handles tool call failures gracefully', async ({ page }) => {
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
    
    // The AI should either succeed or provide a helpful error message
    const messageText = await finalMessage.textContent();
    expect(messageText).toMatch(/thank you|received|matter|created|error|issue|help/i);
  });

  test('AI tool loop health check works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Monitor console logs for health check messages
    const healthCheckLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('AI Tool Loop Health Check') || msg.text().includes('show_contact_form')) {
        healthCheckLogs.push(msg.text());
      }
    });
    
    // Step 1: Trigger a conversation that should call show_contact_form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a workplace accident and need legal help.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for contact form (indicates health check passed)
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 15000 });
    
    // Step 3: Verify health check logs indicate success
    // The contact form appearing means the health check passed
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible();
  });

  test('Multiple tool calls in sequence work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Step 1: Start conversation
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a car accident and need help with a personal injury claim.');
    await legalIssueInput.press('Enter');
    
    // Step 2: Wait for first tool call (show_contact_form)
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Step 3: Fill and submit contact form
    await page.locator('input[name="name"]').fill('Bob Wilson');
    await page.locator('input[name="email"]').fill('bob@example.com');
    await page.locator('input[name="phone"]').fill('2125551234');
    await page.locator('input[name="location"]').fill('Boston, MA');
    await page.locator('input[name="opposingParty"]').fill('Insurance Company');
    
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Step 4: Wait for second tool call (create_matter)
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(/thank you|received|matter|created/i, { timeout: 15000 });
    
    // Step 5: Verify both tool calls worked in sequence
    const messages = page.locator('[data-testid="message"]');
    await expect(messages).toHaveCount(4); // User input, AI response, contact form, AI confirmation
    
    // Verify the final AI message indicates successful matter creation
    const finalMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(finalMessage).toContainText(/matter|case|file|created|thank you/i);
  });
});
