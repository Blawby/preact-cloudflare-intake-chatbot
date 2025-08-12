import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { rateLimit, getClientId } from '../middleware/rateLimit.js';
import { extractPdfText } from '../lib/pdf.js';
import { withAIRetry } from '../utils/retry.js';

// JSON Schema for vision analysis results
const VISION_ANALYSIS_SCHEMA = {
  name: "VisionDocRead",
  schema: {
    type: "object",
    required: ["summary", "key_facts", "entities", "action_items", "confidence"],
    properties: {
      summary: { type: "string" },
      key_facts: { type: "array", items: { type: "string" } },
      entities: {
        type: "object",
        properties: {
          people: { type: "array", items: { type: "string" } },
          orgs: { type: "array", items: { type: "string" } },
          dates: { type: "array", items: { type: "string" } }
        },
        required: ["people", "orgs", "dates"]
      },
      action_items: { type: "array", items: { type: "string" } },
      confidence: { type: "number", minimum: 0, maximum: 1 }
    },
    additionalProperties: false
  }
};

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

export async function analyzeWithCloudflareAI(file: File, question: string, env: Env): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for Cloudflare AI

  try {
    // Prepare model input based on file type
    let prompt: string;
    let modelName: string;
    let aiOptions: any;
    
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
          image: [...uint8Array], // Convert to array of integers as per official docs
          prompt: prompt,
          max_tokens: 512
        };
        console.log('Converted image to vision format, size:', uint8Array.length);
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
      // For PDFs, use robust text extraction with OCR fallback
      modelName = '@cf/meta/llama-3.1-8b-instruct';
      console.log('Using robust PDF text extraction with OCR fallback');
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        console.log('PDF file size:', arrayBuffer.byteLength);
        console.log('PDF file type:', file.type);
        console.log('PDF file name:', file.name);
        
                       const extractionResult = await extractPdfText(arrayBuffer);
               console.log('Extraction result:', extractionResult);
               
               const { fullText, keyInfo } = extractionResult;
        
                       // Use key legal info if available, otherwise truncate full text
               const textContent = keyInfo || fullText.substring(0, 2000); // Keep well under token cap
               console.log('Extracted PDF text length:', fullText.length);
               console.log('Key info length:', keyInfo?.length || 0);
               console.log('Text content length for AI:', textContent.length);
               console.log('PDF text preview:', textContent.substring(0, 200));
        
        prompt = `${question}\n\nDocument content:\n${textContent}\n\nPlease analyze this PDF document and return ONLY a valid JSON response with the following structure. Do not include any text before or after the JSON:

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
      } catch (pdfError) {
        console.warn('Failed to extract PDF text with enhanced extraction:', pdfError);
        
        // Try vision model as final fallback for PDFs
        console.log('Attempting vision model fallback for PDF analysis');
        modelName = '@cf/llava-hf/llava-1.5-7b-hf';
        
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        prompt = `${question}\n\nPlease analyze this PDF document and return ONLY a valid JSON response with the following structure. Do not include any text before or after the JSON:

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
        
        aiOptions = {
          image: [...uint8Array],
          prompt: prompt,
          max_tokens: 512
        };
      }
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
    
    const result = await withAIRetry(() => env.AI.run(modelName, aiOptions));
    const aiResponse = result.response;
    
    if (!aiResponse) {
      throw new Error('No content in Cloudflare AI response');
    }

    // Try to extract JSON from the response
    let parsed: any;
    try {
      console.log('Raw AI response:', aiResponse);
      
      // First, try to parse the entire response as JSON
      try {
        parsed = JSON.parse(aiResponse.trim());
        console.log('Successfully parsed full response as JSON');
      } catch (fullParseError) {
        // If that fails, look for JSON in the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed JSON from response match');
        } else {
          // If no JSON found, create a structured response from the text
          console.log('No JSON found in response, creating fallback');
          parsed = {
            summary: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
            key_facts: [aiResponse],
            entities: { people: [], orgs: [], dates: [] },
            action_items: [],
            confidence: 0.7
          };
        }
      }
      
      // Validate the parsed structure
      if (!parsed.summary || !parsed.key_facts || !parsed.entities || !parsed.action_items || parsed.confidence === undefined) {
        console.warn('Parsed JSON missing required fields, creating fallback');
        parsed = {
          summary: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
          key_facts: [aiResponse],
          entities: { people: [], orgs: [], dates: [] },
          action_items: [],
          confidence: 0.6
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON from Cloudflare AI response, using fallback:', aiResponse);
      parsed = {
        summary: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
        key_facts: [aiResponse],
        entities: { people: [], orgs: [], dates: [] },
        action_items: [],
        confidence: 0.6
      };
    }

    // No cleanup needed - we're using direct file data

    return parsed;

  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      console.warn('Analysis timed out, returning fallback response');
      return {
        summary: "Timed out analyzing file.",
        key_facts: [],
        entities: { people: [], orgs: [], dates: [] },
        action_items: [],
        confidence: 0
      };
    }
    
    throw error;
  }
}

export async function handleAnalyze(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  // Rate limiting for analysis endpoint
  const clientId = getClientId(request);
  if (!(await rateLimit(env, clientId, 30, 60))) { // 30 requests per minute
    return new Response(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      errorCode: 'RATE_LIMITED'
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check if Cloudflare AI is configured
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
      throw HttpErrors.internalServerError('Cloudflare AI not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
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
    }, corsHeaders);

  } catch (error) {
    console.error('Analysis error:', error);
    return handleError(error, corsHeaders);
  }
}
