# ActivityTimeline Backend Integration Plan

## Overview
Connect the ActivityTimeline component to real backend data from `matter_events` and `session_audit_events` tables instead of using placeholder data.

## Current State
- ✅ Database schema exists (`matter_events`, `session_audit_events`)
- ❌ No API routes to fetch activity data
- ❌ No services to retrieve events
- ❌ ActivityTimeline uses hardcoded placeholder data
- ❌ No event creation when actions occur

## Implementation Plan

### Phase 1: Backend API Infrastructure

#### 1.1 Create Activity Service
**File:** `worker/services/ActivityService.ts`

```typescript
export interface ActivityEvent {
  id: string;
  uid: string; // Globally unique identifier across all sources (e.g., prefixed or UUID)
  type: 'matter_event' | 'session_event';
  eventType: string; // 'payment', 'status_change', 'document_added', etc.
  title: string;
  description: string;
  eventDate: string;
  actorType?: 'user' | 'lawyer' | 'system';
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ActivityQueryOptions {
  matterId?: string;
  sessionId?: string;
  limit?: number; // default 25, max 50
  cursor?: string; // opaque pagination token
  since?: string; // ISO 8601 timestamp
  until?: string; // ISO 8601 timestamp
  type?: string[]; // event types to filter by
  actorType?: 'user' | 'lawyer' | 'system';
}

export interface ActivityQueryResult {
  items: ActivityEvent[];
  nextCursor?: string;
  total?: number;
  hasMore: boolean;
}

export class ActivityService {
  constructor(private env: Env) {}

  async getMatterEvents(matterId: string): Promise<ActivityEvent[]>
  async getSessionEvents(sessionId: string): Promise<ActivityEvent[]>
  async getCombinedActivity(matterId?: string, sessionId?: string): Promise<ActivityEvent[]>
  async queryActivity(options: ActivityQueryOptions): Promise<ActivityQueryResult>
  async createEvent(event: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<string>
  
  // Cursor management
  private encodeCursor(data: any): string
  private decodeCursor(cursor: string): any
  private generateNextCursor(lastItem: ActivityEvent, options: ActivityQueryOptions): string
}
```

#### 1.2 Create Activity API Route
**File:** `worker/routes/activity.ts`

```typescript
// GET /api/activity - Comprehensive activity endpoint with pagination, filtering, and caching
// POST /api/activity (create new event)
export async function handleActivity(request: Request, env: Env): Promise<Response>
```

**Authentication & Authorization Requirements:**

Both GET and POST endpoints require authentication and enforce tenant scoping:

**Authentication:**
- **JWT Token**: Required in `Authorization: Bearer <jwt_token>` header
- **Token Format**: JWT with standard claims (`sub`, `iat`, `exp`, `iss`) plus custom claims:
  ```json
  {
    "sub": "user_123",
    "iat": 1640995200,
    "exp": 1641081600,
    "iss": "blawby-ai-chatbot",
    "tenant_id": "team_456",
    "role": "user|lawyer|admin",
    "permissions": ["activity:read", "activity:create"]
  }
  ```
- **Validation Steps**:
  1. Verify JWT signature using shared secret from `env.JWT_SECRET`
  2. Check token expiration (`exp` claim)
  3. Validate issuer (`iss` claim must match expected value)
  4. Extract tenant ID from `tenant_id` claim
  5. Extract user role and permissions from claims

**Tenant Scoping:**
- **Extraction**: Tenant ID extracted from JWT `tenant_id` claim
- **Enforcement**: All queries MUST be scoped to the authenticated user's tenant
- **Server-side Validation**: Verify user has access to requested `matterId`/`sessionId` within their tenant
- **Data Isolation**: Never return events from other tenants, even if IDs match

**Role-Based Access Control (RBAC):**

**GET /api/activity (Read Operations):**
- **Roles with Read Access**: `user`, `lawyer`, `admin`
- **Permission Required**: `activity:read`
- **Scope**: Users can only read events for matters/sessions they have access to within their tenant
- **Lawyer Access**: Lawyers can read events for all matters in their tenant
- **Admin Access**: Admins can read all events in their tenant

