# Deployment Security Guide

## Setting Up Secrets for Production

This application uses Cloudflare Workers with sensitive configuration that should be managed securely.

### Required Secrets

The following secrets need to be set for production deployment:

#### 1. Blawby API Token
```bash
wrangler secret put BLAWBY_API_TOKEN
```
When prompted, enter your Blawby API token.

#### 2. Resend API Key (for email notifications)
```bash
wrangler secret put RESEND_API_KEY
```
When prompted, enter your Resend API key.

### Environment Variables

The following variables are set in `wrangler.toml` and are safe to commit:

- `BLAWBY_API_URL` - The Blawby API base URL
- `BLAWBY_TEAM_ULID` - The team ULID for this application

### Security Notes

- ✅ `wrangler.toml` is excluded from git via `.gitignore`
- ✅ API tokens are stored as Cloudflare secrets, not in code
- ✅ Test files use environment variables or safe mock values
- ✅ No hardcoded secrets in the codebase
- ✅ Team configurations use environment variable references (${BLAWBY_API_TOKEN})
- ✅ TeamService resolves environment variables at runtime

### Development Setup

For local development, create a `.env` file with:

```env
BLAWBY_API_URL=https://staging.blawby.com
BLAWBY_API_TOKEN=your_development_token_here
BLAWBY_TEAM_ULID=01jq70jnstyfzevc6423czh50e
RESEND_API_KEY=your_resend_key_here
```

### Team Configuration Security

The multi-tenant system stores team configurations in the database, including API credentials. To maintain security:

#### API Key Storage
- Team API keys are stored as environment variable references: `${BLAWBY_API_TOKEN}`
- The TeamService automatically resolves these references at runtime
- This prevents hardcoding sensitive credentials in the database

#### Example Team Configuration
```json
{
  "blawbyApi": {
    "enabled": true,
    "apiKey": "${BLAWBY_API_TOKEN}",
    "teamUlid": "01jq70jnstyfzevc6423czh50e"
  }
}
```

#### Security Benefits
- ✅ No hardcoded API keys in database or code
- ✅ Environment variable resolution at runtime
- ✅ Centralized secret management via Cloudflare
- ✅ Team-specific API credentials supported
- ✅ Fallback to global API token if team-specific not available

### Testing

The test files use environment variables or safe mock values. To run tests with real API access:

```bash
BLAWBY_API_TOKEN=your_test_token npm test
```

### Deployment Checklist

Before deploying to production:

1. ✅ Set `BLAWBY_API_TOKEN` secret: `wrangler secret put BLAWBY_API_TOKEN`
2. ✅ Set `RESEND_API_KEY` secret: `wrangler secret put RESEND_API_KEY`
3. ✅ Verify `wrangler.toml` is in `.gitignore`
4. ✅ Run tests to ensure functionality: `npm test`
5. ✅ Deploy: `wrangler deploy` 