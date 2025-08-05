# Multi-Tenant Secret Management Setup

## 🎯 Overview

This system now supports secure multi-tenant API key management using Cloudflare KV storage. Each team can have their own Blawby API key stored securely and retrieved dynamically.

## 🏗️ Architecture

### **Components:**
- **TeamSecretsService**: Manages team API keys in KV storage
- **AIService**: Dynamically resolves API keys at runtime
- **Team Secrets API**: RESTful endpoints for managing secrets
- **KV Storage**: Secure storage for team-specific secrets

### **Security Features:**
- ✅ **Per-team isolation**: Each team has their own API key
- ✅ **KV encryption**: Cloudflare automatically encrypts KV data
- ✅ **No hardcoded secrets**: All API keys stored securely
- ✅ **Dynamic resolution**: API keys loaded at runtime
- ✅ **Audit trail**: Metadata tracking for all operations

## 🚀 Setup Instructions

### **Step 1: Create KV Namespace**

Create the KV namespace for team secrets:

```bash
# Create the KV namespace
wrangler kv namespace create "TEAM_SECRETS"

# Create the preview namespace
wrangler kv namespace create "TEAM_SECRETS" --preview
```

### **Step 2: Update wrangler.toml**

Replace the placeholder IDs in `wrangler.toml` with your actual KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "TEAM_SECRETS"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
experimental_remote = true
```

### **Step 3: Store Team API Keys**

Use the API to store team API keys securely:

```bash
# Store API key for North Carolina Legal Services
curl -X POST https://your-worker.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-actual-blawby-api-key",
    "teamUlid": "01jq70jnstyfzevc6423czh50e"
  }'
```

### **Step 4: Verify Setup**

Check that the API key was stored correctly:

```bash
# Check if team has stored secret
curl https://your-worker.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e

# List all teams with secrets
curl https://your-worker.workers.dev/api/team-secrets
```

## 🔧 API Endpoints

### **Store Team Secret**
```http
POST /api/team-secrets/:teamId
Content-Type: application/json

{
  "apiKey": "your-blawby-api-key",
  "teamUlid": "your-team-ulid"
}
```

### **Check Team Secret**
```http
GET /api/team-secrets/:teamId
```

### **Update Team Secret**
```http
PUT /api/team-secrets/:teamId
Content-Type: application/json

{
  "apiKey": "your-new-blawby-api-key",
  "teamUlid": "your-team-ulid"
}
```

### **Delete Team Secret**
```http
DELETE /api/team-secrets/:teamId
```

### **List All Teams with Secrets**
```http
GET /api/team-secrets
```

## 🔄 How It Works

### **1. Team Configuration**
Teams are configured in `teams.json` with `blawbyApi.enabled: true` but `apiKey: null`:

```json
{
  "blawbyApi": {
    "enabled": true,
    "apiKey": null,
    "teamUlid": "01jq70jnstyfzevc6423czh50e"
  }
}
```

### **2. Dynamic Resolution**
When a team's configuration is loaded:

1. **AIService** checks if `blawbyApi.enabled` is true
2. **TeamSecretsService** retrieves the API key from KV storage
3. **API key** is dynamically injected into the configuration
4. **BlawbyPaymentService** uses the resolved API key

### **3. Fallback Behavior**
If no API key is found in KV storage:
- `blawbyApi.enabled` is automatically set to `false`
- System falls back to static payment links
- No errors are thrown, graceful degradation

## 🛡️ Security Benefits

### **Multi-Tenant Isolation**
- Each team has their own API key
- No cross-team access to secrets
- Team-specific ULID validation

### **Secure Storage**
- Cloudflare KV encryption at rest
- No secrets in code or configuration files
- Automatic key rotation support

### **Audit Trail**
- Creation and update timestamps
- Metadata tracking for all operations
- Easy secret lifecycle management

## 🔍 Monitoring & Debugging

### **Logs to Watch**
```
🔐 [TEAM_SECRETS] Stored API key for team: 01jq70jnstyfzevc6423czh50e
🔐 [TEAM_SECRETS] Retrieved API key for team: 01jq70jnstyfzevc6423czh50e
🔐 [AIService] Resolved API key for team: 01jq70jnstyfzevc6423czh50e
⚠️ [AIService] No API key found in KV for team: 01jq70jnstyfzevc6423czh50e, disabling Blawby API
```

### **Common Issues**

**Issue**: "No API key found in KV for team"
**Solution**: Store the API key using the API endpoint

**Issue**: "Team secret not found"
**Solution**: Check team ID and ensure secret was stored correctly

**Issue**: "Blawby API disabled"
**Solution**: Verify API key is stored and team ULID is correct

## 🚀 Production Deployment

### **1. Deploy the Worker**
```bash
wrangler deploy
```

### **2. Store Production API Keys**
```bash
# For each team, store their API key
curl -X POST https://your-production-worker.workers.dev/api/team-secrets/TEAM_ID \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "PRODUCTION_API_KEY", "teamUlid": "TEAM_ULID"}'
```

### **3. Verify Configuration**
```bash
# Test that API keys are resolved correctly
curl https://your-production-worker.workers.dev/api/team-secrets
```

## 🔄 Migration from Old System

### **From Environment Variables**
1. **Extract** API keys from environment variables
2. **Store** them using the new API endpoints
3. **Remove** environment variables
4. **Test** that everything works

### **From Hardcoded Keys**
1. **Remove** hardcoded keys from configuration
2. **Store** them using the new API endpoints
3. **Update** configuration to use dynamic resolution
4. **Test** the integration

## 📊 Benefits

### **Scalability**
- ✅ **Unlimited teams**: No environment variable limits
- ✅ **Dynamic management**: Add/remove teams without redeployment
- ✅ **Independent scaling**: Each team can scale independently

### **Security**
- ✅ **No exposed secrets**: No keys in code or config files
- ✅ **Per-team isolation**: Complete tenant separation
- ✅ **Audit trail**: Full history of secret operations

### **Flexibility**
- ✅ **Easy key rotation**: Update keys without code changes
- ✅ **Team self-service**: Teams can manage their own keys
- ✅ **Graceful fallbacks**: System works even without keys

## 🎯 Next Steps

1. **Create KV namespace** and update `wrangler.toml`
2. **Store API keys** for existing teams
3. **Test the integration** thoroughly
4. **Deploy to production** and verify
5. **Monitor logs** for any issues

This system provides a secure, scalable foundation for multi-tenant API key management that grows with your business needs. 