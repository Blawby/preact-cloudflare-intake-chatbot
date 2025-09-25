#!/bin/bash
# Blawby AI Chatbot - Conversation Flow Test Suite
# Tests all conversation scenarios for production readiness
# Covers both public (blawby-ai) and team (north-carolina-legal-services) modes

# set -e  # Removed to prevent early exit on test failures

BASE_URL="http://localhost:8787"
SESSION_PREFIX="convtest-$(date +%s)"
LOG_DIR="test-logs-$(date +%Y%m%d-%H%M%S)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=0

# Create log directory in organized structure
mkdir -p "test-results/production-readiness/$LOG_DIR"
echo -e "${BLUE}📁 Logging responses to: test-results/production-readiness/$LOG_DIR${NC}"

###############################################
# Helpers
###############################################
print_result() {
    local success=$1
    local message=$2
    if [ "$success" = true ]; then
        echo -e "${GREEN}✅ $message${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $message${NC}"
        ((TESTS_FAILED++))
        ((CRITICAL_FAILURES++))
    fi
}

make_request() {
    local team_id=$1
    local session_id=$2
    local messages_json=$3
    local test_name=$4

    local log_file="test-results/production-readiness/$LOG_DIR/${test_name//[^a-zA-Z0-9]/-}.json"
    
    echo -e "${YELLOW}📤 Request: $test_name${NC}"
    echo -e "${YELLOW}   Team: $team_id | Session: $session_id${NC}"
    
    local response=$(curl -s --max-time 30 "$BASE_URL/api/agent/stream" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"messages\": $messages_json,
            \"teamId\": \"$team_id\",
            \"sessionId\": \"$session_id\"
        }" 2>/dev/null)
    
    # Log the full response
    echo "$response" > "$log_file"
    echo -e "${YELLOW}📥 Response logged to: $log_file${NC}"
    
    # Extract and display key response types
    local response_types=$(echo "$response" | grep -o '"type":"[^"]*"' | sort | uniq | tr -d '"' | cut -d: -f2)
    echo -e "${YELLOW}   Response types: $response_types${NC}"
    
    # Check for tool calls
    local tool_calls=$(echo "$response" | grep -o '"name":"[^"]*"' | sort | uniq | tr -d '"' | cut -d: -f2)
    if [ -n "$tool_calls" ]; then
        echo -e "${YELLOW}   Tool calls: $tool_calls${NC}"
    fi
    
    echo "$response"
}

###############################################
# Scenarios
###############################################
scenario_greeting() {
    echo -e "${BLUE}🧪 Initial Greeting${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-greeting" \
        '[{"role":"user","content":"Hi, I need legal help"}]' \
        "Initial Greeting")
    # Goal: Conversational greeting that asks for more details, NOT immediate contact form
    if echo "$resp" | grep -qi "what.*legal.*issue\|tell.*me.*about\|kind.*of.*law" && ! echo "$resp" | grep -qi "contact.*form\|name.*phone.*email"; then
        print_result true "Greeting was conversational and asked for details"
    else
        print_result false "Greeting either jumped to contact form or didn't ask for details"
    fi
}

scenario_multi_turn() {
    echo -e "${BLUE}🧪 Multi-turn Conversation${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-multi" \
        '[{"role":"user","content":"I was fired from my job"},{"role":"assistant","content":"I understand, can you tell me more?"},{"role":"user","content":"My boss accused me unfairly"}]' \
        "Multi-turn Conversation")
    if echo "$resp" | grep -qi "fired" && ! echo "$resp" | grep -qi "spam"; then
        print_result true "Multi-turn handled correctly (no false spam)"
    else
        print_result false "Multi-turn failed"
    fi
}

scenario_case_draft_public() {
    echo -e "${BLUE}🧪 Public Mode Case Draft${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-casedraft" \
        '[{"role":"user","content":"I need help building a case draft for my divorce"}]' \
        "Public Mode Case Draft")
    # Goal: Public mode should help organize info into case draft/PDF, not show contact form
    if echo "$resp" | grep -qi "case.*draft\|organize.*information\|pdf\|document.*preparation" && ! echo "$resp" | grep -qi "contact.*form\|name.*phone.*email"; then
        print_result true "Public mode provided case draft assistance without contact form"
    else
        print_result false "Public mode either didn't help with case draft or showed contact form"
    fi
}

