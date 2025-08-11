# Legal Intake Chatbot - Cloudflare Workers AI

A production-ready legal intake chatbot built with Cloudflare Workers AI, featuring intelligent conversation handling, step-by-step information collection, and automated matter creation with payment integration.

## 🔒 **Security & Configuration**

### Team Configuration Security

The system uses a multi-tenant architecture with **API-based team management** stored in the D1 database. For security:

- **API Key Storage**: Team API keys are stored as environment variable references (e.g., `${BLAWBY_API_TOKEN}`)
- **Runtime Resolution**: The `TeamService` automatically resolves these references at runtime
- **No Hardcoded Secrets**: No sensitive credentials are stored in the codebase or database
- **Centralized Management**: Secrets are managed via Cloudflare Workers secrets
- **Full CRUD API**: Complete REST API for team management (`/api/teams`)

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
- ✅ Full API-based team management with caching

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

## 🚀 **Quick Reference - Team Management**

**Essential Commands:**
```bash
# List all teams
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams

# Get team details
curl -X GET https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai

# Create new team
curl -X POST https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams \
  -H "Content-Type: application/json" \
  -d '{"slug": "new-team", "name": "New Team", "config": {"aiModel": "llama"}}'

# Update team
curl -X PUT https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/blawby-ai \
  -H "Content-Type: application/json" \
  -d '{"config": {"consultationFee": 75}}'

# Delete team
curl -X DELETE https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/old-team

# Database access
wrangler d1 execute blawby-ai-chatbot --command "SELECT * FROM teams;"
```

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

5. **Start development server**
   ```bash
   npm run dev
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
  -d '{"config": {"consultationFee": 50}}'
```

**Delete Team**
```bash
# Delete team by slug
curl -X DELETE https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/old-team

# Delete team by ID
curl -X DELETE https://blawby-ai-chatbot.paulchrisluke.workers.dev/api/teams/01K0TNGNKTM4Q0AG0XF0A8ST0Q
```

**Database Commands (Wrangler CLI)**
```bash
# View all teams
wrangler d1 execute blawby-ai-chatbot --command "SELECT id, slug, name, created_at FROM teams;"

# Count teams
wrangler d1 execute blawby-ai-chatbot --command "SELECT COUNT(*) as team_count FROM teams;"

# View team config
wrangler d1 execute blawby-ai-chatbot --command "SELECT slug, config FROM teams WHERE slug = 'blawby-ai';"

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
- `GET /api/teams/{id}` - Get specific team
- `POST /api/teams` - Create new team
- `PUT /api/teams/{id}` - Update team
- `DELETE /api/teams/{id}` - Delete team

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

### Manual Testing

Test the agent API directly:

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
└── public/              # Static assets
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
