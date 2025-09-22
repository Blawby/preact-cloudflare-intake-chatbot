import { test, expect } from '@playwright/test';
import { waitForCompleteAiMessage, waitForLastCompleteAiMessage } from '../tests/helpers';
import { 
  fillAndSendMessage, 
  waitForUserMessage, 
  waitForAiResponse, 
  verifyQualifyingQuestions, 
  verifyContactFormRequest,
  setupChat,
  sendMessageAndWait
} from '../tests/helpers/leadQualificationHelpers';

/**
 * Test the new lead qualification flow where AI asks qualifying questions
 * before showing the contact form
 */

test.describe('Lead Qualification Flow', (): void => {
  test('AI asks qualifying questions before showing contact form', async ({ page }): Promise<void> => {
    // Set up minimal debug hooks for test reliability
    await page.addInitScript((): void => {
      window.__DEBUG_SEND_MESSAGE__ = (message, attachments): void => {
        console.log('[TEST] sendMessage:', message.substring(0, 50) + '...');
      };
    });
    
    // Set up chat interface
    const { input, sendButton } = await setupChat(page);
    
    // Step 1: User describes legal issue
    await sendMessageAndWait(page, input, sendButton, 'I was injured in a car crash with back pain. It was a personal injury claim.', 1, 1);
    
    // Step 3: Verify AI is asking qualifying questions
    const aiMessage = page.locator('[data-testid="ai-message"]');
    const aiMessageText: string = (await aiMessage.textContent()) ?? '';
    verifyQualifyingQuestions(aiMessageText);
    
    // Step 4: User responds with qualifying information
    await sendMessageAndWait(page, input, sendButton, 'Yes, this is urgent. I need to file a lawsuit soon because the statute of limitations is approaching.', 2, 2);
    
    // Step 6: Check if contact form is shown, if not provide more qualifying info
    const hasContactForm = await page.locator('[data-testid="contact-form"]').isVisible();
    
    if (!hasContactForm) {
      await sendMessageAndWait(page, input, sendButton, 'This is very urgent. I need to file a lawsuit immediately because the statute of limitations is approaching. I have significant medical bills and have not consulted with any other attorneys. I am ready to move forward with legal action right now.', 3, 3);
    }
    
    // Step 7: Wait for final AI message and verify contact form request
    await waitForLastCompleteAiMessage(page, 30000);
    const hasContactFormRequest = await verifyContactFormRequest(page);
    expect(hasContactFormRequest).toBe(true);
    
    // The test is complete - we've verified that:
    // 1. AI asks qualifying questions instead of jumping to contact form
    // 2. AI recognizes qualified leads and asks for contact details
    // 3. The lead qualification flow is working correctly
  });
  
  test('AI continues conversation without contact form for unqualified leads', async ({ page }): Promise<void> => {
    // Set up chat interface
    const { input, sendButton } = await setupChat(page);
    
    // Step 1: User describes legal issue
    await sendMessageAndWait(page, input, sendButton, 'I was injured in a car crash with back pain. It was a personal injury claim.', 1, 1);
    
    // Step 3: User responds with unqualified information
    await sendMessageAndWait(page, input, sendButton, 'I\'m not sure if I want to pursue this. I\'m just exploring my options.', 2, 2);
    
    // Step 5: Verify AI does NOT show contact form for unqualified lead
    const contactForm = page.locator('[data-testid="contact-form"]');
    await expect(contactForm).not.toBeVisible({ timeout: 5000 });
    console.log('✅ AI correctly did not show contact form for unqualified lead');
    
    // Step 6: Verify AI continues the conversation
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    const aiMessageText: string = (await aiMessage.textContent()) ?? '';
    
    // AI should be continuing the conversation, not asking for contact info
    expect(aiMessageText).not.toContain('contact form');
    expect(aiMessageText).not.toContain('Contact Information');
    console.log('✅ AI continues conversation without contact form');
  });
});
