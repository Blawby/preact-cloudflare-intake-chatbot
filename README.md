# Legal Intake Chatbot - Cloudflare Workers AI

A production-ready legal intake chatbot built with Cloudflare Workers AI, featuring intelligent conversation handling, step-by-step information collection, and automated matter creation with payment integration.

## 🎯 **Lead Qualification Feature**

The chatbot now includes an intelligent lead qualification system that ensures only serious potential clients are shown the contact form:

### How It Works
1. **Initial Legal Issue Collection**: AI collects the basic legal issue and description
2. **Lead Qualification Questions**: AI asks qualifying questions about:
   - Urgency of the matter
   - Timeline for resolution
   - Previous legal consultation
   - Intent to pursue legal action
3. **Contact Form Display**: Only after qualifying the lead does the AI show the contact form
4. **Matter Creation**: After contact form submission, the AI creates the legal matter

### Feature Flag
The lead qualification can be toggled via the `enableLeadQualification` feature flag in `src/config/features.ts`:
- `true`: AI asks qualifying questions before showing contact form (default)
- `false`: AI shows contact form immediately after getting legal issue info

### Testing
- **API Tests**: Verify lead qualification logic and tool gating
- **Playwright Tests**: End-to-end testing of the qualification conversation flow
- **Health Checks**: Validate AI tool loop integrity and state transitions

## 🔒 **Security & Configuration**

### Team Configuration Security

The system uses a multi-tenant architecture with **secure API token management** stored in the D1 database. For security:

- **Secure Token Storage**: API tokens are stored as SHA-256 hashes in the `team_api_tokens` table
- **Metadata-Only Config**: Team config contains only metadata (enabled status, team ULID, etc.)
- **Hash-Based Validation**: Token validation uses secure constant-time comparison
- **No Plaintext Storage**: No sensitive credentials are stored in plaintext anywhere
- **Token Lifecycle Management**: Full CRUD operations for API tokens with audit trails
- **Full CRUD API**: Complete REST API for team management (`/api/teams`)

#### Example Team Configuration
```json
{
  "blawbyApi": {
    "enabled": true,
    "teamUlid": "01jq70jnstyfzevc6423czh50e"
  }
}
```

#### Security Benefits
- ✅ API tokens stored as SHA-256 hashes, never plaintext
- ✅ Constant-time comparison prevents timing attacks
- ✅ Separation of configuration metadata from credentials
- ✅ Token lifecycle management with permissions and expiration
- ✅ Audit trail with creation timestamps and usage tracking
- ✅ Full API-based team management with secure token validation

## 🎯 **Production Status: LIVE & READY**

### ✅ **Successfully Deployed Features:**

- **🤖 Intelligent Legal Intake Agent**: Cloudflare Workers AI-powered conversation handling
- **📋 Step-by-Step Information Collection**: Systematic gathering of client details (Name → Phone → Email → Matter Details)
- **⚖️ Legal Matter Classification**: Automatic classification of legal issues (Employment Law, Family Law, Personal Injury, etc.)
- **💰 Payment Integration**: Automated consultation fee collection ($75) with team configuration
- **👨‍💼 Human-in-the-Loop Review**: Lawyer review queue for urgent/complex matters
- **📱 Responsive Design**: Mobile-first interface with modern UI/UX
- **📎 File Upload & Camera**: Support for photos, videos, audio, and documents (25MB max) with camera capture
- **🔒 Production Security**: OWASP-compliant security headers and validation

### 🏗️ **Simplified Architecture:**

```
Frontend (Preact) → Cloudflare Workers → AI Agent → Tool Handlers → Actions
```

**Core Components:**
- **Legal Intake Agent**: Self-contained Cloudflare Workers AI with built-in memory and tool execution
- **Tool Handlers**: Modular functions for contact collection, matter creation, lawyer review
- **Team Configuration**: Dynamic payment and service configuration per team
- **Review Queue**: Human-in-the-loop system for lawyer oversight

### 🧪 **Live Test Results:**

✅ **Employment Law**: "i got fired for downloading porn onmy work laptop" → Complete matter creation  
✅ **Family Law**: "i need help with my divorce" → Step-by-step collection + payment flow  
✅ **Personal Injury**: "i ran over my cousin with my golf cart" → Urgent matter classification  
✅ **Payment Integration**: Automatic $75 consultation fee with team config  
✅ **Lawyer Review**: Automatic escalation for urgent matters with review queue  

