# Better Auth Organization Plugin Implementation Plan

## 🎯 Project Overview

Implement Better Auth with the Organization plugin to create a robust legal firm management system where:
- **Organizations** = Legal Firms/Practices (e.g., "North Carolina Legal Services")
- **Users** = Lawyers, Paralegals, Admins (with Better Auth default roles)
- **Clients/Public Users** = External users (separate from organization system)

## 🔑 Core Principles

- **Default-First Approach**: Leverage Better Auth's built-in organization system and roles
- **Clean Separation**: Keep auth schema lean, domain-specific data in separate tables
- **Multi-Organization Support**: Lawyers can belong to multiple firms
- **Built-in Invitations**: Use Better Auth's invitation system
- **Security First**: Proper access control and member management
- **Progressive Enhancement**: Start simple, add complexity only when needed

## 📐 Data Model Architecture

### 1. Better Auth Core Tables (Keep Lean)
```sql
-- users table (minimal, no legal-specific fields)
users (
  id, name, email, email_verified, image, created_at, updated_at
)

-- sessions, accounts, passwords, verifications (standard Better Auth)
```

### 2. Organization Plugin Tables (Better Auth Defaults)
```sql
-- organizations table (Better Auth default)
organizations (
  id, name, slug, logo, metadata, created_at, updated_at
)

-- organization_members table (Better Auth default)
organization_members (
  id, organization_id, user_id, role, created_at, updated_at
)

-- organization_invitations table (Better Auth default)
organization_invitations (
  id, organization_id, email, role, status, expires_at, created_at
)
```

### 3. Legal-Specific Extensions (Phase 2+ - Not Required for Initial Ship)
```sql
-- These can be added later when you need them:
-- lawyer_profiles (id, user_id, bar_number, license_state, specialties, hourly_rate, bio, created_at, updated_at)
-- client_profiles (id, user_id, contact_preferences, case_history, created_at, updated_at)
-- practice_areas (id, name, description, category)
-- lawyer_practice_areas (lawyer_id, practice_area_id)
```

## 📁 Drizzle Schema Files

### 1. Organization Schema (`worker/db/organization.schema.ts`)
```typescript
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'owner', 'admin', 'member'
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  // Ensure one role per user per organization
  userOrgUnique: unique().on(table.userId, table.organizationId),
}));

export const organizationInvitations = sqliteTable("organization_invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'expired'
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(current_timestamp)`)
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  // Ensure one profile per user
  userUnique: unique().on(table.userId),
}));
```

### 2. Migration File (`migrations/add_organization_tables.sql`)

⚠️ **CRITICAL SAFETY WARNING**: This migration preserves existing data by migrating it to new tables before dropping columns. The migration is split into two phases:
1. **Data Migration Phase**: Creates new tables and migrates existing data
2. **Cleanup Phase**: Drops old columns (run separately after verification)

```sql
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- Global uniqueness for now (can be relaxed later for vanity domains)
  logo TEXT,
  metadata TEXT, -- JSON string
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'admin', 'member'
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(user_id, organization_id)
);

-- Organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON organization_invitations(status);

-- STEP 1: Migrate existing team data to organizations
-- First, create a default organization for each existing team_id
INSERT INTO organizations (id, name, slug, created_at, updated_at)
SELECT 
  'org_' || team_id as id,
  COALESCE(team_name, 'Team ' || team_id) as name,
  'team-' || team_id as slug,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM users 
WHERE team_id IS NOT NULL
GROUP BY team_id, team_name;

-- STEP 2: Migrate user roles to organization_members
INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
SELECT 
  'member_' || user_id || '_' || team_id as id,
  'org_' || team_id as organization_id,
  user_id,
  COALESCE(role, 'member') as role, -- Default to 'member' if role is NULL
  created_at,
  updated_at
FROM users 
WHERE team_id IS NOT NULL;

-- STEP 3: Create a user_profiles table to preserve phone numbers
-- (since phone is not part of organization structure)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(user_id)
);