**POST /api/activity (Create Operations):**
- **Roles with Create Access**: `lawyer`, `admin` (users cannot create events directly)
- **Permission Required**: `activity:create`
- **Validation**: Verify user has access to the target matter/session before creating event
- **Actor Assignment**: System automatically sets `actorId` to authenticated user's ID

**GET /api/activity Query Parameters:**
- `matterId` (optional): Filter events for specific matter
- `sessionId` (optional): Filter events for specific session  
- `limit` (optional, default: 25, max: 50): Number of events to return
- `cursor` (optional): Signed base64url-encoded pagination token for next page
- `since` (optional): ISO 8601 timestamp - only return events after this time
- `until` (optional): ISO 8601 timestamp - only return events before this time
- `type` (optional): Comma-separated event types to filter by (e.g., "payment_completed,image_added")
- `actorType` (optional): Filter by actor type ("user", "lawyer", "system")

**Response Format:**
```typescript
interface ActivityResponse {
  items: ActivityEvent[];
  nextCursor?: string; // Signed base64url token for next page, null if no more results
  total?: number; // Total count when feasible (not always available for performance)
  hasMore: boolean; // Convenience flag indicating if more results exist
}

interface ActivityEvent {
  id: string;
  uid: string; // Globally unique identifier across all sources (e.g., prefixed or UUID)
  type: 'matter_event' | 'session_event';
  eventType: string;
  title: string;
  description: string;
  eventDate: string; // ISO 8601
  actorType?: 'user' | 'lawyer' | 'system';
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: string; // ISO 8601
}
```

**Sorting:** Stable sort by `event_date DESC, created_at DESC, id DESC` to ensure consistent pagination

**Caching:** 
- ETag header based on content hash of results
- If-None-Match conditional requests return 304 Not Modified
- Cache-Control: private, max-age=60, must-revalidate (prevents shared cache leakage)
- Vary: Authorization, Cookie, X-Tenant-ID (ensures per-user/tenant cache keys)
- Alternative: Cache-Control: no-store for highly sensitive activity feeds

**Rate Limiting:**
- 429 Too Many Requests when rate limit exceeded
- Rate limit: 50 requests per minute per user/token+IP combination (configurable via environment)
- 304 Not Modified responses are excluded from rate limit counting
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
- Error response: `{"error": "Rate limit exceeded", "retryAfter": 60}`
- Retry-After header value matches the retryAfter field in error response body

**Cursor Implementation:**
- Signed base64url-encoded token containing minimal seek keys: `{lastEventDate, lastCreatedAt, limit}`
- Filters are reconstructed from current request query parameters (not stored in cursor)
- HMAC signature computed using server-side secret to prevent tampering
- nextCursor computed from last item's sort fields plus current query params
- Returns HTTP 400 when signature validation fails or token is tampered with

**Cursor Error Handling:**
- HTTP 400 Bad Request when cursor signature validation fails
- HTTP 400 Bad Request when cursor is malformed or tampered with
- Error response: `{"error": "Invalid cursor", "code": "INVALID_CURSOR"}`
- Clients should discard invalid cursors and restart pagination from the beginning