scenario_case_build_team() {
    echo -e "${BLUE}🧪 Team Mode Case Build${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-teamcase" \
        '[{"role":"user","content":"I need help with employment law, I was fired"}]' \
        "Team Mode Case Build")
    # Goal: Team mode should ask for MORE details first, not immediately show contact form
    # The AI should gather information before showing contact form (proper intake flow)
    if echo "$resp" | grep -qi "tell.*me.*more\|when.*were.*fired\|reason.*given\|documentation" && ! echo "$resp" | grep -qi "contact.*form\|name.*phone.*email"; then
        print_result true "Team mode properly asked for more details (correct intake flow)"
    else
        print_result false "Team mode either jumped to contact form or didn't ask for details"
    fi
}

scenario_sensitive_matter() {
    echo -e "${BLUE}🧪 Sensitive Matter Escalation${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-sensitive" \
        '[{"role":"user","content":"My partner was arrested yesterday, I need urgent help"}]' \
        "Sensitive Matter Escalation")
    # Goal: Sensitive/urgent matters should escalate immediately to contact form
    if echo "$resp" | grep -qi "contact.*form\|name.*phone.*email\|urgent.*help\|immediate.*assistance"; then
        print_result true "Sensitive matter properly escalated to contact form"
    else
        print_result false "Sensitive matter not escalated - still asking for details"
    fi
}

scenario_skip_to_lawyer() {
    echo -e "${BLUE}🧪 Skip to Lawyer Flow${NC}"

    # Public mode → Lawyer search
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-skippublic" \
        '[{"role":"user","content":"Skip intake, I need a family lawyer"}]' \
        "Skip to Lawyer Public")
    # Goal: Public mode should help find lawyers, not show contact form
    if echo "$resp" | grep -qi "lawyer.*search\|find.*attorney\|legal.*directory"; then
        print_result true "Public skip properly routed to lawyer search"
    else
        print_result false "Public skip failed - didn't help find lawyers"
    fi

    # Team mode → Contact form
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-skipteam" \
        '[{"role":"user","content":"skip intake"}]' \
        "Skip to Lawyer Team")
    # Goal: Team mode should show contact form when user wants to skip intake
    if echo "$resp" | grep -qi "contact.*form\|name.*phone.*email"; then
        print_result true "Team skip properly showed contact form"
    else
        print_result false "Team skip failed - didn't show contact form"
    fi
}

scenario_urgent_mid_conversation() {
    echo -e "${BLUE}🧪 Urgent Mid-Conversation Escalation${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-urgent-mid" \
        '[{"role":"user","content":"I was driving the school bus and an accident happened."},{"role":"assistant","content":"I am so sorry to hear that. Can you share more details?"},{"role":"user","content":"The dog ran into the street and the police were called."},{"role":"assistant","content":"Thank you for letting me know. Were there any injuries?"},{"role":"user","content":"They are here now, I need a lawyer ASAP."}]' \
        "Urgent Lawyer Escalation")

    if echo "$resp" | grep -q '"type":"contact_form"' && ! echo "$resp" | grep -qi 'request_lawyer_review'; then
        print_result true "Urgent mid-conversation message triggered contact form without premature lawyer review"
    else
        print_result false "Urgent mid-conversation flow failed (no contact form or lawyer review triggered too early)"
    fi
}

scenario_general_inquiry() {
    echo -e "${BLUE}🧪 General Inquiry${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-general" \
        '[{"role":"user","content":"What services do you offer?"}]' \
        "General Inquiry")
    # Goal: General inquiries should be answered politely without jumping to contact form
    if echo "$resp" | grep -qi "services\|legal.*help\|assistance" && ! echo "$resp" | grep -qi "contact.*form\|name.*phone.*email"; then
        print_result true "General inquiry answered politely without contact form"
    else
        print_result false "General inquiry either mishandled or jumped to contact form"
    fi
}

scenario_context_persistence() {
    echo -e "${BLUE}🧪 Context Persistence${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-context" \
        '[{"role":"user","content":"I need help with a landlord issue"},{"role":"assistant","content":"Is this about eviction?"},{"role":"user","content":"Yes"}]' \
        "Context Persistence")
    # Goal: AI should remember previous context and build on it
    if echo "$resp" | grep -qi "eviction\|landlord.*issue\|tenant.*rights"; then
        print_result true "Context persisted correctly - AI remembered eviction context"
    else
        print_result false "Context was lost - AI didn't reference previous conversation"
    fi
}

scenario_document_gathering() {
    echo -e "${BLUE}🧪 Document Gathering${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-docs" \
        '[{"role":"user","content":"I am preparing for divorce and have financial statements"}]' \
        "Document Gathering")
    # Goal: AI should recognize documents mentioned and ask for more or offer to analyze them
    if echo "$resp" | grep -qi "document\|financial.*statement\|upload\|analyze.*document"; then
        print_result true "AI recognized and engaged with document gathering"
    else
        print_result false "AI didn't engage with document gathering"
    fi
}

