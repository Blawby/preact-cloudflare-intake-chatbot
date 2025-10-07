# Production Readiness Checklist

## 🧱 **1. Reliability & Build Integrity**

### ✅ Use `--bundle` builds only
- [ ] Always deploy with `wrangler deploy --bundle` (solves ghost import issues)
- [ ] Store built artifacts in `/dist` or `/build`
- [ ] Commit build hash in deploy logs for reproducibility

### ✅ Deterministic Versioning
- [ ] Add `version` field in `wrangler.toml` (e.g. `1.0.0-beta.3`)
- [ ] Inject version via `env.VERSION = process.env.GITHUB_SHA` in CI/CD
- [ ] Log `{ version }` in first line of every request for correlation

### ✅ Environment Isolation
- [ ] `env.dev`: `LOG_LEVEL=debug`, `AI_MODEL=@cf/openai/gpt-oss-20b`
- [ ] `env.prod`: `LOG_LEVEL=warn`, `AI_MODEL=@cf/openai/gpt-oss-20b`
- [ ] Confirm correct bindings via `wrangler secret list --env=prod`
- [ ] Verify Adobe API keys are set for production environment

---

## 🧩 **2. Observability & Diagnostics**

### ✅ Structured Logs Everywhere
- [ ] Each major stage emits: `start`, `success`, `fail`
- [ ] Adobe extraction: `adobe.extract.start`, `adobe.extract.success`, `adobe.extract.fail`
- [ ] AI processing: `ai.analyze.start`, `ai.analyze.success`, `ai.analyze.fail`
- [ ] JSON parsing: `json.parse.start`, `json.parse.success`, `json.parse.fallback`
- [ ] Use `console.error()` only for actual exceptions

### ✅ Correlation IDs
- [ ] Pass `request_id` through every function and response payload
- [ ] Include in `X-Request-ID` response header for external tracing
- [ ] Log correlation ID in all structured log entries

### ✅ Log Shipping (Optional)
- [ ] Add Cloudflare Logpush → Logtail, Datadog, or Logflare
- [ ] Or pipe structured logs to KV/D1 for later querying
- [ ] Set up log retention policies (30 days for debug, 90 days for errors)

---

## ⚙️ **3. Operational Safety**

### ✅ Graceful JSON Recovery
- [ ] Keep `safeJson()` as last line of defense
- [ ] Add final fallback for malformed JSON:
  ```js
  if (typeof text === "string" && text.includes("{")) {
    const rough = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
    return JSON.parse(rough)
  }
  ```
- [ ] Log `parse_recovered: true` if fallback succeeds

### ✅ Timeouts & Retries
- [ ] Adobe PDF: timeout after 30s, 1 retry
- [ ] AI calls: timeout 60s, exponential backoff (1 → 2 → 4s)
- [ ] Document processing: timeout 120s total

### ✅ Rate & Token Safeguards
- [ ] Log AI token usage (`response.usage?.total_tokens`)
- [ ] Alert if token usage >10k per request
- [ ] Store last 100 usage metrics in KV for trend analysis
- [ ] Implement rate limiting: 30 requests/minute per client

---

## 🚀 **4. Deployment & Rollback**

### ✅ GitHub Action
- [ ] Trigger on `push(tags: ['v*'])`
- [ ] Steps: `wrangler build` → `wrangler deploy --env=prod`
- [ ] After deploy, run smoke test: analyze known small PDF
- [ ] Verify all environment variables are set

### ✅ Rollback Policy
- [ ] Keep last two versions in `dist/`
- [ ] If smoke test fails, run `wrangler deploy --env=prod --script=dist/previous.js`
- [ ] Document rollback procedure in team wiki

---

## 🧾 **5. Post-Deployment Validation**

### ✅ Smoke Test Checklist
- [ ] Upload 2-page test PDF to `/api/analyze`
- [ ] Verify logs show all 3 phases:
  - `adobe.extract.success`
  - `ai.analyze.success` 
  - `json.parse.success`
- [ ] Confirm `summary` is non-null in final output
- [ ] Cross-check latency metrics (`start` vs `end` timestamps)
- [ ] Verify `X-Request-ID` header is returned and logged consistently

### ✅ Performance Validation
- [ ] Adobe extraction completes within 30s
- [ ] AI analysis completes within 60s
- [ ] Total request time < 120s
- [ ] Memory usage stays within Cloudflare limits

### ✅ Error Handling Validation
- [ ] Test with malformed PDF files
- [ ] Test with very large PDF files (>10MB)
- [ ] Test with non-PDF files
- [ ] Verify graceful error responses with proper HTTP status codes

---

## 🔧 **6. Monitoring & Alerting**

### ✅ Health Checks
- [ ] Implement `/health` endpoint that checks:
  - Adobe API connectivity
  - AI service availability
  - Database connectivity
  - KV store accessibility
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot, etc.)

### ✅ Error Alerting
- [ ] Set up alerts for:
  - Adobe API failures > 5% in 5 minutes
  - AI service failures > 10% in 5 minutes
  - JSON parsing failures > 20% in 5 minutes
  - Response time > 120s
- [ ] Configure alert channels (Slack, email, PagerDuty)

### ✅ Usage Metrics
- [ ] Track daily request volume
- [ ] Monitor token usage trends
- [ ] Track success/failure rates
- [ ] Monitor response time percentiles (p50, p95, p99)

---

## 📋 **Pre-Deployment Checklist**

Before deploying to production:

- [ ] All tests pass in CI/CD pipeline
- [ ] Environment variables configured in production
- [ ] Secrets properly set via `wrangler secret put`
- [ ] Database migrations applied (if any)
- [ ] Adobe API credentials validated
- [ ] AI model configuration verified
- [ ] Rate limiting configured
- [ ] Logging levels set appropriately
- [ ] Health check endpoint tested
- [ ] Smoke test documented and ready

---

## 🚨 **Emergency Procedures**

### Adobe API Issues
1. Check Adobe service status page
2. Verify API credentials haven't expired
3. Check rate limits and quotas
4. Fall back to basic text extraction if needed

### AI Service Issues
1. Check Cloudflare AI service status
2. Verify model availability
3. Switch to fallback model if configured
4. Implement circuit breaker pattern

### High Error Rates
1. Check recent deployments for issues
2. Review error logs for patterns
3. Consider rolling back to previous version
4. Scale up resources if needed

---

## 📊 **Success Metrics**

Track these KPIs post-deployment:

- **Availability**: > 99.5% uptime
- **Performance**: < 120s average response time
- **Accuracy**: > 90% successful JSON parsing
- **Reliability**: < 5% error rate
- **User Experience**: < 2% timeout rate

---

*Last updated: $(date)*
*Version: 1.0.0*
