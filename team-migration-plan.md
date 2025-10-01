# Team Configuration Migration Plan

## Overview

This plan outlines the migration from static JSON team configuration files to a fully database-driven team management system using the existing Better Auth integration and team management APIs.

## Current State Analysis

### ✅ What We Have
- **8 teams** in database (including test teams with Base64-encoded configs)
- **0 users** in Better Auth system
- **Full team management API** (`POST /api/teams`, `PUT /api/teams/:id`, `DELETE /api/teams/:id`)
- **Better Auth integration** with `teamId` and `role` fields in user records
- **Database-driven team storage** in `teams` table with JSON config column

### 🔧 How Team Config is Currently Used

**AIService (`worker/services/AIService.ts`):**
- **Line 68-98**: `getTeamConfig()` method with caching (5-minute TTL)
- **Line 8-35**: `DEFAULT_TEAM_CONFIG` fallback when team not found
- **Line 84**: Caches team config for performance
- **Usage**: Provides team-specific AI model configuration and service lists

**PaymentService (`worker/services/PaymentService.ts`):**
- **Line 31**: `team?.config?.consultationFee` for pricing
- **Line 597**: `team.config.blawbyApi?.enabled` for API integration
- **Line 630**: Team API configuration validation
- **Usage**: Team-specific payment amounts and API integrations

**TeamService (`worker/services/TeamService.ts`):**
- **Line 614**: `team?.config.blawbyApi?.enabled` for API validation
- **Line 618**: `team.config.blawbyApi` for API key management
- **Line 645**: `team.config.blawbyApi?.apiKey` for hash generation
- **Usage**: API key management and team configuration validation

**Agent Routes (`worker/routes/agent.ts`):**
- **Line 152**: `aiService.getTeamConfig(effectiveTeamId)` for AI processing
- **Line 177**: Passes `teamConfig` to pipeline middleware
- **Usage**: Provides team context to AI agents and middleware

**Legal Intake Agent (`worker/agents/legal-intake/index.ts`):**
- **Line 1113**: `teamConfig: team` for contact form processing
- **Line 1251**: `teamConfig: team` for lawyer notifications
- **Line 1129**: `team?.config?.requiresPayment` for payment logic
- **Line 1156**: `team?.config?.paymentLink` for payment URLs
- **Usage**: Team-specific legal services and payment requirements

**Frontend Components:**
- **`src/index.tsx`**: Lines 28, 83, 215, 231 - Team config for UI display
- **`src/components/AppLayout.tsx`**: Lines 34, 54, 185, 222 - Team branding
- **`src/components/MobileTopNav.tsx`**: Lines 8, 18, 46 - Team profile display
- **Usage**: Team branding, intro messages, and UI customization

**Pipeline Middleware:**
- **`worker/middleware/fileAnalysisMiddleware.ts`**: Line 51 - Team config for file processing
- **`worker/middleware/pipeline.ts`**: Line 101 - Available services filtering
- **Usage**: Team-specific business logic and service filtering

### ❌ What We're Removing
- Static JSON configuration files in `scripts/team-configs/`
- `scripts/insert-team.sh` script
- Base64 encoding/decoding logic in team config handling
- Manual team setup process

## Migration Phases

### Phase 1: Data Cleanup and Validation

#### 1.1 Clean Up Test Data
```bash
# Remove test teams with Base64-encoded configs
wrangler d1 execute blawby-ai-chatbot --local --command "
DELETE FROM teams WHERE slug IN (
  'complex-test-team', 
  'error-test-team', 
  'new-test-team', 
  'final-test-team', 
  'quickstart-test'
);"
```

#### 1.2 Validate Core Teams
Ensure these essential teams remain:
- `blawby-ai` - Main AI assistant
- `north-carolina-legal-services` - Production law firm
- `test-team` - Development testing

#### 1.3 Verify Team Config Integrity
```bash
# Check that all remaining teams have valid JSON configs
wrangler d1 execute blawby-ai-chatbot --local --command "
SELECT id, slug, name, 
  CASE 
    WHEN json_valid(config) THEN 'Valid JSON'
    ELSE 'Invalid JSON'
  END as config_status
FROM teams;"
```

### Phase 2: API-Based Team Management

#### 2.1 Create Team Management Scripts
Replace `scripts/insert-team.sh` with API-based scripts:

**`scripts/create-team.sh`**
```bash
#!/bin/bash
# Usage: ./scripts/create-team.sh <team-data.json>

if [ $# -ne 1 ]; then
    echo "Usage: $0 <team-data.json>"
    exit 1
fi

TEAM_DATA="$1"
API_URL="${API_URL:-http://localhost:8787}"

# Validate JSON
if ! jq empty "$TEAM_DATA" >/dev/null 2>&1; then
    echo "Error: Invalid JSON in $TEAM_DATA"
    exit 1
fi

# Create team via API
curl -X POST "$API_URL/api/teams" \
  -H "Content-Type: application/json" \
  -d @"$TEAM_DATA" \
  --fail --silent --show-error

echo "Team created successfully"
```

