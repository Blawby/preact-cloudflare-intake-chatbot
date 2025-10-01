#!/bin/bash
# Blawby AI Chatbot - Conversation Flow Test Suite (Updated for Refactored Code)

set -e

BASE_URL="http://localhost:8787"
SESSION_PREFIX="convtest-$(date +%s)"
LOG_DIR="test-logs-$(date +%Y%m%d-%H%M%S)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=0

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
    
    echo "$response" > "$log_file"
    echo -e "${YELLOW}📥 Response logged to: $log_file${NC}"
    
    # Extract response types
    local response_types=$(echo "$response" | grep -o '"type":"[^"]*"' | sort | uniq | tr -d '"' | cut -d: -f2)
    echo -e "${YELLOW}   Response types: $response_types${NC}"
    
    # Check for tool calls - now looking for tool_call events from SSEController
    local tool_names=$(echo "$response" | grep '"type":"tool_call"' | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$tool_names" ]; then
        echo -e "${YELLOW}   Tools executed: $tool_names${NC}"
    fi
    
    echo "$response"
}

# New helper: Check for placeholder detection
check_no_placeholders() {
    local resp=$1
    # The refactored code should prevent placeholder values from reaching create_matter
    if echo "$resp" | grep -qi 'client name\|client location\|user name\|placeholder'; then
        return 1  # Found placeholders - bad
    else
        return 0  # No placeholders - good
    fi
}

###############################################
# Scenarios (Updated for Refactored Code)
###############################################

scenario_greeting() {
    echo -e "${BLUE}🧪 Initial Greeting${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-greeting" \
        '[{"role":"user","content":"Hi, I need legal help"}]' \
        "Initial Greeting")
    
    # Refactored code should provide conversational response via SSEController.text()
    if echo "$resp" | grep -q '"type":"text"' && \
       echo "$resp" | grep -qi "what.*legal.*issue\|tell.*me.*about\|kind.*of.*law" && \
       ! echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "Greeting was conversational (text event) without contact form"
    else
        print_result false "Greeting didn't use proper text event or showed contact form"
    fi
}

scenario_multi_turn() {
    echo -e "${BLUE}🧪 Multi-turn Conversation${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-multi" \
        '[{"role":"user","content":"I was fired from my job"},{"role":"assistant","content":"I understand, can you tell me more?"},{"role":"user","content":"My boss accused me unfairly"}]' \
        "Multi-turn Conversation")
    
    # ContextDetector should properly identify employment law context
    if echo "$resp" | grep -qi "fired\|employment" && \
       ! echo "$resp" | grep -qi "spam"; then
        print_result true "Multi-turn context maintained (Employment Law detected)"
    else
        print_result false "Context detection failed in multi-turn"
    fi
}

scenario_case_draft_public() {
    echo -e "${BLUE}🧪 Public Mode Case Draft${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-casedraft" \
        '[{"role":"user","content":"I need help building a case draft for my divorce"}]' \
        "Public Mode Case Draft")
    
    # Public mode (isPublicMode returns true) should help organize info
    if echo "$resp" | grep -q '"type":"text"' && \
       echo "$resp" | grep -qi "case.*draft\|organize.*information\|pdf\|document" && \
       ! echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "Public mode provided case draft help without contact form"
    else
        print_result false "Public mode behavior incorrect"
    fi
}

scenario_case_build_team() {
    echo -e "${BLUE}🧪 Team Mode Case Build${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-teamcase" \
        '[{"role":"user","content":"I need help with employment law, I was fired"}]' \
        "Team Mode Case Build")
    
    # ContextDetector should identify Employment Law, state should be QUALIFYING_LEAD
    # getAvailableTools should NOT include contact form yet (not qualified)
    if echo "$resp" | grep -qi "tell.*me.*more\|when.*were.*fired\|reason.*given\|documentation" && \
       ! echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "Team mode properly gathering info (QUALIFYING_LEAD state)"
    else
        print_result false "Team mode jumped to contact form too early"
    fi
}