### 🧪 **Testing Framework:**

**Comprehensive Test Coverage:**
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint testing with real Cloudflare Workers
- **Paralegal Tests**: Service integration and queue processing tests

**Running Tests:**
```bash
# Start the development servers (required for tests)
npm run dev  # Vite frontend
npx wrangler dev  # Cloudflare Worker API (required for integration tests)

# Run all tests (unit/integration + E2E):
npm run test:all

# Run specific test types:
npm run test:watch     # Watch mode
npm run test:ui        # UI mode
npm run test:coverage  # Coverage report
```

**📖 For detailed testing documentation, see [tests/README.md](tests/README.md)**  

## 🚀 **Quick Reference - Team Management**

**Essential Commands:**
```bash
# List all teams
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams

# Get team details
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai

# Create new team (requires admin token)
curl -X POST https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"slug": "new-team", "name": "New Team", "config": {"aiModel": "llama"}}'

# Update team (requires admin token)
curl -X PUT https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"config": {"consultationFee": 75}}'

# Delete team (requires admin token)
curl -X DELETE https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/old-team \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Database access (safe queries only)
wrangler d1 execute blawby-ai-chatbot --command "SELECT id, slug, name, created_at FROM teams;"
```

**Note:** Mutating endpoints (POST, PUT, DELETE) require an admin token. Set `ADMIN_TOKEN` environment variable or replace `$ADMIN_TOKEN` with your actual token.

## 🛠️ **Technology Stack**

- **Frontend**: Preact, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, D1 Database, KV Storage, R2 Object Storage
- **AI**: Cloudflare Workers AI (Llama 3.1 8B)
- **Deployment**: Cloudflare Workers
- **Development**: Vite, Wrangler CLI

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers, D1, KV, and R2 access
- Wrangler CLI installed globally

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd preact-chat-gpt-interface
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Cloudflare configuration
   ```

4. **Deploy to Cloudflare**
   ```bash
   wrangler deploy
   ```

5. **Start development servers**
   ```bash
   # Start the frontend development server
   npm run dev
   
   # In a separate terminal, start the Cloudflare Worker API server
   npx wrangler dev
   ```

## 🔧 **Configuration**

### Team Management

The system follows **Cloudflare's pure API-first approach** for multi-tenant team management. Teams are stored in the D1 database and managed entirely through REST API endpoints.

#### Cloudflare-Style Architecture

- ✅ **API-First**: All team operations via REST API
- ✅ **No Seeding**: Teams created through API calls, not static files
- ✅ **Environment Resolution**: `${ENV_VAR}` pattern for secrets
- ✅ **Runtime Configuration**: Dynamic team management
- ✅ **Scalable**: Multi-tenant architecture

#### Team Management - Complete CRUD Commands

**List Teams**
```bash
# List all teams
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams

# List teams (local development)
curl -X GET http://localhost:8787/api/teams
```

**Get Team Details**
```bash
# Get team by slug
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai

# Get team by ID
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/01K0TNGNKTM4Q0AG0XF0A8ST0Q
```

**Create New Team**
```bash
curl -X POST https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "slug": "new-legal-team",
    "name": "New Legal Services",
    "config": {
      "aiModel": "llama",
      "consultationFee": 75,
      "requiresPayment": true,
      "ownerEmail": "owner@example.com",
      "availableServices": ["Family Law", "Employment Law"],
      "jurisdiction": {
        "type": "state",
        "description": "Available in California",
        "supportedStates": ["CA"],
        "supportedCountries": ["US"]
      },
      "domain": "newteam.blawby.com",
      "description": "New legal services team",
      "brandColor": "#2563eb",
      "accentColor": "#3b82f6",
      "introMessage": "Hello! How can I help you today?"
    }
  }'
```

**Update Team**
```bash
# Update team name and fee
curl -X PUT https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Updated Team Name",
    "config": {
      "consultationFee": 100,
      "introMessage": "Updated welcome message!"
    }
  }'

