# AI Model Switch Plan

## 1. Objectives
- Deliver premium legal-intake conversations with higher quality tool usage, leveraging Cloudflare Workers AI hosted models that support function calling.
- Minimize regression risk by benchmarking current llama behaviour and gating rollout with telemetry and guardrails.
- Preserve or improve existing developer experience (configuration, observability, testing).

## 2. Current State Assessment
- Identify every touchpoint that references llama models:
  - Runtime defaults in the Worker (`worker/services/AIService.ts`, `worker/services/TeamService.ts`, `worker/agents/legal-intake/index.ts`) hardcode `aiModel: 'llama'` and `@cf/meta/llama-3.1-8b-instruct`.
  - Document analysis flows (`worker/routes/analyze.ts`, `worker/consumers/doc-processor.ts`) reuse the same llama model, mixing in vision endpoints.
  - Database/bootstrap paths (`worker/routes/files.ts`, `migrations/00000000_base_schema.sql`) and tests/fixtures (`tests/integration/**/*.ts`, `README.md` examples) persist llama in stored JSON.
  - Front-end orchestration consumes whatever the Worker emits but assumes tool-capable responses; no client-side llama coupling was found.
- Catalogue current tool-calling shims and adapters created to compensate for llama limitations (legal-intake agent streaming/tool executor, validation layers, prompt builders).
- Note telemetry/logging endpoints that rely on llama-specific response shapes (LegalIntakeLogger, ToolUsageMonitor, AIService logging).
- Establish the present behaviour baseline by running `./test-conversation-flow.sh` (ensure dependencies/env vars are set; capture output + logs for comparison).

## 3. Target Model Selection & Configuration
- Adopt Cloudflare Workers AI `@cf/openai/gpt-oss-20b` as the default conversational model, but lead every intake with contact-form collection (AI only follows up when the form is incomplete, and paralegal tooling enriches the matter afterward).
- Keep `@cf/meta/gpt-oss-120b-instruct` as an optional escalation path for high-complexity matters, but exclude it from the initial rollout.
- Define environment variables for routing (e.g., `AI_PROVIDER=workers-ai`, `AI_MODEL=@cf/openai/gpt-oss-20b`) and document operational guardrails (latency, cost ceilings, tool success targets).
- Treat AI Gateway + external OpenAI models as a future fallback: design adapter hooks now, but defer provisioning gateway credentials until we prove a gap that Workers AI cannot fill.

## 4. Greenfield Refactor Strategy
- Design the future-facing chat orchestration around provider adapters, with Workers AI as the primary implementation and optional gateways behind feature flags.
  - Simplify payload builders to use standard `functions` / `tool_choice` fields that Workers AI supports; avoid llama-only hacks.
  - Normalize response parsing helpers to consume `tool_calls` arrays and shared usage metadata regardless of provider.
- Revisit prompt templates and system instructions to leverage improved tool compliance while capturing legal-intake guardrails.
- Abstract the transport layer so swapping between Workers AI, AI Gateway (OpenAI), or legacy llama requires configuration-only changes.

## 5. Implementation Phases
1. **Preparation**
   - Create provider/model feature flags that propagate through `TeamService` defaults, `AIService.runLLM`, and the legal-intake agent (including document analysis flows).
   - Introduce configuration adapters that translate generic chat requests into provider-specific payloads; capture provider selection in team config while supporting overrides.
2. **Core Refactor**
   - Implement Workers-AI-first request builder and response parser, refactoring the tool executor to consume OpenAI-style tool-call schema directly.
   - Update tool registry + dispatcher so the contact form is offered first (required fields enforced) and AI only continues the conversation when the form fails or needs clarification.
   - Adjust error handling, retries, and streaming to match Workers AI semantics (chunk format, finish reasons, tool error surfaces) while preserving graceful fallbacks to legacy llama.
3. **Integration**
   - Wire new abstractions into chat UI, backend handlers, and background jobs; ensure paralegal automation only runs **after** a matter is created so it can enrich collected data.
   - Maintain llama path behind conditional flags until confidence is established; add migration utilities to backfill stored team configs.
