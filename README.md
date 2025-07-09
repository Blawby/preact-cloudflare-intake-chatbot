Here’s a cleaned-up version of your README with redundancy removed, sections reorganized slightly for clarity, and improved brevity while preserving all critical details:

---

# Preact Cloudflare Intake Chatbot

A full-featured, open-source **ChatGPT-like legal assistant**, built with Preact and powered by Cloudflare Workers AI, D1, and KV. Designed for self-hosting, extensibility, and privacy-first deployments.

**Live Demo:** [ai.blawby.com](https://ai.blawby.com)  
**Repo:** [GitHub](https://github.com/pcl-labs/preact-cloudflare-intake-chatbot)

---

## ✨ Features

* **Lightweight Preact Chat UI** - Fast, responsive interface with ~40KB gzipped bundle
* **Cloudflare Workers AI Backend** - Llama 3.1 8B for conversational AI
* **Intelligent Case Building** - Guided conversation flow for legal intake
* **Team-Based Configuration** - Multi-tenant support with custom branding
* **Practice Area-Specific Questions** - Tailored intake forms per legal service
* **D1 Database** - Persistent storage for conversations and case data
* **KV Namespace** - Session management and caching
* **API-First Design** - RESTful endpoints for easy integration
* **Self-Hostable** - Complete ownership of your data and infrastructure
* **Privacy-First** - GDPR-compliant with no external tracking

---

## 🎯 Core Workflow

Your chatbot follows a **structured intake process** that maximizes lead quality:

1. **🤖 AI Conversation** - Natural language interaction to understand client needs
2. **📋 Case Building** - Guided service selection and practice area-specific questions
3. **📝 Case Details** - Comprehensive case description and situation analysis
4. **✅ Quality Assessment** - Real-time feedback on case completeness
5. **📞 Contact Collection** - Seamless transition to attorney connection
6. **💳 Payment Processing** - Optional consultation fee collection
7. **📅 Scheduling** - Automated appointment booking system

---

## 🏗️ Architecture

* **Frontend**: Preact SPA (`src/`) — Embeddable widget with media & scheduling
* **Backend**: Cloudflare Worker (`worker/`) — AI, D1, KV, email integration
* **Storage**: D1 Database (conversations, teams, cases), KV (sessions, cache)
* **AI**: Cloudflare Workers AI with Llama 3.1 8B model
* **Email**: Resend API for notifications and confirmations
* **Optional**: R2 for file uploads (planned)

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js v18+
* Cloudflare account with Workers AI access
* Wrangler CLI: `npm install -g wrangler`

### 2. Clone & Install

```bash
git clone https://github.com/pcl-labs/preact-cloudflare-intake-chatbot.git
cd preact-cloudflare-intake-chatbot
npm install
```

### 3. Configure Cloudflare

```bash
cp wrangler.template.toml wrangler.toml
wrangler d1 create your-ai-chatbot
wrangler kv namespace create "YOUR_AI_CHAT_SESSIONS"
wrangler kv namespace create "YOUR_AI_CHAT_SESSIONS" --preview
wrangler d1 execute your-ai-chatbot --file worker/schema.sql
```

### 4. Environment Variables

```bash
cp env.example .env
```

Set these variables:
* `CLOUDFLARE_API_TOKEN` - For deployments
* `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
* `RESEND_API_KEY` - For email notifications
* `VITE_API_BASE_URL` - Frontend API endpoint

### 5. Development

Enable remote bindings for local development:

```toml
# In wrangler.toml
[[d1_databases]]
binding = "DB"
experimental_remote = true

[[kv_namespaces]]
binding = "CHAT_SESSIONS"
experimental_remote = true
```

Start both backend and frontend:

```bash
# Terminal 1: Backend
wrangler dev --x-remote-bindings

# Terminal 2: Frontend
npm run dev
```

* Frontend: [http://localhost:5173](http://localhost:5173)
* Backend API: [http://localhost:8787](http://localhost:8787)

---

## 🧠 Team Configuration

Configure your law firm teams via `teams.json`:

```json
{
  "id": "family-law-firm",
  "name": "Smith & Associates Family Law",
  "config": {
    "consultationFee": 150,
    "requiresPayment": true,
    "paymentLink": "https://buy.stripe.com/your-payment-link",
    "ownerEmail": "admin@smithlaw.com",
    "introMessage": "Hello! I'm here to help with your family law matter.",
    "profileImage": "https://example.com/logo.png",
    "availableServices": ["Family Law", "Divorce", "Child Custody", "Adoption"],
    "serviceQuestions": {
      "Family Law": [
        "What specific family law issue are you dealing with?",
        "Are there any children involved in this situation?",
        "Have you already filed any legal documents?",
        "What is your current relationship status?"
      ],
      "Divorce": [
        "How long have you been married?",
        "Do you have children together?",
        "Have you discussed divorce with your spouse?",
        "What are the main issues you need to resolve?"
      ]
    }
  }
}
```

### Key Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `availableServices` | array | Practice areas for service selection |
| `serviceQuestions` | object | Practice area-specific intake questions |
| `requiresPayment` | boolean | Enable consultation fee collection |
| `consultationFee` | number | Fee amount in USD |
| `paymentLink` | string | Stripe or other payment processor URL |
| `ownerEmail` | string | Admin email for new lead notifications |
| `introMessage` | string | Custom welcome message |
| `profileImage` | string | Team logo URL |

Sync teams to database:

```bash
node sync-teams.js
```

---

## 🤖 Case Creation Flow

The system provides an **intelligent case building process** that guides users through structured data collection:

### Step-by-Step Process

1. **Service Selection** → User chooses practice area
2. **Practice Area Questions** → Tailored questions for the selected service
3. **Case Details** → Comprehensive situation description
4. **Quality Assessment** → Real-time feedback on case completeness
5. **Contact Collection** → Seamless transition to attorney connection

### API Endpoints

#### Case Creation Flow
```bash
POST /api/case-creation
```

**Service Selection:**
```json
{
  "teamId": "family-law-firm",
  "step": "service-selection"
}
```

**Practice Area Questions:**
```json
{
  "teamId": "family-law-firm",
  "step": "questions",
  "service": "Family Law",
  "currentQuestionIndex": 0,
  "answers": {
    "What specific family law issue are you dealing with?": "Child custody dispute"
  }
}
```

**Case Details:**
```json
{
  "teamId": "family-law-firm",
  "step": "case-details",
  "service": "Family Law",
  "description": "I need help with a custody modification...",
  "answers": {...}
}
```

### Quality Assessment

Each step includes a **quality score** that helps users understand case completeness:

```json
{
  "step": "questions",
  "message": "Thank you for that information...",
  "quality": {
    "score": 65,
    "suggestions": [
      "Answer all practice area questions",
      "Provide specific details about timing"
    ],
    "readyForLawyer": false
  }
}
```

---

## 📊 API Reference

### Chat Endpoint
```bash
POST /api/chat
```

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "I need help with a business contract"}
  ],
  "teamId": "business-law-firm",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "I can help you with contract review...",
  "intent": "new_case",
  "shouldStartCaseCreation": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Forms Endpoint
```bash
POST /api/forms
```

**Request:**
```json
{
  "email": "client@example.com",
  "phoneNumber": "555-0123",
  "caseDetails": "Contract review needed for vendor agreement",
  "teamId": "business-law-firm"
}
```

### Teams Endpoint
```bash
GET /api/teams
```

Returns all configured teams with their settings.

### Scheduling Endpoint
```bash
POST /api/scheduling
```

**Request:**
```json
{
  "teamId": "family-law-firm",
  "email": "client@example.com",
  "preferredDate": "2024-01-20",
  "preferredTime": "10:00 AM",
  "caseType": "Family Law",
  "notes": "Child custody consultation"
}
```

---

## 🌐 Deployment

### GitHub Actions (Recommended)

Set repository secrets:
* `CLOUDFLARE_API_TOKEN`
* `CLOUDFLARE_ACCOUNT_ID`
* `CLOUDFLARE_PAGES_PROJECT_NAME`

### Manual Deployment

**Backend:**
```bash
wrangler deploy
```

**Frontend:**
```bash
npm run build
wrangler pages deploy dist
```

### Custom Domain

Add to `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "yourdomain.com/api/*", zone_name = "yourdomain.com" }
]
```

---

## 🔧 Production Status

| Component | Status |
|-----------|---------|
| **Backend** | ✅ Production Ready |
| **AI Integration** | ✅ Llama 3.1 8B |
| **Case Creation** | ✅ Fully Functional |
| **Team Configuration** | ✅ Multi-tenant |
| **Email Notifications** | ✅ Resend Integration |
| **Scheduling** | ✅ Appointment Booking |
| **File Uploads** | ⏳ Planned (R2 integration) |
| **Payment Processing** | ⏳ External links only |

---

## 📈 Suggested Improvements

Based on code analysis, here are recommended enhancements:

### 🎯 High Priority

1. **Enhanced Case Quality Scoring**
   - Restore full AI-powered case analysis
   - Add progress tracking with visual indicators
   - Implement suggestion system for case improvement

2. **File Upload Integration**
   - R2 bucket configuration for document storage
   - Drag-and-drop file upload in chat interface
   - Document preview and management

3. **Advanced Payment Processing**
   - Stripe integration for direct payment collection
   - Payment verification before attorney connection
   - Automated payment status tracking

### 🔧 Medium Priority

4. **Session Management**
   - Persistent conversation history
   - Resume interrupted case creation flows
   - Better session timeout handling

5. **Email Template System**
   - Customizable email templates per team
   - Rich HTML email formatting
   - Automated follow-up sequences

6. **Analytics Dashboard**
   - Case completion rates
   - Lead quality metrics
   - Team performance insights

### 🌟 Long-term Enhancements

7. **CRM Integration**
   - Zapier webhook endpoints
   - Salesforce/HubSpot connectors
   - Custom API webhooks

8. **Advanced AI Features**
   - Document analysis with AI
   - Legal research integration
   - Automated case categorization

9. **Mobile Optimization**
   - Progressive Web App (PWA)
   - Native mobile app integration
   - Push notifications

---

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:8787/api/health

# Teams endpoint
curl http://localhost:8787/api/teams

# Chat endpoint
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I need legal help"}]}'

# Case creation
curl -X POST http://localhost:8787/api/case-creation \
  -H "Content-Type: application/json" \
  -d '{"teamId":"demo","step":"service-selection"}'
```

### Frontend Testing
```bash
# Development server
npm run dev

# Build test
npm run build

# Type checking
npm run type-check
```

---

## 📚 Resources

* [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
* [Preact Documentation](https://preactjs.com/)
* [D1 Database Guide](https://developers.cloudflare.com/d1/)
* [KV Storage Guide](https://developers.cloudflare.com/kv/)
* [Architecture Plan](./intake_form_chatbot_plan.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 🛡️ License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🧑‍💻 Maintainers

* [@pcl-labs](https://github.com/pcl-labs)
* [@paulchrisluke](https://github.com/paulchrisluke)

---

*Built with ❤️ using Cloudflare's edge computing platform*
