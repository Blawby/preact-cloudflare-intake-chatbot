Cookie Handshake Plan

Issue a durable session_token (UUID v4) from /api/sessions aligned with teamId; set it as an HttpOnly, SameSite=Lax cookie scoped to the widget domain, with a parallel plaintext copy returned in JSON for non-browser clients.
On each message and file upload call, accept the explicit sessionId field when present; otherwise, fall back to the cookie, creating a new session row in D1 (and KV cache entry) if neither exists.
Keep a short-lived in-memory map (Worker Durable Object or global Map) keyed by session_token for debounce/protection, but persist canonical state in D1 so users can refresh and continue seamlessly.
Rotate the cookie on “handoff complete” or 7-day inactivity while writing a closure timestamp to D1; add a scheduled task to purge orphaned KV snapshots that no longer map to open D1 rows.
Document security caveats (same-device only, no identity binding) and flag gaps for later auth work: cross-device resume, email verification, and admin/legal reviewer access.
make a md plan for this with your total plan for this best practices


Session Roadmap

Session Management Blueprint
1. Objectives
Deliver paralegal-quality intake that persists across refreshes and supports lawyer handoff.
Protect privileged data while meeting SOC2/GDPR expectations.
Support future cross-device auth and CRM integrations without re-architecture.
2. Personas & Journeys
Prospective Client: initiates chat, uploads documents, expects follow-up.
Returning Client: resumes session to add facts/evidence before lawyer review.
Internal Reviewer: consumes structured summaries, documents, and audit logs.
Journeys: new intake → evidence upload → automated summaries → human review.
3. Data Taxonomy & Sensitivity
Layer	Contents	Sensitivity	Storage Tier
Transcript	raw chat turns, tool outputs	Highest (PII/privileged)	D1 (primary), KV cache
Structured Intake	facts, parties, timelines, urgency	Highest	D1 structured tables
Documents	uploads, generated PDFs	Highest (chain of custody)	R2 + metadata in D1
Analytics	timestamps, counts, status	Medium	D1, logs
Audit Log	events (uploads, notifications)	High	D1 append-only
4. Session Lifecycle & Cookies
/api/sessions issues UUID session_token; set HttpOnly SameSite=Lax cookie (blawby_session).
Frontend includes explicit sessionId in calls; server falls back to cookie when absent.
On each interaction: write message to D1, refresh KV snapshot, update last_active timestamp.
Close session on lawyer handoff or 7-day inactivity; rotate cookie and mark archival state.
Future: replace cookie with authenticated identity (email magic link, SSO, CRM contact).
5. Storage & Concurrency
D1 (system of record):
chat_sessions (id, team_id, token_hash, state, created_at, last_active, retention_flags).
chat_messages (id, session_id, role, content_hash, content_blob, tool_metadata).
session_artifacts (type, payload_json, generated_pdf_id, checklist_state).
file_attachments (id, session_id, r2_key, mime, size, uploaded_at, moderation_flags).
audit_events (id, session_id, actor, event_type, payload, created_at).
KV: hot cache of most recent context snapshot + token-budgeted summary; TTL synced to session freshness.
R2: binary storage for uploads and generated documents; enforce versioning and signed URLs.
In-memory / Durable Object: per-session mutex & rate limiting, optional conversation summarizer queue.
6. API Surface
POST /api/sessions: create/refresh session, set cookie, return session metadata.
GET /api/sessions/:id: paginated transcript, document list, structured intake state.
POST /api/sessions/:id/messages: persist user turn, run pipeline, stream assistant response.
POST /api/sessions/:id/files: upload to R2, write metadata to D1, enqueue processing.
POST /api/sessions/:id/close: mark session closed, rotate cookie, trigger notifications.
Service hooks: webhook to CRM/Lawyer portal once intake reaches “review-ready”.
7. Frontend Integration
Persist session token in cookie; fallback to localStorage for optimistic UI (but trust server cookie).
Hydrate chat history on mount; lazy-load older messages in VirtualMessageList.
Show document list sourced from new metadata endpoint; allow re-download with signed URL.
Handle cookie rotation (handoff/expiry) by polling /api/sessions/:id status.
8. Security & Compliance
Encrypt sensitive columns at rest (hash token, encrypt contact info if required).
Enforce principle of least privilege: separate Worker bindings for public widget vs. internal tools.
Add PII scrubbing for analytics logs; ensure attachments scanned before lawyer access.
Scheduled job to enforce retention (purge inactive sessions, anonymize after SLA).
Chain-of-custody logging for uploads (timestamp, checksum, uploader context).
Document limitations of same-device cookie; flag need for identity verification before revealing history.
9. Observability & QA
Structured logs keyed by session_id; emit timing metrics (pipeline duration, storage latency).
Alerts on context save failures, KV/D1 inconsistency, file-processing errors.
QA scripts: automated intake flow test, resumable session test, document upload regression.
10. Implementation Phasing
Foundations: capture requirements, finalize schema, implement /api/sessions, D1 migrations, KV snapshot refresh.
Persistence MVP: wire message/file routes to D1 + KV, add cookie fallback on agent stream, update frontend hydration.
Artifacts & Checklists: persist document checklist, case draft, generated PDFs, audit events.
Background jobs: queue-based document processing, summarization, inactivity cleanup.
Compliance hardening: retention job, encryption, logging review, incident response runbook.
Future Auth: cross-device resume via email/SMS link, lawyer portal access, CRM sync.
11. Open Questions
Required retention horizon per team? (state bar vs. federal vs. firm policy)
Need for secure export bundle (ZIP) for litigation hold?
Moderation workflow for uploaded content (virus scanning, sensitive data detection)?
When to reintroduce Durable Objects vs. global async locks for concurrency?
Next steps: align stakeholders on schema/retention (Phase 1), draft D1 migration scripts, and prototype the session cookie handshake in a development Worker.

Retention Recommendations

Set a firm-wide default of 180 days post-last-activity for unqualified leads; give teams the option to extend to 365 days when they expect longer sales cycles or multi-step intakes.
Once a lead converts to an active client, keep session data aligned with the firm’s matter-retention policy (usually 6–7 years after case closure), with an annual review window to archive or anonymize inactive matters.
Offer a “short horizon” 30-day mode for teams operating in stricter jurisdictions or that prefer to purge unconverted leads quickly; expose this as a per-team configuration in chat_sessions.
Document a hold procedure so lawyers can flag specific sessions for indefinite retention if litigation or regulatory obligations require it.
Moderation TODO

As you implement sensitive data capture, add a backlog item for future automated content checks (PII classification, virus scan) so the schema and audit hooks are ready when moderation is prioritized.
Durable Objects Timing

Continue using the global async lock pattern while load is modest and you only need best-effort serialization.
Reintroduce Durable Objects once concurrent writes per session become common (multiple tabs, agent plus reviewer edits), you need stronger ordering guarantees for pipelines, or you start caching larger multi-turn state in-memory to cut KV/D1 round-trips.