4. **Cleanup**
   - Remove deprecated llama-specific helpers once rollout is stable.
   - Update documentation, runbooks, and onboarding guides.

## 6. Tooling & Observability Enhancements
- Instrument logs to capture provider/model, tool-call success, latency, and failure modes.
- Extend analytics dashboards/alerts to detect regressions in conversation quality or tool execution.
- Ensure legal guardrails (redaction, escalation triggers) function under the new model responses, and capture events when paralegal enrichment runs post-matter creation.

## 7. Testing Strategy
### 7.1 Before Refactor
- Run `./test-conversation-flow.sh` to capture baseline transcripts, timing, and tool usage behaviour (script currently assumes llama and localhost Worker).
- Export representative conversation transcripts from production/staging for manual review.
- Document known llama quirks to verify they are resolved or unchanged post-migration.

### 7.2 During Refactor
- Add unit tests around new request/response translators and tool dispatcher.
- Create integration tests that simulate function-calling with mocked Workers AI responses, ensuring fallback logic works.
- Parameterize `test-conversation-flow.sh` (or create `test-conversation-flow-workers-ai.sh`) to accept provider/model/env arguments so both llama and Workers AI paths can be validated in CI, and assert that no raw `TOOL_CALL` strings leak into user-visible transcripts.

### 7.3 After Refactor
- Re-run conversation flow script for both providers; compare transcripts + metrics against baseline (workers AI run on `@cf/openai/gpt-oss-20b` completed successfully, all 22 scenarios pass, and contact-form-first behaviour is enforced).
- Conduct targeted manual QA for premium legal prompts, including edge cases (unknown jurisdiction, incomplete data, tool failure).
- Monitor staging with real traffic under feature flag; validate telemetry and guardrails.

## 8. Rollout & Monitoring
- Deploy new code behind feature flag; enable for internal users first.
- Gradually increase traffic share while monitoring latency, tool success rate, and legal-safety escalations.
- Establish rollback triggers (error thresholds, guardrail breaches) and confirm fallback to llama path works.

## 9. Risks & Mitigations
- **Tool Behaviour Changes**: Mitigate with extensive integration tests and staged rollout.
- **Latency/Cost Spikes**: Benchmark `@cf/meta/gpt-oss-20b` under load; retain optional escalation to `@cf/meta/gpt-oss-120b-instruct` or Gateway if quality gaps persist.
- **API Contract Drift**: Wrap provider interaction in versioned adapter; monitor Cloudflare announcements for changes.
- **Testing Coverage Gaps**: Expand automated tooling, ensure `test-conversation-flow.sh` (or its successor) runs in CI for both configurations.

## 10. Success Metrics
- **Tool Execution Accuracy**: ≥90% of automated tool calls (contact form, payment initiation, matter creation, email dispatch, document processing) produce valid payloads without manual correction during staged rollout.
- **Conversation Quality**: ≥85% of guided intake conversations reach the correct next action (continue questions vs contact form vs payment) as judged by QA transcripts.
- **Contact Capture Completeness**: For scenarios targeting contact forms, ≥95% include name, email, and phone fields populated from either user input or follow-up prompts.
- **Contact-First Compliance**: 100% of qualified or urgent scenarios trigger the contact form before additional model-generated text (verified via automated tests).
- **Matter Creation Reliability**: 0 critical incidents where placeholder data or missing fields trigger downstream matter creation or email workflows.
- **Latency Guardrail**: P95 streaming response time ≤6s for standard prompts; alerts fire if P95 exceeds 8s.
- **Cost Guardrail**: Monthly Workers AI consumption remains within available Cloudflare credits (track in billing dashboard; alert at 80% credit utilization).
  - **Token Usage Instrumentation**: Instrument `AIService.runChat()` to capture and log token counts per request from provider response metadata (`usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`). Include provider/model, teamId, request timestamp, and cost attribution context in structured logs.
  - **Daily Aggregation Pipeline**: Implement a scheduled Worker (daily cron) that aggregates usage logs by provider/model/team into Cloudflare Analytics Engine or D1 analytics table. Calculate daily costs using published Workers AI pricing (e.g., `@cf/meta/gpt-oss-20b` at $0.0001/1K input tokens, $0.0001/1K output tokens). Store aggregated metrics with date, provider, model, team, total_tokens, estimated_cost.
  - **Dashboard Metrics**: Create Cloudflare Analytics dashboard showing daily cost trends, cost per team (top 10 consumers), cost per provider/model breakdown, and monthly credit utilization percentage. Include cost-per-conversation and cost-per-tool-call metrics for operational insights.
  - **Alerting Flow**: Deploy a dedicated billing webhook Worker that receives Cloudflare billing events and computes current credit utilization. When utilization reaches 80%, trigger alerts via email/Slack to operations team with breakdown by team and provider. Include 7-day cost projection based on current burn rate.
  - **Cost Attribution Model**: Use shared pool model initially (all teams consume from single Cloudflare credit allocation) with per-team usage tracking for future billing separation. Log team-level usage for potential per-team budget enforcement in future phases.