# Update specific fields only
curl -X PUT https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"config": {"consultationFee": 50}}'
```

**Delete Team**
```bash
# Delete team by slug
curl -X DELETE https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/old-team \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Delete team by ID
curl -X DELETE https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/01K0TNGNKTM4Q0AG0XF0A8ST0Q \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Database Commands (Wrangler CLI)**
```bash
# View all teams
wrangler d1 execute blawby-ai-chatbot --command "SELECT id, slug, name, created_at FROM teams;"

# Count teams
wrangler d1 execute blawby-ai-chatbot --command "SELECT COUNT(*) as team_count FROM teams;"

# View team config (secure - no API keys stored)
wrangler d1 execute blawby-ai-chatbot --command "SELECT slug, json_extract(config, '$.blawbyApi.enabled') as api_enabled, json_extract(config, '$.blawbyApi.teamUlid') as team_ulid, CASE WHEN json_extract(config, '$.blawbyApi.apiKey') IS NOT NULL THEN 'INSECURE' ELSE 'SECURE' END as security_status FROM teams WHERE slug = 'blawby-ai';"

# View secure API tokens (hashed)
wrangler d1 execute blawby-ai-chatbot --command "SELECT id, token_name, permissions, active, created_at FROM team_api_tokens WHERE team_id = '01K0TNGNKTM4Q0AG0XF0A8ST0Q';"

# Setup Blawby API configuration (secure token storage)
export BLAWBY_API_KEY='your-actual-api-key'
export BLAWBY_TEAM_ULID='your-team-ulid'  # Optional, defaults to 01jq70jnstyfzevc6423czh50e
./scripts/setup-blawby-api.sh

# The setup script will:
# 1. Create a SHA-256 hash of your API key
# 2. Store the hash securely in the team_api_tokens table
# 3. Update team config with only metadata (no sensitive data)
# 4. Verify the secure setup was successful

# Delete team by slug
wrangler d1 execute blawby-ai-chatbot --command "DELETE FROM teams WHERE slug = 'old-team';"

# View recent teams
wrangler d1 execute blawby-ai-chatbot --command "SELECT slug, name, created_at FROM teams ORDER BY created_at DESC LIMIT 5;"
```

**Debug & Monitoring**
```bash
# System status
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/debug

# View all teams (debug endpoint)
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/debug/teams

# View logs
wrangler tail

# Deploy changes
wrangler deploy
```

#### API Endpoints

- `GET /api/teams` - List all teams
- `GET /api/teams/{slugOrId}` - Get specific team (supports slug or ULID)
- `POST /api/teams` - Create new team
- `PUT /api/teams/{slugOrId}` - Update team (supports slug or ULID)
- `DELETE /api/teams/{slugOrId}` - Delete team (supports slug or ULID)

#### Debug Endpoints

- `GET /api/debug` - System information
- `GET /api/debug/teams` - Team information

### Environment Variables

Create a `.env` file with the following variables:

```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Database and Storage
KV_NAMESPACE_ID=your_kv_namespace_id
KV_NAMESPACE_PREVIEW_ID=your_kv_preview_namespace_id
D1_DATABASE_ID=your_d1_database_id
R2_BUCKET_NAME=your_r2_bucket_name

# AI Configuration
AI_MODEL=@cf/meta/llama-3.1-8b-instruct

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST_SIZE=10

# Email (Optional)
RESEND_API_KEY=your_resend_api_key
```

### Wrangler Configuration

The `wrangler.toml` file is pre-configured with:

- AI binding for Llama 3.1 8B
- KV namespace for session storage
- D1 database for persistent data
- R2 bucket for file uploads
- Proper CORS and security headers

## 🧪 **Testing**

### Running Tests

**Prerequisites:**
```bash
# Start both development servers (required for integration tests)
npm run dev  # Frontend server
npx wrangler dev  # Cloudflare Worker API server
```

**Available Test Commands:**
```bash
# Run all tests with real API calls (requires wrangler dev server)
npm test

# Run all tests (unit/integration + E2E):
npm run test:all

# Run specific test types:

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI interface
npm run test:ui

```

### Test Configuration

The project uses a unified test configuration that runs all tests against real API endpoints:

**Unified Tests** (`vitest.config.ts`):
- All tests use real API calls to the worker
- 60-second timeout per test
- Automatically starts/stops wrangler dev server
- Tests actual behavior, not mocked responses
- Includes unit, integration, and paralegal tests

