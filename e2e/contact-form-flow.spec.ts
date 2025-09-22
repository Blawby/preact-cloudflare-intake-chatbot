import { test, expect } from '@playwright/test';

// TypeScript interfaces for debug hook functions
interface DebugContactData {
  name: string;
  email: string;
  phone: string;
  location: string;
  opposingParty?: string;
}

interface DebugSSEEvent {
  type: 'connected' | 'text' | 'typing' | 'tool_call' | 'tool_result' | 'final' | 'error' | 'security_block' | 'contact_form' | 'complete' | 'tool_error';
  text?: string;
  toolName?: string;
  name?: string;
  result?: {
    message?: string;
    data?: {
      payment_embed?: unknown;
    };
  };
  response?: string;
  message?: string;
  data?: {
    fields?: string[];
    required?: string[];
    message?: string;
  };
  toolName?: string;
  allowRetry?: boolean;
  correlationId?: string;
}

// Window interface augmentation for debug functions
declare global {
  interface Window {
    __DEBUG_SEND_MESSAGE__?: (message: string, attachments?: unknown[]) => void;
    __DEBUG_SSE_EVENTS__?: (data: DebugSSEEvent) => void;
    __DEBUG_CONTACT_FORM__?: (contactData: DebugContactData, message: string) => void;
  }
}

/**
 * 🎭 E2E Test: Complete Contact Form Flow
 * 
 * This test validates the entire AI chatbot contact form flow:
 * 1. User describes legal issue
 * 2. AI calls show_contact_form tool
 * 3. Frontend renders contact form
 * 4. User fills and submits form
 * 5. AI receives structured data and creates matter
 * 6. AI responds with confirmation
 */
test.describe('Contact Form Flow', () => {
  test('Complete legal intake with contact form submission', async ({ page }) => {
    // Set up debug hooks before navigation
    await page.addInitScript(() => {
      window.__DEBUG_SEND_MESSAGE__ = (message: string, attachments?: unknown[]) => {
        console.log('[TEST] sendMessage called:', message, attachments ? attachments.length : 0);
      };
      window.__DEBUG_SSE_EVENTS__ = (data: DebugSSEEvent) => {
        console.log('[TEST] SSE Event:', data.type, data);
      };
      window.__DEBUG_CONTACT_FORM__ = (contactData: DebugContactData, message: string) => {
        console.log('[TEST] Contact form submitted:', contactData, message);
      };
    });
    
    // Navigate to the chat interface
    await page.goto('/');
    
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Step 1: User describes legal issue
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="message-send-button"]');
    
    await expect(legalIssueInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    await legalIssueInput.fill('I was injured in a car crash with back pain. It was a personal injury claim.');
    
    // Trigger form submission using send button
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    
    // Wait for user message to appear (this confirms sendMessage was called)
    await expect(page.locator('[data-testid="user-message"]')).toHaveCount(1, { timeout: 5000 });
    
    // Step 2: Wait for AI response
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(1, { timeout: 10000 });
    
    // Step 3: Wait for contact form to appear (triggered by show_contact_form tool)
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 15000 });
    
    // Verify contact form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="location"]')).toBeVisible();
    await expect(page.locator('input[name="opposingParty"]')).toBeVisible();
    
    // Step 4: Fill out the contact form
    await page.locator('input[name="name"]').fill('Jane Doe');
    await page.locator('input[name="email"]').fill('jane@example.com');
    await page.locator('input[name="phone"]').fill('2125551234'); // Valid NANP format
    await page.locator('input[name="location"]').fill('Los Angeles, CA');
    await page.locator('input[name="opposingParty"]').fill('John Smith');
    
    // Step 5: Submit the form
    const submitButton = page.locator('[data-testid="contact-form-submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Step 6: Wait for AI to process the form data and create matter
    // Look for confirmation message from AI
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(/thank you|received|matter|created/i, { timeout: 15000 });
    
    // Step 7: Verify the conversation shows the complete flow
    const messages = page.locator('[data-testid="message"]');
    await expect(messages).toHaveCount(4); // User input, AI response, contact form, AI confirmation
    
    // Verify contact form submission message appears
    await expect(page.locator('[data-testid="message"]').nth(2)).toContainText('Contact Information:');
    await expect(page.locator('[data-testid="message"]').nth(2)).toContainText('Jane Doe');
    await expect(page.locator('[data-testid="message"]').nth(2)).toContainText('jane@example.com');
  });

  test('Contact form validation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Trigger contact form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I need help with a divorce case. My spouse and I have been separated for 6 months.');
    await legalIssueInput.press('Enter');
    
    // Wait for contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Try to submit empty form
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Verify validation errors appear
    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
    
    // Fill required fields with invalid data
    await page.locator('input[name="name"]').fill('J');
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="phone"]').fill('123'); // Invalid phone
    await page.locator('input[name="location"]').fill('L'); // Too short
    
    // Submit with invalid data
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Verify validation errors for invalid data
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();
    await expect(page.locator('text=Location must be at least 2 characters')).toBeVisible();
  });

  test('Contact form handles network errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Trigger contact form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I was injured in a workplace accident.');
    await legalIssueInput.press('Enter');
    
    // Wait for contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Fill form with valid data
    await page.locator('input[name="name"]').fill('John Smith');
    await page.locator('input[name="email"]').fill('john@example.com');
    await page.locator('input[name="phone"]').fill('2125551234');
    await page.locator('input[name="location"]').fill('New York, NY');
    
    // Simulate network failure by intercepting the request
    await page.route('**/api/agent/stream', route => {
      route.abort('failed');
    });
    
    // Submit form
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Failed to submit contact information')).toBeVisible();
  });

  test('Contact form works with minimal required fields', async ({ page }) => {
    await page.goto('/');
    
    // Trigger contact form
    const legalIssueInput = page.locator('[data-testid="message-input"]');
    await legalIssueInput.fill('I need help with a contract dispute.');
    await legalIssueInput.press('Enter');
    
    // Wait for contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible({ timeout: 10000 });
    
    // Fill only required fields (opposing party is optional)
    await page.locator('input[name="name"]').fill('Alice Johnson');
    await page.locator('input[name="email"]').fill('alice@example.com');
    await page.locator('input[name="phone"]').fill('2125551234');
    await page.locator('input[name="location"]').fill('Chicago, IL');
    // Leave opposing party empty (optional field)
    
    // Submit form
    await page.locator('[data-testid="contact-form-submit"]').click();
    
    // Verify successful submission
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(/thank you|received/i, { timeout: 15000 });
  });
});
