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
  // Use regex to capture sentences with their delimiters
  const sentenceRegex = /[^.!?]*[.!?]+/g;
  const sentences: string[] = [];
  let match;
  
  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
  }
  
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const sentence of sentences) {
    // Check if adding this sentence (with its delimiter) would exceed maxChunkSize
    const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;
    if (potentialChunk.length <= maxChunkSize) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
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
  
  // Input validation
  if (!text || typeof text !== 'string') {
    throw new Error("Text input is required and must be a string");
  }
  
  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    throw new Error("Text input cannot be empty or only whitespace");
  }
  
  const MAX_TEXT_LENGTH = 8000; // Reasonable limit for embedding
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text input exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
  }
  
  const emb = await env.AI.run("@cf/baai/bge-large-en-v1.5", { 
    input: trimmedText 
  });
  
  return emb.data;
}
