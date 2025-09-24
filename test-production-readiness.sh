#!/bin/bash
# Comprehensive Conversation Flow Test Suite
# Covers both public (blawby-ai) and team (north-carolina-legal-services) modes

# set -e  # Removed to prevent early exit on test failures

BASE_URL="http://localhost:5173"
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

# Create log directory
mkdir -p "$LOG_DIR"
echo -e "${BLUE}📁 Logging responses to: $LOG_DIR${NC}"

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

    local log_file="$LOG_DIR/${test_name//[^a-zA-Z0-9]/-}.json"
    
    echo -e "${YELLOW}📤 Request: $test_name${NC}"
    echo -e "${YELLOW}   Team: $team_id | Session: $session_id${NC}"
    
    local response=$(curl -s "$BASE_URL/api/agent/stream" \
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
    if echo "$resp" | grep -q "\"type\":\"text\"" && ! echo "$resp" | grep -q "\"type\":\"contact_form\""; then
        print_result true "Greeting was conversational"
    else
        print_result false "Greeting jumped to contact form"
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
    if echo "$resp" | grep -qi "case\|draft\|organize"; then
        print_result true "Case draft assistance provided"
    else
        print_result false "No case draft assistance in public mode"
    fi
}

scenario_case_build_team() {
    echo -e "${BLUE}🧪 Team Mode Case Build${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-teamcase" \
        '[{"role":"user","content":"I need help with employment law, I was fired"}]' \
        "Team Mode Case Build")
    if echo "$resp" | grep -qi "contact_form"; then
        print_result true "Team mode showed contact form after details"
    else
        print_result false "Team mode did not show contact form"
    fi
}

scenario_sensitive_matter() {
    echo -e "${BLUE}🧪 Sensitive Matter Escalation${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-sensitive" \
        '[{"role":"user","content":"My partner was arrested yesterday, I need urgent help"}]' \
        "Sensitive Matter Escalation")
    if echo "$resp" | grep -qi "contact_form"; then
        print_result true "Sensitive matter escalated to contact form"
    else
        print_result false "Sensitive matter not escalated"
    fi
}

scenario_skip_to_lawyer() {
    echo -e "${BLUE}🧪 Skip to Lawyer Flow${NC}"

    # Public mode → Lawyer search
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-skippublic" \
        '[{"role":"user","content":"Skip intake, I need a family lawyer"}]' \
        "Skip to Lawyer Public")
    if echo "$resp" | grep -qi "lawyer"; then
        print_result true "Public skip routed to lawyer search"
    else
        print_result false "Public skip failed"
    fi

    # Team mode → Contact form
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-skipteam" \
        '[{"role":"user","content":"skip intake"}]' \
        "Skip to Lawyer Team")
    if echo "$resp" | grep -qi "contact_form"; then
        print_result true "Team skip showed contact form"
    else
        print_result false "Team skip failed"
    fi
}

scenario_general_inquiry() {
    echo -e "${BLUE}🧪 General Inquiry${NC}"
    resp=$(make_request "blawby-ai" "$SESSION_PREFIX-general" \
        '[{"role":"user","content":"What services do you offer?"}]' \
        "General Inquiry")
    if echo "$resp" | grep -qi "services"; then
        print_result true "General inquiry answered politely"
    else
        print_result false "General inquiry mishandled"
    fi
}

scenario_context_persistence() {
    echo -e "${BLUE}🧪 Context Persistence${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-context" \
        '[{"role":"user","content":"I need help with a landlord issue"},{"role":"assistant","content":"Is this about eviction?"},{"role":"user","content":"Yes"}]' \
        "Context Persistence")
    if echo "$resp" | grep -qi "eviction"; then
        print_result true "Context persisted correctly"
    else
        print_result false "Context was lost"
    fi
}

scenario_document_gathering() {
    echo -e "${BLUE}🧪 Document Gathering${NC}"
    resp=$(make_request "north-carolina-legal-services" "$SESSION_PREFIX-docs" \
        '[{"role":"user","content":"I am preparing for divorce and have financial statements"}]' \
        "Document Gathering")
    if echo "$resp" | grep -qi "document"; then
        print_result true "Asked for/gathered documents"
    else
        print_result false "No document gathering detected"
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
echo -e "${BLUE}📁 Detailed response logs saved to: $LOG_DIR${NC}"
echo -e "${YELLOW}   Each test response is saved as a separate JSON file${NC}"
echo -e "${YELLOW}   Use these logs to debug why specific features aren't working${NC}"
echo ""

if [ $CRITICAL_FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 Conversation flow READY for production${NC}"
    exit 0
else
    echo -e "${RED}🚨 Conversation flow NOT ready - critical issues detected${NC}"
    echo -e "${YELLOW}💡 Check the log files above to see exactly what responses were received${NC}"
    exit 1
fi
