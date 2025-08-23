const fs = require('fs');
const path = require('path');

// Mock test results with critical issues to test the flag fix
const mockResults = [
  {
    scenario: "Test with Critical Issues",
    user: "Test User",
    passed: true,
    responseTime: 5000,
    evaluation: {
      averageScore: 8.0,
      scores: {
        empathy: 8,
        accuracy: 9,
        completeness: 8,
        relevance: 9,
        professionalism: 9,
        actionability: 8,
        legalAccuracy: 8,
        conversationFlow: 7,
        toolUsage: 8
      },
      criticalIssues: [
        "Assumed matter urgency without basis",
        "Did not confirm legal matter type"
      ],
      feedback: "The conversation was helpful, but could be more efficient.",
      suggestions: [
        "Ask for confirmation on matter urgency",
        "Confirm legal matter type before proceeding"
      ]
    },
    conversationFlow: [
      { role: 'user', content: 'I need legal help.' },
      { role: 'assistant', content: 'I understand you need legal help. Can you tell me more about your situation?' }
    ],
    actualToolCalls: []
  },
  {
    scenario: "Test with No Critical Issues",
    user: "Test User 2",
    passed: true,
    responseTime: 3000,
    evaluation: {
      averageScore: 9.0,
      scores: {
        empathy: 9,
        accuracy: 9,
        completeness: 9,
        relevance: 9,
        professionalism: 9,
        actionability: 9,
        legalAccuracy: 9,
        conversationFlow: 9,
        toolUsage: 9
      },
      criticalIssues: [],
      feedback: "Excellent conversation flow and information collection.",
      suggestions: [
        "Continue with current approach"
      ]
    },
    conversationFlow: [
      { role: 'user', content: 'I need help with a family law matter.' },
      { role: 'assistant', content: 'I can help you with family law matters. Let me collect some information to better assist you.' }
    ],
    actualToolCalls: []
  }
];

// Import the generateHTMLReport function
const { generateHTMLReport } = require('./tests/llm-judge/llm-judge.test.ts');

// Generate the report
const htmlReport = generateHTMLReport(mockResults);

// Write the report
const reportPath = path.join(__dirname, 'test-results', 'flag-fix-test-report.html');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, htmlReport);

console.log(`✅ Test report generated: ${reportPath}`);
console.log('📊 Report includes:');
console.log('  - Test with Critical Issues (should show warning flag)');
console.log('  - Test with No Critical Issues (should show success flag)');