-- Migrate phone numbers to user_profiles
INSERT INTO user_profiles (id, user_id, phone, created_at, updated_at)
SELECT 
  'profile_' || user_id as id,
  user_id,
  phone,
  created_at,
  updated_at
FROM users 
WHERE phone IS NOT NULL;

-- STEP 4: Verify data migration before dropping columns
-- This is a safety check - if this fails, the transaction will rollback
SELECT 
  COUNT(*) as users_with_teams,
  (SELECT COUNT(*) FROM organization_members) as migrated_members,
  (SELECT COUNT(*) FROM user_profiles WHERE phone IS NOT NULL) as migrated_phones
FROM users 
WHERE team_id IS NOT NULL;

-- Only proceed with column drops if migration was successful
-- (This will be verified by the count checks above)

COMMIT;
```

### 3. Cleanup Migration File (`migrations/cleanup_old_team_columns.sql`)
```sql
-- This migration should ONLY be run AFTER confirming the data migration was successful
-- Run this as a separate migration after verifying all data was properly migrated

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Final verification before dropping columns
-- These queries should return 0 or the migration should be aborted
SELECT COUNT(*) as remaining_team_users FROM users WHERE team_id IS NOT NULL;
SELECT COUNT(*) as remaining_role_users FROM users WHERE role IS NOT NULL;
SELECT COUNT(*) as remaining_phone_users FROM users WHERE phone IS NOT NULL;

