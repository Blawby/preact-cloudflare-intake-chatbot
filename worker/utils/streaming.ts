export function chunkResponseText(response: string, maxChunkSize = 320): string[] {
  if (!response || response.trim() === '') return [];

  // Normalize line endings
  const normalized = response.replace(/\r\n/g, '\n');

  // Split by paragraph separators (two or more newlines)
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (!para || para.trim() === '') continue; // skip empty/whitespace paragraphs

    const trimmedPara = para.trim();

    // If the paragraph contains no sentence-ending punctuation, treat as single chunk
    if (!/[.!?]/.test(trimmedPara)) {
      chunks.push(trimmedPara);
      // Add paragraph separator if not the last paragraph
      if (i < paragraphs.length - 1) {
        chunks.push('\n\n');
      }
      continue;
    }

    // Use a private-use sentinel for dot protection to avoid corrupting real '§' symbols in legal text
    const DOT_SENTINEL = '\uE000';

    // Protect common abbreviation patterns, decimals, and URLs
    const protectedText = trimmedPara
      .replace(/\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|Ph\.D|U\.S\.A|U\.S|etc|vs|Inc|Corp|Ltd|Co|a\.m|p\.m)\./g, (m) => m.replace(/\./g, DOT_SENTINEL))
      .replace(/\b\d+\.\d+(?:\.\d+)*/g, (m) => m.replace(/\./g, DOT_SENTINEL))
      .replace(/\b\d+:\d+\s*(?:a\.m|p\.m)\./g, (m) => m.replace(/\./g, DOT_SENTINEL))
      .replace(/https?:\/\/[^\s]+/g, (m) => m.replace(/\./g, DOT_SENTINEL))
      .replace(/\b\w+@\w+(?:\.\w+)+/g, (m) => m.replace(/\./g, DOT_SENTINEL))
      .replace(/\bwww\.\w+\.\w+/g, (m) => m.replace(/\./g, DOT_SENTINEL));

    // Split into sentences (keep trailing punctuation). Fallback to whole paragraph.
    const sentenceRegex = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
    const sentences = protectedText.match(sentenceRegex) || [protectedText];

    let buffer = '';

    // Helper to push buffer if non-empty
    const flushBuffer = () => {
      if (buffer) {
        chunks.push(buffer);
        buffer = '';
      }
    };

    // Helper to split an overlong word into <= maxChunkSize pieces and push them
    const pushSplitWord = (word: string) => {
      for (let i = 0; i < word.length; i += maxChunkSize) {
        chunks.push(word.slice(i, i + maxChunkSize));
      }
    };

    for (const rawSentence of sentences) {
      const sentence = rawSentence.split(DOT_SENTINEL).join('.').trim();
      if (sentence.length === 0) continue;

      if (sentence.length <= maxChunkSize) {
        // Try to append sentence to buffer
        const candidate = buffer ? `${buffer} ${sentence}` : sentence;
        if (candidate.length <= maxChunkSize) {
          buffer = candidate;
        } else {
          // Flush current buffer and start new buffer with sentence
          flushBuffer();
          buffer = sentence;
        }
      } else {
        // Sentence longer than maxChunkSize -> break into words
        // Split on spaces but preserve the spaces for word boundary detection
        const words = sentence.split(/(\s+)/);
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          if (word.length === 0) continue;
          
          if (word.length <= maxChunkSize) {
            const candidate = buffer ? `${buffer}${word}` : word;
            if (candidate.length <= maxChunkSize) {
              buffer = candidate;
            } else {
              flushBuffer();
              buffer = word;
            }
          } else {
            // Word itself longer than maxChunkSize -> flush buffer then split the word
            flushBuffer();
            pushSplitWord(word);
            // Buffer remains empty after splitting a too-long word
          }
        }
      }
    }

    // Finally push any remaining buffer
    flushBuffer();
    
    // Add paragraph separator if not the last paragraph
    if (i < paragraphs.length - 1) {
      chunks.push('\n\n');
    }
  }

  return chunks;
}