#### 2.2 Update Team Configuration
**`scripts/update-team.sh`**
```bash
#!/bin/bash
# Usage: ./scripts/update-team.sh <team-id> <team-data.json>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <team-id> <team-data.json>"
    exit 1
fi

TEAM_ID="$1"
TEAM_DATA="$2"
API_URL="${API_URL:-http://localhost:8787}"

# Validate JSON
if ! jq empty "$TEAM_DATA" >/dev/null 2>&1; then
    echo "Error: Invalid JSON in $TEAM_DATA"
    exit 1
fi

# Update team via API
curl -X PUT "$API_URL/api/teams/$TEAM_ID" \
  -H "Content-Type: application/json" \
  -d @"$TEAM_DATA" \
  --fail --silent --show-error

echo "Team updated successfully"
```

### Phase 3: Remove Legacy Files

#### 3.1 Remove JSON Configuration Files
```bash
# Remove the entire team-configs directory
rm -rf scripts/team-configs/

# Remove the insert-team.sh script
rm scripts/insert-team.sh
```

#### 3.2 Update Documentation

**Files to Update:**

1. **`README.md`** - Update team management section
   - Remove references to `scripts/insert-team.sh`
   - Add API-based team creation examples
   - Update quickstart instructions

2. **`quickstart.sh`** - Lines 177-186
   ```bash
   # REPLACE team insertion section with:
   echo "✅ Teams already configured in database"
   # OR add API-based team creation if needed
   ```

3. **`plan.md`** - Line 79
   ```markdown
   # UPDATE line 79:
   # OLD: "- Team Configuration (view/edit team config if user has permissions)"
   # NEW: "- Team Configuration (view/edit team config via API if user has permissions)"
   ```

4. **Any deployment scripts** that reference team config files


## Implementation Timeline

### Week 1: Data Cleanup
- [ ] Clean up test teams with Base64 configs
- [ ] Validate remaining team configurations
- [ ] Test team API endpoints thoroughly

### Week 2: Script Migration
- [ ] Create new API-based team management scripts
- [ ] Test scripts with existing teams
- [ ] Update documentation

### Week 3: Legacy Removal
- [ ] Remove JSON configuration files
- [ ] Remove `insert-team.sh` script
- [ ] Update all references in codebase
- [ ] Final testing and validation

#### 3.3 Specific Files and Lines to Update

**Files to Remove:**
- `scripts/team-configs/blawby-ai.json` (entire file)
- `scripts/team-configs/north-carolina-legal-services.json` (entire file)
- `scripts/team-configs/test-team.json` (entire file)
- `scripts/insert-team.sh` (entire file)

**Files to Update:**

1. **`quickstart.sh`** - Lines 177-186
   ```bash
   # REMOVE these lines:
   echo "Inserting teams from configuration files..."
   ./scripts/insert-team.sh scripts/team-configs/test-team.json
   ./scripts/insert-team.sh scripts/team-configs/north-carolina-legal-services.json
   ./scripts/insert-team.sh scripts/team-configs/blawby-ai.json
   
   # REPLACE with API calls or remove entirely if teams already exist
   ```

2. **`worker/services/TeamService.ts`** - Line 85
   ```typescript
   // UPDATE comment on line 85:
   // OLD: "The insert-team.sh script now stores plain JSON text instead of Base64-encoded JSON"
   // NEW: "Team configs are stored as plain JSON text in the database"
   ```

3. **`scripts/insert-team.sh`** - Line 10
   ```bash
   # REMOVE entire file, but note the example reference:
   # Line 10: echo "Example: $0 scripts/team-configs/test-team.json"
   ```

**Files with Base64 References (Keep - These are for other purposes):**
- `worker/services/ActivityService.ts` - Lines 342, 350, 355 (cursor encoding/decoding)
- `worker/routes/activity.ts` - Line 316 (content hashing)
- `package-lock.json` - Various lines (dependency references)


## Benefits of Migration

### ✅ Advantages
1. **Single Source of Truth**: Database is the only place teams are defined
2. **Dynamic Management**: Teams can be created/modified without code changes
3. **Better Security**: API-based management with proper authentication
4. **Scalability**: Easy to add new teams via admin interface
5. **Consistency**: No more Base64 encoding issues or file sync problems
6. **Better Auth Integration**: Seamless user-team relationships

