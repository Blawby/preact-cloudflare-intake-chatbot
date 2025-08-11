import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

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

async function analyzeWithOpenAI(file: File, question: string, env: Env): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    // Prepare model input based on file type
    let content: any[];
    
    if (file.type.startsWith('image/')) {
      // For images, use base64 encoding
      const bytes = new Uint8Array(await file.arrayBuffer());
      const b64 = btoa(String.fromCharCode(...bytes));
      content = [
        { type: "input_text", text: `${question}\nReturn JSON per schema.` },
        { type: "input_image", image: b64 }
      ];
    } else {
      // For text/PDFs, extract text content
      let textContent = '';
      try {
        textContent = await file.text();
      } catch (error) {
        console.warn('Failed to extract text from file:', error);
        textContent = '[Unable to extract text content from file]';
      }
      
      content = [
        { type: "input_text", text: `${question}\n\nDocument content:\n${textContent}\n\nReturn JSON per schema.` }
      ];
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content }],
        response_format: {
          type: "json_schema",
          json_schema: VISION_ANALYSIS_SCHEMA
        },
        temperature: 0.2
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const jsonResp = await response.json();
    const contentStr = jsonResp?.choices?.[0]?.message?.content;
    
    if (!contentStr) {
      throw new Error('No content in OpenAI response');
    }

    // Parse and validate the JSON response
    try {
      const parsed = JSON.parse(contentStr);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', contentStr);
      throw new Error('Invalid JSON response from OpenAI');
    }

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

  try {
    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY) {
      throw HttpErrors.internalServerError('OpenAI API key not configured');
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
    const analysis = await analyzeWithOpenAI(file, question, env);

    console.log('Analysis completed successfully:', {
      fileName: file.name,
      confidence: analysis.confidence,
      summaryLength: analysis.summary?.length || 0,
      keyFactsCount: analysis.key_facts?.length || 0
    });

    return createSuccessResponse({
      analysis,
      metadata: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        question: question,
        timestamp: new Date().toISOString()
      }
    }, corsHeaders);

  } catch (error) {
    console.error('Analysis error:', error);
    return handleError(error, corsHeaders);
  }
}
