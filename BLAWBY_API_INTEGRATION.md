# Blawby API Integration Guide

This guide explains how to set up the Blawby API integration to create real invoices instead of using static payment links.

## Overview

The chatbot system supports two payment methods:

1. **Blawby API Integration** (Recommended) - Creates real customers and invoices in staging.blawby.com
2. **Static Payment Links** (Fallback) - Uses pre-configured payment links

## Current Issue

The North Carolina Legal Services team is currently using a **static payment link** instead of the Blawby API because the API key is not configured.

## How to Enable Blawby API Integration

### Step 1: Get Blawby API Key

1. Contact the Blawby team to get an API key for your team
2. The API key should have permissions to create customers and invoices

### Step 2: Store API Key in KV Storage

Use the team secrets API to store the API key:

```bash
curl -X POST "https://your-worker.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-actual-blawby-api-key",
    "teamUlid": "01jq70jnstyfzevc6423czh50e"
  }'
```

### Step 3: Verify Configuration

The team configuration in `teams.json` should have:

```json
{
  "blawbyApi": {
    "enabled": true,
    "apiKey": null,  // This will be populated from KV storage
    "teamUlid": "01jq70jnstyfzevc6423czh50e"
  }
}
```

## How It Works

### 1. API Key Resolution

The `AIService` automatically resolves API keys from KV storage:

```typescript
// In AIService.resolveTeamSecrets()
if (config.blawbyApi?.enabled) {
  const apiKey = await this.teamSecretsService.getBlawbyApiKey(teamId);
  const teamUlid = await this.teamSecretsService.getBlawbyTeamUlid(teamId);
  
  if (apiKey && teamUlid) {
    config.blawbyApi.apiKey = apiKey;
    config.blawbyApi.teamUlid = teamUlid;
  } else {
    config.blawbyApi.enabled = false; // Fallback to static link
  }
}
```

### 2. Payment Processing Flow

1. **Check Blawby API Configuration**:
   ```typescript
   const useBlawbyApi = teamConfig?.blawbyApi?.enabled && teamConfig?.blawbyApi?.apiKey;
   ```

2. **If API Key Available**:
   - Create customer in staging.blawby.com
   - Generate real invoice with payment link
   - Return actual invoice URL

3. **If API Key Missing**:
   - Fall back to static payment link
   - Log warning about missing API key

### 3. Debug Information

The system logs detailed information about the payment method used:

```
🔍 [DEBUG] Payment configuration check: {
  consultationFee: 75,
  hasPaymentLink: true,
  blawbyApiEnabled: true,
  hasBlawbyApiKey: false,  // This should be true when API key is stored
  useBlawbyApi: false,     // This should be true when API key is stored
  teamId: "01jq70jnstyfzevc6423czh50e"
}
```

## Benefits of Blawby API Integration

1. **Real Customer Creation**: Creates actual customer records in staging.blawby.com
2. **Real Invoice Generation**: Generates proper invoices with unique payment links
3. **Payment Tracking**: Integrates with the Laravel app for payment tracking
4. **Audit Compliance**: Stores payment history for compliance
5. **Professional Experience**: Provides seamless integration

## Troubleshooting

### Issue: Still Using Static Payment Link

**Symptoms**:
- Payment link is always the same (static)
- No customer created in staging.blawby.com
- Debug logs show `hasBlawbyApiKey: false`

**Solutions**:
1. Verify API key is stored in KV storage
2. Check team configuration has `blawbyApi.enabled: true`
3. Ensure teamUlid matches the stored value

### Issue: API Key Not Found

**Symptoms**:
- Debug logs show `⚠️ Blawby API is enabled but no API key found`
- Fallback to static payment link

**Solutions**:
1. Store API key using the team secrets API
2. Verify the team ID matches the stored key
3. Check KV storage permissions

### Issue: API Errors

**Symptoms**:
- Debug logs show `❌ Blawby API error`
- Fallback to static payment link

**Solutions**:
1. Verify API key is valid
2. Check API permissions
3. Ensure staging.blawby.com is accessible

## Testing

To test the integration:

1. **Store API Key**:
   ```bash
   curl -X POST "https://your-worker.workers.dev/api/team-secrets/01jq70jnstyfzevc6423czh50e" \
     -H "Content-Type: application/json" \
     -d '{"apiKey": "test-api-key", "teamUlid": "01jq70jnstyfzevc6423czh50e"}'
   ```

2. **Test Payment Flow**:
   - Start a conversation with the chatbot
   - Complete the intake form
   - Verify real invoice is created

3. **Check Debug Logs**:
   - Look for `🔍 [DEBUG] Blawby API payment result`
   - Verify `paymentMethod: 'blawby_api'`

## Security Notes

- API keys are stored securely in KV storage
- Keys are redacted in debug logs
- Fallback mechanisms ensure reliability
- No sensitive data is logged

## Next Steps

1. **Get API Key**: Contact Blawby team for API key
2. **Store API Key**: Use the team secrets API to store it
3. **Test Integration**: Verify real invoices are created
4. **Monitor Logs**: Check debug logs for successful integration 