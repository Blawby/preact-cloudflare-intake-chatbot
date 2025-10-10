# Teams to Organizations Migration Audit Report

Generated: 2025-10-10T06:36:14.835Z

## Summary

- **Total files scanned**: 303
- **Files with team references**: 88
- **Total references found**: 1172
- **Already updated files**: 6
- **Skipped files**: 8

## References by Category

- **simple**: 690 references
- **complex**: 43 references
- **types**: 187 references
- **functions**: 24 references
- **database**: 92 references
- **imports**: 18 references
- **comments**: 118 references

## Top 10 Files by Reference Count

- **worker/routes/teams.ts**: 78 references
- **worker/agents/legal-intake/index.ts**: 68 references
- **worker/services/SessionService.ts**: 67 references
- **worker/routes/files.ts**: 60 references
- **worker/consumers/doc-processor.ts**: 42 references
- **worker/schema.sql**: 42 references
- **tests/integration/services/TeamService.integration.test.ts**: 38 references
- **worker/services/PaymentService.ts**: 37 references
- **worker/routes/activity.ts**: 35 references
- **tests/setup-workers.ts**: 34 references

## Potential Conflicts

Files with both team and organization references:

- **worker/db/auth.schema.ts**: Contains both team and organization references
- **worker/routes/agent.ts**: Contains both team and organization references
- **tests/integration/api/legal-intake-analysis.test.ts**: Contains both team and organization references
- **migrations/add_better_auth_organization.sql**: Contains both team and organization references

## Detailed File Analysis

### worker/routes/teams.ts

- **Total references**: 78
- **Line count**: 645
- **Has organization refs**: No

#### simple (34)

- Line 68: `teamId`
  `const teamId = pathParts[0];`
- Line 68: `teamId`
  `const teamId = pathParts[0];`
- Line 68: `teamId`
  `const teamId = pathParts[0];`
- Line 68: `teamId`
  `const teamId = pathParts[0];`
- Line 68: `teamId`
  `const teamId = pathParts[0];`
- ... and 29 more

#### types (23)

- Line 1: `TeamService`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`
- Line 1: `TeamService`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`
- Line 1: `TeamService`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`
- Line 1: `TeamService`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`
- Line 1: `TeamService`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`
- ... and 18 more

#### functions (18)

- Line 71: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- Line 71: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- Line 71: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- Line 71: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- Line 71: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- ... and 13 more

#### imports (1)

- Line 1: `import { TeamService, TeamConfig } from '../services/TeamService`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`

#### comments (2)

- Line 70: `// Validate that the team`
  `// Validate that the team exists`
- Line 1: `'../services/TeamService.js'`
  `import { TeamService, TeamConfig } from '../services/TeamService.js';`

### worker/agents/legal-intake/index.ts

- **Total references**: 68
- **Line count**: 2513
- **Has organization refs**: No

#### simple (45)

- Line 697: `teamId`
  `function isPublicMode(teamId?: string | null): boolean {`
- Line 697: `teamId`
  `function isPublicMode(teamId?: string | null): boolean {`
- Line 697: `teamId`
  `function isPublicMode(teamId?: string | null): boolean {`
- Line 697: `teamId`
  `function isPublicMode(teamId?: string | null): boolean {`
- Line 697: `teamId`
  `function isPublicMode(teamId?: string | null): boolean {`
- ... and 40 more

#### types (18)

- Line 2: `TeamService`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`
- Line 2: `TeamService`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`
- Line 2: `TeamService`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`
- Line 2: `Team`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`
- Line 2: `Team`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`
- ... and 13 more

#### functions (1)

- Line 722: `getTeam(`
  `const team = await teamService.getTeam(teamId);`

#### imports (1)

- Line 2: `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`

#### comments (3)

- Line 708: `// TEAM`
  `// TEAM CONFIG CACHE`
- Line 925: ``\nIMPORTANT: This team requires location information (city and state) before proceeding with contact forms or matter creation. Always ask for location first if not provided.``
  ``\nIMPORTANT: This team requires location information (city and state) before proceeding with contact forms or matter creation. Always ask for location first if not provided.` : '';`
- Line 2: `'../../services/TeamService.js'`
  `import { TeamService, type Team, buildDefaultTeamConfig } from '../../services/TeamService.js';`

### worker/services/SessionService.ts

- **Total references**: 67
- **Line count**: 578
- **Has organization refs**: No

#### simple (49)

- Line 19: `teamId`
  `teamId: string;`
- Line 19: `teamId`
  `teamId: string;`
- Line 19: `teamId`
  `teamId: string;`
- Line 19: `teamId`
  `teamId: string;`
- Line 19: `teamId`
  `teamId: string;`
- ... and 44 more

#### complex (4)

- Line 221: `session.teamId`
  `if (session.teamId !== teamId) {`
- Line 221: `session.teamId`
  `if (session.teamId !== teamId) {`
- Line 221: `session.teamId`
  `if (session.teamId !== teamId) {`
- Line 221: `session.teamId`
  `if (session.teamId !== teamId) {`

#### database (12)

- Line 83: `team_id`
  `teamId: String(row.team_id),`
- Line 83: `team_id`
  `teamId: String(row.team_id),`
- Line 83: `team_id`
  `teamId: String(row.team_id),`
- Line 83: `team_id`
  `teamId: String(row.team_id),`
- Line 83: `team_id`
  `teamId: String(row.team_id),`
- ... and 7 more

#### comments (2)

- Line 222: ``Session ${sessionId} belongs to team ${session.teamId}, cannot be accessed by team ${teamId}``
  `throw new Error(`Session ${sessionId} belongs to team ${session.teamId}, cannot be accessed by team ${teamId}`);`
- Line 365: `'Cannot persist message: session not found or team mismatch'`
  `throw new Error('Cannot persist message: session not found or team mismatch');`

### worker/routes/files.ts

- **Total references**: 60
- **Line count**: 682
- **Has organization refs**: No

#### simple (41)

- Line 55: `teamId`
  `teamId: statusUpdate.teamId,`
- Line 55: `teamId`
  `teamId: statusUpdate.teamId,`
- Line 55: `teamId`
  `teamId: statusUpdate.teamId,`
- Line 55: `teamId`
  `teamId: statusUpdate.teamId,`
- Line 55: `teamId`
  `teamId: statusUpdate.teamId,`
- ... and 36 more

#### complex (10)

- Line 353: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 353: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 353: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 353: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 353: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- ... and 5 more

#### types (4)

- Line 84: `Team`
  `teamId: z.string().min(1, 'Team ID is required'),`
- Line 84: `Team`
  `teamId: z.string().min(1, 'Team ID is required'),`
- Line 84: `Team`
  `teamId: z.string().min(1, 'Team ID is required'),`
- Line 84: `Team`
  `teamId: z.string().min(1, 'Team ID is required'),`

#### database (2)

- Line 232: `team_id`
  `id, team_id, session_id, original_name, file_name, file_path,`
- Line 211: `FROM teams`
  `const teamCheckStmt = env.DB.prepare('SELECT id FROM teams WHERE id = ? OR slug = ?');`

#### comments (3)

- Line 210: `// First check if the team`
  `// First check if the team exists, if not, create a minimal entry`
- Line 157: ``${teamId}-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}``
  `const fileId = `${teamId}-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;`
- Line 84: `'Team ID is required'`
  `teamId: z.string().min(1, 'Team ID is required'),`

### worker/consumers/doc-processor.ts

- **Total references**: 42
- **Line count**: 553
- **Has organization refs**: No

#### simple (42)

- Line 19: `teamId`
  `const { sessionId, teamId, file, statusId } = msg.body as AutoAnalysisEvent;`
- Line 19: `teamId`
  `const { sessionId, teamId, file, statusId } = msg.body as AutoAnalysisEvent;`
- Line 19: `teamId`
  `const { sessionId, teamId, file, statusId } = msg.body as AutoAnalysisEvent;`
- Line 19: `teamId`
  `const { sessionId, teamId, file, statusId } = msg.body as AutoAnalysisEvent;`
- Line 19: `teamId`
  `const { sessionId, teamId, file, statusId } = msg.body as AutoAnalysisEvent;`
- ... and 37 more

### worker/schema.sql

- **Total references**: 42
- **Line count**: 418
- **Has organization refs**: No

#### simple (19)

- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- ... and 14 more

#### types (1)

- Line 6: `Team`
  `-- Teams table`

#### database (19)

- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- Line 20: `team_id`
  `team_id TEXT NOT NULL,`
- ... and 14 more

#### comments (3)

- Line 210: `//app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team`
  `('01K0TNGNKNJEP8EPKHXAQV4S0R', 'north-carolina-legal-services', 'North Carolina Legal Services', '{"aiModel": "@cf/openai/gpt-oss-20b", "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl": null}}'),`
