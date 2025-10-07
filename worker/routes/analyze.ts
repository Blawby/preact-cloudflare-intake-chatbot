import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';
import { AdobeDocumentService, type AdobeExtractSuccess } from '../services/AdobeDocumentService.js';
import { 
  log, 
  generateRequestId, 
  logRequestStart, 
  logRequestComplete, 
  logAdobeStep, 
  logAIProcessing, 
  logJSONParsing, 
  logError, 
  logMetrics, 
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
function createFallbackResponse(aiResponse: string): AnalysisResult {
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
  const adobeService = new AdobeDocumentService(env);
  const eligibleTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  console.log('Adobe extract attempt:', {
    fileType: file.type,
    isEligibleType: eligibleTypes.has(file.type),
    isEnabled: adobeService.isEnabled(),
    enableFlag: env.ENABLE_ADOBE_EXTRACT,
    adobeClientId: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET',
    adobeClientSecret: env.ADOBE_CLIENT_SECRET ? 'SET' : 'NOT SET'
  });

  console.log('Adobe service isEnabled() result:', adobeService.isEnabled());
  console.log('ENABLE_ADOBE_EXTRACT value:', env.ENABLE_ADOBE_EXTRACT);
  console.log('ADOBE_CLIENT_ID value:', env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET');

  if (!eligibleTypes.has(file.type)) {
    console.log('Adobe extract skipped: not eligible type');
    return null;
  }
  
  if (!adobeService.isEnabled()) {
    console.log('Adobe extract skipped: not enabled');
    return null;
  }

  try {
    console.log('Starting Adobe extraction for:', file.name);
    const buffer = await file.arrayBuffer();
    console.log('File buffer size:', buffer.byteLength);
    
    const extractResult = await adobeService.extractFromBuffer(file.name, file.type, buffer);
    console.log('Adobe extraction result:', {
      success: extractResult.success,
      hasDetails: !!extractResult.details,
      error: extractResult.error,
      warnings: extractResult.warnings
    });

    if (!extractResult.success || !extractResult.details) {
      console.log('Adobe extraction failed, returning null');
      return null;
    }

    console.log('Adobe extraction successful, proceeding to summarize');
    return await summarizeAdobeExtract(extractResult.details, question, env);
  } catch (error) {
    console.warn('Adobe extract failed, using fallback analysis path', {
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

  // Use the same pattern as other AI endpoints
  const res = await env.AI.run('@cf/openai/gpt-oss-20b', {
    input: `${systemPrompt}\n\n${userPrompt}`,
    max_tokens: 800,
    temperature: 0.1
  });

  console.log('🔍 AI Response structure:', JSON.stringify(res, null, 2));
  const result = safeJson(res.response ?? res);
  console.log('🔍 safeJson result:', JSON.stringify(result, null, 2));
  return result;
}

// Helper function to safely parse JSON responses with hardened truncation handling
function safeJson(response: any): AnalysisResult {
  console.log(
    "[safeJson] typeof input:",
    typeof response,
    "| keys:",
    Object.keys(response || {}),
    "| snippet:",
    typeof response === "string"
      ? response.slice(0, 200)
      : JSON.stringify(response).slice(0, 200)
  );
  
  try {
    // Handle structured AI output - look for the actual JSON in the response
    if (response?.output && Array.isArray(response.output)) {
      // Find the message with the actual content (prefer message type over reasoning type)
      const message = response.output.find((msg: any) => 
        msg.content && Array.isArray(msg.content) && msg.type === 'message'
      ) || response.output.find((msg: any) => 
        msg.content && Array.isArray(msg.content)
      );
      
      if (message && message.content) {
        // Find the output_text content (the actual response)
        const outputTextContent = message.content.find((content: any) => 
          content.type === 'output_text' && content.text
        );
        
        if (outputTextContent && outputTextContent.text) {
          console.log('🔍 Found output_text content:', outputTextContent.text.substring(0, 200) + '...');
          
          // Extract and clean the JSON text
          let text = outputTextContent.text.trim();
          
          // Remove quotes if wrapped
          if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
          }
          
          // Apply the hardened JSON extraction logic
          return extractValidJson(text);
        }
      }
    }

    // Handle direct string input
    if (typeof response === "string") {
      return extractValidJson(response);
    }

    // Handle object with nested output_text
    if (response?.result?.output_text) {
      return extractValidJson(response.result.output_text);
    }
    if (response?.output_text) {
      return extractValidJson(response.output_text);
    }

    // Handle already-parsed object
    if (typeof response === "object" && response.summary) {
      return response;
    }

    // Fallback
    console.warn("[safeJson] Unexpected format:", response);
    return response ?? null;
  } catch (err) {
    console.error("[safeJson] Parse error:", err);
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
      .replace(/^[^\{]+/, "")       // remove junk before first {
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
        console.log("✅ safeJson: valid JSON parsed");
        return parsed;
      }
    } catch (innerErr) {
      // fallback: trim to before any trailing garbage after a closing brace
      const trimmed = jsonCandidate.replace(/}[^}]*$/, "}");
      console.warn("⚠️ Retrying JSON parse after trim");
      return JSON.parse(trimmed);
    }
  } catch (err) {
    console.error("✘ safeJson final fallback:", err.message);
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
  env: Env
): Promise<AnalysisResult> {
  // Only use Adobe extraction - no Cloudflare AI fallbacks
  const adobeAnalysis = await attemptAdobeExtract(file, question, env);
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
  const startTime = Date.now();
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
    console.log('Environment variables check:', {
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

    console.log('Starting file analysis:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      question: question,
      ENABLE_ADOBE_EXTRACT: env.ENABLE_ADOBE_EXTRACT,
      ADOBE_CLIENT_ID: env.ADOBE_CLIENT_ID ? 'SET' : 'NOT SET'
    });

    // Perform analysis
    const analysis = await analyzeWithCloudflareAI(file, question, env);

    console.log('Analysis completed successfully:', {
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
    console.error('Analysis error:', error);
    return handleError(error);
  }
}