scenario_sensitive_matter() {
    echo -e "${BLUE}🧪 Sensitive Matter Escalation${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-sensitive" \
        '[{"role":"user","content":"My partner was arrested yesterday, I need urgent help"}]' \
        "Sensitive Matter Escalation")
    
    # ContextDetector should flag isSensitiveMatter=true and isQualifiedLead=true
    # This should trigger contact form (state: QUALIFYING_LEAD with qualified=true)
    if echo "$resp" | grep -q '"type":"contact_form"' || \
       echo "$resp" | grep -q '"type":"tool_call".*"name":"show_contact_form"'; then
        print_result true "Sensitive matter escalated to contact form"
    else
        print_result false "Sensitive matter not properly escalated"
    fi
}

scenario_skip_to_lawyer() {
    echo -e "${BLUE}🧪 Skip to Lawyer Flow${NC}"
    
    # Public mode
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-skippublic" \
        '[{"role":"user","content":"Skip intake, I need a family lawyer"}]' \
        "Skip to Lawyer Public")
    
    # isPublicMode(teamId) returns true for blawby-ai
    if echo "$resp" | grep -qi "lawyer.*search\|find.*attorney\|legal.*directory"; then
        print_result true "Public skip routed to lawyer search"
    else
        print_result false "Public skip failed"
    fi
    
    # Team mode
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-skipteam" \
        '[{"role":"user","content":"skip intake"}]' \
        "Skip to Lawyer Team")
    
    # Team mode should show contact form when skipping
    if echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "Team skip showed contact form"
    else
        print_result false "Team skip didn't show contact form"
    fi
}

scenario_urgent_mid_conversation() {
    echo -e "${BLUE}🧪 Urgent Mid-Conversation Escalation${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-urgent-mid" \
        '[{"role":"user","content":"I was driving the school bus and an accident happened."},{"role":"assistant","content":"I am so sorry to hear that. Can you share more details?"},{"role":"user","content":"The dog ran into the street and the police were called."},{"role":"assistant","content":"Thank you for letting me know. Were there any injuries?"},{"role":"user","content":"They are here now, I need a lawyer ASAP."}]' \
        "Urgent Lawyer Escalation")
    
    # ContextDetector should detect urgency="high" and qualified lead
    if echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "Urgent escalation triggered contact form"
    else
        print_result false "Urgent message didn't trigger proper escalation"
    fi
}

scenario_general_inquiry() {
    echo -e "${BLUE}🧪 General Inquiry${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-general" \
        '[{"role":"user","content":"What services do you offer?"}]' \
        "General Inquiry")
    
    # ContextDetector.isGeneralInquiry should be true
    # Should get text response, no contact form
    if echo "$resp" | grep -q '"type":"text"' && \
       echo "$resp" | grep -qi "services\|legal.*help\|assistance" && \
       ! echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "General inquiry handled with text response"
    else
        print_result false "General inquiry not handled correctly"
    fi
}

scenario_context_persistence() {
    echo -e "${BLUE}🧪 Context Persistence${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-context" \
        '[{"role":"user","content":"I need help with a landlord issue"},{"role":"assistant","content":"Is this about eviction?"},{"role":"user","content":"Yes"}]' \
        "Context Persistence")
    
    # ContextDetector should identify Landlord/Tenant category
    if echo "$resp" | grep -qi "eviction\|landlord.*issue\|tenant.*rights"; then
        print_result true "Context persisted (Landlord/Tenant detected)"
    else
        print_result false "Context lost"
    fi
}

scenario_document_gathering() {
    echo -e "${BLUE}🧪 Document Gathering${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-docs" \
        '[{"role":"user","content":"I am preparing for divorce and have financial statements"}]' \
        "Document Gathering")
    
    # Should detect Family Law and mention documents
    if echo "$resp" | grep -qi "document\|financial.*statement\|upload\|analyze"; then
        print_result true "Document gathering engaged"
    else
        print_result false "Document gathering not engaged"
    fi
}