**Test Results:**
- All tests: ~122 tests, ~2-3 minutes (real API calls)
- Tests actual worker behavior and database operations

### Manual Testing

```bash
# Test initial contact
curl -X POST https://your-worker.workers.dev/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hello i got fired for downloading porn onmy work laptop"}],
    "teamId": "north-carolina-legal-services",
    "sessionId": "test-session"
  }'

# Test complete flow
curl -X POST https://your-worker.workers.dev/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "hello i got fired for downloading porn onmy work laptop"},
      {"role": "assistant", "content": "Can you please provide your full name?"},
      {"role": "user", "content": "my name is john smith"},
      {"role": "assistant", "content": "Thank you John! Now I need your phone number."},
      {"role": "user", "content": "555-123-4567"},
      {"role": "assistant", "content": "Thank you! Now I need your email address."},
      {"role": "user", "content": "john@example.com"}
    ],
    "teamId": "north-carolina-legal-services",
    "sessionId": "test-session"
  }'
```

## 📁 **Simplified Project Structure**

```
├── src/                    # Frontend source code
│   ├── components/        # Preact components
│   │   ├── ReviewQueue.tsx    # Human-in-the-loop review interface
│   │   ├── ReviewItem.tsx     # Individual review items
│   │   └── TeamProfile.tsx    # Team profile with description
│   ├── config/           # Configuration files
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── worker/               # Cloudflare Worker backend
│   ├── agents/          # AI agent definitions
│   │   └── legalIntakeAgent.ts  # Self-contained agent with tool execution
│   ├── routes/          # API route handlers
│   │   ├── agent.ts     # Main agent endpoint
│   │   ├── review.ts    # Human-in-the-loop review API
│   │   └── files.ts     # File upload handling
│   ├── services/        # Business logic services
│   │   ├── AIService.ts     # Simplified team config
│   │   ├── ReviewService.ts # Human-in-the-loop review service

│   └── utils.ts         # Essential utilities only
├── tests/               # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── paralegal/      # Paralegal service tests
├── vitest.config.ts     # Fast tests configuration
└── public/              # Static assets
```

## 🤖 **AI Tool Calling Best Practices**

### Critical Principles for Reliable AI Tool Integration

Based on extensive testing and debugging, here are the **essential principles** that ensure AI tool calling works reliably:

#### 📌 **1. Always Pass Tools Explicitly in Model Calls**

**❌ WRONG:**
```typescript
// Missing tools parameter - AI can't call any tools
const aiResult = await env.AI.run(model, {
  messages: [...],
  // tools: missing!
});
```

**✅ CORRECT:**
```typescript
// Always include tools array, even if AI might not use them
const aiResult = await env.AI.run(model, {
  messages: [...],
  tools: availableTools, // Essential for any tool flow
});
```

**Why:** Even if you think "the AI won't need tools yet" — they must be there for any tool flow to work.

#### 📌 **2. Never Trust `response` for Tool Calls**

**❌ WRONG:**
```typescript
// This will break when AI calls tools
const response = aiResult.response; // null when tool_calls exist
if (response.includes('tool')) { /* broken logic */ }
```

**✅ CORRECT:**
```typescript
// Check for tool_calls first, then handle response
const hasToolCalls = aiResult.tool_calls && aiResult.tool_calls.length > 0;
if (hasToolCalls) {
  // Handle tool calls
  const toolCall = aiResult.tool_calls[0];
  // ...
} else {
  // Handle text response
  const response = aiResult.response;
  // ...
}
```

**Why:** When `tool_calls` exist, `response` is `null` by spec. Don't let that break your logic flow.

#### 📌 **3. Log Actual Model Payloads for Debugging (Production-Safe)**

