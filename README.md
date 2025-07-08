Here’s a cleaned-up version of your README with redundancy removed, sections reorganized slightly for clarity, and improved brevity while preserving all critical details:

---

# Preact Cloudflare Intake Chatbot

A full-featured, open-source **ChatGPT-like legal assistant**, built with Preact and powered by Cloudflare Workers AI, D1, and KV. Designed for self-hosting, extensibility, and privacy-first deployments.

**Live Demo:** [ai.blawby.com](https://ai.blawby.com)
**Repo:** [GitHub](https://github.com/pcl-labs/preact-cloudflare-intake-chatbot)

---

## ✨ Features

* Lightweight **Preact** chat UI
* **Cloudflare Workers AI** backend (Llama 3.1 8B)
* **D1 Database** for chat data and team configs
* **KV Namespace** for sessions
* **R2 Storage** for file uploads (planned)
* **Team-based configuration** with scheduling and payment
* **API-first design** with optional bundled UI
* **Self-hostable**, **privacy-first**, **production-ready**

---

## 🏗️ Architecture

* **Frontend**: Preact SPA (`src/`) — embeddable widget with media & scheduling
* **Backend**: Cloudflare Worker (`worker/`) — REST API, AI, D1, KV, R2
* **Storage**: Cloudflare D1 (DB), KV (session/cache), R2 (uploads)

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js v18+
* Cloudflare account
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
# Optional: wrangler r2 bucket create your-ai-files
wrangler d1 execute your-ai-chatbot --file worker/schema.sql
wrangler login
```

### 4. Enable Remote Bindings (Local Dev)

Add `experimental_remote = true` to your `wrangler.toml` bindings:

```toml
[[d1_databases]]
binding = "DB"
...
experimental_remote = true

[[kv_namespaces]]
binding = "CHAT_SESSIONS"
...
experimental_remote = true
```

Start the backend:

```bash
wrangler dev --x-remote-bindings
```

### 5. Run Frontend

```bash
npm run dev
```

* Frontend: [http://localhost:5173](http://localhost:5173)
* Backend API: [http://localhost:8787](http://localhost:8787)

---

## 🧪 Testing

### API

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/teams
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

### Frontend

Visit [http://localhost:5173](http://localhost:5173) and test the UI.

Use the dev script for full-stack setup:

```bash
./scripts/dev.sh
```

---

## 💳 Payment Integration

* Each team can define:

  * `requiresPayment` (bool)
  * `consultationFee` (in USD)
  * `paymentLink` (e.g., Stripe URL)
* Payment flow:

  1. User submits form
  2. System checks `requiresPayment`
  3. If true: user is shown `consultationFee` and `paymentLink`
  4. Form data is stored; email is sent

*Note: No payment verification—handled externally via link.*

---

## 🌐 Deployment

### GitHub Actions (Recommended)

Set GitHub repo secrets:

* `CLOUDFLARE_API_TOKEN`
* `CLOUDFLARE_ACCOUNT_ID`
* `CLOUDFLARE_PAGES_PROJECT_NAME`

Actions will:

1. Lint & type-check
2. Build frontend
3. Deploy backend & frontend
4. Sync team config to D1

### Environment Setup

```bash
cp env.example .env
```

Required variables:

* `CLOUDFLARE_API_TOKEN`
* `CLOUDFLARE_ACCOUNT_ID`
* `RESEND_API_KEY`
* `VITE_API_BASE_URL`

### Manual Deployment

#### Backend

```bash
wrangler deploy
# or for prod:
wrangler deploy --env production
```

To use a custom domain:

```toml
[env.production]
routes = [
  { pattern = "yourdomain.com/api/*", zone_name = "yourdomain.com" }
]
```

#### Frontend

```bash
npm run build
# Deploy to Cloudflare Pages, Netlify, Vercel, etc.
```

---

## 🔒 Security Notes

* Do **not** commit:

  * `wrangler.toml`
  * `.wrangler/`
* Always use `wrangler.template.toml` as a base

---

## 🔧 Production Status

| Component      | Status                                   |
| -------------- | ---------------------------------------- |
| Backend        | ✅ Live                                   |
| AI Integration | ✅ Llama 3.1 8B                           |
| Custom Domain  | ✅ [ai.blawby.com](https://ai.blawby.com) |
| Team Configs   | ✅ Multiple teams supported               |
| D1 + KV        | ✅ Configured                             |

**API Endpoints**

* `/api/health`
* `/api/teams`
* `/api/chat`

---

## 🧠 Team Configuration (`teams.json`)

Manage law firm team configs via JSON:

```json
{
  "id": "demo",
  "name": "Blawby Demo",
  "config": {
    "consultationFee": 0,
    "requiresPayment": false,
    "paymentLink": null,
    "introMessage": "Hello! I'm your AI legal assistant.",
    ...
  }
}
```

| Field             | Type    | Description                       |
| ----------------- | ------- | --------------------------------- |
| `id`              | string  | Unique team ID                    |
| `name`            | string  | Display name                      |
| `consultationFee` | number  | Fee in USD                        |
| `requiresPayment` | boolean | Require payment before intake     |
| `paymentLink`     | string  | Link to payment page              |
| `introMessage`    | string  | Optional welcome message          |
| `profileImage`    | string  | Optional logo URL                 |
| `availableServices` | array  | List of practice areas            |
| `serviceQuestions` | object | Practice area-specific questions  |
| ...               |         | Other branding and service config |

To sync teams:

```bash
node sync-teams.js
```

* Full sync: removes entries not in the JSON
* Uses `id` to upsert records

---

## 🤖 AI-Powered Follow-Up Questions

The chatbot now includes **practice area-specific follow-up questions** that are automatically triggered when a user selects a service. This creates a more intelligent and targeted intake process.

### How It Works

1. **Service Selection**: User clicks on a practice area (e.g., "Family Law")
2. **AI Questions**: System asks 3-5 targeted questions specific to that practice area
3. **Enhanced Intake**: Answers are collected and included in the final case summary
4. **Better Matching**: Attorneys receive more detailed case information

### Configuration

Add `serviceQuestions` to your team config:

```json
{
  "id": "family-law-firm",
  "config": {
    "availableServices": ["Family Law", "Divorce", "Custody"],
    "serviceQuestions": {
      "Family Law": [
        "What specific family law issue are you dealing with?",
        "Are there any children involved in this situation?",
        "Have you already filed any legal documents?",
        "What is your current living situation?"
      ],
      "Divorce": [
        "How long have you been married?",
        "Do you have any children together?",
        "Have you discussed divorce with your spouse?",
        "What are the main issues you need to resolve?"
      ]
    }
  }
}
```

### Question Flow

1. **Service Selection** → User picks practice area
2. **AI Questions** → System asks targeted questions one by one
3. **Answer Collection** → Each answer is stored with the question
4. **Summary** → All answers are compiled into a comprehensive case summary
5. **Contact Form** → Enhanced data is passed to the contact form

### Benefits

* **More Relevant**: Questions are tailored to specific practice areas
* **Better Data**: Attorneys receive detailed, structured information
* **Improved Matching**: Better attorney-client pairing based on case details
* **Professional**: Creates a more sophisticated intake experience

### Fallback

If no `serviceQuestions` are configured for a service, the system falls back to the generic case description flow.

---

## 📚 Resources

* [Architecture Plan](./intake_form_chatbot_plan.md)
* [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
* [Preact](https://preactjs.com/)
* [D1](https://developers.cloudflare.com/d1/)
* [KV](https://developers.cloudflare.com/kv/)
* [Remote Bindings Changelog](https://developers.cloudflare.com/changelog/2025-06-18-remote-bindings-beta/)

---

## 🤝 Contributing

Contributions welcome via issues and PRs:
[github.com/pcl-labs/preact-cloudflare-intake-chatbot](https://github.com/pcl-labs/preact-cloudflare-intake-chatbot)

---

## 🛡 License

MIT — See [LICENSE](./LICENSE)

---

## 🧑‍💻 Maintainers

* [@pcl-labs](https://github.com/pcl-labs)
* [@paulchrisluke](https://github.com/paulchrisluke)

---

Let me know if you'd like this exported as a cleaned-up file or reformatted in a particular style (e.g., markdown collapsibles, condensed version, etc.).
