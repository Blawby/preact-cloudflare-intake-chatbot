# Prompt for Cursor: Analyze current chatbot stack for vision + structured outputs

## Human Summary

### Architecture (1–2 paragraphs)
The current chatbot is a Cloudflare Workers-based legal intake system with a Preact frontend. The architecture follows a serverless pattern where the main entrypoint (`worker/index.ts`) routes requests to specialized handlers for different functionalities. The core AI processing happens in `worker/agents/legalIntakeAgent.ts` which uses Cloudflare's AI service with the `@cf/meta/llama-3.1-8b-instruct` model. File uploads are handled through `worker/routes/files.ts` with comprehensive MIME type validation and R2 bucket storage. The system uses D1 for relational data storage, KV for session management, and includes security validation middleware. The chat flow is primarily text-based with tool calling for structured actions like creating legal matters.

### What's already there
**File handling:** Comprehensive file upload pipeline supporting images, PDFs, documents, and media files with 25MB size limits and security validation. Files are stored in R2 with metadata in D1. **AI model:** Using Cloudflare's Llama 3.1 8B Instruct model with basic tool calling capabilities. **Security:** Input validation middleware, location-based security, and MIME type allowlists. **Storage:** R2 for files, D1 for relational data, KV for sessions. **Tool calling:** Basic tool calling system for legal matter creation with parameter validation.

### Gaps for our goal
**Vision support:** No image analysis or OCR capabilities. The current system stores images but doesn't process them with AI. **Structured outputs:** No JSON schema enforcement or guaranteed structured responses. Tool calling exists but relies on text parsing rather than native JSON schema support. **PDF processing:** Files are stored but not parsed or analyzed. **Vision-capable models:** Current Llama model doesn't support vision inputs.

### Recommended path (MVP)
Add a new `/api/analyze` route that accepts file uploads and calls a vision-capable model (like `@cf/microsoft/phi-3-vision` or `@cf/openai/gpt-4o-mini`) with `response_format: { type: "json_schema" }`. Keep the existing Llama flow for normal chat. The analyze endpoint should:
1. Accept image/PDF uploads via FormData
2. Convert PDFs to images using Cloudflare's PDF processing
3. Call vision model with structured JSON schema for legal document analysis
4. Return structured analysis results
5. Optionally store analysis in D1 for future reference

### Risks & quick fixes
**File size limits:** Current 25MB limit may be insufficient for high-res images. Consider image compression or chunking. **Token limits:** Vision models have higher token costs. Implement usage tracking and limits. **Latency:** PDF processing can be slow. Use Cloudflare Queues for async processing of large documents. **Security:** Ensure PII filtering in vision analysis. Add content moderation for uploaded images. **Cost:** Vision models are more expensive. Implement rate limiting and usage quotas.

## Machine-readable inventory (JSON)

