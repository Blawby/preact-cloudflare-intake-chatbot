import type { Ai, KVNamespace, R2Bucket } from '@cloudflare/workers-types';
import { extractPdfText } from '../lib/pdf.js';
import { withAIRetry } from '../utils/retry.js';

export interface Env {
  AI: Ai;
  FILES_BUCKET: R2Bucket;
  CHAT_SESSIONS: KVNamespace;
}

interface DocumentEvent {
  key: string;
  teamId: string;
  sessionId: string;
  mime: string;
  size: number;
}

export default {
  async queue(batch: MessageBatch<DocumentEvent>, env: Env) {
    for (const msg of batch.messages) {
      try {
        const { key, teamId, sessionId, mime } = msg.body;
        const obj = await env.FILES_BUCKET.get(key);
        
        if (!obj) { 
          msg.retry(); 
          continue; 
        }
        
        const buf = await obj.arrayBuffer();

        let analysis: any;
        if (mime === "application/pdf") {
          const { fullText } = await extractPdfText(buf);
          analysis = await summarizeLegal(env, fullText);
        } else if (mime.startsWith("image/")) {
          analysis = await analyzeImage(env, new Uint8Array(buf));
        } else {
          const text = new TextDecoder().decode(buf);
          analysis = await summarizeLegal(env, text);
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
          key: msg.body.key,
          sessionId: msg.body.sessionId 
        });
        continue;
      }
    }
  }
}

async function summarizeLegal(env: Env, text: string) {
  const prompt = [
    "You are a legal intake summarizer. Output JSON with fields:",
    "summary, key_facts[], entities{people[],orgs[],dates[]}, action_items[], confidence(0-1).",
    "Use only the given text; if unsure, say so."
  ].join("\n");
  
  const res = await withAIRetry(() => env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: text.slice(0, 60000) } // keep under token cap
    ],
    max_tokens: 800
  }));
  
  return safeJson(res.response ?? res);
}

async function analyzeImage(env: Env, bytes: Uint8Array) {
  const res = await withAIRetry(() => env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
    image: [...bytes],
    prompt: "Extract any visible legal parties, dates, amounts, signatures, and document type. Output JSON with summary, key_facts, entities{people,orgs,dates}, action_items, confidence.",
    max_tokens: 512
  }));
  
  return safeJson(res.response ?? res);
}

function safeJson(x: any) {
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
  return x;
}
