# Blawby Platform API Specification

## Development Roadmap & Milestones

### Phase 1: Foundation & Authentication (Weeks 1-3)
**Goal**: Get basic multi-tenant infrastructure working with user management

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/oauth/google` - Google OAuth initiation
- `GET /api/auth/me` - Current user information
- `POST /api/auth/forgot-password` - Password reset initiation
- `POST /api/auth/reset-password` - Password reset completion
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create new organization
- `GET /api/organizations/{id}` - Get organization details
- `PUT /api/organizations/{id}` - Update organization
- `GET /api/organizations/{id}/members` - List organization members
- `POST /api/organizations/{id}/invite` - Invite new member
- `PUT /api/organizations/{id}/members/{userId}` - Update member role
- `DELETE /api/organizations/{id}/members/{userId}` - Remove member
- `GET /api/organizations/{id}/settings` - Get organization settings
- `PUT /api/organizations/{id}/settings` - Update organization settings

**Dependencies**: Better Auth setup, cloudflare with RLS, basic multi-tenancy

---

### Phase 2: Billing & Subscription (Weeks 3-5)
**Goal**: Implement revenue model - per-seat billing + transaction fees

- `POST /api/organizations/{id}/stripe/connect` - Create Stripe Connect account
- `GET /api/organizations/{id}/stripe/connect` - Get Stripe Connect status
- `POST /api/organizations/{id}/stripe/connect/onboard` - Complete onboarding
- `GET /api/organizations/{id}/stripe/connect/onboard` - Get onboarding link
- `GET /api/organizations/{id}/subscription` - Get current subscription details
- `GET /api/organizations/{id}/subscription/seats` - Get seat usage and limits
- `POST /api/organizations/{id}/subscription/seats/add` - Add user seats
- `POST /api/organizations/{id}/subscription/seats/remove` - Remove user seats
- `GET /api/organizations/{id}/subscription/usage` - Get metered usage
- `GET /api/organizations/{id}/subscription/invoices` - List subscription invoices
- `POST /api/organizations/{id}/subscription/payment-method` - Update payment method
- `GET /api/organizations/{id}/fees/balance` - Get platform fee balance
- `GET /api/organizations/{id}/fees/history` - Get fee collection history
- `POST /api/organizations/{id}/fees/collect` - Collect platform fees (1.4%)
- `POST /api/admin/subscription-plans` - Create subscription plan
- `GET /api/admin/subscriptions` - List all organization subscriptions
- `GET /api/admin/fees/overview` - Platform-wide fee overview

**Dependencies**: Stripe Connect, Stripe Billing, webhook handlers

---

### Phase 3: Core Client & Matter Management (Weeks 5-8)
**Goal**: Basic practice management functionality

- `GET /api/organizations/{id}/clients` - List clients
- `POST /api/organizations/{id}/clients` - Create client profile
- `GET /api/organizations/{id}/clients/{clientId}` - Get client details
- `PUT /api/organizations/{id}/clients/{clientId}` - Update client profile
- `GET /api/organizations/{id}/matters` - List matters
- `POST /api/organizations/{id}/matters` - Create matter
- `GET /api/organizations/{id}/matters/{matterId}` - Get matter details
- `PUT /api/organizations/{id}/matters/{matterId}` - Update matter
- `POST /api/organizations/{id}/matters/{matterId}/assign` - Assign matter to organization member
- `GET /api/organizations/{id}/matters/{matterId}/timeline` - Get matter timeline
- `GET /api/organizations/{id}/matters/{matterId}/tasks` - Get matter tasks
- `POST /api/organizations/{id}/matters/{matterId}/tasks` - Create matter task
- `PUT /api/organizations/{id}/matters/{matterId}/tasks/{taskId}` - Update task
- `POST /api/organizations/{id}/conflicts/check` - Check for conflicts
- `GET /api/organizations/{id}/conflicts/rules` - Get conflict rules
- `POST /api/organizations/{id}/conflicts/rules` - Create conflict rule

**Dependencies**: Phase 1 complete

---

### Phase 4: Asset Management & Document Storage (Weeks 8-10)
**Goal**: Cloudflare R2 integration for file storage

- `GET /api/organizations/{id}/assets` - List all assets
- `POST /api/organizations/{id}/assets/upload` - Upload asset
- `GET /api/organizations/{id}/assets/{assetId}` - Get asset details
- `PUT /api/organizations/{id}/assets/{assetId}` - Update asset metadata
- `DELETE /api/organizations/{id}/assets/{assetId}` - Delete asset
- `GET /api/organizations/{id}/assets/{assetId}/download` - Download asset
- `GET /api/organizations/{id}/assets/{assetId}/variants` - Get asset variants
- `POST /api/organizations/{id}/assets/{assetId}/optimize` - Optimize asset
- `GET /api/organizations/{id}/assets/search` - Search assets
- `POST /api/organizations/{id}/assets/bulk-upload` - Bulk upload assets
- `GET /api/organizations/{id}/matters/{matterId}/assets` - Get matter assets
- `POST /api/organizations/{id}/matters/{matterId}/assets` - Upload matter asset

**Dependencies**: Cloudflare R2, Cloudflare Images

---

### Phase 5: Payment Processing (Weeks 10-12)
**Goal**: Enable lawyers to accept payments from clients

- `POST /api/organizations/{id}/payments/create` - Create payment intent
- `POST /api/organizations/{id}/payments/confirm` - Confirm payment
- `GET /api/organizations/{id}/payments/{paymentId}` - Get payment status
- `POST /api/organizations/{id}/payments/{paymentId}/refund` - Process refund
- `GET /api/organizations/{id}/payments` - List organization payments
- `POST /api/organizations/{id}/payments/webhook` - Stripe webhook handler
- `GET /api/organizations/{id}/payment-links` - List payment links
- `POST /api/organizations/{id}/payment-links` - Create payment link
- `GET /api/organizations/{id}/invoices` - List invoices
- `POST /api/organizations/{id}/invoices` - Create invoice
- `POST /api/organizations/{id}/invoices/{invoiceId}/send` - Send invoice
- `GET /api/organizations/{id}/invoices/{invoiceId}/pdf` - Download invoice PDF

**Dependencies**: Phase 2 complete, Stripe Connect onboarding

---

### Phase 6: Basic Website Builder (Weeks 12-15)
**Goal**: Organizations can deploy simple public websites

- `GET /api/organizations/{id}/website` - Get website configuration
- `PUT /api/organizations/{id}/website` - Update website configuration
- `GET /api/organizations/{id}/website/theme` - Get website theme
- `PUT /api/organizations/{id}/website/theme` - Update website theme
- `GET /api/organizations/{id}/website/home` - Get home page content
- `PUT /api/organizations/{id}/website/home` - Update home page content
- `GET /api/organizations/{id}/services` - List organization services
- `POST /api/organizations/{id}/services` - Create service
- `PUT /api/organizations/{id}/services/{serviceId}` - Update service
- `GET /api/public/organizations/{slug}/website` - Get public website data
- `GET /api/public/organizations/{slug}/home` - Get public home page
- `GET /api/public/organizations/{slug}/services` - Get public services
- `GET /api/public/organizations/{slug}/sitemap` - Get sitemap

**Dependencies**: Phase 4 complete, Cloudflare Pages

---

### Phase 7: Intake Forms & Lead Management (Weeks 15-18)
**Goal**: Capture leads via public forms

- `GET /api/organizations/{id}/intake-forms` - List intake forms
- `POST /api/organizations/{id}/intake-forms` - Create intake form
- `GET /api/organizations/{id}/intake-forms/{formId}` - Get intake form details
- `PUT /api/organizations/{id}/intake-forms/{formId}` - Update intake form
- `GET /api/organizations/{id}/intake-forms/{formId}/fields` - Get form fields
- `POST /api/organizations/{id}/intake-forms/{formId}/fields` - Add form field
- `POST /api/organizations/{id}/intake-forms/{formId}/publish` - Publish intake form
- `GET /api/public/organizations/{slug}/intake-forms/{formId}` - Get public intake form
- `POST /api/public/organizations/{slug}/intake-forms/{formId}/submit` - Submit intake form
- `GET /api/organizations/{id}/leads` - List leads
- `POST /api/organizations/{id}/leads` - Create lead
- `GET /api/organizations/{id}/leads/{leadId}` - Get lead details
- `POST /api/organizations/{id}/leads/{leadId}/qualify` - Qualify/disqualify lead
- `POST /api/organizations/{id}/leads/{leadId}/convert` - Convert lead to client

**Dependencies**: Phase 3, Phase 6 complete

---

### Phase 8: Basic Chatbot (Weeks 18-22)
**Goal**: Deploy simple AI chatbot with basic tools

- `GET /api/organizations/{id}/chatbots` - List organization chatbots
- `POST /api/organizations/{id}/chatbots` - Create new chatbot
- `GET /api/organizations/{id}/chatbots/{chatbotId}` - Get chatbot configuration
- `PUT /api/organizations/{id}/chatbots/{chatbotId}` - Update chatbot configuration
- `POST /api/organizations/{id}/chatbots/{chatbotId}/deploy` - Deploy chatbot
- `GET /api/organizations/{id}/chatbots/{chatbotId}/tools` - List available chatbot tools
- `PUT /api/organizations/{id}/chatbots/{chatbotId}/tools` - Configure chatbot tools
- `POST /api/public/chat/sessions` - Create anonymous chat session
- `POST /api/public/chat/sessions/{sessionId}/messages` - Send message
- `GET /api/public/chat/sessions/{sessionId}/messages` - Get chat history
- `POST /api/public/chat/sessions/{sessionId}/assets/upload` - Upload asset to chat

**Dependencies**: Phase 6, Phase 7 complete

---

### Phase 9: Quick Wins - Essential Features (Weeks 22-26)
**Goal**: Add table-stakes features that competitors have

#### Email Integration
- `GET /api/organizations/{id}/email/accounts` - List connected email accounts
- `POST /api/organizations/{id}/email/accounts/connect` - Connect email account (Gmail/Outlook)
- `DELETE /api/organizations/{id}/email/accounts/{accountId}` - Disconnect email account
- `GET /api/organizations/{id}/email/messages` - List emails
- `GET /api/organizations/{id}/email/messages/{messageId}` - Get email details
- `POST /api/organizations/{id}/email/messages` - Send email from platform
- `POST /api/organizations/{id}/email/messages/{messageId}/attach-to-matter` - Link email to matter
- `GET /api/organizations/{id}/matters/{matterId}/emails` - Get matter emails
- `POST /api/organizations/{id}/email/messages/{messageId}/forward` - Forward email
- `POST /api/organizations/{id}/email/messages/{messageId}/reply` - Reply to email
- `GET /api/organizations/{id}/email/threads` - List email threads
- `GET /api/organizations/{id}/email/threads/{threadId}` - Get email thread
- `POST /api/organizations/{id}/email/auto-link/rules` - Create auto-link rule
- `GET /api/organizations/{id}/email/sync-status` - Get email sync status

#### Enhanced Calendar & Scheduling
- `GET /api/organizations/{id}/calendars/{calendarId}/conflicts` - Check for calendar conflicts
- `POST /api/organizations/{id}/calendars/{calendarId}/events/recurring` - Create recurring event
- `GET /api/organizations/{id}/calendars/organization-availability` - Get organization-wide availability
- `POST /api/organizations/{id}/calendars/{calendarId}/block-time` - Block time on calendar
- `GET /api/organizations/{id}/calendars/{calendarId}/court-appearances` - List court appearances
- `POST /api/organizations/{id}/calendars/{calendarId}/court-appearances` - Add court appearance
- `POST /api/organizations/{id}/calendars/sync/google` - Sync with Google Calendar
- `POST /api/organizations/{id}/calendars/sync/outlook` - Sync with Outlook Calendar
- `GET /api/organizations/{id}/calendars/sync/status` - Get calendar sync status

#### Enhanced Task Management
- `GET /api/organizations/{id}/tasks` - List all tasks
- `POST /api/organizations/{id}/tasks` - Create task
- `GET /api/organizations/{id}/tasks/{taskId}` - Get task details
- `PUT /api/organizations/{id}/tasks/{taskId}` - Update task
- `DELETE /api/organizations/{id}/tasks/{taskId}` - Delete task
- `POST /api/organizations/{id}/tasks/{taskId}/complete` - Mark task complete
- `POST /api/organizations/{id}/tasks/{taskId}/dependencies` - Add task dependency
- `GET /api/organizations/{id}/tasks/{taskId}/dependencies` - Get task dependencies
- `GET /api/organizations/{id}/tasks/overdue` - List overdue tasks
- `GET /api/organizations/{id}/tasks/upcoming` - List upcoming tasks
- `POST /api/organizations/{id}/task-templates` - Create task template
- `GET /api/organizations/{id}/task-templates` - List task templates
- `POST /api/organizations/{id}/matters/{matterId}/apply-task-template` - Apply template to matter
- `GET /api/organizations/{id}/organization-members/{memberId}/tasks` - Get member's tasks
- `GET /api/organizations/{id}/tasks/workload-balance` - Get workload across organization

#### Expense Tracking & Management
- `GET /api/organizations/{id}/expenses` - List expenses
- `POST /api/organizations/{id}/expenses` - Create expense
- `GET /api/organizations/{id}/expenses/{expenseId}` - Get expense details
- `PUT /api/organizations/{id}/expenses/{expenseId}` - Update expense
- `DELETE /api/organizations/{id}/expenses/{expenseId}` - Delete expense
- `POST /api/organizations/{id}/expenses/{expenseId}/receipt` - Upload receipt
- `GET /api/organizations/{id}/expenses/{expenseId}/receipt` - Get receipt
- `POST /api/organizations/{id}/expenses/{expenseId}/ocr` - Extract data from receipt (OCR)
- `GET /api/organizations/{id}/matters/{matterId}/expenses` - Get matter expenses
- `POST /api/organizations/{id}/matters/{matterId}/expenses` - Add expense to matter
- `POST /api/organizations/{id}/expenses/{expenseId}/approve` - Approve expense
- `POST /api/organizations/{id}/expenses/{expenseId}/reject` - Reject expense
- `GET /api/organizations/{id}/expenses/pending-approval` - List expenses pending approval
- `POST /api/organizations/{id}/expenses/mileage` - Record mileage
- `GET /api/organizations/{id}/expenses/mileage-rate` - Get IRS mileage rate
- `POST /api/organizations/{id}/expenses/bulk-import` - Bulk import expenses
- `POST /api/organizations/{id}/expenses/{expenseId}/bill-to-client` - Mark expense billable

#### Mobile API Endpoints
- `POST /api/mobile/time-tracking/quick-start` - Quick start time tracking (mobile)
- `POST /api/mobile/expenses/quick-capture` - Quick expense capture with photo
- `POST /api/mobile/documents/scan` - Scan document with mobile camera
- `GET /api/mobile/notifications` - Get mobile notifications
- `POST /api/mobile/check-in` - Check in to court/meeting location
- `GET /api/mobile/matters/recent` - Get recently accessed matters
- `POST /api/mobile/offline-sync` - Sync offline data
- `GET /api/mobile/offline-queue` - Get offline action queue

**Dependencies**: Phase 1-8 complete

---

### Phase 10: Custom Domains & SSL (Weeks 26-28)
**Goal**: Organizations can use their own domains

- `GET /api/organizations/{id}/domains` - List organization domains
- `POST /api/organizations/{id}/domains` - Add custom domain
- `GET /api/organizations/{id}/domains/{domainId}` - Get domain details
- `POST /api/organizations/{id}/domains/{domainId}/verify` - Verify domain ownership
- `GET /api/organizations/{id}/domains/{domainId}/verification-status` - Get verification status
- `GET /api/organizations/{id}/domains/{domainId}/ssl` - Get SSL certificate status
- `POST /api/organizations/{id}/domains/{domainId}/ssl/provision` - Provision SSL certificate
- `GET /api/organizations/{id}/domains/{domainId}/dns/instructions` - Get DNS setup instructions
- `GET /api/admin/cloudflare/zones` - List Cloudflare zones
- `POST /api/admin/cloudflare/zones` - Create Cloudflare zone
- `POST /api/admin/cloudflare/zones/{zoneId}/dns` - Create DNS record
- `POST /api/admin/cloudflare/zones/{zoneId}/ssl/certificate` - Generate SSL certificate

**Dependencies**: Phase 6 complete, Cloudflare API integration

---

### Phase 11: Time Tracking & Billing (Weeks 28-31)
**Goal**: Track billable time and create invoices

- `GET /api/organizations/{id}/time-tracking/entries` - List time entries
- `POST /api/organizations/{id}/time-tracking/entries` - Create time entry
- `PUT /api/organizations/{id}/time-tracking/entries/{entryId}` - Update time entry
- `DELETE /api/organizations/{id}/time-tracking/entries/{entryId}` - Delete time entry
- `POST /api/organizations/{id}/time-tracking/entries/{entryId}/approve` - Approve time entry
- `GET /api/organizations/{id}/time-tracking/summary` - Get time summary
- `GET /api/organizations/{id}/time-tracking/trackers` - List active time trackers
- `POST /api/organizations/{id}/time-tracking/trackers/start` - Start time tracking
- `POST /api/organizations/{id}/time-tracking/trackers/{trackerId}/stop` - Stop time tracking
- `GET /api/organizations/{id}/billing/models` - List billing models
- `POST /api/organizations/{id}/billing/models` - Create billing model
- `GET /api/organizations/{id}/retainers` - List retainers
- `POST /api/organizations/{id}/retainers` - Create retainer
- `POST /api/organizations/{id}/retainers/{retainerId}/fund` - Add funds to retainer

**Dependencies**: Phase 5 complete

---

### Phase 12: Adobe PDF Integration (Weeks 31-33)
**Goal**: Automated document analysis

- `POST /api/organizations/{id}/documents/{documentId}/extract` - Extract text and structure from PDF
- `GET /api/organizations/{id}/documents/{documentId}/extract/status` - Get extraction job status
- `GET /api/organizations/{id}/documents/{documentId}/extract/result` - Get extraction results
- `POST /api/organizations/{id}/documents/{documentId}/analyze` - Analyze PDF structure
- `GET /api/organizations/{id}/documents/{documentId}/analyze/tables` - Extract tables from PDF
- `GET /api/organizations/{id}/documents/{documentId}/analyze/text` - Get extracted text
- `POST /api/organizations/{id}/documents/{documentId}/ocr` - Perform OCR on scanned documents
- `POST /api/organizations/{id}/documents/batch-extract` - Batch extract multiple PDFs

**Dependencies**: Phase 4 complete, Adobe PDF Services API

---

### Phase 13: Lawyer Search Integration (Weeks 33-35)
**Goal**: Connect users with lawyers via external API

- `GET /api/public/lawyers/search` - Search for lawyers by criteria
- `GET /api/public/lawyers/{lawyerId}` - Get lawyer profile
- `GET /api/public/lawyers/{lawyerId}/reviews` - Get lawyer reviews
- `GET /api/public/lawyers/filter` - Filter lawyers by practice area, location
- `GET /api/public/lawyers/practice-areas` - Get available practice areas
- `POST /api/public/chat/sessions/{sessionId}/recommend-lawyers` - Get lawyer recommendations
- `POST /api/public/chat/sessions/{sessionId}/match-lawyer` - Match user with lawyers
- `POST /api/organizations/{id}/chatbots/{chatbotId}/lawyer-search/enable` - Enable lawyer search
- `GET /api/organizations/{id}/lawyer-network` - Get organization's lawyer network
- `POST /api/organizations/{id}/lawyer-network/add` - Add lawyer to referral network

**Dependencies**: Phase 8 complete, external lawyer search API

---

### Phase 14: AI Legal Assistant (Weeks 35-40)
**Goal**: Advanced AI capabilities for lawyers

#### Document Drafting & Assembly
- `POST /api/organizations/{id}/ai/draft-document` - AI draft document from description
- `POST /api/organizations/{id}/ai/improve-document` - AI improve/refine document
- `POST /api/organizations/{id}/ai/summarize-document` - AI summarize document
- `POST /api/organizations/{id}/ai/extract-key-points` - Extract key points from document
- `POST /api/organizations/{id}/ai/compare-documents` - Compare and redline documents
- `POST /api/organizations/{id}/ai/suggest-clauses` - Suggest relevant clauses
- `GET /api/organizations/{id}/ai/clause-library` - Get AI-powered clause library
- `POST /api/organizations/{id}/ai/clause-library/search` - Search clause library

#### Case Analysis & Research
- `POST /api/organizations/{id}/ai/analyze-case` - AI analyze case strengths/weaknesses
- `POST /api/organizations/{id}/ai/suggest-arguments` - Suggest legal arguments
- `POST /api/organizations/{id}/ai/find-precedents` - Find similar cases and precedents
- `POST /api/organizations/{id}/ai/citation-check` - Check citations for validity
- `POST /api/organizations/{id}/ai/legal-strategy` - Generate legal strategy suggestions
- `POST /api/organizations/{id}/ai/risk-assessment` - Assess case risks
- `POST /api/organizations/{id}/matters/{matterId}/ai/analysis` - Get AI matter analysis

#### Smart Categorization & Organization
- `POST /api/organizations/{id}/ai/categorize-document` - Auto-categorize document
- `POST /api/organizations/{id}/ai/extract-entities` - Extract parties, dates, obligations
- `POST /api/organizations/{id}/ai/tag-suggestions` - Suggest tags for documents
- `POST /api/organizations/{id}/ai/matter-type-prediction` - Predict matter type from intake

#### Enhanced Chatbot Capabilities
- `POST /api/organizations/{id}/chatbots/{chatbotId}/ai/enable-drafting` - Enable AI drafting
- `POST /api/organizations/{id}/chatbots/{chatbotId}/ai/enable-research` - Enable AI research assistance
- `POST /api/organizations/{id}/chatbots/{chatbotId}/ai/knowledge-base` - Configure AI knowledge base
- `PUT /api/organizations/{id}/chatbots/{chatbotId}/ai/training-data` - Add training data

**Dependencies**: Phase 12, Phase 13 complete, OpenAI/Claude API

---

### Phase 15: Predictive Analytics (Weeks 40-44)
**Goal**: Data-driven insights and predictions

#### Matter Predictions
- `GET /api/organizations/{id}/analytics/matter-duration/predict` - Predict matter duration
- `GET /api/organizations/{id}/analytics/matter-cost/predict` - Predict matter cost
- `GET /api/organizations/{id}/analytics/matter-outcome/predict` - Predict matter outcome
- `GET /api/organizations/{id}/matters/{matterId}/risk-score` - Get matter risk score
- `GET /api/organizations/{id}/matters/{matterId}/budget-forecast` - Forecast budget variance
- `POST /api/organizations/{id}/matters/{matterId}/alerts/configure` - Configure predictive alerts

#### Client Analytics
- `GET /api/organizations/{id}/analytics/client-churn/predict` - Predict client churn risk
- `GET /api/organizations/{id}/analytics/client-lifetime-value` - Calculate client LTV
- `GET /api/organizations/{id}/clients/{clientId}/engagement-score` - Get engagement score
- `GET /api/organizations/{id}/clients/{clientId}/payment-risk` - Assess payment risk
- `GET /api/organizations/{id}/analytics/client-satisfaction/predict` - Predict satisfaction

#### Financial Predictions
- `GET /api/organizations/{id}/analytics/revenue/forecast` - Revenue forecast
- `GET /api/organizations/{id}/analytics/realization-rate/predict` - Predict realization rate
- `GET /api/organizations/{id}/analytics/collection/predict` - Predict collection likelihood
- `GET /api/organizations/{id}/analytics/cashflow/forecast` - Cash flow forecast
- `GET /api/organizations/{id}/invoices/{invoiceId}/payment-probability` - Payment probability

#### organization Performance Predictions
- `GET /api/organizations/{id}/analytics/attorney-utilization/forecast` - Utilization forecast
- `GET /api/organizations/{id}/analytics/capacity-planning` - Capacity planning insights
- `GET /api/organizations/{id}/organization-members/{memberId}/burnout-risk` - Burnout risk assessment
- `GET /api/organizations/{id}/analytics/hiring-needs/predict` - Predict hiring needs

#### Benchmarking & Insights
- `GET /api/organizations/{id}/analytics/benchmark` - Benchmark against similar firms
- `GET /api/organizations/{id}/analytics/optimization-suggestions` - Get AI optimization suggestions
- `GET /api/organizations/{id}/analytics/trends` - Identify practice trends
- `GET /api/organizations/{id}/analytics/anomaly-detection` - Detect unusual patterns

**Dependencies**: Phase 3, Phase 11 complete, sufficient historical data

---

### Phase 16: Advanced Workflow Automation (Weeks 44-48)
**Goal**: Intelligent automation and natural language workflows

#### Natural Language Workflow Creation
- `POST /api/organizations/{id}/workflows/create-from-text` - Create workflow from description
- `POST /api/organizations/{id}/workflows/{workflowId}/ai-optimize` - AI optimize workflow
- `GET /api/organizations/{id}/workflows/suggestions` - Get AI workflow suggestions
- `POST /api/organizations/{id}/workflows/{workflowId}/validate` - Validate workflow logic

#### Smart Triggers & Actions
- `GET /api/organizations/{id}/automation/triggers` - List available triggers
- `POST /api/organizations/{id}/automation/triggers` - Create custom trigger
- `GET /api/organizations/{id}/automation/actions` - List available actions
- `POST /api/organizations/{id}/automation/actions` - Create custom action
- `POST /api/organizations/{id}/automation/rules` - Create automation rule
- `GET /api/organizations/{id}/automation/rules` - List automation rules
- `PUT /api/organizations/{id}/automation/rules/{ruleId}` - Update automation rule
- `DELETE /api/organizations/{id}/automation/rules/{ruleId}` - Delete automation rule
- `POST /api/organizations/{id}/automation/rules/{ruleId}/test` - Test automation rule
- `GET /api/organizations/{id}/automation/rules/{ruleId}/execution-history` - Get execution history

#### Conditional Logic & Branching
- `POST /api/organizations/{id}/workflows/{workflowId}/conditions` - Add conditional logic
- `POST /api/organizations/{id}/workflows/{workflowId}/branches` - Add workflow branch
- `POST /api/organizations/{id}/workflows/{workflowId}/loops` - Add workflow loop
- `POST /api/organizations/{id}/workflows/{workflowId}/parallel-tasks` - Add parallel execution

#### AI-Powered Automation
- `POST /api/organizations/{id}/automation/ai/auto-assign` - AI auto-assign matters to attorneys
- `POST /api/organizations/{id}/automation/ai/prioritize-tasks` - AI prioritize tasks
- `POST /api/organizations/{id}/automation/ai/suggest-next-action` - Suggest next action
- `POST /api/organizations/{id}/automation/ai/deadline-calculation` - AI calculate deadlines
- `POST /api/organizations/{id}/automation/ai/document-routing` - AI route documents

#### Workflow Analytics
- `GET /api/organizations/{id}/workflows/{workflowId}/analytics` - Get workflow performance
- `GET /api/organizations/{id}/workflows/{workflowId}/bottlenecks` - Identify bottlenecks
- `GET /api/organizations/{id}/workflows/{workflowId}/completion-time` - Avg completion time
- `GET /api/organizations/{id}/workflows/most-used` - Most used workflows
- `GET /api/organizations/{id}/workflows/efficiency-score` - Workflow efficiency scores

#### Integration Actions
- `POST /api/organizations/{id}/automation/integrations/webhook` - Trigger webhook action
- `POST /api/organizations/{id}/automation/integrations/email` - Send email action
- `POST /api/organizations/{id}/automation/integrations/sms` - Send SMS action
- `POST /api/organizations/{id}/automation/integrations/slack` - Post to Slack action
- `POST /api/organizations/{id}/automation/integrations/calendar` - Create calendar event action

**Dependencies**: Phase 3, Phase 14 complete

---

### Phase 17: Client Portal (Weeks 48-51)
**Goal**: Secure client access to case information

- `GET /api/organizations/{id}/client-portal/settings` - Get portal settings
- `PUT /api/organizations/{id}/client-portal/settings` - Update portal settings
- `POST /api/organizations/{id}/client-portal/{clientId}/invite` - Invite client to portal
- `GET /api/organizations/{id}/client-portal/{clientId}/assets` - Get client-visible assets
- `POST /api/organizations/{id}/client-portal/{clientId}/assets/share` - Share asset with client
- `GET /api/organizations/{id}/client-portal/{clientId}/case-status` - Get case status
- `GET /api/organizations/{id}/client-portal/{clientId}/messages` - Get secure messages
- `POST /api/organizations/{id}/client-portal/{clientId}/messages` - Send secure message

**Dependencies**: Phase 3, Phase 4 complete

---

### Phase 18: Deadline Management (Weeks 51-53)
**Goal**: Track court deadlines and statutes

- `GET /api/organizations/{id}/deadlines` - List all deadlines
- `POST /api/organizations/{id}/deadlines` - Create deadline
- `POST /api/organizations/{id}/deadlines/calculate-statute` - Calculate statute of limitations
- `GET /api/organizations/{id}/deadlines/upcoming` - Get upcoming deadlines
- `GET /api/organizations/{id}/deadlines/overdue` - Get overdue deadlines
- `POST /api/organizations/{id}/deadlines/{deadlineId}/extend` - Extend deadline
- `GET /api/organizations/{id}/deadlines/{deadlineId}/alerts` - Get deadline alerts
- `PUT /api/organizations/{id}/deadlines/{deadlineId}/alerts` - Configure deadline alerts

**Dependencies**: Phase 3 complete

---

### Phase 19: E-Signature (Weeks 53-55)
**Goal**: Document signing workflow

- `POST /api/organizations/{id}/documents/{documentId}/e-sign/request` - Request e-signature
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/status` - Get signature status
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/signers` - Get signer details
- `POST /api/organizations/{id}/documents/{documentId}/e-sign/remind` - Send signature reminder
- `POST /api/organizations/{id}/documents/{documentId}/e-sign/cancel` - Cancel signature request
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/download` - Download signed document
- `POST /api/organizations/{id}/e-sign/webhook` - E-signature webhook handler