```json
{
  "entrypoints": [
    { "file": "worker/index.ts", "route": "/api/agent", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/agent/stream", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/chat", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/files/upload", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/files/*", "method": "GET" },
    { "file": "worker/index.ts", "route": "/api/teams/*", "method": "GET" },
    { "file": "worker/index.ts", "route": "/api/forms", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/scheduling", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/review", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/payment", "method": "POST" },
    { "file": "worker/index.ts", "route": "/api/debug", "method": "GET" },
    { "file": "worker/index.ts", "route": "/api/health", "method": "GET" }
  ],
  "upload_pipeline": {
    "routes": [
      { 
        "route": "/api/files/upload", 
        "accepts": [
          "text/plain", "text/csv", "application/pdf", "application/msword", 
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
          "image/svg", "image/bmp", "image/tiff", "image/tif", "image/x-icon", 
          "image/vnd.microsoft.icon", "image/heic", "image/heif",
          "video/mp4", "video/webm", "video/quicktime", "video/avi", "video/mov", "video/m4v",
          "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/webm"
        ], 
        "max_bytes": 26214400 
      }
    ],
    "parsers": [
      { "type": "unknown", "lib": "FormData", "where": "worker/routes/files.ts:189" }
    ],
    "storage": [
      { "type": "R2", "binding": "FILES_BUCKET", "bucket_or_table": "blawby-ai-files", "keys": ["uploads/*"] },
      { "type": "D1", "binding": "DB", "bucket_or_table": "files", "keys": ["id", "team_id", "session_id", "file_path"] }
    ]
  },
  "models": [
    {
      "name": "@cf/meta/llama-3.1-8b-instruct",
      "provider": "workers-ai",
      "endpoint": "env.AI.run",
      "sdk": "Cloudflare AI",
      "mode": "chat",
      "supports_vision": false,
      "structured_output": "none",
      "max_context": null
    }
  ],
  "chat_flow": {
    "message_build": { 
      "file": "worker/agents/legalIntakeAgent.ts", 
      "path": "formattedMessages mapping", 
      "notes": "Converts UI messages to AI format with role/content structure" 
    },
    "system_prompt_loc": { 
      "file": "worker/agents/legalIntakeAgent.ts", 
      "path": "systemPrompt variable" 
    },
    "streaming": true,
    "tool_calls": [
      { 
        "name": "create_matter", 
        "schema": {
          "type": "object",
          "properties": {
            "matter_type": { "type": "string", "enum": ["Family Law", "Employment Law", "Personal Injury", "Criminal Law", "Civil Law", "General Consultation"] },
            "description": { "type": "string" },
            "urgency": { "type": "string", "enum": ["low", "medium", "high", "urgent"] },
            "name": { "type": "string" },
            "phone": { "type": "string" },
            "email": { "type": "string" },
            "location": { "type": "string" },
            "opposing_party": { "type": "string" }
          },
          "required": ["matter_type", "description", "urgency", "name"]
        }
      },
      { 
        "name": "collect_contact_info", 
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "minLength": 2, "maxLength": 100 },
            "phone": { "type": "string", "pattern": "^[+]?[0-9\\s\\-\\(\\)]{7,20}$" },
            "email": { "type": "string", "format": "email" },
            "location": { "type": "string", "minLength": 2, "maxLength": 100 }
          },
          "required": ["name"]
        }
      },
      { 
        "name": "request_lawyer_review", 
        "schema": {
          "type": "object",
          "properties": {
            "urgency": { "type": "string", "enum": ["low", "medium", "high", "urgent"] },
            "complexity": { "type": "string" },
            "matter_type": { "type": "string" }
          },
          "required": ["urgency", "matter_type"]
        }
      },
      { 
        "name": "schedule_consultation", 
        "schema": {
          "type": "object",
          "properties": {
            "preferred_date": { "type": "string" },
            "preferred_time": { "type": "string" },
            "matter_type": { "type": "string" }
          },
          "required": ["matter_type"]
        }
      }
    ]
  },
  "limits": {
    "worker_timeout_ms": 30000,
    "max_upload_mb": 25,
    "max_pdf_pages": null,
    "rate_limits": "Basic request validation with 10MB content-length check"
  },
  "security": {
    "auth": "none",
    "allowed_mime_types": [
      "text/plain", "text/csv", "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "image/svg", "image/bmp", "image/tiff", "image/tif", "image/x-icon",
      "image/vnd.microsoft.icon", "image/heic", "image/heif",
      "video/mp4", "video/webm", "video/quicktime", "video/avi", "video/mov", "video/m4v",
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/webm"
    ],
    "validation": { 
      "schema_lib": "zod", 
      "files_sanitized": true 
    }
  },
  "observability": {
    "logging": "structured",
    "metrics": "none",
    "trace_ids": false
  },
  "decision_inputs_needed": [
    "Do we need citations in vision analysis?",
    "Target max latency P95 for vision processing?",
    "Preferred vision model provider (Cloudflare vs OpenAI)?",
    "Budget ceiling per 1k vision requests?",
    "Should we process PDFs synchronously or asynchronously?",
    "Do we need to store vision analysis results in database?"
  ],
  "proposed_insertion_points": [
    { 
      "file": "worker/routes/files.ts", 
      "function": "handleFiles", 
      "why": "Add /api/analyze endpoint alongside existing file upload logic" 
    },
    { 
      "file": "worker/agents/legalIntakeAgent.ts", 
      "function": "runLegalIntakeAgent", 
      "why": "Add vision model call with structured output when files are present" 
    },
    { 
      "file": "worker/index.ts", 
      "function": "handleRequest", 
      "why": "Add route for /api/analyze endpoint" 
    }
  ]
}
```