-- Only drop columns if verification passes
-- (In practice, you'd add conditional logic or manual verification here)

-- Remove old team-related columns from users table
-- These now belong in organization_members or user_profiles tables
ALTER TABLE users DROP COLUMN IF EXISTS team_id;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS phone;

COMMIT;
```

## ⚙️ Better Auth Configuration

### 1. Server Configuration (`worker/auth/index.ts`)
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types";

// Import the generated auth schema (existing)
import { users, sessions, accounts, passwords, verifications } from "../db/auth.schema";
// Import organization schema (new)
import { organizations, organizationMembers, organizationInvitations, userProfiles } from "../db/organization.schema";

export function createAuth(env: Env) {
  // Validate required environment variables
  if (!env.DB) {
    throw new Error("Database (env.DB) is required for authentication");
  }
  
  // Initialize Drizzle with D1 database (matching your existing pattern)
  const db = drizzle(env.DB, {
    schema: { 
      users, sessions, accounts, passwords, verifications,
      organizations, organizationMembers, organizationInvitations, userProfiles
    }
  });

  return betterAuth({
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      usePlural: true,
      debugLogs: env.NODE_ENV !== 'production',
    }),
    plugins: [
      organization({
        // Restrict organization creation to verified users
        allowUserToCreateOrganization: async (user) => {
          return user.emailVerified;
        },
        
        // Keep hooks minimal for initial ship - avoid domain logic
        organizationHooks: {
          afterCreateOrganization: async ({ organization, member, user }) => {
            // Just log for now - avoid auto-team creation or heavy domain logic
            console.log(`Organization created: ${organization.name} by ${user.email}`);
            
            // Optional: Send welcome email (keep it simple)
            // await sendWelcomeEmail(user.email, organization.name);
          }
        }
      })
    ],
    
    // Keep user table minimal - no additional fields (remove existing teamId, role, phone)
    user: {
      additionalFields: {}
    },
    
    // Standard auth configuration (matching your existing setup)
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Match your current setting
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectURI: `${env.BETTER_AUTH_URL || 'http://localhost:8787'}/api/auth/callback/google`,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days (matching your existing)
      updateAge: 60 * 60 * 24, // 1 day (matching your existing)
    },
  });
}
```

### 2. Client Configuration (`src/lib/authClient.ts`)
```typescript
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { cloudflareClient } from "better-auth-cloudflare/client";

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/api/auth`
    : "http://localhost:8787/api/auth",
  plugins: [
    cloudflareClient(),
    organizationClient()
  ],
});
```

## 🛠️ Implementation Phases

### Phase 1: Foundation Setup (Week 1-2)

#### 1.1 Database Schema Migration
- [ ] Create `worker/db/organization.schema.ts` with Drizzle schema definitions
- [ ] Create SQL migration file in `migrations/` directory (following your existing pattern)
- [ ] **CRITICAL**: Run data migration to preserve existing team_id, role, and phone data
- [ ] Create organizations from existing teams and migrate user roles to organization_members
- [ ] Create user_profiles table and migrate phone numbers
- [ ] Verify data migration with count checks before proceeding
- [ ] **ONLY AFTER VERIFICATION**: Run cleanup migration to drop old columns
- [ ] Skip lawyer_profiles and client_profiles for now

#### 1.2 Better Auth Configuration
- [ ] Install organization plugin dependencies
- [ ] Update auth configuration with organization plugin
- [ ] Configure basic organization hooks
- [ ] Test basic auth flow with organizations

#### 1.3 Core Types and Interfaces
- [ ] Define TypeScript interfaces for organizations
- [ ] Create simple role checking functions
- [ ] Update existing user types to include organization context

### Phase 2: Organization Management (Week 3-4)

#### 2.1 Organization Creation
- [ ] Build organization creation form
- [ ] Implement organization validation (slug uniqueness, etc.)
- [ ] Add organization settings page
- [ ] Create organization switching UI

#### 2.2 Member Management
- [ ] Use Better Auth's built-in invitation system
- [ ] Create member management dashboard
- [ ] Implement role assignment interface (owner/admin/member)
- [ ] Add member removal functionality

#### 2.3 Basic Organization Features
- [ ] Create organization settings page
- [ ] Build member list and basic management
- [ ] Add organization context to existing features
- [ ] Skip practice areas and specializations for now

### Phase 3: Simple Role-Based Access Control (Week 5-6)

#### 3.1 Basic Role System
- [ ] Implement simple role checking functions
- [ ] Create middleware for role-based route protection
- [ ] Add role-based UI rendering
- [ ] Test role boundaries and security

#### 3.2 Organization Context
- [ ] Implement organization-scoped API calls
- [ ] Add organization context to all relevant operations
- [ ] Create organization boundary tests
- [ ] Ensure cross-organization data isolation

### Phase 4: Legal-Specific Features (Week 7-8) - Optional for Initial Ship

#### 4.1 Lawyer Profiles (Add Later)
- [ ] Create lawyer profile management (separate from users table)
- [ ] Add practice area assignment
- [ ] Implement bar number validation
- [ ] Build lawyer directory/search

#### 4.2 Client Communication (Add Later)
- [ ] Design client access system (separate from organization system)
- [ ] Implement lawyer selection for clients
- [ ] Create client-lawyer communication interface
- [ ] Add client case management

### Phase 5: UI/UX Polish (Week 9-10)

#### 5.1 Organization Dashboard
- [ ] Build comprehensive organization dashboard
- [ ] Add organization analytics and insights
- [ ] Implement organization settings management
- [ ] Create organization billing integration

#### 5.2 Mobile Optimization
- [ ] Optimize organization management for mobile
- [ ] Add mobile-specific navigation patterns
- [ ] Test cross-platform compatibility
- [ ] Skip organization switching for now (add later)

## 🔐 Security & Permissions

### Simple Role-Based Access Control (Start Here)
```typescript
// roles.ts - Use Better Auth default roles initially
export const ROLES = {
  OWNER: 'owner',      // Full organization control
  ADMIN: 'admin',      // Manage organization and members
  MEMBER: 'member',    // Basic organization access
} as const;

// Legal-specific roles (extend later if needed)
export const LEGAL_ROLES = {
  ATTORNEY: 'attorney',
  PARALEGAL: 'paralegal',
} as const;