## 11. Documentation & Follow-Up
- Update README/config docs with new environment variables and testing commands.
- Share migration notes and troubleshooting tips with the team.
- Schedule post-rollout review to evaluate model performance, tool improvements, and remaining backlog items.

## 12. Immediate Next Steps
1. Draft provider/model configuration design (env vars, feature flags, schema changes) tracing impacts across Worker services, tests, and migrations.
2. Prototype updates to `test-conversation-flow.sh` to accept provider/model parameters and capture transcripts for baseline comparison.
3. Prepare data-migration approach for existing team configs and seeds to support dual-provider rollout without breaking current deployments.

## 13. Provider/Model Configuration Design (Draft)
- **Environment Contract**
  - `AI_PROVIDER_DEFAULT`: global baseline provider (`workers-ai`, `gateway-openai`, `legacy-llama`).
  - `AI_MODEL_DEFAULT`: default model slug (e.g., `@cf/meta/gpt-oss-20b`).
  - `AI_MODEL_FALLBACK`: optional comma-separated list for cascading fallbacks (e.g., `@cf/meta/llama-3.1-8b-instruct`, `@cf/meta/gpt-oss-120b-instruct`).
  - `AI_GATEWAY_BASE_URL`, `AI_GATEWAY_KEY`: optional variables activated only when Gateway/OpenAI is enabled.
  - Optional team-level overrides: extend team config with `aiProvider?: string`, `aiModel?: string`, `aiModelFallback?: string[]`.
- **Credential Management**
  - **Storage per Environment**:
    - **Development**: Local `.env` file with gitignored example template (`dev.vars.example`); never commit actual keys
    - **Staging/Production**: Platform-managed secret store (Cloudflare Workers secrets via `wrangler secret put`, or enterprise vault integration)
    - **CI/CD**: Environment-specific secrets injected via deployment pipeline
  - **Rotation Procedures**:
    - **Schedule**: Rotate API keys every 90 days or immediately upon compromise detection
    - **Process**: Documented steps for key generation, deployment, and old key revocation with zero-downtime rollover
    - **Automation**: Automated reminders 30 days before expiration; integration with existing monitoring/alerting
  - **Environment Isolation**:
    - Unique API keys per environment (dev/staging/prod) with no cross-environment reuse
    - Separate credential namespaces to prevent accidental cross-environment access
    - Environment-specific key naming convention (e.g., `AI_GATEWAY_KEY_DEV`, `AI_GATEWAY_KEY_STAGING`, `AI_GATEWAY_KEY_PROD`)
  - **Audit Logging**:
    - Record all credential access, issuance, rotation, and revocation events
    - Integrate with existing audit/logging system (LegalIntakeLogger, ToolUsageMonitor)
    - Log credential usage patterns for anomaly detection and compliance reporting
  - **Credential Matrix**:
    | Environment | Storage Mechanism | Owner | Rotation Schedule |
    |-------------|-------------------|-------|-------------------|
    | Development | Local `.env` | Developer | On-demand |
    | Staging | Wrangler secrets | DevOps | 90 days |
    | Production | Wrangler secrets | DevOps | 90 days |
    | CI/CD | Pipeline secrets | DevOps | 90 days |
