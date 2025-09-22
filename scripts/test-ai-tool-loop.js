#!/usr/bin/env node

/**
 * 🧪 AI Tool Loop Test Script
 * 
 * Run this script to test the AI tool calling system:
 * 
 * Usage:
 *   node scripts/test-ai-tool-loop.js
 *   node scripts/test-ai-tool-loop.js --verbose
 *   node scripts/test-ai-tool-loop.js --quick
 */

import { testToolLoop, quickToolLoopTest, testToolScenarios } from '../worker/utils/testToolLoop.ts';
import { debugAiToolLoop, quickDebugAiToolLoop } from '../worker/utils/debugAiToolLoop.ts';

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const quick = args.includes('--quick');

  console.log('🧪 AI Tool Loop Test Script');
  console.log('============================');
  console.log(`Mode: ${quick ? 'Quick Test' : 'Full Test'}`);
  console.log(`Verbose: ${verbose ? 'Yes' : 'No'}`);
  console.log('');

  if (quick) {
    // Quick test
    console.log('🚀 Running quick test...');
    try {
      const success = await quickToolLoopTest();
      console.log('');
      console.log(success ? '✅ Quick test PASSED' : '❌ Quick test FAILED');
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('❌ Quick test failed with error:', error);
      process.exit(1);
    }
  } else {
    // Full test
    console.log('🚀 Running full test suite...');
    
    try {
      // Test tool scenarios
      console.log('📋 Testing tool scenarios...');
      const scenarios = await testToolScenarios();
      
      console.log('📊 Scenario Results:');
      console.log(`  Contact Form: ${scenarios.contactForm ? '✅' : '❌'}`);
      console.log(`  Matter Creation: ${scenarios.matterCreation ? '✅' : '❌'}`);
      console.log(`  Lawyer Review: ${scenarios.lawyerReview ? '✅' : '❌'}`);
      console.log('');

      // Debug analysis
      console.log('🔍 Running debug analysis...');
      const debugResult = debugAiToolLoop({
        tools: [
          {
            name: 'show_contact_form',
            description: 'Show a contact form to collect user information',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        ],
        systemPrompt: 'You are a legal intake specialist. When you have legal issue and description, use show_contact_form to collect contact information.',
        state: 'SHOWING_CONTACT_FORM',
        context: {
          hasLegalIssue: true,
          legalIssueType: 'Family Law',
          description: 'Divorce case',
          opposingParty: null,
          isSensitiveMatter: false,
          isGeneralInquiry: false,
          shouldCreateMatter: true,
          state: 'SHOWING_CONTACT_FORM'
        },
        verbose
      });

      console.log('📊 Debug Results:');
      console.log(`  Overall Health: ${debugResult.healthy ? '✅' : '❌'}`);
      console.log(`  Critical Issues: ${debugResult.criticalIssues.length}`);
      console.log(`  Warnings: ${debugResult.warnings.length}`);
      console.log(`  Suggestions: ${debugResult.suggestions.length}`);
      console.log('');

      if (verbose) {
        console.log('📋 Detailed Results:');
        if (debugResult.criticalIssues.length > 0) {
          console.log('  Critical Issues:');
          debugResult.criticalIssues.forEach(issue => console.log(`    ${issue}`));
        }
        if (debugResult.warnings.length > 0) {
          console.log('  Warnings:');
          debugResult.warnings.forEach(warning => console.log(`    ${warning}`));
        }
        if (debugResult.suggestions.length > 0) {
          console.log('  Suggestions:');
          debugResult.suggestions.forEach(suggestion => console.log(`    ${suggestion}`));
        }
        if (debugResult.fixes.length > 0) {
          console.log('  Recommended Fixes:');
          debugResult.fixes.forEach(fix => console.log(`    ${fix}`));
        }
        console.log('');
      }

      // Overall result
      const allPassed = scenarios.contactForm && scenarios.matterCreation && scenarios.lawyerReview && debugResult.healthy;
      console.log(allPassed ? '✅ All tests PASSED' : '❌ Some tests FAILED');
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      console.error('❌ Test suite failed with error:', error);
      process.exit(1);
    }
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Main function failed:', error);
  process.exit(1);
});
