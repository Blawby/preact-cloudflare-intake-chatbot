# 🎭 Playwright E2E Tests

This directory contains end-to-end tests for the AI chatbot application using Playwright.

## 📁 Test Files

### `basic.spec.ts`
- **Purpose**: Basic application functionality tests
- **Tests**: Application loading, chat interface visibility, message input functionality
- **Use Case**: Verify the application works correctly before running complex tests

### `contact-form-flow.spec.ts`
- **Purpose**: Complete contact form workflow tests
- **Tests**: 
  - Full legal intake with contact form submission
  - Contact form validation
  - Network error handling
  - Minimal required fields submission
- **Use Case**: Validate the entire AI → contact form → matter creation flow

### `ai-tool-calling.spec.ts`
- **Purpose**: AI tool calling functionality tests
- **Tests**:
  - AI calls `show_contact_form` tool when legal info is complete
  - AI calls `create_matter` tool after contact form submission
  - Tool call failure handling
  - AI tool loop health check validation
  - Multiple tool calls in sequence
- **Use Case**: Ensure AI tool calling works correctly end-to-end

## 🚀 Running Tests

### Prerequisites
1. **Start the development servers**:
   ```bash
   # Terminal 1: Start frontend dev server
   pnpm dev
   
   # Terminal 2: Start backend (wrangler dev)
   pnpm wrangler dev --port 8787
   ```

2. **Install Playwright browsers** (if not already done):
   ```bash
   pnpm exec playwright install
   ```

### Test Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests with UI (interactive mode)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests (step through)
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report
```

### Running Specific Tests

```bash
# Run only basic tests
pnpm exec playwright test basic.spec.ts

# Run only contact form tests
pnpm exec playwright test contact-form-flow.spec.ts

# Run only AI tool calling tests
pnpm exec playwright test ai-tool-calling.spec.ts
```

## 🧪 Test Data Attributes

The tests use `data-testid` attributes to locate elements:

- `data-testid="chat-container"` - Main chat interface
- `data-testid="message-input"` - Message input textarea
- `data-testid="message"` - Individual chat messages
- `data-testid="contact-form"` - Contact form container
- `data-testid="contact-form-submit"` - Contact form submit button

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)
- **Base URL**: `http://localhost:5173` (frontend)
- **Web Servers**: Automatically starts both frontend and backend servers
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure

### Test Environment
- **Frontend**: Vite dev server on port 5173
- **Backend**: Wrangler dev server on port 8787
- **Timeout**: 120 seconds for server startup

## 🐛 Debugging Tests

### 1. Run in Debug Mode
```bash
pnpm test:e2e:debug
```
This opens Playwright Inspector where you can:
- Step through tests line by line
- Inspect elements
- View console logs
- Take screenshots

### 2. Run in Headed Mode
```bash
pnpm test:e2e:headed
```
This shows the browser window so you can see what's happening.

### 3. Check Test Reports
```bash
pnpm test:e2e:report
```
Opens the HTML test report with:
- Test results
- Screenshots of failures
- Videos of test runs
- Console logs

### 4. Common Issues

**Tests fail with "Unable to connect"**:
- Ensure both `pnpm dev` and `pnpm wrangler dev` are running
- Check that ports 5173 and 8787 are available

**Contact form doesn't appear**:
- Check that the AI is calling `show_contact_form` tool
- Verify the backend logs show tool calls
- Ensure the frontend is receiving SSE events

**Form submission fails**:
- Check phone number format (use valid NANP format like "2125551234")
- Verify location includes city and state
- Check backend logs for validation errors

## 📊 Test Coverage

The E2E tests cover:

✅ **Application Loading**
- Frontend loads correctly
- Chat interface is visible
- Message input is functional

✅ **Contact Form Flow**
- AI triggers contact form display
- Form validation works
- Form submission succeeds
- AI processes form data and creates matter

✅ **AI Tool Calling**
- AI calls `show_contact_form` when appropriate
- AI calls `create_matter` after form submission
- Tool call failures are handled gracefully
- Health checks work correctly

✅ **Error Handling**
- Network failures are handled
- Validation errors are displayed
- Invalid data is rejected appropriately

## 🔄 Continuous Integration

These tests are designed to run in CI environments:

- **Automatic server startup**: Tests start their own dev servers
- **Retry logic**: Failed tests are retried automatically
- **Artifact collection**: Screenshots and videos are saved on failure
- **Multiple browsers**: Tests run on Chrome, Firefox, and Safari

## 📝 Adding New Tests

When adding new E2E tests:

1. **Use descriptive test names** that explain what's being tested
2. **Add appropriate `data-testid` attributes** to new components
3. **Include both positive and negative test cases**
4. **Test error scenarios** (network failures, validation errors, etc.)
5. **Use realistic test data** that matches production scenarios
6. **Add comments** explaining complex test logic

Example test structure:
```typescript
test('descriptive test name', async ({ page }) => {
  // Arrange: Set up test conditions
  await page.goto('/');
  
  // Act: Perform the action being tested
  await page.locator('[data-testid="element"]').click();
  
  // Assert: Verify the expected outcome
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});
```
