#!/bin/bash

# Full conversation test for AI Intake & Lawyer Handoff System
# Tests case drafting, document checklists, skip-to-lawyer, and contact forms

echo "🧪 Testing AI Intake & Lawyer Handoff System"
echo "============================================="

BASE_URL="http://localhost:8787/api/agent/stream"
SESSION_ID="test-conversation-$(date +%s)"

# Function to send a message and capture response
send_message() {
    local message="$1"
    local turn="$2"
    local team_id="${3:-blawby-ai}" # Default to 'blawby-ai' for public mode
    
    echo ""
    echo "💬 Turn $turn: $message (Team ID: $team_id)"
    echo "Response:"
    
    # Send the message and capture the streaming response
    local response
    response=$(curl -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"messages\": [
                {
                    \"role\": \"user\",
                    \"content\": \"$message\"
                }
            ],
            \"teamId\": \"$team_id\",
            \"sessionId\": \"$SESSION_ID\"
        }" \
        --no-buffer \
        --max-time 30 \
        --silent --show-error 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$response" | head -30  # Show first 30 lines of response
        echo "... (response continues)"
    else
        echo "Request failed or timed out"
        # Show partial response if available
        if [ -n "$response" ]; then
            echo "Partial response received:"
            echo "$response" | head -10
        fi
    fi
    
    echo ""
    echo "---"
    sleep 1  # Brief pause between messages
}

# Function to send a multi-turn conversation
test_conversation() {
    local conversation_name="$1"
    local team_id="$2" # New parameter for teamId
    shift 2 # Shift off conversation_name and team_id
    local messages=("$@")
    
    echo ""
    echo "📋 Testing: $conversation_name"
    echo "Session ID: $SESSION_ID, Team ID: $team_id"
    echo "=========================================="
    
    for i in "${!messages[@]}"; do
        send_message "${messages[$i]}" $((i + 1)) "$team_id"
    done
}

# Test 1: Basic Legal Intake Flow (should show contact form)
test_conversation "Basic Legal Intake Flow" "blawby-ai" \
    "I need help with a family law matter" \
    "I'm going through a divorce" \
    "Can you help me understand my rights?"

# Test 2: Case Draft Building Flow
test_conversation "Case Draft Building Flow" "blawby-ai" \
    "I need help building a case draft for my employment law matter" \
    "I was fired from my job at TechCorp last week without any warning" \
    "I worked there for 3 years as a software engineer" \
    "They said it was due to budget cuts but I think it was because I complained about overtime pay" \
    "I need to organize this information into a case draft"

# Test 3: Document Checklist Flow
test_conversation "Document Checklist Flow" "blawby-ai" \
    "I need to see what documents I should gather for my employment law case" \
    "Can you show me a document checklist?" \
    "What documents are required vs optional?"

# Test 4: Skip to Lawyer - Public Mode (should trigger lawyer search)
test_conversation "Skip to Lawyer - Public Mode" "blawby-ai" \
    "I need to skip the intake process and go directly to a lawyer" \
    "This is urgent - I have a family law matter that needs immediate attention" \
    "I need to find a qualified lawyer in my area"

# Test 5: Skip to Lawyer - Team Mode (should show contact form)
test_conversation "Skip to Lawyer - Team Mode" "north-carolina-legal-services" \
    "I need to skip the intake process and go directly to a lawyer" \
    "This is urgent - I have a business law matter that needs immediate attention" \
    "I want to connect with your legal team directly"

# Test 6: Full Case Preparation Flow
test_conversation "Full Case Preparation Flow" "blawby-ai" \
    "I need help with my personal injury case" \
    "I was in a car accident last month" \
    "Can you help me build a case draft?" \
    "What documents should I gather?" \
    "I want to be prepared before meeting with a lawyer"

test_conversation "PDF Generation Flow" "blawby-ai" \
    "I want to generate a PDF case summary" \
    "I need to build a case draft first for my employment law matter" \
    "I was fired from my job last week without warning" \
    "Now can you generate a PDF for me?"

echo ""
echo "✅ Full conversation testing completed!"
echo ""
echo "🔍 Key Features Being Tested:"
echo "1. Basic Legal Intake Flow (contact form)"
echo "2. Case Draft Building (structured case information)"
echo "3. Document Checklist (required vs optional documents)"
echo "4. Skip to Lawyer - Public Mode (lawyer search)"
echo "5. Skip to Lawyer - Team Mode (contact form)"
echo "6. Full Case Preparation Flow (end-to-end)"
echo "7. PDF Generation Flow (case summary export)"
echo ""
echo "📊 Expected Results:"
echo "- Basic intake should show contact form"
echo "- Case draft should organize information into structured format"
echo "- Document checklist should show required/optional documents"
echo "- Skip to lawyer (public) should trigger lawyer search"
echo "- Skip to lawyer (team) should show contact form"
echo "- Full flow should demonstrate all features working together"
echo ""
echo "🚀 System Features:"
echo "- AI-powered case organization"
echo "- Dynamic document requirements"
echo "- Dual-mode routing (public vs team)"
echo "- Structured case summaries"
echo "- Lawyer search integration"
echo "- Contact form handling"
