import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';
import { createRateLimitResponse } from '../errorHandler';
import { withAIRetry } from '../utils/retry.js';

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

interface AIOptions {
  prompt?: string;
  image?: Uint8Array;
  max_tokens?: number;
  signal?: AbortSignal;
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

// Helper function to parse AI response with multiple fallback strategies
function parseAIResponse(aiResponse: string): AnalysisResult {
  if (!aiResponse || typeof aiResponse !== 'string') {
    return createFallbackResponse('No response received');
  }

  // Strategy 1: Direct JSON parse
  try {
    const parsed = JSON.parse(aiResponse.trim());
    if (parsed.summary && parsed.key_facts && parsed.entities && parsed.action_items !== undefined && parsed.confidence !== undefined) {
      return parsed;
    }
  } catch (_error) {
    // Continue to next strategy
  }

  // Strategy 2: Extract substring between first '{' and last '}'
  try {
    const firstBrace = aiResponse.indexOf('{');
    const lastBrace = aiResponse.lastIndexOf('}');
    
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonSubstring = aiResponse.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonSubstring);
      if (parsed.summary && parsed.key_facts && parsed.entities && parsed.action_items !== undefined && parsed.confidence !== undefined) {
        return parsed;
      }
    }
  } catch (_error) {
    // Continue to next strategy
  }

  // Strategy 3: Fix common escaped characters and try again
  try {
    const fixedResponse = aiResponse
      .replace(/\\_/g, '_')  // Fix escaped underscores
      .replace(/\\"/g, '"')  // Fix escaped quotes
      .replace(/\\\\/g, '\\'); // Fix double escaped backslashes
    
    const parsed = JSON.parse(fixedResponse);
    if (parsed.summary && parsed.key_facts && parsed.entities && parsed.action_items !== undefined && parsed.confidence !== undefined) {
      return parsed;
    }
  } catch (_error) {
    // Continue to next strategy
  }

  // Strategy 4: Regex match for JSON object
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary && parsed.key_facts && parsed.entities && parsed.action_items !== undefined && parsed.confidence !== undefined) {
        return parsed;
      }
    }
  } catch (_error) {
    // Continue to fallback
  }

  // Fallback: Create structured response from text
  return createFallbackResponse(aiResponse);
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
  // Configurable timeout with fallbacks
  const isImage = file.type.startsWith('image/');
  const defaultTimeoutMs = isImage ? 60000 : 30000; // 60s for images, 30s for others
  const timeoutMs = (env as any).ANALYSIS_TIMEOUT_MS
    ? parseInt((env as any).ANALYSIS_TIMEOUT_MS, 10)
    : defaultTimeoutMs;
  
  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `Invalid ANALYSIS_TIMEOUT_MS configuration: ${(env as any).ANALYSIS_TIMEOUT_MS}`
    );
  }
  
  // Generate request identifier for better logging
  const requestId = `analysis-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.warn(
      `[${requestId}] Analysis timeout triggered after ${timeoutMs}ms for ${file.name} (${file.type}, ${file.size} bytes)`
    );
    controller.abort();
  }, timeoutMs);
  
  console.log(
    `[${requestId}] Starting analysis: ${file.name} (${file.type}, ${file.size} bytes) with ${timeoutMs}ms timeout`
  );

  try {
    // Prepare model input based on file type
    let prompt: string;
    let modelName: string;
    let aiOptions: AIOptions;
    
    if (file.type.startsWith('image/')) {
      // Use vision model for images only (following official Cloudflare docs)
      modelName = '@cf/llava-hf/llava-1.5-7b-hf';
      console.log('Using vision model for image analysis:', modelName);
      
      // Convert image file to Uint8Array for vision model (following official docs)
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        prompt = `${question}\n\nPlease analyze this image and return a JSON response with the following structure. IMPORTANT: Do not include the JSON structure template in your response - only provide the actual analysis results:

{
  "summary": "Brief summary of what you see",
  "key_facts": ["Fact 1", "Fact 2", "Fact 3"],
  "entities": {
    "people": ["Person names found"],
    "orgs": ["Organization names found"],
    "dates": ["Dates found"]
  },
  "action_items": ["Action 1", "Action 2"],
  "confidence": 0.85
}`;
        
        aiOptions = {
          image: uint8Array, // Pass binary directly to avoid unnecessary copy
          prompt: prompt,
          max_tokens: 512
        };
        console.log('Converted image to vision format, size:', uint8Array.length);
        
        // Add signal for timeout handling
        if (controller.signal) {
          aiOptions.signal = controller.signal;
        }
      } catch (conversionError) {
        console.warn('Failed to convert image for vision analysis:', conversionError);
        // Fallback to text model
        modelName = '@cf/meta/llama-3.1-8b-instruct';
        prompt = `${question}\n\nPlease analyze this image and return ONLY a valid JSON response with the following structure. Do not include any text before or after the JSON:

