# Production Database Migration Analysis

## 🔍 **Schema Comparison: Local vs Production**

### **Critical Issues Found:**

## 1. **Table Name Mismatches (Plural vs Singular)**

### **Better Auth Tables:**
| Local (Singular) | Production (Plural) | Status |
|------------------|---------------------|---------|
| `user` | `users` | ❌ **NEEDS MIGRATION** |
| `session` | `sessions` | ❌ **NEEDS MIGRATION** |
| `account` | `accounts` | ❌ **NEEDS MIGRATION** |
| `verification` | `verifications` | ❌ **NEEDS MIGRATION** |
| `organization` | `organizations` | ❌ **NEEDS MIGRATION** |

### **Subscription Tables:**
| Local | Production | Status |
|-------|------------|---------|
| `subscription` (singular) | `subscription` (singular) + `subscriptions` (plural) | ❌ **DUPLICATE TABLES** |

## 2. **Missing Fields in Production**

### **Critical Missing Field:**
- **`stripe_customer_id`** in production `subscription` table
- **Local has:** `stripe_customer_id TEXT,`
- **Production missing:** This field entirely

## 3. **Timestamp Format Inconsistencies**

### **Better Auth Tables:**
| Table | Local Format | Production Format | Issue |
|-------|-------------|------------------|-------|
| `user` | `strftime('%s', 'now') * 1000` | `strftime('%s', 'now')` | ❌ **Seconds vs Milliseconds** |
| `session` | `strftime('%s', 'now') * 1000` | `strftime('%s', 'now')` | ❌ **Seconds vs Milliseconds** |
| `account` | `strftime('%s', 'now') * 1000` | `strftime('%s', 'now')` | ❌ **Seconds vs Milliseconds** |
| `verification` | `strftime('%s', 'now') * 1000` | `strftime('%s', 'now')` | ❌ **Seconds vs Milliseconds** |
| `subscription` | `strftime('%s', 'now') * 1000` | `strftime('%s', 'now')` | ❌ **Seconds vs Milliseconds** |

## 4. **Foreign Key Reference Issues**

### **Production Issues:**
- `accounts.user_id` references `users(id)` (plural)
- `subscription.reference_id` references `organizations(id)` (plural)
- `matter_questions.organization_id` references `teams(id)` (wrong table name)

### **Local (Correct):**
- `account.user_id` references `user(id)` (singular)
- `subscription.reference_id` references `organization(id)` (singular)

## 5. **Duplicate Tables in Production**

Production has **BOTH**:
- `subscription` (singular) - missing `stripe_customer_id`
- `subscriptions` (plural) - also missing `stripe_customer_id`

---

## 🚨 **Required Migration Script**

```sql
-- ========================================
-- PRODUCTION DATABASE MIGRATION SCRIPT
-- ========================================
-- WARNING: This will rename tables and may cause downtime
-- Test on a copy of production database first!

-- Step 1: Backup existing data
-- (Do this manually before running migration)

-- Step 2: Rename Better Auth tables (plural → singular)
ALTER TABLE users RENAME TO user;
ALTER TABLE sessions RENAME TO session;
ALTER TABLE accounts RENAME TO account;
ALTER TABLE verifications RENAME TO verification;
ALTER TABLE organizations RENAME TO organization;

-- Step 3: Fix foreign key references
-- Update accounts table foreign key
-- (SQLite doesn't support ALTER TABLE for foreign keys, so we need to recreate)

-- Step 4: Handle duplicate subscription tables
-- First, check if both tables have data
SELECT COUNT(*) FROM subscription;
SELECT COUNT(*) FROM subscriptions;

-- If subscriptions table has data, migrate it to subscription table
INSERT OR IGNORE INTO subscription 
SELECT * FROM subscriptions;

-- Drop the duplicate subscriptions table
DROP TABLE subscriptions;

-- Step 5: Add missing stripe_customer_id field to subscription table
ALTER TABLE subscription ADD COLUMN stripe_customer_id TEXT;

-- Step 6: Update timestamp defaults to milliseconds
-- Note: SQLite doesn't support ALTER TABLE for DEFAULT values
-- This requires recreating tables with new defaults

-- Step 7: Fix foreign key references in other tables
-- Update matter_questions table
-- (Requires table recreation due to foreign key changes)

-- Step 8: Recreate indexes with correct table names
-- (All indexes will be automatically recreated with new table names)
```

---

## ⚠️ **Migration Risks & Considerations**

### **High Risk Operations:**
1. **Table Renaming** - Will break all existing foreign key references
2. **Foreign Key Updates** - Requires table recreation in SQLite
3. **Data Loss Risk** - If migration fails mid-process

### **Medium Risk Operations:**
1. **Adding Columns** - Generally safe with ALTER TABLE
2. **Index Recreation** - Automatic with table renames

### **Low Risk Operations:**
1. **Dropping Duplicate Tables** - Safe after data migration

---

## 🛠️ **Recommended Migration Strategy**

### **Phase 1: Preparation**
1. **Create full database backup**
2. **Test migration on production database copy**
3. **Schedule maintenance window**
4. **Prepare rollback plan**

### **Phase 2: Migration**
1. **Stop application traffic**
2. **Run migration script**
3. **Verify all tables and data**
4. **Test critical functionality**
5. **Resume application traffic**

### **Phase 3: Validation**
1. **Run integration tests**
2. **Verify Stripe checkout flow**
3. **Check user authentication**
4. **Monitor for errors**

---

## 📋 **Pre-Migration Checklist**

- [ ] **Full database backup created**
- [ ] **Migration tested on copy of production**
- [ ] **Maintenance window scheduled**
- [ ] **Rollback plan prepared**
- [ ] **Application traffic can be stopped**
- [ ] **Monitoring and alerting configured**
- [ ] **Team notified of maintenance**

---

## 🎯 **Post-Migration Validation**

### **Critical Tests:**
1. **User authentication flow**
2. **Stripe checkout process**
3. **Organization management**
4. **Database queries in application**
5. **Better Auth session handling**

### **Expected Results:**
- ✅ All table names are singular
- ✅ `stripe_customer_id` field exists in subscription table
- ✅ Timestamps are in milliseconds format
- ✅ Foreign key references are correct
- ✅ No duplicate tables exist

---

## 🚀 **Success Criteria**

Migration is successful when:
1. **All Better Auth tables use singular names**
2. **Subscription table has `stripe_customer_id` field**
3. **All timestamps use milliseconds format**
4. **Foreign key references are correct**
5. **Stripe checkout flow works end-to-end**
6. **No application errors in logs**

---

**⚠️ CRITICAL:** This migration is **REQUIRED** for the Stripe checkout fix to work in production. The current production schema is incompatible with Better Auth's expectations.