**Example Requests:**
```bash
# Get first page of recent activity
GET /api/activity?matterId=123&limit=25

# Get next page using signed cursor (filters reconstructed from query params)
GET /api/activity?matterId=123&limit=25&cursor=eyJwYXlsb2FkIjoie1wibGFzdEV2ZW50RGF0ZVwiOlwiMjAyNC0wMS0xNVQxMDowMDowMFpcIixcImxhc3RDcmVhdGVkQXQiOlwiMjAyNC0wMS0xNVQxMDowMDowMFpcIixcImxpbWl0XCI6MjV9Iiwic2lnbmF0dXJlIjoiYWJjZGVmZ2hpamsifQ

# Filter by date range and event types
GET /api/activity?matterId=123&since=2024-01-01T00:00:00Z&until=2024-01-31T23:59:59Z&type=payment_completed,image_added&limit=10

# Get session events with conditional caching
GET /api/activity?sessionId=456&limit=50
# Response includes: ETag: "abc123", Cache-Control: private, max-age=60, must-revalidate, Vary: Authorization, Cookie, X-Tenant-ID
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "evt_123",
      "uid": "matter_evt_123_20240115_103000",
      "type": "matter_event",
      "eventType": "payment_completed",
      "title": "Payment Completed",
      "description": "Payment of $500.00 processed successfully",
      "eventDate": "2024-01-15T10:30:00Z",
      "actorType": "user",
      "actorId": "user_456",
      "metadata": {"amount": 500, "currency": "USD"},
      "createdAt": "2024-01-15T10:30:05Z"
    },
    {
      "id": "evt_124",
      "uid": "session_evt_124_20240115_091500", 
      "type": "session_event",
      "eventType": "image_added",
      "title": "Image Added",
      "description": "Image added: profile_photo.jpg",
      "eventDate": "2024-01-15T09:15:00Z",
      "actorType": "user",
      "actorId": "user_456",
      "metadata": {"filename": "profile_photo.jpg", "size": 2048576},
      "createdAt": "2024-01-15T09:15:30Z"
    }
  ],
  "nextCursor": "eyJsYXN0RXZlbnREYXRlIjoiMjAyNC0wMS0xNVQwOToxNTowMFoiLCJsYXN0Q3JlYXRlZEF0IjoiMjAyNC0wMS0xNVQwOToxNTozMFoifQ==",
  "hasMore": true,
  "total": 47
}
```

**Caching Security Considerations:**
- **Private Caching**: `Cache-Control: private` ensures responses are only cached by the user's browser, never by shared proxies or CDNs
- **Must-Revalidate**: Forces revalidation with server before serving stale content, ensuring data freshness
- **Vary Headers**: `Vary: Authorization, Cookie, X-Tenant-ID` ensures separate cache entries per user/tenant
- **ETag Validation**: Content-based ETags prevent serving stale data when activity changes
- **Sensitive Data Option**: For highly sensitive activity feeds, use `Cache-Control: no-store` to disable caching entirely
- **Authentication Headers**: Include all relevant auth headers in Vary to prevent cross-user cache pollution

**POST /api/activity Request Body:**
```typescript
interface CreateActivityRequest {
  type: 'matter_event' | 'session_event';
  eventType: string;
  title: string;
  description: string;
  eventDate: string; // ISO 8601 timestamp
  matterId?: string; // Required for matter_event
  sessionId?: string; // Required for session_event
  metadata?: Record<string, any>;
  // Idempotency mechanism (choose one):
  idempotencyKey?: string; // Client-provided unique key
  clientEventId?: string;  // Alternative: client-unique event ID
}
```

**Idempotency Requirements:**

**Mechanism Options:**
1. **Idempotency-Key Header**: `Idempotency-Key: <unique-client-generated-key>`
2. **Client Event ID**: Include `clientEventId` in request body
3. **Combined Approach**: Use both for maximum reliability

**Server Deduplication Behavior:**
- **Storage**: Store idempotency keys in KV store with TTL of 24 hours
- **Key Format**: `idempotency:{tenant_id}:{idempotency_key}` or `idempotency:{tenant_id}:{client_event_id}`
- **Check Process**: Before processing, check if key exists in KV store
- **Response Handling**:
  - **409 Conflict**: Return existing event data if duplicate submission detected
  - **200 OK**: Return existing event data (same as 409, but indicates success)
  - **201 Created**: Return newly created event data
- **Side Effects**: Only persist idempotency markers AFTER successful event creation
- **TTL Management**: Keys expire after 24 hours to prevent indefinite storage

**Response Codes:**
- **201 Created**: New event successfully created
- **200 OK**: Duplicate request, returning existing event
- **409 Conflict**: Duplicate request with conflict details
- **400 Bad Request**: Invalid request body or missing required fields
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions or tenant access denied
- **422 Unprocessable Entity**: Validation errors (invalid dates, missing matter/session access)

**Example POST Request:**
```bash
POST /api/activity
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Idempotency-Key: payment_123_2024-01-15_10-30-00
Content-Type: application/json

{
  "type": "matter_event",
  "eventType": "payment_completed",
  "title": "Payment Completed",
  "description": "Payment of $500.00 processed successfully",
  "eventDate": "2024-01-15T10:30:00Z",
  "matterId": "matter_123",
  "metadata": {
    "amount": 500,
    "currency": "USD",
    "paymentMethod": "credit_card"
  }
}
```

