// Removed unused imports
// Removed custom PDF text extraction - using Cloudflare AI directly
import { withAIRetry } from '../utils/retry.js';
import { AdobeDocumentService, type AdobeExtractSuccess } from '../services/AdobeDocumentService.js';
import { SessionService } from '../services/SessionService.js';
import type { Env } from '../types.js';

interface DocumentEvent {
  key: string;
  teamId: string;
  sessionId: string;
  mime: string;
  size: number;
}

interface AutoAnalysisEvent {
  type: "analyze_uploaded_document";
  sessionId: string;
  teamId: string;
  file: {
    key: string;
    name: string;
    mime: string;
    size: number;
  };
}

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

export default {
  async queue(batch: MessageBatch<DocumentEvent | AutoAnalysisEvent>, env: Env) {
    const adobeService = new AdobeDocumentService(env);
    for (const msg of batch.messages) {
      try {
        // Handle auto-analysis events
        if ('type' in msg.body && msg.body.type === "analyze_uploaded_document") {
          const { sessionId, teamId, file } = msg.body as AutoAnalysisEvent;
          
          console.log('🧩 Auto-analysis started for uploaded document', { 
            sessionId, 
            teamId, 
            file: file.name,
            mime: file.mime 
          });
          
          // Send initial status message
          await SessionService.sendAnalysisStatus(env, sessionId, teamId, "📄 Analyzing document...");
          
          // Get file from R2
          const obj = await env.FILES_BUCKET.get(file.key);
          if (!obj) {
            await SessionService.sendAnalysisStatus(env, sessionId, teamId, "❌ Document not found for analysis");
            continue;
          }
          
          const buf = await obj.arrayBuffer();
          let analysis: AnalysisResult;
          const adobeEligible = isAdobeEligibleMime(file.mime);

          if (adobeEligible && adobeService.isEnabled()) {
            console.log('🔧 Adobe analysis starting', { key: file.key });
            await SessionService.sendAnalysisStatus(env, sessionId, teamId, "🔍 Extracting document content...");
            
            const adobeResult = await adobeService.extractFromBuffer(
              file.key.split('/').pop() ?? file.key,
              file.mime,
              buf
            );
            if (adobeResult.success && adobeResult.details) {
              await SessionService.sendAnalysisStatus(env, sessionId, teamId, "🔍 Summarizing document...");
              analysis = await summarizeAdobeResult(env, adobeResult.details);
            } else {
              console.warn('Adobe extract returned no data, falling back to legacy summarizer', {
                key: file.key,
                mime: file.mime
              });
            }
          }

          if (!analysis) {
            if (file.mime.startsWith('image/')) {
              await SessionService.sendAnalysisStatus(env, sessionId, teamId, "🔍 Analyzing image content...");
              analysis = await analyzeImage(env, new Uint8Array(buf));
            } else if (file.mime === 'application/pdf') {
              // Skip text decoding for PDFs - Adobe extraction failed and we can't decode binary PDF data
              console.warn('Adobe extraction failed for PDF, skipping text-based analysis', {
                key: file.key,
                mime: file.mime
              });
              await SessionService.sendAnalysisStatus(env, sessionId, teamId, "❌ Unable to analyze PDF document");
              analysis = {
                summary: "PDF document could not be analyzed. Adobe extraction failed and text-based analysis is not available for binary PDF files.",
                entities: { people: [], orgs: [], dates: [] },
                key_facts: [],
                action_items: [],
                confidence: 0,
                error: "Adobe extraction failed for PDF"
              };
            } else {
              await SessionService.sendAnalysisStatus(env, sessionId, teamId, "🔍 Processing document text...");
              const text = new TextDecoder().decode(buf);
              analysis = await summarizeLegal(env, text);
            }
          }

          // Store analysis preview in KV for quick access
          await env.CHAT_SESSIONS.put(
            `preview:${sessionId}:${file.key}`, 
            JSON.stringify({
              summary: analysis.summary,
              entities: analysis.entities,
              key_facts: analysis.key_facts,
              action_items: analysis.action_items,
              confidence: analysis.confidence,
              ts: Date.now()
            }), 
            { expirationTtl: 60 * 60 * 24 * 3 } // 3 days
          );
          
          // Send final analysis result
          await SessionService.sendAnalysisComplete(env, sessionId, teamId, analysis as unknown as Record<string, unknown>);
          
          console.log('✅ Auto-analysis completed successfully:', { 
            key: file.key, 
            sessionId, 
            mime: file.mime,
            confidence: analysis.confidence 
          });
          
          continue;
        }

        // Handle legacy document processing
        const { key, teamId: _teamId, sessionId, mime } = msg.body as DocumentEvent;
        const obj = await env.FILES_BUCKET.get(key);
        
        if (!obj) { 
          msg.retry(); 
          continue; 
        }
        const buf = await obj.arrayBuffer();

        let analysis: AnalysisResult;
        const adobeEligible = isAdobeEligibleMime(mime);

        if (adobeEligible && adobeService.isEnabled()) {
          const adobeResult = await adobeService.extractFromBuffer(
            key.split('/').pop() ?? key,
            mime,
            buf
          );
          if (adobeResult.success && adobeResult.details) {
            analysis = await summarizeAdobeResult(env, adobeResult.details);
          } else {
            console.warn('Adobe extract returned no data, falling back to legacy summarizer', {
              key,
              mime
            });
          }
        }

        if (!analysis) {
          if (mime.startsWith('image/')) {
            analysis = await analyzeImage(env, new Uint8Array(buf));
          } else {
            const text = new TextDecoder().decode(buf);
            analysis = await summarizeLegal(env, text);
          }
        }

        // Store analysis preview in KV for quick access
        await env.CHAT_SESSIONS.put(
          `preview:${sessionId}:${key}`, 
          JSON.stringify({
            summary: analysis.summary,
            entities: analysis.entities,
            key_facts: analysis.key_facts,
            action_items: analysis.action_items,
            confidence: analysis.confidence,
            ts: Date.now()
          }), 
          { expirationTtl: 60 * 60 * 24 * 3 } // 3 days
        );
        
        console.log('Document processed successfully:', { key, sessionId, mime });
        
      } catch (e) {
        // Lightweight structured log
        console.error("doc-processor", { 
          err: `${e}`.slice(0, 300),
          key: 'type' in msg.body ? (msg.body as AutoAnalysisEvent).file.key : (msg.body as DocumentEvent).key,
          sessionId: 'type' in msg.body ? (msg.body as AutoAnalysisEvent).sessionId : (msg.body as DocumentEvent).sessionId 
        });
        continue;
      }
    }
  }
}

