import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';
import { AdobeDocumentService, type AdobeExtractSuccess } from '../services/AdobeDocumentService.js';
import { 
  log, 
  generateRequestId, 
  logRequestStart, 
  logAIProcessing, 
  logError, 
  logWarning 
} from '../utils/logging.js';

interface AnalysisResult {
  summary: string;
  key_facts: string[];
  entities: {
    people: string[];
    orgs: string[];
    dates: string[];
  };
  action_items: string[];
  confidence: number;
  error?: string;
}


// Helper function to create fallback response
function _createFallbackResponse(aiResponse: string): AnalysisResult {
  return {
    summary: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
    key_facts: [aiResponse],
    entities: { people: [], orgs: [], dates: [] },
    action_items: [],
    confidence: 0.6
  };
}


async function attemptAdobeExtract(
  file: File,
  question: string,
  env: Env,
  requestId: string
): Promise<AnalysisResult | null> {
  const adobeService = new AdobeDocumentService(env);
  const eligibleTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  log('info', 'adobe_extract_attempt', {
    request_id: requestId,
    fileType: file.type,
    isEligibleType: eligibleTypes.has(file.type),
    isEnabled: adobeService.isEnabled(),
    enableFlag: env.ENABLE_ADOBE_EXTRACT,
    adobeClientId: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET',
    adobeClientSecret: env.ADOBE_CLIENT_SECRET ? 'SET' : 'NOT SET'
  });

  log('info', 'adobe_service_check', {
    request_id: requestId,
    isEnabled: adobeService.isEnabled(),
    enableFlag: env.ENABLE_ADOBE_EXTRACT,
    adobeClientId: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET'
  });

  if (!eligibleTypes.has(file.type)) {
    log('info', 'adobe_extract_skipped', { request_id: requestId, reason: 'not_eligible_type', fileType: file.type });
    return null;
  }
  
  if (!adobeService.isEnabled()) {
    log('info', 'adobe_extract_skipped', { request_id: requestId, reason: 'not_enabled', isEnabled: adobeService.isEnabled() });
    return null;
  }

  try {
    log('info', 'adobe_extraction_start', { request_id: requestId, fileName: file.name, fileType: file.type });
    const buffer = await file.arrayBuffer();
    log('info', 'adobe_file_buffer', { request_id: requestId, fileName: file.name, bufferSize: buffer.byteLength });
    
    const extractResult = await adobeService.extractFromBuffer(file.name, file.type, buffer);
    log('info', 'adobe_extraction_result', {
      request_id: requestId,
      success: extractResult.success,
      hasDetails: !!extractResult.details,
      error: extractResult.error,
      warnings: extractResult.warnings
    });

    if (!extractResult.success || !extractResult.details) {
      log('warn', 'adobe_extraction_failed', { request_id: requestId, reason: 'no_success_or_details' });
      return null;
    }

    log('info', 'adobe_extraction_success', { request_id: requestId, fileName: file.name });
    return await summarizeAdobeExtract(extractResult.details, question, env, requestId);
  } catch (error) {
    logWarning(requestId, 'adobe_extract_failed', 'Adobe extract failed, using fallback analysis path', {
      fileName: file.name,
      fileType: file.type,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function summarizeAdobeExtract(
  extract: AdobeExtractSuccess,
  question: string,
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  const rawText = extract.text ?? '';
  const truncatedText = rawText.length > 20000
    ? `${rawText.slice(0, 20000)}...`
    : rawText;

  const structuredPayload = JSON.stringify({
    tables: extract.tables ?? [],
    elements: extract.elements ?? []
  }).slice(0, 6000);

  const systemPrompt = [
    'You are a legal intake analyst receiving structured output from Adobe PDF Services.',
    'Use the provided document text and structured data to answer the intake question.',
    'Return STRICT JSON: { "summary": string, "key_facts": string[], "entities": { "people": string[], "orgs": string[], "dates": string[] }, "action_items": string[], "confidence": number }',
    'Highlight parties, obligations, important dates, dollar amounts, and recommended next steps.'
  ].join('\n');

  const userPrompt = [
    `Intake question: ${question}`,
    truncatedText ? `Extracted text:\n${truncatedText}` : '',
    structuredPayload ? `Structured data:\n${structuredPayload}` : ''
  ].filter(Boolean).join('\n\n');

  // Use the correct format for Cloudflare AI
  const res = await (env.AI as { run: (model: string, params: Record<string, unknown>) => Promise<unknown> }).run('@cf/openai/gpt-oss-20b', {
    prompt: `${systemPrompt}\n\n${userPrompt}`,
    max_tokens: 800,
    temperature: 0.1
  });

  logAIProcessing(requestId, 'response', { response: res });
  const result = safeJson(res as Record<string, unknown>);
  logAIProcessing(requestId, 'safe_json', { result });
  return result;
}

// Helper function to safely parse JSON responses with hardened truncation handling
function safeJson(response: unknown): AnalysisResult {
  log('debug', 'safe_json_debug', {
    phase: 'safeJson',
    inputType: typeof response,
    keys: typeof response === 'object' && response !== null ? Object.keys(response) : [],
    snippet: typeof response === "string"
      ? response.slice(0, 200)
      : JSON.stringify(response || {}).slice(0, 200)
  });
  
  try {
    // Handle structured AI output - look for the actual JSON in the response
    if (response && typeof response === 'object' && 'output' in response && Array.isArray((response as Record<string, unknown>).output)) {
      const output = (response as Record<string, unknown>).output as unknown[];
      // Find the message with the actual content (prefer message type over reasoning type)
      const message = output.find((msg: unknown) => 
        (msg as Record<string, unknown>).content && Array.isArray((msg as Record<string, unknown>).content) && (msg as Record<string, unknown>).type === 'message'
      ) || output.find((msg: unknown) => 
        (msg as Record<string, unknown>).content && Array.isArray((msg as Record<string, unknown>).content)
      );
      
      if (message && typeof message === 'object' && message !== null && 'content' in message) {
        const messageContent = (message as Record<string, unknown>).content;
        if (Array.isArray(messageContent)) {
          // Find the output_text content (the actual response)
          const outputTextContent = messageContent.find((content: unknown) => 
            (content as Record<string, unknown>).type === 'output_text' && (content as Record<string, unknown>).text
          );
        
          if (outputTextContent && typeof outputTextContent === 'object' && outputTextContent !== null && 'text' in outputTextContent) {
            log('debug', 'safe_json_found_output', {
              phase: 'safeJson',
              snippet: (outputTextContent.text as string).substring(0, 200) + '...'
            });
            
            // Extract and clean the JSON text
            let text = (outputTextContent.text as string).trim();
            
            // Remove quotes if wrapped
            if (text.startsWith('"') && text.endsWith('"')) {
              text = text.slice(1, -1);
            }
            
            // Apply the hardened JSON extraction logic
            return extractValidJson(text);
          }
        }
      }
    }

    // Handle direct string input
    if (typeof response === "string") {
      return extractValidJson(response);
    }

    // Handle object with nested output_text
    if (response && typeof response === 'object' && 'result' in response && 
        response.result && typeof response.result === 'object' && 'output_text' in response.result) {
      return extractValidJson((response.result as Record<string, unknown>).output_text as string);
    }
    if (response && typeof response === 'object' && 'output_text' in response) {
      return extractValidJson((response as Record<string, unknown>).output_text as string);
    }

    // Handle already-parsed object
    if (typeof response === "object" && response && 'summary' in response) {
      return response as unknown as AnalysisResult;
    }

    // Fallback
    logWarning('', 'safe_json_unexpected_format', 'Unexpected format in safeJson', { response });
    return {
      summary: "Analysis completed but response format was unexpected",
      key_facts: ["Document processed successfully"],
      entities: { people: [], orgs: [], dates: [] },
      action_items: [],
      confidence: 0.3
    };
  } catch (err) {
    logError('', 'safe_json_parse_error', err as Error, { response });
    return {
      summary: "Analysis completed but response format was unexpected",
      key_facts: ["Document processed successfully"],
      entities: { people: [], orgs: [], dates: [] },
      action_items: [],
      confidence: 0.5
    };
  }
}

// Hardened JSON extraction that handles truncated/concatenated responses
function extractValidJson(input: string): AnalysisResult {
  try {
    // Normalize to string
    let text = typeof input === "string" ? input : JSON.stringify(input);
    
    // Pre-clean: remove junk before first { and after last }
    text = text
      .replace(/^[^{]+/, "")       // remove junk before first {
      .replace(/}[^}]*$/, "}");     // remove junk after last }

    // Find first full balanced JSON object
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("No JSON object boundaries found");
    }

    const jsonCandidate = text.slice(firstBrace, lastBrace + 1);

    try {
      const parsed = JSON.parse(jsonCandidate);
      if (parsed && typeof parsed === "object" && parsed.summary) {
        log('debug', 'safe_json_valid_parsed', { phase: 'extractValidJson' });
        return parsed;
      }
    } catch (_innerErr) {
      // fallback: trim to before any trailing garbage after a closing brace
      const trimmed = jsonCandidate.replace(/}[^}]*$/, "}");
      logWarning('', 'safe_json_retry_parse', 'Retrying JSON parse after trim', { phase: 'extractValidJson' });
      return JSON.parse(trimmed);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError('', 'safe_json_final_fallback', new Error(errorMessage), { phase: 'extractValidJson' });
  }

  // Final fallback — return structured failure
  return {
    summary: "Document analysis completed but JSON parsing failed",
    key_facts: ["Document processed successfully"],
    entities: { people: [], orgs: [], dates: [] },
    action_items: ["Review document format and retry analysis"],
    confidence: 0.3,
  };
}


// MIME types allowed for analysis (tighter than file upload)
const ALLOWED_ANALYSIS_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/tif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const MAX_ANALYSIS_FILE_SIZE = 8 * 1024 * 1024; // 8MB for inline analysis

function validateAnalysisFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_ANALYSIS_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File size exceeds maximum limit of ${MAX_ANALYSIS_FILE_SIZE / (1024 * 1024)}MB for analysis` 
    };
  }

  // Check file type
  if (!ALLOWED_ANALYSIS_MIME_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type ${file.type} is not supported for analysis` 
    };
  }

  return { isValid: true };
}