**Example Responses:**

**201 Created (New Event):**
```json
{
  "id": "evt_789",
  "uid": "matter_evt_789_20240115_103000",
  "type": "matter_event",
  "eventType": "payment_completed",
  "title": "Payment Completed",
  "description": "Payment of $500.00 processed successfully",
  "eventDate": "2024-01-15T10:30:00Z",
  "actorType": "lawyer",
  "actorId": "lawyer_456",
  "metadata": {
    "amount": 500,
    "currency": "USD",
    "paymentMethod": "credit_card"
  },
  "createdAt": "2024-01-15T10:30:05Z"
}
```

**409 Conflict (Duplicate):**
```json
{
  "error": "Duplicate request detected",
  "existingEvent": {
    "id": "evt_789",
    "uid": "matter_evt_789_20240115_103000",
    "type": "matter_event",
    "eventType": "payment_completed",
    "title": "Payment Completed",
    "description": "Payment of $500.00 processed successfully",
    "eventDate": "2024-01-15T10:30:00Z",
    "actorType": "lawyer",
    "actorId": "lawyer_456",
    "metadata": {
      "amount": 500,
      "currency": "USD",
      "paymentMethod": "credit_card"
    },
    "createdAt": "2024-01-15T10:30:05Z"
  },
  "idempotencyKey": "payment_123_2024-01-15_10-30-00"
}
```

**Implementation Notes for Developers:**

**Required Implementation Steps:**
1. **Token Validation**: Always validate JWT tokens before processing any request
2. **Tenant Extraction**: Extract tenant ID from JWT claims and enforce scoping
3. **RBAC Enforcement**: Check user permissions before allowing read/create operations
4. **Idempotency Check**: Check for existing idempotency keys BEFORE processing side effects
5. **Data Persistence**: Only persist idempotency markers AFTER successful event creation
6. **Error Handling**: Return appropriate HTTP status codes with descriptive error messages
7. **Audit Logging**: Log all authentication failures and permission denials for security monitoring

**Security Considerations:**
- Never expose events from other tenants, even with matching IDs
- Validate all input data and sanitize metadata fields
- Implement rate limiting to prevent abuse
- Log security events for monitoring and alerting
- Use secure JWT secret management (environment variables, not hardcoded)

#### 1.3 Add Event Creation Points
Update existing services to create activity events:

- **PaymentService**: Create events for payment completion/failure
- **SessionService**: Create events for session milestones
- **Legal Intake Agent**: Create events for matter creation, status changes
- **File Upload Service**: Create events for all media types (images, videos, audio, documents, other files)
- **Message Handling**: Track when different media types are shared in conversations

### Phase 2: Frontend Integration

#### 2.1 Create Activity Hook
**File:** `src/hooks/useActivity.ts`

```typescript
export interface UseActivityOptions {
  matterId?: string;
  sessionId?: string;
  limit?: number; // default 25, max 50
  since?: string; // ISO 8601 timestamp
  until?: string; // ISO 8601 timestamp
  type?: string[]; // event types to filter by
  actorType?: 'user' | 'lawyer' | 'system';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enablePagination?: boolean; // default true
}

export interface UseActivityResult {
  events: ActivityEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total?: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>; // Load next page using cursor
  reset: () => void; // Reset to first page
  // Caching support
  etag?: string;
  lastModified?: string;
}

export function useActivity(options: UseActivityOptions): UseActivityResult {
  // Fetch activity events with pagination support
  // Handle loading states (initial load, load more, refresh)
  // Implement cursor-based pagination
  // Support private caching with ETag/If-None-Match (prevents shared cache leakage)
  // Handle rate limiting (429 responses)
  // Return: { events, loading, error, hasMore, total, refresh, loadMore, reset, etag }
}
```

#### 2.2 Update ActivityTimeline Component
**File:** `src/components/ActivityTimeline.tsx`

