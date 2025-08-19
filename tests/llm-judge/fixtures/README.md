# AI Agent Test System

This directory contains the comprehensive test system for evaluating AI agent responses using an LLM-based judge.

## 🎯 Overview

The test system evaluates AI agents (ParalegalAgent and LegalIntakeAgent) across various scenarios and provides detailed feedback using an LLM judge that rates responses on a 1-10 scale.

## 📁 File Structure

```
tests/fixtures/
├── README.md                    # This file
├── agent-test-data.ts          # Test team configurations and legacy data
├── judge-llm.ts                # LLM judge evaluation system
├── test-runner.ts              # Test execution and HTML report generation
├── test-cases/                 # Test case definitions
│   ├── index.ts                # Central export for all test cases
│   ├── legal-practice-areas.ts # Broad legal practice area test cases
│   ├── location-service-case.ts # Location/jurisdiction test cases
│   ├── pricing-requests-case.ts # Pricing and financial test cases
│   ├── divorce-case.ts         # Legacy divorce-specific cases
│   ├── employment-case.ts      # Legacy employment-specific cases
│   ├── family-law-case.ts      # Legacy family law cases
│   ├── business-law-case.ts    # Legacy business law cases
│   └── general-legal-case.ts   # Legacy general legal cases
└── scripts/
    └── run-agent-tests.ts      # Script to run tests and generate report
```

## 🚀 Quick Start

### Run All Tests and Generate Report

```bash
npm run test:agent-report
```

This will:
1. Run all test cases (47+ scenarios)
2. Evaluate responses using the LLM judge
3. Generate an HTML report at `test-results/agent-test-report.html`
4. Open the report in your browser

### View the Report

The HTML report includes:
- **Summary Statistics**: Total tests, pass/fail rates, average scores
- **Individual Test Results**: Detailed evaluation for each test case
- **Judge Evaluations**: 1-10 scores across multiple criteria
- **Performance Metrics**: Response time and token usage
- **Feedback & Suggestions**: Detailed improvement recommendations
- **Critical Issues**: Problems that need immediate attention

## 📊 Test Categories

### 1. Legal Practice Areas (Broad)
- General inquiry handling
- Urgent matter assessment
- Complex situation recognition
- Documentation requirements
- Procedural guidance
- Uncertainty assistance

### 2. Location Service Cases
- Outside service area handling
- Jurisdiction issues
- Multi-state matters
- International cases
- Virtual service capabilities
- Emergency situations

### 3. Pricing Requests
- Pricing inquiries
- Free service requests
- Discount requests
- Abusive behavior handling
- Price comparisons
- Financial hardship cases

### 4. Legacy Specific Cases
- Divorce scenarios
- Employment issues
- Family law matters
- Business law cases
- General legal inquiries

## 🎯 Evaluation Criteria

The LLM judge evaluates responses on these criteria (1-10 scale):

- **Empathy**: Understanding and compassion for client situation
- **Accuracy**: Correct legal information and guidance
- **Completeness**: Comprehensive response addressing all aspects
- **Relevance**: Appropriate response to the specific scenario
- **Professionalism**: Professional tone and conduct
- **Actionability**: Clear next steps and guidance
- **Legal Accuracy**: Correct legal principles and procedures
- **Conversation Flow**: Natural and helpful conversation
- **Tool Usage**: Appropriate use of available tools
- **Handoff Decision**: Proper escalation when needed

## 🔧 Configuration

### Test Teams
Test teams are configured in `agent-test-data.ts`:
- `test-team-1`: Standard test team
- `test-team-disabled`: Disabled team for testing
- `blawby-ai`: Production team configuration

### Performance Benchmarks
Performance thresholds are defined in `judge-llm.ts`:
- Response time: < 5 seconds
- Token usage: < 1000 tokens
- Tool usage: Appropriate escalation

## 🛠️ Customization

### Adding New Test Cases

1. Create a new file in `test-cases/` or add to existing files
2. Define test cases using the `TestCaseEvaluation` interface
3. Export from `test-cases/index.ts`
4. Run tests to see results

### Modifying Evaluation Criteria

1. Update criteria in `judge-llm.ts`
2. Adjust scoring weights and thresholds
3. Modify judge prompts for different evaluation focus

### Custom Test Scenarios

Use the helper functions in `legal-practice-areas.ts`:
```typescript
import { generatePracticeAreaScenario } from './test-cases/legal-practice-areas';

const customScenario = generatePracticeAreaScenario(
  'Custom Practice Area',
  'Custom user message'
);
```

## 📈 Understanding Results

### Score Interpretation
- **9-10**: Excellent response, meets all requirements
- **7-8**: Good response, minor improvements needed
- **5-6**: Acceptable response, significant improvements needed
- **1-4**: Poor response, major issues identified

### Performance Metrics
- **Response Time**: Should be under 5 seconds
- **Token Usage**: Should be under 1000 tokens
- **Tool Usage**: Should escalate appropriately for complex/urgent matters

### Critical Issues
These indicate problems that need immediate attention:
- Missing contact information collection
- Failure to identify urgent situations
- Incorrect legal advice
- Inappropriate tool usage
- Poor escalation decisions

## 🔄 Continuous Improvement

1. **Regular Testing**: Run tests after agent updates
2. **Score Tracking**: Monitor average scores over time
3. **Issue Analysis**: Focus on failing test cases
4. **Prompt Refinement**: Update agent prompts based on feedback
5. **Criteria Adjustment**: Refine evaluation criteria as needed

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all test case files are properly exported
2. **Judge Evaluation Failures**: Check LLM judge configuration
3. **Performance Issues**: Verify response time and token usage tracking
4. **Report Generation**: Ensure `test-results/` directory exists

### Debug Mode

For detailed debugging, check the console output during test execution for:
- Individual test case results
- Judge evaluation details
- Performance metrics
- Error messages

## 📝 Notes

- The current system uses mock agent responses for demonstration
- Real agent integration requires connecting to actual agent endpoints
- Judge evaluations are currently mocked but can be connected to real LLM APIs
- Performance metrics are simulated but can be connected to real measurements