export async function analyzeWithCloudflareAI(
  file: File,
  question: string,
  env: Env,
  requestId: string
): Promise<AnalysisResult> {
  // Only use Adobe extraction - no Cloudflare AI fallbacks
  const adobeAnalysis = await attemptAdobeExtract(file, question, env, requestId);
  if (adobeAnalysis) {
    return adobeAnalysis;
  }
  
  // Adobe extraction failed - return service down message
  return {
    summary: "Document analysis service is currently unavailable. Please try again later or contact support if the issue persists.",
    key_facts: ["Document analysis service temporarily unavailable"],
    entities: { people: [], orgs: [], dates: [] },
    action_items: ["Try uploading the document again in a few minutes", "Contact support if the issue persists"],
    confidence: 0.0,
    error: "Adobe document extraction service unavailable"
  };
}

export async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const _startTime = Date.now();
  const requestId = generateRequestId();
  
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  // Rate limiting for analysis endpoint
  const clientId = getClientId(request);
  if (!(await rateLimit(env, clientId, 30, 60))) { // 30 requests per minute
    logWarning(requestId, 'rate_limit.exceeded', 'Rate limit exceeded', { clientId });
    return new Response(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      errorCode: 'RATE_LIMITED'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    logRequestStart(requestId, request.method, new URL(request.url).pathname);
    
    // Debug: Log environment variables
    log('info', 'environment_check', {
      request_id: requestId,
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'NOT SET',
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN ? 'SET' : 'NOT SET', 
      CLOUDFLARE_PUBLIC_URL: env.CLOUDFLARE_PUBLIC_URL ? 'SET' : 'NOT SET'
    });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const question = (formData.get('q') as string) || "Summarize and extract key facts for legal intake.";

    if (!file) {
      throw HttpErrors.badRequest('No file provided');
    }

    // Validate file
    const fileValidation = validateAnalysisFile(file);
    if (!fileValidation.isValid) {
      throw HttpErrors.badRequest(fileValidation.error!);
    }

    log('info', 'file_analysis_start', {
      request_id: requestId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      question: question,
      ENABLE_ADOBE_EXTRACT: env.ENABLE_ADOBE_EXTRACT,
      ADOBE_CLIENT_ID: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET'
    });

    // Perform analysis
    const analysis = await analyzeWithCloudflareAI(file, question, env, requestId);

    log('info', 'analysis_completed', {
      request_id: requestId,
      fileName: file.name,
      confidence: analysis.confidence,
      summaryLength: analysis.summary?.length || 0,
      keyFactsCount: analysis.key_facts?.length || 0
    });

    const disclaimer = "Blawby provides general information, not legal advice. No attorney-client relationship is formed. For advice, consult a licensed attorney in your jurisdiction.";
    
    return createSuccessResponse({
      analysis,
      metadata: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        question: question,
        timestamp: new Date().toISOString()
      },
      disclaimer
    });

  } catch (error) {
    logError(requestId, 'analysis_error', error as Error, {});
    return handleError(error);
  }
}
