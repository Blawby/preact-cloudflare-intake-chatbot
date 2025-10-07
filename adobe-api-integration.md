# Adobe Extract Integration Plan

## Snapshot Of Today’s Flow
- `worker/routes/files.ts`: accepts uploads, stores them in R2, enqueues `DOC_EVENTS` for analyzable MIME types.
- `worker/routes/analyze.ts`: synchronous helper that wraps Cloudflare AI summarization with JSON parsing fallbacks (8 MB cap).
- `worker/utils/fileAnalysisUtils.ts`: fetches blobs from R2/D1 metadata, then calls `analyzeWithCloudflareAI`.
- `worker/middleware/fileAnalysisMiddleware.ts`: intercepts chat attachments, calls `analyzeFile`, and surfaces summary markdown.
- `worker/consumers/doc-processor.ts`: background consumer that summarizes queued uploads via Cloudflare AI and caches a preview in KV.
- Cloudflare AI is used for all summarization paths today; Adobe credentials already live in `.dev.vars`/Wrangler secrets.

## Integration Goals
- Use **Adobe PDF Extract API only** for document parsing (PDF/DOC/DOCX/scanned PDFs) to produce structured JSON + plaintext.
- Keep our **existing LLM summarization pipeline** (Cloudflare or other team-configurable models) for narrative/QA responses.
- Deliver chat feedback that mirrors today’s UX: immediate acknowledgement, progressive updates, and actionable summaries.
- Persist structured extracts so agents, middleware, and matter-generation tools can reuse them without reprocessing.
- Guard worker memory & time limits; push large jobs to the queue and retry gracefully on Adobe outages.

## Constraints & Guardrails
- Cloudflare Worker hard limit ~10 MB per request: synchronous analyze path must reject/queue larger docs.
- Adobe IMS OAuth: service-account JWT exchange; cache tokens in global scope and refresh proactively (5 min safety margin).
- Maintain current security posture (MIME whitelist, session ownership checks, audit logging).
- Reuse existing storage primitives (R2 for blobs, D1 for metadata, KV for cached summaries) where possible.
- Keep Cloudflare AI fallback for unsupported formats (images/audio) or Adobe errors to avoid blocking intake.

## Target Architecture
- **AdobeDocumentService (`worker/services/AdobeDocumentService.ts`)**
  - Handles IMS token exchange using Wrangler secrets (`ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`, etc.).
  - Provides `extract({ r2Key, contentType })` → returns `{ text, tables, elements, confidence, metadata }`.
  - Implements retry with exponential backoff & structured logging.
- **Summarization Flow**
  1. Fetch blob metadata via D1 (fallback to R2 list) — existing logic reused.
  2. If `contentType` ∈ PDF/DOC/DOCX, stream through `AdobeDocumentService.extract`.
  3. Pass resulting plaintext (plus structured highlights) into `generateDocumentSummary()` which uses existing LLM.
  4. Persist `{ extract, summary }` to KV + D1 with version + checksum to skip duplicate work.
- **Queue Enhancements**
  - `doc-processor` switches to Adobe extraction for eligible docs, stores both extract and summary, and flags completion in KV.
- **Chat Agent Integration**
  - Add `analyze_document` tool definition in `worker/agents/legal-intake/index.ts`.
  - Update `fileAnalysisMiddleware` to detect existing cached Adobe results before re-running extraction.
  - Include structured metadata in agent context so follow-up prompts can reference tables, parties, deadlines, etc.
- **Configuration**
  - Confirm `wrangler.toml` exposes Adobe secrets to both worker fetch & queue consumer.
  - Optional: feature flag (`ENABLE_ADOBE_EXTRACT`) to fall back to legacy pathway if needed.

## Implementation Phases
### Phase 0 – Environment & Telemetry
- Verify `wrangler.toml` bindings for Adobe secrets (share env snippet in repo docs if missing).
- Add log fields for `adobeExtract.latency`, `adobeExtract.status`, and quota counters.

### Phase 1 – AdobeDocumentService
- Implement service with token caching, request helpers, and unit tests (mock `fetch`).
- Handle IMS 401 (token refresh) and rate limiting (`Retry-After`) gracefully.

### Phase 2 – Extraction Pipeline
- Refactor `worker/routes/analyze.ts` and `worker/utils/fileAnalysisUtils.ts` to:
  - Route PDF/DOC/DOCX to Adobe Extract, fall back to Cloudflare AI for others.
  - Normalize extract output; cap plaintext size before sending to summarizer.
  - Return richer payload: `{ summary, keyFacts, entities, actions, confidence, rawExtractRef }`.
- Update error messaging so chat surfaces Adobe-specific failures (“Adobe extract unavailable, re-running with fallback”).

### Phase 3 – Agent & Middleware Updates
- Register `analyze_document` tool; ensure agent prompt trains the LLM to call it when doc insights are missing.
- Modify `fileAnalysisMiddleware` to:
  - Check KV cache first (`preview:${sessionId}:${r2Key}` with Adobe extract marker).
  - Trigger Adobe extraction asynchronously when file size > direct limit (respond with “working on it”).
  - Store structured extract in `context.fileAnalysis` for downstream middlewares.

### Phase 4 – Background Processing & Storage
- Extend `doc-processor` to:
  - Use Adobe Extract for queued jobs.
  - Save extracts to KV (short-term) and D1 (long-term) with schema `{ id, sessionId, teamId, r2Key, extractJson, textChecksum, createdAt }`.
  - Emit worker logs/events for monitoring dashboards.
- Create lightweight API to retrieve stored extracts for audit or later chat turns.

### Phase 5 – Frontend & QA
- Frontend (`useMessageHandling`, chat UI):
  - Show “Analyzing with Adobe Extract…” status.
  - Surface structured highlights (parties, deadlines) in a collapsible card.
  - Allow user to re-trigger analysis (calls `analyze_document` tool).
- Testing:
  - Unit tests for service & utilities (mock Adobe responses).
  - Integration test using Adobe sandbox fixture to ensure middleware short-circuits with summary.
  - Regression test verifying Cloudflare fallback still works for images.

## Risks & Mitigations
- **Token expiry / clock skew:** add 5-minute safety buffer and backoff on repeated 401s.
- **Large or malformed PDFs:** stream upload >10 MB to queue; catch Adobe parse errors and present fallback summary.
- **Adobe outage:** wrap calls with `withAIRetry`, log incidents, alert via existing monitoring, and auto-switch to fallback summarizer.
- **Inconsistent OCR results:** expose “Re-run with alternative processing” button that replays through legacy pipeline.

## Open Items
- Confirm `wrangler.toml` contains Adobe secrets for both `main` worker and `doc-processor` queue (follow up if missing).
- Decide on retention period and encryption needs for stored extracts (default aligns with existing file retention).
- Align with stakeholders on UI polish (cards vs. inline markdown) before Phase 5.
- Schedule load test once Adobe integration is stable to benchmark latency vs. Cloudflare-only flow.

