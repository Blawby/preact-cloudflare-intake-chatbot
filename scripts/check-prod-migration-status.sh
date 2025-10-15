#!/bin/bash

# Production Migration Status Checker
# Checks what needs to be migrated without making any changes

set -e

echo "🔍 Production Database Migration Status Check"
echo "============================================="
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

# Check current state
check_migration_status() {
    log_info "Checking current database state..."
    
    # Get all tables
    TABLES=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name;" --json | jq -r '.[0].results[].name')
    
    echo "Current tables in production:"
    echo "$TABLES"
    echo ""
    
    # Check for plural tables that need migration
    log_info "Checking for tables that need migration..."
    
    PLURAL_TABLES=("users" "sessions" "accounts" "verifications" "organizations" "subscriptions")
    SINGULAR_TABLES=("user" "session" "account" "verification" "organization" "subscription")
    
    MIGRATION_NEEDED=false
    
    for plural_table in "${PLURAL_TABLES[@]}"; do
        if echo "$TABLES" | grep -q "^$plural_table$"; then
            log_warning "Found plural table: $plural_table (needs migration)"
            MIGRATION_NEEDED=true
        fi
    done
    
    # Check for singular tables
    for singular_table in "${SINGULAR_TABLES[@]}"; do
        if echo "$TABLES" | grep -q "^$singular_table$"; then
            log_success "Found singular table: $singular_table"
        fi
    done
    
    # Check subscription table specifically
    log_info "Checking subscription table..."
    
    HAS_SINGULAR_SUB=$(echo "$TABLES" | grep -c "^subscription$" || echo "0")
    HAS_PLURAL_SUBS=$(echo "$TABLES" | grep -c "^subscriptions$" || echo "0")
    
    if [ "$HAS_PLURAL_SUBS" -gt 0 ] && [ "$HAS_SINGULAR_SUB" -gt 0 ]; then
        log_warning "Found BOTH subscription tables - duplicate tables need cleanup"
        MIGRATION_NEEDED=true
    elif [ "$HAS_PLURAL_SUBS" -gt 0 ]; then
        log_warning "Found plural 'subscriptions' table - needs renaming to 'subscription'"
        MIGRATION_NEEDED=true
    elif [ "$HAS_SINGULAR_SUB" -gt 0 ]; then
        log_success "Found singular 'subscription' table"
    else
        log_error "No subscription table found!"
    fi
    
    # Check for stripe_customer_id field
    if [ "$HAS_SINGULAR_SUB" -gt 0 ] || [ "$HAS_PLURAL_SUBS" -gt 0 ]; then
        log_info "Checking for stripe_customer_id field..."
        
        # Check singular table first
        if [ "$HAS_SINGULAR_SUB" -gt 0 ]; then
            HAS_STRIPE_FIELD=$(wrangler d1 execute $DB_NAME --remote --command="PRAGMA table_info(subscription);" --json | jq -r '.[0].results[] | select(.name=="stripe_customer_id") | .name' 2>/dev/null || echo "")
        else
            HAS_STRIPE_FIELD=$(wrangler d1 execute $DB_NAME --remote --command="PRAGMA table_info(subscriptions);" --json | jq -r '.[0].results[] | select(.name=="stripe_customer_id") | .name' 2>/dev/null || echo "")
        fi
        
        if [ -n "$HAS_STRIPE_FIELD" ]; then
            log_success "stripe_customer_id field exists"
        else
            log_warning "stripe_customer_id field missing - needs to be added"
            MIGRATION_NEEDED=true
        fi
    fi
    
    # Check timestamp formats
    log_info "Checking timestamp formats..."
    
    # Check a few key tables for timestamp format
    for table in user session account; do
        if echo "$TABLES" | grep -q "^$table$"; then
            TIMESTAMP_DEFAULT=$(wrangler d1 execute $DB_NAME --remote --command="PRAGMA table_info($table);" --json | jq -r '.[0].results[] | select(.name=="created_at") | .dflt_value' 2>/dev/null || echo "")
            
            if echo "$TIMESTAMP_DEFAULT" | grep -q "\* 1000"; then
                log_success "Table $table has correct millisecond timestamps"
            else
                log_warning "Table $table has incorrect timestamp format (seconds instead of milliseconds)"
                MIGRATION_NEEDED=true
            fi
        fi
    done
    
    echo ""
    echo "=========================================="
    
    if [ "$MIGRATION_NEEDED" = true ]; then
        log_error "🚨 MIGRATION REQUIRED"
        echo ""
        log_info "The production database needs migration to work with the Stripe checkout fix."
        log_info "Run the migration script: ./scripts/migrate-prod-to-singular-schema.sh"
    else
        log_success "🎉 NO MIGRATION NEEDED"
        echo ""
        log_info "The production database is already compatible with the Stripe checkout fix."
    fi
}

# Check foreign key references
check_foreign_keys() {
    log_info "Checking foreign key references..."
    
    # Check subscription table foreign key
    SUB_FK=$(wrangler d1 execute $DB_NAME --remote --command="PRAGMA foreign_key_list(subscription);" --json | jq -r '.[0].results[] | select(.table=="organizations") | .table' 2>/dev/null || echo "")
    
    if [ -n "$SUB_FK" ]; then
        log_warning "Subscription table references 'organizations' (plural) - should reference 'organization' (singular)"
    else
        log_info "Subscription table foreign key reference needs manual verification"
    fi
}

# Main execution
main() {
    check_migration_status
    check_foreign_keys
    
    echo ""
    log_info "For detailed migration instructions, see: PRODUCTION_MIGRATION_ANALYSIS.md"
}

# Run main function
main "$@"
