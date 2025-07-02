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
- Copy `wrangler.toml` and update with your own D1, KV, and (optionally) R2 resource IDs.
- Create resources if needed:
  ```bash
  wrangler d1 create blawby-ai-chatbot
  wrangler kv namespace create "BLAWBY_AI_CHAT_SESSIONS"
  wrangler kv namespace create "BLAWBY_AI_CHAT_SESSIONS" --preview
  # (Optional) wrangler r2 bucket create blawby-ai-files
  ```
- Apply the schema:
  ```bash
  wrangler d1 execute blawby-ai-chatbot --file worker/schema.sql
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
database_name = "blawby-ai-chatbot"
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
- The frontend will call the backend API for chat and team info

### 🎯 Demo URLs

Test the chatbot with different team configurations:

- **Demo Team (Free)**: `http://localhost:5173/?teamId=demo`
- **Test Law Firm ($150)**: `http://localhost:5173/?teamId=test-team`
- **Family Law Specialists ($200)**: `http://localhost:5173/?teamId=family-law-team`
- **Criminal Defense ($300)**: `http://localhost:5173/?teamId=criminal-defense-team`

Each team has different consultation fees and specialties. The AI responses are tailored to each team's configuration.

---

## 🌐 Deployment

### Deploy the Worker
```bash
# Deploy to default environment
wrangler deploy

# Deploy to production environment (if configured)
wrangler deploy --env production
```
- Your API will be live at `https://<your-worker>.<your-account>.workers.dev/`
- You can map a custom domain via Cloudflare dashboard or `wrangler.toml`

### Custom Domain Setup
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

### Deploy the Frontend
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
