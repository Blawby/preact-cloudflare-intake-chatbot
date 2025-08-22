#!/bin/bash

# Verification script for LLM Judge test fixes
# This script uses ripgrep to verify that the fixes have been properly implemented

set -e

echo "🔍 Verifying LLM Judge test fixes..."

# Check if ripgrep is installed
if ! command -v rg &> /dev/null; then
    echo "❌ Error: ripgrep (rg) is not installed"
    echo "💡 Please install ripgrep:"
    echo "   macOS: brew install ripgrep"
    echo "   Ubuntu: sudo apt install ripgrep"
    echo "   Or download from: https://github.com/BurntSushi/ripgrep"
    exit 1
fi

echo "✅ ripgrep found"

# Function to check for specific patterns
check_pattern() {
    local pattern="$1"
    local description="$2"
    local files="$3"
    local should_exist="$4"
    
    echo "🔍 Checking: $description"
    
    if rg -g "$files" "$pattern" > /dev/null 2>&1; then
        if [ "$should_exist" = "true" ]; then
            echo "✅ Found expected pattern: $pattern"
            return 0
        else
            echo "❌ Found problematic pattern: $pattern"
            echo "   Files containing this pattern:"
            rg -g "$files" "$pattern" --no-heading --line-number
            return 1
        fi
    else
        if [ "$should_exist" = "true" ]; then
            echo "❌ Missing expected pattern: $pattern"
            return 1
        else
            echo "✅ No problematic pattern found: $pattern"
            return 0
        fi
    fi
}

# Check for the fixes
echo ""
echo "📋 Checking for implemented fixes..."

# Check for proper slice usage with length check
check_pattern "conversation\\.expectedToolCalls\\.length === 0" \
    "Proper slice usage with length check" \
    "tests/**/*.{ts,tsx}" \
    "true"

# Check for HTTP status checks
check_pattern "if \\(!response\\.ok\\)" \
    "HTTP status checks implemented" \
    "tests/**/*.{ts,tsx}" \
    "true"

# Check for proper conversation history management
check_pattern "const conversationHistory: Array<" \
    "Proper conversation history management" \
    "tests/**/*.{ts,tsx}" \
    "true"

# Check for HTML escaping function
check_pattern "function escapeHtml" \
    "HTML escaping function implemented" \
    "tests/**/*.{ts,tsx}" \
    "true"

# Check for use of escapeHtml in content
check_pattern "escapeHtml\\(.*\\.content\\)" \
    "HTML escaping applied to content" \
    "tests/**/*.{ts,tsx}" \
    "true"

echo ""
echo "✅ Verification completed!"
echo ""
echo "📝 Summary of fixes applied:"
echo "  1. ✅ Fixed finalToolCalls computation to handle zero length"
echo "  2. ✅ Added proper HTTP response status checking"
echo "  3. ✅ Fixed conversation history management"
echo "  4. ✅ Added HTML escaping for user-supplied content"
echo "  5. ✅ Updated verification to use proper glob patterns"
echo ""
echo "🎉 All LLM Judge test fixes have been successfully implemented!"