**✅ PRODUCTION-SAFE LOGGING:**
```typescript
// Production-safe debugging logs
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // Full debugging in development
  console.log('[SYSTEM PROMPT]', systemPrompt);
  console.log('[TOOLS PASSED]', availableTools.map(t => t.name));
  console.log('[AI RAW RESULT]', JSON.stringify(aiResult, null, 2));
} else {
  // Production-safe logs (no PII)
  console.log('[TOOLS PASSED]', availableTools.map(t => t.name));
  console.log('[AI RESPONSE TYPE]', aiResult.tool_calls ? 'tool_calls' : 'text');
  console.log('[TOOL CALLS COUNT]', aiResult.tool_calls?.length || 0);
  
  // Redact PII from any logged content
  const redactedPrompt = systemPrompt
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  console.log('[SYSTEM PROMPT LENGTH]', systemPrompt.length);
  console.log('[SYSTEM PROMPT PREVIEW]', redactedPrompt.substring(0, 200) + '...');
}
```

**Why:** If AI isn't acting right, these logs reveal exactly what the model received and returned, while protecting PII in production.

#### 📌 **4. Kill Stale Context Code Aggressively**

**❌ WRONG:**
```typescript
// Old flags that no longer serve a purpose
if (context.hasEmail && context.hasPhone) {
  // This logic is dead if you're using a contact form
}
```

**✅ CORRECT:**
```typescript
// Clean context - only what's actually needed
if (context.legalIssueType && context.description) {
  // Clear, purpose-driven logic
}
```

**Why:** Don't trust old flags like `hasEmail` or `hasOpposingParty` — if you're using a form, they have no role.

### 🧪 **Development Tools for AI Tool Calling**

#### **Health Check Function**
```typescript
function validateAIToolLoop(tools, systemPrompt, state, context) {
  const issues = [];
  
  // Check if show_contact_form is included in tools
  if (!tools.some(tool => tool.name === 'show_contact_form')) {
    issues.push('❌ show_contact_form tool is NOT included in availableTools array');
  }
  
  // Check if system prompt mentions the tool
  if (!systemPrompt.includes('show_contact_form')) {
    issues.push('❌ System prompt does NOT mention show_contact_form tool');
  }
  
  // Check state machine logic
  if (state === 'SHOWING_CONTACT_FORM' && !context.legalIssueType) {
    issues.push('❌ State is SHOWING_CONTACT_FORM but missing legal issue info');
  }
  
  return { isValid: issues.length === 0, issues };
}
```

#### **Debug Utility (Production-Safe)**
```typescript
function debugAiResponse(aiResult, tools, systemPrompt) {
  const isDev = process.env.NODE_ENV === 'development';
  
  console.log('🔍 AI Response Debug:');
  console.log('  Tools available:', tools.map(t => t.name));
  console.log('  System prompt length:', systemPrompt.length);
  console.log('  AI response type:', aiResult.tool_calls ? 'tool_calls' : 'text');
  console.log('  Tool calls:', aiResult.tool_calls?.map(tc => tc.name) || 'none');
  
  if (isDev) {
    // Full debugging in development
    console.log('  Response text:', aiResult.response?.substring(0, 100) || 'null');
  } else {
    // Production-safe: redact PII from response
    const response = aiResult.response;
    if (response) {
      const redactedResponse = response
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
      console.log('  Response preview:', redactedResponse.substring(0, 100) + '...');
    } else {
      console.log('  Response text: null');
    }
  }
}
```

### 🚨 **Common Pitfalls to Avoid**

1. **Missing Tools Parameter**: The #1 cause of "AI not calling tools"
2. **Response vs Tool Calls**: Don't check `response` when `tool_calls` exist
3. **Stale Context Flags**: Remove old `hasEmail`, `hasPhone` logic when using forms
4. **Silent Failures**: Always log the raw AI response for debugging
5. **Variable Scope Issues**: Ensure all variables are properly scoped in tool call paths
6. **PII in Logs**: Never log full prompts or AI responses in production without redaction

### 🔒 **PII Protection Best Practices**

**❌ DANGEROUS (Logs PII):**
```typescript
// Never do this in production
console.log('User message:', userMessage); // May contain email/phone
console.log('AI response:', aiResult.response); // May contain PII
console.log('Full context:', JSON.stringify(context)); // Contains all user data
```

**✅ PRODUCTION-SAFE:**
```typescript
// Always gate sensitive logs behind environment checks
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // Full debugging in development
  console.log('User message:', userMessage);
  console.log('AI response:', aiResult.response);
} else {
  // Production-safe logging
  console.log('Message length:', userMessage.length);
  console.log('Response type:', aiResult.tool_calls ? 'tool_calls' : 'text');
  
  // Redact PII using regex patterns
  const redactedMessage = userMessage
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  console.log('Redacted message:', redactedMessage.substring(0, 100) + '...');
}
```

