# LLM Judge Tests

This directory contains AI-powered evaluation tests for the legal intake chatbot.

## Structure

```
tests/llm-judge/
├── README.md                 # This file
├── llm-judge.test.ts         # Main test runner with HTML report generation
└── fixtures/
    └── conversations.json    # Test scenarios and expected outcomes
```

## What These Tests Do

1. **Real API Testing**: Calls your actual `/api/agent/stream` endpoint
2. **AI-Powered Evaluation**: Uses your `/api/judge` endpoint to evaluate responses
3. **Conversation Flow Testing**: Tests multi-turn conversations
4. **Tool Call Validation**: Checks if expected tools are called
5. **HTML Report Generation**: Creates beautiful reports with detailed results

## Running the Tests

```bash
# Run tests and generate HTML report (choose one):
npm run test:slow        # New: Uses vitest.slow.config.ts
npm run test:llm-judge   # Legacy: Uses shell script

# Or run directly with vitest
npx vitest run tests/llm-judge/
```

**Note**: These tests take 160+ seconds and require the Wrangler dev server to be running (`npx wrangler dev`).

## Test Scenarios

The `fixtures/conversations.json` file contains various test scenarios:

- **Standard legal intake** - Basic family law matter
- **Urgent legal matter** - High-priority escalation
- **Complex legal situation** - Multi-issue cases
- **Location verification** - Service area checks
- **Pricing concerns** - Financial discussions

## Evaluation Criteria

Each response is evaluated on 9 criteria (1-10 scale):

1. **Empathy** - Understanding and compassion
2. **Accuracy** - Correct legal information
3. **Completeness** - Comprehensive coverage
4. **Relevance** - Appropriate to scenario
5. **Professionalism** - Professional tone
6. **Actionability** - Clear next steps
7. **Legal Accuracy** - Legal knowledge
8. **Conversation Flow** - Natural progression
9. **Tool Usage** - Appropriate tool calls

## Reports

After running tests, an HTML report is generated at:
`test-results/llm-judge-report.html`

The report includes:
- Summary statistics
- Individual test results
- Conversation flows
- Tool calls made
- Judge feedback and suggestions
- Performance metrics

## Adding New Test Scenarios

1. Add new conversation objects to `fixtures/conversations.json`
2. Include user messages and expected tool calls
3. Run tests to see how the AI performs

## Configuration

Tests use these environment variables:
- `TEST_API_URL` - API endpoint (default: http://localhost:8787)
- `TEST_TEAM_ID` - Team ID for testing (default: test-team-1)