**Dependencies**: Phase 4 complete, DocuSign/HelloSign API

---

### Phase 20: Analytics & Reporting (Weeks 55-58)
**Goal**: Business intelligence and insights

- `GET /api/organizations/{id}/analytics` - Get analytics with resource filters
- `GET /api/organizations/{id}/analytics/overview` - Organization overview analytics
- `GET /api/organizations/{id}/analytics/chatbots` - Chatbot performance metrics
- `GET /api/organizations/{id}/analytics/payments` - Payment analytics
- `GET /api/organizations/{id}/analytics/leads` - Lead conversion analytics
- `GET /api/organizations/{id}/reports/revenue` - Revenue report
- `GET /api/organizations/{id}/reports/client-summary` - Client summary report
- `GET /api/organizations/{id}/reports/matter-summary` - Matter summary report
- `GET /api/organizations/{id}/reports/custom` - List custom reports
- `POST /api/organizations/{id}/reports/custom` - Create custom report

**Dependencies**: Multiple phases complete

---

### Phase 21: Advanced Features (Weeks 58+)
**Goal**: Polish and advanced capabilities

- Court integration & e-filing
- Document templates & assembly
- Calendar & appointment booking
- Messaging & communication
- Reviews & ratings
- Marketplace discovery
- QuickBooks integration
- Multi-jurisdiction management
- Audit & compliance tools
- Advanced security features

**Dependencies**: Core platform stable and in production

---

## Critical Path Summary

**Must-Have for MVP (Phases 1-8)**: ~22 weeks
1. Auth & organization management (Better Auth)
2. Billing & subscriptions (Stripe)
3. Client & matter management
4. File storage (Cloudflare R2)
5. Payment processing
6. Basic website builder
7. Intake forms & leads
8. Basic chatbot

**Quick Wins - Essential Features (Phase 8.5)**: ~4 weeks
- Email integration (Gmail/Outlook)
- Enhanced calendar with conflict detection
- Task management with dependencies
- Expense tracking with receipt OCR
- Mobile API endpoints

**Differentiation Features (Phases 12-16)**: AI-first approach
- Phase 12: Adobe PDF analysis
- Phase 13: Lawyer search integration
- Phase 14: AI Legal Assistant (document drafting, case analysis)
- Phase 15: Predictive Analytics (matter predictions, client churn, financial forecasting)
- Phase 16: Advanced Workflow Automation (natural language workflows, AI triggers)

**Revenue-Generating Features**: Phases 2, 5, 11, 17 (Billing, payments, time tracking, trust accounting)

**Enterprise Features**: Better Auth SSO/SAML, advanced permissions, audit logging

**Critical Infrastructure**: Phases 1, 2, 4, 6, 9 establish foundation for everything else

---

### Authentication & User Management
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/oauth/google` - Google OAuth initiation
- `POST /api/auth/passkey/register` - Passkey registration
- `POST /api/auth/passkey/authenticate` - Passkey authentication
- `GET /api/auth/me` - Current user information
- `POST /api/auth/forgot-password` - Password reset initiation
- `POST /api/auth/reset-password` - Password reset completion

### Organization Management
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create new organization
- `GET /api/organizations/{id}` - Get organization details
- `PUT /api/organizations/{id}` - Update organization
- `DELETE /api/organizations/{id}` - Delete organization
- `GET /api/organizations/{id}/members` - List organization members
- `POST /api/organizations/{id}/invite` - Invite new member
- `PUT /api/organizations/{id}/members/{userId}` - Update member role
- `DELETE /api/organizations/{id}/members/{userId}` - Remove member
- `GET /api/organizations/{id}/settings` - Get organization settings
- `PUT /api/organizations/{id}/settings` - Update organization settings

### Website & Content Management
- `GET /api/organizations/{id}/website` - Get website configuration
- `PUT /api/organizations/{id}/website` - Update website configuration
- `GET /api/organizations/{id}/website/domain` - Get custom domain settings
- `PUT /api/organizations/{id}/website/domain` - Update custom domain
- `GET /api/organizations/{id}/website/theme` - Get website theme
- `PUT /api/organizations/{id}/website/theme` - Update website theme
- `GET /api/organizations/{id}/website/seo` - Get SEO settings
- `PUT /api/organizations/{id}/website/seo` - Update SEO settings
- `GET /api/organizations/{id}/website/schema` - Get structured data schema
- `PUT /api/organizations/{id}/website/schema` - Update structured data schema

### Services Management
- `GET /api/organizations/{id}/services` - List organization services
- `POST /api/organizations/{id}/services` - Create service
- `GET /api/organizations/{id}/services/{serviceId}` - Get service details
- `PUT /api/organizations/{id}/services/{serviceId}` - Update service
- `DELETE /api/organizations/{id}/services/{serviceId}` - Delete service
- `GET /api/organizations/{id}/services/{serviceId}/pricing` - Get service pricing
- `PUT /api/organizations/{id}/services/{serviceId}/pricing` - Update service pricing
- `GET /api/organizations/{id}/services/{serviceId}/faq` - Get service FAQ
- `PUT /api/organizations/{id}/services/{serviceId}/faq` - Update service FAQ
- `GET /api/organizations/{id}/services/{serviceId}/testimonials` - Get service testimonials
- `POST /api/organizations/{id}/services/{serviceId}/testimonials` - Add testimonial
- `GET /api/organizations/{id}/services/{serviceId}/checkout` - Get service checkout flow
- `PUT /api/organizations/{id}/services/{serviceId}/checkout` - Update checkout flow
- `GET /api/organizations/{id}/services/categories` - Get service categories
- `POST /api/organizations/{id}/services/categories` - Create service category

### Articles & Blog Management
- `GET /api/organizations/{id}/articles` - List articles
- `POST /api/organizations/{id}/articles` - Create article
- `GET /api/organizations/{id}/articles/{articleId}` - Get article details
- `PUT /api/organizations/{id}/articles/{articleId}` - Update article
- `DELETE /api/organizations/{id}/articles/{articleId}` - Delete article
- `POST /api/organizations/{id}/articles/{articleId}/publish` - Publish article
- `POST /api/organizations/{id}/articles/{articleId}/unpublish` - Unpublish article
- `GET /api/organizations/{id}/articles/{articleId}/seo` - Get article SEO
- `PUT /api/organizations/{id}/articles/{articleId}/seo` - Update article SEO
- `GET /api/organizations/{id}/articles/categories` - Get article categories
- `POST /api/organizations/{id}/articles/categories` - Create article category
- `GET /api/organizations/{id}/articles/tags` - Get article tags
- `POST /api/organizations/{id}/articles/tags` - Create article tag

### Website Pages (Home & Category)
- `GET /api/organizations/{id}/website/home` - Get home page content
- `PUT /api/organizations/{id}/website/home` - Update home page content
- `GET /api/organizations/{id}/website/home/seo` - Get home page SEO
- `PUT /api/organizations/{id}/website/home/seo` - Update home page SEO
- `GET /api/organizations/{id}/website/categories/{categoryId}` - Get category page
- `PUT /api/organizations/{id}/website/categories/{categoryId}` - Update category page
- `GET /api/organizations/{id}/website/categories/{categoryId}/seo` - Get category SEO
- `PUT /api/organizations/{id}/website/categories/{categoryId}/seo` - Update category SEO

### Unified Asset Management
- `GET /api/organizations/{id}/assets` - List all assets (media, documents, files)
- `POST /api/organizations/{id}/assets/upload` - Upload asset
- `GET /api/organizations/{id}/assets/{assetId}` - Get asset details
- `PUT /api/organizations/{id}/assets/{assetId}` - Update asset metadata
- `DELETE /api/organizations/{id}/assets/{assetId}` - Delete asset
- `GET /api/organizations/{id}/assets/{assetId}/download` - Download asset
- `GET /api/organizations/{id}/assets/{assetId}/variants` - Get asset variants (thumbnails, etc)
- `POST /api/organizations/{id}/assets/{assetId}/optimize` - Optimize asset
- `GET /api/organizations/{id}/assets/categories` - Get asset categories
- `POST /api/organizations/{id}/assets/categories` - Create asset category
- `GET /api/organizations/{id}/assets/albums` - Get asset albums
- `POST /api/organizations/{id}/assets/albums` - Create asset album
- `GET /api/organizations/{id}/assets/search` - Search assets
- `POST /api/organizations/{id}/assets/bulk-upload` - Bulk upload assets

### Structured Data & Schema
- `GET /api/organizations/{id}/schema/organization` - Get organization schema
- `PUT /api/organizations/{id}/schema/organization` - Update organization schema
- `GET /api/organizations/{id}/schema/services` - Get services schema
- `PUT /api/organizations/{id}/schema/services` - Update services schema
- `GET /api/organizations/{id}/schema/articles` - Get articles schema
- `PUT /api/organizations/{id}/schema/articles` - Update articles schema
- `GET /api/organizations/{id}/schema/reviews` - Get reviews schema
- `PUT /api/organizations/{id}/schema/reviews` - Update reviews schema
- `GET /api/organizations/{id}/schema/faq` - Get FAQ schema
- `PUT /api/organizations/{id}/schema/faq` - Update FAQ schema
- `GET /api/organizations/{id}/schema/events` - Get events schema
- `PUT /api/organizations/{id}/schema/events` - Update events schema
- `GET /api/organizations/{id}/schema/validate` - Validate schema
- `POST /api/organizations/{id}/schema/generate` - Generate schema

### Cart & Checkout Flow
- `GET /api/organizations/{id}/cart` - Get cart contents
- `POST /api/organizations/{id}/cart/add` - Add service to cart
- `PUT /api/organizations/{id}/cart/update` - Update cart item
- `DELETE /api/organizations/{id}/cart/remove` - Remove item from cart
- `POST /api/organizations/{id}/cart/checkout` - Initiate checkout
- `GET /api/organizations/{id}/checkout/{checkoutId}` - Get checkout details
- `POST /api/organizations/{id}/checkout/{checkoutId}/complete` - Complete checkout
- `POST /api/organizations/{id}/checkout/{checkoutId}/payment` - Process payment
- `GET /api/organizations/{id}/checkout/{checkoutId}/status` - Get checkout status

### Public Website API
- `GET /api/public/organizations/{slug}/website` - Get public website data
- `GET /api/public/organizations/{slug}/home` - Get public home page
- `GET /api/public/organizations/{slug}/categories` - Get public service categories
- `GET /api/public/organizations/{slug}/categories/{categoryId}` - Get public category page
- `GET /api/public/organizations/{slug}/services` - Get public services
- `GET /api/public/organizations/{slug}/services/{serviceId}` - Get public service
- `GET /api/public/organizations/{slug}/articles` - Get public articles
- `GET /api/public/organizations/{slug}/articles/{articleId}` - Get public article
- `GET /api/public/organizations/{slug}/schema` - Get public structured data
- `GET /api/public/organizations/{slug}/sitemap` - Get sitemap
- `GET /api/public/organizations/{slug}/robots` - Get robots.txt

### Lawyer Search & Discovery (External API Integration)
- `GET /api/public/lawyers/search` - Search for lawyers by criteria
- `GET /api/public/lawyers/{lawyerId}` - Get lawyer profile
- `GET /api/public/lawyers/{lawyerId}/reviews` - Get lawyer reviews
- `GET /api/public/lawyers/filter` - Filter lawyers by practice area, location, rating, etc
- `GET /api/public/lawyers/practice-areas` - Get available practice areas
- `GET /api/public/lawyers/locations` - Get available locations
- `POST /api/public/chat/sessions/{sessionId}/recommend-lawyers` - Get lawyer recommendations based on case
- `POST /api/public/chat/sessions/{sessionId}/match-lawyer` - Match user with appropriate lawyers
- `GET /api/organizations/{id}/lawyer-network` - Get organization's lawyer network/referrals
- `POST /api/organizations/{id}/lawyer-network/add` - Add lawyer to referral network
- `DELETE /api/organizations/{id}/lawyer-network/{lawyerId}` - Remove lawyer from network

### Chatbot Configuration
- `GET /api/organizations/{id}/chatbots` - List organization chatbots
- `POST /api/organizations/{id}/chatbots` - Create new chatbot
- `GET /api/organizations/{id}/chatbots/{chatbotId}` - Get chatbot configuration
- `PUT /api/organizations/{id}/chatbots/{chatbotId}` - Update chatbot configuration
- `DELETE /api/organizations/{id}/chatbots/{chatbotId}` - Delete chatbot
- `POST /api/organizations/{id}/chatbots/{chatbotId}/deploy` - Deploy chatbot
- `POST /api/organizations/{id}/chatbots/{chatbotId}/undeploy` - Undeploy chatbot
- `GET /api/organizations/{id}/chatbots/{chatbotId}/analytics` - Get chatbot analytics
- `GET /api/organizations/{id}/chatbots/{chatbotId}/tools` - List available chatbot tools
- `PUT /api/organizations/{id}/chatbots/{chatbotId}/tools` - Configure chatbot tools
- `POST /api/organizations/{id}/chatbots/{chatbotId}/lawyer-search/enable` - Enable lawyer search for chatbot
- `PUT /api/organizations/{id}/chatbots/{chatbotId}/lawyer-search/settings` - Configure lawyer search settings

### Public Chat API (Plugin Interface)
- `GET /api/public/organizations/{slug}` - Get public organization info
- `GET /api/public/organizations/{slug}/chatbots/{chatbotId}` - Get public chatbot config
- `POST /api/public/chat/sessions` - Create anonymous chat session
- `POST /api/public/chat/sessions/{sessionId}/messages` - Send message
- `GET /api/public/chat/sessions/{sessionId}/messages` - Get chat history
- `POST /api/public/chat/sessions/{sessionId}/feedback` - Submit feedback
- `POST /api/public/chat/sessions/{sessionId}/contact` - Submit contact form
- `POST /api/public/chat/sessions/{sessionId}/assets/upload` - Upload asset to chat session

### Unified Analytics & Reporting
- `GET /api/organizations/{id}/analytics` - Get analytics with resource filters
- `GET /api/organizations/{id}/analytics/overview` - Organization overview analytics
- `GET /api/organizations/{id}/analytics/chatbots` - Chatbot performance metrics
- `GET /api/organizations/{id}/analytics/sessions` - Session analytics
- `GET /api/organizations/{id}/analytics/users` - User engagement metrics
- `GET /api/organizations/{id}/analytics/payments` - Payment analytics
- `GET /api/organizations/{id}/analytics/notifications` - Notification analytics
- `GET /api/organizations/{id}/analytics/leads` - Lead conversion analytics
- `GET /api/organizations/{id}/analytics/export` - Export analytics data
- `POST /api/organizations/{id}/analytics/custom` - Create custom analytics query

### Financial Reports
- `GET /api/organizations/{id}/reports/income-statement` - Income statement report
- `GET /api/organizations/{id}/reports/balance-sheet` - Balance sheet report
- `GET /api/organizations/{id}/reports/cash-flow` - Cash flow statement
- `GET /api/organizations/{id}/reports/profit-loss` - Profit & loss report
- `GET /api/organizations/{id}/reports/revenue` - Revenue report
- `GET /api/organizations/{id}/reports/expenses` - Expense report
- `GET /api/organizations/{id}/reports/tax-summary` - Tax summary report
- `GET /api/organizations/{id}/reports/aged-receivables` - Aged receivables report
- `GET /api/organizations/{id}/reports/aged-payables` - Aged payables report
- `GET /api/organizations/{id}/reports/trial-balance` - Trial balance report

### Payment & Transaction Reports
- `GET /api/organizations/{id}/reports/payment-summary` - Payment summary report
- `GET /api/organizations/{id}/reports/transaction-history` - Transaction history
- `GET /api/organizations/{id}/reports/refund-summary` - Refund summary report
- `GET /api/organizations/{id}/reports/failed-payments` - Failed payments report
- `GET /api/organizations/{id}/reports/payment-methods` - Payment methods report
- `GET /api/organizations/{id}/reports/chargeback-summary` - Chargeback summary
- `GET /api/organizations/{id}/reports/payout-summary` - Payout summary report
- `GET /api/organizations/{id}/reports/platform-fees` - Platform fees report

### Client & Matter Reports
- `GET /api/organizations/{id}/reports/client-summary` - Client summary report
- `GET /api/organizations/{id}/reports/matter-summary` - Matter summary report
- `GET /api/organizations/{id}/reports/time-summary` - Time tracking summary
- `GET /api/organizations/{id}/reports/billing-summary` - Billing summary report
- `GET /api/organizations/{id}/reports/retainer-summary` - Retainer summary report
- `GET /api/organizations/{id}/reports/invoice-summary` - Invoice summary report
- `GET /api/organizations/{id}/reports/collection-summary` - Collection summary
- `GET /api/organizations/{id}/reports/attorney-productivity` - Attorney productivity

### Custom Reports
- `GET /api/organizations/{id}/reports/custom` - List custom reports
- `POST /api/organizations/{id}/reports/custom` - Create custom report
- `GET /api/organizations/{id}/reports/custom/{reportId}` - Get custom report
- `PUT /api/organizations/{id}/reports/custom/{reportId}` - Update custom report
- `DELETE /api/organizations/{id}/reports/custom/{reportId}` - Delete custom report
- `POST /api/organizations/{id}/reports/custom/{reportId}/run` - Run custom report
- `GET /api/organizations/{id}/reports/custom/{reportId}/schedule` - Schedule report
- `POST /api/organizations/{id}/reports/custom/{reportId}/export` - Export custom report

### Report Scheduling & Distribution
- `GET /api/organizations/{id}/reports/schedules` - List report schedules
- `POST /api/organizations/{id}/reports/schedules` - Create report schedule
- `GET /api/organizations/{id}/reports/schedules/{scheduleId}` - Get schedule details
- `PUT /api/organizations/{id}/reports/schedules/{scheduleId}` - Update schedule
- `DELETE /api/organizations/{id}/reports/schedules/{scheduleId}` - Delete schedule
- `POST /api/organizations/{id}/reports/schedules/{scheduleId}/run` - Run scheduled report
- `GET /api/organizations/{id}/reports/schedules/{scheduleId}/history` - Get schedule history
- `POST /api/organizations/{id}/reports/schedules/{scheduleId}/pause` - Pause schedule
- `POST /api/organizations/{id}/reports/schedules/{scheduleId}/resume` - Resume schedule

### Report Export & Sharing
- `GET /api/organizations/{id}/reports/{reportId}/export/pdf` - Export report as PDF
- `GET /api/organizations/{id}/reports/{reportId}/export/excel` - Export report as Excel
- `GET /api/organizations/{id}/reports/{reportId}/export/csv` - Export report as CSV
- `POST /api/organizations/{id}/reports/{reportId}/share` - Share report
- `GET /api/organizations/{id}/reports/{reportId}/share/{shareId}` - Get shared report
- `DELETE /api/organizations/{id}/reports/{reportId}/share/{shareId}` - Revoke shared report
- `GET /api/organizations/{id}/reports/shared` - List shared reports
- `POST /api/organizations/{id}/reports/{reportId}/email` - Email report

### Stripe Connect Platform
- `POST /api/organizations/{id}/stripe/connect` - Create Stripe Connect account
- `GET /api/organizations/{id}/stripe/connect` - Get Stripe Connect status
- `POST /api/organizations/{id}/stripe/connect/onboard` - Complete onboarding
- `GET /api/organizations/{id}/stripe/connect/onboard` - Get onboarding link
- `POST /api/organizations/{id}/stripe/connect/refresh` - Refresh account status
- `GET /api/organizations/{id}/stripe/account` - Get account details
- `PUT /api/organizations/{id}/stripe/account` - Update account settings
- `GET /api/organizations/{id}/stripe/balance` - Get account balance
- `GET /api/organizations/{id}/stripe/transactions` - List transactions
- `GET /api/organizations/{id}/stripe/payouts` - List payouts
- `POST /api/organizations/{id}/stripe/payouts` - Create manual payout

### Payment Processing
- `POST /api/organizations/{id}/payments/create` - Create payment intent
- `POST /api/organizations/{id}/payments/confirm` - Confirm payment
- `GET /api/organizations/{id}/payments/{paymentId}` - Get payment status
- `POST /api/organizations/{id}/payments/{paymentId}/refund` - Process refund
- `GET /api/organizations/{id}/payments` - List organization payments
- `POST /api/organizations/{id}/payments/webhook` - Stripe webhook handler

### Payment Links
- `GET /api/organizations/{id}/payment-links` - List payment links
- `POST /api/organizations/{id}/payment-links` - Create payment link
- `GET /api/organizations/{id}/payment-links/{linkId}` - Get payment link details
- `PUT /api/organizations/{id}/payment-links/{linkId}` - Update payment link
- `DELETE /api/organizations/{id}/payment-links/{linkId}` - Delete payment link
- `POST /api/organizations/{id}/payment-links/{linkId}/activate` - Activate payment link
- `POST /api/organizations/{id}/payment-links/{linkId}/deactivate` - Deactivate payment link
- `GET /api/organizations/{id}/payment-links/{linkId}/payments` - Get link payments
- `GET /api/organizations/{id}/payment-links/{linkId}/analytics` - Get link analytics
- `POST /api/organizations/{id}/payment-links/{linkId}/duplicate` - Duplicate payment link

### Platform Fee Management (Blawby Revenue)
- `GET /api/organizations/{id}/fees/balance` - Get platform fee balance
- `GET /api/organizations/{id}/fees/history` - Get fee collection history
- `POST /api/organizations/{id}/fees/collect` - Collect platform fees (1.4% transaction fee)
- `GET /api/organizations/{id}/fees/forecast` - Get upcoming fee forecast
- `GET /api/admin/fees/overview` - Platform-wide fee overview
- `GET /api/admin/fees/organizations` - Organization fee status
- `POST /api/admin/fees/collect-all` - Collect all pending fees

### Platform Subscription Management (Per-Seat Billing)
- `GET /api/organizations/{id}/subscription` - Get current subscription details
- `GET /api/organizations/{id}/subscription/seats` - Get seat usage and limits
- `POST /api/organizations/{id}/subscription/seats/add` - Add user seats
- `POST /api/organizations/{id}/subscription/seats/remove` - Remove user seats
- `GET /api/organizations/{id}/subscription/usage` - Get metered usage (seats + transaction volume)
- `GET /api/organizations/{id}/subscription/invoice-preview` - Preview next invoice
- `GET /api/organizations/{id}/subscription/invoices` - List subscription invoices
- `GET /api/organizations/{id}/subscription/invoices/{invoiceId}` - Get invoice details
- `POST /api/organizations/{id}/subscription/payment-method` - Update payment method
- `GET /api/organizations/{id}/subscription/payment-method` - Get payment method

### Admin Subscription Plans
- `GET /api/admin/subscription-plans` - List subscription plans
- `POST /api/admin/subscription-plans` - Create subscription plan
- `GET /api/admin/subscription-plans/{planId}` - Get plan details
- `PUT /api/admin/subscription-plans/{planId}` - Update plan
- `DELETE /api/admin/subscription-plans/{planId}` - Delete plan
- `GET /api/admin/subscriptions` - List all organization subscriptions
- `GET /api/admin/subscriptions/{subscriptionId}` - Get subscription details
- `POST /api/admin/subscriptions/{subscriptionId}/adjust` - Manual subscription adjustment

### Billing & Invoicing
- `GET /api/organizations/{id}/billing/models` - List billing models (hourly, contingency, fixed)
- `POST /api/organizations/{id}/billing/models` - Create billing model
- `PUT /api/organizations/{id}/billing/models/{modelId}` - Update billing model
- `DELETE /api/organizations/{id}/billing/models/{modelId}` - Delete billing model
- `GET /api/organizations/{id}/invoices` - List invoices
- `POST /api/organizations/{id}/invoices` - Create invoice
- `GET /api/organizations/{id}/invoices/{invoiceId}` - Get invoice details
- `PUT /api/organizations/{id}/invoices/{invoiceId}` - Update invoice
- `POST /api/organizations/{id}/invoices/{invoiceId}/send` - Send invoice
- `POST /api/organizations/{id}/invoices/{invoiceId}/pay` - Pay invoice
- `POST /api/organizations/{id}/invoices/{invoiceId}/void` - Void invoice
- `GET /api/organizations/{id}/invoices/{invoiceId}/pdf` - Download invoice PDF

### Retainer Management
- `GET /api/organizations/{id}/retainers` - List retainers
- `POST /api/organizations/{id}/retainers` - Create retainer
- `GET /api/organizations/{id}/retainers/{retainerId}` - Get retainer details
- `PUT /api/organizations/{id}/retainers/{retainerId}` - Update retainer
- `POST /api/organizations/{id}/retainers/{retainerId}/fund` - Add funds to retainer
- `POST /api/organizations/{id}/retainers/{retainerId}/withdraw` - Withdraw from retainer
- `GET /api/organizations/{id}/retainers/{retainerId}/transactions` - Get retainer transactions
- `GET /api/organizations/{id}/retainers/{retainerId}/balance` - Get retainer balance

### Unified Time Tracking & Billing
- `GET /api/organizations/{id}/time-tracking/entries` - List time entries
- `POST /api/organizations/{id}/time-tracking/entries` - Create time entry
- `PUT /api/organizations/{id}/time-tracking/entries/{entryId}` - Update time entry
- `DELETE /api/organizations/{id}/time-tracking/entries/{entryId}` - Delete time entry
- `POST /api/organizations/{id}/time-tracking/entries/{entryId}/approve` - Approve time entry
- `GET /api/organizations/{id}/time-tracking/summary` - Get time summary
- `POST /api/organizations/{id}/time-tracking/bulk-import` - Bulk import time entries
- `GET /api/organizations/{id}/time-tracking/trackers` - List active time trackers
- `POST /api/organizations/{id}/time-tracking/trackers/start` - Start time tracking
- `POST /api/organizations/{id}/time-tracking/trackers/{trackerId}/stop` - Stop time tracking
- `POST /api/organizations/{id}/time-tracking/trackers/{trackerId}/pause` - Pause time tracking
- `POST /api/organizations/{id}/time-tracking/trackers/{trackerId}/resume` - Resume time tracking
- `GET /api/organizations/{id}/time-tracking/work-diaries` - List work diaries
- `GET /api/organizations/{id}/time-tracking/work-diaries/{diaryId}` - Get work diary details
- `POST /api/organizations/{id}/time-tracking/work-diaries/{diaryId}/approve` - Approve work diary
- `POST /api/organizations/{id}/time-tracking/work-diaries/{diaryId}/reject` - Reject work diary

### Milestone & Fixed Fee Billing
- `GET /api/organizations/{id}/milestones` - List milestones
- `POST /api/organizations/{id}/milestones` - Create milestone
- `GET /api/organizations/{id}/milestones/{milestoneId}` - Get milestone details
- `PUT /api/organizations/{id}/milestones/{milestoneId}` - Update milestone
- `POST /api/organizations/{id}/milestones/{milestoneId}/complete` - Mark milestone complete
- `POST /api/organizations/{id}/milestones/{milestoneId}/invoice` - Create milestone invoice
- `GET /api/organizations/{id}/milestones/{milestoneId}/payments` - Get milestone payments

### Contingency Billing
- `GET /api/organizations/{id}/contingency-cases` - List contingency cases
- `POST /api/organizations/{id}/contingency-cases` - Create contingency case
- `GET /api/organizations/{id}/contingency-cases/{caseId}` - Get case details
- `PUT /api/organizations/{id}/contingency-cases/{caseId}` - Update case
- `POST /api/organizations/{id}/contingency-cases/{caseId}/settle` - Record settlement
- `POST /api/organizations/{id}/contingency-cases/{caseId}/invoice` - Create contingency invoice
- `GET /api/organizations/{id}/contingency-cases/{caseId}/payments` - Get case payments

### Scheduling & Calendar Management
- `GET /api/organizations/{id}/calendars` - List calendars
- `POST /api/organizations/{id}/calendars` - Create calendar
- `GET /api/organizations/{id}/calendars/{calendarId}` - Get calendar details
- `PUT /api/organizations/{id}/calendars/{calendarId}` - Update calendar
- `DELETE /api/organizations/{id}/calendars/{calendarId}` - Delete calendar
- `GET /api/organizations/{id}/calendars/{calendarId}/availability` - Get availability
- `PUT /api/organizations/{id}/calendars/{calendarId}/availability` - Update availability
- `GET /api/organizations/{id}/calendars/{calendarId}/events` - List calendar events
- `POST /api/organizations/{id}/calendars/{calendarId}/events` - Create event
- `PUT /api/organizations/{id}/calendars/{calendarId}/events/{eventId}` - Update event
- `DELETE /api/organizations/{id}/calendars/{calendarId}/events/{eventId}` - Delete event

### Appointment Booking
- `GET /api/organizations/{id}/appointments` - List appointments
- `POST /api/organizations/{id}/appointments` - Create appointment
- `GET /api/organizations/{id}/appointments/{appointmentId}` - Get appointment details
- `PUT /api/organizations/{id}/appointments/{appointmentId}` - Update appointment
- `POST /api/organizations/{id}/appointments/{appointmentId}/confirm` - Confirm appointment
- `POST /api/organizations/{id}/appointments/{appointmentId}/cancel` - Cancel appointment
- `POST /api/organizations/{id}/appointments/{appointmentId}/reschedule` - Reschedule appointment
- `GET /api/organizations/{id}/appointments/{appointmentId}/join` - Get meeting link
- `POST /api/organizations/{id}/appointments/{appointmentId}/reminder` - Send reminder

### organization Collaboration & Communication
- `GET /api/organizations/{id}/organization-members` - List organization members
- `POST /api/organizations/{id}/organization-members/invite` - Invite organization member
- `PUT /api/organizations/{id}/organization-members/{memberId}/role` - Update member role
- `GET /api/organizations/{id}/organization-members/{memberId}/schedule` - Get member schedule
- `GET /api/organizations/{id}/organization-members/{memberId}/workload` - Get member workload
- `POST /api/organizations/{id}/organization-members/{memberId}/assign-task` - Assign task
- `GET /api/organizations/{id}/organization-members/{memberId}/time-entries` - Get member time entries
- `GET /api/organizations/{id}/organization-members/{memberId}/productivity` - Get productivity metrics

### Client Management & Profiles
- `GET /api/organizations/{id}/clients` - List clients
- `POST /api/organizations/{id}/clients` - Create client profile
- `GET /api/organizations/{id}/clients/{clientId}` - Get client details
- `PUT /api/organizations/{id}/clients/{clientId}` - Update client profile
- `DELETE /api/organizations/{id}/clients/{clientId}` - Delete client
- `GET /api/organizations/{id}/clients/{clientId}/history` - Get client history
- `GET /api/organizations/{id}/clients/{clientId}/matters` - Get client matters
- `GET /api/organizations/{id}/clients/{clientId}/communications` - Get client communications
- `POST /api/organizations/{id}/clients/{clientId}/notes` - Add client notes
- `GET /api/organizations/{id}/clients/{clientId}/assets` - Get client assets

### Matter Management & Workflows
- `GET /api/organizations/{id}/matters` - List matters
- `POST /api/organizations/{id}/matters` - Create matter
- `GET /api/organizations/{id}/matters/{matterId}` - Get matter details
- `PUT /api/organizations/{id}/matters/{matterId}` - Update matter
- `DELETE /api/organizations/{id}/matters/{matterId}` - Delete matter
- `POST /api/organizations/{id}/matters/{matterId}/assign` - Assign matter to organization member
- `GET /api/organizations/{id}/matters/{matterId}/timeline` - Get matter timeline
- `POST /api/organizations/{id}/matters/{matterId}/milestones` - Create matter milestone
- `GET /api/organizations/{id}/matters/{matterId}/assets` - Get matter assets
- `POST /api/organizations/{id}/matters/{matterId}/assets` - Upload matter asset
- `GET /api/organizations/{id}/matters/{matterId}/communications` - Get matter communications
- `POST /api/organizations/{id}/matters/{matterId}/communications` - Add matter communication
- `GET /api/organizations/{id}/matters/{matterId}/workflow` - Get matter workflow
- `PUT /api/organizations/{id}/matters/{matterId}/workflow/stage` - Update matter stage
- `GET /api/organizations/{id}/matters/{matterId}/tasks` - Get matter tasks
- `POST /api/organizations/{id}/matters/{matterId}/tasks` - Create matter task
- `PUT /api/organizations/{id}/matters/{matterId}/tasks/{taskId}` - Update task
- `POST /api/organizations/{id}/matters/{matterId}/tasks/{taskId}/complete` - Complete task

### Workflow Templates
- `GET /api/organizations/{id}/workflow-templates` - List workflow templates
- `POST /api/organizations/{id}/workflow-templates` - Create workflow template
- `GET /api/organizations/{id}/workflow-templates/{templateId}` - Get workflow template
- `PUT /api/organizations/{id}/workflow-templates/{templateId}` - Update workflow template
- `DELETE /api/organizations/{id}/workflow-templates/{templateId}` - Delete workflow template
- `POST /api/organizations/{id}/workflow-templates/{templateId}/apply` - Apply template to matter
- `GET /api/organizations/{id}/workflow-templates/{templateId}/stages` - Get workflow stages
- `POST /api/organizations/{id}/workflow-templates/{templateId}/stages` - Add workflow stage
- `PUT /api/organizations/{id}/workflow-templates/{templateId}/stages/{stageId}` - Update stage
- `POST /api/organizations/{id}/workflow-templates/{templateId}/automation` - Add automation rule

### Deadline & Statute Management
- `GET /api/organizations/{id}/deadlines` - List all deadlines
- `POST /api/organizations/{id}/deadlines` - Create deadline
- `GET /api/organizations/{id}/deadlines/{deadlineId}` - Get deadline details
- `PUT /api/organizations/{id}/deadlines/{deadlineId}` - Update deadline
- `DELETE /api/organizations/{id}/deadlines/{deadlineId}` - Delete deadline
- `POST /api/organizations/{id}/deadlines/calculate-statute` - Calculate statute of limitations
- `GET /api/organizations/{id}/deadlines/upcoming` - Get upcoming deadlines
- `GET /api/organizations/{id}/deadlines/overdue` - Get overdue deadlines
- `POST /api/organizations/{id}/deadlines/{deadlineId}/extend` - Extend deadline
- `POST /api/organizations/{id}/deadlines/{deadlineId}/complete` - Mark deadline complete
- `GET /api/organizations/{id}/deadlines/{deadlineId}/alerts` - Get deadline alerts
- `PUT /api/organizations/{id}/deadlines/{deadlineId}/alerts` - Configure deadline alerts

### Proposals & Bidding System
- `GET /api/organizations/{id}/proposals` - List proposals
- `POST /api/organizations/{id}/proposals` - Create proposal
- `GET /api/organizations/{id}/proposals/{proposalId}` - Get proposal details
- `PUT /api/organizations/{id}/proposals/{proposalId}` - Update proposal
- `DELETE /api/organizations/{id}/proposals/{proposalId}` - Delete proposal
- `POST /api/organizations/{id}/proposals/{proposalId}/submit` - Submit proposal
- `POST /api/organizations/{id}/proposals/{proposalId}/accept` - Accept proposal
- `POST /api/organizations/{id}/proposals/{proposalId}/reject` - Reject proposal
- `GET /api/organizations/{id}/proposals/{proposalId}/responses` - Get proposal responses
- `POST /api/organizations/{id}/proposals/{proposalId}/counter-offer` - Submit counter-offer

### Reviews & Ratings System
- `GET /api/organizations/{id}/reviews` - List organization reviews
- `POST /api/organizations/{id}/reviews` - Create review
- `GET /api/organizations/{id}/reviews/{reviewId}` - Get review details
- `PUT /api/organizations/{id}/reviews/{reviewId}` - Update review
- `DELETE /api/organizations/{id}/reviews/{reviewId}` - Delete review
- `GET /api/organizations/{id}/reviews/stats` - Get review statistics
- `POST /api/organizations/{id}/reviews/{reviewId}/respond` - Respond to review
- `GET /api/organizations/{id}/reviews/verified` - Get verified reviews only

### Messaging & Communication
- `GET /api/organizations/{id}/conversations` - List conversations
- `POST /api/organizations/{id}/conversations` - Start conversation
- `GET /api/organizations/{id}/conversations/{conversationId}` - Get conversation
- `POST /api/organizations/{id}/conversations/{conversationId}/messages` - Send message
- `GET /api/organizations/{id}/conversations/{conversationId}/messages` - Get messages
- `PUT /api/organizations/{id}/conversations/{conversationId}/messages/{messageId}` - Update message
- `DELETE /api/organizations/{id}/conversations/{conversationId}/messages/{messageId}` - Delete message
- `POST /api/organizations/{id}/conversations/{conversationId}/attachments` - Upload attachment
- `GET /api/organizations/{id}/conversations/{conversationId}/attachments` - Get attachments

### Dispute Resolution
- `GET /api/organizations/{id}/disputes` - List disputes
- `POST /api/organizations/{id}/disputes` - Create dispute
- `GET /api/organizations/{id}/disputes/{disputeId}` - Get dispute details
- `PUT /api/organizations/{id}/disputes/{disputeId}` - Update dispute
- `POST /api/organizations/{id}/disputes/{disputeId}/resolve` - Resolve dispute
- `POST /api/organizations/{id}/disputes/{disputeId}/escalate` - Escalate dispute
- `GET /api/organizations/{id}/disputes/{disputeId}/evidence` - Get dispute evidence
- `POST /api/organizations/{id}/disputes/{disputeId}/evidence` - Submit evidence
- `GET /api/organizations/{id}/disputes/{disputeId}/history` - Get dispute history

### Marketplace & Discovery
- `GET /api/marketplace/organizations` - Browse organizations
- `GET /api/marketplace/organizations/{orgId}` - Get organization profile
- `GET /api/marketplace/organizations/{orgId}/services` - Get organization services
- `GET /api/marketplace/organizations/{orgId}/reviews` - Get organization reviews
- `GET /api/marketplace/organizations/{orgId}/portfolio` - Get organization portfolio
- `GET /api/marketplace/search` - Search organizations
- `GET /api/marketplace/categories` - Get service categories
- `GET /api/marketplace/featured` - Get featured organizations
- `GET /api/marketplace/trending` - Get trending organizations

### Trust Accounting (IOLTA Compliance)
- `GET /api/organizations/{id}/trust-accounts` - List trust accounts
- `POST /api/organizations/{id}/trust-accounts` - Create trust account
- `GET /api/organizations/{id}/trust-accounts/{accountId}` - Get trust account details
- `PUT /api/organizations/{id}/trust-accounts/{accountId}` - Update trust account
- `POST /api/organizations/{id}/trust-accounts/{accountId}/deposit` - Deposit to trust
- `POST /api/organizations/{id}/trust-accounts/{accountId}/withdrawal` - Withdraw from trust
- `GET /api/organizations/{id}/trust-accounts/{accountId}/transactions` - Get trust transactions
- `GET /api/organizations/{id}/trust-accounts/{accountId}/reconciliation` - Get reconciliation
- `POST /api/organizations/{id}/trust-accounts/{accountId}/reconcile` - Perform reconciliation
- `GET /api/organizations/{id}/trust-accounts/compliance-report` - Get compliance report
- `GET /api/organizations/{id}/trust-accounts/three-way-reconciliation` - Three-way reconciliation

### Conflict Checking & Ethics
- `POST /api/organizations/{id}/conflicts/check` - Check for conflicts
- `GET /api/organizations/{id}/conflicts/rules` - Get conflict rules
- `POST /api/organizations/{id}/conflicts/rules` - Create conflict rule
- `PUT /api/organizations/{id}/conflicts/rules/{ruleId}` - Update conflict rule
- `DELETE /api/organizations/{id}/conflicts/rules/{ruleId}` - Delete conflict rule
- `POST /api/organizations/{id}/conflicts/waiver` - Create conflict waiver
- `GET /api/organizations/{id}/conflicts/history` - Get conflict check history
- `GET /api/organizations/{id}/conflicts/ongoing` - Get ongoing conflicts
- `POST /api/organizations/{id}/conflicts/{conflictId}/resolve` - Resolve conflict

### Legal Document Management
- `GET /api/organizations/{id}/documents/templates` - List document templates
- `POST /api/organizations/{id}/documents/templates` - Create document template
- `GET /api/organizations/{id}/documents/templates/{templateId}` - Get template details
- `PUT /api/organizations/{id}/documents/templates/{templateId}` - Update template
- `DELETE /api/organizations/{id}/documents/templates/{templateId}` - Delete template
- `POST /api/organizations/{id}/documents/templates/{templateId}/generate` - Generate document from template
- `GET /api/organizations/{id}/documents/assembly` - List document assemblies
- `POST /api/organizations/{id}/documents/assembly` - Create document assembly
- `GET /api/organizations/{id}/documents/{documentId}/versions` - Get document versions
- `POST /api/organizations/{id}/documents/{documentId}/version` - Create new version
- `GET /api/organizations/{id}/documents/{documentId}/audit-trail` - Get document audit trail
- `POST /api/organizations/{id}/documents/{documentId}/redact` - Redact document content

### PDF Analysis & Extraction (Adobe PDF Services)
- `POST /api/organizations/{id}/documents/{documentId}/extract` - Extract text and structure from PDF
- `GET /api/organizations/{id}/documents/{documentId}/extract/status` - Get extraction job status
- `GET /api/organizations/{id}/documents/{documentId}/extract/result` - Get extraction results
- `POST /api/organizations/{id}/documents/{documentId}/analyze` - Analyze PDF structure and content
- `GET /api/organizations/{id}/documents/{documentId}/analyze/tables` - Extract tables from PDF
- `GET /api/organizations/{id}/documents/{documentId}/analyze/text` - Get extracted text with formatting
- `GET /api/organizations/{id}/documents/{documentId}/analyze/metadata` - Get PDF metadata
- `POST /api/organizations/{id}/documents/{documentId}/ocr` - Perform OCR on scanned documents
- `POST /api/organizations/{id}/documents/batch-extract` - Batch extract multiple PDFs
- `GET /api/organizations/{id}/documents/batch-extract/{batchId}` - Get batch extraction status

### E-Signature Management
- `POST /api/organizations/{id}/documents/{documentId}/e-sign/request` - Request e-signature
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/status` - Get signature status
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/signers` - Get signer details
- `POST /api/organizations/{id}/documents/{documentId}/e-sign/remind` - Send signature reminder
- `POST /api/organizations/{id}/documents/{documentId}/e-sign/cancel` - Cancel signature request
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/download` - Download signed document
- `GET /api/organizations/{id}/documents/{documentId}/e-sign/certificate` - Get signing certificate
- `POST /api/organizations/{id}/e-sign/webhook` - E-signature webhook handler (DocuSign, etc)
- `GET /api/organizations/{id}/e-sign/requests` - List all signature requests
- `GET /api/organizations/{id}/e-sign/settings` - Get e-signature provider settings
- `PUT /api/organizations/{id}/e-sign/settings` - Update e-signature provider settings

### Court & Legal System Integration
- `GET /api/organizations/{id}/courts` - List courts
- `POST /api/organizations/{id}/courts` - Add court
- `GET /api/organizations/{id}/courts/{courtId}` - Get court details
- `PUT /api/organizations/{id}/courts/{courtId}` - Update court
- `GET /api/organizations/{id}/courts/{courtId}/rules` - Get court rules
- `GET /api/organizations/{id}/courts/{courtId}/deadlines` - Get court deadlines
- `POST /api/organizations/{id}/courts/{courtId}/e-file` - E-file document
- `GET /api/organizations/{id}/courts/{courtId}/filing-status/{filingId}` - Get filing status
- `GET /api/organizations/{id}/judges` - List judges
- `POST /api/organizations/{id}/judges` - Add judge
- `GET /api/organizations/{id}/judges/{judgeId}` - Get judge details
- `PUT /api/organizations/{id}/judges/{judgeId}/preferences` - Update judge preferences
- `GET /api/organizations/{id}/opposing-counsel` - List opposing counsel
- `POST /api/organizations/{id}/opposing-counsel` - Add opposing counsel
- `GET /api/organizations/{id}/opposing-counsel/{counselId}` - Get opposing counsel details

### Client Portal & Secure Communication
- `GET /api/organizations/{id}/client-portal/settings` - Get portal settings
- `PUT /api/organizations/{id}/client-portal/settings` - Update portal settings
- `GET /api/organizations/{id}/client-portal/{clientId}/access` - Get client portal access
- `POST /api/organizations/{id}/client-portal/{clientId}/invite` - Invite client to portal
- `POST /api/organizations/{id}/client-portal/{clientId}/revoke` - Revoke client portal access
- `GET /api/organizations/{id}/client-portal/{clientId}/assets` - Get client-visible assets
- `POST /api/organizations/{id}/client-portal/{clientId}/assets/share` - Share asset with client
- `GET /api/organizations/{id}/client-portal/{clientId}/case-status` - Get case status for client
- `PUT /api/organizations/{id}/client-portal/{clientId}/case-status` - Update client-visible case status
- `GET /api/organizations/{id}/client-portal/{clientId}/messages` - Get secure messages
- `POST /api/organizations/{id}/client-portal/{clientId}/messages` - Send secure message to client
- `GET /api/organizations/{id}/client-portal/{clientId}/questionnaires` - Get client questionnaires
- `POST /api/organizations/{id}/client-portal/{clientId}/questionnaires/{formId}/submit` - Submit questionnaire response

### Intake Forms & Client Qualification
- `GET /api/organizations/{id}/intake-forms` - List intake forms
- `POST /api/organizations/{id}/intake-forms` - Create intake form
- `GET /api/organizations/{id}/intake-forms/{formId}` - Get intake form details
- `PUT /api/organizations/{id}/intake-forms/{formId}` - Update intake form
- `DELETE /api/organizations/{id}/intake-forms/{formId}` - Delete intake form
- `POST /api/organizations/{id}/intake-forms/{formId}/publish` - Publish intake form
- `POST /api/organizations/{id}/intake-forms/{formId}/unpublish` - Unpublish intake form
- `GET /api/organizations/{id}/intake-forms/{formId}/fields` - Get form fields
- `POST /api/organizations/{id}/intake-forms/{formId}/fields` - Add form field
- `PUT /api/organizations/{id}/intake-forms/{formId}/fields/{fieldId}` - Update form field
- `DELETE /api/organizations/{id}/intake-forms/{formId}/fields/{fieldId}` - Delete form field
- `GET /api/organizations/{id}/intake-forms/{formId}/responses` - Get form responses
- `GET /api/organizations/{id}/intake-forms/{formId}/responses/{responseId}` - Get specific response
- `POST /api/organizations/{id}/intake-forms/{formId}/conditional-logic` - Add conditional logic
- `GET /api/organizations/{id}/intake-forms/{formId}/analytics` - Get form analytics

### Public Intake Form Submission
- `GET /api/public/organizations/{slug}/intake-forms` - List public intake forms
- `GET /api/public/organizations/{slug}/intake-forms/{formId}` - Get public intake form
- `POST /api/public/organizations/{slug}/intake-forms/{formId}/submit` - Submit intake form
- `POST /api/public/organizations/{slug}/intake-forms/{formId}/save-draft` - Save form draft
- `GET /api/public/organizations/{slug}/intake-forms/{formId}/draft/{draftId}` - Get saved draft

### Lead Management & Conversion
- `GET /api/organizations/{id}/leads` - List leads
- `POST /api/organizations/{id}/leads` - Create lead
- `GET /api/organizations/{id}/leads/{leadId}` - Get lead details
- `PUT /api/organizations/{id}/leads/{leadId}` - Update lead
- `DELETE /api/organizations/{id}/leads/{leadId}` - Delete lead
- `POST /api/organizations/{id}/leads/{leadId}/score` - Score lead
- `GET /api/organizations/{id}/leads/{leadId}/score` - Get lead score
- `POST /api/organizations/{id}/leads/{leadId}/conflict-check` - Check lead for conflicts
- `POST /api/organizations/{id}/leads/{leadId}/qualify` - Qualify/disqualify lead
- `POST /api/organizations/{id}/leads/{leadId}/convert` - Convert lead to client
- `GET /api/organizations/{id}/leads/{leadId}/activity` - Get lead activity history
- `POST /api/organizations/{id}/leads/{leadId}/notes` - Add lead notes
- `GET /api/organizations/{id}/leads/pipeline` - Get lead pipeline view
- `GET /api/organizations/{id}/leads/sources` - Get lead sources analytics

### Audit & Compliance
- `GET /api/organizations/{id}/audit-logs` - Get audit logs
- `GET /api/organizations/{id}/audit-logs/export` - Export audit logs
- `GET /api/organizations/{id}/audit-logs/user/{userId}` - Get user-specific audit logs
- `GET /api/organizations/{id}/audit-logs/resource/{resourceType}/{resourceId}` - Get resource audit logs
- `GET /api/organizations/{id}/data-retention/policies` - Get retention policies
- `POST /api/organizations/{id}/data-retention/policies` - Create retention policy
- `PUT /api/organizations/{id}/data-retention/policies/{policyId}` - Update retention policy
- `DELETE /api/organizations/{id}/data-retention/policies/{policyId}` - Delete retention policy
- `GET /api/organizations/{id}/gdpr/export-requests` - Get GDPR export requests
- `POST /api/organizations/{id}/gdpr/export-request` - Create GDPR export request
- `GET /api/organizations/{id}/gdpr/export-request/{requestId}` - Get export request status
- `GET /api/organizations/{id}/gdpr/deletion-requests` - Get GDPR deletion requests
- `POST /api/organizations/{id}/gdpr/deletion-request` - Create GDPR deletion request
- `GET /api/organizations/{id}/compliance/status` - Get compliance status
- `POST /api/organizations/{id}/compliance/check` - Run compliance check
- `GET /api/organizations/{id}/compliance/reports` - Get compliance reports

### Notification Management
- `GET /api/organizations/{id}/notifications` - List notifications
- `GET /api/organizations/{id}/notifications/{notificationId}` - Get notification details
- `PUT /api/organizations/{id}/notifications/{notificationId}/read` - Mark as read
- `PUT /api/organizations/{id}/notifications/{notificationId}/unread` - Mark as unread
- `DELETE /api/organizations/{id}/notifications/{notificationId}` - Delete notification
- `POST /api/organizations/{id}/notifications/mark-all-read` - Mark all as read
- `GET /api/organizations/{id}/notifications/unread-count` - Get unread count
- `GET /api/organizations/{id}/notifications/preferences` - Get notification preferences
- `PUT /api/organizations/{id}/notifications/preferences` - Update notification preferences

### Push Notifications
- `POST /api/organizations/{id}/push/register` - Register device for push notifications
- `PUT /api/organizations/{id}/push/update` - Update device registration
- `DELETE /api/organizations/{id}/push/unregister` - Unregister device
- `GET /api/organizations/{id}/push/devices` - List registered devices
- `POST /api/organizations/{id}/push/send` - Send push notification
- `POST /api/organizations/{id}/push/broadcast` - Broadcast to all devices
- `GET /api/organizations/{id}/push/delivery-status/{notificationId}` - Get delivery status
- `POST /api/organizations/{id}/push/test` - Test push notification

### Email Notifications
- `GET /api/organizations/{id}/email/templates` - List email templates
- `POST /api/organizations/{id}/email/templates` - Create email template
- `GET /api/organizations/{id}/email/templates/{templateId}` - Get email template
- `PUT /api/organizations/{id}/email/templates/{templateId}` - Update email template
- `DELETE /api/organizations/{id}/email/templates/{templateId}` - Delete email template
- `POST /api/organizations/{id}/email/send` - Send email notification
- `POST /api/organizations/{id}/email/bulk-send` - Send bulk email
- `GET /api/organizations/{id}/email/history` - Get email history
- `GET /api/organizations/{id}/email/delivery-status/{emailId}` - Get delivery status
- `POST /api/organizations/{id}/email/test` - Test email template

### In-App Notifications
- `GET /api/organizations/{id}/in-app/notifications` - List in-app notifications
- `POST /api/organizations/{id}/in-app/notifications` - Create in-app notification
- `PUT /api/organizations/{id}/in-app/notifications/{notificationId}` - Update notification
- `DELETE /api/organizations/{id}/in-app/notifications/{notificationId}` - Delete notification
- `POST /api/organizations/{id}/in-app/notifications/{notificationId}/dismiss` - Dismiss notification
- `GET /api/organizations/{id}/in-app/notifications/active` - Get active notifications
- `POST /api/organizations/{id}/in-app/notifications/broadcast` - Broadcast to all users

### Event Management & Tracking
- `GET /api/organizations/{id}/events` - List events
- `POST /api/organizations/{id}/events` - Create event
- `GET /api/organizations/{id}/events/{eventId}` - Get event details
- `PUT /api/organizations/{id}/events/{eventId}` - Update event
- `DELETE /api/organizations/{id}/events/{eventId}` - Delete event
- `POST /api/organizations/{id}/events/{eventId}/trigger` - Trigger event
- `GET /api/organizations/{id}/events/{eventId}/history` - Get event history
- `GET /api/organizations/{id}/events/{eventId}/analytics` - Get event analytics

### Event Rules & Automation
- `GET /api/organizations/{id}/event-rules` - List event rules
- `POST /api/organizations/{id}/event-rules` - Create event rule
- `GET /api/organizations/{id}/event-rules/{ruleId}` - Get event rule details
- `PUT /api/organizations/{id}/event-rules/{ruleId}` - Update event rule
- `DELETE /api/organizations/{id}/event-rules/{ruleId}` - Delete event rule
- `POST /api/organizations/{id}/event-rules/{ruleId}/test` - Test event rule
- `POST /api/organizations/{id}/event-rules/{ruleId}/enable` - Enable event rule
- `POST /api/organizations/{id}/event-rules/{ruleId}/disable` - Disable event rule

### Webhook Management
- `GET /api/organizations/{id}/webhooks` - List webhooks
- `POST /api/organizations/{id}/webhooks` - Create webhook
- `GET /api/organizations/{id}/webhooks/{webhookId}` - Get webhook details
- `PUT /api/organizations/{id}/webhooks/{webhookId}` - Update webhook
- `DELETE /api/organizations/{id}/webhooks/{webhookId}` - Delete webhook
- `POST /api/organizations/{id}/webhooks/{webhookId}/test` - Test webhook
- `GET /api/organizations/{id}/webhooks/{webhookId}/logs` - Get webhook logs
- `POST /api/organizations/{id}/webhooks/{webhookId}/retry` - Retry failed webhook

### Notification Analytics & Reporting
- `GET /api/organizations/{id}/notifications/analytics` - Get notification analytics
- `GET /api/organizations/{id}/notifications/engagement` - Get engagement metrics
- `GET /api/organizations/{id}/notifications/delivery-rates` - Get delivery rates
- `GET /api/organizations/{id}/notifications/click-rates` - Get click rates
- `GET /api/organizations/{id}/notifications/opt-out-rates` - Get opt-out rates
- `GET /api/organizations/{id}/notifications/export` - Export notification data
- `GET /api/organizations/{id}/events/analytics` - Get event analytics
- `GET /api/organizations/{id}/events/performance` - Get event performance metrics

### QuickBooks Integration
- `GET /api/organizations/{id}/quickbooks/connect` - Get QuickBooks connection status
- `POST /api/organizations/{id}/quickbooks/connect` - Connect to QuickBooks
- `DELETE /api/organizations/{id}/quickbooks/disconnect` - Disconnect QuickBooks
- `GET /api/organizations/{id}/quickbooks/company` - Get QuickBooks company info
- `GET /api/organizations/{id}/quickbooks/customers` - Sync QuickBooks customers
- `POST /api/organizations/{id}/quickbooks/customers` - Create customer in QuickBooks
- `GET /api/organizations/{id}/quickbooks/items` - Sync QuickBooks items/services
- `POST /api/organizations/{id}/quickbooks/items` - Create item in QuickBooks
- `GET /api/organizations/{id}/quickbooks/invoices` - Sync QuickBooks invoices
- `POST /api/organizations/{id}/quickbooks/invoices` - Create invoice in QuickBooks
- `GET /api/organizations/{id}/quickbooks/payments` - Sync QuickBooks payments
- `POST /api/organizations/{id}/quickbooks/payments` - Record payment in QuickBooks
- `GET /api/organizations/{id}/quickbooks/reports` - Get QuickBooks reports
- `POST /api/organizations/{id}/quickbooks/sync` - Manual sync with QuickBooks
- `GET /api/organizations/{id}/quickbooks/sync-status` - Get sync status

### Integration & Plugin System
- `GET /api/organizations/{id}/integrations` - List all integrations
- `GET /api/organizations/{id}/integrations/available` - List available integrations
- `POST /api/organizations/{id}/integrations` - Install integration
- `GET /api/organizations/{id}/integrations/{integrationId}` - Get integration details
- `PUT /api/organizations/{id}/integrations/{integrationId}` - Update integration
- `DELETE /api/organizations/{id}/integrations/{integrationId}` - Uninstall integration
- `POST /api/organizations/{id}/integrations/{integrationId}/configure` - Configure integration
- `POST /api/organizations/{id}/integrations/{integrationId}/test` - Test integration
- `POST /api/organizations/{id}/integrations/{integrationId}/enable` - Enable integration
- `POST /api/organizations/{id}/integrations/{integrationId}/disable` - Disable integration
- `GET /api/organizations/{id}/integrations/{integrationId}/logs` - Get integration logs
- `POST /api/organizations/{id}/integrations/{integrationId}/sync` - Manual sync
- `GET /api/organizations/{id}/integrations/{integrationId}/status` - Get integration status

### CRM Integrations
- `GET /api/organizations/{id}/crm/connections` - List CRM connections
- `POST /api/organizations/{id}/crm/connect` - Connect to CRM
- `DELETE /api/organizations/{id}/crm/disconnect` - Disconnect CRM
- `GET /api/organizations/{id}/crm/contacts` - Sync CRM contacts
- `POST /api/organizations/{id}/crm/contacts` - Create contact in CRM
- `GET /api/organizations/{id}/crm/leads` - Sync CRM leads
- `POST /api/organizations/{id}/crm/leads` - Create lead in CRM
- `GET /api/organizations/{id}/crm/opportunities` - Sync CRM opportunities
- `POST /api/organizations/{id}/crm/opportunities` - Create opportunity in CRM
- `GET /api/organizations/{id}/crm/activities` - Sync CRM activities
- `POST /api/organizations/{id}/crm/activities` - Create activity in CRM

### Calendar Integrations
- `GET /api/organizations/{id}/calendar/connections` - List calendar connections
- `POST /api/organizations/{id}/calendar/connect` - Connect to calendar (Google, Outlook, etc)
- `DELETE /api/organizations/{id}/calendar/disconnect` - Disconnect calendar
- `GET /api/organizations/{id}/calendar/events` - Sync calendar events
- `POST /api/organizations/{id}/calendar/events` - Create calendar event
- `PUT /api/organizations/{id}/calendar/events/{eventId}` - Update calendar event
- `DELETE /api/organizations/{id}/calendar/events/{eventId}` - Delete calendar event
- `GET /api/organizations/{id}/calendar/availability` - Get calendar availability
- `POST /api/organizations/{id}/calendar/availability` - Set calendar availability

### Document Management Integrations
- `GET /api/organizations/{id}/document-storage/connections` - List document storage connections
- `POST /api/organizations/{id}/document-storage/connect` - Connect to document service (Google Drive, Dropbox, etc)
- `DELETE /api/organizations/{id}/document-storage/disconnect` - Disconnect document service
- `GET /api/organizations/{id}/document-storage/folders` - Sync document folders
- `POST /api/organizations/{id}/document-storage/folders` - Create document folder
- `GET /api/organizations/{id}/document-storage/files` - Sync document files
- `POST /api/organizations/{id}/document-storage/upload` - Upload document
- `GET /api/organizations/{id}/document-storage/{fileId}/download` - Download document
- `POST /api/organizations/{id}/document-storage/{fileId}/share` - Share document

### Plugin Development & Management
- `GET /api/admin/plugins` - List available plugins
- `POST /api/admin/plugins` - Create new plugin
- `GET /api/admin/plugins/{pluginId}` - Get plugin details
- `PUT /api/admin/plugins/{pluginId}` - Update plugin
- `DELETE /api/admin/plugins/{pluginId}` - Delete plugin
- `POST /api/admin/plugins/{pluginId}/publish` - Publish plugin
- `POST /api/admin/plugins/{pluginId}/unpublish` - Unpublish plugin
- `GET /api/admin/plugins/{pluginId}/installations` - Get plugin installations
- `GET /api/admin/plugins/{pluginId}/analytics` - Get plugin analytics
- `POST /api/admin/plugins/{pluginId}/test` - Test plugin
- `GET /api/admin/plugins/{pluginId}/logs` - Get plugin logs

### Integration Marketplace
- `GET /api/marketplace/integrations` - Browse integration marketplace
- `GET /api/marketplace/integrations/{integrationId}` - Get integration details
- `GET /api/marketplace/integrations/{integrationId}/reviews` - Get integration reviews
- `POST /api/marketplace/integrations/{integrationId}/reviews` - Submit review
- `GET /api/marketplace/integrations/categories` - Get integration categories
- `GET /api/marketplace/integrations/featured` - Get featured integrations
- `GET /api/marketplace/integrations/popular` - Get popular integrations
- `GET /api/marketplace/integrations/search` - Search integrations

### Platform Administration (Blawby)
- `GET /api/admin/organizations` - List all organizations
- `GET /api/admin/organizations/{orgId}` - Get organization details
- `PUT /api/admin/organizations/{orgId}` - Update organization
- `POST /api/admin/organizations/{orgId}/suspend` - Suspend organization
- `POST /api/admin/organizations/{orgId}/reactivate` - Reactivate organization
- `DELETE /api/admin/organizations/{orgId}` - Delete organization
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{userId}` - Get user details
- `POST /api/admin/users/{userId}/impersonate` - Impersonate user (support)
- `GET /api/admin/feature-flags` - List all feature flags
- `POST /api/admin/feature-flags` - Create feature flag
- `GET /api/admin/feature-flags/{orgId}` - Get organization feature flags
- `PUT /api/admin/feature-flags/{orgId}` - Update organization feature flags
- `GET /api/admin/system/health` - Get system health status
- `GET /api/admin/system/metrics` - Get system metrics
- `GET /api/admin/system/logs` - Get system logs
- `POST /api/admin/system/backup` - Create system backup
- `GET /api/admin/system/backups` - List system backups
- `POST /api/admin/system/restore` - Restore from backup

### Cloudflare Infrastructure Management
- `GET /api/admin/cloudflare/zones` - List Cloudflare zones
- `POST /api/admin/cloudflare/zones` - Create Cloudflare zone
- `GET /api/admin/cloudflare/zones/{zoneId}` - Get zone details
- `GET /api/admin/cloudflare/zones/{zoneId}/dns` - Get DNS records
- `POST /api/admin/cloudflare/zones/{zoneId}/dns` - Create DNS record
- `PUT /api/admin/cloudflare/zones/{zoneId}/dns/{recordId}` - Update DNS record
- `DELETE /api/admin/cloudflare/zones/{zoneId}/dns/{recordId}` - Delete DNS record
- `GET /api/admin/cloudflare/zones/{zoneId}/ssl` - Get SSL settings
- `PUT /api/admin/cloudflare/zones/{zoneId}/ssl` - Update SSL settings
- `POST /api/admin/cloudflare/zones/{zoneId}/ssl/certificate` - Generate SSL certificate
- `GET /api/admin/cloudflare/zones/{zoneId}/page-rules` - Get page rules
- `POST /api/admin/cloudflare/zones/{zoneId}/page-rules` - Create page rule
- `GET /api/admin/cloudflare/zones/{zoneId}/workers` - Get Cloudflare Workers
- `POST /api/admin/cloudflare/zones/{zoneId}/workers` - Deploy Cloudflare Worker
- `GET /api/admin/cloudflare/zones/{zoneId}/analytics` - Get zone analytics
- `GET /api/admin/cloudflare/zones/{zoneId}/cache` - Get cache settings
- `POST /api/admin/cloudflare/zones/{zoneId}/cache/purge` - Purge cache
- `GET /api/admin/cloudflare/rate-limits` - Get rate limits
- `POST /api/admin/cloudflare/rate-limits` - Create rate limit rule
- `PUT /api/admin/cloudflare/rate-limits/{ruleId}` - Update rate limit rule
- `DELETE /api/admin/cloudflare/rate-limits/{ruleId}` - Delete rate limit rule
- `GET /api/admin/cloudflare/firewall` - Get firewall rules
- `POST /api/admin/cloudflare/firewall` - Create firewall rule
- `PUT /api/admin/cloudflare/firewall/{ruleId}` - Update firewall rule
- `DELETE /api/admin/cloudflare/firewall/{ruleId}` - Delete firewall rule
- `GET /api/admin/cloudflare/waf` - Get WAF settings
- `PUT /api/admin/cloudflare/waf` - Update WAF settings

### Domain & SSL Management (Organization Level)
- `GET /api/organizations/{id}/domains` - List organization domains
- `POST /api/organizations/{id}/domains` - Add custom domain
- `GET /api/organizations/{id}/domains/{domainId}` - Get domain details
- `PUT /api/organizations/{id}/domains/{domainId}` - Update domain settings
- `DELETE /api/organizations/{id}/domains/{domainId}` - Remove domain
- `POST /api/organizations/{id}/domains/{domainId}/verify` - Verify domain ownership
- `GET /api/organizations/{id}/domains/{domainId}/verification-status` - Get verification status
- `GET /api/organizations/{id}/domains/{domainId}/ssl` - Get SSL certificate status
- `POST /api/organizations/{id}/domains/{domainId}/ssl/provision` - Provision SSL certificate
- `GET /api/organizations/{id}/domains/{domainId}/dns` - Get DNS configuration
- `GET /api/organizations/{id}/domains/{domainId}/dns/instructions` - Get DNS setup instructions

### Multi-Jurisdiction Management
- `GET /api/organizations/{id}/jurisdictions` - List active jurisdictions
- `POST /api/organizations/{id}/jurisdictions` - Add jurisdiction
- `GET /api/organizations/{id}/jurisdictions/{jurisdictionId}` - Get jurisdiction details
- `PUT /api/organizations/{id}/jurisdictions/{jurisdictionId}` - Update jurisdiction
- `DELETE /api/organizations/{id}/jurisdictions/{jurisdictionId}` - Remove jurisdiction
- `GET /api/organizations/{id}/jurisdictions/{jurisdictionId}/rules` - Get jurisdiction-specific rules
- `GET /api/organizations/{id}/jurisdictions/{jurisdictionId}/bar-info` - Get bar association info
- `GET /api/organizations/{id}/jurisdictions/{jurisdictionId}/courts` - Get courts in jurisdiction
- `GET /api/organizations/{id}/jurisdictions/{jurisdictionId}/deadlines` - Get jurisdiction deadlines

### Security & Access Control
- `GET /api/organizations/{id}/security/sessions` - List active sessions
- `DELETE /api/organizations/{id}/security/sessions/{sessionId}` - Terminate session
- `POST /api/organizations/{id}/security/sessions/terminate-all` - Terminate all sessions
- `GET /api/organizations/{id}/security/2fa` - Get 2FA status
- `POST /api/organizations/{id}/security/2fa/enable` - Enable 2FA
- `POST /api/organizations/{id}/security/2fa/disable` - Disable 2FA
- `GET /api/organizations/{id}/security/access-logs` - Get access logs
- `GET /api/organizations/{id}/security/ip-whitelist` - Get IP whitelist
- `POST /api/organizations/{id}/security/ip-whitelist` - Add IP to whitelist
- `DELETE /api/organizations/{id}/security/ip-whitelist/{ipId}` - Remove IP from whitelist
- `GET /api/organizations/{id}/security/sso` - Get SSO configuration (via Better Auth)
- `POST /api/organizations/{id}/security/sso/saml` - Configure SAML SSO (via Better Auth)
- `POST /api/organizations/{id}/security/sso/oidc` - Configure OIDC SSO (via Better Auth)

### Advanced Permissions & Access Control
- `GET /api/organizations/{id}/permissions/roles` - List organization roles (Better Auth)
- `POST /api/organizations/{id}/permissions/roles` - Create custom role (Better Auth)
- `PUT /api/organizations/{id}/permissions/roles/{roleId}` - Update role permissions
- `DELETE /api/organizations/{id}/permissions/roles/{roleId}` - Delete custom role
- `GET /api/organizations/{id}/permissions/matrix` - Get full permission matrix
- `GET /api/organizations/{id}/permissions/user/{userId}` - Get user permissions
- `PUT /api/organizations/{id}/permissions/user/{userId}` - Update user permissions
- `GET /api/organizations/{id}/permissions/matter/{matterId}` - Get matter-level permissions
- `PUT /api/organizations/{id}/permissions/matter/{matterId}` - Set matter-level permissions
- `POST /api/organizations/{id}/permissions/matter/{matterId}/grant` - Grant user matter access
- `POST /api/organizations/{id}/permissions/matter/{matterId}/revoke` - Revoke user matter access
- `GET /api/organizations/{id}/permissions/client/{clientId}` - Get client-level permissions
- `PUT /api/organizations/{id}/permissions/client/{clientId}` - Set client-level permissions
- `GET /api/organizations/{id}/permissions/audit` - Get permission change audit log

### Data Export & Backup
- `POST /api/organizations/{id}/export/request` - Request full data export
- `GET /api/organizations/{id}/export/requests` - List export requests
- `GET /api/organizations/{id}/export/requests/{requestId}` - Get export request status
- `GET /api/organizations/{id}/export/requests/{requestId}/download` - Download export
- `POST /api/organizations/{id}/backup/create` - Create manual backup
- `GET /api/organizations/{id}/backup/history` - Get backup history
- `GET /api/organizations/{id}/backup/{backupId}/restore` - Restore from backup
- `DELETE /api/organizations/{id}/backup/{backupId}` - Delete backup

### Usage & Billing Tracking
- `GET /api/organizations/{id}/usage/current-period` - Get current billing period usage
- `GET /api/organizations/{id}/usage/seats` - Get seat usage details
- `GET /api/organizations/{id}/usage/transactions` - Get transaction volume
- `GET /api/organizations/{id}/usage/api-calls` - Get API usage (tracked via Cloudflare)
- `GET /api/organizations/{id}/usage/storage` - Get storage usage
- `GET /api/organizations/{id}/usage/bandwidth` - Get bandwidth usage
- `GET /api/organizations/{id}/usage/forecast` - Get usage forecast
- `GET /api/organizations/{id}/usage/alerts` - Get usage alert settings
- `PUT /api/organizations/{id}/usage/alerts` - Configure usage alerts

### Platform Analytics (Admin)
- `GET /api/admin/analytics/revenue` - Platform revenue analytics
- `GET /api/admin/analytics/organizations` - Organization growth metrics
- `GET /api/admin/analytics/users` - User growth metrics
- `GET /api/admin/analytics/transactions` - Transaction volume analytics
- `GET /api/admin/analytics/churn` - Churn analytics
- `GET /api/admin/analytics/mrr` - Monthly recurring revenue
- `GET /api/admin/analytics/ltv` - Customer lifetime value
- `GET /api/admin/analytics/features` - Feature usage analytics
- `GET /api/admin/analytics/performance` - System performance metrics
- `GET /api/admin/analytics/errors` - Error rate analytics

---

## API Design Notes

### Authentication
- All endpoints (except `/api/auth/*` and `/api/public/*`) require authentication via Better Auth
- Better Auth handles session management, API keys, and multi-factor authentication
- Organizations inherit Better Auth's security model for multi-tenancy

### Rate Limiting
- Rate limiting enforced at Cloudflare level using rate limit rules
- Default: 100 requests/minute per IP for authenticated endpoints
- Default: 20 requests/minute per IP for public endpoints
- Configurable per organization for premium plans
- Cloudflare Analytics tracks all API usage

### Cloudflare Integration
- All assets served via Cloudflare CDN with automatic optimization
- Cloudflare Workers handle edge routing and caching strategies
- Cloudflare Images for automatic image optimization and variants
- Cloudflare R2 for object storage (documents, media, backups)
- Cloudflare Pages for static website hosting per organization
- DNS and SSL provisioning automated via Cloudflare API

### Billing Model
- **Per-Seat Fee**: Organizations pay per active user seat (monthly)
- **Transaction Fee**: 1.4% platform fee on all payments processed through Stripe
- **Metered Billing**: Stripe tracks usage and generates monthly invoices
- **No Trial Period**: Organizations start paying immediately upon signup
- Stripe Connect handles payment processing for organizations
- Platform fees collected via Stripe application fees

### Data Model
- Multi-tenancy: Row-level security enforced via Better Auth
- Organizations are isolated data silos
- Assets stored with organization-scoped paths in Cloudflare R2
- Database: cloudflare with organization_id foreign keys
- Real-time: WebSocket connections scoped to organization

### Chatbot Capabilities
- Chatbot focuses on matter preparation (document collection, questionnaire completion)
- Available tools for chatbot:
  - Schedule appointments
  - Update matter/case information
  - Request documents from clients
  - Fill intake forms programmatically
  - Send notifications
  - Create tasks
  - **Search and recommend lawyers** (via external lawyer search API)
  - **Analyze uploaded documents** (via Adobe PDF Extract API)
  - **Draft documents with AI assistance** (Phase 14)
  - **Suggest legal strategies and arguments** (Phase 14)
  - **Predict matter outcomes and costs** (Phase 15)
- Chatbot does NOT provide legal advice to avoid unauthorized practice of law
- All chatbot interactions logged for compliance

### Email Integration
- Two-way sync with Gmail and Outlook
- Automatic email threading to matters based on:
  - Email subject line patterns
  - Sender/recipient matching to client records
  - User-defined auto-link rules
  - AI categorization of email content
- Send emails directly from platform
- Email templates for common communications
- Track email opens and clicks
- Maintain complete email audit trail for compliance
- Search across all emails by matter, client, or content

### Enhanced Calendar & Conflict Detection
- Real-time conflict detection across organization calendars
- Automatic court appearance tracking with deadline calculations
- Recurring events (weekly meetings, monthly retainers)
- Two-way sync with Google Calendar and Outlook
- Time blocking and capacity planning
- organization-wide availability views
- Court appearance alerts with travel time calculations

### Task Management with Dependencies
- Task dependencies (task B starts only after task A completes)
- Critical path visualization
- Recurring tasks (weekly case reviews, monthly reports)
- Task templates by matter type
- Workload balancing across organization members
- Automatic task assignment based on availability
- Reminders and escalations for overdue tasks

### Expense Tracking
- Receipt capture via mobile camera
- OCR extraction of receipt data (amount, vendor, date)
- Automatic expense categorization
- Mileage tracking with IRS rate updates
- Expense approval workflows
- Mark expenses as billable to clients
- Integration with invoicing

### Mobile Capabilities
- Quick time tracking start/stop
- Expense capture with photo
- Document scanning
- Push notifications for deadlines and tasks
- Offline mode with background sync
- Location-based check-ins
- Recent matters quick access

### Lawyer Search Integration
- External lawyer search API hosted at Cloudflare Workers
- Chatbot can search for lawyers based on:
  - Practice area extracted from user's case description
  - Geographic location/jurisdiction
  - Case complexity and budget
  - Lawyer ratings and reviews
- Search results integrated into chat flow
- Users can view lawyer profiles and connect directly
- Organizations can build referral networks from search results

### Adobe PDF Services Integration
- Used for automated document analysis and extraction
- Key capabilities:
  - Extract text, tables, and structure from legal PDFs
  - OCR for scanned documents
  - Identify document types (contracts, pleadings, discovery, etc)
  - Extract key information (dates, parties, clauses, obligations)
  - Batch processing for multiple documents
- Chatbot can analyze user-uploaded documents to:
  - Understand case details automatically
  - Pre-fill intake forms with extracted information
  - Identify missing documents needed for case
  - Suggest relevant practice areas for lawyer search
- Extraction results stored with document metadata for future reference

### Intake Form Flow
1. Organization creates intake form with custom fields
2. Form published to public website
3. Client fills form (can be assisted by chatbot)
4. Form submission creates Lead with conflict check
5. Lead scored and qualified/disqualified
6. Qualified lead converted to Client + Matter
7. Matter follows workflow template

### E-Signature Flow
1. Upload document to organization assets
2. Request e-signature with signer details
3. Integration sends request via DocuSign/HelloSign/SignNow
4. Webhook receives signature events
5. Signed document stored as new asset version
6. Audit trail maintained for compliance

### Workflow Automation
- Workflow templates define stages for matter types
- Each stage can have:
  - Required tasks
  - Automatic deadline calculations
  - Document templates
  - Email notifications
  - Automation rules (e.g., "when stage changes to X, do Y")
- Chatbot can trigger stage transitions based on completion criteria

### Domain & Website Management
1. Organization adds custom domain via dashboard
2. System provides DNS instructions (CNAME records)
3. Organization configures DNS at their registrar
4. System verifies domain ownership via DNS challenge
5. Cloudflare automatically provisions SSL certificate
6. Website deployed to Cloudflare Pages with custom domain
7. Chatbot widget embedded on organization's website

### Compliance & Security
- Audit logs track all data access and modifications
- GDPR-compliant data export and deletion
- Data retention policies enforce automatic cleanup
- Trust accounting with IOLTA compliance reporting
- Conflict checking integrated into intake process
- Multi-factor authentication enforced for sensitive operations
- IP whitelisting available for enterprise organizations

### Performance & Scalability
- Cloudflare CDN for global edge caching
- Cloudflare Images for automatic format optimization (WebP, AVIF)
- Lazy loading and pagination for large data sets
- Database query optimization with proper indexing
- WebSocket connections for real-time updates
- Background jobs for heavy operations (reports, exports, backups)
- Horizontal scaling via containerization