scenario_contact_form_prefill() {
    echo -e "${BLUE}🧪 Contact Form Prefill & Case Summary${NC}"

    local session_id="$SESSION_PREFIX-prefill"
    local initial_messages='[{"role":"user","content":"Hi, my name is Jane Doe. I am located in Raleigh, NC and my email is jane.doe@example.com with phone 919-555-1234. I was just fired and it is urgent - I want to speak with a lawyer right away."}]'

    local resp=$(make_request "north-carolina-legal-services" "$session_id" \
        "$initial_messages" \
        "Team Contact Prefill")

    if echo "$resp" | grep -q '"type":"contact_form"' && \
       echo "$resp" | grep -q '"initialValues"' && \
       echo "$resp" | grep -q 'Jane Doe'; then
        print_result true "Contact form included prefilled initial values"
    else
        print_result false "Contact form did not include expected initial values"
    fi

    local pdf_session="$SESSION_PREFIX-prefill-pdf"
    local pdf_messages='[{"role":"user","content":"Hi, I was just fired from my job yesterday and need urgent legal help."},{"role":"assistant","content":"I am sorry to hear that. Could you share your contact information so we can stay in touch?"},{"role":"user","content":"Contact Information:\\nName: Jane Doe\\nEmail: jane.doe@example.com\\nPhone: 919-555-1234\\nLocation: Raleigh, NC\\nOpposing Party: ACME Corp"}]'

    resp=$(make_request "north-carolina-legal-services" "$pdf_session" \
        "$pdf_messages" \
        "Team Case Summary PDF")

    if echo "$resp" | grep -q '"case_summary_pdf"'; then
        print_result true "Matter creation returned case summary PDF metadata"
    else
        print_result false "Case summary PDF metadata missing from tool result"
    fi
}

###############################################
# Run All Scenarios
###############################################
scenario_greeting
scenario_multi_turn
scenario_case_draft_public
scenario_case_build_team
scenario_sensitive_matter
scenario_skip_to_lawyer
scenario_general_inquiry
scenario_context_persistence
scenario_document_gathering
scenario_contact_form_prefill
scenario_urgent_mid_conversation

###############################################
# Summary
###############################################
echo ""
echo -e "${BLUE}📊 TEST SUMMARY${NC}"
echo "====================================="
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo -e "${RED}🚨 Critical Failures: $CRITICAL_FAILURES${NC}"
echo ""

echo ""
echo -e "${BLUE}📁 Detailed response logs saved to: test-results/production-readiness/$LOG_DIR${NC}"
echo -e "${YELLOW}   Each test response is saved as a separate JSON file${NC}"
echo -e "${YELLOW}   Use these logs to debug why specific features aren't working${NC}"
echo ""
echo -e "${BLUE}🔍 To view the logs, use these terminal commands:${NC}"
echo -e "${YELLOW}   # View all test log files:${NC}"
echo -e "   ls -la test-results/production-readiness/$LOG_DIR/"
echo ""
echo -e "${YELLOW}   # View a specific test response:${NC}"
echo -e "   cat test-results/production-readiness/$LOG_DIR/Initial-Greeting.json | jq ."
echo ""
echo -e "${YELLOW}   # View all responses in a readable format:${NC}"
echo -e "   for file in test-results/production-readiness/$LOG_DIR/*.json; do echo \"=== \$(basename \$file) ===\"; cat \$file | jq .; echo; done"
echo ""
echo -e "${YELLOW}   # Search for specific content across all logs:${NC}"
echo -e "   grep -r \"contact.*form\" test-results/production-readiness/$LOG_DIR/ || echo \"No contact forms found\""
echo ""
echo -e "${BLUE}📋 Development Commands:${NC}"
echo -e "${YELLOW}   # Start frontend only:${NC}"
echo -e "   npm run dev"
echo ""
echo -e "${YELLOW}   # Start worker only:${NC}"
echo -e "   npm run dev:worker"
echo ""
echo -e "${YELLOW}   # Start both frontend and worker:${NC}"
echo -e "   npm run dev:full"
echo ""
echo -e "${YELLOW}   # Check worker health:${NC}"
echo -e "   curl -s http://localhost:8787/api/health"
echo ""
echo -e "${YELLOW}   # Run this conversation test:${NC}"
echo -e "   npm run test:conversation"
echo ""

if [ $CRITICAL_FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 Conversation flow READY for production${NC}"
    exit 0
else
    echo -e "${RED}🚨 Conversation flow NOT ready - critical issues detected${NC}"
    echo -e "${YELLOW}💡 Check the log files above to see exactly what responses were received${NC}"
    exit 1
fi
