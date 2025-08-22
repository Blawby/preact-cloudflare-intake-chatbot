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
├── llm-judge/              # LLM judge evaluation tests (slow)
│   ├── fixtures/          # Test data and scenarios
│   └── llm-judge.test.ts  # Main test runner
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
- **API**: Test API endpoints with mocked dependencies
- **Worker**: Test worker functions with real Cloudflare bindings

### LLM Judge Tests (`tests/llm-judge/`)
- **AI-powered evaluation**: Uses LLM judge to evaluate agent responses
- **Real API testing**: Calls actual `/api/agent/stream` endpoint
- **Conversation flow testing**: Tests multi-turn conversations
- **HTML report generation**: Creates detailed reports with results
- **Slow tests**: Take 160+ seconds, require separate configuration

### Paralegal Tests (`tests/paralegal/`)
- **Paralegal service testing**: Tests paralegal agent functionality
- **Queue processing**: Tests task queue handling
- **Service integration**: Tests paralegal service integration

## 🎯 LLM Judge Testing Framework

### What These Tests Do

1. **Real API Testing**: Calls your actual `/api/agent/stream` endpoint
2. **AI-Powered Evaluation**: Uses your `/api/judge` endpoint to evaluate responses
3. **Conversation Flow Testing**: Tests multi-turn conversations
4. **Tool Call Validation**: Checks if expected tools are called
5. **HTML Report Generation**: Creates beautiful reports with detailed results

### Test Scenarios

The system includes 47+ test scenarios across multiple categories:

- **Standard legal intake** - Basic family law matter
- **Urgent legal matter** - High-priority escalation
- **Complex legal situation** - Multi-issue cases
- **Location verification** - Service area checks
- **Pricing concerns** - Financial discussions
- **Legal practice areas** - Broad legal scenarios
- **Location service cases** - Jurisdiction and service area issues
- **Pricing requests** - Financial and pricing inquiries

### Evaluation Criteria

Each response is evaluated on 10 criteria (1-10 scale):

1. **Empathy** - Understanding and compassion
2. **Accuracy** - Correct legal information
3. **Completeness** - Comprehensive coverage
4. **Relevance** - Appropriate to scenario
5. **Professionalism** - Professional tone
6. **Actionability** - Clear next steps
7. **Legal Accuracy** - Legal knowledge
8. **Conversation Flow** - Natural progression
9. **Tool Usage** - Appropriate tool calls
10. **Handoff Decision** - Proper escalation when needed

### Reports

After running tests, an HTML report is generated at:
`test-results/llm-judge-report.html`

The report includes:
- Summary statistics
- Individual test results
- Conversation flows
- Tool calls made
- Judge feedback and suggestions
- Performance metrics

### Configuration

Tests use these environment variables:
- `TEST_API_URL` - API endpoint (default: http://localhost:8787)
- `TEST_TEAM_ID` - Team ID for testing (default: test-team-1)

### Performance Benchmarks
- Response time: < 5 seconds
- Token usage: < 1000 tokens
- Tool usage: Appropriate escalation

### Score Interpretation
- **9-10**: Excellent response, meets all requirements
- **7-8**: Good response, minor improvements needed
- **5-6**: Acceptable response, significant improvements needed
- **1-4**: Poor response, major issues identified

### Adding New Test Scenarios

1. Add new conversation objects to `tests/llm-judge/fixtures/conversations.json`
2. Include user messages and expected tool calls
3. Run tests to see how the AI performs

### Customization

#### Adding New Test Cases
1. Create a new file in `tests/llm-judge/fixtures/test-cases/` or add to existing files
2. Define test cases using the `TestCaseEvaluation` interface
3. Export from `tests/llm-judge/fixtures/test-cases/index.ts`
4. Run tests to see results

#### Modifying Evaluation Criteria
1. Update criteria in `tests/llm-judge/fixtures/judge-llm.ts`
2. Adjust scoring weights and thresholds
3. Modify judge prompts for different evaluation focus

## Running Tests

```bash
# Run fast tests (unit, integration, paralegal - excludes slow LLM judge tests)
npm test
npm run test:fast

# Run slow tests (LLM judge tests only - requires wrangler dev server)
npm run test:slow

# Run specific test types
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only (requires wrangler dev server)
npm run test:e2e        # E2E tests only

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Legacy LLM judge test script (alternative to test:slow)
npm run test:llm-judge
```

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