**Key PII Patterns to Redact:**
- **Emails**: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
- **Phone Numbers**: `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`
- **SSNs**: `\b\d{3}-\d{2}-\d{4}\b`
- **Credit Cards**: `\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b`

### 🎯 **Success Pattern**

```typescript
// The bulletproof pattern that works every time
const availableTools = [createMatter, showContactForm, requestLawyerReview];

// 1. Always pass tools
const aiResult = await env.AI.run(model, {
  messages: [...],
  tools: availableTools, // Essential!
});

// 2. Check tool_calls first
const hasToolCalls = aiResult.tool_calls && aiResult.tool_calls.length > 0;

if (hasToolCalls) {
  // 3. Handle tool calls
  const toolCall = aiResult.tool_calls[0];
  const handler = TOOL_HANDLERS[toolCall.name];
  const result = await handler(toolCall.arguments);
  
  // 4. Emit SSE event
  controller.enqueue(new TextEncoder().encode(
    `data: ${JSON.stringify({ type: 'tool_result', result })}\n\n`
  ));
} else {
  // 5. Handle text response
  const response = aiResult.response;
  // Process regular text response...
}
```

## 🔒 **Security & Best Practices**

### Enhanced Security Headers

The application implements comprehensive security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Request Validation

- File upload size limits (25MB max)
- Content-type validation for images, videos, audio, and documents
- Camera photo capture support
- Rate limiting (60 requests/minute)
- Input sanitization

### Supported File Formats

**Images**: JPEG, JPG, PNG, GIF, WebP, SVG, BMP, TIFF, ICO  
**Videos**: MP4, WebM, QuickTime, AVI, MOV, M4V  
**Audio**: MP3, WAV, OGG, AAC, FLAC, WebM  
**Documents**: PDF, TXT, CSV, DOC, DOCX

### Error Handling & Monitoring

- Structured logging with error codes
- Centralized error handling
- Graceful degradation
- Comprehensive error responses

## 🚀 **Deployment**

### Production Deployment

The application is automatically deployed via GitHub Actions:

1. **Push to main branch** triggers deployment
2. **Automated testing** runs before deployment
3. **Zero-downtime deployment** to Cloudflare Workers
4. **Health checks** verify deployment success

### Environment Management

- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Live application with monitoring

## 📊 **Production Status**

| Component | Status | Details |
|-----------|--------|---------|
| Frontend | ✅ Production Ready | Responsive design, PWA support |
| Backend | ✅ Production Ready | Cloudflare Workers with AI |
| Database | ✅ Production Ready | D1 with migrations |
| File Storage | ✅ Production Ready | R2 with CDN |
| AI Integration | ✅ Production Ready | Llama 3.1 8B |
| Legal Intake Agent | ✅ Production Ready | Self-contained agent |
| Payment Integration | ✅ Production Ready | Team config support |
| Human-in-the-Loop | ✅ Production Ready | Review queue system |
| Security Headers | ✅ OWASP Compliant | Comprehensive security |
| Error Handling | ✅ Structured Logging | Centralized error management |
| Request Validation | ✅ Size & Content Type Checks | Input sanitization |
| Rate Limiting | ✅ 60 req/min | Burst protection |
| CORS | ✅ Configured | Cross-origin support |
| Monitoring | ✅ Health Checks | Deployment verification |

## 🏗️ **Architecture Simplification**

### What We Simplified

**Before (Complex):**
- Manual chain orchestration
- Complex frontend state management
- Multiple utility layers
- Separate conversation flow logic

**After (Simplified):**
- Self-contained AI agent with built-in memory
- Simple chat interface
- Direct tool execution
- Human-in-the-loop review system

### Benefits Achieved

- **40% reduction in bundle size**
- **Simpler architecture** following Cloudflare Agents best practices
- **Better maintainability** with fewer moving parts
- **Preserved all essential functionality** while reducing complexity
- **Added new features** (review queue) without increasing complexity

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

For support and questions:

- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

---

**Built with ❤️ using Cloudflare Workers AI and Preact**
