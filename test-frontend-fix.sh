#!/bin/bash

# Test frontend conversation flow fix
BASE_URL="https://blawby-ai-chatbot.paulchrisluke.workers.dev"
TEAM_ID="north-carolina-legal-services"

echo "🔧 Testing Fixed Frontend Conversation Flow"
echo "==========================================="
echo ""

echo "✅ Expected Frontend Flow After Fix:"
echo "1. User selects 'Family Law' from buttons"
echo "2. Frontend calls: POST /api/case-creation {step: 'service-selection', service: 'Family Law'}"
echo "3. API returns: {step: 'questions', message: 'Question 1', currentQuestion: 1}"
echo "4. Frontend sets: caseState.step = 'ai-questions', currentQuestionIndex = 0"
echo "5. User answers 'divorce'"
echo "6. Frontend calls: POST /api/case-creation {step: 'questions', currentQuestionIndex: 1}"
echo "7. API returns: {step: 'questions', message: 'Question 2', currentQuestion: 2}"
echo "8. Frontend displays Question 2"
echo "9. Process continues until all questions answered"
echo ""

echo "🧪 Testing API Endpoints to Verify Expected Behavior:"
echo ""

# Test 1: Service selection should return questions step
echo "1. Service Selection (Family Law):"
result1=$(curl -s -X POST "$BASE_URL/api/case-creation" \
  -H "Content-Type: application/json" \
  -d '{"teamId": "'$TEAM_ID'", "step": "service-selection", "service": "Family Law"}')

step1=$(echo "$result1" | jq -r '.step')
question1=$(echo "$result1" | jq -r '.currentQuestion // "N/A"')
echo "   API Response: step='$step1', currentQuestion='$question1'"
echo "   Expected: step='questions', currentQuestion='1'"
echo "   ✅ $([ "$step1" = "questions" ] && echo "PASS" || echo "FAIL")"
echo ""

# Test 2: First question answer should return second question
echo "2. First Question Answer (divorce):"
result2=$(curl -s -X POST "$BASE_URL/api/case-creation" \
  -H "Content-Type: application/json" \
  -d '{"teamId": "'$TEAM_ID'", "step": "questions", "service": "Family Law", "currentQuestionIndex": 1, "answers": {"q1": "divorce"}}')

step2=$(echo "$result2" | jq -r '.step')
question2=$(echo "$result2" | jq -r '.currentQuestion // "N/A"')
echo "   API Response: step='$step2', currentQuestion='$question2'"
echo "   Expected: step='questions', currentQuestion='2'"
echo "   ✅ $([ "$step2" = "questions" ] && [ "$question2" = "2" ] && echo "PASS" || echo "FAIL")"
echo ""

# Test 3: Second question answer should return third question
echo "3. Second Question Answer (yes, 2 children):"
result3=$(curl -s -X POST "$BASE_URL/api/case-creation" \
  -H "Content-Type: application/json" \
  -d '{"teamId": "'$TEAM_ID'", "step": "questions", "service": "Family Law", "currentQuestionIndex": 2, "answers": {"q1": "divorce", "q2": "yes, 2 children"}}')

step3=$(echo "$result3" | jq -r '.step')
question3=$(echo "$result3" | jq -r '.currentQuestion // "N/A"')
echo "   API Response: step='$step3', currentQuestion='$question3'"
echo "   Expected: step='questions', currentQuestion='3'"
echo "   ✅ $([ "$step3" = "questions" ] && [ "$question3" = "3" ] && echo "PASS" || echo "FAIL")"
echo ""

echo "🎯 Frontend Test Instructions:"
echo "1. Open: http://localhost:5173/?teamId=north-carolina-legal-services&position=inline"
echo "2. Click 'Create Case'"
echo "3. Select 'Family Law' from buttons"
echo "4. Answer 'divorce' and press Enter"
echo "5. Should automatically show Question 2: 'Are there any children involved?'"
echo "6. Answer 'yes, 2 children' and press Enter"
echo "7. Should automatically show Question 3: 'Have you already filed any legal documents?'"
echo ""
echo "If the above works, the conversation flow is fixed! 🎉" 