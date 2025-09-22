import { test, expect } from '@playwright/test';

/**
 * Test the new lead qualification flow where AI asks qualifying questions
 * before showing the contact form
 */
test.describe('Lead Qualification Flow', () => {
  test('AI asks qualifying questions before showing contact form', async ({ page }) => {
    // Set up minimal debug hooks for test reliability
    await page.addInitScript(() => {
      window.__DEBUG_SEND_MESSAGE__ = (message, attachments) => {
        console.log('[TEST] sendMessage:', message.substring(0, 50) + '...');
      };
    });
    
    // Navigate to the chat interface
    await page.goto('/');
    
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Step 1: User describes legal issue
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="message-send-button"]');
    
    await expect(input).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    await input.fill('I was injured in a car crash with back pain. It was a personal injury claim.');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    
    // Step 2: Wait for user message
    await expect(page.locator('[data-testid="user-message"]')).toHaveCount(1, { timeout: 5000 });
    
    // Step 3: Wait for AI response (should ask qualifying questions, NOT show contact form)
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(1, { timeout: 10000 });
    
    // Step 4: Wait for AI response to complete (not just "AI is thinking")
    await page.waitForFunction(() => {
      const aiMessage = document.querySelector('[data-testid="ai-message"]');
      return aiMessage && !aiMessage.textContent?.includes('AI is thinking');
    }, { timeout: 15000 });
    
    // Step 5: Verify AI is asking qualifying questions (not showing contact form yet)
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    const aiMessageText = await aiMessage.textContent();
    
    // AI should be asking qualifying questions, not showing contact form
    await expect(aiMessage).not.toContainText('contact form');
    await expect(aiMessage).not.toContainText('Contact Information');
    
    // AI should be asking qualifying questions (not showing contact form immediately)
    // Use regex matching for intent rather than specific phrases
    const isAskingQualifyingQuestions = /urgent|timeline|more about what happened|serious collision|sought medical attention|spoken with.*insurance|tell me.*about|what happened|attorney|medical attention/i.test(aiMessageText || '');
    
    expect(isAskingQualifyingQuestions).toBe(true);
    
    // Step 6: User responds with qualifying information
    await input.fill('Yes, this is urgent. I need to file a lawsuit soon because the statute of limitations is approaching.');
    await sendButton.click();
    
    // Step 7: Wait for second user message
    await expect(page.locator('[data-testid="user-message"]')).toHaveCount(2, { timeout: 5000 });
    
    // Step 7: Wait for AI's second response to fully stream in
    await page.waitForFunction(() => {
      const aiMessages = document.querySelectorAll('[data-testid="ai-message"]');
      if (aiMessages.length < 2) return false;
      
      const secondMessage = aiMessages[1];
      const text = secondMessage.textContent || '';
      
      // Wait for the message to be complete (not "AI is thinking" and has substantial content)
      return text.length > 50 && !text.includes('AI is thinking');
    }, { timeout: 20000 });
    
    // Step 8: Get the complete second AI message
    const secondAiMessage = page.locator('[data-testid="ai-message"]').nth(1);
    const secondAiMessageText = await secondAiMessage.textContent();
    
    // If AI shows contact form, great! If not, provide more qualifying information
    const hasContactForm = await page.locator('[data-testid="contact-form"]').isVisible();
    
    if (!hasContactForm) {
      // Provide more explicit qualifying information
      await input.fill('This is very urgent. I need to file a lawsuit immediately because the statute of limitations is approaching. I have significant medical bills and have not consulted with any other attorneys. I am ready to move forward with legal action right now.');
      await sendButton.click();
      
      // Wait for third user message
      await expect(page.locator('[data-testid="user-message"]')).toHaveCount(3, { timeout: 5000 });
      
      // Wait for AI's third response to fully stream in
      await page.waitForFunction(() => {
        const aiMessages = document.querySelectorAll('[data-testid="ai-message"]');
        if (aiMessages.length < 3) return false;
        
        const thirdMessage = aiMessages[2];
        const text = thirdMessage.textContent || '';
        
        // Wait for the message to be complete (not "AI is thinking" and has substantial content)
        return text.length > 50 && !text.includes('AI is thinking');
      }, { timeout: 20000 });
    }
    
    // Step 9: Wait for the final AI message to fully stream in
    await page.waitForFunction(() => {
      const aiMessages = document.querySelectorAll('[data-testid="ai-message"]');
      if (aiMessages.length === 0) return false;
      
      const lastMessage = aiMessages[aiMessages.length - 1];
      const text = lastMessage.textContent || '';
      
      // Wait for the message to be complete (not "AI is thinking" and has substantial content)
      // Also wait for it to contain contact-related keywords
      return text.length > 100 && 
             !text.includes('AI is thinking') && 
             (/name|email|phone|contact form|contact information/i.test(text));
    }, { timeout: 30000 });
    
    const finalAiMessage = page.locator('[data-testid="ai-message"]').last();
    const finalAiMessageText = await finalAiMessage.textContent();
    
    // AI should be asking for contact details or showing contact form
    const isAskingForContactDetails = /name|email|phone|contact form|contact information/i.test(finalAiMessageText || '');
    expect(isAskingForContactDetails).toBe(true);
    
    // The test is complete - we've verified that:
    // 1. AI asks qualifying questions instead of jumping to contact form
    // 2. AI recognizes qualified leads and asks for contact details
    // 3. The lead qualification flow is working correctly
  });
  
  test('AI continues conversation without contact form for unqualified leads', async ({ page }) => {
    
    // Navigate to the chat interface
    await page.goto('/');
    
    // Wait for the chat interface to load
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Step 1: User describes legal issue
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="message-send-button"]');
    
    await input.fill('I was injured in a car crash with back pain. It was a personal injury claim.');
    await sendButton.click();
    
    // Step 2: Wait for AI to ask qualifying questions
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(1, { timeout: 10000 });
    
    // Step 3: User responds with unqualified information
    await input.fill('I\'m not sure if I want to pursue this. I\'m just exploring my options.');
    await sendButton.click();
    
    // Step 4: Wait for AI response
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(2, { timeout: 10000 });
    
    // Step 5: Verify AI does NOT show contact form for unqualified lead
    const contactForm = page.locator('[data-testid="contact-form"]');
    await expect(contactForm).not.toBeVisible({ timeout: 5000 });
    console.log('✅ AI correctly did not show contact form for unqualified lead');
    
    // Step 6: Verify AI continues the conversation
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    const aiMessageText = await aiMessage.textContent();
    
    // AI should be continuing the conversation, not asking for contact info
    expect(aiMessageText).not.toContain('contact form');
    expect(aiMessageText).not.toContain('Contact Information');
    console.log('✅ AI continues conversation without contact form');
  });
});
