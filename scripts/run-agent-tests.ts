#!/usr/bin/env tsx

// Script to run AI agent tests and generate HTML report
// Usage: npm run test:agent-report

import { runTestsAndGenerateReport } from '../tests/llm-judge/fixtures/test-runner.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  try {
    console.log('🚀 Starting AI Agent Test Suite...');
    console.log('📋 This will run all test cases and generate an HTML report');
    console.log('');
    
    // Run tests and generate report
    const htmlReport = await runTestsAndGenerateReport();
    
    // Save report to file
    const reportPath = join(process.cwd(), 'test-results', 'agent-test-report.html');
    const reportDir = join(process.cwd(), 'test-results');
    
    // Ensure test-results directory exists
    try {
      const fs = await import('fs');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating test-results directory:', error);
    }
    
    writeFileSync(reportPath, htmlReport, 'utf8');
    
    console.log('');
    console.log('✅ Test execution completed!');
    console.log(`📄 HTML report saved to: ${reportPath}`);
    console.log('');
    console.log('🌐 To view the report:');
    console.log(`   Open ${reportPath} in your web browser`);
    console.log('   Or run: open test-results/agent-test-report.html');
    console.log('');
    console.log('📊 The report includes:');
    console.log('   • Summary statistics');
    console.log('   • Individual test results');
    console.log('   • Judge evaluations (1-10 scores)');
    console.log('   • Performance metrics');
    console.log('   • Feedback and suggestions');
    console.log('   • Critical issues identified');
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  }
}

// Run the script
main();