```typescript
interface ActivityTimelineProps {
  matterId?: string;
  sessionId?: string;
  className?: string;
  // Pagination and filtering options
  limit?: number;
  since?: string;
  until?: string;
  type?: string[];
  actorType?: 'user' | 'lawyer' | 'system';
  // UI behavior
  enablePagination?: boolean;
  showLoadMore?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Remove hardcoded data
// Use useActivity hook with pagination support
// Handle loading/error states (initial load, load more, refresh)
// Display real events with proper formatting
// Implement "Load More" button for pagination
// Show loading indicators for different states
// Handle rate limiting gracefully
// Support private caching with conditional requests (304 responses)
// Display total count when available
```

#### 2.3 Add Activity to App Layout
**File:** `src/components/AppLayout.tsx`

```typescript
// Pass matterId/sessionId to ActivityTimeline
// Handle case when no matter/session exists
```

### Phase 3: Event Types & Mapping

#### 3.1 Define Event Types
```typescript
export const EVENT_TYPES = {
  // Matter Events
  MATTER_CREATED: 'matter_created',
  MATTER_STATUS_CHANGED: 'matter_status_changed',
  LAWYER_ASSIGNED: 'lawyer_assigned',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  
  // Media Events (comprehensive file type tracking)
  IMAGE_ADDED: 'image_added',
  VIDEO_ADDED: 'video_added', 
  AUDIO_ADDED: 'audio_added',
  DOCUMENT_ADDED: 'document_added',
  FILE_ADDED: 'file_added', // for "other" category files
  
  // Link Events (if implemented)
  LINK_SHARED: 'link_shared',
  
  // Session Events
  SESSION_STARTED: 'session_started',
  CONTACT_INFO_PROVIDED: 'contact_info_provided',
  INTAKE_COMPLETED: 'intake_completed',
  REVIEW_REQUESTED: 'review_requested',
} as const;
```

#### 3.2 Event Icon Mapping
```typescript
export const EVENT_ICONS = {
  [EVENT_TYPES.MATTER_CREATED]: ClockIcon,
  [EVENT_TYPES.CONTACT_INFO_PROVIDED]: UserIcon,
  [EVENT_TYPES.PAYMENT_COMPLETED]: CreditCardIcon,
  [EVENT_TYPES.LAWYER_ASSIGNED]: UserPlusIcon,
  [EVENT_TYPES.MATTER_STATUS_CHANGED]: ChatBubbleLeftRightIcon,
  
  // Media Events
  [EVENT_TYPES.IMAGE_ADDED]: PhotoIcon,
  [EVENT_TYPES.VIDEO_ADDED]: VideoCameraIcon,
  [EVENT_TYPES.AUDIO_ADDED]: MusicalNoteIcon,
  [EVENT_TYPES.DOCUMENT_ADDED]: DocumentTextIcon,
  [EVENT_TYPES.FILE_ADDED]: DocumentIcon,
  [EVENT_TYPES.LINK_SHARED]: LinkIcon,
  
  // Session Events
  [EVENT_TYPES.SESSION_STARTED]: ClockIcon,
  [EVENT_TYPES.INTAKE_COMPLETED]: CheckCircleIcon,
  [EVENT_TYPES.REVIEW_REQUESTED]: ChatBubbleLeftRightIcon,
} as const;
```

### Phase 4: Data Flow & Integration Points

#### 4.1 Event Creation Flow
```mermaid
graph TD
    A[User Action] --> B[Service Method]
    B --> C[Create Activity Event]
    C --> D[Store in Database]
    D --> E[Update UI via Hook]
```

#### 4.2 Integration Points
1. **Payment Completion**: `PaymentService.completePayment()` → Create payment event
2. **Matter Creation**: `LegalIntakeAgent.createMatter()` → Create matter_created event
3. **Status Changes**: `ReviewService.processReview()` → Create status_change event
4. **File Upload**: `FileService.uploadFile()` → Create specific media event based on file category:
   - Images (JPEG, PNG, GIF, etc.) → `image_added` event
   - Videos (MP4, WebM, etc.) → `video_added` event  
   - Audio (MP3, WAV, etc.) → `audio_added` event
   - Documents (PDF, DOC, etc.) → `document_added` event
   - Other files → `file_added` event
