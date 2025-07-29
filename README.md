# Preact Chat GPT Interface

A modern, responsive chat interface built with Preact, designed for legal intake and consultation workflows. This application integrates with Cloudflare Workers AI for intelligent conversation handling and matter creation.

## 🚀 **Recent Updates - Cloudflare Agents & Prompt Chaining**

### ✅ **Successfully Implemented:**

- **Cloudflare Agents Framework**: Replaced complex custom API with modular agent architecture
- **Prompt Chaining**: Implemented Anthropic patterns for routing and workflow management
- **Native AI Bindings**: Using `env.AI` directly (removed deprecated `@cloudflare/ai` package)
- **Human-in-the-Loop**: Automatic lawyer approval for complex legal matters
- **Simplified Frontend**: Single `/api/agent` endpoint handles all workflows

### 🏗️ **Architecture:**

```
Frontend → /api/agent → Prompt Chain Orchestrator → Specialized Chains → Actions
```

**Chain Components:**
- **Router Chain**: Determines workflow (GENERAL_INQUIRY, MATTER_CREATION, SCHEDULING, etc.)
- **Intent Chain**: Classifies user intent and extracts key information
- **Info Gathering Chain**: Collects client information systematically
- **Quality Assessment Chain**: Evaluates completeness and quality
- **Action Decision Chain**: Determines next actions (lawyer approval, scheduling, etc.)

### 🧪 **Test Results:**

✅ **Divorce Matter Creation**: "im getting a divorce" → MATTER_CREATION workflow  
✅ **General Inquiry**: "what are my rights?" → GENERAL_INQUIRY workflow  
✅ **Scheduling**: "I want to schedule a consultation" → SCHEDULING workflow  

### 📊 **Benefits Achieved:**

- **Simplified Codebase**: Removed 400+ lines of complex matter creation logic
- **Modular Design**: Each chain has a single responsibility
- **Better Testing**: Each chain can be tested independently
- **Human-in-the-Loop**: Automatic lawyer approval for complex cases
- **Scalable**: Easy to add new workflows and chains

## 🛠️ **Technology Stack**

- **Frontend**: Preact, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, D1 Database, KV Storage, R2 Object Storage
- **AI**: Cloudflare Workers AI (Llama 3.1 8B)
- **Deployment**: Cloudflare Workers, GitHub Actions
- **Development**: Vite, Wrangler CLI

## 🏗️ **Architecture**

The application follows a modern, serverless architecture:

- **Frontend**: Single-page application with responsive design
- **Backend**: Cloudflare Workers with AI integration
- **Database**: Cloudflare D1 for persistent data
- **Storage**: Cloudflare R2 for file uploads
- **Caching**: Cloudflare KV for session management
- **AI**: Cloudflare Workers AI for intelligent responses
- **Security**: OWASP-compliant security headers and validation

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

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

Test the agent API directly:

```bash
curl -X POST https://your-worker.workers.dev/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "I need help with a divorce"}],
    "teamId": "your-team-id",
    "sessionId": "test-session"
  }'
```

## 📁 **Project Structure**

```
├── src/                    # Frontend source code
│   ├── components/        # React/Preact components
│   ├── config/           # Configuration files
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── worker/               # Cloudflare Worker backend
│   ├── chains/          # Prompt chaining logic
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   └── utils/           # Backend utilities
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

- File upload size limits (10MB max)
- Content-type validation
- Rate limiting (60 requests/minute)
- Input sanitization

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
| Security Headers | ✅ OWASP Compliant | Comprehensive security |
| Error Handling | ✅ Structured Logging | Centralized error management |
| Request Validation | ✅ Size & Content Type Checks | Input sanitization |
| Rate Limiting | ✅ 60 req/min | Burst protection |
| CORS | ✅ Configured | Cross-origin support |
| Monitoring | ✅ Health Checks | Deployment verification |

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

- **Documentation**: Check the [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed architecture information
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

---

**Built with ❤️ using Cloudflare Workers and Preact**