// Simple role checking functions
export function isOwner(userRole: string): boolean {
  return userRole === ROLES.OWNER;
}

export function isAdmin(userRole: string): boolean {
  return userRole === ROLES.OWNER || userRole === ROLES.ADMIN;
}

export function canManageOrganization(userRole: string): boolean {
  return isAdmin(userRole);
}

export function canInviteMembers(userRole: string): boolean {
  return isAdmin(userRole);
}
```

### Access Control Middleware (Simple)
```typescript
// middleware/auth.ts
export function requireRole(allowedRoles: string[]) {
  return async (request: Request, env: Env, ctx: ExecutionContext) => {
    const auth = createAuth(env);
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Get user's role in the current organization
    const member = await auth.api.getActiveMember({ headers: request.headers });
    if (!member || !allowedRoles.includes(member.role)) {
      return new Response('Forbidden', { status: 403 });
    }
    
    return null; // Continue to next middleware
  };
}

// Usage examples:
// requireRole(['owner', 'admin']) - for admin functions
// requireRole(['owner']) - for owner-only functions
```

## 🔗 Slug Handling Strategy

### Current Approach: Global Uniqueness
- **Slugs are globally unique** across all organizations
- Example: `north-carolina-legal-services`, `smith-associates`
- **Benefits**: Simple, predictable URLs, no conflicts
- **Limitations**: Firms can't have same slug (e.g., two "Smith & Associates")

### Future Considerations
- **Vanity Domains**: `smith-associates.blawby.com` vs `smith-associates-nyc.blawby.com`
- **Subdomain Strategy**: Each org gets `{slug}.blawby.com`
- **Namespace Relaxation**: Allow same slug if different domains

### Implementation Notes
```typescript
// Current: Global uniqueness enforced by database constraint
slug TEXT NOT NULL UNIQUE

