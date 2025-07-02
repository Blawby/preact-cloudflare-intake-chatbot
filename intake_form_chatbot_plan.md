# Intake Form Chatbot Plan - Enhanced ai.blawby.com

## Current State

### Existing Infrastructure
- **ai.blawby.com**: AI-powered legal assistant platform with 24/7 availability
- **Our Frontend**: Preact-based embeddable iframe with file upload, media handling, scheduling components
- **Integration**: URL parameters, team ID support, parent frame communication

### What We Have
- Basic consultation request system (date/time selection, confirmation flow)
- File upload and preview capabilities
- Media handling (audio, video, images)
- Widget/Inline display modes
- Parent frame communication via postMessage API

## What Needs to Be Built

### 1. Cloudflare Workers AI Backend
- [ ] **AI-Powered Chat Engine**
  - Cloudflare Workers AI integration (Llama 3.1 8B)
  - Intelligent conversation flow management
  - Context-aware responses based on team configuration
  - Natural language processing for intent detection

- [ ] **Data Storage & Management**
  - Cloudflare D1 for relational data (conversations, users, teams)
  - Cloudflare KV for session management and caching
  - Cloudflare R2 for file storage (documents, media)

- [ ] **API Layer**
  - RESTful API endpoints for all chatbot operations
  - Server-Sent Events for real-time communication
  - Webhook handlers for external integrations
  - Authentication and authorization

### 2. Enhanced Chat Features
- [ ] **Conversational Data Collection**
  - Name, email, phone, case type collection
  - Natural language validation
  - Progress indicators in chat format
  - Conversation state management
  - Edit previous responses capability

- [ ] **AI-Powered Case Preparation**
  - Natural language prompts for case details
  - File upload support for case documents
  - Progress tracking through conversation
  - Validation through chat responses

### 3. Payment & Scheduling Integration
- [ ] **Payment System**
  - Payment flow detection based on lawyer configuration
  - Payment link presentation in chat
  - Payment status monitoring and webhook integration
  - Payment verification before scheduling

- [ ] **Scheduling Enhancement**
  - AI-powered scheduling with intelligent suggestions
  - Appointment confirmation and analytics
  - Integration with existing scheduling components

### 4. Team Configuration & Admin
- [ ] **Team Settings**
  - Consultation fee configuration
  - Payment amount settings
  - Available services and case types
  - Scheduling preferences
  - Team-specific email templates

- [ ] **Admin Interface**
  - Team management dashboard
  - Service configuration interface
  - Conversation analytics
  - User management

## Technical Architecture

### Cloudflare Workers Configuration
```typescript
// wrangler.toml - Enhanced essentials-v3 project
name = "essentials-v3"
main = "src/worker/index.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[ai.models]]
binding = "llama"
model = "@cf/meta/llama-3.1-8b-instruct"

# Fresh resources for AI chatbot
[[kv_namespaces]]
binding = "CHAT_SESSIONS"
id = "your-new-kv-namespace-id"  # BLAWBY_AI_CHAT_SESSIONS

[[d1_databases]]
binding = "DB"
database_name = "blawby-ai-chatbot"
database_id = "your-new-d1-database-id"  # blawby-ai-chatbot

# Domain already configured for ai.blawby.com
```

### Database Schema (D1)
```sql
-- Core tables
CREATE TABLE teams (id TEXT PRIMARY KEY, name TEXT, config JSON);
CREATE TABLE conversations (id TEXT PRIMARY KEY, team_id TEXT, session_id TEXT, user_info JSON, status TEXT);
CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT, content TEXT, is_user BOOLEAN, metadata JSON);
CREATE TABLE services (id TEXT PRIMARY KEY, team_id TEXT, name TEXT, requires_payment BOOLEAN, payment_amount INTEGER, intake_form JSON);
CREATE TABLE appointments (id TEXT PRIMARY KEY, conversation_id TEXT, scheduled_date DATETIME, status TEXT, payment_status TEXT);
```

### API Endpoints
- **Core Chat**: `POST /api/chat`, `GET /api/chat/:sessionId`, `POST /api/chat/stream`
- **Team Config**: `GET /api/teams/:teamId`, `PUT /api/teams/:teamId/config`
- **Services**: `GET /api/services`, `GET /api/services/:id/intake-form`
- **Files**: `POST /api/upload`, `GET /api/files/:fileId`
- **Scheduling**: `POST /api/schedule`, `GET /api/schedule/:appointmentId`
- **Payment**: `POST /api/payment/webhook`, `GET /api/payment/:paymentId/status`
- **Legacy**: Maintain `/api/chatbot` for backward compatibility

## Implementation Phases

### Phase 1: Backend Infrastructure (Week 1-2)
```bash
# Create fresh database for AI chatbot (existing essentials-v3 has 20 tables for different purpose)
wrangler d1 create blawby-ai-chatbot

# Create new KV namespace for chat sessions
wrangler kv namespace create "BLAWBY_AI_CHAT_SESSIONS"
wrangler kv namespace create "BLAWBY_AI_CHAT_SESSIONS" --preview

# Use existing R2 bucket or create new one for files
wrangler r2 bucket create blawby-ai-files

# Update existing essentials-v3 project with AI bindings
# Domain: ai.blawby.com (already configured)
```

**Deliverables:**
- Fresh D1 database with proper chatbot schema
- New KV namespace for chat sessions
- Enhanced essentials-v3 project with AI bindings
- Add AI-powered API endpoints to existing infrastructure
- Maintain existing ai.blawby.com domain configuration

### Phase 2: AI Integration & Frontend (Week 3-4)
**Backend:**
- Integrate Cloudflare Workers AI models
- Implement conversation flow logic
- Add intent detection and routing
- Create team-specific AI configurations

**Frontend:**
- Update to use new API endpoints
- Implement real-time streaming responses
- Add file upload to R2 integration
- Update session management

**Deliverables:**
- AI-powered chat responses
- Real-time streaming functionality
- File upload integration
- Enhanced conversation flows

### Phase 3: Payment & Scheduling (Week 5-6)
**Payment System:**
- Payment flow detection and link presentation
- Payment status monitoring
- Webhook handlers for Blawby integration
- Payment verification before scheduling

**Scheduling Enhancement:**
- AI-powered scheduling suggestions
- Appointment confirmation
- Integration with existing components

**Deliverables:**
- Complete payment integration
- Enhanced scheduling system
- Email notification system

### Phase 4: Admin & Polish (Week 7-8)
**Admin Interface:**
- Team management dashboard
- Service configuration interface
- Conversation analytics
- User management

**Testing & Deployment:**
```bash
# Deploy to existing essentials-v3 project
wrangler pages deploy dist --project-name=essentials-v3

# Or deploy to new enhanced project
wrangler pages deploy dist --project-name=essentials-v3-enhanced

# Test on existing domain
# ai.blawby.com will automatically use the new deployment

# Verify deployment
wrangler pages deployment list --project-name=essentials-v3
```

**Deliverables:**
- Complete admin interface
- Production deployment
- Monitoring and analytics
- Documentation

## Key Features

### AI-Powered Conversation Engine
```typescript
// Generate AI response with Llama model
const generateResponse = async (messages: Message[], teamConfig: TeamConfig) => {
  const response = await env.AI.run('llama', {
    messages: formatMessagesForAI(messages, teamConfig),
    stream: true
  });
  return response;
};
```

### Real-time Communication
```typescript
// Server-Sent Events for streaming
const streamChatResponse = async (message: string) => {
  const eventSource = new EventSource(`/api/chat/stream?sessionId=${sessionId}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'chunk') {
      updateStreamingMessage(data.content);
    } else if (data.type === 'complete') {
      eventSource.close();
    }
  };
};
```

## Security & Performance

### Security Measures
- API key management for teams
- Session token validation with JWT
- Rate limiting per team/user
- Input validation and sanitization
- Prompt injection protection
- Output filtering and content moderation

### Performance Optimization
- AI response streaming for real-time experience
- Database query optimization with indexes
- KV caching for frequently accessed data
- CDN distribution for static assets
- Response caching for common queries

### Cost Optimization
- Optimize function execution time
- Minimize cold starts
- Implement response caching
- Monitor token usage and costs
- Use streaming for long responses

## Success Metrics

### Technical Metrics
- Response time < 2 seconds for AI responses
- 99.9% uptime for ai.blawby.com
- < 40KB gzipped frontend bundle
- < 100ms API endpoint response times

### Business Metrics
- Increased lead generation through AI conversations
- Improved client satisfaction with 24/7 availability
- Reduced manual intake form processing
- Higher conversion rates from chat to consultation

## Next Steps

1. **Immediate Actions**
   - Backup existing essentials-v3 project configuration
   - Create fresh D1 database with proper chatbot schema
   - Create new KV namespace for chat sessions
   - Update existing project with AI bindings
   - Leverage existing ai.blawby.com domain configuration

2. **Development Workflow**
   - Review and prioritize features
   - Create detailed technical specifications
   - Set up development environment using existing project
   - Begin Phase 1 implementation with existing infrastructure
   - Coordinate with existing ai.blawby.com team

3. **Coordination Required**
   - Meeting with app.blawby.com team for webhook requirements
   - Integration planning with existing Blawby systems
   - User acceptance testing with law firm clients
   - Production deployment coordination using existing project 