### 🔧 Technical Improvements
- Eliminates Base64 encoding/decoding complexity
- Removes file system dependencies
- Enables real-time team configuration updates
- Supports team-specific user management
- Enables audit trails for team changes

### 📊 Team Config Usage Analysis

**Critical Dependencies (Must Not Break):**
1. **AIService Caching** - 5-minute TTL cache for performance
2. **Payment Integration** - Team-specific pricing and API keys
3. **Legal Intake Flow** - Team-specific services and payment requirements
4. **Frontend Branding** - Team logos, colors, and intro messages
5. **API Key Management** - Blawby API integration per team

**Key Team Config Properties Used:**
- `aiModel` - AI model selection per team
- `consultationFee` - Payment amounts
- `requiresPayment` - Payment flow control
- `availableServices` - Service filtering
- `serviceQuestions` - Legal intake questions
- `jurisdiction` - Geographic restrictions
- `blawbyApi` - External API integration
- `brandColor`/`accentColor` - UI theming
- `introMessage` - Welcome messages
- `profileImage` - Team branding

## Risk Mitigation

### Backup Strategy
```bash
# Create backup of current teams before migration
wrangler d1 execute blawby-ai-chatbot --local --command "
SELECT * FROM teams;" --json > teams-backup-$(date +%Y%m%d).json
```

### Rollback Plan
If issues arise:
1. Restore teams from backup
2. Revert to JSON file approach temporarily
3. Fix issues and retry migration

### Testing Strategy
- Test all team API endpoints
- Verify team configuration loading
- Test user authentication with teams
- Validate team-specific features

## Success Criteria

### ✅ Migration Complete When:
- [ ] All teams managed via database only
- [ ] No JSON configuration files remain
- [ ] `insert-team.sh` script removed
- [ ] All team functionality works via API
- [ ] Documentation updated
- [ ] No Base64 encoding/decoding in codebase

#### Detailed Checklist:

**Files Removed:**
- [ ] `scripts/team-configs/blawby-ai.json`
- [ ] `scripts/team-configs/north-carolina-legal-services.json`
- [ ] `scripts/team-configs/test-team.json`
- [ ] `scripts/insert-team.sh`

**Files Updated:**
- [ ] `quickstart.sh` - Lines 177-186 (remove team insertion calls)
- [ ] `worker/services/TeamService.ts` - Line 85 (update comment)
- [ ] `README.md` - Update team management documentation
- [ ] `plan.md` - Line 79 (update team config reference)

**Database Cleanup:**
- [ ] Remove test teams with Base64-encoded configs
- [ ] Verify remaining teams have valid JSON configs
- [ ] Test team API endpoints

**Verification:**
- [ ] `grep -r "team-configs" .` returns no results
- [ ] `grep -r "insert-team.sh" .` returns no results
- [ ] All team functionality works via API calls
- [ ] No Base64 encoding/decoding for team configs (other Base64 usage is OK)

#### Complete Team Config Reference List

**Files with Team Config Usage (Keep - These are core functionality):**

**Backend Services:**

- `worker/services/AIService.ts` - Lines 8, 68, 97 (`DEFAULT_TEAM_CONFIG`, `getTeamConfig()`)
  - **Usage**: Caches team configs with 5-minute TTL for AI model selection and service lists
  - **Migration**: No changes needed - already uses database via TeamService.getTeam()

- `worker/services/TeamService.ts` - Lines 13, 48, 87, 155, 240, 266, 274, 280, 454 (`TeamConfig` interface, config handling)
  - **Usage**: Core team config interface, database storage, and validation
  - **Migration**: No changes needed - this IS the database-driven system

- `worker/services/PaymentService.ts` - Lines 31, 597, 630 (payment config, API integration)
  - **Usage**: Team-specific pricing via `consultationFee` and Blawby API integration
  - **Migration**: No changes needed - already uses database via TeamService.getTeam()

- `worker/routes/agent.ts` - Lines 147, 152, 177 (team config for AI processing)
  - **Usage**: Provides team context to AI agents and middleware pipeline
  - **Migration**: No changes needed - already uses AIService.getTeamConfig()

- `worker/routes/teams.ts` - Lines 1, 194 (team management API)
  - **Usage**: REST API for team CRUD operations (GET, POST, PUT, DELETE)
  - **Migration**: No changes needed - this IS the API-based system

- `worker/agents/legal-intake/index.ts` - Lines 1113, 1251 (contact processing, notifications)
  - **Usage**: Team-specific legal services, payment requirements, and lawyer notifications
  - **Migration**: No changes needed - already uses database team objects

- `worker/middleware/fileAnalysisMiddleware.ts` - Lines 2, 51 (file processing)
  - **Usage**: Team-specific file processing and analysis
  - **Migration**: No changes needed - already receives team config from pipeline

