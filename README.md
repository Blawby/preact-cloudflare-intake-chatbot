# Preact Cloudflare Intake Chatbot

A full-featured, open-source **ChatGPT-like legal assistant** built with Preact and powered by Cloudflare Workers AI, D1, and KV. This project is designed for easy self-hosting, extensibility, and privacy-first deployments.

**Live Demo:** [ai.blawby.com](https://ai.blawby.com)  
**Repo:** [github.com/pcl-labs/preact-cloudflare-intake-chatbot](https://github.com/pcl-labs/preact-cloudflare-intake-chatbot)

---

## ✨ Features

- **Preact-based** chat UI (tiny, fast, accessible)
- **Cloudflare Workers AI** backend (Llama 3.1 8B, etc.)
- **D1 Database** for conversations, teams, appointments
- **KV Namespace** for session management
- **R2 Storage** for file uploads (planned)
- **Scheduling and payment integration**
- **Team-specific configuration**
- **API-first**: Easily connect your own frontend or use the included Preact UI
- **Open source, privacy-first, and self-hostable**
- **Production-ready** with custom domain support

---

## 🏗️ Architecture

- **Frontend**: Preact SPA (src/) — embeddable, widget/inline, media & scheduling support
- **Backend**: Cloudflare Worker (worker/) — REST API, AI, D1, KV, R2
- **Database**: Cloudflare D1 (schema in `worker/schema.sql`)
- **Session/Cache**: Cloudflare KV
- **File Storage**: Cloudflare R2 (optional)

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Cloudflare account](https://dash.cloudflare.com/) (for backend)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

### 2. Clone & Install
```bash
git clone https://github.com/pcl-labs/preact-cloudflare-intake-chatbot.git
cd preact-cloudflare-intake-chatbot
npm install
```

### 3. Configure Cloudflare (Backend)
- Copy `wrangler.template.toml` to `wrangler.toml` and update with your own resource IDs:
  ```bash
  cp wrangler.template.toml wrangler.toml
  ```
- Create resources if needed:
  ```bash
  wrangler d1 create your-ai-chatbot
  wrangler kv namespace create "YOUR_AI_CHAT_SESSIONS"
  wrangler kv namespace create "YOUR_AI_CHAT_SESSIONS" --preview
  # (Optional) wrangler r2 bucket create your-ai-files
  ```
- Apply the schema:
  ```bash
  wrangler d1 execute your-ai-chatbot --file worker/schema.sql
  ```
- Log in to Cloudflare:
  ```bash
  wrangler login
  ```

### 4. Use Cloudflare Remote Bindings for Local Dev (D1/KV/R2)

> **New!** Cloudflare now supports remote bindings for local development. This allows your local Worker to connect to your real, deployed D1, KV, and R2 resources, so you can test against production-like data and services without deploying every time. ([Changelog](https://developers.cloudflare.com/changelog/2025-06-18-remote-bindings-beta/))

- In your `wrangler.toml`, add `experimental_remote = true` to each D1, KV, or R2 binding:

```toml
[[d1_databases]]
binding = "DB"
database_name = "your-ai-chatbot"
database_id = "your-d1-database-id"
experimental_remote = true

[[kv_namespaces]]
binding = "CHAT_SESSIONS"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"
experimental_remote = true
```

- Start your Worker with remote bindings:

```bash
wrangler dev --x-remote-bindings
```

- Your Worker will now use the real D1, KV, and R2 resources from your Cloudflare account during local development.

---

### 5. Run the Backend Locally
```bash
wrangler dev --x-remote-bindings
```
- The Worker API will be available at [http://localhost:8787](http://localhost:8787)
- Test endpoints:
  - `GET /api/health`
  - `GET /api/teams`
  - `POST /api/chat`

### 6. Run the Frontend Locally
```bash
npm run dev
```
- The frontend will be available at [http://localhost:5173](http://localhost:5173)
- By default, the frontend expects the API at `/api/` (proxy or CORS may be needed for local dev)

---

## 🧪 Testing

### API Testing
You can use `curl` or any API client (e.g. Postman) to test the backend:
```bash
curl -X GET http://localhost:8787/api/health
curl -X GET http://localhost:8787/api/teams
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

### Frontend Testing
- Open [http://localhost:5173](http://localhost:5173) in your browser
- Use the chat UI, file upload, and scheduling features
- The frontend will call the deployed API at `https://blawby-ai-chatbot.paulchrisluke.workers.dev`

### Quick Development Setup
Use the development script to start both frontend and backend:
```bash
./scripts/dev.sh
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:8787

To switch between local and deployed API, edit `src/config/api.ts` and change `API_MODE` to `'local'` or `'deployed'`.

### 🎯 Demo URLs

Test the chatbot with different team configurations:

- **Blawby Demo (Free)**: `http://localhost:5173/?teamId=demo`
- **North Carolina Legal Services ($75)**: `http://localhost:5173/?teamId=north-carolina-legal-services`

Each team has different consultation fees and specialties. The AI responses are tailored to each team's configuration.

### 💳 Payment Integration

The chatbot supports team-specific payment requirements:

- **Payment Configuration**: Teams can be configured with `requiresPayment: true/false` and `consultationFee`
- **Payment Links**: Teams can specify payment links (e.g., Stripe Checkout URLs)
- **Conversational Flow**: After form submission, users are conversationally informed about payment requirements
- **Payment Explanation**: For teams requiring payment, users receive a clear explanation of fees and payment links

**Payment Flow:**
1. User submits contact form with email, phone, and case details
2. System checks team payment requirements
3. If payment required: Shows fee amount and payment link with explanation
4. If no payment required: Shows standard confirmation message
5. Form data is stored in database and email notifications are sent

**Note**: This system uses payment links (no webhook integration). Payment verification must be handled externally.

---

## 🌐 Deployment

### GitHub Actions (Recommended)

The project includes GitHub Actions for automated deployment. Set up these secrets in your GitHub repository:

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID  
- `CLOUDFLARE_PAGES_PROJECT_NAME` - Your Cloudflare Pages project name

The workflow will automatically:
1. Type check and lint the code
2. Build the frontend
3. Deploy the backend worker
4. Sync team configurations to the database
5. Deploy the frontend to Cloudflare Pages

### Environment Variables

Copy `env.example` to `.env` and update with your actual values:

```bash
cp env.example .env
```

**Required Environment Variables:**

**Cloudflare Configuration:**
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

**Email Configuration:**
- `RESEND_API_KEY` - Your Resend API key for email notifications

**Frontend Configuration:**
- `VITE_API_BASE_URL` - Your deployed worker URL

**GitHub Actions (if using automated deployment):**
- `CLOUDFLARE_PAGES_PROJECT_NAME` - Your Cloudflare Pages project name

### Manual Deployment

#### Deploy the Worker
```bash
# Deploy to default environment
wrangler deploy

# Deploy to production environment (if configured)
wrangler deploy --env production
```
- Your API will be live at `https://<your-worker>.<your-account>.workers.dev/`
- You can map a custom domain via Cloudflare dashboard or `wrangler.toml`

#### Custom Domain Setup
1. **Configure DNS**: In your Cloudflare DNS settings, create a CNAME record pointing to your Worker
2. **Set Proxy Status**: Ensure the DNS record is set to **Proxied** (orange cloud), not "DNS only"
3. **Configure Routes**: Add custom domain routes in your `wrangler.toml`:
   ```toml
   [env.production]
   name = "your-worker-name"
   routes = [
     { pattern = "your-domain.com/api/*", zone_name = "your-domain.com" }
   ]
   ```
4. **Deploy**: Run `wrangler deploy --env production`

#### Deploy the Frontend
- Build the frontend:
  ```bash
  npm run build
  ```
- Deploy to your preferred static host (Cloudflare Pages, Vercel, Netlify, etc.)

---

## 🔧 Production Status

✅ **Backend**: Cloudflare Worker deployed and operational  
✅ **AI Integration**: Llama 3.1 8B model working  
✅ **Custom Domain**: [ai.blawby.com](https://ai.blawby.com) live  
✅ **API Endpoints**: All endpoints responding correctly  
✅ **Team Configuration**: Multiple teams with different pricing  
✅ **Database**: D1 and KV bindings configured  

**Live API Endpoints:**
- Health: `https://ai.blawby.com/api/health`
- Teams: `https://ai.blawby.com/api/teams`
- Chat: `https://ai.blawby.com/api/chat`

---

## 🔒 Security Notes

**⚠️ Important:** This repository contains sensitive configuration files that should not be committed to version control:

- `wrangler.toml` - Contains your Cloudflare resource IDs and account information
- `.wrangler/` - Contains local development state and cached data

These files are automatically ignored by `.gitignore`. Always use `wrangler.template.toml` as a starting point and never commit your actual `wrangler.toml` file.

### Project Structure (For Reference Only)
- **Frontend**: `blawby-ai-chatbot-frontend` → `ai.blawby.com`
- **Backend**: `blawby-ai-chatbot` → API endpoints
- **Original**: `preact-chat-gpt-interface` → `chat.blawby.com` (separate project)

---

## 📚 Documentation & Community
- [Project Plan & Architecture](./intake_form_chatbot_plan.md)
- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Preact Docs](https://preactjs.com/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [KV Docs](https://developers.cloudflare.com/kv/)
- [Cloudflare Remote Bindings Changelog](https://developers.cloudflare.com/changelog/2025-06-18-remote-bindings-beta/)

---

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests on [github.com/pcl-labs/preact-cloudflare-intake-chatbot](https://github.com/pcl-labs/preact-cloudflare-intake-chatbot).

---

## 🛡️ License

MIT License. See [LICENSE](./LICENSE).

---

## 📝 Maintainers
- [@pcl-labs](https://github.com/pcl-labs)
- [@paulchrisluke](https://github.com/paulchrisluke)

## Team Management (teams.json)

You can manage all law firm teams and their configuration in a single JSON file:

```json
[
  {
    "id": "demo",
    "name": "Blawby Demo",
    "config": {
      "aiModel": "llama",
      "consultationFee": 0,
      "requiresPayment": false,
      "ownerEmail": "paulchrisluke@gmail.com",
      "availableServices": ["general-consultation", "legal-advice"],
      "domain": "demo.blawby.com",
      "description": "Demo law firm for testing purposes",
      "paymentLink": null,
      "brandColor": "#2563eb",
      "accentColor": "#3b82f6",
      "introMessage": "Hello! I'm your AI legal assistant. I'm here to help you get started with your legal questions and can assist with general consultation and legal advice. How can I help you today?",
      "profileImage": "https://api.cloudflare.com/client/v4/accounts/fa3dc6c06433f6b0ea78d95bce23ad91/images/v1/27bc2bf2-8582-4ed1-e77c-45d7a3215b00"
    }
  },
  {
    "id": "north-carolina-legal-services",
    "name": "North Carolina Legal Services",
    "config": {
      "aiModel": "llama",
      "consultationFee": 75,
      "requiresPayment": true,
      "ownerEmail": "paulchrisluke@gmail.com",
      "availableServices": [
        "Family Law",
        "Small Business and Nonprofits",
        "Employment Law",
        "Tenant Rights Law",
        "Probate and Estate Planning",
        "Special Education and IEP Advocacy"
      ],
      "domain": "northcarolinalegalservices.blawby.com",
      "description": "Affordable, comprehensive legal services for North Carolina",
      "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500",
      "brandColor": "#059669",
      "accentColor": "#10b981",
      "introMessage": "Welcome to North Carolina Legal Services! I'm here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you schedule a consultation with our experienced attorneys. How can I assist you today?",
      "profileImage": null
    }
  }
]
```

### Team Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique team identifier |
| `name` | string | Display name for the law firm |
| `config.aiModel` | string | AI model to use (e.g., "llama") |
| `config.consultationFee` | number | Consultation fee in dollars (0 for free) |
| `config.requiresPayment` | boolean | Whether payment is required before consultation |
| `config.ownerEmail` | string | Email for lead notifications |
| `config.availableServices` | string[] | Array of practice areas |
| `config.domain` | string | Custom domain for the team |
| `config.description` | string | Team description |
| `config.paymentLink` | string | Payment link URL (e.g. Stripe Checkout) - required if `requiresPayment: true` |
| `config.brandColor` | string | Primary brand color in hex format (e.g., "#2563eb") |
| `config.accentColor` | string | Secondary accent color in hex format (e.g., "#3b82f6") |
| `config.introMessage` | string | Custom welcome message displayed when chat starts (optional) |
| `config.profileImage` | string | URL to team's profile/logo image (optional, defaults to Blawby logo) |

### Payment Configuration

Teams can configure payment requirements and links:

- **Free consultations**: Set `consultationFee: 0` and `requiresPayment: false`
- **Paid consultations**: Set `consultationFee` to the amount in dollars and `requiresPayment: true`
- **Payment links**: Provide a `paymentLink` URL (e.g., Stripe Checkout) for paid teams

### Intro Message Configuration

Teams can customize the initial welcome message displayed when users start a chat:

- **Custom intro**: Set `introMessage` to display a personalized welcome message
- **Default fallback**: If no `introMessage` is provided, a generic friendly message is shown
- **Branding opportunity**: Use this to introduce your firm, mention practice areas, and set expectations

Example intro messages:
- "Welcome to [Firm Name]! I'm here to help with [practice areas]. How can I assist you today?"
- "Hello! I'm your AI legal assistant at [Firm Name]. I can answer questions and help schedule consultations."

### Profile Image Configuration

Teams can set their own profile/logo image for branding:

- **Custom logo**: Set `profileImage` to a URL pointing to your team's logo
- **Default fallback**: If no `profileImage` is provided or set to `null`, the Blawby logo is used
- **Image requirements**: Use high-quality images (recommended: 200x200px or larger, PNG/JPG)
- **Local files**: Place images in the `public/` directory and reference with `/filename.png`
- **External URLs**: Use direct URLs to publicly accessible images

Example profile image configurations:
- Local file: `"profileImage": "/team-logo.png"`
- External URL: `"profileImage": "https://yourdomain.com/logo.png"`
- No image: `"profileImage": null` (uses default Blawby logo)

- Edit `teams.json` to add or update teams.
- The `ownerEmail` field is used for lead notification emails.

### Syncing Teams to D1

Use the provided script to sync (insert/update/delete) all teams in the JSON to your production D1 database:

```sh
node sync-teams.js
```

- This script performs **full DRY REST sync** - it will delete teams from the database that are not present in the JSON
- The D1 database will always match your `teams.json` file exactly
- Teams are upserted (inserted or updated) based on their `id`

---
