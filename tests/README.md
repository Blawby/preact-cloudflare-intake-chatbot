# Testing Structure

This directory follows Cloudflare best practices for testing Cloudflare Workers and frontend applications. It includes comprehensive test coverage from unit tests to AI-powered evaluation tests.

## Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/         # Component tests (React/Preact)
│   ├── utils/             # Utility function tests
│   ├── services/          # Service layer tests
│   └── worker/            # Worker function tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   └── services/          # Service integration tests
├── paralegal/              # Paralegal service tests
├── fixtures/              # Test data and mocks
│   ├── test-utils.tsx     # Shared test utilities
│   └── mock-data.ts       # Test data factories
├── setup.ts               # Global test setup
└── README.md              # This file
```

## Test Types

### Unit Tests (`tests/unit/`)
- **Components**: Test individual React/Preact components in isolation
- **Utils**: Test utility functions and helpers
- **Services**: Test service layer functions (AIService, TeamService, etc.)
- **Worker**: Test individual worker functions and utilities

### Integration Tests (`tests/integration/`)
- **API**: Test API endpoints with real wrangler dev server
- **Services**: Test service integration with real Cloudflare bindings


### Paralegal Tests (`tests/paralegal/`)
- **Paralegal service testing**: Tests paralegal agent functionality
- **Queue processing**: Tests task queue handling
- **Service integration**: Tests paralegal service integration


## Running Tests

### Prerequisites
Before running tests, you need to start the wrangler dev server:
```bash
npx wrangler dev
```

### Test Commands

```bash
# Run all tests (unit, integration, paralegal)
npm test

# Run specific test types
npm run test:watch     # Run tests in watch mode
npm run test:ui        # Run tests with UI
npm run test:coverage  # Run tests with coverage
```

### Test Configuration

- **Main tests** (`npm test`): Uses `vitest.config.ts` - runs unit, integration, and paralegal tests
- **Integration tests**: Require `npx wrangler dev` to be running on port 8787

## Test Utilities

### `tests/fixtures/test-utils.tsx`
Shared utilities for all tests:
- Custom render function with providers
- Mock data factories
- API response mocks
- Environment mocks for worker tests

### `tests/setup.ts`
Global test setup:
- Browser API mocks (fetch, IntersectionObserver, etc.)
- Console mocking
- Crypto API mocking
- Local storage mocking

## Best Practices

### 1. Test Organization
- Keep tests close to the code they test
- Use descriptive test names
- Group related tests in describe blocks
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking Strategy
- Mock external dependencies (APIs, databases)
- Use real Cloudflare bindings in integration tests
- Create reusable mock factories
- Avoid mocking implementation details

### 3. Test Data
- Use factories for creating test data
- Keep test data realistic but minimal
- Avoid hardcoded values in tests
- Use TypeScript for type safety

### 4. Coverage Goals
- **Unit tests**: 80%+ coverage
- **Integration tests**: Critical paths only
- **E2E tests**: Happy path and error scenarios

### 5. Performance
- Keep tests fast (< 100ms per test)
- Use parallel test execution
- Mock expensive operations
- Clean up resources after tests

## Migration from Legacy Structure

The old test structure in `src/__tests__/` is deprecated. To migrate:

1. **Move unit tests** to `tests/unit/`
2. **Update imports** to use new paths
3. **Use shared utilities** from `tests/fixtures/`
4. **Update vitest config** to exclude legacy directory

## Cloudflare Workers Testing

### Worker Unit Tests
```typescript
import { describe, it, expect } from 'vitest';
import { createMockEnv } from '@fixtures/test-utils';
import { handleRequest } from '../../../worker/routes/chat';

describe('Chat Handler', () => {
  it('should handle chat requests', async () => {
    const mockEnv = createMockEnv();
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' })
    });

    const response = await handleRequest(request, mockEnv);
    expect(response.status).toBe(200);
  });
});
```

### Worker Integration Tests
```typescript
import { unstable_dev } from 'wrangler';

describe('Worker Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
      vars: { /* environment variables */ },
      bindings: { /* Cloudflare bindings */ }
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should handle real requests', async () => {
    const response = await worker.fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' })
    });
    expect(response.status).toBe(200);
  });
});
```

## Troubleshooting

### Common Issues
1. **Import errors**: Check path aliases in `vitest.config.ts`
2. **Mock failures**: Ensure mocks are properly set up in `setup.ts`
3. **Worker errors**: Verify Cloudflare bindings are mocked correctly
4. **Test isolation**: Use `beforeEach` to reset mocks and state

### Debugging
- Use `console.log` in tests (mocked by default)
- Run tests with `--reporter=verbose`
- Use `vitest --ui` for interactive debugging
- Check coverage reports for untested code 