- **Worker Runtime Adjustments**
  - `TeamService` default config reads env-driven provider/model; ensure migrations populate new fields while honoring legacy records.
  - `AIService` exposes `runChat({ messages, tools, stream, teamId })` that resolves provider/model via (team override → env default → fallback) and dispatches through provider adapters.
  - `Legal-intake agent` receives resolved provider context and delegates to adapter; tool execution remains provider-agnostic.
  - Document analysis (`routes/analyze`, `doc-processor`) reuse adapter to request text/vision models; allow per-task overrides (e.g., keep llava for vision).
- **Provider Adapter Layer**
  - Define interface: `{ streamChat(args): AsyncIterable<Chunk>; callChat(args): Promise<Response>; supportsTools: boolean; }`.
  - Implement `WorkersAIAdapter` (primary path), `LegacyLlamaAdapter`, and optional `GatewayOpenAIAdapter` behind feature flags.
  - Handle response normalization (tool calls, finish reasons, usage metrics) so rest of code stays consistent.
- **Feature Flagging**
  - Introduce `ENABLE_WORKERS_AI` (default true) and `ENABLE_GATEWAY_OPENAI` (default false) to control adapters; expose via environment + admin UI toggle.
  - Logging should include provider/model + flag status to simplify debugging.
- **Data Model & Migration**
  - Extend SQLite schema: add `ai_provider` column to `teams.config` JSON and to migrations; provide script to backfill existing rows with `{ aiProvider: 'legacy-llama', aiModel: '@cf/meta/llama-3.1-8b-instruct' }`.
  - Update seed fixtures and tests to include provider/model fields; maintain compatibility by defaulting to env when missing.
- **Testing Hooks**
  - Add env switch in `wrangler.toml`/local dev config to target Workers AI by default, with optional Gateway configuration for future scenarios.
  - Provide mock adapter for unit tests; integration tests can hit a stub server that mimics Workers AI responses.
- **Operational Considerations**
  - Centralize retry/backoff logic within adapter to respect provider-specific rate limits.
  - Capture per-provider usage metrics for cost monitoring.
  - Document procedure for rotating Workers AI credentials (if any) and enabling Gateway when required.

## 14. Pre-Migration Checklist

### 14.1 Database Backup & Safety Procedures
- **Create Full D1 Database Backup**
  - Execute `wrangler d1 backup create <database-name> --name "pre-ai-model-migration-$(date +%Y%m%d-%H%M%S)"` to create timestamped backup
  - Verify backup completion and download backup file to secure location
  - Document backup location, timestamp, and restoration procedure for rollback scenarios
  - Test backup restoration process in isolated environment to ensure data integrity

### 14.2 Staging Environment Validation
- **Clone Production to Staging**
  - Deploy current production codebase to staging environment with production data snapshot
  - Configure staging with identical environment variables and feature flags
  - Run migration scripts against staging database to validate schema changes
  - Execute full test suite including `./test-conversation-flow.sh` on staging environment
  - Monitor staging for 24-48 hours to identify any migration-related issues

### 14.3 Active Conversation Impact Assessment
- **Graceful Schema Transition Planning**
  - Identify active conversations and their current state in the database
  - Implement backward-compatible schema changes that don't break existing conversation flows
  - Design migration strategy that allows active conversations to complete without interruption
  - Schedule maintenance window if required, or implement zero-downtime migration approach
  - Create rollback plan that preserves conversation state during migration

