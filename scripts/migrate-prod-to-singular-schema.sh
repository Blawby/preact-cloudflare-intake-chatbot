#!/bin/bash

# Production Database Migration Script
# Migrates from plural table names to singular table names for Better Auth compatibility
# 
# WARNING: This script will modify the production database!
# Always test on a copy first and ensure you have a backup.

set -e  # Exit on any error

echo "🚀 Starting Production Database Migration"
echo "=========================================="
echo ""

# Configuration
DB_NAME="blawby-ai-chatbot"
BACKUP_SUFFIX=$(date +"%Y%m%d_%H%M%S")

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

# Safety checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI not found. Please install it first."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq not found. Please install it first."
        exit 1
    fi
    
    # Check if we're authenticated with Cloudflare
    if ! wrangler whoami &> /dev/null; then
        log_error "Not authenticated with Cloudflare. Please run 'wrangler login' first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log_info "Creating database backup..."
    
    # Export current schema and data
    wrangler d1 execute $DB_NAME --remote --command="SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name;" --json > "backup_schema_${BACKUP_SUFFIX}.json"
    
    # Export all data from critical tables
    for table in users sessions accounts organizations subscriptions subscription verifications; do
        log_info "Backing up table: $table"
        wrangler d1 execute $DB_NAME --remote --command="SELECT * FROM $table;" --json > "backup_${table}_${BACKUP_SUFFIX}.json" 2>/dev/null || log_warning "Table $table not found or empty"
    done
    
    log_success "Backup created with suffix: $BACKUP_SUFFIX"
}

# Check current state
check_current_state() {
    log_info "Checking current database state..."
    
    # Check which tables exist
    TABLES=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name;" --json | jq -r '.[0].results[].name')
    
    echo "Current tables:"
    echo "$TABLES"
    echo ""
    
    # Check for critical issues
    if echo "$TABLES" | grep -q "users"; then
        log_warning "Found plural 'users' table - needs migration"
    fi
    
    if echo "$TABLES" | grep -q "organizations"; then
        log_warning "Found plural 'organizations' table - needs migration"
    fi
    
    if echo "$TABLES" | grep -q "subscriptions"; then
        log_warning "Found plural 'subscriptions' table - needs migration"
    fi
}