5. **Contact Form**: `ContactIntakeOrchestrator.submitForm()` → Create contact_info_provided event
6. **Message Handling**: Track media sharing in conversations using existing `mediaAggregation.ts` logic

### Phase 5: UI/UX Enhancements

#### 5.1 Loading States
- Skeleton loader for timeline items
- Progressive loading (show recent events first)
- Error states with retry functionality

#### 5.2 Event Formatting
- Relative timestamps ("2 hours ago", "Yesterday")
- Rich descriptions with context and file names:
  - "Image added: profile_photo.jpg"
  - "Video added: deposition_recording.mp4" 
  - "Audio added: voicemail_message.wav"
  - "Document added: employment_contract.pdf"
  - "File added: case_notes.txt"
- Clickable events (link to relevant documents/actions)
- Grouping by date
- File type-specific icons and styling

#### 5.3 Real-time Updates
- WebSocket connection for live updates
- Polling fallback for activity refresh
- Optimistic updates for user actions

## Implementation Order

### Week 1: Backend Foundation
1. Create `ActivityService.ts` with comprehensive media event support
2. Create `/api/activity` route
3. Add event creation to existing services with file type categorization
4. Integrate with existing `mediaAggregation.ts` logic for file categorization
5. Test with sample data across all media types

### Week 2: Frontend Integration
1. Create `useActivity` hook
2. Update `ActivityTimeline` component to handle all media types
3. Remove placeholder data
4. Add loading/error states
5. Implement file type-specific icons and descriptions

### Week 3: Polish & Testing
1. Add event type mappings
2. Implement proper formatting
3. Add real-time updates
4. Comprehensive testing

## Database Queries

### Get Matter Events
```sql
SELECT 
  id,
  event_type,
  title,
  description,
  event_date,
  created_by_lawyer_id,
  metadata,
  created_at
FROM matter_events 
WHERE (? IS NULL OR matter_id = ?) 
ORDER BY event_date DESC, created_at DESC
```

### Get Session Events
```sql
SELECT 
  id,
  event_type,
  actor_type,
  actor_id,
  payload,
  created_at
FROM session_audit_events 
WHERE (? IS NULL OR session_id = ?) 
ORDER BY created_at DESC
```

### Combined Activity Query with Pagination and Filtering
```sql
-- Union of matter and session events with proper typing, pagination, and filtering
WITH combined_events AS (
  SELECT 
    'matter_event' as type,
    id,
    event_type,
    title,
    description,
    event_date as event_date,
    created_by_lawyer_id as actor_id,
    'lawyer' as actor_type,
    metadata,
    created_at
  FROM matter_events 
  WHERE (? IS NULL OR matter_id = ?)
    AND (? IS NULL OR event_date >= ?) -- since filter
    AND (? IS NULL OR event_date <= ?) -- until filter
    AND (? IS NULL OR event_type IN (SELECT value FROM json_each(?))) -- type filter
    AND (? IS NULL OR 'lawyer' = ?) -- actorType filter

  UNION ALL

  SELECT 
    'session_event' as type,
    id,
    event_type,
    event_type as title,
    payload as description,
    created_at as event_date,
    actor_id,
    actor_type,
    json_object('payload', payload) as metadata, -- Safe JSON construction using SQLite's json_object()
    created_at
  FROM session_audit_events 
  WHERE (? IS NULL OR session_id = ?)
    AND (? IS NULL OR created_at >= ?) -- since filter
    AND (? IS NULL OR created_at <= ?) -- until filter
    AND (? IS NULL OR event_type IN (SELECT value FROM json_each(?))) -- type filter
    AND (? IS NULL OR actor_type = ?) -- actorType filter
),
filtered_events AS (
  SELECT * FROM combined_events
  WHERE (? IS NULL OR (event_date < ? OR (event_date = ? AND (created_at < ? OR (created_at = ? AND id < ?))))) -- cursor-based pagination: seek-style predicate for DESC order
  ORDER BY event_date DESC, created_at DESC, id DESC
  LIMIT ? -- limit parameter
)
SELECT * FROM filtered_events;

-- Count query for total (when feasible)
SELECT COUNT(*) as total FROM combined_events;
```

