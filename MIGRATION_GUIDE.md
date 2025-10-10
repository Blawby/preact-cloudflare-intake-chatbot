# Database Schema Consolidation Guide

## What Changed

On October 10, 2025, we consolidated all database schema definitions into a single `worker/schema.sql` file and removed the complex migration system.

## Why This Change

The previous setup had:
- A `worker/schema.sql` file with base schema
- A `migrations/` directory with 13+ migration files
- Migration files that depended on each other in unclear order
- Migrations trying to update non-existent data
- Confusion between development and production database states

This caused:
- Failed migration runs due to dependency issues
- Duplicate schema definitions
- Unclear source of truth for database structure
- Difficulty setting up new development environments

## What Was Consolidated

### Added to worker/schema.sql:
- `members` table for Better Auth organization membership
- `invitations` table for lawyer onboarding
- `user_id` columns on: conversations, matters, messages, files
- Indexes for all new columns and tables

### Removed:
- Sample data inserts (moved to seed scripts if needed)
- Complex migration dependency chain

### Archived:
- All migration files moved to `backups/migrations-archive/`

## New Development Workflow

### Database Reset
```bash
npm run db:reset
```
This drops all tables and applies the consolidated schema.

### Database Init (if needed)
```bash
npm run db:init
```
This applies the schema to an existing database.

## For Existing Deployments

If you have an existing production database:

1. **Backup your data first!**
2. Review the consolidated schema in `worker/schema.sql`
3. Create a one-time migration script if needed
4. Apply the schema changes manually

## Benefits

✅ Single source of truth for schema
✅ No migration dependency issues  
✅ Fast dev environment setup
✅ Clear and maintainable
✅ Fixes the "orgRows.map" bug

## Future Schema Changes

Going forward:
1. Modify `worker/schema.sql` directly
2. Document breaking changes in CHANGELOG
3. Run `npm run db:reset` for local development
4. For production: Create one-time migration script if needed

## Migration History

The following migrations were consolidated:

- `00000000_base_schema.sql` - Base schema (now in worker/schema.sql)
- `add_better_auth_organization.sql` - Added members, invitations tables
- `add_user_columns.sql` - Added user_id columns
- `add_organization_api_tokens.sql` - Added API tokens table
- `add_payment_history.sql` - Added payment tracking
- `add_ai_provider_defaults.sql` - Data migration (removed)
- `add_nc_legal_jurisdiction.sql` - Data migration (removed)
- `update_blawby_ai_services.sql` - Data migration (removed)
- `migrate_teams_to_organizations.sql` - Team to org migration (completed)
- `rename_team_tables.sql` - Table renaming (completed)
- `remove_scheduling_tables.sql` - Table removal (completed)
- `add_priority_column_from_urgency.sql` - Column addition (completed)
- `add_team_api_tokens.sql` - Superseded by organization_api_tokens

All migration files are preserved in `backups/migrations-archive/` for reference.