const MAX_TEXT_CHARS = 20000;
const MAX_STRUCTURED_CHARS = 6000;

async function summarizeLegal(env: Env, text: string) {
  const prompt = [
    "You are a legal intake summarizer. Output JSON with fields:",
    "summary, key_facts[], entities{people[],orgs[],dates[]}, action_items[], confidence(0-1).",
    "Use only the given text; if unsure, say so."
  ].join("\n");
  
  const truncated = text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}...` : text;
  const res = await withAIRetry(() => (env.AI as { run: (model: string, params: Record<string, unknown>) => Promise<unknown> }).run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: truncated }
    ],
    max_tokens: 800
  }));
  
  return safeJson(res as Record<string, unknown>);
}

async function analyzeImage(env: Env, bytes: Uint8Array) {
  const res = await withAIRetry(() => env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
    image: [...bytes],
    prompt: "Extract any visible legal parties, dates, amounts, signatures, and document type. Output JSON with summary, key_facts, entities{people,orgs,dates}, action_items, confidence.",
    max_tokens: 512
  }));
  
  return safeJson(res as Record<string, unknown>);
}

function isAdobeEligibleMime(mime: string): boolean {
  return mime === 'application/pdf'
    || mime === 'application/msword'
    || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function buildSafeStructuredPayload(tables: Record<string, unknown>[], elements: Record<string, unknown>[]): string {
  // If no data, return empty string
  if (tables.length === 0 && elements.length === 0) {
    return '';
  }

  // Try to include all data first
  const fullPayload = { tables, elements };
  const fullSerialized = JSON.stringify(fullPayload);
  
  // If it fits within the limit, return it
  if (fullSerialized.length <= MAX_STRUCTURED_CHARS) {
    return fullSerialized;
  }

  // Try including tables incrementally
  let includedTables: unknown[] = [];
  let includedElements: unknown[] = [];
  
  // First, try to include all tables
  for (const table of tables) {
    const testPayload = { tables: [...includedTables, table], elements: [] };
    const testSerialized = JSON.stringify(testPayload);
    if (testSerialized.length <= MAX_STRUCTURED_CHARS) {
      includedTables.push(table);
    } else {
      break;
    }
  }
  
  // Then try to include elements
  for (const element of elements) {
    const testPayload = { tables: includedTables, elements: [...includedElements, element] };
    const testSerialized = JSON.stringify(testPayload);
    if (testSerialized.length <= MAX_STRUCTURED_CHARS) {
      includedElements.push(element);
    } else {
      break;
    }
  }
  
  // If we have some data, return it
  if (includedTables.length > 0 || includedElements.length > 0) {
    return JSON.stringify({ tables: includedTables, elements: includedElements });
  }
  
  // If even a single item is too large, return a placeholder
  return '[structured data omitted - too large]';
}

async function summarizeAdobeResult(env: Env, extract: AdobeExtractSuccess) {
  const text = extract.text ?? '';
  const structured = buildSafeStructuredPayload(
    (extract.tables ?? []) as Record<string, unknown>[], 
    (extract.elements ?? []) as Record<string, unknown>[]
  );

  const truncatedText = text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}...` : text;

  const basePrompt = [
    "You are a legal intake summarizer. Output JSON with fields:",
    "summary, key_facts[], entities{people[],orgs[],dates[]}, action_items[], confidence(0-1).",
    "Prioritize parties, deadlines, dollar amounts, obligations, and recommended next steps.",
    "Use the structured cues provided by Adobe Extract when available."
  ].join("\n");

  const userContent = [
    truncatedText,
    structured ? `Structured data:\n${structured}` : ''
  ].filter(Boolean).join('\n\n');

  const res = await withAIRetry(() => (env.AI as { run: (model: string, params: Record<string, unknown>) => Promise<unknown> }).run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: basePrompt },
      { role: "user", content: userContent }
    ],
    max_tokens: 800
  }));

  return safeJson(res as Record<string, unknown>);
}

function safeJson(x: unknown): AnalysisResult {
  if (typeof x === "string") {
    try { 
      return JSON.parse(x); 
    } catch {
      // Fallback to structured response if JSON parsing fails
      return {
        summary: x.substring(0, 200) + (x.length > 200 ? '...' : ''),
        key_facts: [x],
        entities: { people: [], orgs: [], dates: [] },
        action_items: [],
        confidence: 0.5
      };
    }
  }
  if (typeof x === "object" && x !== null && 'summary' in x) {
    return x as AnalysisResult;
  }
  // Final fallback
  return {
    summary: "Analysis completed but response format was unexpected",
    key_facts: ["Document processed successfully"],
    entities: { people: [], orgs: [], dates: [] },
    action_items: [],
    confidence: 0.3
  };
}
