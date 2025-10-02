# Legal Intake Chatbot - Cloudflare Workers AI

A production-ready legal intake chatbot built with Cloudflare Workers AI, featuring intelligent conversation handling, step-by-step information collection, and automated matter creation with payment integration.

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account with Workers, D1, KV, and R2 access
- Wrangler CLI installed globally

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd preact-chat-gpt-interface
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your API keys
   ```

3. **Start development**
   ```bash
   npm run dev:full  # Both frontend and worker
   ```

4. **Deploy to Cloudflare**
   ```bash
   wrangler deploy
   ```

## 🎯 **Key Features**

- **🤖 AI-Powered Legal Intake**: Intelligent conversation handling with Cloudflare Workers AI
- **📋 Lead Qualification**: Smart filtering to ensure quality leads before contact collection
- **⚖️ Matter Classification**: Automatic legal issue categorization (Employment, Family, Personal Injury, etc.)
- **💰 Payment Integration**: Automated consultation fee collection with team configuration
- **👨‍💼 Human Review Queue**: Lawyer oversight for urgent/complex matters
- **📱 Mobile-First Design**: Responsive interface with modern UI/UX
- **📎 File Upload Support**: Photos, videos, audio, documents (25MB max) with camera capture
- **🔐 Authentication**: Google OAuth and email/password with Better Auth
- **🔒 Production Security**: OWASP-compliant headers and validation

## 🏗️ **Architecture**

```
Frontend (Preact) → Cloudflare Workers → AI Agent → Tool Handlers → Actions
```

**Core Components:**
- **Legal Intake Agent**: Self-contained AI with built-in memory and tool execution
- **Tool Handlers**: Modular functions for contact collection, matter creation, lawyer review
- **Team Configuration**: Dynamic payment and service configuration per team
- **Review Queue**: Human-in-the-loop system for lawyer oversight

## 🛠️ **Technology Stack**

- **Frontend**: Preact, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, D1 Database, KV Storage, R2 Object Storage
- **AI**: Cloudflare Workers AI (Llama 3.1 8B)
- **Auth**: Better Auth with Google OAuth & Email/Password
- **Deployment**: Cloudflare Workers

## 🧪 **Testing**

```bash
# Start development servers (required for tests)
npm run dev:full

# Run tests
npm run test:conversation  # Core AI functionality tests
npm test                   # All unit/integration tests
npm run test:watch         # Watch mode
npm run test:i18n          # Smoke test to confirm translations switch correctly
npm run lint:i18n          # Validate locale files stay in sync
```

## 📁 **Project Structure**

```
├── src/                    # Frontend (Preact + TypeScript)
│   ├── components/        # UI components
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── worker/               # Backend (Cloudflare Workers)
│   ├── agents/          # AI agent definitions
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── utils/           # Worker utilities
├── tests/               # Test files
└── public/              # Static assets
```

## 🔧 **Configuration**

### Environment Variables
Copy `.dev.vars.example` to `.dev.vars` and add your API keys:
- `BLAWBY_API_TOKEN` - Blawby services API key
- `LAWYER_SEARCH_API_KEY` - Lawyer search API key
- `CLOUDFLARE_API_TOKEN` - Cloudflare operations API key
- `RESEND_API_KEY` - Email notifications API key

### Internationalization

- The app boots with English (`en`) and supports Spanish (`es`) out of the box. Locale assets live in `src/locales/<locale>/<namespace>.json`.
- Use the Settings → General page to switch the UI language and to trigger auto-detection.
- Contributors can follow the workflow in `docs/i18n.md` to add new strings or locales.
- Run `npm run lint:i18n` before committing to make sure every locale contains the same keys as the English baseline.

### Team Management
Teams are managed via REST API:
```bash
# List teams
curl -X GET http://localhost:8787/api/teams

# Create team (requires admin token)
curl -X POST http://localhost:8787/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"slug": "new-team", "name": "New Team", "config": {"aiModel": "llama"}}'
```

## 🔒 **Security**

- OWASP-compliant security headers
- File upload validation (25MB max)
- Rate limiting (60 requests/minute)
- Input sanitization
- Secure session management with Better Auth

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using Cloudflare Workers AI and Preact**
