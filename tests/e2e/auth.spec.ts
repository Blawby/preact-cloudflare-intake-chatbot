import { test, expect } from '@playwright/test';

test.describe('Better Auth Integration', () => {
  test('should allow anonymous chat', async ({ page }) => {
    await page.goto('/');
    
    // Wait for chat interface to load
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    
    // Send a message without authentication
    await page.fill('[data-testid="message-input"]', 'Hello, I need legal help');
    await page.click('button[type="submit"]');
    
    // Verify message appears
    await expect(page.locator('text=Hello, I need legal help')).toBeVisible();
  });

  test('should sign up with email/password', async ({ page }) => {
    await page.goto('/auth');
    
    // Click sign up toggle button
    await page.click('text=Don\'t have an account? Sign up');
    
    // Fill signup form
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your full name"]', 'Test User');
    await page.fill('input[placeholder="Enter your password"]', 'TestPassword123!');
    await page.fill('input[placeholder="Confirm your password"]', 'TestPassword123!');
    
    // Submit form
    await page.click('button:has-text("Create account")');
    
    // Verify account created
    await expect(page.locator('text=/Account created|Welcome/')).toBeVisible({ timeout: 10000 });
  });

  test('should sign in with existing account', async ({ page, context }) => {
    // First create an account
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    await page.goto('/auth');
    await page.click('text=Don\'t have an account? Sign up');
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your full name"]', 'Test User');
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.fill('input[placeholder="Confirm your password"]', testPassword);
    await page.click('button:has-text("Create account")');
    
    // Wait for success message or redirect
    await Promise.race([
      page.waitForURL('/', { timeout: 15000 }),
      page.waitForSelector('text=/Account created|Welcome/', { timeout: 15000 })
    ]);
    
    // Sign out (if needed)
    const cookies = await context.cookies();
    await context.clearCookies();
    
    // Sign in
    await page.goto('/auth');
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.click('button:has-text("Sign in")');
    
    // Verify signed in
    await expect(page.locator('text=/Welcome|Dashboard/')).toBeVisible({ timeout: 10000 });
  });

  test('should persist session on reload', async ({ page }) => {
    // Sign up
    const testEmail = `test-${Date.now()}@example.com`;
    await page.goto('/auth');
    await page.click('text=Don\'t have an account? Sign up');
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your full name"]', 'Test User');
    await page.fill('input[placeholder="Enter your password"]', 'TestPassword123!');
    await page.fill('input[placeholder="Confirm your password"]', 'TestPassword123!');
    await page.click('button:has-text("Create account")');
    
    // Wait for success message or redirect
    await Promise.race([
      page.waitForURL('/', { timeout: 15000 }),
      page.waitForSelector('text=/Account created|Welcome/', { timeout: 15000 })
    ]);
    
    // Navigate to home page manually if still on auth page
    if (page.url().includes('/auth')) {
      await page.goto('/');
    }
    
    // Reload page
    await page.reload();
    
    // Verify still authenticated (should not be on auth page)
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('should allow chat after authentication', async ({ page }) => {
    // Start anonymous chat
    await page.goto('/');
    await page.fill('[data-testid="message-input"]', 'Anonymous message');
    await page.click('button[type="submit"]');
    
    // Wait for message to appear
    await expect(page.locator('text=Anonymous message')).toBeVisible({ timeout: 10000 });
    
    // Sign up
    await page.goto('/auth');
    await page.click('text=Don\'t have an account? Sign up');
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your full name"]', 'Test User');
    await page.fill('input[placeholder="Enter your password"]', 'TestPassword123!');
    await page.fill('input[placeholder="Confirm your password"]', 'TestPassword123!');
    await page.click('button:has-text("Create account")');
    
    // Wait for success message or redirect
    await Promise.race([
      page.waitForURL('/', { timeout: 15000 }),
      page.waitForSelector('text=/Account created|Welcome/', { timeout: 15000 })
    ]);
    
    // Navigate to home page manually if still on auth page
    if (page.url().includes('/auth')) {
      await page.goto('/');
    }
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Send a message after authentication to verify chat still works
    await page.fill('[data-testid="message-input"]', 'Post-auth message');
    await page.click('button[type="submit"]');
    
    // Verify the new message appears
    await expect(page.locator('text=Post-auth message')).toBeVisible({ timeout: 10000 });
  });
});