scenario_contact_form_prefill() {
    echo -e "${BLUE}🧪 Contact Form Prefill & Case Summary${NC}"
    local session_id="$SESSION_PREFIX-prefill"
    local initial_messages='[{"role":"user","content":"Hi, my name is Jane Doe. I am located in Raleigh, NC and my email is jane.doe@example.com with phone 919-555-1234. I was just fired and it is urgent - I want to speak with a lawyer right away."}]'
    
    local resp=$(make_request "north-carolina-legal-services" "$session_id" \
        "$initial_messages" \
        "Team Contact Prefill")
    
    # ContextDetector.extractContactInfo should find all contact details
    # handleShowContactForm should populate initialValues
    if echo "$resp" | grep -q '"type":"contact_form"' && \
       echo "$resp" | grep -q '"initialValues"' && \
       echo "$resp" | grep -q 'Jane Doe\|jane.doe@example.com'; then
        print_result true "Contact form includes prefilled values"
    else
        print_result false "Contact form missing initial values"
    fi
    
    # Test matter creation with PDF
    local pdf_session="$SESSION_PREFIX-prefill-pdf"
    local pdf_messages='[{"role":"user","content":"Hi, I was just fired from my job yesterday and need urgent legal help."},{"role":"assistant","content":"I am sorry to hear that. Could you share your contact information?"},{"role":"user","content":"Name: Jane Doe\\nEmail: jane.doe@example.com\\nPhone: 919-555-1234\\nLocation: Raleigh, NC\\nOpposing Party: ACME Corp"}]'
    
    resp=$(make_request "north-carolina-legal-services" "$pdf_session" \
        "$pdf_messages" \
        "Team Case Summary PDF")
    
    # handleCreateMatter should return case_summary_pdf
    if echo "$resp" | grep -q '"case_summary_pdf"'; then
        print_result true "Matter creation includes PDF metadata"
    else
        print_result false "PDF metadata missing"
    fi
    
    # Should emit tool_result event from ToolExecutor
    if echo "$resp" | grep -q '"type":"tool_result"'; then
        print_result true "Tool result event properly emitted"
    else
        print_result false "Missing tool_result event"
    fi
    
    # Should NOT show raw JSON in response
    if echo "$resp" | grep -qi '"text":"{\\"name\\"' || \
       echo "$resp" | grep -qi '"response":"{\\"name\\"'; then
        print_result false "Raw JSON still visible in response"
    else
        print_result true "Response is human-readable (no raw JSON)"
    fi
}

scenario_tool_call_display_bug() {
    echo -e "${BLUE}🧪 Tool Call Display Bug (Raw JSON)${NC}"
    
    local session_id="$SESSION_PREFIX-toolbug"
    local messages='[
        {"role":"user","content":"hello im getting a divorce"},
        {"role":"assistant","content":"I am sorry to hear that. Can you tell me more about your situation?"},
        {"role":"user","content":"property division one dog we love i want at LEAST 50% care"},
        {"role":"assistant","content":"It sounds like you are concerned about property division. Can you tell me more about the dog?"},
        {"role":"user","content":"we both care equally but I hate my soon to be ex wife"},
        {"role":"assistant","content":"I understand there is tension. Can you provide your contact information?"},
        {"role":"user","content":"Tina Marie I live in durham"},
        {"role":"user","content":"you did not ask me for a phone number but its 6154459019"},
        {"role":"user","content":"my name is not tina marie thats my spouse"},
        {"role":"user","content":"paul luke paulchrisluke@yahoo.com"},
        {"role":"user","content":"speak to lawyer"}
    ]'
    
    local resp=$(make_request "north-carolina-legal-services" "$session_id" \
        "$messages" \
        "Tool Call Display Bug")
    
    # ToolCallDetector should detect and ToolExecutor should execute
    # Should NOT show raw tool call JSON to user
    if echo "$resp" | grep -q '"type":"text".*"name":"create_matter"' || \
       echo "$resp" | grep -q '"response":".*TOOL_CALL.*create_matter'; then
        print_result false "CRITICAL: Raw JSON tool calls displayed to user"
    else
        print_result true "Tool calls properly executed (not displayed as JSON)"
    fi
    
    # Should emit proper tool_call and tool_result events
    if echo "$resp" | grep -q '"type":"tool_call"' && \
       echo "$resp" | grep -q '"type":"tool_result"'; then
        print_result true "Tool events properly structured"
    else
        print_result false "Tool events missing or malformed"
    fi
    
    # Should handle lawyer request properly
    if echo "$resp" | grep -q '"type":"contact_form"' || \
       (echo "$resp" | grep -q '"type":"tool_result"' && \
        echo "$resp" | grep -qi 'matter.*created\|case_summary_pdf'); then
        print_result true "Lawyer request handled correctly"
    else
        print_result false "Lawyer request not handled properly"
    fi
}