# Migrate data from plural to singular tables
migrate_table_data() {
    local plural_table=$1
    local singular_table=$2
    
    log_info "Migrating data from $plural_table to $singular_table..."
    
    # Check if plural table exists and has data
    COUNT=$(wrangler d1 execute $DB_NAME --remote --command="SELECT COUNT(*) as count FROM $plural_table;" --json | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
    
    if [ "$COUNT" -gt 0 ]; then
        log_info "Found $COUNT rows in $plural_table"
        
        # Get table structure
        SCHEMA=$(wrangler d1 execute $DB_NAME --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='$plural_table';" --json | jq -r '.[0].results[0].sql')
        
        # Insert data into singular table (if it exists)
        if echo "$TABLES" | grep -q "^$singular_table$"; then
            wrangler d1 execute $DB_NAME --remote --command="INSERT OR IGNORE INTO $singular_table SELECT * FROM $plural_table;" --json > /dev/null
            log_success "Migrated data from $plural_table to $singular_table"
        else
            log_warning "Singular table $singular_table doesn't exist yet"
        fi
    else
        log_info "Table $plural_table is empty or doesn't exist"
    fi
}

# Main migration function
run_migration() {
    log_info "Starting migration process..."
    
    # Step 1: Handle subscription tables (most critical)
    log_info "Step 1: Handling subscription tables..."
    
    # Check if both subscription tables exist
    HAS_SINGULAR_SUB=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='subscription';" --json | jq -r '.[0].results | length' 2>/dev/null || echo "0")
    HAS_PLURAL_SUBS=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions';" --json | jq -r '.[0].results | length' 2>/dev/null || echo "0")
    
    if [ "$HAS_PLURAL_SUBS" -gt 0 ]; then
        log_info "Found plural 'subscriptions' table"
        
        if [ "$HAS_SINGULAR_SUB" -gt 0 ]; then
            log_info "Both subscription tables exist - migrating data and dropping plural"
            migrate_table_data "subscriptions" "subscription"
            wrangler d1 execute $DB_NAME --remote --command="DROP TABLE subscriptions;" --json > /dev/null
            log_success "Dropped duplicate 'subscriptions' table"
        else
            log_info "Only plural 'subscriptions' table exists - renaming to singular"
            wrangler d1 execute $DB_NAME --remote --command="ALTER TABLE subscriptions RENAME TO subscription;" --json > /dev/null
            log_success "Renamed 'subscriptions' to 'subscription'"
        fi
    fi
    
    # Step 2: Add missing stripe_customer_id field to subscription table
    log_info "Step 2: Adding missing stripe_customer_id field..."
    
    # Check if field already exists
    HAS_STRIPE_FIELD=$(wrangler d1 execute $DB_NAME --remote --command="PRAGMA table_info(subscription);" --json | jq -r '.[0].results[] | select(.name=="stripe_customer_id") | .name' 2>/dev/null || echo "")
    
    if [ -z "$HAS_STRIPE_FIELD" ]; then
        wrangler d1 execute $DB_NAME --remote --command="ALTER TABLE subscription ADD COLUMN stripe_customer_id TEXT;" --json > /dev/null
        log_success "Added stripe_customer_id field to subscription table"
    else
        log_info "stripe_customer_id field already exists"
    fi
    
    # Step 3: Rename Better Auth tables (plural → singular)
    log_info "Step 3: Renaming Better Auth tables..."
    
    # List of table renames needed
    PLURAL_TABLES=("users" "sessions" "accounts" "verifications" "organizations")
    SINGULAR_TABLES=("user" "session" "account" "verification" "organization")
    
    for i in "${!PLURAL_TABLES[@]}"; do
        plural_table="${PLURAL_TABLES[$i]}"
        singular_table="${SINGULAR_TABLES[$i]}"
        
        # Check if plural table exists
        HAS_PLURAL=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='$plural_table';" --json | jq -r '.[0].results | length' 2>/dev/null || echo "0")
        
        if [ "$HAS_PLURAL" -gt 0 ]; then
            log_info "Renaming $plural_table to $singular_table..."
            
            # Check if singular table already exists
            HAS_SINGULAR=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='$singular_table';" --json | jq -r '.[0].results | length' 2>/dev/null || echo "0")
            
            if [ "$HAS_SINGULAR" -gt 0 ]; then
                log_warning "Both $plural_table and $singular_table exist - migrating data first"
                migrate_table_data "$plural_table" "$singular_table"
                wrangler d1 execute $DB_NAME --remote --command="DROP TABLE $plural_table;" --json > /dev/null
                log_success "Dropped duplicate $plural_table table"
            else
                wrangler d1 execute $DB_NAME --remote --command="ALTER TABLE $plural_table RENAME TO $singular_table;" --json > /dev/null
                log_success "Renamed $plural_table to $singular_table"
            fi
        else
            log_info "Table $plural_table doesn't exist - skipping"
        fi
    done
    
    # Step 4: Fix foreign key references
    log_info "Step 4: Fixing foreign key references..."
    
    # Update subscription table foreign key reference
    log_info "Updating subscription table foreign key reference..."
    # Note: SQLite doesn't support ALTER TABLE for foreign keys, so we need to recreate
    # For now, we'll just log this as a manual step needed
    
    log_warning "Foreign key references need manual update (SQLite limitation)"
    log_info "Manual steps needed:"
    log_info "1. Update subscription.reference_id to reference organization(id) instead of organizations(id)"
    log_info "2. Update account.user_id to reference user(id) instead of users(id)"
    
    log_success "Migration completed!"
}

# Verify migration
verify_migration() {
    log_info "Verifying migration results..."
    
    # Check that all singular tables exist
    EXPECTED_TABLES=("user" "session" "account" "verification" "organization" "subscription")
    
    for table in "${EXPECTED_TABLES[@]}"; do
        HAS_TABLE=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" --json | jq -r '.[0].results | length' 2>/dev/null || echo "0")
        
        if [ "$HAS_TABLE" -gt 0 ]; then
            log_success "Table $table exists"
        else
            log_error "Table $table missing!"
        fi
    done
    
    # Check that plural tables are gone
    PLURAL_TABLES=("users" "sessions" "accounts" "verifications" "organizations" "subscriptions")
    
    for table in "${PLURAL_TABLES[@]}"; do
        HAS_TABLE=$(wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" --json | jq -r '.[0].results | length' 2>/dev/null || echo "0")
        
        if [ "$HAS_TABLE" -eq 0 ]; then
            log_success "Plural table $table successfully removed"
        else
            log_warning "Plural table $table still exists"
        fi
    done
    
    # Check stripe_customer_id field
    HAS_STRIPE_FIELD=$(wrangler d1 execute $DB_NAME --remote --command="PRAGMA table_info(subscription);" --json | jq -r '.[0].results[] | select(.name=="stripe_customer_id") | .name' 2>/dev/null || echo "")
    
    if [ -n "$HAS_STRIPE_FIELD" ]; then
        log_success "stripe_customer_id field exists in subscription table"
    else
        log_error "stripe_customer_id field missing from subscription table"
    fi
}

# Main execution
main() {
    echo "🚨 PRODUCTION DATABASE MIGRATION SCRIPT"
    echo "======================================="
    echo ""
    echo "This script will migrate your production database from plural to singular table names."
    echo "This is REQUIRED for the Stripe checkout fix to work."
    echo ""
    
    # Safety confirmation
    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Migration cancelled by user"
        exit 0
    fi
    
    echo ""
    log_warning "Starting migration in 5 seconds..."
    sleep 5
    
    check_prerequisites
    create_backup
    check_current_state
    run_migration
    verify_migration
    
    echo ""
    log_success "🎉 Migration completed successfully!"
    echo ""
    log_info "Next steps:"
    log_info "1. Test the Stripe checkout flow"
    log_info "2. Verify user authentication works"
    log_info "3. Check application logs for any errors"
    log_info "4. Keep the backup files safe: backup_*_${BACKUP_SUFFIX}.json"
    echo ""
    log_warning "If you encounter issues, you can restore from the backup files."
}

# Run main function
main "$@"
