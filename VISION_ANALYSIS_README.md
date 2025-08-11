# Vision Analysis Feature Implementation

This document describes the implementation of vision + structured outputs for the legal intake chatbot.

## Overview

The vision analysis feature allows the chatbot to analyze uploaded images and documents using OpenAI's GPT-4o-mini model with guaranteed structured JSON outputs. This enables the AI to understand visual content like car crash photos, legal documents, and other relevant materials.

## Architecture

### New Components Added

1. **`/api/analyze` endpoint** (`worker/routes/analyze.ts`)
   - Accepts file uploads via FormData
   - Validates file types and sizes
   - Calls OpenAI GPT-4o-mini with JSON schema enforcement
   - Returns structured analysis results

2. **File Analysis Integration** (`worker/agents/legalIntakeAgent.ts`)
   - Detects file references in user messages
   - Automatically analyzes referenced files
   - Injects analysis results into the AI context
   - Enhances legal intake with document understanding

### JSON Schema Contract

All vision analysis returns a consistent JSON structure:

```json
{
  "summary": "string",
  "key_facts": ["string"],
  "entities": {
    "people": ["string"],
    "orgs": ["string"],
    "dates": ["string"]
  },
  "action_items": ["string"],
  "confidence": 0.0
}
```

## Usage

### Direct API Usage

```bash
curl -X POST /api/analyze \
  -F "file=@document.jpg" \
  -F "q=Summarize this legal document"
```

### Integration with Chat

When a user uploads a file and references it in chat (e.g., "Please analyze fileid:abc123"), the system will:

1. Detect the file reference
2. Retrieve the file from R2 storage
3. Analyze it using the vision model
4. Include the structured results in the AI context
5. Use the analysis to enhance the legal intake process

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# OpenAI Configuration (for vision analysis)
OPENAI_API_KEY=your_openai_api_key_here
```

### File Limits

- **Maximum file size**: 8MB for analysis (vs 25MB for storage)
- **Supported formats**: 
  - Images: JPEG, PNG, WebP, GIF, TIFF, HEIC, HEIF
  - Documents: PDF, TXT
- **Security**: MIME type validation and file extension filtering

## Implementation Details

### Error Handling

- **Timeout**: 20-second timeout with graceful fallback
- **File validation**: Comprehensive MIME type and size checks
- **API errors**: Proper error propagation with user-friendly messages

### Performance Considerations

- **Async processing**: File analysis happens in parallel with chat
- **Caching**: Analysis results are included in chat metadata
- **Fallbacks**: Graceful degradation when analysis fails

### Security

- **Input validation**: Strict MIME type allowlist
- **Size limits**: Prevents abuse and controls costs
- **Content filtering**: No PII logging in analysis requests

## Testing

Run the test suite:

```bash
npm test tests/integration/api/analyze.test.ts
```

Tests cover:
- File validation (type, size)
- Error handling
- API integration
- Default question handling

## Future Enhancements

1. **PDF Processing**: Add OCR for image-based PDFs
2. **Batch Analysis**: Process multiple files simultaneously
3. **Cloudflare AI**: Migrate to Workers AI vision models
4. **Advanced OCR**: Better text extraction from complex documents
5. **Content Moderation**: Filter inappropriate content

## Migration Path

The implementation is designed for easy migration:

1. **Current**: OpenAI GPT-4o-mini with JSON schema
2. **Future**: Cloudflare Workers AI vision models
3. **Schema**: Consistent JSON contract across providers

## Cost Considerations

- **OpenAI GPT-4o-mini**: ~$0.0025 per 1K tokens
- **Vision input**: Higher token usage than text
- **Rate limiting**: Implement usage quotas as needed
- **Caching**: Store analysis results to reduce API calls

## Monitoring

The system logs:
- File analysis attempts and results
- Confidence scores and entity counts
- Error rates and timeouts
- API usage metrics

Monitor these logs to optimize performance and costs.