### Cursor-Based Pagination Implementation
```typescript
import { createHmac } from 'crypto';

// Note: This code should be within a function that has access to env parameter
// e.g., inside handleActivity(request: Request, env: Env) function

// Cursor contains only minimal seek keys: {lastEventDate, lastCreatedAt, limit}
const cursorData = {
  lastEventDate: "2024-01-15T09:15:00Z",
  lastCreatedAt: "2024-01-15T09:15:30Z", 
  limit: 25
};

// Create HMAC signature
const secret = env.CURSOR_SECRET; // Worker environment binding
if (!secret) {
  throw new Error('CURSOR_SECRET environment binding is required for cursor signing');
}
const payload = JSON.stringify(cursorData);
const signature = createHmac('sha256', secret).update(payload).digest('hex');

// Combine payload and signature
const signedData = { payload, signature };

// Encode with base64url (URL-safe base64)
const cursor = Buffer.from(JSON.stringify(signedData))
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

// Decode and verify cursor
function decodeCursor(cursor: string, currentFilters: any, env: Env) {
  try {
    // Decode base64url
    const padded = cursor + '='.repeat((4 - cursor.length % 4) % 4)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString());
    
    // Verify HMAC signature
    const secret = env.CURSOR_SECRET;
    if (!secret) {
      throw new Error('CURSOR_SECRET environment binding is required for cursor verification');
    }
    const expectedSignature = createHmac('sha256', secret)
      .update(decoded.payload)
      .digest('hex');
    
    if (decoded.signature !== expectedSignature) {
      throw new Error('Invalid cursor signature');
    }
    
    const cursorData = JSON.parse(decoded.payload);
    // Use cursorData.lastEventDate and cursorData.lastCreatedAt for WHERE clauses
    // Reconstruct filters from current request parameters, not from cursor
    return { ...cursorData, filters: currentFilters };
  } catch (error) {
    throw new Error('Invalid or tampered cursor');
  }
}
```

## Testing Strategy

### Unit Tests
- `ActivityService` methods (queryActivity, cursor encoding/decoding)
- Event creation logic
- Data transformation functions
- Cursor-based pagination logic
- Rate limiting logic
- ETag generation and conditional caching

### Integration Tests
- API endpoint functionality with all query parameters
- Database queries with pagination and filtering
- Frontend hook behavior (useActivity with pagination)
- Cursor-based pagination flow
- Rate limiting enforcement (429 responses)
- Conditional caching (304 responses)
- Error handling for malformed cursors

### E2E Tests
- Complete activity timeline flow with pagination
- Load more functionality
- Filtering by date range and event types
- Real-time updates with caching
- Rate limiting scenarios
- Error handling scenarios (network failures, malformed responses)
- Performance testing with large datasets

## Success Metrics

1. **Functionality**: ActivityTimeline displays real events from database across all media types
2. **Performance**: Timeline loads within 500ms
3. **Accuracy**: Events are created for all major user actions including file uploads
4. **Media Coverage**: All supported file types (images, videos, audio, documents, other) are properly tracked
5. **UX**: Smooth loading states, error handling, and file type-specific visual indicators
6. **Maintainability**: Clean separation of concerns and integration with existing media aggregation logic

## Future Enhancements

1. **Event Filtering**: Filter by event type, date range, actor, media type
2. **Event Details**: Expandable event details with full context and media previews
3. **Event Actions**: Click to view related documents/actions, preview media files
4. **Media Previews**: Thumbnail previews for images/videos in timeline
5. **Export**: Export activity timeline as PDF with media references
6. **Notifications**: Real-time notifications for important events
7. **Analytics**: Activity metrics and insights by media type
8. **Link Tracking**: If link sharing is implemented, track and display link events

## Risk Mitigation

1. **Data Migration**: Ensure existing data is preserved
2. **Performance**: Index database tables properly
3. **Backwards Compatibility**: Maintain existing API contracts
4. **Error Handling**: Graceful degradation when events fail to load
5. **Security**: Validate event creation permissions