- Line 210: `"aiModel": "@cf/openai/gpt-oss-20b", "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl"`
  `('01K0TNGNKNJEP8EPKHXAQV4S0R', 'north-carolina-legal-services', 'North Carolina Legal Services', '{"aiModel": "@cf/openai/gpt-oss-20b", "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl": null}}'),`
- Line 148: `'private', -- 'public', 'private', 'team', 'client'`
  `access_level TEXT DEFAULT 'private', -- 'public', 'private', 'team', 'client'`

### tests/integration/services/TeamService.integration.test.ts

- **Total references**: 38
- **Line count**: 530
- **Has organization refs**: No

#### simple (6)

- Line 184: `teamId`
  `const teamId = createdTeam.data!.id;`
- Line 184: `teamId`
  `const teamId = createdTeam.data!.id;`
- Line 184: `teamId`
  `const teamId = createdTeam.data!.id;`
- Line 184: `teamId`
  `const teamId = createdTeam.data!.id;`
- Line 184: `teamId`
  `const teamId = createdTeam.data!.id;`
- ... and 1 more

#### types (26)

- Line 4: `TeamService`
  `import { Team } from '../../../worker/services/TeamService.js';`
- Line 4: `TeamService`
  `import { Team } from '../../../worker/services/TeamService.js';`
- Line 4: `TeamService`
  `import { Team } from '../../../worker/services/TeamService.js';`
- Line 4: `Team`
  `import { Team } from '../../../worker/services/TeamService.js';`
- Line 4: `Team`
  `import { Team } from '../../../worker/services/TeamService.js';`
- ... and 21 more

#### database (2)

- Line 327: `teams.`
  `expect(teams.length).toBeGreaterThan(0);`
- Line 327: `teams.`
  `expect(teams.length).toBeGreaterThan(0);`

#### imports (1)

- Line 4: `import { Team } from '../../../worker/services/TeamService`
  `import { Team } from '../../../worker/services/TeamService.js';`

#### comments (3)

- Line 33: `// Verify team`
  `// Verify team structure`
- Line 24: ``${WORKER_URL}/api/teams``
  `const response = await fetch(`${WORKER_URL}/api/teams`);`
- Line 4: `'../../../worker/services/TeamService.js'`
  `import { Team } from '../../../worker/services/TeamService.js';`

### worker/services/PaymentService.ts

- **Total references**: 37
- **Line count**: 805
- **Has organization refs**: No

#### simple (17)

- Line 24: `teamId`
  `private async getPaymentConfig(teamId: string): Promise<PaymentConfig> {`
- Line 24: `teamId`
  `private async getPaymentConfig(teamId: string): Promise<PaymentConfig> {`
- Line 24: `teamId`
  `private async getPaymentConfig(teamId: string): Promise<PaymentConfig> {`
- Line 24: `teamId`
  `private async getPaymentConfig(teamId: string): Promise<PaymentConfig> {`
- Line 24: `teamId`
  `private async getPaymentConfig(teamId: string): Promise<PaymentConfig> {`
- ... and 12 more

#### types (10)

- Line 26: `TeamService`
  `const { TeamService } = await import('./TeamService.js');`
- Line 26: `TeamService`
  `const { TeamService } = await import('./TeamService.js');`
- Line 26: `TeamService`
  `const { TeamService } = await import('./TeamService.js');`
- Line 26: `TeamService`
  `const { TeamService } = await import('./TeamService.js');`
- Line 26: `TeamService`
  `const { TeamService } = await import('./TeamService.js');`
- ... and 5 more

#### functions (2)

- Line 28: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- Line 28: `getTeam(`
  `const team = await teamService.getTeam(teamId);`

#### database (3)

- Line 386: `team_id`
  `team_id: customerData.team_id`
- Line 386: `team_id`
  `team_id: customerData.team_id`
- Line 386: `team_id`
  `team_id: customerData.team_id`

#### imports (2)

- Line 26: `import('./TeamService`
  `const { TeamService } = await import('./TeamService.js');`
- Line 26: `import('./TeamService`
  `const { TeamService } = await import('./TeamService.js');`

#### comments (3)

- Line 30: `// Use team`
  `// Use team's consultation fee if available, otherwise use defaults`