### 14.4 Pre-Migration Verification Script
- **Dry-Run Detection Script**
  ```bash
  #!/bin/bash
  # pre-migration-verification.sh
  
  echo "🔍 Pre-Migration Verification Script"
  echo "====================================="
  
  # Check for teams with malformed config JSON
  echo "Checking team configurations..."
  wrangler d1 execute <database-name> --command "
    SELECT team_id, config 
    FROM teams 
    WHERE json_valid(config) = 0 
    OR config IS NULL 
    OR config = '';"
  
  # Identify teams with custom AI model configurations
  echo "Identifying teams with custom AI configurations..."
  wrangler d1 execute <database-name> --command "
    SELECT team_id, config 
    FROM teams 
    WHERE json_extract(config, '$.aiModel') IS NOT NULL 
    OR json_extract(config, '$.aiProvider') IS NOT NULL;"
  
  # Check for active conversations that might be affected
  echo "Checking for active conversations..."
  wrangler d1 execute <database-name> --command "
    SELECT COUNT(*) as active_conversations 
    FROM conversations 
    WHERE status = 'active' 
    AND created_at > datetime('now', '-24 hours');"
  
  # Validate migration script syntax
  echo "Validating migration script syntax..."
  wrangler d1 migrations list <database-name>
  
  echo "✅ Pre-migration verification complete"
  ```
- **Problematic Team Detection**
  - Run verification script against production database (read-only operations only)
  - Identify teams with malformed JSON configurations that could cause migration failures
  - Flag teams with custom AI model settings that may conflict with new defaults
  - Document any teams requiring manual intervention before migration
  - Create remediation plan for identified issues

### 14.5 Migration Readiness Confirmation
- **Final Pre-Migration Checklist**
  - [ ] Full database backup created and verified
  - [ ] Staging environment tested with production data
  - [ ] Migration scripts validated on staging
  - [ ] Active conversation impact assessed and mitigated
  - [ ] Verification script executed with no critical issues found
  - [ ] Rollback procedure documented and tested
  - [ ] Team notified of maintenance window (if required)
  - [ ] Monitoring and alerting configured for migration process
  - [ ] Post-migration validation plan prepared

## 15. Data Migration Approach (Draft)
- **Goals**
  - Introduce provider/model metadata without disrupting existing teams that implicitly rely on llama defaults.
  - Keep `dev.vars` / `wrangler.toml` focused on shared defaults; prefer Seeder scripts or admin tools for per-team overrides.
- **D1 Migration**
  - Create a new numbered migration that backfills `teams` records, wrapping existing JSON in `json_set` updates:
    ```sql
    UPDATE teams
    SET config = json_set(
      json_set(
        json_set(
          config,
          '$.aiProvider',
          COALESCE(json_extract(config, '$.aiProvider'), 'legacy-llama')
        ),
        '$.aiModel',
        COALESCE(json_extract(config, '$.aiModel'), '@cf/meta/llama-3.1-8b-instruct')
      ),
      '$.aiModelFallback',
      CASE
        WHEN json_type(config, '$.aiModelFallback') = 'array' THEN json_extract(config, '$.aiModelFallback')
        WHEN COALESCE(json_extract(config, '$.aiModel'), '@cf/meta/llama-3.1-8b-instruct') = '@cf/meta/llama-3.1-8b-instruct' THEN json('[]')
        ELSE json('["@cf/meta/llama-3.1-8b-instruct"]')
      END
    )
    WHERE json_type(config, '$.aiProvider') IS NULL
       OR json_type(config, '$.aiModel') IS NULL
       OR json_type(config, '$.aiModelFallback') IS NULL;
    ```
  - Apply the same transformation inside seed scripts so fresh environments start with explicit provider/model metadata.
- **Runtime Defaults**
  - Update `TeamService` fallback config to read `AI_PROVIDER_DEFAULT` / `AI_MODEL_DEFAULT`, but ensure these env vars ship only in `dev.vars.example` (developers opt-in locally) while production uses Wrangler secrets.
  - Maintain compatibility by treating missing env vars as legacy llama until rollout flips.
- **Verification**
  - Add a one-off admin script (or Wrangler d1 query) that lists teams lacking explicit provider/model after migration; run during deployment.
  - Extend integration tests (`tests/integration/api/teams.test.ts`, `tests/integration/services/TeamService.integration.test.ts`) to assert serialized configs include provider/model fields.
- **Rollback Plan**
  - Keep migration idempotent; a rollback just restores from backup or reruns previous defaults without removing new keys (harmless extra data).
  - Ensure feature flags (`ENABLE_WORKERS_AI`) can revert to llama even after data migration.
