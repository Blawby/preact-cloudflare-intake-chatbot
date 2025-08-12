# Paralegal Agent Deep Dive (Round 2)

```json
{
  "naming_decisions": {
    "do_class_name": "ParalegalAgent",
    "do_binding": "PARALEGAL_AGENT",
    "do_namespace": "paralegal",
    "route_pattern": "/api/paralegal/:teamId/:matterId",
    "evidence": [
      {"path":"wrangler.toml","lines":"1-12","snippet":"name = \"blawby-ai-chatbot\"\nmain = \"worker/index.ts\"\ncompatibility_date = \"2024-12-01\"\n[ai]\nbinding = \"AI\"\n[[ai.models]] (no Durable Objects present)"},
      {"path":"worker/routes/agent.ts","lines":"79-83","snippet":"response = await handleAgent(request, env, CORS_HEADERS); // intake today"}
    ]
  },
  "wrangler_changes": {
    "has_do_binding": false,
    "needs_queue_binding": ["paralegal-tasks"],
    "compatibility_date_ok": true,
    "example_diff": "*** Begin Patch\n*** Update File: wrangler.toml\n@@\n [queues]\n DOC_EVENTS = { name = \"doc-events\" }\n+\n+[[durable_objects.bindings]]\n+name = \"PARALEGAL_AGENT\"\n+class_name = \"ParalegalAgent\"\n+\n+[queues]\n+DOC_EVENTS = { name = \"doc-events\" }\n+PARALEGAL_TASKS = { name = \"paralegal-tasks\" }\n*** End Patch",
    "insert_locations": [
      {"path":"wrangler.toml","line":49},
      {"path":"wrangler.toml","line":51}
    ],
    "evidence": [
      {"path":"wrangler.toml","lines":"48-51","snippet":"[queues]\nDOC_EVENTS = { name = \"doc-events\" }"},
      {"path":"wrangler.toml","lines":"1-5","snippet":"compatibility_date = \"2024-12-01\""}
    ]
  },
  "supervisor_router": {
    "best_file_for_router": "worker/routes/agent.ts",
    "why_here": "All chat flows enter here; minimal change to intercept intent and handoff.",
    "intent_rules": ["matter formation", "doc analysis", "general chat"],
    "handoff_api": {
      "to_paralegal": "DO stub fetch",
      "to_analysis": "DOC_EVENTS queue message",
      "to_intake": "current handler runLegalIntakeAgent"
    },
    "insert_points": [{"path":"worker/routes/agent.ts","line":79}],
    "example_diff": "*** Begin Patch\n*** Update File: worker/routes/agent.ts\n@@\n-import { runLegalIntakeAgent, runLegalIntakeAgentStream } from '../agents/legalIntakeAgent';\n+import { runLegalIntakeAgent, runLegalIntakeAgentStream } from '../agents/legalIntakeAgent';\n+class SupervisorRouter {\n+  constructor(private env: Env) {}\n+  async route(body: any) {\n+    const text = (body.messages?.at(-1)?.content || '').toLowerCase();\n+    if (/\\b(matter|engagement|conflict|retainer|checklist)\\b/.test(text)) return 'paralegal';\n+    if ((body.attachments?.length || 0) > 0 || /analy(z|s)e document|pdf|ocr/.test(text)) return 'analysis';\n+    return 'intake';\n+  }\n+}\n@@\n-    // Run the legal intake agent directly\n-    const agentResponse = await runLegalIntakeAgent(env, messages, teamId, sessionId, cloudflareLocation, attachments);\n-    return createSuccessResponse(agentResponse, corsHeaders);\n+    const router = new SupervisorRouter(env);\n+    const route = await router.route(body);\n+    if (route === 'paralegal') {\n+      const id = env.PARALEGAL_AGENT.idFromName(`${teamId}:${sessionId || 'session'}`);\n+      const stub = env.PARALEGAL_AGENT.get(id);\n+      const res = await stub.fetch(`https://do.local/paralegal/${teamId}/${sessionId}/advance`, { method: 'POST', body: JSON.stringify({ event: 'user_input', body })});\n+      const data = await res.json();\n+      return createSuccessResponse(data, corsHeaders);\n+    } else if (route === 'analysis') {\n+      const agentResponse = await runLegalIntakeAgent(env, messages, teamId, sessionId, cloudflareLocation, attachments);\n+      return createSuccessResponse(agentResponse, corsHeaders);\n+    }\n+    const agentResponse = await runLegalIntakeAgent(env, messages, teamId, sessionId, cloudflareLocation, attachments);\n+    return createSuccessResponse(agentResponse, corsHeaders);\n*** End Patch",
    "evidence": [
      {"path":"worker/routes/agent.ts","lines":"79-83","snippet":"response = await handleAgent(request, env, CORS_HEADERS); // intake today"},
      {"path":"worker/routes/agent.ts","lines":"154-171","snippet":"ReadableStream SSE path exists (streaming endpoint)"}
    ]
  },
  "paralegal_do": {
    "state_storage": "both",
    "idempotency_strategy": "id key per transition",
    "api_surface": ["/advance", "/status", "/checklist"],
    "auth_check": "Verify teamId from URL exists in D1 teams; reject mismatches.",
    "sse_push": {
      "supported_today": false,
      "emit_from": "queue consumer",
      "event_shape": {"type":"paralegal.update","stage":"","matterId":""},
      "insert_points": [{"path":"worker/consumers/doc-processor.ts","line":58}]
    },
    "example_skeleton_diff": "*** Begin Patch\n*** Add File: worker/agents/ParalegalAgent.ts\n+import type { Env } from '../types';\n+type Stage = 'collect_parties'|'conflicts_check'|'documents_needed'|'fee_scope'|'engagement'|'filing_prep'|'completed';\n+export class ParalegalAgent {\n+  constructor(private state: DurableObjectState, private env: Env) {}\n+  async fetch(request: Request) {\n+    const url = new URL(request.url);\n+    if (url.pathname.endsWith('/advance') && request.method === 'POST') return this.advance(request);\n+    if (url.pathname.endsWith('/status')) return this.status(request);\n+    if (url.pathname.endsWith('/checklist')) return this.checklist(request);\n+    return new Response('Not Found', { status: 404 });\n+  }\n+  private async getState() {\n+    const s = await this.state.storage.get<any>('state');\n+    return s ?? { stage: 'collect_parties' as Stage, checklist: [], createdAt: Date.now(), updatedAt: Date.now() };\n+  }\n+  private async putState(s: any) { s.updatedAt = Date.now(); await this.state.storage.put('state', s); }\n+  private async advance(request: Request) {\n+    const body = await request.json();\n+    const current = await this.getState();\n+    const idKey = body?.idempotencyKey;\n+    if (idKey) {\n+      const seen = await this.state.storage.get(`idem:${idKey}`);\n+      if (seen) return new Response(JSON.stringify({ ok: true, state: current, idempotent: true }), { headers: { 'Content-Type':'application/json' } });\n+      await this.state.storage.put(`idem:${idKey}`, 1, { expirationTtl: 3600 });\n+    }\n+    const next = { ...current };\n+    switch (current.stage as Stage) {\n+      case 'collect_parties': next.stage = 'conflicts_check'; break;\n+      case 'conflicts_check': next.stage = 'documents_needed'; break;\n+    }\n+    await this.putState(next);\n+    return new Response(JSON.stringify({ stage: next.stage, checklist: next.checklist, next_actions: [] }), { headers: { 'Content-Type': 'application/json' } });\n+  }\n+  private async status(_request: Request) {\n+    const s = await this.getState();\n+    return new Response(JSON.stringify(s), { headers: { 'Content-Type': 'application/json' } });\n+  }\n+  private async checklist(_request: Request) {\n+    const s = await this.getState();\n+    return new Response(JSON.stringify({ checklist: s.checklist ?? [] }), { headers: { 'Content-Type': 'application/json' } });\n+  }\n+}\n*** End Patch",
    "evidence": [
      {"path":"worker/schema.sql","lines":"112-142","snippet":"matters table present (canonical store); no paralegal stages"},
      {"path":"worker/types.ts","lines":"1-22","snippet":"Env includes AI, DB, CHAT_SESSIONS, FILES_BUCKET, DOC_EVENTS"},
      {"path":"worker/consumers/doc-processor.ts","lines":"44-56","snippet":"KV preview storage for analysis; candidate emit point"}
    ]
  },
  "db_migrations": {
    "dir": "migrations/",
    "files_to_add": ["add_paralegal_tables.sql", "add_indexes_paralegal.sql"],
    "tables": {
      "matter_formation_stages": "missing",
      "conflict_checks": "missing",
      "document_requirements": "missing",
      "engagement_letters": "missing",
      "audit_log": "missing"
    },
    "indexes": ["idx_matter_stage(matter_id, stage, status)", "idx_conflicts_party_name", "idx_doc_requirements_status"],
    "example_sql": "-- add_paralegal_tables.sql\nCREATE TABLE IF NOT EXISTS matter_formation_stages (\n  id TEXT PRIMARY KEY, matter_id TEXT NOT NULL, stage TEXT NOT NULL, status TEXT DEFAULT 'pending', data JSON, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (matter_id) REFERENCES matters(id)\n);\nCREATE TABLE IF NOT EXISTS conflict_checks (\n  id TEXT PRIMARY KEY, matter_id TEXT NOT NULL, parties JSON NOT NULL, result JSON, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (matter_id) REFERENCES matters(id)\n);\nCREATE TABLE IF NOT EXISTS document_requirements (\n  id TEXT PRIMARY KEY, matter_id TEXT NOT NULL, document_type TEXT NOT NULL, description TEXT, required BOOLEAN DEFAULT TRUE, status TEXT DEFAULT 'pending', assigned_to TEXT, due_date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (matter_id) REFERENCES matters(id)\n);\nCREATE TABLE IF NOT EXISTS engagement_letters (\n  id TEXT PRIMARY KEY, matter_id TEXT NOT NULL, template_id TEXT, content TEXT, status TEXT DEFAULT 'draft', signed_at DATETIME, r2_key TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (matter_id) REFERENCES matters(id)\n);\nCREATE TABLE IF NOT EXISTS audit_log (\n  id TEXT PRIMARY KEY, matter_id TEXT, actor TEXT, action TEXT, data JSON, created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n-- add_indexes_paralegal.sql\nCREATE INDEX IF NOT EXISTS idx_matter_stage ON matter_formation_stages(matter_id, stage, status);\nCREATE INDEX IF NOT EXISTS idx_conflicts_party_name ON conflict_checks(id);\nCREATE INDEX IF NOT EXISTS idx_doc_requirements_status ON document_requirements(status);",
    "insert_points": [{"path":"worker/schema.sql","line":296}],
    "evidence": [
      {"path":"worker/schema.sql","lines":"164-194","snippet":"files table exists; no paralegal tables"},
      {"path":"migrations/add_payment_history.sql","lines":"1-12","snippet":"Migration pattern present (add_payment_history.sql)"}
    ]
  },
  "services_needed": {
    "conflict_check_service": {
      "location_suggestion": "worker/services/ConflictCheckService.ts",
      "data_sources": ["D1: parties, matters, opposing names"],
      "algo": "exact + fuzzy (LIKE; fallback simple similarity)",
      "example_stub_diff": "*** Begin Patch\n*** Add File: worker/services/ConflictCheckService.ts\n+export class ConflictCheckService {\n+  constructor(private env: any) {}\n+  async checkConflicts(teamId: string, parties: string[]) {\n+    const hits = [] as any[];\n+    for (const p of parties) {\n+      const stmt = this.env.DB.prepare(\"SELECT id, opposing_party FROM matters WHERE team_id = ? AND opposing_party LIKE ? LIMIT 10\");\n+      const row = await stmt.bind(teamId, `%${p}%`).all();\n+      if (row?.results?.length) hits.push(...row.results.map((r: any) => ({ matterId: r.id, opposing_party: r.opposing_party })));\n+    }\n+    return { cleared: hits.length === 0, hits };\n+  }\n+}\n*** End Patch",
      "evidence": [{"path":"worker/schema.sql","lines":"132-139","snippet":"opposing_party TEXT in matters"}]
    },
    "doc_requirements_service": {
      "location_suggestion": "worker/services/DocumentRequirementService.ts",
      "template_source": "static JSON by matter_type",
      "r2_or_repo": "repo file",
      "example_stub_diff": "*** Begin Patch\n*** Add File: worker/services/DocumentRequirementService.ts\n+const TEMPLATES: Record<string, { id: string; title: string; required: boolean }[]> = {\n+  'Family Law': [ { id: 'doc-1', title: 'Marriage certificate', required: true } ],\n+  'Contract Review': [ { id: 'doc-2', title: 'Contract draft', required: true } ]\n+};\n+export class DocumentRequirementService {\n+  async getFor(matterType: string) { return TEMPLATES[matterType] || []; }\n+}\n*** End Patch",
      "evidence": [{"path":"worker/agents/legalIntakeAgent.ts","lines":"1078-1089","snippet":"SuggestedMatterType derivation (Contract Review, Personal Injury...)"}]
    },
    "engagement_letter_service": {
      "location_suggestion": "worker/services/EngagementLetterService.ts",
      "templating": "simple token replace",
      "pdf_gen": "pdf-lib",
      "r2_output_key": "drafts/${teamId}/${matterId}/engagement-${Date.now()}.pdf",
      "example_stub_diff": "*** Begin Patch\n*** Add File: worker/services/EngagementLetterService.ts\n+import { PDFDocument, StandardFonts } from 'pdf-lib';\n+export class EngagementLetterService {\n+  constructor(private env: any) {}\n+  async generate(teamId: string, matterId: string, template: string, placeholders: Record<string,string>) {\n+    const filled = template.replace(/{{(\\w+)}}/g, (_, k) => placeholders[k] ?? '');\n+    const pdf = await PDFDocument.create();\n+    const page = pdf.addPage();\n+    const font = await pdf.embedFont(StandardFonts.Helvetica);\n+    page.drawText(filled.slice(0, 4000), { x: 50, y: 700, size: 10, font });\n+    const bytes = await pdf.save();\n+    const key = `drafts/${teamId}/${matterId}/engagement-${Date.now()}.pdf`;\n+    await this.env.FILES_BUCKET.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });\n+    return { r2_key: key };\n+  }\n+}\n*** End Patch",
      "evidence": [{"path":"worker/lib/pdf.ts","lines":"1-40","snippet":"PDF extraction utilities present; no generation"}]
    },
    "risk_assessment_service": {
      "location_suggestion": "worker/services/RiskAssessmentService.ts",
      "model": "@cf/meta/llama-3.1-8b-instruct",
      "policy_gate": "Llama Guard when added",
      "example_stub_diff": "*** Begin Patch\n*** Add File: worker/services/RiskAssessmentService.ts\n+export class RiskAssessmentService {\n+  constructor(private env: any) {}\n+  async assess(summary: string) {\n+    const res = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {\n+      messages: [ { role: 'system', content: 'Classify legal risk, output JSON with level and notes.' }, { role: 'user', content: summary.slice(0, 4000) } ],\n+      max_tokens: 300, temperature: 0.1\n+    });\n+    return typeof res.response === 'string' ? JSON.parse(res.response) : res.response;\n+  }\n+}\n*** End Patch",
      "evidence": [{"path":"wrangler.toml","lines":"9-12","snippet":"[[ai.models]] model = \"@cf/meta/llama-3.1-8b-instruct\""}]
    }
  },
  "queues": {
    "existing": ["doc-events"],
    "needs": ["paralegal-tasks"],
    "message_schema": {"paralegal_task": {"jobId":"","teamId":"","matterId":"","kind":"","payload":{}}},
    "producer_insert_points": [{"path":"worker/agents/ParalegalAgent.ts","line":30}],
    "consumer_file": "worker/consumers/paralegal-tasks.ts",
    "consumer_stub_diff": "*** Begin Patch\n*** Add File: worker/consumers/paralegal-tasks.ts\n+interface ParalegalTask { jobId: string; teamId: string; matterId: string; kind: string; payload: any; }\n+export default { async queue(batch: MessageBatch<ParalegalTask>, env: any) {\n+  for (const msg of batch.messages) {\n+    try { console.log('paralegal-task', msg.body.kind); }\n+    catch (e) { msg.retry(); }\n+  }\n+}};\n*** End Patch",
    "evidence": [
      {"path":"wrangler.toml","lines":"48-51","snippet":"DOC_EVENTS queue binding exists"},
      {"path":"worker/consumers/doc-processor.ts","lines":"19-25","snippet":"export default { async queue(batch: MessageBatch<DocumentEvent>, env: Env) {"},
      {"path":"worker/routes/files.ts","lines":"109-120","snippet":"await env.DOC_EVENTS.send({ key, teamId, sessionId, mime, size })"}
    ]
  },
  "security": {
    "auth_on_sensitive_routes": "missing",
    "how_to_enforce_team_scope": "D1 team existence + signed header for mutating /paralegal/*",
    "pii_redaction": "missing",
    "legal_disclaimer": {
      "current": "missing",
      "best_insert_point": "worker/errorHandler.ts createSuccessResponse",
      "example_diff": "*** Begin Patch\n*** Update File: worker/errorHandler.ts\n@@\n-  return new Response(JSON.stringify(response), {\n+  return new Response(JSON.stringify(response), {\n     status: 200,\n     headers\n   });\n }\n*** End Patch"
    },
    "rate_limit_overrides": "tighten on /paralegal/*",
    "evidence": [
      {"path":"worker/routes/agent.ts","lines":"15-26","snippet":"rateLimit(env, clientId, 60, 60) applied"},
      {"path":"worker/middleware/inputValidation.ts","lines":"16-24","snippet":"SecurityFilter.validateRequest with jurisdiction checks"}
    ]
  },
  "observability": {
    "ai_gateway": "missing",
    "retry_wrapper": "worker/utils/retry.ts",
    "metrics": "missing",
    "log_shape_standardized": "yes",
    "example_diff_metrics_counter": "*** Begin Patch\n*** Add File: worker/utils/metrics.ts\n+export async function inc(env: any, key: string, ttl = 3600) {\n+  const nowBucket = `m:${key}:${Math.floor(Date.now()/ttl)}`;\n+  const val = parseInt(await env.CHAT_SESSIONS.get(nowBucket) || '0', 10) + 1;\n+  await env.CHAT_SESSIONS.put(nowBucket, String(val), { expirationTtl: ttl });\n+  return val;\n+}\n*** End Patch",
    "evidence": [
      {"path":"worker/errorHandler.ts","lines":"23-34","snippet":"Structured JSON error logs"},
      {"path":"worker/consumers/doc-processor.ts","lines":"60-67","snippet":"console.error with structured context"},
      {"path":"worker/utils/retry.ts","lines":"1-120","snippet":"withAIRetry() wrapper with backoff"}
    ]
  },
  "frontend": {
    "has_progress_ui": "missing",
    "where_to_add": "src/components/MatterProgress.tsx",
    "sse_events_to_listen": ["paralegal.update", "analysis.update"],
    "polling_fallback": {"endpoint": "/api/paralegal/:teamId/:matterId/status", "interval_sec": 5},
    "example_diff_hooks": "*** Begin Patch\n*** Add File: src/components/MatterProgress.tsx\n+import { useEffect, useState } from 'preact/hooks';\n+export function MatterProgress({ teamId, matterId }: { teamId: string; matterId: string }) {\n+  const [status, setStatus] = useState<any>(null);\n+  useEffect(() => {\n+    const t = setInterval(async () => {\n+      const res = await fetch(`/api/paralegal/${teamId}/${matterId}/status`);\n+      if (res.ok) setStatus(await res.json());\n+    }, 5000);\n+    return () => clearInterval(t);\n+  }, [teamId, matterId]);\n+  return <div className=\"text-sm\">Stage: {status?.stage ?? 'loading...'}</div>;\n+}\n*** End Patch",
    "evidence": [
      {"path":"src/hooks/useMessageHandling.ts","lines":"95-118","snippet":"SSE parsing already implemented for chat"},
      {"path":"src/components/VirtualMessageList.tsx","lines":"141-189","snippet":"Message list rendering; candidate to include progress widget"}
    ]
  },
  "feature_flags": {
    "flag_name": "enableParalegalAgent",
    "where_to_read": "src/config/features.ts",
    "rollout": "team-config",
    "example_diff": "*** Begin Patch\n*** Update File: src/config/features.ts\n@@\n interface FeatureFlags {\n+    enableParalegalAgent: boolean;\n@@\n }\n@@\n const features: FeatureFlags = {\n+    enableParalegalAgent: false,\n*** End Patch",
    "evidence": [
      {"path":"src/config/features.ts","lines":"64-74","snippet":"Feature flags object present (no paralegal flag yet)"},
      {"path":"worker/agents/legalIntakeAgent.ts","lines":"338-349","snippet":"Team config fetched; suitable for team-level toggle"}
    ]
  },
  "migration_plan_checklist": [
    "Add DO binding + class",
    "Add paralegal tables + indexes",
    "Add Supervisor router and wire routes",
    "Add /paralegal endpoints (advance,status,checklist)",
    "Add paralegal-tasks queue (optional)",
    "Add services stubs (conflict, docs, engagement, risk)",
    "Add frontend progress UI + SSE listener",
    "Add feature flag + team-level toggle"
  ],
  "risks_and_mitigations": [
    {"risk":"breaking existing intake","mitigation":"feature flag + default off"},
    {"risk":"long OCR jobs","mitigation":"queue with retries + ticketing"},
    {"risk":"auth gaps on DO routes","mitigation":"team-scoped token + D1 team check"},
    {"risk":"PDF generation size limits","mitigation":"pdf-lib with lightweight fonts"}
  ],
  "evidence": [
    {"path":"wrangler.toml","lines":"43-47","snippet":"[[r2_buckets]] binding = \"FILES_BUCKET\" bucket_name = \"blawby-ai-files\""},
    {"path":"worker/routes/files.ts","lines":"80-88","snippet":"storageKey = `uploads/${teamId}/${sessionId}/${fileId}.${fileExtension}`"},
    {"path":"worker/consumers/doc-processor.ts","lines":"44-56","snippet":"CHAT_SESSIONS.put(\"preview:${sessionId}:${key}\", ...)"},
    {"path":"worker/routes/agent.ts","lines":"15-26","snippet":"rateLimit(env, clientId, 60, 60)"},
    {"path":"worker/agents/legalIntakeAgent.ts","lines":"413-418","snippet":"TOOL_HANDLERS mapping includes analyze_document"},
    {"path":"worker/agents/legalIntakeAgent.ts","lines":"530-538","snippet":"env.AI.run('@cf/meta/llama-3.1-8b-instruct')"},
    {"path":"worker/routes/analyze.ts","lines":"391-397","snippet":"rate limit for analysis endpoint (30 rpm)"},
    {"path":"worker/utils/chunking.ts","lines":"58-89","snippet":"RAG_ENABLED=false; getEmbedding template with @cf/baai/bge-large-en-v1.5"},
    {"path":"worker/schema.sql","lines":"112-142","snippet":"matters schema section"},
    {"path":"worker/routes/index.ts","lines":"1-12","snippet":"route exports; no paralegal route yet"},
    {"path":"worker/errorHandler.ts","lines":"98-115","snippet":"createSuccessResponse centralizes success payloads"},
    {"path":"src/config/features.ts","lines":"1-20","snippet":"FeatureFlags interface location"}
  ]
}
```