- Line 144: ``${this.mcpServerUrl}/api/v1/teams/${teamUlid}/customer``
  `const response = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamUlid}/customer`, {`
- Line 26: `'./TeamService.js'`
  `const { TeamService } = await import('./TeamService.js');`

### worker/routes/activity.ts

- **Total references**: 35
- **Line count**: 407
- **Has organization refs**: No

#### simple (21)

- Line 74: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 74: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 74: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 74: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 74: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- ... and 16 more

#### complex (11)

- Line 93: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 93: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 93: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 93: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- Line 93: `resolvedTeamId`
  `const resolvedTeamId = sessionResolution.session.teamId;`
- ... and 6 more

#### comments (3)

- Line 95: `// Security check: ensure session belongs to the requested team`
  `// Security check: ensure session belongs to the requested team`
- Line 315: ``idempotency:${teamId}:${key}``
  `const idempotencyKey = `idempotency:${teamId}:${key}`;`
- Line 74: `'teamId'`
  `const teamId = url.searchParams.get('teamId');`

### tests/setup-workers.ts

- **Total references**: 34
- **Line count**: 317
- **Has organization refs**: No

#### simple (20)

- Line 110: `teamId`
  `export function getTestTeamConfigForDB(teamId: string): TeamRecord {`
- Line 110: `teamId`
  `export function getTestTeamConfigForDB(teamId: string): TeamRecord {`
- Line 110: `teamId`
  `export function getTestTeamConfigForDB(teamId: string): TeamRecord {`
- Line 110: `teamId`
  `export function getTestTeamConfigForDB(teamId: string): TeamRecord {`
- Line 110: `teamId`
  `export function getTestTeamConfigForDB(teamId: string): TeamRecord {`
- ... and 15 more

#### types (5)

- Line 27: `TeamConfig`
  `interface TeamConfig {`
- Line 27: `TeamConfig`
  `interface TeamConfig {`
- Line 27: `Team`
  `interface TeamConfig {`
- Line 27: `Team`
  `interface TeamConfig {`
- Line 27: `Team`
  `interface TeamConfig {`

#### database (6)

- Line 136: `team_id`
  `id, team_id, client_name, matter_type, title, opposing_party, status`
- Line 136: `team_id`
  `id, team_id, client_name, matter_type, title, opposing_party, status`
- Line 136: `team_id`
  `id, team_id, client_name, matter_type, title, opposing_party, status`
- Line 136: `team_id`
  `id, team_id, client_name, matter_type, title, opposing_party, status`
- Line 254: `UPDATE teams`
  `UPDATE teams`
- ... and 1 more

#### comments (3)

- Line 5: `// TypeScript interfaces for team`
  `// TypeScript interfaces for team configuration`
- Line 172: ``✅ Created test team in beforeAll: ${teamConfig.name} (${teamConfig.id})``
  `console.log(`✅ Created test team in beforeAll: ${teamConfig.name} (${teamConfig.id})`);`
- Line 77: `'test-team-1'`
  `'test-team-1': {`

### worker/middleware/fileAnalysisMiddleware.ts

- **Total references**: 33
- **Line count**: 385
- **Has organization refs**: No

#### simple (26)

- Line 72: `teamId`
  `teamId: context.teamId`
- Line 72: `teamId`
  `teamId: context.teamId`
- Line 72: `teamId`
  `teamId: context.teamId`
- Line 72: `teamId`
  `teamId: context.teamId`
- Line 72: `teamId`
  `teamId: context.teamId`
- ... and 21 more

#### types (3)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (3)

- Line 298: `// Handle URLs like "/api/files/team`
  `// Handle URLs like "/api/files/team-session-timestamp-random"`
- Line 298: `"/api/files/team-session-timestamp-random"`
  `// Handle URLs like "/api/files/team-session-timestamp-random"`
- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### worker/services/ActivityService.ts

- **Total references**: 28
- **Line count**: 385
- **Has organization refs**: No

#### simple (20)

- Line 39: `teamId`
  `async getMatterEvents(matterId: string, teamId: string): Promise<ActivityEvent[]> {`
- Line 39: `teamId`
  `async getMatterEvents(matterId: string, teamId: string): Promise<ActivityEvent[]> {`
- Line 39: `teamId`
  `async getMatterEvents(matterId: string, teamId: string): Promise<ActivityEvent[]> {`
- Line 39: `teamId`
  `async getMatterEvents(matterId: string, teamId: string): Promise<ActivityEvent[]> {`
- Line 39: `teamId`
  `async getMatterEvents(matterId: string, teamId: string): Promise<ActivityEvent[]> {`
- ... and 15 more

#### types (1)

- Line 111: `Team`
  `throw new Error('Team ID is required for activity queries');`

#### database (6)

- Line 52: `team_id`
  `SELECT id FROM matters WHERE team_id = ?`
- Line 52: `team_id`
  `SELECT id FROM matters WHERE team_id = ?`
- Line 52: `team_id`
  `SELECT id FROM matters WHERE team_id = ?`
- Line 52: `team_id`
  `SELECT id FROM matters WHERE team_id = ?`
- Line 52: `team_id`
  `SELECT id FROM matters WHERE team_id = ?`
- ... and 1 more

#### comments (1)

- Line 111: `'Team ID is required for activity queries'`
  `throw new Error('Team ID is required for activity queries');`

### worker/services/AIService.ts

- **Total references**: 26
- **Line count**: 85
- **Has organization refs**: No

#### simple (9)

- Line 43: `teamId`
  `async getTeamConfig(teamId: string): Promise<TeamConfig> {`
- Line 43: `teamId`
  `async getTeamConfig(teamId: string): Promise<TeamConfig> {`
- Line 43: `teamId`
  `async getTeamConfig(teamId: string): Promise<TeamConfig> {`
- Line 43: `teamId`
  `async getTeamConfig(teamId: string): Promise<TeamConfig> {`
- Line 43: `teamId`
  `async getTeamConfig(teamId: string): Promise<TeamConfig> {`
- ... and 4 more

#### types (10)

- Line 1: `TeamService`
  `// Import TeamConfig helpers from TeamService instead of defining it here`
- Line 1: `TeamService`
  `// Import TeamConfig helpers from TeamService instead of defining it here`
- Line 1: `TeamService`
  `// Import TeamConfig helpers from TeamService instead of defining it here`
- Line 1: `TeamService`
  `// Import TeamConfig helpers from TeamService instead of defining it here`
- Line 1: `TeamService`
  `// Import TeamConfig helpers from TeamService instead of defining it here`
- ... and 5 more

#### functions (3)

- Line 55: `getTeam(`
  `const team = await teamService.getTeam(teamId);`
- Line 64: `listTeams(`
  `const allTeams = await teamService.listTeams();`
- Line 43: `getTeamConfig(`
  `async getTeamConfig(teamId: string): Promise<TeamConfig> {`

#### imports (2)

- Line 2: `import { TeamConfig, buildDefaultTeamConfig } from './TeamService`
  `import { TeamConfig, buildDefaultTeamConfig } from './TeamService.js';`
- Line 53: `import('./TeamService`
  `const { TeamService } = await import('./TeamService.js');`

#### comments (2)

- Line 1: `// Import TeamConfig helpers from Team`
  `// Import TeamConfig helpers from TeamService instead of defining it here`
- Line 2: `'./TeamService.js'`
  `import { TeamConfig, buildDefaultTeamConfig } from './TeamService.js';`

### worker/routes/sessions.ts

- **Total references**: 23
- **Line count**: 161
- **Has organization refs**: No

#### simple (16)

- Line 7: `teamId`
  `async function normalizeTeamId(env: Env, teamId?: string | null): Promise<string> {`
- Line 7: `teamId`
  `async function normalizeTeamId(env: Env, teamId?: string | null): Promise<string> {`
- Line 7: `teamId`
  `async function normalizeTeamId(env: Env, teamId?: string | null): Promise<string> {`
- Line 7: `teamId`
  `async function normalizeTeamId(env: Env, teamId?: string | null): Promise<string> {`
- Line 7: `teamId`
  `async function normalizeTeamId(env: Env, teamId?: string | null): Promise<string> {`
- ... and 11 more

#### complex (3)

- Line 87: `session.teamId`
  `teamId: resolution.session.teamId,`
- Line 87: `session.teamId`
  `teamId: resolution.session.teamId,`
- Line 87: `session.teamId`
  `teamId: resolution.session.teamId,`

#### database (2)

- Line 18: `FROM teams`
  `'SELECT id FROM teams WHERE id = ?'`
- Line 18: `FROM teams`
  `'SELECT id FROM teams WHERE id = ?'`

#### comments (2)

- Line 16: `// Try to find team`
  `// Try to find team by ID (ULID) first, then by slug`
- Line 9: `'teamId is required'`
  `throw HttpErrors.badRequest('teamId is required');`

### src/hooks/useTeamConfig.ts

- **Total references**: 23
- **Line count**: 238
- **Has organization refs**: No

#### simple (15)

- Line 70: `teamId`
  `const [teamId, setTeamId] = useState<string>('');`
- Line 70: `teamId`
  `const [teamId, setTeamId] = useState<string>('');`
- Line 70: `teamId`
  `const [teamId, setTeamId] = useState<string>('');`
- Line 70: `teamId`
  `const [teamId, setTeamId] = useState<string>('');`
- Line 70: `teamId`
  `const [teamId, setTeamId] = useState<string>('');`
- ... and 10 more

#### types (6)

- Line 19: `TeamConfig`
  `interface TeamConfig {`
- Line 19: `TeamConfig`
  `interface TeamConfig {`
- Line 19: `TeamConfig`
  `interface TeamConfig {`
- Line 19: `TeamConfig`
  `interface TeamConfig {`
- Line 5: `Team`
  `const getTeamsEndpoint = () => '/api/teams';`
- ... and 1 more

#### comments (2)

- Line 95: `// Use ref to track if we've already fetched for this team`
  `// Use ref to track if we've already fetched for this teamId`
- Line 5: `'/api/teams'`
  `const getTeamsEndpoint = () => '/api/teams';`

### migrations/00000000_base_schema.sql

- **Total references**: 23
- **Line count**: 212
- **Has organization refs**: No

#### simple (10)

- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- ... and 5 more

#### database (10)

- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- Line 18: `team_id`
  `team_id TEXT NOT NULL,`
- ... and 5 more

#### comments (3)

- Line 204: `//app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team`
  `('01K0TNGNKNJEP8EPKHXAQV4S0R', 'north-carolina-legal-services', 'North Carolina Legal Services', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl": null}}'),`
- Line 204: `"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl"`
  `('01K0TNGNKNJEP8EPKHXAQV4S0R', 'north-carolina-legal-services', 'North Carolina Legal Services', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl": null}}'),`
- Line 203: `'01K0TNGNKVCFT7V78Y4QF0PKH5', 'test-team', 'Test Law Firm', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "requiresPayment": false}'`
  `('01K0TNGNKVCFT7V78Y4QF0PKH5', 'test-team', 'Test Law Firm', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "requiresPayment": false}'),`

### worker/routes/payment.ts

- **Total references**: 20
- **Line count**: 370
- **Has organization refs**: No

#### simple (15)

- Line 26: `teamId`
  `if (!body.teamId) {`
- Line 26: `teamId`
  `if (!body.teamId) {`
- Line 26: `teamId`
  `if (!body.teamId) {`
- Line 26: `teamId`
  `if (!body.teamId) {`
- Line 26: `teamId`
  `if (!body.teamId) {`
- ... and 10 more

#### database (3)

- Line 109: `team_id`
  `conditions.push('team_id = ?');`
- Line 109: `team_id`
  `conditions.push('team_id = ?');`
- Line 109: `team_id`
  `conditions.push('team_id = ?');`

#### comments (2)

- Line 91: `// GET /api/payment/history - Get payment history for a user or team`
  `// GET /api/payment/history - Get payment history for a user or team`
- Line 27: `'Missing team ID'`
  `throw HttpErrors.badRequest('Missing team ID');`

### worker/services/ContactIntakeOrchestrator.ts

- **Total references**: 20
- **Line count**: 256
- **Has organization refs**: No

#### simple (14)

- Line 23: `teamId`
  `teamId?: string;`
- Line 23: `teamId`
  `teamId?: string;`
- Line 23: `teamId`
  `teamId?: string;`
- Line 23: `teamId`
  `teamId?: string;`
- Line 23: `teamId`
  `teamId?: string;`
- ... and 9 more

#### types (3)

- Line 6: `TeamService`
  `import type { Team } from './TeamService.js';`
- Line 6: `Team`
  `import type { Team } from './TeamService.js';`
- Line 6: `Team`
  `import type { Team } from './TeamService.js';`

#### imports (1)

- Line 6: `import type { Team } from './TeamService`
  `import type { Team } from './TeamService.js';`

#### comments (2)

- Line 80: ``case-submissions/${safeTeam}/${safeSession}/${filename}``
  `return `case-submissions/${safeTeam}/${safeSession}/${filename}`;`
- Line 6: `'./TeamService.js'`
  `import type { Team } from './TeamService.js';`

### worker/agents/legal-intake/legalIntakeLogger.ts

- **Total references**: 19
- **Line count**: 637
- **Has organization refs**: No

#### simple (19)

- Line 54: `teamId`
  `teamId?: string;`
- Line 54: `teamId`
  `teamId?: string;`
- Line 54: `teamId`
  `teamId?: string;`
- Line 54: `teamId`
  `teamId?: string;`
- Line 54: `teamId`
  `teamId?: string;`
- ... and 14 more

### worker/agents/legal-intake/promptTemplates.ts

- **Total references**: 18
- **Line count**: 401
- **Has organization refs**: No

#### simple (9)

- Line 257: `teamId`
  `teamId?: string`
- Line 257: `teamId`
  `teamId?: string`
- Line 257: `teamId`
  `teamId?: string`
- Line 257: `teamId`
  `teamId?: string`
- Line 257: `teamId`
  `teamId?: string`
- ... and 4 more

#### types (5)

- Line 8: `TeamConfig`
  `export interface TeamConfig {`
- Line 8: `TeamConfig`
  `export interface TeamConfig {`
- Line 6: `Team`
  `* Based on the Team interface but only includes properties used in this module`
- Line 6: `Team`
  `* Based on the Team interface but only includes properties used in this module`
- Line 6: `Team`
  `* Based on the Team interface but only includes properties used in this module`

#### comments (4)

- Line 388: `// Choose the appropriate template based on team`
  `// Choose the appropriate template based on team configuration`
- Line 9: `/** Team slug identifier */`
  `/** Team slug identifier */`
- Line 9: `/** Team slug identifier */`
  `/** Team slug identifier */`
- Line 377: `'string' || teamId.trim() === ''`
  `if (teamId !== undefined && (typeof teamId !== 'string' || teamId.trim() === '')) {`

### src/hooks/useFileUpload.ts

- **Total references**: 18
- **Line count**: 360
- **Has organization refs**: No

#### simple (9)

- Line 31: `teamId`
  `teamId?: string;`
- Line 31: `teamId`
  `teamId?: string;`
- Line 31: `teamId`
  `teamId?: string;`
- Line 31: `teamId`
  `teamId?: string;`
- Line 31: `teamId`
  `teamId?: string;`
- ... and 4 more

#### complex (6)

- Line 73: `resolvedTeamId`
  `const resolvedTeamId = (teamId ?? '').trim();`
- Line 73: `resolvedTeamId`
  `const resolvedTeamId = (teamId ?? '').trim();`
- Line 73: `resolvedTeamId`
  `const resolvedTeamId = (teamId ?? '').trim();`
- Line 73: `resolvedTeamId`
  `const resolvedTeamId = (teamId ?? '').trim();`
- Line 73: `resolvedTeamId`
  `const resolvedTeamId = (teamId ?? '').trim();`
- ... and 1 more

#### comments (3)

- Line 83: ``Cannot upload files yet. Waiting for session to initialize. teamId: "${resolvedTeamId}", sessionId: "${resolvedSessionId}"``
  `const error = `Cannot upload files yet. Waiting for session to initialize. teamId: "${resolvedTeamId}", sessionId: "${resolvedSessionId}"`;`
- Line 83: `"${resolvedTeamId}", sessionId: "${resolvedSessionId}"`
  `const error = `Cannot upload files yet. Waiting for session to initialize. teamId: "${resolvedTeamId}", sessionId: "${resolvedSessionId}"`;`
- Line 41: `'teamId'`
  `formData.append('teamId', teamId);`

### tests/integration/api/teams.test.ts

- **Total references**: 18
- **Line count**: 380
- **Has organization refs**: No

#### simple (7)

- Line 245: `teamId`
  `const teamId = createdTeam.data.id;`
- Line 245: `teamId`
  `const teamId = createdTeam.data.id;`
- Line 245: `teamId`
  `const teamId = createdTeam.data.id;`
- Line 245: `teamId`
  `const teamId = createdTeam.data.id;`
- Line 245: `teamId`
  `const teamId = createdTeam.data.id;`
- ... and 2 more

#### types (8)

- Line 5: `Team`
  `async function createTestTeam() {`
- Line 5: `Team`
  `async function createTestTeam() {`
- Line 5: `Team`
  `async function createTestTeam() {`
- Line 5: `Team`
  `async function createTestTeam() {`
- Line 5: `Team`
  `async function createTestTeam() {`
- ... and 3 more

#### comments (3)

- Line 4: `// Helper function to create a test team`
  `// Helper function to create a test team`
- Line 7: ``test-team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}``
  `slug: `test-team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,`
- Line 8: `'Test Legal Team'`
  `name: 'Test Legal Team',`

### worker/middleware/skipToLawyerMiddleware.ts

- **Total references**: 16
- **Line count**: 306
- **Has organization refs**: No

#### simple (7)

- Line 112: `teamId`
  `// Determine if this is public mode or team mode based on teamId`