scenario_contact_form_detection_bug() {
    echo -e "${BLUE}🧪 Contact Form Detection Bug${NC}"
    
    local session_id="$SESSION_PREFIX-contactbug"
    local messages='[
        {"role":"user","content":"hello i need help my landlord is harassing me for unpaid rent"},
        {"role":"assistant","content":"I am sorry. Can you tell me more? When did you last pay rent?"},
        {"role":"user","content":"I owe 800 its late by 10 days ish"},
        {"role":"assistant","content":"Has your landlord given you any notice of eviction?"},
        {"role":"user","content":"no he is just calling and texting a ton"},
        {"role":"assistant","content":"That sounds like harassment. Have you kept records?"},
        {"role":"user","content":"no but I can get them"},
        {"role":"assistant","content":"Good idea. Would you like to create a matter with our attorneys?"},
        {"role":"user","content":"yea"},
        {"role":"user","content":"afsdklhj@yahoo.com"},
        {"role":"user","content":"6158889999"}
    ]'
    
    local resp=$(make_request "north-carolina-legal-services" "$session_id" \
        "$messages" \
        "Contact Form Detection Bug")
    
    # When user agrees ("yea"), should show contact form
    if echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "Contact form shown when user agrees"
    else
        print_result false "CRITICAL: No contact form when user agreed"
    fi
    
    # Should NOT proceed to payment/matter creation without full contact info
    if echo "$resp" | grep -q '"type":"payment"\|"matter_created"' && \
       ! echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result false "CRITICAL: Proceeding without proper contact form"
    else
        print_result true "System requires contact form first"
    fi
    
    # Validation should work correctly
    # The refactored ValidationService should properly validate email/phone
    if echo "$resp" | grep -qi "valid email.*already.*provided\|valid phone.*already.*provided"; then
        print_result false "CRITICAL: Validation failing on valid input"
    else
        print_result true "Validation working correctly"
    fi
}

scenario_placeholder_prevention() {
    echo -e "${BLUE}🧪 NEW: Placeholder Value Prevention${NC}"
    
    local session_id="$SESSION_PREFIX-placeholder"
    local messages='[
        {"role":"user","content":"Create a matter for my divorce case"},
        {"role":"assistant","content":"I can help with that. What is your name?"},
        {"role":"user","content":"Create it now"}
    ]'
    
    local resp=$(make_request "north-carolina-legal-services" "$session_id" \
        "$messages" \
        "Placeholder Prevention")
    
    # ToolExecutor.hasPlaceholders() should detect missing info
    # Should redirect to contact_form instead of create_matter with placeholders
    if echo "$resp" | grep -q '"type":"matter"' && \
       ! check_no_placeholders "$resp"; then
        print_result false "CRITICAL: Placeholder values used in matter creation"
    elif echo "$resp" | grep -q '"type":"contact_form"'; then
        print_result true "System prevented placeholder values, showed contact form"
    else
        print_result false "System didn't handle missing contact info properly"
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
scenario_tool_call_display_bug
scenario_contact_form_detection_bug
scenario_placeholder_prevention  # NEW TEST

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
echo -e "${BLUE}📁 Logs: test-results/production-readiness/$LOG_DIR${NC}"
echo ""
echo -e "${BLUE}🔍 Debugging Commands:${NC}"
echo -e "${YELLOW}   # View specific test:${NC}"
echo -e "   cat test-results/production-readiness/$LOG_DIR/Initial-Greeting.json | jq ."
echo ""
echo -e "${YELLOW}   # Check for tool execution:${NC}"
echo -e "   grep -r '\"type\":\"tool_call\"' test-results/production-readiness/$LOG_DIR/"
echo ""
echo -e "${YELLOW}   # Check for contact forms:${NC}"
echo -e "   grep -r '\"type\":\"contact_form\"' test-results/production-readiness/$LOG_DIR/"
echo ""

if [ $CRITICAL_FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed - ready for production${NC}"
    exit 0
else
    echo -e "${RED}🚨 Tests failed - check logs above${NC}"
    exit 1
fi