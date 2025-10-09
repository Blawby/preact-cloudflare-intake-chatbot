import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';
import { AdobeDocumentService, type AdobeExtractSuccess } from '../services/AdobeDocumentService.js';
import { type AnalysisResult } from '../services/SessionService.js';
import { 
  log, 
  logRequestStart, 
  logAIProcessing, 
  logError, 
  logWarning 
} from '../utils/logging.js';

// Extended AnalysisResult for debugging purposes
interface ExtendedAnalysisResult extends AnalysisResult {
  adobeExtractTextLength?: number;
  adobeExtractTextPreview?: string;
  debug?: {
    adobeEnabled: boolean;
    adobeClientIdSet: boolean;
    adobeClientSecretSet: boolean;
    fileTypeEligible: boolean;
    analysisMethod: string;
    debugTimestamp: string;
    codeVersion: string;
    summaryContainsUnable: boolean;
    summaryContainsNotProvided: boolean;
    summaryLength: number;
    adobeExtractTextLength: number;
    adobeExtractTextPreview: string;
  };
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
  env: Env
): Promise<AnalysisResult | null> {
  log('debug', 'adobe_service_creation', { message: 'Creating Adobe service' });
  const adobeService = new AdobeDocumentService(env);
  log('debug', 'adobe_service_created', { message: 'Adobe service created' });
  log('debug', 'adobe_service_enabled_check', { isEnabled: adobeService.isEnabled() });
  
  const eligibleTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  log('info', 'adobe_extract_attempt', {
    fileType: file.type,
    isEligibleType: eligibleTypes.has(file.type),
    isEnabled: adobeService.isEnabled(),
    enableFlag: env.ENABLE_ADOBE_EXTRACT,
    adobeClientId: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET',
    adobeClientSecret: env.ADOBE_CLIENT_SECRET ? 'SET' : 'NOT SET'
  });

  log('info', 'adobe_service_check', {
    isEnabled: adobeService.isEnabled(),
    enableFlag: env.ENABLE_ADOBE_EXTRACT,
    adobeClientId: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET'
  });

  if (!eligibleTypes.has(file.type)) {
    log('info', 'adobe_extract_skipped', { reason: 'not_eligible_type', fileType: file.type });
    return null;
  }
  
  if (!adobeService.isEnabled()) {
    log('info', 'adobe_extract_skipped', { reason: 'not_enabled', isEnabled: adobeService.isEnabled() });
    return null;
  }

  try {
    log('info', 'adobe_extraction_start', { fileName: file.name, fileType: file.type });
    log('debug', 'adobe_extraction_details', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    const buffer = await file.arrayBuffer();
    log('info', 'adobe_file_buffer', { fileName: file.name, bufferSize: buffer.byteLength });
    log('debug', 'adobe_buffer_details', { bufferSize: buffer.byteLength });
    
    const extractResult = await adobeService.extractFromBuffer(file.name, file.type, buffer);
    log('info', 'adobe_extraction_result', {
      success: extractResult.success,
      hasDetails: !!extractResult.details,
      error: extractResult.error,
      warnings: extractResult.warnings
    });
    
    log('debug', 'adobe_extraction_result_details', {
      success: extractResult.success,
      hasDetails: !!extractResult.details,
      error: extractResult.error || 'None',
      warnings: extractResult.warnings || 'None',
      textLength: extractResult.details?.text?.length || 0,
      textPreview: extractResult.details?.text?.substring(0, 200) || 'No text'
    });

    if (!extractResult.success || !extractResult.details) {
      log('warn', 'adobe_extraction_failed', { reason: 'no_success_or_details' });
      log('debug', 'adobe_extraction_failure_details', {
        success: extractResult.success,
        hasDetails: !!extractResult.details,
        error: extractResult.error
      });
      return null;
    }

    log('info', 'adobe_extraction_success', { fileName: file.name });
    log('debug', 'adobe_extraction_success_details', { message: 'Adobe extraction successful, calling summarizeAdobeExtract' });
    return await summarizeAdobeExtract(extractResult.details, question, env);
  } catch (error) {
    logWarning('analyze', 'adobe_extract_failed', 'Adobe extract failed, using fallback analysis path', {
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
  env: Env
): Promise<ExtendedAnalysisResult> {
  log('debug', 'summarize_adobe_extract_called', {
    textLength: extract.text?.length || 0,
    textPreview: extract.text?.substring(0, 200) || 'NO TEXT',
    tablesCount: extract.tables?.length || 0,
    elementsCount: extract.elements?.length || 0
  });
  
  const rawText = extract.text ?? '';
  
  // If no text was extracted, return a meaningful error response
  if (!rawText || rawText.trim().length === 0) {
    log('warn', 'adobe_extract_no_text', {
      message: 'Adobe extraction returned no text content',
      hasElements: (extract.elements?.length || 0) > 0,
      hasTables: (extract.tables?.length || 0) > 0
    });
    
    return {
      summary: "Adobe PDF extraction was unable to extract readable text from this document. This could be due to the document being image-based, having text in non-standard formats, or other extraction limitations.",
      key_facts: [
        "Document appears to be a PDF but text extraction failed",
        "Adobe PDF Services was unable to extract readable content",
        "Document may contain images, scanned content, or non-standard text formats"
      ],
      entities: {
        people: [],
        orgs: [],
        dates: []
      },
      action_items: [
        "Try uploading a different PDF with standard text content",
        "Consider converting the document to a text format",
        "Verify the PDF contains selectable text (not just images)"
      ],
      confidence: 0.1,
      adobeExtractTextLength: 0,
      adobeExtractTextPreview: 'No text extracted'
    };
  }
  
  const truncatedText = rawText.length > 20000
    ? `${rawText.slice(0, 20000)}...`
    : rawText;
    
  log('debug', 'truncated_text_details', {
    truncatedTextLength: truncatedText.length,
    truncatedTextPreview: truncatedText.substring(0, 200)
  });

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
    input: `${systemPrompt}\n\n${userPrompt}`,
    max_tokens: 800,
    temperature: 0.1
  });

  logAIProcessing('analyze', 'response.meta', {
    type: typeof res,
    keys: typeof res === 'object' && res !== null ? Object.keys(res as Record<string, unknown>).slice(0, 10) : []
  });
  const result = safeJson(res as Record<string, unknown>);
  logAIProcessing('analyze', 'safe_json', { result });
  
  // Add Adobe extraction details to the result for debugging
  const extendedResult = result as ExtendedAnalysisResult;
  extendedResult.adobeExtractTextLength = rawText.length;
  extendedResult.adobeExtractTextPreview = rawText.substring(0, 200);
  
  return extendedResult;
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
    logWarning('analyze', 'safe_json_unexpected_format', 'Unexpected format in safeJson', { response });
    return {
      summary: "Analysis completed but response format was unexpected",
      key_facts: ["Document processed successfully"],
      entities: { people: [], orgs: [], dates: [] },
      action_items: [],
      confidence: 0.3
    };
  } catch (err) {
    logError('analyze', 'safe_json_parse_error', err as Error, { response });
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
      logWarning('analyze', 'safe_json_retry_parse', 'Retrying JSON parse after trim', { phase: 'extractValidJson' });
      return JSON.parse(trimmed);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError('analyze', 'safe_json_final_fallback', new Error(errorMessage), { phase: 'extractValidJson' });
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

async function analyzeWithGenericAI(
  file: File,
  question: string,
  env: Env
): Promise<AnalysisResult> {
  try {
    log('info', 'generic_ai_analysis_start', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    let content = '';
    
    if (file.type === 'text/plain') {
      // Check file size before reading into memory
      if (file.size > MAX_ANALYSIS_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${MAX_ANALYSIS_FILE_SIZE / (1024 * 1024)}MB for analysis`);
      }
      // Read text content directly
      content = await file.text();
    } else {
      // For other types, produce a concise intake description
      content = `Document: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\nQuestion: ${question}`;
    }

    const systemPrompt = [
      'You are a legal intake analyst. Analyze the provided content and answer the intake question.',
      'Return STRICT JSON: { "summary": string, "key_facts": string[], "entities": { "people": string[], "orgs": string[], "dates": string[] }, "action_items": string[], "confidence": number }',
      'Focus on legal parties, obligations, deadlines, amounts, and recommended next steps.'
    ].join('\n');

    const userPrompt = `Intake question: ${question}\n\nContent:\n${content}`;

    // Use the default AI model or fallback
    const model = env.AI_MODEL_DEFAULT || '@cf/openai/gpt-oss-20b';
    
    const res = await (env.AI as { run: (model: string, params: Record<string, unknown>) => Promise<unknown> }).run(model, {
      input: `${systemPrompt}\n\n${userPrompt}`,
      max_tokens: 800,
      temperature: 0.1
    });

    logAIProcessing('analyze', 'generic_ai_response.meta', {
      type: typeof res,
      keys: typeof res === 'object' && res !== null ? Object.keys(res as Record<string, unknown>).slice(0, 10) : []
    });

    const result = safeJson(res as Record<string, unknown>);
    
    log('info', 'generic_ai_analysis_completed', {
      fileName: file.name,
      confidence: result.confidence,
      summaryLength: result.summary?.length || 0
    });

    return result;
  } catch (error) {
    logError('analyze', 'generic_ai_analysis_failed', error as Error, {
      fileName: file.name,
      fileType: file.type
    });

    return {
      summary: "Analysis failed due to an internal error. Please try again or contact support.",
      key_facts: ["Document analysis encountered an error"],
      entities: { people: [], orgs: [], dates: [] },
      action_items: ["Retry the analysis", "Contact support if the issue persists"],
      confidence: 0.0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

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
  env: Env
): Promise<ExtendedAnalysisResult> {
  log('debug', 'analyze_with_cloudflare_ai_called', {
    fileType: file.type,
    fileName: file.name
  });
  
  // Try Adobe extraction first
  log('debug', 'attempting_adobe_extraction', { message: 'Attempting Adobe extraction' });
  const adobeAnalysis = await attemptAdobeExtract(file, question, env);
  if (adobeAnalysis) {
    log('debug', 'adobe_analysis_successful', { message: 'Adobe analysis successful, returning result' });
    return adobeAnalysis;
  }
  
  // Adobe extraction failed or ineligible - use generic AI fallback
  log('debug', 'adobe_extraction_failed_fallback', { message: 'Adobe extraction failed, using generic AI fallback' });
  log('info', 'adobe_extract_fallback', {
    fileName: file.name,
    fileType: file.type,
    reason: 'adobe_extraction_failed_or_ineligible'
  });
  
  return await analyzeWithGenericAI(file, question, env);
}

export async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const _startTime = Date.now();
  
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  // Rate limiting for analysis endpoint
  const clientId = getClientId(request);
  if (!(await rateLimit(env, clientId, 30, 60))) { // 30 requests per minute
    logWarning('analyze', 'rate_limit.exceeded', 'Rate limit exceeded', { clientId });
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
    logRequestStart('analyze', request.method, new URL(request.url).pathname);
    
    // Debug: Log environment variables
    log('info', 'environment_check', {
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
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      question: question,
      ENABLE_ADOBE_EXTRACT: env.ENABLE_ADOBE_EXTRACT,
      ADOBE_CLIENT_ID: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET'
    });

    // Debug: Log Adobe service status
    log('debug', 'adobe_service_status_check', {
      enableAdobeExtract: env.ENABLE_ADOBE_EXTRACT,
      adobeClientId: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET',
      adobeClientSecret: env.ADOBE_CLIENT_SECRET ? 'SET' : 'NOT SET',
      fileTypeEligible: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
    });

    // Perform analysis
    const analysis = await analyzeWithCloudflareAI(file, question, env);
    
    // Add debug information to analysis
    const extendedAnalysis = analysis as ExtendedAnalysisResult;
    extendedAnalysis.debug = {
      adobeEnabled: Boolean(env.ENABLE_ADOBE_EXTRACT),
      adobeClientIdSet: !!env.ADOBE_CLIENT_ID,
      adobeClientSecretSet: !!env.ADOBE_CLIENT_SECRET,
      fileTypeEligible: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
      analysisMethod: analysis.summary?.includes('Unable to analyze') ? 'fallback' : 'adobe',
      debugTimestamp: new Date().toISOString(),
      codeVersion: 'v2.3-debug',
      summaryContainsUnable: analysis.summary?.includes('Unable to analyze') || false,
      summaryContainsNotProvided: analysis.summary?.includes('not provided') || false,
      summaryLength: analysis.summary?.length || 0,
      // Add Adobe extraction details to debug
      adobeExtractTextLength: extendedAnalysis.adobeExtractTextLength || 0,
      adobeExtractTextPreview: extendedAnalysis.adobeExtractTextPreview || 'N/A'
    };

    log('info', 'analysis_completed', {
      fileName: file.name,
      confidence: analysis.confidence,
      summaryLength: analysis.summary?.length || 0,
      keyFactsCount: analysis.key_facts?.length || 0
    });

    const disclaimer = "Blawby provides general information, not legal advice. No attorney-client relationship is formed. For advice, consult a licensed attorney in your jurisdiction.";
    
    const metadata: {
      fileName: string;
      fileType: string;
      fileSize: number;
      question: string;
      timestamp: string;
      isAdobeEligible: boolean;
      debug?: Record<string, unknown>;
    } = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      question: question,
      timestamp: new Date().toISOString(),
      isAdobeEligible: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
    };

    // Only include debug information when DEBUG mode is enabled
    if (env.DEBUG === 'true') {
      metadata.debug = {
        adobeClientIdConfigured: !!env.ADOBE_CLIENT_ID,
        adobeExtractEnabled: !!env.ENABLE_ADOBE_EXTRACT
      };
    }

    return createSuccessResponse({
      analysis,
      metadata,
      disclaimer
    });

  } catch (error) {
    logError('analyze', 'analysis_error', error as Error, {});
    return handleError(error);
  }
}