- Line 112: `teamId`
  `// Determine if this is public mode or team mode based on teamId`
- Line 112: `teamId`
  `// Determine if this is public mode or team mode based on teamId`
- Line 112: `teamId`
  `// Determine if this is public mode or team mode based on teamId`
- Line 112: `teamId`
  `// Determine if this is public mode or team mode based on teamId`
- ... and 2 more

#### types (6)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `Team`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `Team`
  `import type { TeamConfig } from '../services/TeamService.js';`
- ... and 1 more

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (2)

- Line 112: `// Determine if this is public mode or team mode based on team`
  `// Determine if this is public mode or team mode based on teamId`
- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### src/index.tsx

- **Total references**: 14
- **Line count**: 616
- **Has organization refs**: No

#### simple (10)

- Line 47: `teamId`
  `const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({`
- Line 47: `teamId`
  `const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({`
- Line 47: `teamId`
  `const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({`
- Line 47: `teamId`
  `const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({`
- Line 47: `teamId`
  `const { teamId, teamConfig, teamNotFound, handleRetryTeamConfig } = useTeamConfig({`
- ... and 5 more

#### types (2)

- Line 13: `Team`
  `import { useTeamConfig } from './hooks/useTeamConfig';`
- Line 13: `Team`
  `import { useTeamConfig } from './hooks/useTeamConfig';`

#### comments (2)

- Line 49: `// Handle team`
  `// Handle team config error`
- Line 13: `'./hooks/useTeamConfig'`
  `import { useTeamConfig } from './hooks/useTeamConfig';`

### worker/services/StatusService.ts

- **Total references**: 13
- **Line count**: 342
- **Has organization refs**: No

#### simple (12)

- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`
- ... and 7 more

#### comments (1)

- Line 288: `'sessionId, teamId, and fileName are required'`
  `throw new Error('sessionId, teamId, and fileName are required');`

### worker/services/AsyncAdobeAnalysis.ts

- **Total references**: 12
- **Line count**: 160
- **Has organization refs**: No

#### simple (12)

- Line 28: `teamId`
  `teamId: string,`
- Line 28: `teamId`
  `teamId: string,`
- Line 28: `teamId`
  `teamId: string,`
- Line 28: `teamId`
  `teamId: string,`
- Line 28: `teamId`
  `teamId: string,`
- ... and 7 more

### src/hooks/useActivity.ts

- **Total references**: 12
- **Line count**: 242
- **Has organization refs**: No

#### simple (10)

- Line 20: `teamId`
  `teamId?: string;`
- Line 20: `teamId`
  `teamId?: string;`
- Line 20: `teamId`
  `teamId?: string;`
- Line 20: `teamId`
  `teamId?: string;`
- Line 20: `teamId`
  `teamId?: string;`
- ... and 5 more

#### types (1)

- Line 88: `Team`
  `setError('Team ID is required');`

#### comments (1)

- Line 73: `'teamId'`
  `if (teamId) params.set('teamId', teamId);`

### src/hooks/useMessageHandling.ts

- **Total references**: 12
- **Line count**: 589
- **Has organization refs**: No

#### simple (7)

- Line 55: `teamId`
  `teamId?: string;`
- Line 55: `teamId`
  `teamId?: string;`
- Line 55: `teamId`
  `teamId?: string;`
- Line 55: `teamId`
  `teamId?: string;`
- Line 55: `teamId`
  `teamId?: string;`
- ... and 2 more

#### complex (5)

- Line 119: `effectiveTeamId`
  `const effectiveTeamId = (teamId ?? '').trim();`
- Line 119: `effectiveTeamId`
  `const effectiveTeamId = (teamId ?? '').trim();`
- Line 119: `effectiveTeamId`
  `const effectiveTeamId = (teamId ?? '').trim();`
- Line 119: `effectiveTeamId`
  `const effectiveTeamId = (teamId ?? '').trim();`
- Line 119: `effectiveTeamId`
  `const effectiveTeamId = (teamId ?? '').trim();`

### tests/integration/api/agent-route.test.ts

- **Total references**: 12
- **Line count**: 517
- **Has organization refs**: No

#### simple (10)

- Line 98: `teamId`
  `teamId: 'test-team-1',`
- Line 98: `teamId`
  `teamId: 'test-team-1',`
- Line 98: `teamId`
  `teamId: 'test-team-1',`
- Line 98: `teamId`
  `teamId: 'test-team-1',`
- Line 98: `teamId`
  `teamId: 'test-team-1',`
- ... and 5 more

#### comments (2)

- Line 408: `// Should handle non-existent team`
  `// Should handle non-existent team gracefully by using default config`
- Line 98: `'test-team-1'`
  `teamId: 'test-team-1',`

### worker/schemas/validation.ts

- **Total references**: 11
- **Line count**: 162
- **Has organization refs**: No

#### simple (9)

- Line 23: `teamId`
  `teamId: idSchema.optional(),`
- Line 23: `teamId`
  `teamId: idSchema.optional(),`
- Line 23: `teamId`
  `teamId: idSchema.optional(),`
- Line 23: `teamId`
  `teamId: idSchema.optional(),`
- Line 23: `teamId`
  `teamId: idSchema.optional(),`
- ... and 4 more

#### types (1)

- Line 49: `Team`
  `// Team schemas`

#### comments (1)

- Line 49: `// Team`
  `// Team schemas`

### worker/utils.ts

- **Total references**: 11
- **Line count**: 117
- **Has organization refs**: No

#### simple (9)

- Line 18: `teamId`
  `teamId: string,`
- Line 18: `teamId`
  `teamId: string,`
- Line 18: `teamId`
  `teamId: string,`
- Line 18: `teamId`
  `teamId: string,`
- Line 18: `teamId`
  `teamId: string,`
- ... and 4 more

#### database (2)

- Line 32: `team_id`
  `WHERE team_id = ? AND strftime('%Y', created_at) = ?`
- Line 32: `team_id`
  `WHERE team_id = ? AND strftime('%Y', created_at) = ?`

### src/components/AppLayout.tsx

- **Total references**: 11
- **Line count**: 363
- **Has organization refs**: No

#### simple (10)

- Line 31: `teamId`
  `teamId: string;`
- Line 31: `teamId`
  `teamId: string;`
- Line 31: `teamId`
  `teamId: string;`
- Line 31: `teamId`
  `teamId: string;`
- Line 31: `teamId`
  `teamId: string;`
- ... and 5 more

#### comments (1)

- Line 5: `'./TeamNotFound'`
  `import { TeamNotFound } from './TeamNotFound';`

### worker/routes/agent.ts

- **Total references**: 10
- **Line count**: 738
- **Has organization refs**: ⚠️ Yes

#### simple (2)

- Line 353: `team_id`
  `INSERT OR IGNORE INTO client_team_access (id, user_id, team_id, first_contact_at, last_activity_at)`
- Line 353: `team_id`
  `INSERT OR IGNORE INTO client_team_access (id, user_id, team_id, first_contact_at, last_activity_at)`

#### complex (4)

- Line 629: `effectiveTeamId`
  `effectiveTeamId,`
- Line 356: `resolvedTeamId`
  ``${authContext.user.id}-${resolvedTeamId}`,`
- Line 356: `resolvedTeamId`
  ``${authContext.user.id}-${resolvedTeamId}`,`
- Line 356: `resolvedTeamId`
  ``${authContext.user.id}-${resolvedTeamId}`,`

#### database (2)

- Line 353: `team_id`
  `INSERT OR IGNORE INTO client_team_access (id, user_id, team_id, first_contact_at, last_activity_at)`
- Line 353: `team_id`
  `INSERT OR IGNORE INTO client_team_access (id, user_id, team_id, first_contact_at, last_activity_at)`

#### comments (2)

- Line 351: `// Track client-team`
  `// Track client-team access for authenticated users`
- Line 356: ``${authContext.user.id}-${resolvedTeamId}``
  ``${authContext.user.id}-${resolvedTeamId}`,`

### worker/services/ReviewService.ts

- **Total references**: 10
- **Line count**: 166
- **Has organization refs**: No

#### simple (6)

- Line 26: `teamId`
  `async getReviewMatters(teamId: string): Promise<ReviewMatter[]> {`
- Line 26: `teamId`
  `async getReviewMatters(teamId: string): Promise<ReviewMatter[]> {`
- Line 26: `teamId`
  `async getReviewMatters(teamId: string): Promise<ReviewMatter[]> {`
- Line 26: `teamId`
  `async getReviewMatters(teamId: string): Promise<ReviewMatter[]> {`
- Line 44: `team_id`
  `WHERE m.team_id = ?`
- ... and 1 more

#### types (1)

- Line 2: `TeamConfig`
  `import { TeamConfig } from './AIService';`

#### database (2)

- Line 44: `team_id`
  `WHERE m.team_id = ?`
- Line 44: `team_id`
  `WHERE m.team_id = ?`

#### comments (1)

- Line 121: `// Get review statistics for a team`
  `// Get review statistics for a team`

### src/components/TeamProfile.tsx

- **Total references**: 10
- **Line count**: 60
- **Has organization refs**: No

#### simple (4)

- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`
- Line 6: `teamId`
  `teamId: string;`

#### types (4)

- Line 3: `Team`
  `interface TeamProfileProps {`
- Line 3: `Team`
  `interface TeamProfileProps {`
- Line 3: `Team`
  `interface TeamProfileProps {`
- Line 3: `Team`
  `interface TeamProfileProps {`

#### comments (2)

- Line 24: `/* Team Logo */`
  `{/* Team Logo */}`
- Line 49: ``@${teamId}``
  `<span className="text-sm sm:text-base lg:text-lg font-medium text-[#d4af37] truncate block" title={`@${teamId}`}>@{teamId}</span>`

### src/components/VirtualMessageList.tsx

- **Total references**: 10
- **Line count**: 184
- **Has organization refs**: No

#### simple (7)

- Line 16: `teamId`
  `teamId: string;`
- Line 16: `teamId`
  `teamId: string;`
- Line 16: `teamId`
  `teamId: string;`
- Line 16: `teamId`
  `teamId: string;`
- Line 16: `teamId`
  `teamId: string;`
- ... and 2 more

#### types (1)

- Line 4: `Team`
  `import TeamProfile from './TeamProfile';`

#### comments (2)

- Line 136: `/* Team Profile Header - Fixed at top of scrollable area */`
  `{/* Team Profile Header - Fixed at top of scrollable area */}`
- Line 4: `'./TeamProfile'`
  `import TeamProfile from './TeamProfile';`

### src/hooks/useChatSession.ts

- **Total references**: 10
- **Line count**: 168
- **Has organization refs**: No

#### simple (9)

- Line 22: `teamId`
  `export function useChatSession(teamId: string): ChatSessionState {`
- Line 22: `teamId`
  `export function useChatSession(teamId: string): ChatSessionState {`
- Line 22: `teamId`
  `export function useChatSession(teamId: string): ChatSessionState {`
- Line 22: `teamId`
  `export function useChatSession(teamId: string): ChatSessionState {`
- Line 22: `teamId`
  `export function useChatSession(teamId: string): ChatSessionState {`
- ... and 4 more

#### comments (1)

- Line 36: ``${STORAGE_PREFIX}${teamId}``
  `return teamId ? `${STORAGE_PREFIX}${teamId}` : null;`

### worker/middleware/businessScopeValidator.ts

- **Total references**: 9
- **Line count**: 187
- **Has organization refs**: No

#### types (6)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- ... and 1 more

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (2)

- Line 47: `// If team`
  `// If team offers General Consultation, allow most requests`
- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### worker/routes/pdf.ts

- **Total references**: 9
- **Line count**: 190
- **Has organization refs**: No

#### simple (7)

- Line 13: `teamId`
  `teamId?: string;`
- Line 13: `teamId`
  `teamId?: string;`
- Line 13: `teamId`
  `teamId?: string;`
- Line 13: `teamId`
  `teamId?: string;`
- Line 13: `teamId`
  `teamId?: string;`
- ... and 2 more

#### comments (2)

- Line 61: `// Get session and team`
  `// Get session and team context if provided`
- Line 127: `'Missing session ID or team ID'`
  `throw HttpErrors.badRequest('Missing session ID or team ID');`

### src/utils/forms.ts

- **Total references**: 9
- **Line count**: 107
- **Has organization refs**: No

#### simple (6)

- Line 7: `teamId`
  `export function formatFormData(formData: Record<string, unknown>, teamId: string) {`
- Line 7: `teamId`
  `export function formatFormData(formData: Record<string, unknown>, teamId: string) {`
- Line 7: `teamId`
  `export function formatFormData(formData: Record<string, unknown>, teamId: string) {`
- Line 7: `teamId`
  `export function formatFormData(formData: Record<string, unknown>, teamId: string) {`
- Line 7: `teamId`
  `export function formatFormData(formData: Record<string, unknown>, teamId: string) {`
- ... and 1 more

#### comments (3)

- Line 41: `// Fetch team`
  `// Fetch team configuration to check payment requirements`
- Line 74: ``Thank you for choosing ${teamConfig.name}!``
  ``Thank you for choosing ${teamConfig.name}!`;`
- Line 3: `'/api/teams'`
  `const getTeamsEndpoint = () => '/api/teams';`

### tests/integration/api/blawby-api.test.ts

- **Total references**: 9
- **Line count**: 409
- **Has organization refs**: No

#### simple (2)

- Line 188: `team_id`
  `team_id: testContext.teamUlid,`
- Line 188: `team_id`
  `team_id: testContext.teamUlid,`

#### types (2)

- Line 44: `Team`
  `console.log(`   Team ULID: ${testContext.teamUlid}`);`
- Line 44: `Team`
  `console.log(`   Team ULID: ${testContext.teamUlid}`);`

#### database (2)

- Line 188: `team_id`
  `team_id: testContext.teamUlid,`
- Line 188: `team_id`
  `team_id: testContext.teamUlid,`

#### comments (3)

- Line 51: `// Fetch non-sensitive team`
  `// Fetch non-sensitive team metadata from API (credentials are redacted server-side)`
- Line 44: ``   Team ULID: ${testContext.teamUlid}``
  `console.log(`   Team ULID: ${testContext.teamUlid}`);`
- Line 48: `'   Set BLAWBY_API_TOKEN and BLAWBY_TEAM_ULID for real API testing'`
  `console.warn('   Set BLAWBY_API_TOKEN and BLAWBY_TEAM_ULID for real API testing');`

### tests/integration/api/case-creation.test.ts

- **Total references**: 9
- **Line count**: 246
- **Has organization refs**: No

#### simple (7)

- Line 30: `teamId`
  `teamId: 'north-carolina-legal-services',`
- Line 30: `teamId`
  `teamId: 'north-carolina-legal-services',`
- Line 30: `teamId`
  `teamId: 'north-carolina-legal-services',`
- Line 30: `teamId`
  `teamId: 'north-carolina-legal-services',`
- Line 30: `teamId`
  `teamId: 'north-carolina-legal-services',`
- ... and 2 more

#### types (1)

- Line 206: `Team`
  `json: () => Promise.resolve({ error: 'Team not found' }),`

#### comments (1)

- Line 202: `'should handle invalid team ID'`
  `it('should handle invalid team ID', async () => {`

### tests/integration/api/file-upload.test.ts

- **Total references**: 9
- **Line count**: 215
- **Has organization refs**: No

#### simple (7)

- Line 28: `teamId`
  `formData.append('teamId', 'demo');`
- Line 28: `teamId`
  `formData.append('teamId', 'demo');`
- Line 28: `teamId`
  `formData.append('teamId', 'demo');`
- Line 28: `teamId`
  `formData.append('teamId', 'demo');`
- Line 28: `teamId`
  `formData.append('teamId', 'demo');`
- ... and 2 more

#### comments (2)

- Line 205: `// No team`
  `// No teamId`
- Line 28: `'teamId', 'demo'`
  `formData.append('teamId', 'demo');`

### worker/middleware/contentPolicyFilter.ts

- **Total references**: 8
- **Line count**: 259
- **Has organization refs**: No

#### simple (2)

- Line 85: `teamId`
  `teamId: context.teamId,`
- Line 85: `teamId`
  `teamId: context.teamId,`

#### types (3)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (2)

- Line 69: `// Note: team`
  `// Note: teamConfig parameter is currently unused but kept for interface compatibility`
- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### worker/middleware/conversationContextManager.ts

- **Total references**: 8
- **Line count**: 598
- **Has organization refs**: No

#### simple (7)

- Line 62: `teamId`
  `teamId: string;`
- Line 62: `teamId`
  `teamId: string;`
- Line 62: `teamId`
  `teamId: string;`
- Line 62: `teamId`
  `teamId: string;`
- Line 62: `teamId`
  `teamId: string;`
- ... and 2 more

#### comments (1)

- Line 140: ``${this.KV_PREFIX}${sessionId}:${teamId}``
  `const key = `${this.KV_PREFIX}${sessionId}:${teamId}`;`

### worker/services/PaymentServiceFactory.ts

- **Total references**: 8
- **Line count**: 87
- **Has organization refs**: No

#### simple (1)

- Line 19: `teamId`
  `teamId: string;`

#### types (5)

- Line 4: `TeamService`
  `import type { Team } from './TeamService.js';`
- Line 4: `Team`
  `import type { Team } from './TeamService.js';`
- Line 4: `Team`
  `import type { Team } from './TeamService.js';`
- Line 4: `Team`
  `import type { Team } from './TeamService.js';`
- Line 4: `Team`
  `import type { Team } from './TeamService.js';`

#### imports (1)

- Line 4: `import type { Team } from './TeamService`
  `import type { Team } from './TeamService.js';`

#### comments (1)

- Line 4: `'./TeamService.js'`
  `import type { Team } from './TeamService.js';`

### migrations/add_better_auth_organization.sql

- **Total references**: 8
- **Line count**: 52
- **Has organization refs**: ⚠️ Yes

#### simple (3)

- Line 40: `team_id`
  `team_id TEXT NOT NULL, -- references teams.id`
- Line 40: `team_id`
  `team_id TEXT NOT NULL, -- references teams.id`
- Line 40: `team_id`
  `team_id TEXT NOT NULL, -- references teams.id`

#### types (1)

- Line 36: `Team`
  `-- Client-Team relationships (clients interacting with teams)`

#### database (4)

- Line 40: `team_id`
  `team_id TEXT NOT NULL, -- references teams.id`
- Line 40: `team_id`
  `team_id TEXT NOT NULL, -- references teams.id`
- Line 40: `team_id`
  `team_id TEXT NOT NULL, -- references teams.id`
- Line 40: `teams.`
  `team_id TEXT NOT NULL, -- references teams.id`

### worker/routes/review.ts

- **Total references**: 7
- **Line count**: 73
- **Has organization refs**: No

#### simple (5)

- Line 19: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 19: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 19: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 19: `teamId`
  `const teamId = url.searchParams.get('teamId');`
- Line 19: `teamId`
  `const teamId = url.searchParams.get('teamId');`

#### types (1)

- Line 22: `Team`
  `throw HttpErrors.badRequest('Team ID is required');`

#### comments (1)

- Line 19: `'teamId'`
  `const teamId = url.searchParams.get('teamId');`

### worker/services/NotificationService.ts

- **Total references**: 7
- **Line count**: 148
- **Has organization refs**: No

#### types (5)

- Line 3: `TeamService`
  `import type { Team } from './TeamService.js';`
- Line 3: `Team`
  `import type { Team } from './TeamService.js';`
- Line 3: `Team`
  `import type { Team } from './TeamService.js';`
- Line 3: `Team`
  `import type { Team } from './TeamService.js';`
- Line 3: `Team`
  `import type { Team } from './TeamService.js';`

#### imports (1)

- Line 3: `import type { Team } from './TeamService`
  `import type { Team } from './TeamService.js';`

#### comments (1)

- Line 3: `'./TeamService.js'`
  `import type { Team } from './TeamService.js';`

### src/services/upload/UploadTransport.ts

- **Total references**: 7
- **Line count**: 241
- **Has organization refs**: No

#### simple (5)

- Line 24: `teamId`
  `teamId: string;`
- Line 24: `teamId`
  `teamId: string;`
- Line 24: `teamId`
  `teamId: string;`
- Line 24: `teamId`
  `teamId: string;`
- Line 24: `teamId`
  `teamId: string;`

#### comments (2)

- Line 110: ``${teamId}/${sessionId}/${response.data.fileId}``
  `storageKey: response.data.storageKey || `${teamId}/${sessionId}/${response.data.fileId}``
- Line 176: `'teamId'`
  `formData.append('teamId', teamId);`

### migrations/add_payment_history.sql

- **Total references**: 7
- **Line count**: 40
- **Has organization refs**: No

#### simple (3)

- Line 8: `team_id`
  `team_id TEXT NOT NULL,`
- Line 8: `team_id`
  `team_id TEXT NOT NULL,`
- Line 8: `team_id`
  `team_id TEXT NOT NULL,`

#### database (4)

- Line 8: `team_id`
  `team_id TEXT NOT NULL,`
- Line 8: `team_id`
  `team_id TEXT NOT NULL,`
- Line 8: `team_id`
  `team_id TEXT NOT NULL,`
- Line 8: `team_id`
  `team_id TEXT NOT NULL,`

### migrations/add_team_api_tokens.sql

- **Total references**: 7
- **Line count**: 23
- **Has organization refs**: No

#### simple (3)

- Line 6: `team_id`
  `team_id TEXT NOT NULL,`
- Line 6: `team_id`
  `team_id TEXT NOT NULL,`
- Line 6: `team_id`
  `team_id TEXT NOT NULL,`

#### database (4)

- Line 6: `team_id`
  `team_id TEXT NOT NULL,`
- Line 6: `team_id`
  `team_id TEXT NOT NULL,`
- Line 6: `team_id`
  `team_id TEXT NOT NULL,`
- Line 6: `team_id`
  `team_id TEXT NOT NULL,`

### worker/middleware/pipeline.ts

- **Total references**: 6
- **Line count**: 109
- **Has organization refs**: No

#### types (4)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (1)

- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### worker/services/MockPaymentService.ts

- **Total references**: 6
- **Line count**: 98
- **Has organization refs**: No

#### simple (4)

- Line 13: `teamId`
  `console.log('💰 [MOCK] Creating invoice for payment request: teamId=', paymentRequest.teamId, 'sessionId=', paymentRequest.sessionId);`
- Line 13: `teamId`
  `console.log('💰 [MOCK] Creating invoice for payment request: teamId=', paymentRequest.teamId, 'sessionId=', paymentRequest.sessionId);`
- Line 13: `teamId`
  `console.log('💰 [MOCK] Creating invoice for payment request: teamId=', paymentRequest.teamId, 'sessionId=', paymentRequest.sessionId);`
- Line 29: `team_id`
  `id, payment_id, team_id, customer_email, customer_name, customer_phone,`

#### database (1)

- Line 29: `team_id`
  `id, payment_id, team_id, customer_email, customer_name, customer_phone,`

#### comments (1)

- Line 13: `'💰 [MOCK] Creating invoice for payment request: teamId=', paymentRequest.teamId, 'sessionId='`
  `console.log('💰 [MOCK] Creating invoice for payment request: teamId=', paymentRequest.teamId, 'sessionId=', paymentRequest.sessionId);`

### src/components/MatterProgress.tsx

- **Total references**: 6
- **Line count**: 269
- **Has organization refs**: No

#### simple (5)

- Line 23: `teamId`
  `teamId: string;`
- Line 23: `teamId`
  `teamId: string;`
- Line 23: `teamId`
  `teamId: string;`
- Line 23: `teamId`
  `teamId: string;`
- Line 23: `teamId`
  `teamId: string;`

#### comments (1)

- Line 47: ``/api/paralegal/${teamId}/${matterId}/status``
  `const response = await fetch(`/api/paralegal/${teamId}/${matterId}/status`, {`

### tests/integration/api/payment.test.ts

- **Total references**: 6
- **Line count**: 174
- **Has organization refs**: No

#### simple (3)

- Line 76: `teamId`
  `teamId: apiCredentials.teamUlid || 'blawby-ai',`
- Line 76: `teamId`
  `teamId: apiCredentials.teamUlid || 'blawby-ai',`
- Line 76: `teamId`
  `teamId: apiCredentials.teamUlid || 'blawby-ai',`

#### types (1)

- Line 28: `Team`
  `console.log(`   Team ULID: ${apiCredentials.teamUlid}`);`

#### comments (2)

- Line 28: ``   Team ULID: ${apiCredentials.teamUlid}``
  `console.log(`   Team ULID: ${apiCredentials.teamUlid}`);`
- Line 24: `'string' && teamUlid.trim() !== ''`
  `teamUlid && typeof teamUlid === 'string' && teamUlid.trim() !== ''`

### worker/middleware/documentChecklistMiddleware.ts

- **Total references**: 5
- **Line count**: 284
- **Has organization refs**: No

#### types (3)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (1)

- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### worker/middleware/jurisdictionValidator.ts

- **Total references**: 5
- **Line count**: 90
- **Has organization refs**: No

#### types (3)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (1)

- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### worker/middleware/pdfGenerationMiddleware.ts

- **Total references**: 5
- **Line count**: 156
- **Has organization refs**: No

#### types (3)

- Line 2: `TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### imports (1)

- Line 2: `import type { TeamConfig } from '../services/TeamService`
  `import type { TeamConfig } from '../services/TeamService.js';`

#### comments (1)

- Line 2: `'../services/TeamService.js'`
  `import type { TeamConfig } from '../services/TeamService.js';`

### src/components/ChatContainer.tsx

- **Total references**: 5
- **Line count**: 177
- **Has organization refs**: No

#### simple (5)

- Line 18: `teamId`
  `teamId: string;`
- Line 18: `teamId`
  `teamId: string;`
- Line 18: `teamId`
  `teamId: string;`
- Line 18: `teamId`
  `teamId: string;`
- Line 18: `teamId`
  `teamId: string;`

### src/components/SEOHead.tsx

- **Total references**: 5
- **Line count**: 80
- **Has organization refs**: No

#### types (2)

- Line 2: `TeamConfig`
  `import { TeamConfig } from '../../worker/types';`
- Line 2: `TeamConfig`
  `import { TeamConfig } from '../../worker/types';`

#### comments (3)

- Line 53: `//ai.blawby.com/team`
  `(teamConfig?.profileImage || 'https://ai.blawby.com/team-profile-demo.png'));`
- Line 23: ``${teamConfig.name} - AI Legal Assistant``
  `(teamConfig?.name ? `${teamConfig.name} - AI Legal Assistant` : 'Blawby AI - Intelligent Legal Assistant & Chat Interface');`
- Line 53: `'https://ai.blawby.com/team-profile-demo.png'`
  `(teamConfig?.profileImage || 'https://ai.blawby.com/team-profile-demo.png'));`

### src/components/TeamNotFound.tsx

- **Total references**: 5
- **Line count**: 52
- **Has organization refs**: No

#### simple (3)

- Line 5: `teamId`
  `teamId: string;`
- Line 5: `teamId`
  `teamId: string;`
- Line 5: `teamId`
  `teamId: string;`

#### types (1)

- Line 4: `Team`
  `interface TeamNotFoundProps {`

#### comments (1)

- Line 17: `"<strong className="font-semibold">{teamId}</strong>"`
  `We couldn't find the team "<strong className="font-semibold">{teamId}</strong>".`

### worker/services/SessionMigrationService.ts

- **Total references**: 4
- **Line count**: 59
- **Has organization refs**: No

#### simple (2)

- Line 27: `team_id`
  `JOIN conversations c ON c.team_id = m.team_id`
- Line 27: `team_id`
  `JOIN conversations c ON c.team_id = m.team_id`

#### database (2)

- Line 27: `team_id`
  `JOIN conversations c ON c.team_id = m.team_id`
- Line 27: `team_id`
  `JOIN conversations c ON c.team_id = m.team_id`

### src/components/settings/hooks/useUserProfile.ts

- **Total references**: 4
- **Line count**: 288
- **Has organization refs**: No

#### simple (4)

- Line 13: `teamId`
  `teamId?: string | null;`
- Line 13: `teamId`
  `teamId?: string | null;`
- Line 13: `teamId`
  `teamId?: string | null;`
- Line 13: `teamId`
  `teamId?: string | null;`

### src/utils/mockPricingData.ts

- **Total references**: 4
- **Line count**: 412
- **Has organization refs**: No

#### types (3)

- Line 114: `Team`
  `name: 'Team Collaboration',`
- Line 114: `Team`
  `name: 'Team Collaboration',`
- Line 114: `Team`
  `name: 'Team Collaboration',`

#### comments (1)

- Line 114: `'Team Collaboration'`
  `name: 'Team Collaboration',`

### tests/integration/api/chat.test.ts

- **Total references**: 4
- **Line count**: 125
- **Has organization refs**: No

#### simple (2)

- Line 28: `teamId`
  `teamId: 'demo',`
- Line 28: `teamId`
  `teamId: 'demo',`

#### types (1)

- Line 84: `Team`
  `describe('Teams Management', () => {`

#### comments (1)

- Line 84: `'Teams Management'`
  `describe('Teams Management', () => {`

### worker/schemas/payment.ts

- **Total references**: 3
- **Line count**: 97
- **Has organization refs**: No

#### simple (2)

- Line 16: `teamId`
  `teamId: string;`
- Line 61: `team_id`
  `team_id?: string;`

#### database (1)

- Line 61: `team_id`
  `team_id?: string;`

### src/components/ActivityTimeline.tsx

- **Total references**: 3
- **Line count**: 181
- **Has organization refs**: No

#### simple (3)

- Line 21: `teamId`
  `teamId?: string;`
- Line 21: `teamId`
  `teamId?: string;`
- Line 21: `teamId`
  `teamId?: string;`

### src/components/FeedbackUI.tsx

- **Total references**: 3
- **Line count**: 197
- **Has organization refs**: No

#### simple (3)

- Line 10: `teamId`
  `teamId?: string;`
- Line 10: `teamId`
  `teamId?: string;`
- Line 10: `teamId`
  `teamId?: string;`

### src/components/Message.tsx

- **Total references**: 3
- **Line count**: 469
- **Has organization refs**: No

#### simple (3)

- Line 90: `teamId`
  `teamId: string;`
- Line 90: `teamId`
  `teamId: string;`
- Line 90: `teamId`
  `teamId: string;`

### src/utils/conversationalForm.ts

- **Total references**: 3
- **Line count**: 146
- **Has organization refs**: No

#### simple (2)

- Line 138: `teamId`
  `export function formatFormData(formData: FormData, teamId: string, conversationId?: string) {`
- Line 138: `teamId`
  `export function formatFormData(formData: FormData, teamId: string, conversationId?: string) {`

#### comments (1)

- Line 84: ``Perfect! I have your phone: ${extractedInfo.phone}. I have all your contact information now. Let me update your matter summary with your contact details and submit everything to our legal team.``
  `response = `Perfect! I have your phone: ${extractedInfo.phone}. I have all your contact information now. Let me update your matter summary with your contact details and submit everything to our legal team.`;`

### worker/middleware/caseDraftMiddleware.ts

- **Total references**: 2
- **Line count**: 182
- **Has organization refs**: No

#### types (2)

- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../agents/legal-intake/promptTemplates.js';`
- Line 2: `TeamConfig`
  `import type { TeamConfig } from '../agents/legal-intake/promptTemplates.js';`

### worker/types/events.ts

- **Total references**: 2
- **Line count**: 23
- **Has organization refs**: No

#### simple (2)

- Line 5: `teamId`
  `teamId: string;`
- Line 5: `teamId`
  `teamId: string;`

### worker/utils/fileAnalysisUtils.ts

- **Total references**: 2
- **Line count**: 224
- **Has organization refs**: No

#### comments (2)

- Line 119: `// Format: team`
  `// Format: team-slug-uuid-timestamp-random`
- Line 148: ``uploads/${teamSlug}/${sessionId}/${fileId}``
  `const prefix = `uploads/${teamSlug}/${sessionId}/${fileId}`;`

### worker/utils/logger.ts

- **Total references**: 2
- **Line count**: 138
- **Has organization refs**: No

#### types (1)

- Line 66: `Team`
  `static logTeamConfig(team: Record<string, unknown>, includeConfig: boolean = false): void {`

#### comments (1)

- Line 68: `'logTeamConfig called with null/undefined team'`
  `this.warn('logTeamConfig called with null/undefined team');`

### src/config/api.ts

- **Total references**: 2
- **Line count**: 54
- **Has organization refs**: No

#### comments (2)

- Line 43: ``${config.baseUrl}${config.teamsEndpoint}``
  `return `${config.baseUrl}${config.teamsEndpoint}`;`
- Line 9: `'/api/teams'`
  `teamsEndpoint: '/api/teams',`

### worker/agents/legal-intake/errors.ts

- **Total references**: 1
- **Line count**: 271
- **Has organization refs**: No

#### comments (1)

- Line 110: `"I'm having trouble creating your matter. Please try again or contact our support team for assistance."`
  `return "I'm having trouble creating your matter. Please try again or contact our support team for assistance.";`

### worker/index.ts

- **Total references**: 1
- **Line count**: 144
- **Has organization refs**: No

#### comments (1)

- Line 78: `'/api/teams'`
  `} else if (path.startsWith('/api/teams')) {`

### worker/routes/index.ts

- **Total references**: 1
- **Line count**: 16
- **Has organization refs**: No

#### comments (1)

- Line 5: `'./teams'`
  `export { handleTeams } from './teams';`

### worker/schemas/jurisdictionConfig.ts

- **Total references**: 1
- **Line count**: 235
- **Has organization refs**: No

#### comments (1)

- Line 203: ``I notice you're located in ${userLocation}. ${teamName} primarily serves clients in ${config.description}.``
  `const baseMessage = `I notice you're located in ${userLocation}. ${teamName} primarily serves clients in ${config.description}.`;`

### worker/services/PDFGenerationService.ts

- **Total references**: 1
- **Line count**: 652
- **Has organization refs**: No

#### comments (1)

- Line 579: ``Generated by ${content.teamName || 'Legal Services'}``
  `addText(`Generated by ${content.teamName || 'Legal Services'}`, font, 10, rgb(0.4, 0.4, 0.4));`

### worker/utils/messageTemplates.ts

- **Total references**: 1
- **Line count**: 168
- **Has organization refs**: No

#### comments (1)

- Line 104: ``I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.``
  `return `I'll submit this to our legal team for review. A lawyer will contact you within 24 hours to discuss your case.`;`

### src/components/LeftSidebar.tsx

- **Total references**: 1
- **Line count**: 198
- **Has organization refs**: No

#### simple (1)

- Line 22: `teamId`
  `teamId: string;`

### src/components/UserProfile.tsx

- **Total references**: 1
- **Line count**: 329
- **Has organization refs**: No

#### simple (1)

- Line 16: `teamId`
  `teamId?: string | null;`

### src/components/settings/hooks/useSettingsNavigation.ts

- **Total references**: 1
- **Line count**: 92
- **Has organization refs**: No

#### comments (1)

- Line 47: `'/settings/team'`
  `navigateToSettings('/settings/team');`

### migrations/add_ai_provider_defaults.sql

- **Total references**: 1
- **Line count**: 23
- **Has organization refs**: No

#### database (1)

- Line 2: `UPDATE teams`
  `UPDATE teams`

### migrations/add_nc_legal_jurisdiction.sql

- **Total references**: 1
- **Line count**: 17
- **Has organization refs**: No

#### database (1)

- Line 4: `UPDATE teams`
  `UPDATE teams`

### migrations/update_blawby_ai_services.sql

- **Total references**: 1
- **Line count**: 76
- **Has organization refs**: No

#### database (1)

- Line 4: `UPDATE teams`
  `UPDATE teams`