{
  "summary": "Brief summary of what you see",
  "key_facts": ["Fact 1", "Fact 2", "Fact 3"],
  "entities": {
    "people": ["Person names found"],
    "orgs": ["Organization names found"],
    "dates": ["Dates found"]
  },
  "action_items": ["Action 1", "Action 2"],
  "confidence": 0.85
}`;
        aiOptions = { prompt: prompt };
      }
  } else if (file.type === 'application/pdf') {
    // PDF analysis not implemented in this PR
    return {
      summary: "PDF analysis is not yet available. Please upload text files or images for analysis.",
      key_facts: [
        "PDF analysis feature is coming soon",
        "Currently supports text files and images"
      ],
      entities: {
        people: [],
        orgs: [],
        dates: []
      },
      action_items: [
        "Try uploading a text file (.txt) instead",
        "Upload individual page images for analysis",
        "PDF analysis will be available in a future update"
      ],
      confidence: 0.0,
      error: "PDF analysis not implemented"
    };
    } else {
      // For text files, use text model
      modelName = '@cf/meta/llama-3.1-8b-instruct';
      let textContent = '';
      
      try {
        textContent = await file.text();
      } catch (error) {
        console.warn('Failed to extract text from file:', error);
        textContent = '[Unable to extract text content from file]';
      }
      
      console.log('Extracted text content length:', textContent.length);
      console.log('Text content preview:', textContent.substring(0, 200));
      
      prompt = `${question}\n\nDocument content:\n${textContent}\n\nPlease analyze this document and return ONLY a valid JSON response with the following structure. Do not include any text before or after the JSON:

{
  "summary": "Brief summary of the document",
  "key_facts": ["Fact 1", "Fact 2", "Fact 3"],
  "entities": {
    "people": ["Person names found"],
    "orgs": ["Organization names found"],
    "dates": ["Dates found"]
  },
  "action_items": ["Action 1", "Action 2"],
  "confidence": 0.85
}`;
      
      aiOptions = { prompt: prompt };
    }
    
    const result = await withAIRetry(() => env.AI.run(modelName as any, aiOptions));
    console.log('Raw AI result object:', result);
    
    // Handle different response formats for different models
    let aiResponse = (result as any).response;
    if (!aiResponse && (result as any).description) {
      // Vision models return description instead of response
      aiResponse = (result as any).description;
      console.log('Using description field from vision model response');
    }
    
    console.log('AI response type:', typeof aiResponse);
    console.log('AI response length:', aiResponse?.length || 0);
    
    if (!aiResponse) {
      console.error('No response from AI model:', result);
      throw new Error('No content in Cloudflare AI response');
    }

    // Parse AI response using helper function
    console.log(`[${requestId}] Raw AI response:`, aiResponse);
    const parsed = parseAIResponse(aiResponse);
    console.log(`[${requestId}] Parsed response:`, parsed);

    // No cleanup needed - we're using direct file data

    return parsed;

  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      console.warn(`[${requestId}] Analysis timed out after ${timeoutMs}ms for ${file.name} (${file.type}, ${file.size} bytes)`);
      const fileType = file.type.startsWith('image/') ? 'image' : 'document';
      return {
        summary: `Timed out analyzing ${fileType}. The ${fileType} may be too complex or the AI service is experiencing high load.`,
        key_facts: [`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} analysis timed out`],
        entities: { people: [], orgs: [], dates: [] },
        action_items: ["Try uploading a smaller or simpler file", "Contact support if the issue persists"],
        confidence: 0
      };
    }
    
    console.error(`[${requestId}] Analysis error for ${file.name}:`, error);
    throw error;
  }
}

export async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  // Rate limiting for analysis endpoint
  const clientId = getClientId(request);
  if (!(await rateLimit(env, clientId, 30, 60))) { // 30 requests per minute
    return createRateLimitResponse(60, {
      errorMessage: 'Rate limit exceeded. Please try again later.'
    });
  }

  try {
    // Debug: Log environment variables
    console.log('Environment variables check:', {
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'NOT SET',
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN ? 'SET' : 'NOT SET', 
      CLOUDFLARE_PUBLIC_URL: env.CLOUDFLARE_PUBLIC_URL ? 'SET' : 'NOT SET'
    });
    
    // Check if Cloudflare AI is configured
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_PUBLIC_URL) {
      throw HttpErrors.internalServerError('Cloudflare AI not configured. Please set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN and CLOUDFLARE_PUBLIC_URL');
    }

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
      question: question
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