- `worker/middleware/pipeline.ts` - Line 101 (service filtering)
  - **Usage**: Filters available services based on team configuration
  - **Migration**: No changes needed - already receives team config from agent routes

**Frontend Components:**

- `src/index.tsx` - Lines 11, 28, 83, 87, 94, 210, 215, 231, 269, 289 (main app integration)
  - **Usage**: Main app component that fetches and uses team config for UI display and intro messages
  - **Migration**: No changes needed - already uses useTeamConfig hook which calls API

- `src/hooks/useTeamConfig.ts` - Lines 5, 28, 32, 36, 93, 112, 133, 155, 159, 170, 176, 179 (team config hook)
  - **Usage**: Core React hook that fetches team config from `/api/teams` endpoint
  - **Migration**: No changes needed - this IS the API-based frontend system

- `src/components/AppLayout.tsx` - Lines 29, 34, 49, 54, 157, 185, 222, 258, 261, 293, 297 (layout integration)
  - **Usage**: Layout component that displays team branding, profile images, and descriptions
  - **Migration**: No changes needed - receives team config as props from useTeamConfig

- `src/components/MobileTopNav.tsx` - Lines 8, 18, 46, 47 (mobile navigation)
  - **Usage**: Mobile navigation with team profile image and name display
  - **Migration**: No changes needed - receives team config as props

- `src/components/LeftSidebar.tsx` - Lines 19, 26, 55, 63, 64, 84, 86, 87 (sidebar branding)
  - **Usage**: Left sidebar with team logo and branding elements
  - **Migration**: No changes needed - receives team config as props

- `src/components/ChatContainer.tsx` - Lines 14, 45, 148 (chat interface)
  - **Usage**: Chat interface that displays team-specific messaging
  - **Migration**: No changes needed - receives team config as props

- `src/components/VirtualMessageList.tsx` - Lines 13, 34, 137, 140, 141, 143, 166 (message display)
  - **Usage**: Message list with team profile header and branding
  - **Migration**: No changes needed - receives team config as props

- `src/components/Message.tsx` - Lines 88, 222 (message rendering)
  - **Usage**: Individual message rendering with team context
  - **Migration**: No changes needed - receives team config as props

- `src/components/SEOHead.tsx` - Lines 2, 5, 13, 23, 50, 53, 54, 58, 60, 65, 76 (SEO metadata)
  - **Usage**: SEO metadata generation using team name, description, and profile image
  - **Migration**: No changes needed - receives team config as props

- `src/utils/forms.ts` - Lines 42, 47, 64, 65, 66, 74 (form processing)
  - **Usage**: Contact form processing with team-specific payment requirements
  - **Migration**: No changes needed - fetches team config via API call to `/api/teams`

**Scripts and Configuration:**

- `scripts/insert-team.sh` - Lines 4, 9, 10, 25, 43, 44, 49, 50, 66 (legacy insertion script)
  - **Usage**: Legacy script that inserts teams from JSON files using Base64 encoding
  - **Migration**: REMOVE - Replace with API calls using `POST /api/teams`

- `quickstart.sh` - Lines 180, 183, 186 (team setup calls)
  - **Usage**: Development setup script that calls insert-team.sh for initial team creation
  - **Migration**: UPDATE - Remove insert-team.sh calls, teams already exist in database

**Files to Remove:**
- `scripts/team-configs/blawby-ai.json`
- `scripts/team-configs/north-carolina-legal-services.json`
- `scripts/team-configs/test-team.json`
- `scripts/insert-team.sh`

**Files to Update:**
- `quickstart.sh` - Lines 177-186 (remove team insertion calls)
- `worker/services/TeamService.ts` - Line 85 (update comment)
- `README.md` - Update team management documentation
- `plan.md` - Line 79 (update team config reference)

### 📊 Metrics to Track
- Team creation/update success rate
- API response times
- User authentication success rate
- Team configuration loading performance

## Post-Migration Tasks

### 1. Monitor System Health
- Watch for any team-related errors
- Monitor API performance
- Check user authentication flows

### 2. Documentation Updates
- Update API documentation
- Update deployment guides
- Update developer onboarding docs

### 3. Team Training
- Train team members on new API-based approach
- Document common team management tasks
- Create troubleshooting guides

## Conclusion

This migration will modernize the team management system, eliminate technical debt, and provide a more scalable foundation for future growth. The database-driven approach with Better Auth integration is the right long-term solution for team management.

---

**Created:** $(date)  
**Status:** Ready for Implementation  
**Estimated Duration:** 2 weeks  
**Risk Level:** Low (with proper testing)
