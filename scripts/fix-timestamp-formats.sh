#!/bin/bash

# Fix Timestamp Formats Script
# Converts Better Auth session timestamps from seconds to milliseconds
# This fixes sign out issues caused by timestamp format mismatch

set -e

echo "🔧 Fixing Timestamp Formats in Better Auth Tables"
echo "================================================="
echo ""

# Configuration
DB_NAME="blawby-ai-chatbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to fix timestamps in a specific environment
fix_timestamps() {
    local environment=$1
    local flag=""
    
    if [ "$environment" = "remote" ]; then
        flag="--remote"
        log_info "Fixing timestamps in PRODUCTION database..."
    else
        flag="--local"
        log_info "Fixing timestamps in LOCAL database..."
    fi
    
    # Check current timestamp format
    log_info "Checking current timestamp format..."
    
    # Get sample timestamps
    SAMPLE_TIMESTAMP=$(wrangler d1 execute $DB_NAME $flag --command="SELECT created_at FROM session LIMIT 1;" --json | jq -r '.[0].results[0].created_at' 2>/dev/null || echo "0")
    
    if [ "$SAMPLE_TIMESTAMP" = "0" ] || [ -z "$SAMPLE_TIMESTAMP" ]; then
        log_warning "No sessions found in $environment database"
        return 0
    fi
    
    # Check if timestamps are already in milliseconds (should be 13 digits)
    if [ ${#SAMPLE_TIMESTAMP} -ge 13 ]; then
        log_success "Timestamps are already in milliseconds format in $environment database"
        return 0
    fi
    
    log_warning "Found timestamps in seconds format (${#SAMPLE_TIMESTAMP} digits) - converting to milliseconds"
    
    # Fix session table timestamps
    log_info "Fixing session table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE session SET created_at = created_at * 1000, updated_at = updated_at * 1000, expires_at = expires_at * 1000;" --json > /dev/null
    log_success "Fixed session table timestamps"
    
    # Fix user table timestamps
    log_info "Fixing user table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE user SET created_at = created_at * 1000, updated_at = updated_at * 1000;" --json > /dev/null
    log_success "Fixed user table timestamps"
    
    # Fix account table timestamps
    log_info "Fixing account table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE account SET created_at = created_at * 1000, updated_at = updated_at * 1000;" --json > /dev/null
    log_success "Fixed account table timestamps"
    
    # Fix verification table timestamps
    log_info "Fixing verification table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE verification SET created_at = created_at * 1000, updated_at = updated_at * 1000, expires_at = expires_at * 1000;" --json > /dev/null
    log_success "Fixed verification table timestamps"
    
    # Fix subscription table timestamps
    log_info "Fixing subscription table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE subscription SET created_at = created_at * 1000, updated_at = updated_at * 1000;" --json > /dev/null
    log_success "Fixed subscription table timestamps"
    
    # Fix member table timestamps
    log_info "Fixing member table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE member SET created_at = created_at * 1000;" --json > /dev/null
    log_success "Fixed member table timestamps"
    
    # Fix invitations table timestamps
    log_info "Fixing invitations table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE invitations SET created_at = created_at * 1000, expires_at = expires_at * 1000;" --json > /dev/null
    log_success "Fixed invitations table timestamps"
    
    # Fix organization_events table timestamps
    log_info "Fixing organization_events table timestamps..."
    wrangler d1 execute $DB_NAME $flag --command="UPDATE organization_events SET created_at = created_at * 1000;" --json > /dev/null
    log_success "Fixed organization_events table timestamps"
    
    # Verify the fix
    log_info "Verifying timestamp format fix..."
    NEW_SAMPLE=$(wrangler d1 execute $DB_NAME $flag --command="SELECT created_at FROM session LIMIT 1;" --json | jq -r '.[0].results[0].created_at' 2>/dev/null || echo "0")
    
    if [ ${#NEW_SAMPLE} -ge 13 ]; then
        log_success "Timestamps successfully converted to milliseconds format in $environment database"
    else
        log_error "Failed to convert timestamps in $environment database"
        return 1
    fi
}

# Main execution
main() {
    echo "🚨 TIMESTAMP FORMAT FIX SCRIPT"
    echo "=============================="
    echo ""
    echo "This script will convert Better Auth timestamps from seconds to milliseconds."
    echo "This fixes sign out issues caused by timestamp format mismatch."
    echo ""
    
    # Safety confirmation
    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Operation cancelled by user"
        exit 0
    fi
    
    echo ""
    
    # Fix local database
    fix_timestamps "local"
    echo ""
    
    # Fix production database
    fix_timestamps "remote"
    echo ""
    
    log_success "🎉 Timestamp format fix completed!"
    echo ""
    log_info "Next steps:"
    log_info "1. Test sign out functionality"
    log_info "2. Verify session management works correctly"
    log_info "3. Check that authentication flows properly"
    echo ""
    log_warning "Note: Existing sessions may need to be recreated for the fix to take effect."
}

# Run main function
main "$@"
