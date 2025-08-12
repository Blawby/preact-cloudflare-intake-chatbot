// Chunking utility for RAG implementation
export function chunkByTokens(text: string, size = 800, overlap = 120): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let buf: string[] = [];
  
  for (const w of words) {
    buf.push(w);
    if (buf.join(" ").length >= size) {
      chunks.push(buf.join(" "));
      buf = buf.slice(-Math.floor(overlap / 5)); // rough overlap by words
    }
  }
  
  if (buf.length) {
    chunks.push(buf.join(" "));
  }
  
  return chunks;
}

// Alternative chunking by semantic boundaries (sentences)
export function chunkBySentences(text: string, maxChunkSize = 800): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if ((currentChunk + " " + trimmedSentence).length <= maxChunkSize) {
      currentChunk += (currentChunk ? " " : "") + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Feature flag for RAG (can be enabled later)
export const RAG_ENABLED = false;

// Embedding call template (when RAG is enabled)
export async function getEmbedding(text: string, env: any): Promise<number[]> {
  if (!RAG_ENABLED) {
    throw new Error("RAG not enabled");
  }
  
  const emb = await env.AI.run("@cf/baai/bge-large-en-v1.5", { 
    input: text 
  });
  
  return emb.data;
}
