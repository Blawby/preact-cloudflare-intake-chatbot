#!/usr/bin/env node

import fs from 'fs';

async function testAdobeAnalysisDetailed() {
  try {
    console.log('🧪 DETAILED ADOBE PDF ANALYSIS TEST');
    console.log('=====================================\n');
    
    // Step 1: Check if PDF file exists
    const pdfPath = '/Users/paulchrisluke/Repos2025/preact-cloudflare-intake-chatbot/blawby-ai-chatbot/Ai-native-vs-platform-revenue.pdf';
    console.log('📁 Step 1: Checking PDF file...');
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }
    
    const stats = fs.statSync(pdfPath);
    console.log('✅ PDF file found:');
    console.log(`   - Path: ${pdfPath}`);
    console.log(`   - Size: ${stats.size} bytes`);
    console.log(`   - Modified: ${stats.mtime}\n`);
    
    // Step 2: Create proper File object
    console.log('📄 Step 2: Creating File object...');
    const fileBuffer = fs.readFileSync(pdfPath);
    const file = new File([fileBuffer], 'Ai-native-vs-platform-revenue.pdf', { 
      type: 'application/pdf' 
    });
    console.log('✅ File object created:');
    console.log(`   - Name: ${file.name}`);
    console.log(`   - Type: ${file.type}`);
    console.log(`   - Size: ${file.size} bytes\n`);
    
    // Step 3: Upload file first (like the real system does)
    console.log('🚀 Step 3: Uploading file to system...');
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('teamId', 'test-team');
    uploadFormData.append('sessionId', 'test-session-' + Date.now());
    
    console.log('   - Uploading to: http://localhost:8787/api/files/upload');
    console.log('   - Team ID: test-team');
    console.log('   - Session ID: test-session-' + Date.now() + '\n');
    
    const uploadStartTime = Date.now();
    const uploadResponse = await fetch('http://localhost:8787/api/files/upload', {
      method: 'POST',
      body: uploadFormData
    });
    const uploadEndTime = Date.now();
    
    console.log(`⏱️  Upload completed in ${uploadEndTime - uploadStartTime}ms`);
    console.log(`📊 Upload response status: ${uploadResponse.status} ${uploadResponse.statusText}\n`);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload failed:');
      console.error('   Status:', uploadResponse.status);
      console.error('   Error:', errorText);
      return;
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ File uploaded successfully');
    console.log('   - File ID:', uploadResult.data?.fileId);
    console.log('   - File Name:', uploadResult.data?.fileName);
    console.log('   - File Type:', uploadResult.data?.fileType);
    console.log('   - File Size:', uploadResult.data?.fileSize);
    console.log('');
    
    // Step 4: Test analyze endpoint with uploaded file
    console.log('🚀 Step 4: Testing analyze endpoint with uploaded file...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('q', 'Analyze this document and extract key information about AI native vs platform revenue models. Focus on business models, revenue strategies, and key insights.');
    
    console.log('   - Sending request to: http://localhost:8787/api/analyze');
    console.log('   - Question: Analyze this document and extract key information about AI native vs platform revenue models...\n');
    
    const startTime = Date.now();
    const response = await fetch('http://localhost:8787/api/analyze', {
      method: 'POST',
      body: formData
    });
    const endTime = Date.now();
    
    console.log(`⏱️  Request completed in ${endTime - startTime}ms`);
    console.log(`📊 Response status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:');
      console.error('   Status:', response.status);
      console.error('   Error:', errorText);
      return;
    }
    
    // Step 5: Parse and display results
    console.log('📋 Step 5: Parsing response...');
    const result = await response.json();
    console.log('✅ Response parsed successfully');
    
    // Show raw response for debugging
    console.log('\n🔍 RAW RESPONSE DEBUG:');
    console.log('======================');
    console.log('Full response object keys:', Object.keys(result));
    if (result.data?.analysis?.debug) {
      console.log('Debug object keys:', Object.keys(result.data.analysis.debug));
    }
    console.log('');
    
    // Step 6: Display analysis results
    console.log('📊 ANALYSIS RESULTS');
    console.log('==================');
    console.log(`Success: ${result.success}`);
    console.log(`Timestamp: ${result.data?.metadata?.timestamp || 'N/A'}`);
    console.log(`File Name: ${result.data?.metadata?.fileName || 'N/A'}`);
    console.log(`File Type: ${result.data?.metadata?.fileType || 'N/A'}`);
    console.log(`File Size: ${result.data?.metadata?.fileSize || 'N/A'} bytes`);
    console.log(`Question: ${result.data?.metadata?.question || 'N/A'}\n`);
    
    if (result.data?.analysis) {
      const analysis = result.data.analysis;
      console.log('🔍 ANALYSIS DETAILS');
      console.log('==================');
      console.log(`Confidence: ${analysis.confidence || 0}`);
      console.log(`Summary Length: ${analysis.summary?.length || 0} characters`);
      console.log(`Key Facts Count: ${analysis.key_facts?.length || 0}`);
      console.log(`Entities - People: ${analysis.entities?.people?.length || 0}`);
      console.log(`Entities - Organizations: ${analysis.entities?.orgs?.length || 0}`);
      console.log(`Entities - Dates: ${analysis.entities?.dates?.length || 0}`);
      console.log(`Action Items Count: ${analysis.action_items?.length || 0}`);
      console.log(`Error: ${analysis.error || 'None'}\n`);
      
      // Display summary
      if (analysis.summary) {
        console.log('📄 SUMMARY');
        console.log('==========');
        console.log(analysis.summary);
        console.log('');
      }
      
      // Display key facts
      if (analysis.key_facts && analysis.key_facts.length > 0) {
        console.log('🔑 KEY FACTS');
        console.log('============');
        analysis.key_facts.forEach((fact, i) => {
          console.log(`${i + 1}. ${fact}`);
        });
        console.log('');
      }
      
      // Display entities
      if (analysis.entities) {
        if (analysis.entities.people && analysis.entities.people.length > 0) {
          console.log('👥 PEOPLE');
          console.log('=========');
          analysis.entities.people.forEach((person, i) => {
            console.log(`${i + 1}. ${person}`);
          });
          console.log('');
        }
        
        if (analysis.entities.orgs && analysis.entities.orgs.length > 0) {
          console.log('🏢 ORGANIZATIONS');
          console.log('================');
          analysis.entities.orgs.forEach((org, i) => {
            console.log(`${i + 1}. ${org}`);
          });
          console.log('');
        }
        
        if (analysis.entities.dates && analysis.entities.dates.length > 0) {
          console.log('📅 DATES');
          console.log('========');
          analysis.entities.dates.forEach((date, i) => {
            console.log(`${i + 1}. ${date}`);
          });
          console.log('');
        }
      }
      
      // Display action items
      if (analysis.action_items && analysis.action_items.length > 0) {
        console.log('✅ ACTION ITEMS');
        console.log('===============');
        analysis.action_items.forEach((item, i) => {
          console.log(`${i + 1}. ${item}`);
        });
        console.log('');
      }
      
      // Display error if any
      if (analysis.error) {
        console.log('❌ ERROR DETAILS');
        console.log('================');
        console.log(analysis.error);
        console.log('');
      }
    }
    
    // Step 7: Display disclaimer
    if (result.data?.disclaimer) {
      console.log('⚖️  DISCLAIMER');
      console.log('==============');
      console.log(result.data.disclaimer);
      console.log('');
    }
    
    // Step 8: Debug Adobe Extraction
    console.log('🔍 ADOBE EXTRACTION DEBUG');
    console.log('=========================');
    
    // Check if we can see any Adobe-related logs in the response
    if (result.data?.analysis?.summary?.includes('Unable to analyze') || 
        result.data?.analysis?.summary?.includes('not provided')) {
      console.log('❌ Adobe extraction appears to have failed');
      console.log('   - AI is saying content was not provided');
      console.log('   - This suggests Adobe PDF Services did not extract text');
      console.log('   - Check Adobe service configuration and credentials\n');
    } else {
      console.log('✅ Adobe extraction appears to have worked');
      console.log('   - AI received content to analyze\n');
    }
    
    // Step 9: Display debug information
    console.log('🔍 Step 9: Adobe Configuration Debug...');
    console.log('=====================================');
    console.log(`Adobe Enabled: ${result.data?.metadata?.ENABLE_ADOBE_EXTRACT || 'Unknown'}`);
    console.log(`Adobe Client ID: ${result.data?.metadata?.ADOBE_CLIENT_ID || 'Unknown'}`);
    console.log(`Adobe Client Secret: ${result.data?.metadata?.ADOBE_CLIENT_SECRET || 'Unknown'}`);
    console.log(`File Type Eligible: ${result.data?.metadata?.isAdobeEligible || 'Unknown'}`);
    
    if (result.data?.analysis?.debug) {
      console.log('\n🔍 Analysis Debug Info:');
      console.log(`   - Adobe Enabled: ${result.data.analysis.debug.adobeEnabled}`);
      console.log(`   - Adobe Client ID Set: ${result.data.analysis.debug.adobeClientIdSet}`);
      console.log(`   - Adobe Client Secret Set: ${result.data.analysis.debug.adobeClientSecretSet}`);
      console.log(`   - File Type Eligible: ${result.data.analysis.debug.fileTypeEligible}`);
      console.log(`   - Analysis Method: ${result.data.analysis.debug.analysisMethod}`);
      console.log(`   - Debug Timestamp: ${result.data.analysis.debug.debugTimestamp || 'N/A'}`);
      console.log(`   - Code Version: ${result.data.analysis.debug.codeVersion || 'N/A'}`);
      console.log(`   - Summary Contains "Unable": ${result.data.analysis.debug.summaryContainsUnable || false}`);
      console.log(`   - Summary Contains "not provided": ${result.data.analysis.debug.summaryContainsNotProvided || false}`);
      console.log(`   - Summary Length: ${result.data.analysis.debug.summaryLength || 0}`);
      console.log(`   - Adobe Extract Text Length: ${result.data.analysis.debug.adobeExtractTextLength || 0}`);
      console.log(`   - Adobe Extract Text Preview: ${result.data.analysis.debug.adobeExtractTextPreview || 'N/A'}\n`);
    }
    
    // Step 10: Summary
    console.log('📈 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ Adobe Analysis: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ AI Processing: ${result.data?.analysis?.error ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ Content Extraction: ${result.data?.analysis?.summary && result.data.analysis.summary.length > 50 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Structured Data: ${result.data?.analysis?.key_facts && result.data.analysis.key_facts.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.data?.analysis?.confidence > 0.5) {
      console.log('🎯 High confidence analysis - Adobe extraction likely successful');
    } else if (result.data?.analysis?.confidence > 0.1) {
      console.log('⚠️  Low confidence analysis - may have used fallback method');
    } else {
      console.log('❌ Very low confidence - analysis may have failed');
    }
    
    // Step 11: Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    if (result.data?.analysis?.summary?.includes('Unable to analyze')) {
      console.log('1. Check Adobe PDF Services API credentials in .dev.vars');
      console.log('2. Verify ENABLE_ADOBE_EXTRACT is set to "true" in wrangler.toml');
      console.log('3. Check Adobe service logs for extraction errors');
      console.log('4. Test Adobe API directly with a simple PDF');
    } else {
      console.log('1. Adobe extraction appears to be working');
      console.log('2. Check if the PDF content is being properly passed to AI');
      console.log('3. Verify AI model is receiving the extracted text');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAdobeAnalysisDetailed();
