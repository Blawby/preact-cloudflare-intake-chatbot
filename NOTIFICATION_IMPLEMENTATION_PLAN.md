# Notification System Implementation Plan

## Current State Analysis

### ✅ Existing Infrastructure

**Email Notifications (Resend Integration)**
- **File**: `worker/services/EmailService.ts` (lines 1-32)
- **File**: `worker/services/NotificationService.ts` (lines 1-128)
- **Current Types**: `lawyer_review`, `matter_created`, `payment_required`
- **Integration**: Used in `worker/services/ContactIntakeOrchestrator.ts` (lines 186-235)

**Real-time Communication (SSE)**
- **File**: `worker/routes/agent.ts` (lines 40-389)
- **Implementation**: Server-Sent Events for chat streaming
- **Headers**: `Content-Type: text/event-stream` (line 48)
- **Client**: `src/hooks/useMessageHandling.ts` (lines 55-582)

**PWA & Service Worker**
- **File**: `public/sw.js` (lines 1-18) - Basic implementation
- **File**: `vite.config.ts` (lines 98-143) - PWA configuration
- **Manifest**: Auto-generated with VitePWA plugin

**Toast System**
- **File**: `src/contexts/ToastContext.tsx` - Basic in-app notifications
- **File**: `src/components/Toast.tsx` - Toast UI component
- **File**: `src/components/ToastContainer.tsx` - Toast container

**Settings Infrastructure**
- **File**: `src/components/settings/SettingsPage.tsx` (lines 1-189)
- **File**: `src/components/settings/hooks/useSettingsData.ts` (lines 1-118)
- **File**: `src/components/settings/hooks/useSettingsNavigation.ts` (lines 1-91)

### 🔧 Cloudflare Workers Environment

**Available Resources** (`worker/types.ts` lines 4-37):
- `RESEND_API_KEY` - Email service
- `CHAT_SESSIONS: KVNamespace` - Session storage
- `DB: D1Database` - Database
- `DOC_EVENTS: Queue` - Background processing (currently used for file analysis)
- `PARALEGAL_TASKS: Queue` - Task processing

**Existing Queue Infrastructure**:
- **Producer**: `worker/routes/files.ts` (lines 120-126) - Enqueues file processing
- **Consumer**: `worker/consumers/doc-processor.ts` (lines 20-71) - Processes document events
- **Queue Binding**: `DOC_EVENTS` in `worker/index.ts` (line 119)
- **Configuration**: `wrangler.toml` lines 76-83

**Current Queue Pattern**:
```typescript
// Producer (files.ts)
await env.DOC_EVENTS.send({
  key: storageKey,
  teamId,
  sessionId,
  mime: file.type,
  size: file.size
});

// Consumer (doc-processor.ts)
export default {
  async queue(batch: MessageBatch<DocumentEvent>, env: Env) {
    for (const msg of batch.messages) {
      // Process each message
    }
  }
}
```

## Implementation Strategy

### Phase 1: Enhanced Email Notifications with Queue Processing

**Extend Existing Files:**

1. **`worker/services/EmailService.ts`**
   - Add HTML template support
   - Add email analytics tracking
   - Add attachment support
   - Add email preferences validation

2. **`worker/services/NotificationService.ts`**
   - Add new notification types: `system_alert`, `matter_update`, `payment_completed`, `document_ready`
   - Add HTML email templates
   - Add email preference checking
   - **Queue Integration**: Enqueue email notifications instead of sending immediately

3. **New Queue Consumer**: `worker/consumers/notification-processor.ts`
   - Process email notifications from queue
   - Handle retry logic with exponential backoff
   - Track delivery status and analytics
   - Follow existing pattern from `doc-processor.ts`

4. **Database Schema** (New migration)
   - Add `notification_preferences` table
   - Add `email_templates` table
   - Add `notification_logs` table

**Queue Integration Pattern**:
```typescript
// Producer (NotificationService.ts)
await env.NOTIFICATION_QUEUE.send({
  type: 'email',
  notificationType: 'matter_created',
  recipient: ownerEmail,
  template: 'matter_created',
  data: { matterInfo, clientInfo },
  teamId,
  sessionId
});

// Consumer (notification-processor.ts)
export default {
  async queue(batch: MessageBatch<NotificationEvent>, env: Env) {
    for (const msg of batch.messages) {
      // Process email notifications
      // Handle retries, analytics, delivery tracking
    }
  }
}
```

### Phase 2: Live In-App Notifications with Queue Integration

**Extend Existing SSE Infrastructure:**

1. **`worker/routes/agent.ts`**
   - Add new SSE event types for notifications
   - Extend existing streaming response (lines 201-295)
   - Add notification-specific middleware

2. **`src/hooks/useMessageHandling.ts`**
   - Extend SSE event handling (lines 174-203)
   - Add notification state management
   - Add notification persistence

3. **Queue Integration for Live Notifications:**
   - **Producer**: Enqueue live notifications in `NotificationService.ts`
   - **Consumer**: `worker/consumers/live-notification-processor.ts`
   - **SSE Delivery**: Process queue and deliver via existing SSE infrastructure

4. **New Files to Create:**
   - `worker/services/LiveNotificationService.ts`
   - `worker/consumers/live-notification-processor.ts`
   - `src/hooks/useNotifications.ts`
   - `src/components/NotificationCenter.tsx`
   - `src/components/NotificationItem.tsx`

**Live Notification Queue Pattern**:
```typescript
// Producer (NotificationService.ts)
await env.LIVE_NOTIFICATION_QUEUE.send({
  type: 'live',
  notificationType: 'matter_update',
  userId: userId,
  teamId: teamId,
  sessionId: sessionId,
  data: { matterId, status, message },
  priority: 'high'
});

// Consumer (live-notification-processor.ts)
export default {
  async queue(batch: MessageBatch<LiveNotificationEvent>, env: Env) {
    for (const msg of batch.messages) {
      // Deliver via SSE to active sessions
      // Store in KV for offline users
      // Update notification preferences
    }
  }
}
```

### Phase 3: Browser Push Notifications with Queue Processing

**Extend Service Worker:**

1. **`public/sw.js`**
   - Add push event listeners
   - Add notification click handlers
   - Add background sync for offline notifications

2. **Queue Integration for Push Notifications:**
   - **Producer**: Enqueue push notifications in `NotificationService.ts`
   - **Consumer**: `worker/consumers/push-notification-processor.ts`
   - **Web Push API**: Process queue and send via Web Push API

3. **New Files to Create:**
   - `worker/routes/push.ts` - Push notification endpoint
   - `worker/consumers/push-notification-processor.ts`
   - `src/hooks/usePushNotifications.ts`
   - `src/utils/pushSubscription.ts`

4. **Database Schema** (New migration)
   - Add `push_subscriptions` table
   - Add `notification_delivery_logs` table

**Push Notification Queue Pattern**:
```typescript
// Producer (NotificationService.ts)
await env.PUSH_NOTIFICATION_QUEUE.send({
  type: 'push',
  notificationType: 'urgent_matter',
  subscription: pushSubscription,
  payload: {
    title: 'Urgent Legal Matter',
    body: 'New urgent matter requires attention',
    data: { matterId, teamId, url: '/matters/123' }
  },
  teamId,
  userId
});

// Consumer (push-notification-processor.ts)
export default {
  async queue(batch: MessageBatch<PushNotificationEvent>, env: Env) {
    for (const msg of batch.messages) {
      // Send via Web Push API
      // Handle delivery failures and retries
      // Track delivery analytics
    }
  }
}
```

### Phase 4: Notification Settings & Preferences

**Extend Settings Infrastructure:**

1. **`src/components/settings/SettingsPage.tsx`**
   - Add notification preferences section (line 510-514 in plan.md shows this was removed)
   - Add navigation to notification settings

2. **New Files to Create:**
   - `src/components/settings/pages/NotificationPage.tsx`
   - `src/components/settings/hooks/useNotificationPreferences.ts`
   - `src/components/settings/NotificationPreferenceItem.tsx`

3. **Backend Support:**
   - `worker/routes/notifications.ts` - CRUD for notification preferences
   - `worker/services/NotificationPreferencesService.ts`

### Phase 5: Advanced Features

**Real-time Updates:**
1. **WebSocket Support** (Optional)
   - New file: `worker/routes/websocket.ts`
   - Extend `worker/middleware/cors.ts` (lines 115-118 already handle WebSocket upgrades)

2. **Notification Analytics:**
   - Extend `worker/services/NotificationService.ts`
   - Add tracking for open rates, click rates, delivery status

3. **Smart Notifications:**
   - Add notification batching
   - Add notification scheduling
   - Add notification frequency limits

## File Structure Overview

### Files to Extend (Existing)
```
worker/
├── services/
│   ├── EmailService.ts (enhance)
│   └── NotificationService.ts (enhance)
├── routes/
│   └── agent.ts (extend SSE)
├── middleware/
│   └── cors.ts (WebSocket support)
└── types.ts (add notification types)

src/
├── hooks/
│   └── useMessageHandling.ts (extend SSE handling)
├── contexts/
│   └── ToastContext.tsx (extend for notifications)
├── components/
│   ├── settings/
│   │   ├── SettingsPage.tsx (add notification section)
│   │   └── hooks/
│   │       ├── useSettingsData.ts (extend)
│   │       └── useSettingsNavigation.ts (extend)
│   └── Toast.tsx (enhance for notifications)
└── config/
    └── features.ts (add notification feature flags)

public/
└── sw.js (enhance for push notifications)
```

### Files to Create (New)
```
worker/
├── services/
│   ├── LiveNotificationService.ts
│   ├── NotificationPreferencesService.ts
│   └── PushNotificationService.ts
├── routes/
│   ├── notifications.ts
│   └── push.ts
├── consumers/
│   ├── notification-processor.ts
│   ├── live-notification-processor.ts
│   └── push-notification-processor.ts
└── schemas/
    └── notificationSchemas.ts

src/
├── hooks/
│   ├── useNotifications.ts
│   ├── usePushNotifications.ts
│   └── useNotificationPreferences.ts
├── components/
│   ├── NotificationCenter.tsx
│   ├── NotificationItem.tsx
│   └── settings/
│       ├── pages/
│       │   └── NotificationPage.tsx
│       └── NotificationPreferenceItem.tsx
└── utils/
    └── pushSubscription.ts

migrations/
├── add_notification_preferences.sql
├── add_notification_logs.sql
└── add_push_subscriptions.sql
```

## Cloudflare Best Practices Integration

### 1. **Edge Computing**
- Use Cloudflare Workers for notification processing
- Leverage KV for notification preferences caching
- Use D1 for persistent notification data

### 2. **Performance**
- **Queue-based Processing**: Leverage existing Queue infrastructure for async notification processing
- **Batch Processing**: Process multiple notifications in queue consumers
- **KV Caching**: Cache notification templates and user preferences in KV
- **Global Edge**: Use Cloudflare's global network for fast delivery

### 3. **Security**
- Validate notification permissions
- Use Cloudflare's security headers
- Implement rate limiting for notification endpoints

### 4. **Scalability**
- **Existing Queue Infrastructure**: Extend current `DOC_EVENTS` and `PARALEGAL_TASKS` queues
- **New Queue Bindings**: Add `NOTIFICATION_QUEUE`, `LIVE_NOTIFICATION_QUEUE`, `PUSH_NOTIFICATION_QUEUE`
- **Queue Consumers**: Follow existing pattern from `doc-processor.ts`
- **Auto-scaling**: Leverage Cloudflare's auto-scaling for queue processing
- **Deduplication**: Implement notification deduplication in queue consumers

## Preact Integration Strategy

### 1. **Component Architecture**
- Extend existing settings components
- Create reusable notification components
- Use Preact's lightweight nature for performance

### 2. **State Management**
- Extend existing hooks pattern
- Use context for global notification state
- Implement optimistic updates

### 3. **Real-time Updates**
- Extend existing SSE handling
- Use Preact's efficient re-rendering
- Implement proper cleanup for subscriptions

## Queue Integration Strategy Summary

### ✅ **Leverage Existing Queue Infrastructure**

**Current Queue Pattern** (from `doc-processor.ts`):
- **Producer**: `worker/routes/files.ts` enqueues file processing
- **Consumer**: `worker/consumers/doc-processor.ts` processes in batches
- **Queue Binding**: `DOC_EVENTS` in `worker/index.ts`
- **Error Handling**: Retry logic and structured logging

**Notification Queue Extensions**:
1. **Email Notifications**: `NOTIFICATION_QUEUE` → `notification-processor.ts`
2. **Live Notifications**: `LIVE_NOTIFICATION_QUEUE` → `live-notification-processor.ts`  
3. **Push Notifications**: `PUSH_NOTIFICATION_QUEUE` → `push-notification-processor.ts`

**Benefits of Queue-based Processing**:
- **Async Processing**: Non-blocking notification delivery
- **Retry Logic**: Built-in retry with exponential backoff
- **Batch Processing**: Efficient handling of multiple notifications
- **Error Isolation**: Failed notifications don't affect other operations
- **Scalability**: Auto-scaling with Cloudflare's infrastructure

## Implementation Priority

1. **High Priority**: Enhanced email notifications with queue processing (extends existing)
2. **High Priority**: Live in-app notifications with queue + SSE (extends existing)
3. **Medium Priority**: Notification settings (extends existing settings)
4. **Medium Priority**: Browser push notifications with queue processing (extends existing PWA)
5. **Low Priority**: Advanced features (analytics, smart notifications)

## Dependencies

### Existing Dependencies (package.json)
- `better-auth` - User authentication
- `framer-motion` - Animations for notifications
- `@heroicons/react` - Notification icons

### New Dependencies to Add
- `web-push` - Push notification library
- `zod` - Notification schema validation (already exists)

### Queue Configuration Updates

**`wrangler.toml` additions:**
```toml
# New queue bindings for notifications
[[queues.producers]]
queue = "notification-events"
binding = "NOTIFICATION_QUEUE"

[[queues.producers]]
queue = "live-notification-events"
binding = "LIVE_NOTIFICATION_QUEUE"

[[queues.producers]]
queue = "push-notification-events"
binding = "PUSH_NOTIFICATION_QUEUE"

# Queue consumers
[[queues.consumers]]
queue = "notification-events"

[[queues.consumers]]
queue = "live-notification-events"

[[queues.consumers]]
queue = "push-notification-events"
```

**`worker/types.ts` additions:**
```typescript
export interface Env {
  // ... existing properties
  NOTIFICATION_QUEUE: Queue;
  LIVE_NOTIFICATION_QUEUE: Queue;
  PUSH_NOTIFICATION_QUEUE: Queue;
}
```

## Environment Variables

### Existing (wrangler.toml)
- `RESEND_API_KEY` - Email service

### New to Add
- `VAPID_PUBLIC_KEY` - Push notification public key
- `VAPID_PRIVATE_KEY` - Push notification private key
- `NOTIFICATION_WEBHOOK_SECRET` - Webhook validation

## Testing Strategy

### Unit Tests
- Extend existing test structure in `tests/`
- Test notification services
- Test notification components

### Integration Tests
- Test email delivery
- Test push notification delivery
- Test notification preferences

### E2E Tests
- Test notification flow end-to-end
- Test notification settings
- Test notification delivery

## Monitoring & Analytics

### Metrics to Track
- Email delivery rates
- Push notification delivery rates
- Notification click-through rates
- User notification preferences

### Logging
- Extend existing Logger in `worker/utils/logger.js`
- Add notification-specific logging
- Track notification performance

## Security Considerations

### Data Protection
- Encrypt sensitive notification data
- Implement proper access controls
- Validate notification permissions

### Rate Limiting
- Extend existing rate limiting in `worker/middleware/rateLimit.ts`
- Implement notification-specific rate limits
- Prevent notification spam

### Privacy
- Respect user notification preferences
- Implement notification opt-out
- Comply with email regulations (CAN-SPAM, GDPR)
