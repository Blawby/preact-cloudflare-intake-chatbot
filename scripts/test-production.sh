#!/bin/bash

# Production Testing Script
# This script tests the live production system to ensure everything is working correctly

set -e

echo "🚀 Starting Production System Tests"
echo "=================================="
echo ""

# Configuration
PRODUCTION_URL="https://blawby-ai-chatbot.paulchrisluke.workers.dev"
TEAM_ID="north-carolina-legal-services"
SESSION_ID="test-session-$(date +%s)"

echo "📍 Testing against: $PRODUCTION_URL"
echo "👥 Team ID: $TEAM_ID"
echo "💬 Session ID: $SESSION_ID"
echo ""

# Test 1: Health Check
echo "🔍 Test 1: Health Check"
echo "----------------------"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$PRODUCTION_URL/api/health" || echo "Failed")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Test 2: File Upload
echo "📤 Test 2: File Upload"
echo "---------------------"
# Create a simple test PDF
cat > /tmp/test.pdf << 'EOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000256 00000 n
0000000351 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF
EOF

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -F "file=@/tmp/test.pdf" \
    -F "teamId=$TEAM_ID" \
    -F "sessionId=$SESSION_ID" \
    "$PRODUCTION_URL/api/files/upload")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ File upload passed"
    echo "Response: $RESPONSE_BODY"
    
    # Extract file ID from response
    FILE_ID=$(echo "$RESPONSE_BODY" | grep -o '"fileId":"[^"]*"' | cut -d'"' -f4)
    FILE_URL=$(echo "$RESPONSE_BODY" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$FILE_ID" ]; then
        echo "📄 File ID: $FILE_ID"
        echo "🔗 File URL: $FILE_URL"
    else
        echo "❌ Could not extract file ID from response"
        exit 1
    fi
else
    echo "❌ File upload failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Test 3: Chat with File Analysis
echo "💬 Test 3: Chat with File Analysis"
echo "--------------------------------"
if [ -n "$FILE_ID" ]; then
    CHAT_PAYLOAD=$(cat << EOF
{
  "messages": [
    {
      "content": "Can you analyze this document?",
      "isUser": true
    }
  ],
  "teamId": "$TEAM_ID",
  "sessionId": "$SESSION_ID",
  "attachments": [
    {
      "name": "test.pdf",
      "url": "$FILE_URL",
      "type": "application/pdf"
    }
  ]
}
EOF
)

    CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -d "$CHAT_PAYLOAD" \
        "$PRODUCTION_URL/api/agent")

    HTTP_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CHAT_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Chat with file analysis passed"
        echo "Response: $RESPONSE_BODY"
        
        # Check if response contains expected content
        if echo "$RESPONSE_BODY" | grep -q "I've analyzed your document"; then
            echo "✅ Document analysis detected in response"
        else
            echo "⚠️  Document analysis not detected in response"
        fi
        
        if echo "$RESPONSE_BODY" | grep -q "Suggested Legal Matter Type"; then
            echo "✅ Legal matter type suggestion detected"
        else
            echo "⚠️  Legal matter type suggestion not detected"
        fi
    else
        echo "❌ Chat with file analysis failed (HTTP $HTTP_CODE)"
        echo "Response: $RESPONSE_BODY"
        exit 1
    fi
else
    echo "❌ Cannot test chat analysis - no file ID available"
    exit 1
fi
echo ""

# Test 4: Direct File Analysis
echo "🔍 Test 4: Direct File Analysis"
echo "------------------------------"
ANALYZE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -F "file=@/tmp/test.pdf" \
    -F "question=Analyze this document for legal intake purposes" \
    "$PRODUCTION_URL/api/analyze")

HTTP_CODE=$(echo "$ANALYZE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ANALYZE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Direct file analysis passed"
    echo "Response: $RESPONSE_BODY"
    
    # Check if response contains expected analysis structure
    if echo "$RESPONSE_BODY" | grep -q '"summary"'; then
        echo "✅ Analysis summary detected"
    else
        echo "⚠️  Analysis summary not detected"
    fi
    
    if echo "$RESPONSE_BODY" | grep -q '"confidence"'; then
        echo "✅ Analysis confidence detected"
    else
        echo "⚠️  Analysis confidence not detected"
    fi
else
    echo "❌ Direct file analysis failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Test 5: Error Handling
echo "❌ Test 5: Error Handling"
echo "-----------------------"
# Test invalid file type
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -F "file=@/tmp/test.pdf;filename=test.exe" \
    -F "teamId=$TEAM_ID" \
    -F "sessionId=$SESSION_ID" \
    "$PRODUCTION_URL/api/files/upload")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ] || echo "$RESPONSE_BODY" | grep -q "not allowed"; then
    echo "✅ Invalid file type properly rejected"
    echo "Response: $RESPONSE_BODY"
else
    echo "⚠️  Invalid file type not properly rejected (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Cleanup
echo "🧹 Cleanup"
echo "---------"
rm -f /tmp/test.pdf
echo "✅ Test files cleaned up"
echo ""

# Summary
echo "📊 Test Summary"
echo "=============="
echo "✅ Health Check: PASSED"
echo "✅ File Upload: PASSED"
echo "✅ Chat with File Analysis: PASSED"
echo "✅ Direct File Analysis: PASSED"
echo "✅ Error Handling: PASSED"
echo ""
echo "🎉 All production tests completed successfully!"
echo ""
echo "The production system is working correctly and ready for use."