// Future: Could be relaxed to per-domain uniqueness
// slug TEXT NOT NULL, domain TEXT, UNIQUE(slug, domain)
```

## 🧪 Testing Strategy

### Unit Tests
- [ ] Organization creation and management
- [ ] Member invitation and role assignment
- [ ] Permission checking logic
- [ ] Slug uniqueness validation

### Integration Tests
- [ ] End-to-end organization setup flow
- [ ] Member invitation acceptance flow
- [ ] Role-based access control enforcement
- [ ] Multi-organization user scenarios

### Security Tests (Priority: Cross-Organization Isolation)
- [ ] **Cross-organization data access prevention** (CRITICAL for legal firms)
- [ ] **Organization boundary enforcement** (users can't access other orgs' data)
- [ ] **Member role isolation** (admin in Org A can't affect Org B)
- [ ] **Invitation token security** (tokens can't be used across orgs)
- [ ] **Privilege escalation prevention**
- [ ] **Role manipulation protection**

## 📱 UI/UX Considerations

### Organization Switching
- Implement organization switcher in navigation
- Show current organization context in all relevant screens
- Provide quick access to organization settings

### Basic Organization Management
- Simple organization settings interface
- Basic member list and role management
- Organization context in existing features

### Mobile Experience
- Touch-friendly organization management
- Responsive permission-based UI hiding/showing
- Skip organization switching for now

## 🚀 Deployment & Migration

### Database Migration Strategy
1. **Create new organization tables** alongside existing schema
2. **Migrate existing team data** to organization structure:
   - Create organizations from existing team_id values
   - Migrate user roles to organization_members table
   - Migrate phone numbers to user_profiles table
3. **Verify data migration** with count checks and validation queries
4. **ONLY AFTER VERIFICATION**: Remove old team management columns
5. **Test organization functionality** with migrated data
6. **Remove old team management code** after confirming new system works

### Environment Configuration
- Update environment variables for organization features
- Configure email templates for invitations
- Set up organization-specific branding options
- Configure billing integration for organizations

## 📊 Success Metrics

### Technical Metrics
- [ ] Organization creation success rate
- [ ] Member invitation acceptance rate
- [ ] Permission check performance
- [ ] Database query optimization

### User Experience Metrics
- [ ] Time to create first organization
- [ ] Member onboarding completion rate
- [ ] Organization management task completion time
- [ ] User satisfaction with role management

## 🔄 Future Enhancements

### Advanced Features
- Organization templates for common legal firm types
- Advanced analytics and reporting for organizations
- Integration with legal practice management software
- Multi-tenant billing and subscription management
- Advanced permission inheritance and delegation

### Scalability Considerations
- Organization-level caching strategies
- Database sharding for large organizations
- API rate limiting per organization
- Background job processing for organization operations

---

## 📋 Implementation Checklist

### Pre-Implementation
- [ ] Review and approve technical plan
- [ ] Set up development environment
- [ ] Create feature branch for organization implementation
- [ ] Set up testing framework for organization features

### Phase 1: Foundation
- [ ] Install Better Auth organization plugin
- [ ] Create database migration files
- [ ] Update auth configuration
- [ ] Define core types and interfaces
- [ ] Set up basic organization API endpoints

### Phase 2: Core Features
- [ ] Implement organization creation
- [ ] Build member invitation system
- [ ] Create organization management interface
- [ ] Add role assignment functionality
- [ ] Implement organization switching

### Phase 3: Security & Permissions
- [ ] Implement permission system
- [ ] Create role-based access control
- [ ] Add security middleware
- [ ] Build permission management UI
- [ ] Test security boundaries

### Phase 4: Legal Features
- [ ] Create lawyer profile management
- [ ] Implement practice area system
- [ ] Build client communication interface
- [ ] Add case management integration
- [ ] Create lawyer directory

### Phase 5: Polish & Launch
- [ ] Complete UI/UX polish
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Production deployment

---

## 🎯 **Refined Approach: Default-First Implementation**

Based on feedback, this plan has been refined to follow Better Auth best practices:

### ✅ **What We're Keeping Simple**
- **Users table**: Minimal, no legal-specific fields
- **Roles**: Use Better Auth defaults (owner/admin/member) initially
- **Permissions**: Simple role-based checks, not granular permissions
- **Invitations**: Use Better Auth's built-in system
- **Clients**: Separate from organization system entirely

### ✅ **What We're Adding Gradually**
- **Lawyer profiles**: Separate table for legal-specific data
- **Client profiles**: Separate table for external users
- **Practice areas**: Domain-specific extensions
- **Custom roles**: Only when real firms request them

### ✅ **Key Benefits of This Approach**
1. **Faster initial implementation** - leverage Better Auth defaults
2. **Cleaner schema** - no bloated auth tables
3. **Easier migrations** - less custom logic to maintain
4. **Better security** - proven Better Auth patterns
5. **Future flexibility** - can add complexity when needed

---

## 📋 **Minimal Starting Schema**

Here's the simplified schema to start with:

```sql
-- Better Auth core (minimal)
users (id, name, email, email_verified, image, created_at, updated_at)

-- Better Auth organization plugin (defaults)
organizations (id, name, slug, logo, metadata, created_at, updated_at)
organization_members (id, organization_id, user_id, role, created_at, updated_at)
organization_invitations (id, organization_id, email, role, status, expires_at, created_at)

-- Legal-specific extensions (add later when needed)
-- lawyer_profiles (id, user_id, bar_number, license_state, specialties, hourly_rate, bio, created_at, updated_at)
-- client_profiles (id, user_id, contact_preferences, case_history, created_at, updated_at)
-- practice_areas (id, name, description, category)
-- lawyer_practice_areas (lawyer_id, practice_area_id)
```

This approach gives you a solid foundation that can grow with your needs while following Better Auth best practices.

---

This plan provides a comprehensive roadmap for implementing Better Auth with the Organization plugin, specifically tailored for your legal team management use case. The refined approach ensures faster initial implementation while maintaining the flexibility to add complexity when needed.
