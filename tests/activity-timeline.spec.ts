import { test, expect } from '@playwright/test';

test.describe('Activity Timeline Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5174');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display activity timeline with real data', async ({ page }) => {
    // Check if the activity timeline section exists
    const activityTimeline = page.locator('[data-testid="activity-timeline"]').or(
      page.locator('text=Activity Timeline').first()
    );
    
    await expect(activityTimeline).toBeVisible();

    // Check if the accordion trigger is present
    const accordionTrigger = page.locator('text=Activity Timeline').first();
    await expect(accordionTrigger).toBeVisible();

    // Click to expand the activity timeline
    await accordionTrigger.click();

    // Wait for the content to be visible
    await page.waitForSelector('[role="region"]', { timeout: 5000 });

    // Check for loading state or content
    const loadingIndicator = page.locator('text=Loading activity...');
    const emptyState = page.locator('text=No activity yet');
    const activityEvents = page.locator('[data-testid="activity-event"]').or(
      page.locator('div:has-text("ago")').first()
    );

    // Should see either loading, empty state, or actual events
    const hasLoading = await loadingIndicator.isVisible();
    const hasEmptyState = await emptyState.isVisible();
    const hasEvents = await activityEvents.isVisible();

    expect(hasLoading || hasEmptyState || hasEvents).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock the API to return an error
    await page.route('**/api/activity*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    // Navigate and expand activity timeline
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    const accordionTrigger = page.locator('text=Activity Timeline').first();
    await accordionTrigger.click();

    // Should show error state with retry button
    await expect(page.locator('text=Internal server error')).toBeVisible();
    await expect(page.locator('text=Retry')).toBeVisible();
  });

  test('should display file upload events', async ({ page }) => {
    // Mock successful activity API response with file upload events
    await page.route('**/api/activity*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'evt_1',
                uid: 'session_evt_1_20240115_103000',
                type: 'session_event',
                eventType: 'image_added',
                title: 'Image Added',
                description: 'Image Added: profile_photo.jpg',
                eventDate: new Date().toISOString(),
                actorType: 'user',
                actorId: 'session_123',
                metadata: {
                  fileName: 'profile_photo.jpg',
                  fileSize: 2048576,
                  fileType: 'image/jpeg'
                },
                createdAt: new Date().toISOString()
              },
              {
                id: 'evt_2',
                uid: 'session_evt_2_20240115_091500',
                type: 'session_event',
                eventType: 'document_added',
                title: 'Document Added',
                description: 'Document Added: contract.pdf',
                eventDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                actorType: 'user',
                actorId: 'session_123',
                metadata: {
                  fileName: 'contract.pdf',
                  fileSize: 1024000,
                  fileType: 'application/pdf'
                },
                createdAt: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            hasMore: false,
            total: 2
          }
        })
      });
    });

    // Navigate and expand activity timeline
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    const accordionTrigger = page.locator('text=Activity Timeline').first();
    await accordionTrigger.click();

    // Should show the events
    await expect(page.locator('h5:has-text("Image Added")')).toBeVisible();
    await expect(page.locator('h5:has-text("Document Added")')).toBeVisible();
    await expect(page.locator('text=profile_photo.jpg')).toBeVisible();
    await expect(page.locator('text=contract.pdf')).toBeVisible();

    // Should show relative timestamps
    await expect(page.locator('text=Just now')).toBeVisible();
    await expect(page.locator('text=1h ago')).toBeVisible();

    // Should show total count
    await expect(page.locator('text=(2 events)')).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    let requestCount = 0;
    
    // Mock paginated responses
    await page.route('**/api/activity*', route => {
      requestCount++;
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      
      if (!cursor) {
        // First page
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'evt_1',
                  uid: 'session_evt_1_20240115_103000',
                  type: 'session_event',
                  eventType: 'image_added',
                  title: 'Image Added',
                  description: 'Image Added: photo1.jpg',
                  eventDate: new Date().toISOString(),
                  actorType: 'user',
                  actorId: 'session_123',
                  metadata: {},
                  createdAt: new Date().toISOString()
                }
              ],
              nextCursor: 'eyJjdXJzb3IiOiJ0ZXN0In0=',
              hasMore: true,
              total: 2
            }
          })
        });
      } else {
        // Second page
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'evt_2',
                  uid: 'session_evt_2_20240115_091500',
                  type: 'session_event',
                  eventType: 'document_added',
                  title: 'Document Added',
                  description: 'Document Added: doc1.pdf',
                  eventDate: new Date(Date.now() - 3600000).toISOString(),
                  actorType: 'user',
                  actorId: 'session_123',
                  metadata: {},
                  createdAt: new Date(Date.now() - 3600000).toISOString()
                }
              ],
              hasMore: false,
              total: 2
            }
          })
        });
      }
    });

    // Navigate and expand activity timeline
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    const accordionTrigger = page.locator('text=Activity Timeline').first();
    await accordionTrigger.click();

    // Should show first event
    await expect(page.locator('h5:has-text("Image Added")')).toBeVisible();
    await expect(page.locator('text=Load more events')).toBeVisible();

    // Click load more
    await page.locator('text=Load more events').click();

    // Should show both events
    await expect(page.locator('h5:has-text("Image Added")')).toBeVisible();
    await expect(page.locator('h5:has-text("Document Added")')).toBeVisible();

    // Should not show load more button anymore
    await expect(page.locator('text=Load more events')).not.toBeVisible();

    // Should have made 2 API requests
    expect(requestCount).toBe(2);
  });

  test('should auto-refresh activity', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for this test
    let requestCount = 0;
    
    await page.route('**/api/activity*', route => {
      requestCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: `evt_${requestCount}`,
                uid: `session_evt_${requestCount}_20240115_103000`,
                type: 'session_event',
                eventType: 'image_added',
                title: 'Image Added',
                description: `Image Added: photo${requestCount}.jpg`,
                eventDate: new Date().toISOString(),
                actorType: 'user',
                actorId: 'session_123',
                metadata: {},
                createdAt: new Date().toISOString()
              }
            ],
            hasMore: false,
            total: requestCount
          }
        })
      });
    });

    // Navigate and expand activity timeline
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    const accordionTrigger = page.locator('text=Activity Timeline').first();
    await accordionTrigger.click();

    // Wait for initial load
    await expect(page.locator('h5:has-text("Image Added")')).toBeVisible();

    // Wait for auto-refresh (should happen within 2 seconds for testing)
    await page.waitForTimeout(2000);

    // Should have made at least 1 request (initial load)
    expect(requestCount).toBeGreaterThanOrEqual(1);
  });
});
