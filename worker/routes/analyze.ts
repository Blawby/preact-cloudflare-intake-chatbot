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

async function analyzeWithCloudflareAI(file: File, question: string, env: Env): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for Cloudflare AI

  try {
    // Prepare model input based on file type
    let prompt: string;
    let imageUrl: string | undefined;
    
    if (file.type.startsWith('image/')) {
      // For images, we need to store them temporarily and get a URL
      // For now, we'll use the existing file storage system
      const fileId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const storageKey = `analysis/${fileId}.${file.name.split('.').pop() || 'jpg'}`;
      
      // Store file temporarily in R2
      if (env.FILES_BUCKET) {
        await env.FILES_BUCKET.put(storageKey, file, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=3600' // 1 hour cache
          }
        });
        
        // Generate a public URL for the image
        imageUrl = `${env.CLOUDFLARE_PUBLIC_URL || 'https://your-worker.your-subdomain.workers.dev'}/api/files/${fileId}`;
      }
      
      prompt = `${question}\n\nPlease analyze this image and return a JSON response with the following structure:
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
    } else {
      // For text/PDFs, extract text content
      let textContent = '';
      try {
        textContent = await file.text();
      } catch (error) {
        console.warn('Failed to extract text from file:', error);
        textContent = '[Unable to extract text content from file]';
      }
      
      prompt = `${question}\n\nDocument content:\n${textContent}\n\nPlease analyze this document and return a JSON response with the following structure:
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
    }

    // Call Cloudflare Workers AI
    const requestBody: any = {
      prompt: prompt
    };

    // Add image URL if we have one
    if (imageUrl) {
      requestBody.image = imageUrl;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/llava-1.5-7b-hf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Cloudflare AI error: ${response.status} - ${errorData.errors?.[0]?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    const aiResponse = result.result?.response || result.response;
    
    if (!aiResponse) {
      throw new Error('No content in Cloudflare AI response');
    }

    // Try to extract JSON from the response
    let parsed: any;
    try {
      // Look for JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, create a structured response from the text
        parsed = {
          summary: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
          key_facts: [aiResponse],
          entities: { people: [], orgs: [], dates: [] },
          action_items: [],
          confidence: 0.7
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

    // Clean up temporary file if it was an image
    if (imageUrl && env.FILES_BUCKET) {
      try {
        await env.FILES_BUCKET.delete(storageKey);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary analysis file:', cleanupError);
      }
    }

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
